import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8";
import { initTemplates } from "../templates.js";
import { initMusicTemplates } from "../music_templates.js";
import { initSynth, resumeAudio, setVolume } from "../synth.js";
import { gameState } from "./state.js";
import { dom, initDom } from "./dom.js";
import { powerOnCamera, powerOffCamera } from "./camera.js";
import { setupListeners, populateSongList, selectExercise } from "./ui.js";
import { setupLanesCanvas } from "./renderer.js";
import { stopGame } from "./game_modes.js";

async function initializeApp() {
  updateStatus("loading", "Initializing App...");
  
  try {
    // 1. Initialize DOM reference cache
    initDom();

    // 2. Init templates
    await initTemplates();
    await initMusicTemplates();
    
    // 3. Load exercises from JSON
    await loadExercises();

    // 4. Setup MediaPipe
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
    );
    
    gameState.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 2
    });
    
    // 5. Power on camera
    powerOnCamera();

    // 6. Initialize UI listeners and lane resizing
    setupListeners();
    setupLanesCanvas();
    
    // Set UI states from localStorage/state defaults
    dom.video.style.opacity = gameState.showCamera ? "1" : "0";
    dom.btnToggleCamera.innerHTML = gameState.showCamera 
      ? `<span class="btn-icon">👁️</span> Hide Camera Feed` 
      : `<span class="btn-icon">👁️</span> Show Camera Feed`;

    dom.btnToggleSkeleton.innerHTML = gameState.showSkeleton
      ? `<span class="btn-icon">🕸️</span> Hide Skeleton`
      : `<span class="btn-icon">🕸️</span> Show Skeleton`;

    if (gameState.soundMuted) {
      setVolume(0, false);
      dom.btnToggleSound.innerHTML = `<span class="btn-icon">🔇</span> Unmute Sound`;
      dom.synthVolume.value = 0;
    } else {
      setVolume(gameState.userVolume, true);
      dom.btnToggleSound.innerHTML = `<span class="btn-icon">🔊</span> Mute Sound`;
    }

    // Trigger audio unlock on body interactions
    const unlockAudio = () => {
      initSynth();
      resumeAudio();
      window.removeEventListener("mousedown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };
    window.addEventListener("mousedown", unlockAudio);
    window.addEventListener("touchstart", unlockAudio);

    updateStatus("online", "Ready");
  } catch (error) {
    console.error("Rhythm Game initialization failed:", error);
    if (dom.loadingOverlay) {
      dom.loadingOverlay.style.display = "flex";
      dom.loadingOverlay.style.opacity = "1";
    }
    if (dom.loadingText) {
      dom.loadingText.innerText = "Error loading MediaPipe components. Please check your network and reload.";
    }
  }
}

function updateStatus(status, text) {
  console.log(`[Rhythm Status: ${status.toUpperCase()}] ${text}`);
}

async function loadExercises() {
  try {
    const response = await fetch(`./music_exercises.json?t=${Date.now()}`);
    if (response.ok) {
      const data = await response.json();
      gameState.exercises = data.map(ex => {
        return {
          ...ex,
          bpm: Math.round(ex.bpm * 0.75)
        };
      });

      // Load custom exercises from localStorage
      try {
        const customRaw = localStorage.getItem("signquest_custom_exercises");
        if (customRaw) {
          const customList = JSON.parse(customRaw);
          if (Array.isArray(customList)) {
            customList.forEach(ex => {
              // Mark as custom and apply BPM scaling to match the rest of the game
              gameState.exercises.push({
                ...ex,
                isCustom: true,
                bpm: Math.round(ex.bpm * 0.75)
              });
            });
          }
        }
      } catch (err) {
        console.error("Failed to parse custom exercises from localStorage:", err);
      }

      populateSongList();
      if (gameState.exercises.length > 0) {
        const savedExerciseId = localStorage.getItem("signquest_current_exercise_id");
        const exists = gameState.exercises.some(ex => ex.id === savedExerciseId);
        if (savedExerciseId && exists) {
          selectExercise(savedExerciseId);
        } else {
          selectExercise(gameState.exercises[0].id);
        }
      }
    } else {
      dom.songListContainer.innerHTML = `<div style="padding: 1rem; text-align: center; color: var(--accent-rose);">Failed to load level database.</div>`;
    }
  } catch (e) {
    console.error("Failed to load levels list:", e);
    dom.songListContainer.innerHTML = `<div style="padding: 1rem; text-align: center; color: var(--accent-rose);">Error loading levels list.</div>`;
  }
}

// Start app
window.addEventListener("DOMContentLoaded", initializeApp);

// Stop camera and audio on leaving
window.addEventListener("beforeunload", () => {
  stopGame();
  powerOffCamera();
});
