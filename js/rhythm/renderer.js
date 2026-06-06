import { gameState } from "./state.js";
import { dom } from "./dom.js";
import {
  HIT_ZONE_X,
  BEAT_WIDTH,
  NOTE_RADIUS,
  NOTE_DETAILS
} from "./constants.js";

// ── Module-level constants ───────────────────────────────────────────────────
const NOTE_DIATONIC_STEPS = { DO: 0, RE: 1, MI: 2, FA: 3, SOL: 4, LA: 5, TI: 6 };

// Cached canvas geometry (updated each drawTrack call so spawnHitBurst can use it)
let _lastCenterY     = 120;
let _lastLineSpacing = 28;

// ── Static-layer offscreen canvas (staff lines + treble clef) ─────────────────
// Rebuilt only when canvas dimensions change; blitted with drawImage each frame.
let _staticCanvas = null;
let _staticW = 0;
let _staticH = 0;

function ensureStaticLayer(w, h, centerY, lineSpacing) {
  if (_staticCanvas && _staticW === w && _staticH === h) return;

  if (!_staticCanvas) {
    _staticCanvas = document.createElement("canvas");
    // Hint the browser to promote this element to a GPU layer
    _staticCanvas.style.willChange = "contents";
  }
  _staticCanvas.width  = w;
  _staticCanvas.height = h;
  _staticW = w;
  _staticH = h;

  const sCtx = _staticCanvas.getContext("2d");
  sCtx.clearRect(0, 0, w, h);

  // 5 staff lines
  sCtx.strokeStyle = "rgba(30, 41, 59, 0.12)";
  sCtx.lineWidth   = 1.5;
  for (let i = -2; i <= 2; i++) {
    const y = centerY + i * lineSpacing;
    sCtx.beginPath();
    sCtx.moveTo(0, y);
    sCtx.lineTo(w, y);
    sCtx.stroke();
  }

  // Treble clef (expensive glyph — baked once)
  sCtx.fillStyle    = "rgba(30, 41, 59, 0.35)";
  sCtx.font         = "95px 'Outfit', sans-serif";
  sCtx.textAlign    = "center";
  sCtx.textBaseline = "middle";
  sCtx.fillText("𝄞", 55, centerY);
}

// ── HUD text cache — avoids writing innerText every frame when unchanged ───────
let _lastOctaveText = null;
let _lastSignText   = null;

function updateHUD() {
  if (dom.liveOctaveVal) {
    const txt = "👈 Octave: C4 (Locked)";
    if (_lastOctaveText !== txt) {
      dom.liveOctaveVal.innerText = txt;
      _lastOctaveText = txt;
    }
  }
  if (dom.liveSignVal) {
    const detail = NOTE_DETAILS[gameState.currentDetectedNote];
    const txt = (detail ? `Sign: ${detail.label} (${detail.key})` : "Sign: None") + " 👉";
    if (_lastSignText !== txt) {
      dom.liveSignVal.innerText = txt;
      _lastSignText = txt;
    }
  }
}

// ── Particles ─────────────────────────────────────────────────────────────────
const particles = [];

class HitParticle {
  constructor(x, y, color) {
    this.x     = x;
    this.y     = y;
    this.vx    = (Math.random() - 0.5) * 5;
    this.vy    = (Math.random() - 0.5) * 5;
    this.color = color;
    this.size  = Math.random() * 4 + 3;
    this.life  = 1.0;
    this.decay = Math.random() * 0.04 + 0.02;
  }

  update() {
    this.x   += this.vx;
    this.y   += this.vy;
    this.life -= this.decay;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.fillStyle   = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }
}

export function getNoteY(noteName, octave, centerY, lineSpacing = 28) {
  const stepIndex = NOTE_DIATONIC_STEPS[noteName] ?? 0;
  const totalStep = stepIndex + (octave - 4) * 7;
  return centerY - (totalStep - 6) * (lineSpacing / 2);
}

// ── Main draw (called every animation frame) ──────────────────────────────────
/**
 * Spawn a particle burst at the hit-zone for the given note.
 * Called ONCE from game_modes.js at the moment of hit — not from the render loop.
 */
export function spawnHitBurst(noteName, octave, color) {
  const y = getNoteY(noteName, octave, _lastCenterY, _lastLineSpacing);
  const burstColor = color || "#ffffff";
  for (let i = 0; i < 14; i++) {
    const p = new HitParticle(HIT_ZONE_X, y, burstColor);
    // Give outer particles more velocity for a wider spread
    p.vx *= 1.8 + Math.random();
    p.vy *= 1.8 + Math.random();
    p.size += 2;
    particles.push(p);
  }
}

export function drawTrack() {
  const canvasW = dom.gameCanvas.width;
  const canvasH = dom.gameCanvas.height;
  const ctx     = dom.gameCanvasCtx;

  ctx.clearRect(0, 0, canvasW, canvasH);

  const paddingX    = 40;
  const paddingY    = 15;
  const w           = canvasW - paddingX * 2;
  const h           = canvasH - paddingY * 2;
  const centerY     = h / 2 + 5;
  const lineSpacing = 28;

  // Keep module-level geometry up to date for spawnHitBurst()
  _lastCenterY     = centerY;
  _lastLineSpacing = lineSpacing;

  // Ensure static layer exists (no-op after first frame unless canvas resized)
  ensureStaticLayer(w, h, centerY, lineSpacing);

  // Update HUD text only when value actually changes
  updateHUD();

  ctx.save();
  ctx.translate(paddingX, paddingY);

  // 1. Blit pre-rendered static background (staff lines + treble clef)
  ctx.drawImage(_staticCanvas, 0, 0);

  // 2. Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    if (p.life <= 0) {
      particles.splice(i, 1);
    } else {
      p.draw(ctx);
    }
  }

  // 3. Find active target note
  let activeTargetNote = null;
  if (gameState.isPlayingGame) {
    if (gameState.currentExercise.isTutorial) {
      activeTargetNote = gameState.activeNotesInLevel[gameState.tutorialCurrentNoteIndex];
    } else {
      activeTargetNote = gameState.activeNotesInLevel.find(
        n => n.status === "pending" || n.status === "active" || n.status === "hit"
      );
    }
  }
  const targetY = activeTargetNote
    ? getNoteY(activeTargetNote.note, activeTargetNote.octave, centerY, lineSpacing)
    : centerY;

  // Ledger line for hit-zone target
  if (activeTargetNote) {
    const stepIndex = NOTE_DIATONIC_STEPS[activeTargetNote.note] ?? 0;
    const totalStep = stepIndex + (activeTargetNote.octave - 4) * 7;
    if ((totalStep <= 0 && totalStep % 2 === 0) || (totalStep >= 12 && totalStep % 2 === 0)) {
      ctx.strokeStyle = "rgba(30, 41, 59, 0.25)";
      ctx.lineWidth   = 1.8;
      ctx.beginPath();
      ctx.moveTo(HIT_ZONE_X - 55, targetY);
      ctx.lineTo(HIT_ZONE_X + 55, targetY);
      ctx.stroke();
    }
  }

  // 4. Hit zone box
  const targetW    = 86;
  const targetH    = 58;
  const targetX    = HIT_ZONE_X - targetW / 2;
  const targetYPos = targetY - targetH / 2;

  ctx.save();
  ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
  ctx.fillStyle   = "rgba(99, 102, 241, 0.12)";
  ctx.lineWidth   = 3;
  drawRoundedRect(ctx, targetX, targetYPos, targetW, targetH, 8);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(99, 102, 241, 0.7)";
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([4, 4]);
  drawRoundedRect(ctx, targetX + 4, targetYPos + 4, targetW - 8, targetH - 8, 6);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // 5. Notes timeline
  // Pre-compute hit-pulse sin ONCE per frame (not per note)
  const hitPulse = 1.15 + Math.sin(Date.now() / 40) * 0.08;

  gameState.activeNotesInLevel.forEach(note => {
    const beatOffset = note.beat - gameState.currentBeat;
    const noteX      = HIT_ZONE_X + beatOffset * BEAT_WIDTH;
    const detail     = NOTE_DETAILS[note.note] || { color: "#ffffff", label: note.note };
    const noteY      = getNoteY(note.note, note.octave, centerY, lineSpacing);

    // Draw sustain ribbon (always — ribbon tail can extend on-screen even when head is off)
    if (note.duration > 0) {
      const tailWidth = note.duration * BEAT_WIDTH;
      // Only draw if any part of the ribbon is visible
      if (noteX + tailWidth > 0 && noteX < w) {
        const gradient = ctx.createLinearGradient(noteX, noteY, noteX + tailWidth, noteY);
        gradient.addColorStop(0, detail.color);
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.fillStyle = gradient;
        ctx.fillRect(noteX, noteY - 10, tailWidth, 20);

        ctx.strokeStyle = detail.color;
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.moveTo(noteX, noteY - 10);
        ctx.lineTo(noteX + tailWidth, noteY - 10);
        ctx.moveTo(noteX, noteY + 10);
        ctx.lineTo(noteX + tailWidth, noteY + 10);
        ctx.stroke();
      }
    }

    // Particle burst is spawned from game_modes via spawnHitBurst() — not here.
    // (Per-frame spawning from the draw loop causes wrong timing and too few particles.)


    // Note card appearance params
    let scale           = 1.0;
    let cardBgColor     = "#ffffff";
    let cardBorderColor = detail.color;
    let shadowOffset    = 4;
    let alpha           = 1.0;
    const isActive      = activeTargetNote && (note === activeTargetNote);

    if (note.status === "completed") {
      alpha           = 0.35;
      cardBgColor     = "#f1f5f9";
      cardBorderColor = "#94a3b8";
      shadowOffset    = 2;
    } else if (note.status === "miss") {
      alpha           = 0.15;
      cardBgColor     = "#f1f5f9";
      cardBorderColor = "#cbd5e1";
      shadowOffset    = 1;
    } else if (note.status === "hit") {
      scale        = hitPulse; // reuse pre-computed value — no per-note Date.now()
      cardBgColor  = "#fdf2f8";
      shadowOffset = 6;
    } else if (isActive) {
      cardBgColor  = "#fdf2f8";
      shadowOffset = 6;
    }

    const cardW = 78 * scale;
    const cardH = 50 * scale;
    const cardX = noteX - cardW / 2;
    const cardY = noteY - cardH / 2;

    // Cull card head — keep generous margin so card never pops before reaching edge
    if (noteX > -(cardW + 60) && noteX < w + cardW + 60) {
      ctx.save();
      ctx.globalAlpha = alpha;

      // Ledger line for notes outside the staff (e.g. C4)
      const stepIndex = NOTE_DIATONIC_STEPS[note.note] ?? 0;
      const totalStep = stepIndex + (note.octave - 4) * 7;
      if ((totalStep <= 0 && totalStep % 2 === 0) || (totalStep >= 12 && totalStep % 2 === 0)) {
        ctx.strokeStyle = "rgba(30, 41, 59, 0.25)";
        ctx.lineWidth   = 1.8;
        ctx.beginPath();
        ctx.moveTo(noteX - 55, noteY);
        ctx.lineTo(noteX + 55, noteY);
        ctx.stroke();
      }

      // Shadow
      ctx.fillStyle = "#1e293b";
      drawRoundedRect(ctx, cardX + shadowOffset, cardY + shadowOffset, cardW, cardH, 8);
      ctx.fill();

      // Card body
      ctx.fillStyle   = cardBgColor;
      ctx.strokeStyle = cardBorderColor;
      ctx.lineWidth   = 3;
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 8);
      ctx.fill();
      ctx.stroke();

      // Note label
      ctx.fillStyle    = "#1e293b";
      ctx.font         = "bold 18px 'Outfit', sans-serif";
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(detail.label, noteX, noteY - 5);

      // Octave sub-label
      ctx.font      = "12px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#475569";
      ctx.fillText(`C${note.octave}`, noteX, noteY + 9);

      // Completed checkmark
      if (note.status === "completed") {
        ctx.font      = "bold 13px sans-serif";
        ctx.fillStyle = "#10b981";
        ctx.fillText("✓", cardX + cardW - 10, cardY + 11);
      }

      ctx.restore();
    }
  });

  // 6. Hit timing rating text
  if (gameState.ratingTimer > 0 && gameState.ratingText) {
    ctx.save();
    ctx.globalAlpha = Math.min(1.0, gameState.ratingTimer);
    ctx.fillStyle   = gameState.ratingColor;
    ctx.shadowColor = gameState.ratingColor;
    ctx.shadowBlur  = 10;
    ctx.font        = "bold 20px 'Outfit', sans-serif";
    ctx.textAlign   = "center";
    ctx.fillText(gameState.ratingText, HIT_ZONE_X, targetY - 40);
    ctx.restore();
    gameState.ratingTimer -= 0.035;
  }

  ctx.restore();
}

// ── Static/idle draw ──────────────────────────────────────────────────────────
export function drawTrackStatic() {
  const canvasW = dom.gameCanvas.width;
  const canvasH = dom.gameCanvas.height;
  const ctx     = dom.gameCanvasCtx;

  ctx.clearRect(0, 0, canvasW, canvasH);

  const paddingX    = 40;
  const paddingY    = 15;
  const w           = canvasW - paddingX * 2;
  const h           = canvasH - paddingY * 2;
  const centerY     = h / 2 + 5;
  const lineSpacing = 28;

  ensureStaticLayer(w, h, centerY, lineSpacing);
  updateHUD();

  ctx.save();
  ctx.translate(paddingX, paddingY);

  ctx.drawImage(_staticCanvas, 0, 0);

  // Hit zone placeholder
  const targetW    = 86;
  const targetH    = 58;
  const targetX    = HIT_ZONE_X - targetW / 2;
  const targetYPos = centerY - targetH / 2;

  ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
  ctx.fillStyle   = "rgba(99, 102, 241, 0.12)";
  ctx.lineWidth   = 3;
  drawRoundedRect(ctx, targetX, targetYPos, targetW, targetH, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle    = "rgba(30, 41, 59, 0.5)";
  ctx.font         = "15px 'Outfit', sans-serif";
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    gameState.currentExercise ? "Select a mode and press Start to play!" : "Select a Level to begin!",
    w / 2,
    centerY
  );

  ctx.restore();
}

// ── Canvas resize observer ────────────────────────────────────────────────────
export function setupLanesCanvas() {
  const resizeCanvas = () => {
    const rect = dom.gameCanvas.parentNode.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    dom.gameCanvas.width  = rect.width;
    dom.gameCanvas.height = rect.height;
    // Force static-layer rebuild at new dimensions
    _staticW = 0;
    _staticH = 0;
    if (!gameState.isPlayingGame) {
      drawTrackStatic();
    } else {
      drawTrack();
    }
  };

  const observer = new ResizeObserver(resizeCanvas);
  observer.observe(dom.gameCanvas.parentNode);
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
}
