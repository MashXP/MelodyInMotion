import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8";
import { initTemplates } from "./js/templates.js";
import { initMusicPage, updateMusicPrediction, deactivateMusicPage } from "./js/music.js";
import { initMusicTemplates } from "./js/music_templates.js";
import { setVolume } from "./js/synth.js";

// --- DOM ELEMENTS ---
const video = document.getElementById("webcam");
const canvas = document.getElementById("output_canvas");
const canvasCtx = canvas.getContext("2d");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingText = document.getElementById("loading-text");

const btnPowerCamera = document.getElementById("btn-power-camera");
const btnToggleCamera = document.getElementById("btn-toggle-camera");
const btnToggleSkeleton = document.getElementById("btn-toggle-skeleton");
const btnToggleSound = document.getElementById("btn-toggle-sound");

// --- INITIAL STATE ---
let handLandmarker = null;
let webcamRunning = false;
let showCamera = localStorage.getItem("signquest_show_camera") !== "false"; // default true
let showSkeleton = localStorage.getItem("signquest_show_skeleton") !== "false"; // default true
let isCameraPowered = false;
let soundMuted = localStorage.getItem("signquest_sound_muted") === "true"; // default false
let userVolume = parseFloat(localStorage.getItem("signquest_user_volume") ?? "0.3"); // Default cached volume before mute

// --- APP SETUP ---
async function initializeApp() {
  updateStatus("loading", "Loading Model...");
  
  try {
    // 1. Initialize the base ASL templates (used for procedural rotation fallbacks)
    await initTemplates();
    
    // 2. Initialize the music calibrated templates (from music_calibrated_templates.json)
    await initMusicTemplates();
    
    // 2. Setup MediaPipe Landmarker
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
    
    // 3. Initialize the SignMusic studio page logic
    initMusicPage({
      musicNoteBox: document.getElementById("music-note-box"),
      musicNoteVal: document.getElementById("music-note-val"),
      leftHandStatus: document.getElementById("left-hand-status"),
      rightHandStatus: document.getElementById("right-hand-status"),
      octaveContainer: document.getElementById("octave-indicators"),
      virtualKeyboard: document.getElementById("virtual-keyboard"),
      calibrateSelect: document.getElementById("calibrate-select"),
      btnCalibrate: document.getElementById("btn-music-calibrate"),
      btnResetCalibration: document.getElementById("btn-music-reset"),
      btnExportCalibration: document.getElementById("btn-music-export")
    });

    // 4. Automatically power on camera
    powerOnCamera();

    // 5. Apply loaded UI preferences
    video.style.opacity = showCamera ? "1" : "0";
    btnToggleCamera.innerHTML = showCamera 
      ? `<span class="btn-icon">👁️</span> Hide Camera Feed` 
      : `<span class="btn-icon">👁️</span> Show Camera Feed`;

    btnToggleSkeleton.innerHTML = showSkeleton
      ? `<span class="btn-icon">🕸️</span> Hide Skeleton`
      : `<span class="btn-icon">🕸️</span> Show Skeleton`;

    if (soundMuted) {
      setVolume(0, false);
      btnToggleSound.innerHTML = `<span class="btn-icon">🔇</span> Unmute Sound`;
      const volSlider = document.getElementById("synth-volume");
      if (volSlider) {
        volSlider.value = 0;
      }
    } else {
      setVolume(userVolume, true);
      btnToggleSound.innerHTML = `<span class="btn-icon">🔊</span> Mute Sound`;
    }
  } catch (error) {
    console.error("SignMusic Initialization failed:", error);
    updateStatus("offline", "Initialization Error");
    loadingOverlay.style.display = "flex";
    loadingOverlay.style.opacity = "1";
    loadingText.innerText = "Error loading MediaPipe. Check your internet connection.";
  }
}

function updateStatus(status, text) {
  // Keeping compatible log messages
  console.log(`[System Status: ${status.toUpperCase()}] ${text}`);
}

// --- CAMERA POWER CONTROLS ---
function powerOnCamera() {
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
      loadingOverlay.style.display = "flex";
      loadingOverlay.style.opacity = "1";
      loadingText.innerText = "Camera access denied. Please grant webcam permissions and reload.";
      btnToggleCamera.disabled = true;
    });
}

function powerOffCamera() {
  webcamRunning = false;
  isCameraPowered = false;
  deactivateMusicPage(); // Stop note synthesis immediately if camera goes off
  
  if (video.srcObject) {
    const stream = video.srcObject;
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
    video.srcObject = null;
  }

  // Clear Canvas
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Show UI Off State
  loadingOverlay.style.display = "flex";
  loadingOverlay.style.opacity = "1";
  loadingText.innerText = "Camera is powered off.";
  
  // Update Buttons
  btnPowerCamera.innerHTML = `<span class="btn-icon">🔌</span> Start Camera`;
  btnToggleCamera.disabled = true;
}

function startDetection() {
  webcamRunning = true;
  loadingOverlay.style.opacity = "0";
  setTimeout(() => {
    if (webcamRunning) loadingOverlay.style.display = "none";
  }, 500);
  
  // Resize canvas to match video
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  // Start prediction loops
  requestAnimationFrame(predictLoop);
}

// --- MAIN PREDICTION LOOP ---
let lastVideoTime = -1;

function predictLoop() {
  if (!webcamRunning) return;
  
  const nowInMs = performance.now();
  
  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    
    // Clear canvas
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Run MediaPipe Landmark inference
    const detections = handLandmarker.detectForVideo(video, nowInMs);
    
    // Direct feed into our SignMusic prediction processor
    updateMusicPrediction(detections, canvasCtx, showSkeleton);
  }
  
  requestAnimationFrame(predictLoop);
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
  localStorage.setItem("signquest_show_camera", showCamera.toString());
  video.style.opacity = showCamera ? "1" : "0";
  btnToggleCamera.innerHTML = showCamera 
    ? `<span class="btn-icon">👁️</span> Hide Camera Feed` 
    : `<span class="btn-icon">👁️</span> Show Camera Feed`;
});

btnToggleSkeleton.addEventListener("click", () => {
  showSkeleton = !showSkeleton;
  localStorage.setItem("signquest_show_skeleton", showSkeleton.toString());
  btnToggleSkeleton.innerHTML = showSkeleton
    ? `<span class="btn-icon">🕸️</span> Hide Skeleton`
    : `<span class="btn-icon">🕸️</span> Show Skeleton`;
});

btnToggleSound.addEventListener("click", () => {
  soundMuted = !soundMuted;
  localStorage.setItem("signquest_sound_muted", soundMuted.toString());
  if (soundMuted) {
    // Cache current slider volume value before muting
    const volSlider = document.getElementById("synth-volume");
    if (volSlider) {
      userVolume = parseFloat(volSlider.value);
      localStorage.setItem("signquest_user_volume", userVolume.toString());
      volSlider.value = 0;
    }
    setVolume(0, false); // Mute without overwriting persistent user volume
    btnToggleSound.innerHTML = `<span class="btn-icon">🔇</span> Unmute Sound`;
  } else {
    // Restore cached volume
    const volSlider = document.getElementById("synth-volume");
    if (volSlider) {
      volSlider.value = userVolume;
    }
    setVolume(userVolume, true); // Restore and save to persistent volume
    btnToggleSound.innerHTML = `<span class="btn-icon">🔊</span> Mute Sound`;
  }
});

// Start on DOM load
window.addEventListener("DOMContentLoaded", initializeApp);

// Clean up sound on tab close
window.addEventListener("beforeunload", () => {
  deactivateMusicPage();
});
