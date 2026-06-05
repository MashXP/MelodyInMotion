// --- SIGNMUSIC CORE COORDINATOR & UI CONTROLLER ---
import { classifyMusicNote } from "./music_classifier.js";
import { getMusicTemplate, saveCustomMusicTemplate, resetCustomMusicTemplates, exportCustomMusicTemplates } from "./music_templates.js";
import { playNote, releaseNote, setVolume, setWaveform, setDelayEnabled, setVibratoEnabled, initSynth, getSynthState, resumeAudio } from "./synth.js";
import { drawSkeleton } from "./drawing.js";

// --- STATE ---
let activeOctave = 4; // C4-B4 is middle octave
let activeNote = "-";
let targetCalibrateNote = "DO";
let isMusicActive = false;

// Debouncing and Noise reduction state
let debouncedLeftFingers = 0; // 0 = no hand (requires explicit left hand to activate)
let pendingLeftFingers = -1;  // -1 = uninitialized, forces first valid frame to register
let consecutiveLeftFingersCount = 0;
const LEFT_FINGERS_DEBOUNCE_THRESHOLD = 6; // frames required to lock in a finger count

let pendingNote = "-";
let consecutiveNoteCount = 0;
const NOTE_DEBOUNCE_THRESHOLD = 4; // frames required to change note (66ms at 60fps)

let consecutiveLostFrames = 0;
const LOSS_DEBOUNCE_THRESHOLD = 8; // frames allowed for brief tracking drops (130ms at 60fps)

// Synth change-detection — prevents calling playNote/releaseNote every frame
let lastPlayedNote = "-";
let lastPlayedOctave = -1;
let lastSynthPlaying = false; // tracks whether synth was playing last frame

// Calibration automation state
let isCalibratingAutomated = false;
let calibrationCountdown = 0;
let calibrationCaptureIndex = 0;
let captureFlag = false;
let calibrationTimer = null;
let calibrationNextTimeout = null;


// DOM hooks
let elMusicNoteBox = null;
let elMusicNoteVal = null;
let elLeftHandStatus = null;
let elRightHandStatus = null;
let elOctaveContainer = null;
let elVirtualKeyboard = null;
let elCalibrateSelect = null;
let elBtnCalibrate = null;
let elBtnResetCalibration = null;
let elBtnExportCalibration = null;

// Audio context unlock state
let audioInitialized = false;

const NOTE_DETAILS = {
  DO: { label: "Do", key: "C", color: "var(--accent-rose)", emoji: "✊" },
  RE: { label: "Re", key: "D", color: "#fb923c", emoji: "🤚" }, // Orange
  MI: { label: "Mi", key: "E", color: "var(--accent-index)", emoji: "✋" }, // Amber/Yellow (Wait, index color is amber in drawing.js)
  FA: { label: "Fa", key: "F", color: "var(--accent-emerald)", emoji: "👎" },
  SOL: { label: "Sol", key: "G", color: "var(--accent-cyan)", emoji: "👋" },
  LA: { label: "La", key: "A", color: "var(--accent-indigo)", emoji: "🖐️" },
  TI: { label: "Ti", key: "B", color: "var(--accent-violet)", emoji: "☝️" }
};

const NOTE_SEMITONES = {
  DO: 0,
  RE: 2,
  MI: 4,
  FA: 5,
  SOL: 7,
  LA: 9,
  TI: 11
};

/**
 * Calculates note frequency based on solfege name and octave.
 */
function getFrequency(noteName, octave) {
  const semitone = NOTE_SEMITONES[noteName];
  if (semitone === undefined) return 0;
  // MIDI note for C0 is 12. C4 (Middle C) is MIDI 60.
  const midi = 12 * (octave + 1) + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Initializes the music page layout, listeners, and keyboard.
 */
export function initMusicPage(elements) {
  // Bind DOM elements
  elMusicNoteBox = elements.musicNoteBox;
  elMusicNoteVal = elements.musicNoteVal;
  elLeftHandStatus = elements.leftHandStatus;
  elRightHandStatus = elements.rightHandStatus;
  elOctaveContainer = elements.octaveContainer;
  elVirtualKeyboard = elements.virtualKeyboard;
  elCalibrateSelect = elements.calibrateSelect;
  elBtnCalibrate = elements.btnCalibrate;
  elBtnResetCalibration = elements.btnResetCalibration;
  elBtnExportCalibration = elements.btnExportCalibration;

  isMusicActive = true;

  // Build UI
  setupVirtualKeyboard();
  updateOctaveUI();
  setupSettingsListeners();
  updateHandRolesLabels();

  // Try to initialize synth on first user action on the tab (capturing phase to bypass race condition)
  window.addEventListener("mousedown", triggerAudioUnlock, { capture: true, once: true });
  window.addEventListener("pointerdown", triggerAudioUnlock, { capture: true, once: true });
  window.addEventListener("touchstart", triggerAudioUnlock, { capture: true, once: true });
  document.body.addEventListener("click", triggerAudioUnlock, { once: true });

  // General listener to resume AudioContext on user clicks
  document.addEventListener("click", resumeAudio);

  // Make the note display box clickable
  if (elMusicNoteBox) {
    elMusicNoteBox.style.cursor = "pointer";
    elMusicNoteBox.addEventListener("pointerdown", () => {
      triggerAudioUnlock();
      if (activeNote !== "-") {
        const freq = getFrequency(activeNote, activeOctave);
        playNote(freq, activeNote, activeOctave);
        highlightKeyInUI(activeNote);
      }
    });
    elMusicNoteBox.addEventListener("pointerup", () => {
      releaseNote();
      clearKeyboardHighlights();
    });
    elMusicNoteBox.addEventListener("pointerleave", () => {
      releaseNote();
      clearKeyboardHighlights();
    });
  }
}

function triggerAudioUnlock() {
  initSynth();
  resumeAudio();
  audioInitialized = true;
}

/**
 * Clean shutdown when navigating away.
 */
export function deactivateMusicPage() {
  isMusicActive = false;
  releaseNote();
  clearKeyboardHighlights();
  if (elMusicNoteVal) elMusicNoteVal.innerText = "-";
  if (elMusicNoteBox) {
    elMusicNoteBox.className = "letter-box";
    elMusicNoteBox.style.borderColor = "";
    elMusicNoteBox.style.boxShadow = "";
  }
}

/**
 * Builds the visual keyboard panels.
 */
function setupVirtualKeyboard() {
  if (!elVirtualKeyboard) return;
  elVirtualKeyboard.innerHTML = "";

  Object.entries(NOTE_DETAILS).forEach(([noteId, detail]) => {
    const keyPanel = document.createElement("div");
    keyPanel.className = "music-key-panel";
    keyPanel.id = `key-panel-${noteId}`;
    keyPanel.style.setProperty("--key-color", detail.color);

    keyPanel.innerHTML = `
      <div class="key-emoji">${detail.emoji}</div>
      <div class="key-solfege">${detail.label}</div>
      <div class="key-note-letter">${detail.key}</div>
    `;

    // Click to play feature (fallback/mouse/touch interaction)
    keyPanel.addEventListener("pointerdown", () => {
      triggerAudioUnlock();
      const freq = getFrequency(noteId, activeOctave);
      playNote(freq, noteId, activeOctave);
      highlightKeyInUI(noteId);
    });

    keyPanel.addEventListener("pointerup", () => {
      releaseNote();
      clearKeyboardHighlights();
    });

    keyPanel.addEventListener("pointerleave", () => {
      // If pointer leaves, stop playing this note
      const state = getSynthState();
      if (state.currentNote === noteId) {
        releaseNote();
        clearKeyboardHighlights();
      }
    });

    elVirtualKeyboard.appendChild(keyPanel);
  });
}

/**
 * Highlights a key in the visual keyboard.
 */
function highlightKeyInUI(noteId) {
  clearKeyboardHighlights();
  const panel = document.getElementById(`key-panel-${noteId}`);
  if (panel) {
    panel.classList.add("active");
  }
}

function clearKeyboardHighlights() {
  document.querySelectorAll(".music-key-panel").forEach(panel => {
    panel.classList.remove("active");
  });
}

/**
 * Updates the octave indicator dots.
 */
function updateOctaveUI() {
  if (!elOctaveContainer) return;
  elOctaveContainer.innerHTML = "";

  // Octaves 2 to 6
  for (let o = 2; o <= 6; o++) {
    const item = document.createElement("div");
    item.className = `octave-indicator-item ${o === activeOctave ? "active" : ""}`;
    item.innerHTML = `
      <div class="octave-dot"></div>
      <div class="octave-label">C${o}</div>
    `;
    
    // Allow clicking to change manually
    item.addEventListener("click", () => {
      activeOctave = o;
      updateOctaveUI();
    });

    elOctaveContainer.appendChild(item);
  }
}

/**
 * Synthesizer parameter sliders and checkboxes setup.
 */
function setupSettingsListeners() {
  const state = getSynthState();

  // Volume Slider
  const volSlider = document.getElementById("synth-volume");
  if (volSlider) {
    volSlider.value = state.volume;
    volSlider.addEventListener("input", (e) => {
      setVolume(parseFloat(e.target.value));
    });
  }

  // Waveform Buttons
  document.querySelectorAll(".waveform-btn").forEach(btn => {
    if (btn.dataset.wave === state.waveform) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".waveform-btn").forEach(b => b.classList.remove("active"));
      e.currentTarget.classList.add("active");
      setWaveform(e.currentTarget.dataset.wave);
    });
  });

  // Delay Effect Toggle
  const delayToggle = document.getElementById("synth-delay");
  if (delayToggle) {
    delayToggle.checked = state.delayEnabled;
    delayToggle.addEventListener("change", (e) => {
      setDelayEnabled(e.target.checked);
    });
  }

  // Vibrato LFO Toggle
  const vibratoToggle = document.getElementById("synth-vibrato");
  if (vibratoToggle) {
    vibratoToggle.checked = state.vibratoEnabled;
    vibratoToggle.addEventListener("change", (e) => {
      setVibratoEnabled(e.target.checked);
    });
  }

  // Left Handed Mode Toggle
  const leftyToggle = document.getElementById("hand-roles-lefty");
  if (leftyToggle) {
    leftyToggle.checked = localStorage.getItem("signquest_left_handed") === "true";
    leftyToggle.addEventListener("change", (e) => {
      localStorage.setItem("signquest_left_handed", e.target.checked.toString());
      updateHandRolesLabels();
    });
  }

  // Calibration note select dropdown
  if (elCalibrateSelect) {
    elCalibrateSelect.addEventListener("change", (e) => {
      targetCalibrateNote = e.target.value;
    });
  }

  // Calibrate button click
  if (elBtnCalibrate) {
    elBtnCalibrate.addEventListener("click", () => {
      if (isCalibratingAutomated) {
        cancelCalibration();
      } else {
        startAutomatedCalibration();
      }
    });
  }

  // Reset calibration
  if (elBtnResetCalibration) {
    elBtnResetCalibration.addEventListener("click", () => {
      if (confirm("Reset all custom Solfege templates?")) {
        resetCustomMusicTemplates();
      }
    });
  }

  // Export JSON
  if (elBtnExportCalibration) {
    elBtnExportCalibration.addEventListener("click", () => {
      exportCustomMusicTemplates();
    });
  }
}

/**
 * Counts the number of extended fingers on a hand.
 * Returns a count from 0 to 5.
 */
function countExtendedFingers(landmarks) {
  if (!landmarks || landmarks.length < 21) return 0;
  
  let extendedCount = 0;
  const wrist = landmarks[0];
  
  const dist = (p1, p2) => Math.sqrt(
    Math.pow(p1.x - p2.x, 2) +
    Math.pow(p1.y - p2.y, 2) +
    Math.pow(p1.z - p2.z, 2)
  );

  // Index (tip 8, pip 6, mcp 5)
  if (dist(landmarks[8], wrist) > dist(landmarks[6], wrist) * 1.1) extendedCount++;
  // Middle (tip 12, pip 10, mcp 9)
  if (dist(landmarks[12], wrist) > dist(landmarks[10], wrist) * 1.1) extendedCount++;
  // Ring (tip 16, pip 14, mcp 13)
  if (dist(landmarks[16], wrist) > dist(landmarks[14], wrist) * 1.1) extendedCount++;
  // Pinky (tip 20, pip 18, mcp 17)
  if (dist(landmarks[20], wrist) > dist(landmarks[18], wrist) * 1.1) extendedCount++;

  // Thumb: check distance between thumb tip (4) and index MCP (5)
  // When tucked, thumb tip is close to index MCP. When extended, it points outwards.
  const thumbExt = dist(landmarks[4], landmarks[5]) > dist(landmarks[2], landmarks[5]) * 0.8;
  if (thumbExt) extendedCount++;

  return extendedCount;
}

/**
 * Runs music hand landmark prediction logic.
 * Processes both hands, adjusts synth frequency, highlights visual panels, and renders overlays.
 */
export function updateMusicPrediction(detections, canvasCtx, showSkeleton) {
  if (!isMusicActive) return;

  let leftHandLandmarks = null;
  let rightHandLandmarks = null;

  // 1. Separate left and right hand landmarks
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

  const bothHandsPresentThisFrame = (leftHandLandmarks !== null && rightHandLandmarks !== null);
  
  // Track loss of hands with a grace period buffer
  if (bothHandsPresentThisFrame) {
    consecutiveLostFrames = 0;
  } else {
    consecutiveLostFrames++;
  }

  const bothHandsVisible = (consecutiveLostFrames < LOSS_DEBOUNCE_THRESHOLD);

  // Determine hand roles dynamically based on Left-Handed Mode setting
  const isLefty = localStorage.getItem("signquest_left_handed") === "true";
  
  const noteHandLandmarks = isLefty ? leftHandLandmarks : rightHandLandmarks;
  const octaveHandLandmarks = isLefty ? rightHandLandmarks : leftHandLandmarks;
  
  const noteHandName = isLefty ? "Left" : "Right";
  const octaveHandName = isLefty ? "Right" : "Left";
  
  const octaveLabel = isLefty ? "Octave (Right)" : "Octave (Left)";
  const noteLabel = isLefty ? "Sign (Left)" : "Sign (Right)";

  let leftFingers = 0;

  // 2. Process Octave Hand
  if (octaveHandLandmarks) {
    const rawFingers = countExtendedFingers(octaveHandLandmarks);
    
    if (rawFingers === pendingLeftFingers) {
      consecutiveLeftFingersCount++;
      const threshold = (rawFingers === 0) ? 2 : LEFT_FINGERS_DEBOUNCE_THRESHOLD;
      if (consecutiveLeftFingersCount >= threshold) {
        debouncedLeftFingers = rawFingers;
        if (debouncedLeftFingers >= 1 && debouncedLeftFingers <= 5) {
          const targetOctave = debouncedLeftFingers + 1;
          if (activeOctave !== targetOctave) {
            activeOctave = targetOctave;
            updateOctaveUI();
          }
        }
      }
    } else {
      pendingLeftFingers = rawFingers;
      consecutiveLeftFingersCount = 1;
    }
    
    leftFingers = debouncedLeftFingers;

    if (elLeftHandStatus) {
      elLeftHandStatus.innerText = `${octaveLabel}: C${activeOctave} (${leftFingers} fingers)`;
    }

    // Draw Octave Hand Skeleton in a Cool Cyan/Blue glow
    if (showSkeleton) {
      drawSkeleton(canvasCtx, octaveHandLandmarks, "#06b6d4");
    }
  } else {
    // If octave hand is missing, only clear indicators if we exceed the grace threshold
    if (!bothHandsVisible) {
      debouncedLeftFingers = 0; // Reset debounced value when hand is truly gone
      leftFingers = 0;
    } else {
      leftFingers = debouncedLeftFingers;
    }
    if (elLeftHandStatus) {
      elLeftHandStatus.innerText = `${octaveLabel}: C${activeOctave} (No hand)`;
    }
  }

  // 3. Process Note Hand (Note & Calibration)
  if (noteHandLandmarks) {
    // Automated Capture logic
    if (isCalibratingAutomated && captureFlag) {
      captureFlag = false; // Reset immediately to prevent multiple captures in same interval
      
      const slotCount = saveCustomMusicTemplate(targetCalibrateNote, noteHandLandmarks, noteHandName);
      if (slotCount > 0) {
        triggerCalibrationFlash(slotCount);
      }
      
      calibrationCaptureIndex++;
      if (calibrationCaptureIndex < 10) {
        if (elBtnCalibrate) {
          elBtnCalibrate.innerHTML = `<span>📸 Capturing (Slot ${calibrationCaptureIndex + 1}/10)</span>`;
        }
        // Schedule next capture in 0.5 seconds
        calibrationNextTimeout = setTimeout(() => {
          if (isCalibratingAutomated) {
            captureFlag = true;
          }
        }, 500);
      } else {
        // Calibration complete!
        isCalibratingAutomated = false;
        if (elBtnCalibrate) {
          elBtnCalibrate.innerHTML = `<span>✅ Calibrated (10/10 slots)</span>`;
          elBtnCalibrate.style.background = "linear-gradient(135deg, var(--accent-emerald), #059669)";
          
          setTimeout(() => {
            if (!isCalibratingAutomated) {
              elBtnCalibrate.innerHTML = `<span>📸 Calibrate Note</span>`;
              elBtnCalibrate.style.background = "";
            }
          }, 2000);
        }
      }
    }

    // Perform Note Classification
    const rawDetectedNote = classifyMusicNote(noteHandLandmarks, noteHandName);
    
    // Debounce note classifications
    if (rawDetectedNote === pendingNote) {
      consecutiveNoteCount++;
    } else {
      pendingNote = rawDetectedNote;
      consecutiveNoteCount = 1;
    }

    let detectedNote = activeNote; // fallback to current played note during debounce transitions
    if (consecutiveNoteCount >= NOTE_DEBOUNCE_THRESHOLD) {
      detectedNote = rawDetectedNote;
    }

    // Play ONLY if both hands are visible AND octave hand is extending at least 1 finger
    const isLeftHandActive = (leftFingers >= 1 && leftFingers <= 5);
    const shouldPlay = bothHandsVisible && isLeftHandActive && (detectedNote !== "-");

    if (shouldPlay) {
      activeNote = detectedNote;

      // Update UI Box
      const detail = NOTE_DETAILS[detectedNote];
      if (elMusicNoteVal) elMusicNoteVal.innerText = detail.label;
      if (elMusicNoteBox) {
        elMusicNoteBox.className = "letter-box active-match";
        elMusicNoteBox.style.borderColor = detail.color;
        elMusicNoteBox.style.boxShadow = `0 0 25px ${detail.color}`;
      }

      // --- CHANGE-DETECTION GATE ---
      // Only call playNote when note or octave actually changes to avoid per-frame
      // portamento restarts that cause stuttering/clicking artefacts.
      const noteChanged = (detectedNote !== lastPlayedNote);
      const octaveChanged = (activeOctave !== lastPlayedOctave);
      if (noteChanged || octaveChanged || !lastSynthPlaying) {
        const freq = getFrequency(detectedNote, activeOctave);
        playNote(freq, detectedNote, activeOctave);
        lastPlayedNote = detectedNote;
        lastPlayedOctave = activeOctave;
        lastSynthPlaying = true;
        // Highlight visual key panel on change
        highlightKeyInUI(detectedNote);
      }

      if (elRightHandStatus) {
        elRightHandStatus.innerText = `${noteLabel}: ${detail.label} (${detail.key})`;
      }
    } else {
      // Only release once when transitioning from playing → silent
      if (lastSynthPlaying) {
        activeNote = "-";
        lastPlayedNote = "-";
        lastPlayedOctave = -1;
        lastSynthPlaying = false;

        if (elMusicNoteVal) elMusicNoteVal.innerText = "-";
        if (elMusicNoteBox) {
          elMusicNoteBox.className = "letter-box";
          elMusicNoteBox.style.borderColor = "";
          elMusicNoteBox.style.boxShadow = "";
        }

        releaseNote();
        clearKeyboardHighlights();
      }

      if (elRightHandStatus) {
        if (!bothHandsVisible) {
          elRightHandStatus.innerText = `${noteLabel}: Both hands required`;
        } else if (!isLeftHandActive) {
          elRightHandStatus.innerText = `${noteLabel}: Octave hand silent (0 fingers)`;
        } else {
          elRightHandStatus.innerText = `${noteLabel}: None`;
        }
      }
    }

    // Draw Note Hand Skeleton in a Cool Pink/Magenta glow
    if (showSkeleton) {
      drawSkeleton(canvasCtx, noteHandLandmarks, "#d946ef");
    }

    // Render Ghost Blueprint Guide for the selected calibration note over user's hand
    const template = getMusicTemplate(targetCalibrateNote);
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

      // Render template ghost in semi-translucent soft yellow
      drawSkeleton(canvasCtx, guidedLandmarks, "rgba(253, 224, 71, 0.45)", true);
    }
  } else {
    // Note hand missing — release only once when transitioning from playing → silent
    if (!bothHandsVisible && lastSynthPlaying) {
      activeNote = "-";
      lastPlayedNote = "-";
      lastPlayedOctave = -1;
      lastSynthPlaying = false;

      if (elMusicNoteVal) elMusicNoteVal.innerText = "-";
      if (elMusicNoteBox) {
        elMusicNoteBox.className = "letter-box";
        elMusicNoteBox.style.borderColor = "";
        elMusicNoteBox.style.boxShadow = "";
      }

      releaseNote();
      clearKeyboardHighlights();

      if (elRightHandStatus) {
        elRightHandStatus.innerText = `${noteLabel}: None`;
      }
    }

    // Draw Ghost Blueprint in the center of the canvas if no hand is detected
    const template = getMusicTemplate(targetCalibrateNote);
    if (template && showSkeleton) {
      drawSkeleton(canvasCtx, template, "rgba(255, 255, 255, 0.25)", true);
    }
  }
}

/**
 * Visual feedback when calibration succeeds.
 */
function triggerCalibrationFlash(slotCount) {
  const panel = document.querySelector(".calibration-music-card");
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

  // If not in automated mode, we can show the feedback text on the button itself
  if (!isCalibratingAutomated && elBtnCalibrate) {
    const originalText = elBtnCalibrate.innerHTML;
    elBtnCalibrate.innerHTML = `<span>✅ Calibrated Note (${slotCount}/10 slots)</span>`;
    const originalBg = elBtnCalibrate.style.background;
    elBtnCalibrate.style.background = "linear-gradient(135deg, var(--accent-emerald), #059669)";

    setTimeout(() => {
      elBtnCalibrate.innerHTML = originalText;
      elBtnCalibrate.style.background = originalBg;
    }, 1500);
  }
}

/**
 * Starts the automated countdown and captures 10 landmarks (1 per second).
 */
function startAutomatedCalibration() {
  if (!elBtnCalibrate) return;
  isCalibratingAutomated = true;
  calibrationCountdown = 3;
  calibrationCaptureIndex = 0;
  captureFlag = false;

  if (calibrationTimer) clearInterval(calibrationTimer);
  if (calibrationNextTimeout) clearTimeout(calibrationNextTimeout);

  elBtnCalibrate.innerHTML = `<span>⏳ Ready in ${calibrationCountdown}s...</span>`;
  elBtnCalibrate.style.background = "linear-gradient(135deg, var(--accent-rose), #e11d48)";

  calibrationTimer = setInterval(() => {
    calibrationCountdown--;
    if (calibrationCountdown > 0) {
      elBtnCalibrate.innerHTML = `<span>⏳ Ready in ${calibrationCountdown}s...</span>`;
    } else {
      clearInterval(calibrationTimer);
      calibrationTimer = null;
      // Trigger the very first capture immediately
      captureFlag = true;
      elBtnCalibrate.innerHTML = `<span>📸 Capturing (Slot 1/10)</span>`;
      elBtnCalibrate.style.background = "linear-gradient(135deg, var(--accent-cyan), #0891b2)";
    }
  }, 1000);
}

/**
 * Cancels any active automated calibration sequence.
 */
function cancelCalibration() {
  isCalibratingAutomated = false;
  captureFlag = false;
  if (calibrationTimer) {
    clearInterval(calibrationTimer);
    calibrationTimer = null;
  }
  if (calibrationNextTimeout) {
    clearTimeout(calibrationNextTimeout);
    calibrationNextTimeout = null;
  }
  if (elBtnCalibrate) {
    elBtnCalibrate.innerHTML = `<span>📸 Calibrate Note</span>`;
    elBtnCalibrate.style.background = "";
  }
}

/**
 * Updates UI labels and instructions according to the left-handed preference.
 */
function updateHandRolesLabels() {
  const isLefty = localStorage.getItem("signquest_left_handed") === "true";
  const octaveLabel = isLefty ? "Octave (Right)" : "Octave (Left)";
  const noteLabel = isLefty ? "Sign (Left)" : "Sign (Right)";
  
  if (elLeftHandStatus) {
    elLeftHandStatus.innerText = `${octaveLabel}: C${activeOctave} (No hand)`;
  }
  if (elRightHandStatus) {
    elRightHandStatus.innerText = `${noteLabel}: None`;
  }

  const instructionEl = document.querySelector(".challenge-instruction");
  if (instructionEl) {
    if (isLefty) {
      instructionEl.innerHTML = "Show Solfège signs with your <strong>left hand</strong> to trigger notes. Control octave (C2 - C6) using extended finger counts (1 - 5) on your <strong>right hand</strong>!";
    } else {
      instructionEl.innerHTML = "Show Solfège signs with your <strong>right hand</strong> to trigger notes. Control octave (C2 - C6) using extended finger counts (1 - 5) on your <strong>left hand</strong>!";
    }
  }
}
