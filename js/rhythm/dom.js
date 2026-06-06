export const dom = {
  video: null,
  canvas: null,
  canvasCtx: null,
  loadingOverlay: null,
  loadingText: null,
  btnPowerCamera: null,
  btnToggleCamera: null,
  btnToggleSkeleton: null,
  btnToggleSound: null,
  levelsDrawer: null,
  settingsDrawer: null,
  btnToggleLevels: null,
  btnCloseLevels: null,
  btnToggleSettings: null,
  btnCloseSettings: null,
  hudLevelTitle: null,
  hudBpmLabel: null,
  hudProgressBg: null,
  hudProgressFill: null,
  liveOctaveVal: null,
  liveSignVal: null,
  songListContainer: null,
  btnGamePlay: null,
  btnGameStop: null,
  scoreValEl: null,
  comboValEl: null,
  accuracyValEl: null,
  rankValEl: null,
  modePracticeBtn: null,
  modeChallengeBtn: null,
  selectedModeIndicator: null,
  tutorialBox: null,
  tutorialTitleVal: null,
  tutorialInstructionVal: null,
  tutorialProgressFill: null,
  tutorialTimeVal: null,
  btnSkipTutorial: null,
  handsignHintImg: null,
  resultsOverlay: null,
  resultsLevelTitle: null,
  resultsSubtitle: null,
  resultsRankContainer: null,
  resultsStatsGrid: null,
  resultsMessage: null,
  resultsRank: null,
  resultsScore: null,
  resultsCombo: null,
  resultsAccuracy: null,
  resultsHitratio: null,
  resultsBtnSongs: null,
  resultsBtnRetry: null,
  resultsBtnNext: null,
  gameCanvas: null,
  gameCanvasCtx: null,
  practicePauseAlert: null,
  synthVolume: null,
  leftyToggle: null,
  calibrateSelect: null,
  btnRhythmCalibrate: null,
  btnRhythmExport: null,
  btnRhythmReset: null,
  btnFullscreen: null,
  gameCountdown: null,
  countdownNumber: null,
  gameControlsBar: null,
  btnToggleControls: null,
  toggleControlsIcon: null,
  toggleControlsText: null,
  customLevelDropzone: null,
  customLevelFileInput: null,
  customLevelFeedback: null,
  btnClearCustomLevels: null
};

export function initDom() {
  dom.video = document.getElementById("webcam");
  dom.canvas = document.getElementById("output_canvas");
  dom.canvasCtx = dom.canvas.getContext("2d");
  dom.loadingOverlay = document.getElementById("loading-overlay");
  dom.loadingText = document.getElementById("loading-text");
  dom.btnPowerCamera = document.getElementById("btn-power-camera");
  dom.btnToggleCamera = document.getElementById("btn-toggle-camera");
  dom.btnToggleSkeleton = document.getElementById("btn-toggle-skeleton");
  dom.btnToggleSound = document.getElementById("btn-toggle-sound");
  dom.levelsDrawer = document.getElementById("levels-drawer");
  dom.settingsDrawer = document.getElementById("settings-drawer");
  dom.btnToggleLevels = document.getElementById("btn-toggle-levels");
  dom.btnCloseLevels = document.getElementById("btn-close-levels");
  dom.btnToggleSettings = document.getElementById("btn-toggle-settings");
  dom.btnCloseSettings = document.getElementById("btn-close-settings");
  dom.hudLevelTitle = document.getElementById("hud-level-title");
  dom.hudBpmLabel = document.getElementById("hud-bpm-label");
  dom.hudProgressBg = document.getElementById("hud-progress-bg");
  dom.hudProgressFill = document.getElementById("hud-progress-fill");
  dom.liveOctaveVal = document.getElementById("live-octave-val");
  dom.liveSignVal = document.getElementById("live-sign-val");
  dom.songListContainer = document.getElementById("song-list");
  dom.btnGamePlay = document.getElementById("btn-game-play");
  dom.btnGameStop = document.getElementById("btn-game-stop");
  dom.scoreValEl = document.getElementById("game-score");
  dom.comboValEl = document.getElementById("game-combo");
  dom.accuracyValEl = document.getElementById("game-accuracy");
  dom.rankValEl = document.getElementById("game-rank");
  dom.modePracticeBtn = document.getElementById("mode-practice");
  dom.modeChallengeBtn = document.getElementById("mode-challenge");
  dom.selectedModeIndicator = document.getElementById("selected-mode-indicator");
  dom.tutorialBox = document.getElementById("tutorial-box");
  dom.tutorialTitleVal = document.getElementById("tutorial-title-val");
  dom.tutorialInstructionVal = document.getElementById("tutorial-instruction-val");
  dom.tutorialProgressFill = document.getElementById("tutorial-progress-fill");
  dom.tutorialTimeVal = document.getElementById("tutorial-time-val");
  dom.btnSkipTutorial = document.getElementById("btn-skip-tutorial");
  dom.handsignHintImg = document.getElementById("handsign-hint-img");
  dom.resultsOverlay = document.getElementById("results-overlay");
  dom.resultsLevelTitle = document.getElementById("results-level-title");
  dom.resultsSubtitle = document.getElementById("results-subtitle");
  dom.resultsRankContainer = document.getElementById("results-rank-container");
  dom.resultsStatsGrid = document.getElementById("results-stats-grid");
  dom.resultsMessage = document.getElementById("results-message");
  dom.resultsRank = document.getElementById("results-rank");
  dom.resultsScore = document.getElementById("results-score");
  dom.resultsCombo = document.getElementById("results-combo");
  dom.resultsAccuracy = document.getElementById("results-accuracy");
  dom.resultsHitratio = document.getElementById("results-hitratio");
  dom.resultsBtnSongs = document.getElementById("results-btn-songs");
  dom.resultsBtnRetry = document.getElementById("results-btn-retry");
  dom.resultsBtnNext = document.getElementById("results-btn-next");
  dom.gameCanvas = document.getElementById("game-canvas");
  dom.gameCanvasCtx = dom.gameCanvas.getContext("2d");
  dom.practicePauseAlert = document.getElementById("practice-pause-alert");
  dom.synthVolume = document.getElementById("synth-volume");
  dom.leftyToggle = document.getElementById("hand-roles-lefty");
  dom.calibrateSelect = document.getElementById("calibrate-select");
  dom.btnRhythmCalibrate = document.getElementById("btn-rhythm-calibrate");
  dom.btnRhythmExport = document.getElementById("btn-rhythm-export");
  dom.btnRhythmReset = document.getElementById("btn-rhythm-reset");
  dom.btnFullscreen = document.getElementById("btn-fullscreen");
  dom.gameCountdown = document.getElementById("game-countdown");
  dom.countdownNumber = document.getElementById("countdown-number");
  dom.gameControlsBar = document.getElementById("game-controls-bar");
  dom.btnToggleControls = document.getElementById("btn-toggle-controls");
  dom.toggleControlsIcon = document.getElementById("toggle-controls-icon");
  dom.toggleControlsText = document.getElementById("toggle-controls-text");
  dom.customLevelDropzone = document.getElementById("custom-level-dropzone");
  dom.customLevelFileInput = document.getElementById("custom-level-file-input");
  dom.customLevelFeedback = document.getElementById("custom-level-feedback");
  dom.btnClearCustomLevels = document.getElementById("btn-clear-custom-levels");
}
