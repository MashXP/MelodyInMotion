// --- GAME CHALLENGE STATE & LOGIC ---

const CHALLENGE_LETTERS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "K", "L", "M", 
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y"
];

let activeTargetLetter = null;
let completedLetters = new Set();
let soundMuted = false;

export function setSoundMuted(muted) {
  soundMuted = muted;
}

// DOM hooks
let scoreValEl = null;
let alphabetGrid = null;
let detectedLetterEl = null;
let detectedLetterBox = null;

/**
 * Initializes the game UI elements, registers click handlers, and loads progress.
 * @param {Object} elements - Hooks to the DOM elements.
 */
export function initGame(elements) {
  scoreValEl = elements.scoreValEl;
  alphabetGrid = elements.alphabetGrid;
  detectedLetterEl = elements.detectedLetterEl;
  detectedLetterBox = elements.detectedLetterBox;

  setupGrid();
  loadProgress();
  selectNextTarget();
}

function setupGrid() {
  alphabetGrid.innerHTML = "";
  
  CHALLENGE_LETTERS.forEach(letter => {
    const btn = document.createElement("button");
    btn.className = "letter-btn";
    btn.id = `btn-letter-${letter}`;
    btn.innerText = letter;
    
    btn.addEventListener("click", () => {
      setTargetLetter(letter);
    });
    
    alphabetGrid.appendChild(btn);
  });
}

/**
 * Returns the currently active target letter.
 */
export function getActiveTarget() {
  return activeTargetLetter;
}

/**
 * Sets the active target letter, updating styles in the grid and guide.
 * @param {string} letter 
 */
export function setTargetLetter(letter) {
  activeTargetLetter = letter;
  
  // Highlight in Grid
  document.querySelectorAll(".letter-btn").forEach(btn => {
    btn.classList.remove("target");
  });
  
  const targetBtn = document.getElementById(`btn-letter-${letter}`);
  if (targetBtn) {
    targetBtn.classList.add("target");
  }
}

/**
 * Selects the next random incomplete letter.
 */
export function selectNextTarget() {
  const remaining = CHALLENGE_LETTERS.filter(l => !completedLetters.has(l));
  if (remaining.length === 0) {
    activeTargetLetter = null;
    document.querySelectorAll(".letter-btn").forEach(btn => btn.classList.remove("target"));
    detectedLetterBox.className = "letter-box active-match";
    detectedLetterEl.innerText = "🏆";
    return;
  }
  
  const randomLetter = remaining[Math.floor(Math.random() * remaining.length)];
  setTargetLetter(randomLetter);
}

/**
 * Marks a letter as completed and saves progress.
 * @param {string} letter 
 */
export function markLetterCompleted(letter) {
  completedLetters.add(letter);
  const btn = document.getElementById(`btn-letter-${letter}`);
  if (btn) {
    btn.classList.remove("target");
    btn.classList.add("completed");
  }
  
  scoreValEl.innerText = completedLetters.size;
  saveProgress();
}

/**
 * Resets all progress.
 */
export function resetChallenge() {
  completedLetters.clear();
  localStorage.removeItem("signquest_completed_letters24");
  
  document.querySelectorAll(".letter-btn").forEach(btn => {
    btn.classList.remove("completed");
    btn.classList.remove("target");
  });
  
  scoreValEl.innerText = 0;
  selectNextTarget();
}

function saveProgress() {
  localStorage.setItem(
    "signquest_completed_letters24", 
    JSON.stringify(Array.from(completedLetters))
  );
}

function loadProgress() {
  const savedProgress = localStorage.getItem("signquest_completed_letters24");
  if (savedProgress) {
    const arr = JSON.parse(savedProgress);
    arr.forEach(l => {
      if (CHALLENGE_LETTERS.includes(l)) {
        markLetterCompleted(l);
      }
    });
  }
}

/**
 * Synthesizes a game-like success sound using Web Audio API.
 */
export function playSuccessSound() {
  if (soundMuted) return;
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Note 1 (E5)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
    gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start();
    osc1.stop(audioCtx.currentTime + 0.3);
    
    // Note 2 (A5) after 100ms
    setTimeout(() => {
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime); // A5
      gain2.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start();
      osc2.stop(audioCtx.currentTime + 0.5);
    }, 100);
  } catch (e) {
    console.log("Audio play blocked by browser policies.");
  }
}

/**
 * Returns whether all challenge letters are completed.
 */
export function isAllCompleted() {
  return completedLetters.size === CHALLENGE_LETTERS.length;
}
