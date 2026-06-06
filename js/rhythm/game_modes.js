import { playNote, releaseNote, initSynth, resumeAudio } from "../synth.js";
import { gameState, resetGameStateStats } from "./state.js";
import { dom } from "./dom.js";
import {
  NOTE_DETAILS,
  TUTORIAL_REQUIRED_HOLD,
  getFrequency
} from "./constants.js";
import { drawTrack, drawTrackStatic, spawnHitBurst } from "./renderer.js";
import { updateHudUI, closeAllDrawers, minimizeControls, revealControls } from "./ui.js";

let animationFrameId = null;
let countdownIntervalId = null;

export function startGame() {
  if (!gameState.currentExercise) return;
  
  initSynth();
  resumeAudio();
  closeAllDrawers();
  minimizeControls();

  // Reset scoring and timeline states
  resetGameStateStats();
  updateHudUI();
  
  // Clone notes list and add state fields
  gameState.activeNotesInLevel = gameState.currentExercise.notes.map(note => {
    return {
      ...note,
      status: "pending", // pending, active, hit, miss
      holdProgress: 0,   // accumulated hold time
      lastHoldChecked: 0,
      hitAccuracy: ""    // Perfect, Good, Okay, Miss
    };
  });

  gameState.totalPossibleNotes = gameState.activeNotesInLevel.length;
  gameState.isPracticePaused = false;
  dom.practicePauseAlert.style.display = "none";

  if (dom.btnGamePlay) dom.btnGamePlay.innerHTML = `<span>⏸️ Pause Level</span>`;
  if (dom.btnGameStop) dom.btnGameStop.disabled = false;
  dom.resultsOverlay.classList.remove("active");

  // Show progress HUD
  dom.hudProgressBg.style.display = "block";
  dom.hudProgressFill.style.width = "0%";

  dom.tutorialBox.style.display = "block";
  if (gameState.currentExercise.isTutorial) {
    gameState.tutorialCurrentNoteIndex = 0;
    gameState.tutorialHoldDuration = 0;
    gameState.tutorialScrolling = true;
    loadTutorialStep();
  } else {
    updateActiveGuideUI();
  }

  // Render first frame static at beat 0
  gameState.currentBeat = 0;
  gameState.gameTime = 0;
  drawTrack();

  // If in Challenge mode, perform countdown before starting
  if (gameState.gameMode === "challenge" && !gameState.currentExercise.isTutorial) {
    dom.gameCountdown.style.display = "flex";
    dom.countdownNumber.innerText = "👋 Show sign hand to begin!";
    dom.countdownNumber.style.fontSize = "3.2rem";
    
    gameState.isPlayingGame = true;

    const checkHandsBeforeCountdown = () => {
      if (!gameState.isPlayingGame) {
        dom.gameCountdown.style.display = "none";
        return;
      }

      if (gameState.noteHandVisible) {
        dom.countdownNumber.style.fontSize = "6rem";
        startLevelCountdown(() => {
          gameState.gameStartTime = performance.now();
          gameState.lastUpdate = gameState.gameStartTime;
          
          // Start engine loop
          if (animationFrameId) cancelAnimationFrame(animationFrameId);
          animationFrameId = requestAnimationFrame(gameLoop);
        });
      } else {
        // Draw track statically at beat 0 so notes are shown
        drawTrack();
        requestAnimationFrame(checkHandsBeforeCountdown);
      }
    };

    requestAnimationFrame(checkHandsBeforeCountdown);
  } else {
    // Practice or Tutorial starts immediately
    gameState.isPlayingGame = true;
    gameState.gameStartTime = performance.now();
    gameState.lastUpdate = gameState.gameStartTime;
    
    // Start engine loop
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);
  }
}

export function stopGame() {
  gameState.isPlayingGame = false;
  gameState.isPracticePaused = false;
  dom.practicePauseAlert.style.display = "none";
  dom.hudProgressBg.style.display = "none";
  revealControls();

  if (countdownIntervalId) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }
  if (dom.gameCountdown) {
    dom.gameCountdown.style.display = "none";
  }

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  releaseNote();
  gameState.lastSynthNote = "-";
  gameState.lastSynthOctave = -1;
  gameState.synthPlaying = false;

  if (dom.btnGamePlay) dom.btnGamePlay.innerHTML = `<span>▶️ Start Level</span>`;
  if (dom.btnGameStop) dom.btnGameStop.disabled = true;
  dom.tutorialBox.style.display = "none";
  drawTrackStatic();
}

export function startLevelCountdown(callback) {
  const overlay = dom.gameCountdown;
  const numEl = dom.countdownNumber;
  if (!overlay || !numEl) {
    callback();
    return;
  }

  overlay.style.display = "flex";
  let count = 3;

  const triggerTick = () => {
    numEl.innerText = count === 0 ? "GO!" : count;
    numEl.classList.remove("countdown-animate");
    void numEl.offsetWidth; // Force CSS animation restart reflow
    numEl.classList.add("countdown-animate");
    triggerCountdownBeep(count);
  };

  triggerTick();

  if (countdownIntervalId) clearInterval(countdownIntervalId);

  countdownIntervalId = setInterval(() => {
    count--;
    if (count >= 0) {
      triggerTick();
    } else {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
      overlay.style.display = "none";
      callback();
    }
  }, 1000);
}

export function triggerCountdownBeep(count) {
  try {
    const audioCtxLocal = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtxLocal.createOscillator();
    const gain = audioCtxLocal.createGain();
    osc.type = "sine";
    const freq = count === 0 ? 880 : 440; // A5 for GO!, A4 for countdown
    osc.frequency.setValueAtTime(freq, audioCtxLocal.currentTime);
    gain.gain.setValueAtTime(0.08, audioCtxLocal.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtxLocal.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(audioCtxLocal.destination);
    osc.start();
    osc.stop(audioCtxLocal.currentTime + 0.15);
  } catch (e) {}
}

export function loadTutorialStep() {
  if (!gameState.currentExercise || !gameState.currentExercise.isTutorial) return;
  const target = gameState.activeNotesInLevel[gameState.tutorialCurrentNoteIndex];
  if (!target) {
    finishLevel();
    return;
  }
  if (dom.tutorialTitleVal) {
    dom.tutorialTitleVal.innerText = `Tutorial: ${NOTE_DETAILS[target.note].label} (C${target.octave})`;
  }
  if (dom.tutorialInstructionVal) {
    dom.tutorialInstructionVal.innerText = target.instruction || `Show the ${target.note} hand shape at octave C${target.octave} to pass.`;
  }
  gameState.tutorialHoldDuration = 0;
  updateTutorialUI();
}

export function updateTutorialUI() {
  if (dom.tutorialProgressFill) {
    const percent = Math.min(100, (gameState.tutorialHoldDuration / TUTORIAL_REQUIRED_HOLD) * 100);
    dom.tutorialProgressFill.style.width = `${percent}%`;
  }
  if (dom.tutorialTimeVal) {
    dom.tutorialTimeVal.innerText = `${gameState.tutorialHoldDuration.toFixed(1)}s / ${TUTORIAL_REQUIRED_HOLD.toFixed(1)}s`;
  }
}

export function skipTutorial() {
  if (gameState.isPlayingGame && gameState.currentExercise && gameState.currentExercise.isTutorial) {
    finishLevel(true);
  }
}

export function gameLoop(now) {
  if (!gameState.isPlayingGame) return;

  const dt = (now - gameState.lastUpdate) / 1000; // delta in seconds
  gameState.lastUpdate = now;

  if (gameState.currentExercise.isTutorial) {
    processTutorialStep(dt);
  } else {
    if (gameState.gameMode === "challenge") {
      gameState.gameTime += dt;
      gameState.currentBeat = (gameState.gameTime * gameState.currentExercise.bpm) / 60;
      processRhythmEvaluation();
    } else {
      processPracticeStep(dt);
    }

    // Update progress bar
    if (gameState.activeNotesInLevel.length > 0) {
      const lastNote = gameState.activeNotesInLevel[gameState.activeNotesInLevel.length - 1];
      const totalDurationBeats = lastNote.beat + lastNote.duration;
      const progressPercent = Math.min(100, (gameState.currentBeat / totalDurationBeats) * 100);
      dom.hudProgressFill.style.width = `${progressPercent}%`;
    }
  }

  // Draw timeline track
  drawTrack();

  updateActiveGuideUI();

  animationFrameId = requestAnimationFrame(gameLoop);
}

export function processTutorialStep(dt) {
  const target = gameState.activeNotesInLevel[gameState.tutorialCurrentNoteIndex];
  if (!target) return;

  const noteTimeInSeconds = (target.beat * 60) / gameState.currentExercise.bpm;
  const userMatched = ((gameState.currentDetectedNote === target.note) && 
                        (gameState.currentDetectedOctave === target.octave)) || 
                        (target.octave !== 4);

  // 1. Scroll timeline normally until we hit the note start
  if (gameState.currentBeat < target.beat) {
    gameState.gameTime += dt;
    gameState.currentBeat = (gameState.gameTime * gameState.currentExercise.bpm) / 60;
    
    if (gameState.currentBeat >= target.beat) {
      gameState.currentBeat = target.beat;
      gameState.gameTime = noteTimeInSeconds;
    }
    
    // Update progress bar
    if (dom.hudProgressFill) {
      const progressPercent = (gameState.tutorialCurrentNoteIndex / gameState.activeNotesInLevel.length) * 100;
      dom.hudProgressFill.style.width = `${progressPercent}%`;
    }
    return;
  }

  // 2. We are at the note start: wait for user matching and holding
  if (userMatched) {
    // Play note synth if not already playing
    if (gameState.lastSynthNote !== target.note || gameState.lastSynthOctave !== target.octave || !gameState.synthPlaying) {
      const freq = getFrequency(target.note, target.octave);
      playNote(freq, target.note, target.octave);
      gameState.lastSynthNote = target.note;
      gameState.lastSynthOctave = target.octave;
      gameState.synthPlaying = true;
    }

    // Accumulate hold duration
    gameState.tutorialHoldDuration += dt;
    updateTutorialUI();

    if (gameState.tutorialHoldDuration >= TUTORIAL_REQUIRED_HOLD) {
      // Note successfully completed!
      target.status = "completed";
      gameState.noteStats.perfect++;
      gameState.totalHits++;
      gameState.score += 100;
      gameState.combo++;
      if (gameState.combo > gameState.maxCombo) gameState.maxCombo = gameState.combo;
      updateHudUI();

      // Release synth
      if (gameState.synthPlaying) {
        releaseNote();
        gameState.synthPlaying = false;
        gameState.lastSynthNote = "-";
        gameState.lastSynthOctave = -1;
      }

      triggerBeep();

      // Instantly advance timeline past this note
      gameState.tutorialCurrentNoteIndex++;
      if (gameState.tutorialCurrentNoteIndex < gameState.activeNotesInLevel.length) {
        // Set timeline beat to start of next note or just past this note
        gameState.currentBeat = target.beat + target.duration;
        gameState.gameTime = (gameState.currentBeat * 60) / gameState.currentExercise.bpm;
        loadTutorialStep();
      } else {
        gameState.currentBeat = target.beat + target.duration;
        gameState.gameTime = (gameState.currentBeat * 60) / gameState.currentExercise.bpm;
        finishLevel();
      }
    }
  } else {
    // Reset hold duration and stop synth if user breaks matching sign
    gameState.tutorialHoldDuration = 0;
    updateTutorialUI();

    if (gameState.synthPlaying) {
      releaseNote();
      gameState.synthPlaying = false;
      gameState.lastSynthNote = "-";
      gameState.lastSynthOctave = -1;
    }
  }
}

export function processPracticeStep(dt) {
  const target = gameState.activeNotesInLevel.find(n => n.status !== "completed");
  if (!target) {
    finishLevel();
    return;
  }

  const noteTimeInSeconds = (target.beat * 60) / gameState.currentExercise.bpm;
  const userMatched = ((gameState.currentDetectedNote === target.note) && 
                        (gameState.currentDetectedOctave === target.octave)) || 
                        (target.octave !== 4);

  // 1. Scroll normally until we reach the note start
  if (gameState.currentBeat < target.beat) {
    dom.practicePauseAlert.style.display = "none";
    gameState.isPracticePaused = false;
    
    gameState.gameTime += dt;
    gameState.currentBeat = (gameState.gameTime * gameState.currentExercise.bpm) / 60;
    
    if (gameState.currentBeat >= target.beat) {
      gameState.currentBeat = target.beat;
      gameState.gameTime = noteTimeInSeconds;
    }
    return;
  }

  // 2. We are in the note span
  if (gameState.currentBeat < target.beat + target.duration) {
    if (userMatched) {
      dom.practicePauseAlert.style.display = "none";
      gameState.isPracticePaused = false;
      
      // User matches note: scroll forward and play sound
      gameState.gameTime += dt;
      gameState.currentBeat = (gameState.gameTime * gameState.currentExercise.bpm) / 60;
      
      if (gameState.lastSynthNote !== target.note || gameState.lastSynthOctave !== target.octave || !gameState.synthPlaying) {
        const freq = getFrequency(target.note, target.octave);
        playNote(freq, target.note, target.octave);
        gameState.lastSynthNote = target.note;
        gameState.lastSynthOctave = target.octave;
        gameState.synthPlaying = true;
      }
      
      // If note duration is fully held and completed
      if (gameState.currentBeat >= target.beat + target.duration) {
        releaseNote();
        gameState.synthPlaying = false;
        gameState.lastSynthNote = "-";
        gameState.lastSynthOctave = -1;

        target.status = "completed";
        gameState.noteStats.perfect++;
        gameState.totalHits++;
        gameState.score += 100;
        gameState.combo++;
        if (gameState.combo > gameState.maxCombo) gameState.maxCombo = gameState.combo;
        
        triggerHitRating("Perfect", "#10b981");
        updateHudUI();
      }
    } else {
      // Cut off! Snap back to start of note
      if (gameState.currentBeat > target.beat) {
        gameState.currentBeat = target.beat;
        gameState.gameTime = noteTimeInSeconds;
      }
      
      gameState.isPracticePaused = true;
      gameState.practiceWaitingForNote = target.note;
      gameState.practiceWaitingForOctave = target.octave;
      
      dom.practicePauseAlert.style.display = "block";
      dom.practicePauseAlert.innerText = `Sign required: ${NOTE_DETAILS[target.note].label} (C${target.octave})`;
      
      if (gameState.synthPlaying) {
        releaseNote();
        gameState.synthPlaying = false;
        gameState.lastSynthNote = "-";
        gameState.lastSynthOctave = -1;
      }
    }
  }
}

export function processRhythmEvaluation() {
  let allProcessed = true;

  gameState.activeNotesInLevel.forEach(note => {
    const noteTimeInSeconds = (note.beat * 60) / gameState.currentExercise.bpm;
    const noteDurationInSeconds = (note.duration * 60) / gameState.currentExercise.bpm;
    const noteEndTimeInSeconds = noteTimeInSeconds + noteDurationInSeconds;

    if (note.status === "pending") {
      allProcessed = false;
      
      const timeDiff = gameState.gameTime - noteTimeInSeconds;
      
      // Auto-Miss
      if (timeDiff > 0.45) {
        note.status = "miss";
        note.hitAccuracy = "Miss";
        gameState.combo = 0;
        gameState.score = Math.max(0, gameState.score - 10);
        gameState.noteStats.miss++;
        triggerHitRating("Miss", "#ef4444");
        updateHudUI();
      } else if (timeDiff >= 0) {
        // Check inside hit window (since timeDiff is positive and <= 0.45 here)
        const matchesNote = ((gameState.currentDetectedNote === note.note) && (gameState.currentDetectedOctave === note.octave)) || (note.octave !== 4);
        if (matchesNote) {
          note.status = "hit";
          // Fire particle burst ONCE at the moment of impact
          spawnHitBurst(note.note, note.octave, NOTE_DETAILS[note.note]?.color);
          gameState.totalHits++;
          let addedScore = 0;
          let rating = "Okay";
          let color = "#f59e0b";
          
          if (timeDiff <= 0.15) {
            rating = "Perfect";
            addedScore = 100;
            color = "#10b981";
            gameState.noteStats.perfect++;
          } else if (timeDiff <= 0.30) {
            rating = "Good";
            addedScore = 70;
            color = "#06b6d4";
            gameState.noteStats.good++;
          } else {
            rating = "Okay";
            addedScore = 40;
            color = "#8b5cf6";
            gameState.noteStats.okay++;
          }

          gameState.score += addedScore;
          gameState.combo++;
          if (gameState.combo > gameState.maxCombo) gameState.maxCombo = gameState.combo;
          note.hitAccuracy = rating;
          
          triggerHitRating(rating, color);
          updateHudUI();

          // Trigger synth
          const freq = getFrequency(note.note, note.octave);
          playNote(freq, note.note, note.octave);
          gameState.lastSynthNote = note.note;
          gameState.lastSynthOctave = note.octave;
          gameState.synthPlaying = true;
        }
      }
    } 
    // Hold Notes
    else if (note.status === "hit") {
      allProcessed = false;
      
      const inHoldRegion = (gameState.gameTime >= noteTimeInSeconds && gameState.gameTime <= noteEndTimeInSeconds);
      
      if (inHoldRegion) {
        const matchesNote = ((gameState.currentDetectedNote === note.note) && (gameState.currentDetectedOctave === note.octave)) || (note.octave !== 4);
        if (matchesNote) {
          if (gameState.lastSynthNote !== note.note || gameState.lastSynthOctave !== note.octave || !gameState.synthPlaying) {
            const freq = getFrequency(note.note, note.octave);
            playNote(freq, note.note, note.octave);
            gameState.lastSynthNote = note.note;
            gameState.lastSynthOctave = note.octave;
            gameState.synthPlaying = true;
          }
          
          gameState.score += 1; // tick sustain score
          updateHudUI();
        } else {
          if (gameState.synthPlaying) {
            releaseNote();
            gameState.synthPlaying = false;
            gameState.lastSynthNote = "-";
            gameState.lastSynthOctave = -1;
          }
          if (gameState.combo > 0) {
            gameState.combo = 0;
            updateHudUI();
          }
        }
      } else if (gameState.gameTime > noteEndTimeInSeconds) {
        note.status = "completed";
        if (gameState.synthPlaying) {
          releaseNote();
          gameState.synthPlaying = false;
          gameState.lastSynthNote = "-";
          gameState.lastSynthOctave = -1;
        }
      }
    }
  });

  if (allProcessed && gameState.activeNotesInLevel.length > 0) {
    const lastNote = gameState.activeNotesInLevel[gameState.activeNotesInLevel.length - 1];
    const lastNoteEndTime = ((lastNote.beat + lastNote.duration) * 60) / gameState.currentExercise.bpm;
    if (gameState.gameTime >= lastNoteEndTime + 1.0) {
      finishLevel();
    }
  }
}

export function triggerHitRating(text, color) {
  gameState.ratingText = text;
  gameState.ratingColor = color;
  gameState.ratingTimer = 1.0;
}

export function triggerBeep() {
  try {
    const audioCtxLocal = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtxLocal.createOscillator();
    const gain = audioCtxLocal.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(659.25, audioCtxLocal.currentTime);
    gain.gain.setValueAtTime(0.08, audioCtxLocal.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtxLocal.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(audioCtxLocal.destination);
    osc.start();
    osc.stop(audioCtxLocal.currentTime + 0.15);
  } catch (e) {}
}

export function finishLevel(isSkip = false) {
  stopGame();

  const currentIndex = gameState.exercises.findIndex(ex => ex.id === gameState.currentExercise.id);
  const nextExercise = (currentIndex !== -1 && currentIndex < gameState.exercises.length - 1) ? gameState.exercises[currentIndex + 1] : null;

  if (gameState.currentExercise.isTutorial) {
    // Tutorial completed or skipped
    dom.resultsRankContainer.style.display = "none";
    dom.resultsStatsGrid.style.display = "none";
    dom.resultsMessage.style.display = "block";

    if (isSkip) {
      dom.resultsLevelTitle.innerText = "Tutorial Skipped";
      dom.resultsSubtitle.innerText = "Learn Solfège Basics";
      dom.resultsMessage.innerText = "You have skipped the Solfège Basics tutorial. Are you ready to proceed directly to Level 1?";
    } else {
      dom.resultsLevelTitle.innerText = "Tutorial Completed!";
      dom.resultsSubtitle.innerText = "Solfège Basics Mastered";
      dom.resultsMessage.innerText = "Excellent work! You've successfully completed the Solfège basics tutorial. Ready to proceed to Level 1?";
    }

    if (nextExercise) {
      dom.resultsBtnNext.style.display = "block";
      dom.resultsBtnNext.innerText = "Proceed to Level 1 ➡️";
    } else {
      dom.resultsBtnNext.style.display = "none";
    }
  } else {
    // Normal level finished
    dom.resultsLevelTitle.innerText = `Finished: ${gameState.currentExercise.title}`;
    dom.resultsSubtitle.innerText = "Accuracy & Rank Score";
    dom.resultsRankContainer.style.display = "block";
    dom.resultsStatsGrid.style.display = "grid";
    dom.resultsMessage.style.display = "none";

    const totalProcessed = gameState.noteStats.perfect + gameState.noteStats.good + gameState.noteStats.okay + gameState.noteStats.miss;
    let accuracy = 100.0;
    if (totalProcessed > 0) {
      const earned = (gameState.noteStats.perfect * 1.0) + (gameState.noteStats.good * 0.85) + (gameState.noteStats.okay * 0.6);
      accuracy = (earned / totalProcessed) * 100;
    }

    let rank = "C";
    if (accuracy >= 90.0) rank = "S";
    else if (accuracy >= 80.0) rank = "A";
    else if (accuracy >= 65.0) rank = "B";
    else rank = "C";

    dom.resultsRank.innerText = rank;
    dom.resultsRank.className = `rank-badge rank-${rank}`;

    dom.resultsScore.innerText = Math.floor(gameState.score);
    dom.resultsCombo.innerText = gameState.maxCombo;
    dom.resultsAccuracy.innerText = `${accuracy.toFixed(1)}%`;
    dom.resultsHitratio.innerText = `${gameState.totalHits} / ${gameState.totalPossibleNotes}`;

    if (nextExercise) {
      dom.resultsBtnNext.style.display = "block";
      const match = nextExercise.title.match(/Level\s+(\d+)/i);
      if (match) {
        dom.resultsBtnNext.innerText = `Proceed to Level ${match[1]} ➡️`;
      } else {
        dom.resultsBtnNext.innerText = "Next Level ➡️";
      }
    } else {
      dom.resultsBtnNext.style.display = "none";
    }
  }

  dom.resultsOverlay.classList.add("active");
}

export function getActiveNoteForGuide() {
  if (!gameState.isPlayingGame || !gameState.activeNotesInLevel) return null;
  if (gameState.currentExercise.isTutorial) {
    return gameState.activeNotesInLevel[gameState.tutorialCurrentNoteIndex];
  }
  return gameState.activeNotesInLevel.find(n => n.status === "pending" || n.status === "active" || n.status === "hit");
}

export function updateActiveGuideUI() {
  const target = getActiveNoteForGuide();
  
  if (!target) {
    if (dom.tutorialTitleVal) dom.tutorialTitleVal.innerText = "Guide Panel";
    if (dom.tutorialInstructionVal) dom.tutorialInstructionVal.innerText = "Select a level and press Start to play!";
    if (dom.handsignHintImg) {
      dom.handsignHintImg.src = "public/handsign/Do.png";
      dom.handsignHintImg.style.display = "block";
    }
    return;
  }

  const detail = NOTE_DETAILS[target.note];
  if (!detail) return;

  if (dom.tutorialTitleVal) {
    dom.tutorialTitleVal.innerText = gameState.currentExercise.isTutorial 
      ? `Tutorial: ${detail.label} (C${target.octave})`
      : `Active Note: ${detail.label} (C${target.octave})`;
  }

  if (dom.tutorialInstructionVal) {
    dom.tutorialInstructionVal.innerText = target.instruction || `Show the ${target.note} hand shape at octave C${target.octave}.`;
  }

  if (dom.handsignHintImg) {
    const newSrc = `public/handsign/${detail.label}.png`;
    if (dom.handsignHintImg.getAttribute("src") !== newSrc) {
      dom.handsignHintImg.src = newSrc;
    }
    dom.handsignHintImg.style.display = "block";
  }
}
