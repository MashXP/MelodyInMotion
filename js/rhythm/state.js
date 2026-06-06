export const gameState = {
  handLandmarker: null,
  webcamRunning: false,
  showCamera: localStorage.getItem("signquest_show_camera") !== "false",
  showSkeleton: localStorage.getItem("signquest_show_skeleton") !== "false",
  isCameraPowered: false,
  soundMuted: localStorage.getItem("signquest_sound_muted") === "true",
  userVolume: parseFloat(localStorage.getItem("signquest_user_volume") ?? "0.3"),

  // Game Logic State
  exercises: [],
  currentExercise: null,
  isPlayingGame: false,
  gameMode: localStorage.getItem("signquest_game_mode") || "challenge", // practice or challenge
  gameStartTime: 0,
  gameTime: 0, // in seconds
  currentBeat: 0,
  lastUpdate: 0,

  // Scoring & Stats
  score: 0,
  combo: 0,
  maxCombo: 0,
  totalHits: 0,
  totalPossibleNotes: 0,
  noteStats: { perfect: 0, good: 0, okay: 0, miss: 0 },
  activeNotesInLevel: [], // current level's notes list cloned and tracked
  ratingText: "",
  ratingTimer: 0,
  ratingColor: "#ffffff",

  // Sound trigger protection
  lastSynthNote: "-",
  lastSynthOctave: -1,
  synthPlaying: false,

  // Practice Mode Timeline Freeze State
  isPracticePaused: false,
  practiceWaitingForNote: "",
  practiceWaitingForOctave: 4,

  // Tutorial Mode State
  tutorialCurrentNoteIndex: 0,
  tutorialHoldDuration: 0, // cumulative hold time in seconds
  tutorialScrolling: true,

  // MediaPipe Live Tracking Variables
  currentDetectedNote: "-",
  currentDetectedOctave: 4,
  bothHandsVisible: false,
  noteHandVisible: false,
  handLossCounter: 0,

  // Leniency/Grace variables for octave hand loss
  lastValidOctave: 4,
  octaveLossTimer: 0, // in seconds

  // Gesture Debouncing
  debouncedLeftFingers: 0,
  pendingLeftFingers: -1,
  consecutiveLeftFingersCount: 0,

  pendingNote: "-",
  consecutiveNoteCount: 0,

  // Calibration State
  targetCalibrateNote: "DO",
  isCalibratingAutomated: false,
  calibrationCountdown: 3,
  calibrationCaptureIndex: 0,
  captureFlag: false,
  calibrationTimer: null,
  calibrationNextTimeout: null
};

export function resetGameStateStats() {
  gameState.score = 0;
  gameState.combo = 0;
  gameState.maxCombo = 0;
  gameState.totalHits = 0;
  gameState.noteStats = { perfect: 0, good: 0, okay: 0, miss: 0 };
  gameState.ratingText = "";
  gameState.ratingTimer = 0;
  gameState.gameTime = 0;
  gameState.currentBeat = 0;
  gameState.lastValidOctave = 4;
  gameState.currentDetectedOctave = 4;
  gameState.octaveLossTimer = 0;
  gameState.tutorialScrolling = true;
}
