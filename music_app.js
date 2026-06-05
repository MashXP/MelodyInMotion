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

// Cache preferences
let handLandmarker = null;
let webcamRunning = false;
let isCameraPowered = false;

// --- APP SETUP ---
async function initializeApp() {
  updateStatus("loading", "Loading MediaPipe & Templates...");
  
  try {
    // 1. Initialize templates and classifier reference shapes
    await initTemplates();
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
    
    // 3. Initialize the SignMusic game coordinator
    initMusicPage();

    // 4. Automatically power on camera
    powerOnCamera();

    // 5. Setup safety controls if legacy buttons are present (for backwards compatibility)
    setupLegacyControls();
    
  } catch (error) {
    console.error("SignMusic Initialization failed:", error);
    updateStatus("offline", "Initialization Error");
    if (loadingOverlay) {
      loadingOverlay.style.display = "flex";
      loadingOverlay.style.opacity = "1";
    }
    if (loadingText) {
      loadingText.innerText = "Error loading MediaPipe. Check your internet connection.";
    }
  }
}

function updateStatus(status, text) {
  console.log(`[System Status: ${status.toUpperCase()}] ${text}`);
}

// --- CAMERA POWER CONTROLS ---
function powerOnCamera() {
  if (loadingOverlay) {
    loadingOverlay.style.display = "flex";
    loadingOverlay.style.opacity = "1";
  }
  if (loadingText) {
    loadingText.innerText = "Accessing camera device...";
  }

  const constraints = {
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      facingMode: "user"
    }
  };

  navigator.mediaDevices.getUserMedia(constraints)
    .then((stream) => {
      if (video) {
        video.srcObject = stream;
        video.addEventListener("loadeddata", startDetection);
      }
      isCameraPowered = true;
    })
    .catch((err) => {
      console.error("Camera access denied:", err);
      if (loadingOverlay) {
        loadingOverlay.style.display = "flex";
        loadingOverlay.style.opacity = "1";
      }
      if (loadingText) {
        loadingText.innerText = "Camera access denied. Please grant webcam permissions and reload.";
      }
    });
}

function startDetection() {
  webcamRunning = true;
  if (loadingOverlay) {
    loadingOverlay.style.opacity = "0";
    setTimeout(() => {
      if (webcamRunning && loadingOverlay) loadingOverlay.style.display = "none";
    }, 500);
  }
  
  if (video && canvas) {
    // Resize canvas to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
  
  // Start prediction loops
  requestAnimationFrame(predictLoop);
}

// --- MAIN PREDICTION LOOP ---
let lastVideoTime = -1;

function predictLoop() {
  if (!webcamRunning || !handLandmarker) return;
  
  const nowInMs = performance.now();
  
  if (video && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    
    // Clear canvas
    if (canvasCtx && canvas) {
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Run MediaPipe Landmark inference
    const detections = handLandmarker.detectForVideo(video, nowInMs);
    
    // Fetch showSkeleton preference dynamically
    const showSkeleton = localStorage.getItem("signquest_show_skeleton") !== "false";
    
    // Direct feed into our SignMusic prediction processor
    updateMusicPrediction(detections, canvasCtx, showSkeleton);
  }
  
  requestAnimationFrame(predictLoop);
}

function setupLegacyControls() {
  // Safe bindings for legacy controls if they exist in html
  const btnPowerCamera = document.getElementById("btn-power-camera");
  if (btnPowerCamera) {
    btnPowerCamera.addEventListener("click", () => {
      if (isCameraPowered) {
        webcamRunning = false;
        isCameraPowered = false;
        deactivateMusicPage();
        if (video && video.srcObject) {
          const stream = video.srcObject;
          stream.getTracks().forEach(track => track.stop());
          video.srcObject = null;
        }
        if (canvasCtx && canvas) canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        btnPowerCamera.innerHTML = `Start Camera`;
      } else {
        powerOnCamera();
        btnPowerCamera.innerHTML = `Stop Camera`;
      }
    });
  }
}

// Start on DOM load
window.addEventListener("DOMContentLoaded", initializeApp);

// Clean up sound on tab close
window.addEventListener("beforeunload", () => {
  deactivateMusicPage();
});
