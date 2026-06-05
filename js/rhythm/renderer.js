import { gameState } from "./state.js";
import { dom } from "./dom.js";
import {
  HIT_ZONE_X,
  BEAT_WIDTH,
  NOTE_RADIUS,
  NOTE_DETAILS
} from "./constants.js";

export function drawTrack() {
  const w = dom.gameCanvas.width;
  const h = dom.gameCanvas.height;
  dom.gameCanvasCtx.clearRect(0, 0, w, h);

  const centerY = h / 2 + 5;
  dom.gameCanvasCtx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  dom.gameCanvasCtx.lineWidth = 2;
  
  // Center line
  dom.gameCanvasCtx.beginPath();
  dom.gameCanvasCtx.moveTo(0, centerY);
  dom.gameCanvasCtx.lineTo(w, centerY);
  dom.gameCanvasCtx.stroke();

  // Top/bottom borders
  dom.gameCanvasCtx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  dom.gameCanvasCtx.beginPath();
  dom.gameCanvasCtx.moveTo(0, centerY - 45);
  dom.gameCanvasCtx.lineTo(w, centerY - 45);
  dom.gameCanvasCtx.moveTo(0, centerY + 45);
  dom.gameCanvasCtx.lineTo(w, centerY + 45);
  dom.gameCanvasCtx.stroke();

  // 2. Draw Hit Target Ring
  dom.gameCanvasCtx.strokeStyle = "rgba(99, 102, 241, 0.4)";
  dom.gameCanvasCtx.fillStyle = "rgba(99, 102, 241, 0.15)";
  dom.gameCanvasCtx.lineWidth = 3;
  dom.gameCanvasCtx.beginPath();
  dom.gameCanvasCtx.arc(HIT_ZONE_X, centerY, NOTE_RADIUS + 3, 0, Math.PI * 2);
  dom.gameCanvasCtx.fill();
  dom.gameCanvasCtx.stroke();

  dom.gameCanvasCtx.strokeStyle = "rgba(99, 102, 241, 0.7)";
  dom.gameCanvasCtx.lineWidth = 1.5;
  dom.gameCanvasCtx.beginPath();
  dom.gameCanvasCtx.arc(HIT_ZONE_X, centerY, NOTE_RADIUS - 5, 0, Math.PI * 2);
  dom.gameCanvasCtx.stroke();

  // 3. Draw notes timeline
  gameState.activeNotesInLevel.forEach(note => {
    const beatOffset = note.beat - gameState.currentBeat;
    const noteX = HIT_ZONE_X + beatOffset * BEAT_WIDTH;
    const detail = NOTE_DETAILS[note.note] || { color: "#ffffff", label: note.note };
    
    // Draw sustain ribbon
    if (note.duration > 0) {
      const tailWidth = note.duration * BEAT_WIDTH;
      const gradient = dom.gameCanvasCtx.createLinearGradient(noteX, centerY, noteX + tailWidth, centerY);
      gradient.addColorStop(0, detail.color);
      gradient.addColorStop(1, "rgba(255, 255, 255, 0.08)");
      
      dom.gameCanvasCtx.fillStyle = gradient;
      dom.gameCanvasCtx.fillRect(noteX, centerY - 10, tailWidth, 20);
      
      dom.gameCanvasCtx.strokeStyle = detail.color;
      dom.gameCanvasCtx.lineWidth = 1.5;
      dom.gameCanvasCtx.beginPath();
      dom.gameCanvasCtx.moveTo(noteX, centerY - 10);
      dom.gameCanvasCtx.lineTo(noteX + tailWidth, centerY - 10);
      dom.gameCanvasCtx.moveTo(noteX, centerY + 10);
      dom.gameCanvasCtx.lineTo(noteX + tailWidth, centerY + 10);
      dom.gameCanvasCtx.stroke();
    }

    // Draw note circle head
    if (noteX > -NOTE_RADIUS && noteX < w + NOTE_RADIUS) {
      let alpha = 1.0;
      if (note.status === "completed") alpha = 0.25;
      if (note.status === "miss") alpha = 0.15;
      
      dom.gameCanvasCtx.save();
      dom.gameCanvasCtx.globalAlpha = alpha;

      dom.gameCanvasCtx.fillStyle = detail.color;
      dom.gameCanvasCtx.shadowColor = detail.color;
      dom.gameCanvasCtx.shadowBlur = note.status === "hit" ? 15 : 6;
      
      dom.gameCanvasCtx.beginPath();
      dom.gameCanvasCtx.arc(noteX, centerY, NOTE_RADIUS, 0, Math.PI * 2);
      dom.gameCanvasCtx.fill();

      // Inner text
      dom.gameCanvasCtx.shadowBlur = 0;
      dom.gameCanvasCtx.fillStyle = "#ffffff";
      dom.gameCanvasCtx.font = "bold 15px 'Outfit', sans-serif";
      dom.gameCanvasCtx.textAlign = "center";
      dom.gameCanvasCtx.textBaseline = "middle";
      dom.gameCanvasCtx.fillText(detail.label, noteX, centerY - 5);
      
      dom.gameCanvasCtx.font = "10px 'JetBrains Mono', monospace";
      dom.gameCanvasCtx.fillStyle = "rgba(255,255,255,0.8)";
      dom.gameCanvasCtx.fillText(`C${note.octave}`, noteX, centerY + 9);

      dom.gameCanvasCtx.restore();
    }
  });

  // 4. Draw hit timing rating text
  if (gameState.ratingTimer > 0 && gameState.ratingText) {
    dom.gameCanvasCtx.save();
    dom.gameCanvasCtx.globalAlpha = Math.min(1.0, gameState.ratingTimer);
    dom.gameCanvasCtx.fillStyle = gameState.ratingColor;
    dom.gameCanvasCtx.shadowColor = gameState.ratingColor;
    dom.gameCanvasCtx.shadowBlur = 10;
    dom.gameCanvasCtx.font = "bold 20px 'Outfit', sans-serif";
    dom.gameCanvasCtx.textAlign = "center";
    dom.gameCanvasCtx.fillText(gameState.ratingText, HIT_ZONE_X, centerY - 40);
    dom.gameCanvasCtx.restore();
    gameState.ratingTimer -= 0.035;
  }

  // 5. Draw live note guide tooltip
  if (gameState.isPlayingGame) {
    let activeGuideNote = "-";
    let activeGuideOctave = 4;
    if (gameState.currentExercise.isTutorial) {
      const note = gameState.activeNotesInLevel[gameState.tutorialCurrentNoteIndex];
      if (note) {
        activeGuideNote = note.note;
        activeGuideOctave = note.octave;
      }
    } else if (gameState.gameMode === "practice" && gameState.isPracticePaused) {
      activeGuideNote = gameState.practiceWaitingForNote;
      activeGuideOctave = gameState.practiceWaitingForOctave;
    }

    if (activeGuideNote !== "-") {
      const guideDetail = NOTE_DETAILS[activeGuideNote];
      dom.gameCanvasCtx.fillStyle = "rgba(255, 255, 255, 0.9)";
      dom.gameCanvasCtx.font = "13px 'Outfit', sans-serif";
      dom.gameCanvasCtx.textAlign = "left";
      dom.gameCanvasCtx.fillText(`👉 SIGN THIS NOTE: ${guideDetail.label} (C${activeGuideOctave})`, 15, 22);
    }
  }
}

export function drawTrackStatic() {
  const w = dom.gameCanvas.width;
  const h = dom.gameCanvas.height;
  dom.gameCanvasCtx.clearRect(0, 0, w, h);
  
  const centerY = h / 2 + 5;
  
  dom.gameCanvasCtx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  dom.gameCanvasCtx.lineWidth = 2;
  dom.gameCanvasCtx.beginPath();
  dom.gameCanvasCtx.moveTo(0, centerY);
  dom.gameCanvasCtx.lineTo(w, centerY);
  dom.gameCanvasCtx.stroke();

  dom.gameCanvasCtx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  dom.gameCanvasCtx.beginPath();
  dom.gameCanvasCtx.moveTo(0, centerY - 45);
  dom.gameCanvasCtx.lineTo(w, centerY - 45);
  dom.gameCanvasCtx.moveTo(0, centerY + 45);
  dom.gameCanvasCtx.lineTo(w, centerY + 45);
  dom.gameCanvasCtx.stroke();

  dom.gameCanvasCtx.strokeStyle = "rgba(99, 102, 241, 0.4)";
  dom.gameCanvasCtx.fillStyle = "rgba(99, 102, 241, 0.15)";
  dom.gameCanvasCtx.lineWidth = 3;
  dom.gameCanvasCtx.beginPath();
  dom.gameCanvasCtx.arc(HIT_ZONE_X, centerY, NOTE_RADIUS + 3, 0, Math.PI * 2);
  dom.gameCanvasCtx.fill();
  dom.gameCanvasCtx.stroke();

  dom.gameCanvasCtx.fillStyle = "rgba(255,255,255,0.4)";
  dom.gameCanvasCtx.font = "15px 'Outfit', sans-serif";
  dom.gameCanvasCtx.textAlign = "center";
  dom.gameCanvasCtx.fillText(gameState.currentExercise ? "Select a mode and press Start to play!" : "Select a Level to begin!", w / 2, centerY);
}

export function setupLanesCanvas() {
  const resizeCanvas = () => {
    const rect = dom.gameCanvas.parentNode.getBoundingClientRect();
    dom.gameCanvas.width = rect.width;
    dom.gameCanvas.height = 160;
    if (!gameState.isPlayingGame) drawTrackStatic();
  };
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
}
