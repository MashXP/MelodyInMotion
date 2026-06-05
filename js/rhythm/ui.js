import { setVolume } from "../synth.js";
import { resetCustomMusicTemplates, exportCustomMusicTemplates } from "../music_templates.js";
import { gameState, resetGameStateStats } from "./state.js";
import { dom } from "./dom.js";
import { startGame, stopGame, skipTutorial } from "./game_modes.js";
import { drawTrackStatic } from "./renderer.js";
import { powerOnCamera, powerOffCamera, cancelCalibration, startAutomatedCalibration } from "./camera.js";

export function closeAllDrawers() {
  dom.levelsDrawer.classList.remove("active");
  dom.settingsDrawer.classList.remove("active");
}

export function minimizeControls() {
  if (dom.gameControlsBar && !dom.gameControlsBar.classList.contains("minimized")) {
    dom.gameControlsBar.classList.add("minimized");
    dom.gameControlsBar.style.bottom = "112px";
    dom.toggleControlsIcon.innerText = "▲";
    dom.toggleControlsText.innerText = "Show Controls";
  }
}

export function revealControls() {
  if (dom.gameControlsBar && dom.gameControlsBar.classList.contains("minimized")) {
    dom.gameControlsBar.classList.remove("minimized");
    dom.gameControlsBar.style.bottom = "160px";
    dom.toggleControlsIcon.innerText = "▼";
    dom.toggleControlsText.innerText = "Hide Controls";
  }
}

export function populateSongList() {
  dom.songListContainer.innerHTML = "";
  gameState.exercises.forEach(ex => {
    const item = document.createElement("div");
    item.className = "song-item";
    item.id = `song-item-${ex.id}`;
    item.innerHTML = `
      <div class="song-info">
        <span class="song-title">
          ${ex.title}
          ${ex.isCustom ? `<span class="badge" style="background: linear-gradient(135deg, var(--accent-emerald), #059669); margin-left: 0.5rem; font-size: 0.65rem; padding: 0.15rem 0.4rem;">Custom</span>` : ''}
        </span>
        <span class="song-desc">${ex.description}</span>
      </div>
      <div class="song-meta">
        <span>⏱️ ${ex.bpm} bpm</span>
        <span>${ex.notes.length} Notes</span>
      </div>
    `;
    item.addEventListener("click", () => {
      if (gameState.isPlayingGame) stopGame();
      selectExercise(ex.id);
      closeAllDrawers();
    });
    dom.songListContainer.appendChild(item);
  });
}

export function selectExercise(id) {
  const ex = gameState.exercises.find(e => e.id === id);
  if (!ex) return;
  gameState.currentExercise = ex;
  
  // Persist selected level state
  localStorage.setItem("signquest_current_exercise_id", id);
  if (dom.resultsOverlay) {
    dom.resultsOverlay.classList.remove("active");
  }

  // Highlight active in list
  document.querySelectorAll(".song-item").forEach(item => {
    item.classList.remove("active");
  });
  const activeItem = document.getElementById(`song-item-${id}`);
  if (activeItem) activeItem.classList.add("active");

  // Reset Arena & HUD title
  dom.hudLevelTitle.innerText = ex.title;
  dom.hudBpmLabel.innerText = `${ex.bpm} BPM`;

  // Disable challenge mode for tutorials
  if (ex.isTutorial) {
    gameState.gameMode = "practice";
    dom.modePracticeBtn.classList.add("active");
    dom.modeChallengeBtn.classList.remove("active");
    dom.modeChallengeBtn.style.opacity = "0.5";
    dom.modeChallengeBtn.style.pointerEvents = "none";
    dom.selectedModeIndicator.innerText = "Mode: Practice (Tutorial Lock)";
  } else {
    dom.modeChallengeBtn.style.opacity = "";
    dom.modeChallengeBtn.style.pointerEvents = "";
    if (gameState.gameMode === "practice") {
      dom.modePracticeBtn.classList.add("active");
      dom.modeChallengeBtn.classList.remove("active");
      dom.selectedModeIndicator.innerText = "Mode: Practice";
    } else {
      dom.modeChallengeBtn.classList.add("active");
      dom.modePracticeBtn.classList.remove("active");
      dom.selectedModeIndicator.innerText = "Mode: Challenge";
    }
  }

  // Reset Game States
  resetGameStateStats();
  drawTrackStatic();
}

export function updateHudUI() {
  dom.scoreValEl.innerText = String(Math.floor(gameState.score)).padStart(5, "0");
  dom.comboValEl.innerText = gameState.combo;
  
  const totalProcessed = gameState.noteStats.perfect + gameState.noteStats.good + gameState.noteStats.okay + gameState.noteStats.miss;
  let accuracy = 100.0;
  if (totalProcessed > 0) {
    const earned = (gameState.noteStats.perfect * 1.0) + (gameState.noteStats.good * 0.85) + (gameState.noteStats.okay * 0.6);
    accuracy = (earned / totalProcessed) * 100;
  }
  dom.accuracyValEl.innerText = `${accuracy.toFixed(1)}%`;

  let rank = "C";
  let colorClass = "";
  if (accuracy >= 90.0) { rank = "S"; colorClass = "glow-pink"; }
  else if (accuracy >= 80.0) { rank = "A"; colorClass = "glow-cyan"; }
  else if (accuracy >= 65.0) { rank = "B"; colorClass = "glow-green"; }
  else { rank = "C"; colorClass = ""; }
  
  dom.rankValEl.innerText = rank;
  dom.rankValEl.className = `hud-val rank-badge-glow ${colorClass}`;
}

export function setupListeners() {
  // Drawer toggles
  dom.btnToggleLevels.addEventListener("click", () => {
    dom.settingsDrawer.classList.remove("active");
    dom.levelsDrawer.classList.toggle("active");
  });

  dom.btnCloseLevels.addEventListener("click", () => {
    dom.levelsDrawer.classList.remove("active");
  });

  dom.btnToggleSettings.addEventListener("click", () => {
    dom.levelsDrawer.classList.remove("active");
    dom.settingsDrawer.classList.toggle("active");
  });

  dom.btnCloseSettings.addEventListener("click", () => {
    dom.settingsDrawer.classList.remove("active");
  });

  // Volume Slider
  dom.synthVolume.value = gameState.userVolume;
  dom.synthVolume.addEventListener("input", (e) => {
    gameState.userVolume = parseFloat(e.target.value);
    localStorage.setItem("signquest_user_volume", gameState.userVolume.toString());
    if (!gameState.soundMuted) setVolume(gameState.userVolume);
  });

  // Lefty Mode Toggle
  dom.leftyToggle.checked = localStorage.getItem("signquest_left_handed") === "true";
  dom.leftyToggle.addEventListener("change", (e) => {
    localStorage.setItem("signquest_left_handed", e.target.checked.toString());
  });

  // Play button click
  dom.btnGamePlay.addEventListener("click", () => {
    if (gameState.isPlayingGame) {
      stopGame();
    } else {
      startGame();
    }
  });

  // Stop button click
  dom.btnGameStop.addEventListener("click", stopGame);

  // Skip Tutorial Button
  dom.btnSkipTutorial.addEventListener("click", skipTutorial);

  // Results Buttons
  dom.resultsBtnSongs.addEventListener("click", () => {
    dom.resultsOverlay.classList.remove("active");
    dom.levelsDrawer.classList.add("active"); // open levels drawer
  });

  dom.resultsBtnRetry.addEventListener("click", () => {
    dom.resultsOverlay.classList.remove("active");
    startGame();
  });

  if (dom.resultsBtnNext) {
    dom.resultsBtnNext.addEventListener("click", () => {
      dom.resultsOverlay.classList.remove("active");
      const currentIndex = gameState.exercises.findIndex(ex => ex.id === gameState.currentExercise.id);
      if (currentIndex !== -1 && currentIndex < gameState.exercises.length - 1) {
        const nextEx = gameState.exercises[currentIndex + 1];
        selectExercise(nextEx.id);
        startGame();
      }
    });
  }

  // Mode selectors
  dom.modePracticeBtn.addEventListener("click", () => {
    if (gameState.isPlayingGame) stopGame();
    gameState.gameMode = "practice";
    dom.modePracticeBtn.classList.add("active");
    dom.modeChallengeBtn.classList.remove("active");
    dom.selectedModeIndicator.innerText = "Mode: Practice";
  });

  dom.modeChallengeBtn.addEventListener("click", () => {
    if (gameState.isPlayingGame) stopGame();
    gameState.gameMode = "challenge";
    dom.modeChallengeBtn.classList.add("active");
    dom.modePracticeBtn.classList.remove("active");
    dom.selectedModeIndicator.innerText = "Mode: Challenge";
  });

  // Camera buttons
  dom.btnPowerCamera.addEventListener("click", () => {
    if (gameState.isCameraPowered) {
      powerOffCamera();
    } else {
      powerOnCamera();
    }
  });

  dom.btnToggleCamera.addEventListener("click", () => {
    gameState.showCamera = !gameState.showCamera;
    localStorage.setItem("signquest_show_camera", gameState.showCamera.toString());
    dom.video.style.opacity = gameState.showCamera ? "1" : "0";
    dom.btnToggleCamera.innerHTML = gameState.showCamera 
      ? `<span class="btn-icon">👁️</span> Hide Camera Feed` 
      : `<span class="btn-icon">👁️</span> Show Camera Feed`;
  });

  dom.btnToggleSkeleton.addEventListener("click", () => {
    gameState.showSkeleton = !gameState.showSkeleton;
    localStorage.setItem("signquest_show_skeleton", gameState.showSkeleton.toString());
    dom.btnToggleSkeleton.innerHTML = gameState.showSkeleton
      ? `<span class="btn-icon">🕸️</span> Hide Skeleton`
      : `<span class="btn-icon">🕸️</span> Show Skeleton`;
  });

  dom.btnToggleSound.addEventListener("click", () => {
    gameState.soundMuted = !gameState.soundMuted;
    localStorage.setItem("signquest_sound_muted", gameState.soundMuted.toString());
    if (gameState.soundMuted) {
      gameState.userVolume = parseFloat(dom.synthVolume.value);
      localStorage.setItem("signquest_user_volume", gameState.userVolume.toString());
      dom.synthVolume.value = 0;
      setVolume(0, false);
      dom.btnToggleSound.innerHTML = `<span class="btn-icon">🔇</span> Unmute Sound`;
    } else {
      dom.synthVolume.value = gameState.userVolume;
      setVolume(gameState.userVolume, true);
      dom.btnToggleSound.innerHTML = `<span class="btn-icon">🔊</span> Mute Sound`;
    }
  });

  // Calibration Select dropdown
  if (dom.calibrateSelect) {
    dom.calibrateSelect.addEventListener("change", (e) => {
      gameState.targetCalibrateNote = e.target.value;
    });
  }

  // Calibrate button click
  if (dom.btnRhythmCalibrate) {
    dom.btnRhythmCalibrate.addEventListener("click", () => {
      if (gameState.isCalibratingAutomated) {
        cancelCalibration();
      } else {
        startAutomatedCalibration();
      }
    });
  }

  // Reset calibration
  if (dom.btnRhythmReset) {
    dom.btnRhythmReset.addEventListener("click", () => {
      if (confirm("Reset all custom Solfege templates?")) {
        resetCustomMusicTemplates();
      }
    });
  }

  // Export JSON
  if (dom.btnRhythmExport) {
    dom.btnRhythmExport.addEventListener("click", () => {
      exportCustomMusicTemplates();
    });
  }

  // Fullscreen Toggle
  if (dom.btnFullscreen) {
    dom.btnFullscreen.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        const gameArea = dom.video ? dom.video.parentNode : document.querySelector(".video-container");
        if (gameArea) {
          gameArea.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
          });
        }
      } else {
        document.exitFullscreen();
      }
    });

    document.addEventListener("fullscreenchange", () => {
      if (document.fullscreenElement) {
        dom.btnFullscreen.innerHTML = "✕ Minimize Screen";
      } else {
        dom.btnFullscreen.innerHTML = "🖥️ Fullscreen";
      }
    });
  }

  // Toggle controls bar dock (Retractable)
  if (dom.btnToggleControls) {
    dom.btnToggleControls.addEventListener("click", () => {
      const isMinimized = dom.gameControlsBar.classList.contains("minimized");
      if (isMinimized) {
        // Expand it
        dom.gameControlsBar.classList.remove("minimized");
        dom.gameControlsBar.style.bottom = "160px"; // Float above tracks
        dom.toggleControlsIcon.innerText = "▼";
        dom.toggleControlsText.innerText = "Hide Controls";
      } else {
        // Minimize/hide it
        dom.gameControlsBar.classList.add("minimized");
        dom.gameControlsBar.style.bottom = "112px"; // Sit hidden behind tracks
        dom.toggleControlsIcon.innerText = "▲";
        dom.toggleControlsText.innerText = "Show Controls";
      }
    });
  }

  // ── Custom Level Upload ───────────────────────────────────────────────────
  if (dom.customLevelDropzone) {
    // Click to browse
    dom.customLevelDropzone.addEventListener("click", () => {
      dom.customLevelFileInput.value = ""; // reset so same file can re-trigger
      dom.customLevelFileInput.click();
    });

    // File input change
    dom.customLevelFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) processCustomLevelFile(file);
    });

    // Drag-over visual feedback
    dom.customLevelDropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dom.customLevelDropzone.classList.add("dragover");
    });
    dom.customLevelDropzone.addEventListener("dragleave", () => {
      dom.customLevelDropzone.classList.remove("dragover");
    });

    // Drop
    dom.customLevelDropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dom.customLevelDropzone.classList.remove("dragover");
      const file = e.dataTransfer.files[0];
      if (file) processCustomLevelFile(file);
    });
  }

  // Clear all custom levels
  if (dom.btnClearCustomLevels) {
    dom.btnClearCustomLevels.addEventListener("click", () => {
      localStorage.removeItem("signquest_custom_exercises");
      // Remove custom exercises from in-memory list
      gameState.exercises = gameState.exercises.filter(ex => !ex.isCustom);
      populateSongList();
      showCustomLevelFeedback("All custom levels cleared.", "neutral");
    });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function showCustomLevelFeedback(msg, type) {
  if (!dom.customLevelFeedback) return;
  const colors = {
    success: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", text: "#34d399" },
    error:   { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.3)",  text: "#f87171" },
    neutral: { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", text: "var(--text-secondary)" }
  };
  const c = colors[type] || colors.neutral;
  dom.customLevelFeedback.style.cssText = `
    display: block;
    font-size: 0.75rem;
    border-radius: 8px;
    padding: 0.4rem 0.65rem;
    background: ${c.bg};
    border: 1px solid ${c.border};
    color: ${c.text};
    font-family: 'Outfit', sans-serif;
  `;
  dom.customLevelFeedback.innerText = msg;
}

function processCustomLevelFile(file) {
  if (!file.name.endsWith(".json") && file.type !== "application/json") {
    showCustomLevelFeedback("⚠️ File must be a .json file.", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const raw = JSON.parse(e.target.result);

      // Accept both a single level object and an array of levels
      const levels = Array.isArray(raw) ? raw : [raw];

      // Validate each level
      for (const lv of levels) {
        if (!lv.id || !lv.title || !Array.isArray(lv.notes)) {
          showCustomLevelFeedback("⚠️ Invalid level format. Must have id, title, and notes array.", "error");
          return;
        }
      }

      // Load current custom list from localStorage
      let customList = [];
      try {
        const existing = localStorage.getItem("signquest_custom_exercises");
        if (existing) customList = JSON.parse(existing);
      } catch (_) { customList = []; }

      // Merge – skip duplicates by id, update existing
      let added = 0, updated = 0;
      for (const lv of levels) {
        const idx = customList.findIndex(c => c.id === lv.id);
        if (idx !== -1) {
          customList[idx] = lv;
          updated++;
        } else {
          customList.push(lv);
          added++;
        }
      }

      localStorage.setItem("signquest_custom_exercises", JSON.stringify(customList));

      // Rebuild in-memory exercise list
      gameState.exercises = gameState.exercises.filter(ex => !ex.isCustom);
      customList.forEach(ex => {
        gameState.exercises.push({
          ...ex,
          isCustom: true,
          bpm: Math.round(ex.bpm * 0.75)
        });
      });

      populateSongList();

      const parts = [];
      if (added)   parts.push(`${added} added`);
      if (updated) parts.push(`${updated} updated`);
      showCustomLevelFeedback(`✅ ${parts.join(", ")} — ${levels.map(l => l.title).join(", ")}`, "success");

    } catch (err) {
      showCustomLevelFeedback("⚠️ Could not parse JSON. Check the file format.", "error");
      console.error("Custom level parse error:", err);
    }
  };
  reader.readAsText(file);
}

