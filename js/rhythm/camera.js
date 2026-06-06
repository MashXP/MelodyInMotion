import { getMusicTemplatesList, saveCustomMusicTemplate } from "../music_templates.js";
import { classifyMusicNote } from "../music_classifier.js";
import { drawSkeleton } from "../drawing.js";
import { releaseNote } from "../synth.js";
import { gameState } from "./state.js";
import { dom } from "./dom.js";
import {
  NOTE_DETAILS,
  NOTE_DEBOUNCE_THRESHOLD,
  LEFT_FINGERS_DEBOUNCE_THRESHOLD,
  LOSS_THRESHOLD,
  OCTAVE_LOSS_GRACE_PERIOD
} from "./constants.js";

let lastVideoTime = -1;
let consecutiveLostFrames = 0;

export function powerOnCamera() {
  dom.loadingOverlay.style.display = "flex";
  dom.loadingOverlay.style.opacity = "1";
  dom.loadingText.innerText = "Accessing camera device...";

  const constraints = {
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      facingMode: "user"
    }
  };

  navigator.mediaDevices.getUserMedia(constraints)
    .then((stream) => {
      dom.video.srcObject = stream;
      dom.video.addEventListener("loadeddata", startDetection);
      gameState.isCameraPowered = true;
      dom.btnPowerCamera.innerHTML = `<span class="btn-icon">🔌</span> Stop Camera`;
      dom.btnToggleCamera.disabled = false;
    })
    .catch((err) => {
      console.error("Camera access denied:", err);
      dom.loadingOverlay.style.display = "flex";
      dom.loadingOverlay.style.opacity = "1";
      dom.loadingText.innerText = "Camera access denied. Please grant webcam permissions and reload.";
      dom.btnToggleCamera.disabled = true;
    });
}

export function powerOffCamera() {
  gameState.webcamRunning = false;
  gameState.isCameraPowered = false;
  releaseNote();
  
  if (dom.video.srcObject) {
    const stream = dom.video.srcObject;
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
    dom.video.srcObject = null;
  }

  dom.canvasCtx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
  
  dom.loadingOverlay.style.display = "flex";
  dom.loadingOverlay.style.opacity = "1";
  dom.loadingText.innerText = "Camera is powered off.";
  dom.btnPowerCamera.innerHTML = `<span class="btn-icon">🔌</span> Start Camera`;
  dom.btnToggleCamera.disabled = true;
}

export function startDetection() {
  gameState.webcamRunning = true;
  dom.loadingOverlay.style.opacity = "0";
  setTimeout(() => {
    if (gameState.webcamRunning) dom.loadingOverlay.style.display = "none";
  }, 500);
  
  dom.canvas.width = dom.video.videoWidth;
  dom.canvas.height = dom.video.videoHeight;
  requestAnimationFrame(predictLoop);
}

export function predictLoop() {
  if (!gameState.webcamRunning) return;
  const nowInMs = performance.now();
  
  if (dom.video.currentTime !== lastVideoTime) {
    lastVideoTime = dom.video.currentTime;
    dom.canvasCtx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
    
    const detections = gameState.handLandmarker.detectForVideo(dom.video, nowInMs);
    processHandDetections(detections);
  }
  
  requestAnimationFrame(predictLoop);
}

export function processHandDetections(detections) {
  let leftHandLandmarks = null;
  let rightHandLandmarks = null;

  if (detections.landmarks && detections.landmarks.length > 0) {
    detections.landmarks.forEach((landmarks, idx) => {
      const handedness = detections.handedness[idx][0].displayName; // "Left" or "Right"
      if (handedness === "Left") {
        leftHandLandmarks = landmarks;
      } else {
        rightHandLandmarks = landmarks;
      }
    });
  }

  const bothPresent = (leftHandLandmarks !== null && rightHandLandmarks !== null);
  if (bothPresent) {
    gameState.handLossCounter = 0;
    gameState.bothHandsVisible = true;
  } else {
    gameState.handLossCounter++;
    if (gameState.handLossCounter >= LOSS_THRESHOLD) {
      gameState.bothHandsVisible = false;
    }
  }

  const isLefty = localStorage.getItem("signquest_left_handed") === "true";
  const noteHandLandmarks = isLefty ? leftHandLandmarks : rightHandLandmarks;
  const octaveHandLandmarks = isLefty ? rightHandLandmarks : leftHandLandmarks;
  
  const noteHandName = isLefty ? "Left" : "Right";
  const octaveHandName = isLefty ? "Right" : "Left";

  // 1. Process Octave Hand
  if (octaveHandLandmarks) {
    const rawFingers = countExtendedFingers(octaveHandLandmarks);
    
    if (rawFingers === gameState.pendingLeftFingers) {
      gameState.consecutiveLeftFingersCount++;
      const threshold = (rawFingers === 0) ? 2 : LEFT_FINGERS_DEBOUNCE_THRESHOLD;
      if (gameState.consecutiveLeftFingersCount >= threshold) {
        gameState.debouncedLeftFingers = rawFingers;
        if (gameState.debouncedLeftFingers >= 1 && gameState.debouncedLeftFingers <= 5) {
          // Original dynamic octave logic (commented out):
          // gameState.currentDetectedOctave = gameState.debouncedLeftFingers + 1;
          // gameState.lastValidOctave = gameState.currentDetectedOctave;
          
          // Temporarily locked to C4:
          gameState.currentDetectedOctave = 4;
          gameState.lastValidOctave = 4;
        }
      }
    } else {
      gameState.pendingLeftFingers = rawFingers;
      gameState.consecutiveLeftFingersCount = 1;
    }
    
    // Display live octave status (either Setting with finger count or Locked)
    if (dom.liveOctaveVal) {
      // Original display logic (commented out):
      // if (rawFingers >= 1 && rawFingers <= 5) {
      //   dom.liveOctaveVal.innerText = `C${gameState.currentDetectedOctave} (${rawFingers} fingers)`;
      // } else {
      //   dom.liveOctaveVal.innerText = `C${gameState.currentDetectedOctave} (Locked)`;
      // }
      
      // Temporarily locked to C4:
      dom.liveOctaveVal.innerText = `C4 (Locked)`;
    }
    
    if (gameState.showSkeleton) {
      drawSkeleton(dom.canvasCtx, octaveHandLandmarks, "#06b6d4");
    }
  } else {
    // Retain persistent toggled octave when octave hand is not present
    if (dom.liveOctaveVal) {
      // Original display logic (commented out):
      // dom.liveOctaveVal.innerText = `C${gameState.currentDetectedOctave} (Locked)`;
      
      // Temporarily locked to C4:
      dom.liveOctaveVal.innerText = `C4 (Locked)`;
    }
  }

  // 2. Process Note Hand
  if (noteHandLandmarks) {
    consecutiveLostFrames = 0;
    gameState.noteHandVisible = true;

    // Auto-start level when hand is visible
    if (!gameState.isPlayingGame && 
        (!dom.resultsOverlay || !dom.resultsOverlay.classList.contains("active")) && 
        !gameState.isCalibratingAutomated) {
      import("./game_modes.js").then(m => m.startGame());
    }
    
    // Automated Capture logic
    if (gameState.isCalibratingAutomated && gameState.captureFlag) {
      gameState.captureFlag = false; // Reset immediately to prevent multiple captures in same interval
      
      const slotCount = saveCustomMusicTemplate(gameState.targetCalibrateNote, noteHandLandmarks, noteHandName);
      if (slotCount > 0) {
        triggerCalibrationFlash(slotCount);
      }
      
      gameState.calibrationCaptureIndex++;
      if (gameState.calibrationCaptureIndex < 10) {
        if (dom.btnRhythmCalibrate) {
          dom.btnRhythmCalibrate.innerHTML = `<span>📸 Capturing (Slot ${gameState.calibrationCaptureIndex + 1}/10)</span>`;
        }
        // Schedule next capture in 0.5 seconds
        gameState.calibrationNextTimeout = setTimeout(() => {
          if (gameState.isCalibratingAutomated) {
            gameState.captureFlag = true;
          }
        }, 500);
      } else {
        // Calibration complete!
        gameState.isCalibratingAutomated = false;
        if (dom.btnRhythmCalibrate) {
          dom.btnRhythmCalibrate.innerHTML = `<span>✅ Calibrated (10/10)</span>`;
          dom.btnRhythmCalibrate.style.background = "linear-gradient(135deg, var(--accent-emerald), #059669)";
          
          setTimeout(() => {
            if (!gameState.isCalibratingAutomated) {
              dom.btnRhythmCalibrate.innerHTML = `<span>📸 Calibrate Note</span>`;
              dom.btnRhythmCalibrate.style.background = "";
            }
          }, 2000);
        }
      }
    }

    const rawDetectedNote = classifyMusicNote(noteHandLandmarks, noteHandName);
    
    if (rawDetectedNote === gameState.pendingNote) {
      gameState.consecutiveNoteCount++;
    } else {
      gameState.pendingNote = rawDetectedNote;
      gameState.consecutiveNoteCount = 1;
    }

    if (gameState.consecutiveNoteCount >= NOTE_DEBOUNCE_THRESHOLD) {
      gameState.currentDetectedNote = rawDetectedNote;
    }
    
    // Update live sign status display
    const detail = NOTE_DETAILS[gameState.currentDetectedNote];
    if (dom.liveSignVal) {
      dom.liveSignVal.innerText = detail ? `${detail.label} (${detail.key})` : "None";
    }

    if (gameState.showSkeleton) {
      drawSkeleton(dom.canvasCtx, noteHandLandmarks, "#d946ef");
    }

    // Render blueprint ghost for current target in practice, tutorial, or calibration modes
    let activeTargetNoteName = "-";
    if (gameState.isCalibratingAutomated) {
      activeTargetNoteName = gameState.targetCalibrateNote;
    } else if (gameState.currentExercise && gameState.isPlayingGame) {
      if (gameState.currentExercise.isTutorial) {
        const tNote = gameState.activeNotesInLevel[gameState.tutorialCurrentNoteIndex];
        if (tNote) activeTargetNoteName = tNote.note;
      } else if (gameState.gameMode === "practice" && gameState.isPracticePaused) {
        activeTargetNoteName = gameState.practiceWaitingForNote;
      }
    }

    if (activeTargetNoteName !== "-") {
      const template = getMusicTemplateBlueprint(activeTargetNoteName);
      if (template) {
        const userWrist = noteHandLandmarks[0];
        const userScale = Math.sqrt(
          Math.pow(noteHandLandmarks[9].x - userWrist.x, 2) +
          Math.pow(noteHandLandmarks[9].y - userWrist.y, 2)
        );
        const templateWrist = template[0];
        const templateScale = Math.sqrt(
          Math.pow(template[9].x - templateWrist.x, 2) +
          Math.pow(template[9].y - templateWrist.y, 2)
        );
        const scaleRatio = userScale / templateScale;

        const guidedLandmarks = template.map(t => {
          return {
            x: userWrist.x + (t.x - templateWrist.x) * scaleRatio,
            y: userWrist.y + (t.y - templateWrist.y) * scaleRatio,
            z: userWrist.z + (t.z - templateWrist.z) * scaleRatio
          };
        });
        drawSkeleton(dom.canvasCtx, guidedLandmarks, "rgba(253, 224, 71, 0.45)", true);
      }
    }
  } else {
    consecutiveLostFrames++;
    if (consecutiveLostFrames >= LOSS_THRESHOLD) {
      gameState.noteHandVisible = false;
      if (dom.liveSignVal) {
        dom.liveSignVal.innerText = "None";
      }
      gameState.currentDetectedNote = "-";
      gameState.pendingNote = "-";
    }

    // Render calibration ghost in the center if note hand is missing
    if (gameState.isCalibratingAutomated) {
      const template = getMusicTemplateBlueprint(gameState.targetCalibrateNote);
      if (template && gameState.showSkeleton) {
        drawSkeleton(dom.canvasCtx, template, "rgba(255, 255, 255, 0.25)", true);
      }
    }
  }
}

export function countExtendedFingers(landmarks) {
  if (!landmarks || landmarks.length < 21) return 0;
  let extendedCount = 0;
  const wrist = landmarks[0];
  const dist = (p1, p2) => Math.sqrt(
    Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2)
  );

  if (dist(landmarks[8], wrist) > dist(landmarks[6], wrist) * 1.1) extendedCount++;
  if (dist(landmarks[12], wrist) > dist(landmarks[10], wrist) * 1.1) extendedCount++;
  if (dist(landmarks[16], wrist) > dist(landmarks[14], wrist) * 1.1) extendedCount++;
  if (dist(landmarks[20], wrist) > dist(landmarks[18], wrist) * 1.1) extendedCount++;

  const thumbExt = dist(landmarks[4], landmarks[5]) > dist(landmarks[2], landmarks[5]) * 0.8;
  if (thumbExt) extendedCount++;
  return extendedCount;
}

export function getMusicTemplateBlueprint(noteName) {
  const templates = getMusicTemplatesList(noteName);
  return templates && templates.length > 0 ? templates[0] : null;
}

export function startAutomatedCalibration() {
  if (!dom.btnRhythmCalibrate) return;
  gameState.isCalibratingAutomated = true;
  gameState.calibrationCountdown = 3;
  gameState.calibrationCaptureIndex = 0;
  gameState.captureFlag = false;

  if (gameState.calibrationTimer) clearInterval(gameState.calibrationTimer);
  if (gameState.calibrationNextTimeout) clearTimeout(gameState.calibrationNextTimeout);

  dom.btnRhythmCalibrate.innerHTML = `<span>⏳ Ready in ${gameState.calibrationCountdown}s...</span>`;
  dom.btnRhythmCalibrate.style.background = "linear-gradient(135deg, var(--accent-rose), #e11d48)";

  gameState.calibrationTimer = setInterval(() => {
    gameState.calibrationCountdown--;
    if (gameState.calibrationCountdown > 0) {
      dom.btnRhythmCalibrate.innerHTML = `<span>⏳ Ready in ${gameState.calibrationCountdown}s...</span>`;
    } else {
      clearInterval(gameState.calibrationTimer);
      gameState.calibrationTimer = null;
      // Trigger the very first capture immediately
      gameState.captureFlag = true;
      dom.btnRhythmCalibrate.innerHTML = `<span>📸 Capturing (Slot 1/10)</span>`;
      dom.btnRhythmCalibrate.style.background = "linear-gradient(135deg, var(--accent-cyan), #0891b2)";
    }
  }, 1000);
}

export function cancelCalibration() {
  gameState.isCalibratingAutomated = false;
  gameState.captureFlag = false;
  if (gameState.calibrationTimer) {
    clearInterval(gameState.calibrationTimer);
    gameState.calibrationTimer = null;
  }
  if (gameState.calibrationNextTimeout) {
    clearTimeout(gameState.calibrationNextTimeout);
    gameState.calibrationNextTimeout = null;
  }
  if (dom.btnRhythmCalibrate) {
    dom.btnRhythmCalibrate.innerHTML = `<span>📸 Calibrate Note</span>`;
    dom.btnRhythmCalibrate.style.background = "";
  }
}

export function triggerCalibrationFlash(slotCount) {
  const panel = dom.settingsDrawer;
  if (panel) {
    panel.style.borderColor = "var(--accent-emerald)";
    panel.style.boxShadow = "0 0 20px rgba(16, 185, 129, 0.35)";

    setTimeout(() => {
      panel.style.borderColor = "";
      panel.style.boxShadow = "";
    }, 200); // 200ms flash is clean for consecutive 0.5s captures
  }

  // Play calibration acoustic beep
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  } catch (e) {}

  // If not in automated mode, show feedback text on the button itself
  if (!gameState.isCalibratingAutomated && dom.btnRhythmCalibrate) {
    const originalText = dom.btnRhythmCalibrate.innerHTML;
    dom.btnRhythmCalibrate.innerHTML = `<span>✅ Calibrated (${slotCount}/10)</span>`;
    const originalBg = dom.btnRhythmCalibrate.style.background;
    dom.btnRhythmCalibrate.style.background = "linear-gradient(135deg, var(--accent-emerald), #059669)";

    setTimeout(() => {
      dom.btnRhythmCalibrate.innerHTML = originalText;
      dom.btnRhythmCalibrate.style.background = originalBg;
    }, 1500);
  }
}
