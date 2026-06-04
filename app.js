import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8";
import { drawSkeleton } from "./js/drawing.js";
import { classifyASL } from "./js/classifier.js";
import { getLetterTemplate, saveCustomTemplate, resetCustomTemplates, exportCustomTemplates, initTemplates } from "./js/templates.js";
import { 
  initGame, 
  getActiveTarget, 
  selectNextTarget, 
  markLetterCompleted, 
  resetChallenge, 
  playSuccessSound,
  isAllCompleted,
  setSoundMuted
} from "./js/game.js";

// --- DOM ELEMENTS ---
const video = document.getElementById("webcam");
const canvas = document.getElementById("output_canvas");
const canvasCtx = canvas.getContext("2d");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingText = document.getElementById("loading-text");
const detectedLetterEl = document.getElementById("detected-letter");
const detectedLetterBox = document.getElementById("detected-letter-box");
const handLabelEl = document.getElementById("hand-label");
const systemStatusEl = document.getElementById("system-status");
const scoreValEl = document.getElementById("score-val");
const alphabetGrid = document.getElementById("alphabet-grid");
const btnNextTarget = document.getElementById("btn-next-target");
const btnResetChallenge = document.getElementById("btn-reset-challenge");
const btnToggleCamera = document.getElementById("btn-toggle-camera");
const btnToggleSkeleton = document.getElementById("btn-toggle-skeleton");
const btnPowerCamera = document.getElementById("btn-power-camera");
const btnToggleSound = document.getElementById("btn-toggle-sound");
const btnCalibrateCurrent = document.getElementById("btn-calibrate-current");
const btnDownloadJson = document.getElementById("btn-download-json");
const btnResetCalibration = document.getElementById("btn-reset-calibration");

// --- INITIAL STATE ---
let handLandmarker = null;
let webcamRunning = false;
let showCamera = true;
let showSkeleton = true;
let isCameraPowered = false;
let soundMuted = false;
let lastDetectedLandmarks = null;
let lastHandedness = null;

let consecutiveMatchCount = 0;
const MATCH_THRESHOLD = 15; // Consecutive frames to match

// --- APP SETUP ---
async function initializeApp() {
  updateStatus("loading", "Loading Model...");
  
  try {
    await initTemplates();
    
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
    );
    
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 2
    });
    
    // Initialize game module
    initGame({
      scoreValEl,
      alphabetGrid,
      detectedLetterEl,
      detectedLetterBox
    });

    // Automatically power on the camera initially
    powerOnCamera();
  } catch (error) {
    console.error("Initialization failed:", error);
    updateStatus("offline", "Initialization Error");
    loadingOverlay.style.display = "flex";
    loadingOverlay.style.opacity = "1";
    loadingText.innerText = "Error loading MediaPipe. Check your internet connection.";
  }
}

function updateStatus(status, text) {
  systemStatusEl.className = `status-indicator status-${status}`;
  systemStatusEl.innerText = text;
}

// --- CAMERA POWER CONTROLS ---
function powerOnCamera() {
  updateStatus("loading", "Starting Camera...");
  loadingOverlay.style.display = "flex";
  loadingOverlay.style.opacity = "1";
  loadingText.innerText = "Accessing camera device...";

  const constraints = {
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      facingMode: "user"
    }
  };

  navigator.mediaDevices.getUserMedia(constraints)
    .then((stream) => {
      video.srcObject = stream;
      video.addEventListener("loadeddata", startDetection);
      
      isCameraPowered = true;
      btnPowerCamera.innerHTML = `<span class="btn-icon">🔌</span> Stop Camera`;
      btnToggleCamera.disabled = false;
    })
    .catch((err) => {
      console.error("Camera access denied:", err);
      updateStatus("offline", "Camera Access Denied");
      loadingOverlay.style.display = "flex";
      loadingOverlay.style.opacity = "1";
      loadingText.innerText = "Camera access denied. Please grant webcam permissions and reload.";
      btnToggleCamera.disabled = true;
    });
}

function powerOffCamera() {
  webcamRunning = false;
  isCameraPowered = false;
  
  if (video.srcObject) {
    const stream = video.srcObject;
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
    video.srcObject = null;
  }

  // Clear Canvas and elements
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  handLabelEl.innerText = "None";
  detectedLetterEl.innerText = "-";
  detectedLetterBox.className = "letter-box";
  consecutiveMatchCount = 0;
  lastDetectedLandmarks = null;
  btnCalibrateCurrent.disabled = true;
  
  // Show UI Off State
  loadingOverlay.style.display = "flex";
  loadingOverlay.style.opacity = "1";
  loadingText.innerText = "Camera is powered off.";
  
  // Update Buttons
  btnPowerCamera.innerHTML = `<span class="btn-icon">🔌</span> Start Camera`;
  btnToggleCamera.disabled = true;
  updateStatus("offline", "Camera Off");
}

function startDetection() {
  webcamRunning = true;
  loadingOverlay.style.opacity = "0";
  setTimeout(() => {
    if (webcamRunning) loadingOverlay.style.display = "none";
  }, 500);
  
  updateStatus("online", "Active");
  
  // Resize canvas to match video
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  // Start prediction loops
  requestAnimationFrame(predictLoop);
}

// --- MAIN LOOP ---
// --- HELPERS ---
const getDistance = (p1, p2) => {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) +
    Math.pow(p1.y - p2.y, 2) +
    Math.pow(p1.z - p2.z, 2)
  );
};

let lastVideoTime = -1;

function predictLoop() {
  if (!webcamRunning) return;
  
  const nowInMs = performance.now();
  
  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    
    // Clear canvas
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Run landmark inference
    const detections = handLandmarker.detectForVideo(video, nowInMs);
    const activeTargetLetter = getActiveTarget();
    const template = activeTargetLetter ? getLetterTemplate(activeTargetLetter) : null;
    
    if (detections.landmarks && detections.landmarks.length > 0) {
      // Process first detected hand
      const landmarks = detections.landmarks[0];
      const handedness = detections.handedness[0][0].displayName; // "Left" or "Right"
      
      lastDetectedLandmarks = landmarks;
      lastHandedness = handedness;
      btnCalibrateCurrent.disabled = false;
      
      handLabelEl.innerText = `${handedness} Hand`;
      
      // Perform classification
      const detectedLetter = classifyASL(landmarks, handedness);
      
      if (detectedLetter !== "-") {
        detectedLetterEl.innerText = detectedLetter;
        evaluateMatch(detectedLetter);
      } else {
        detectedLetterEl.innerText = "-";
        consecutiveMatchCount = 0;
        detectedLetterBox.className = "letter-box";
        detectedLetterBox.style.borderColor = "";
        detectedLetterBox.style.boxShadow = "";
      }
      
      // Draw Skeleton Overlay
      if (showSkeleton) {
        drawSkeleton(canvasCtx, landmarks, handedness === "Left" ? "#06b6d4" : "#d946ef");
      }
      
      // Draw Translucent Guide Points overlaying the user's hand
      if (template) {
        const userWrist = landmarks[0];
        const userScale = getDistance(landmarks[0], landmarks[9]); // Wrist to middle MCP
        const templateWrist = template[0];
        const templateScale = getDistance(template[0], template[9]);
        const scaleRatio = userScale / templateScale;
        
        const guidedLandmarks = template.map(t => {
          let tx = t.x;
          // Mirror template horizontally if Left Hand (since camera feed is mirrored)
          if (handedness === "Left") {
            tx = templateWrist.x - (t.x - templateWrist.x);
          }
          return {
            x: userWrist.x + (tx - templateWrist.x) * scaleRatio,
            y: userWrist.y + (t.y - templateWrist.y) * scaleRatio,
            z: userWrist.z + (t.z - templateWrist.z) * scaleRatio
          };
        });
        
        // Render ghost guide in a translucent soft yellow
        drawSkeleton(canvasCtx, guidedLandmarks, "rgba(253, 224, 71, 0.45)", true);
      }
    } else {
      handLabelEl.innerText = "None";
      detectedLetterEl.innerText = "-";
      consecutiveMatchCount = 0;
      detectedLetterBox.className = "letter-box";
      detectedLetterBox.style.borderColor = "";
      detectedLetterBox.style.boxShadow = "";
      
      lastDetectedLandmarks = null;
      btnCalibrateCurrent.disabled = true;
      
      // Draw Translucent Guide Points in the center of the screen when no hand is detected
      if (template) {
        drawSkeleton(canvasCtx, template, "rgba(255, 255, 255, 0.25)", true);
      }
    }
  }
  
  requestAnimationFrame(predictLoop);
}

// --- EVALUATE MATCH AGAINST TARGET ---
function evaluateMatch(letter) {
  const activeTargetLetter = getActiveTarget();
  if (!activeTargetLetter) return;

  if (letter === activeTargetLetter) {
    consecutiveMatchCount++;
    
    // Pulse animation during matching progress
    const progress = consecutiveMatchCount / MATCH_THRESHOLD;
    detectedLetterBox.style.borderColor = `rgba(16, 185, 129, ${progress})`;
    detectedLetterBox.style.boxShadow = `0 0 ${10 + progress * 20}px rgba(16, 185, 129, ${progress * 0.4})`;
    
    if (consecutiveMatchCount >= MATCH_THRESHOLD) {
      consecutiveMatchCount = 0;
      
      // Success match styling
      detectedLetterBox.className = "letter-box active-match";
      markLetterCompleted(activeTargetLetter);
      playSuccessSound();
      
      // Show trophy if everything is completed, but do not auto-advance target
      if (isAllCompleted()) {
        detectedLetterBox.className = "letter-box active-match";
        detectedLetterEl.innerText = "🏆";
      }
    }
  } else {
    consecutiveMatchCount = 0;
    detectedLetterBox.className = "letter-box";
    detectedLetterBox.style.borderColor = "";
    detectedLetterBox.style.boxShadow = "";
  }
}

// --- BUTTON LISTENERS ---
btnPowerCamera.addEventListener("click", () => {
  if (isCameraPowered) {
    powerOffCamera();
  } else {
    powerOnCamera();
  }
});

btnToggleCamera.addEventListener("click", () => {
  showCamera = !showCamera;
  video.style.opacity = showCamera ? "1" : "0";
  btnToggleCamera.innerHTML = showCamera 
    ? `<span class="btn-icon">👁️</span> Hide Camera Feed` 
    : `<span class="btn-icon">👁️</span> Show Camera Feed`;
});

btnToggleSkeleton.addEventListener("click", () => {
  showSkeleton = !showSkeleton;
  btnToggleSkeleton.innerHTML = showSkeleton
    ? `<span class="btn-icon">🕸️</span> Hide Skeleton`
    : `<span class="btn-icon">🕸️</span> Show Skeleton`;
});

btnToggleSound.addEventListener("click", () => {
  soundMuted = !soundMuted;
  setSoundMuted(soundMuted);
  btnToggleSound.innerHTML = soundMuted
    ? `<span class="btn-icon">🔇</span> Unmute Sound`
    : `<span class="btn-icon">🔊</span> Mute Sound`;
});

btnNextTarget.addEventListener("click", selectNextTarget);
btnResetChallenge.addEventListener("click", resetChallenge);

// Calibration Actions
btnCalibrateCurrent.addEventListener("click", () => {
  const activeTargetLetter = getActiveTarget();
  if (lastDetectedLandmarks && activeTargetLetter) {
    const success = saveCustomTemplate(activeTargetLetter, lastDetectedLandmarks, lastHandedness);
    if (success) {
      // Visual feedback: Flash the calibration card border green and change button text
      const originalText = btnCalibrateCurrent.innerHTML;
      btnCalibrateCurrent.innerHTML = `<span class="btn-icon">✅</span> Calibrated!`;
      btnCalibrateCurrent.style.background = "linear-gradient(135deg, var(--accent-emerald), #059669)";
      
      const calibrationCard = document.querySelector(".calibration-card");
      if (calibrationCard) {
        calibrationCard.style.borderColor = "var(--accent-emerald)";
        calibrationCard.style.boxShadow = "0 0 20px rgba(16, 185, 129, 0.3)";
      }
      
      setTimeout(() => {
        btnCalibrateCurrent.innerHTML = originalText;
        btnCalibrateCurrent.style.background = "";
        if (calibrationCard) {
          calibrationCard.style.borderColor = "";
          calibrationCard.style.boxShadow = "";
        }
      }, 1500);
      
      playCalibrationSound();
    }
  }
});

btnDownloadJson.addEventListener("click", () => {
  exportCustomTemplates();
});

btnResetCalibration.addEventListener("click", () => {
  if (confirm("Are you sure you want to reset all custom calibrated hand templates?")) {
    resetCustomTemplates();
    // Force re-select target to update view immediately
    const target = getActiveTarget();
    if (target) selectNextTarget();
  }
});

function playCalibrationSound() {
  if (soundMuted) return;
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } catch (e) {}
}

// Start on DOM load
window.addEventListener("DOMContentLoaded", initializeApp);
