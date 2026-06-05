// --- SIGNMUSIC CORE GAME STATE MACHINE & CONTROLLER ---
import { classifyMusicNote } from "./music_classifier.js";
import { getMusicTemplate, initMusicTemplates } from "./music_templates.js";
import { playNote, releaseNote, setVolume, setWaveform, initSynth, getSynthState, resumeAudio } from "./synth.js";
import { drawSkeleton } from "./drawing.js";
import { SONGS } from "./songs.js";

// --- TRANSLATION DATABASE ---
const TRANSLATIONS = {
  vi: {
    "intro-dedicated": "Dành cho cộng đồng người khiếm thính và người sử dụng ngôn ngữ ký hiệu.",
    "choose-lang": "Hãy chọn ngôn ngữ của bạn:",
    "btn-start": "Bắt đầu",
    "btn-start-disabled": "Giơ tay lên để mở khóa",
    "btn-levels": "Chọn màn chơi",
    "btn-tutorial": "Hướng dẫn",
    "btn-achievements": "Thành tích",
    "btn-back": "Quay lại Menu",
    "select-level-title": "Chọn Giai Điệu",
    "select-level-subtitle": "Luyện tập ký hiệu tay để hoàn thành bài hát.",
    "label-score": "Điểm",
    "btn-quit": "Thoát chơi",
    "btn-mute": "Âm thanh",
    "btn-skeleton": "Khung xương",
    "label-volume": "Âm lượng",
    "label-lefty": "Chế độ tay trái",
    "tut-title": "Hướng dẫn chơi",
    "tut-step1-title": "Bước 1: Chọn Quãng Tám",
    "tut-step1-desc": "Giơ từ 1 đến 5 ngón tay ở tay không chơi (mặc định là tay trái) để chọn quãng tám (C2 - C6). Giơ 0 ngón để tắt tiếng.",
    "tut-step2-title": "Bước 2: Ra Ký Hiệu Nốt",
    "tut-step2-desc": "Dùng tay chơi (mặc định tay phải) để ra ký hiệu tay Solfège tương ứng nốt nhạc đang sáng trên khuông. Nhìn hình khung xương vàng để học cách làm.",
    "tut-step3-title": "Bước 3: Luyện Tập & Tính Điểm",
    "tut-step3-desc": "Làm đúng ký hiệu tay và quãng để phát ra âm thanh và ghi 1 điểm! Khi có hai nốt giống nhau đứng cạnh nhau, bạn cần thả tay ra (trạng thái trung lập) rồi làm lại ký hiệu để kích hoạt nốt tiếp theo.",
    "ach-title": "Thành tích của bạn",
    "btn-close": "Đóng",
    "btn-replay": "Chơi lại",
    "btn-menu": "Menu chính",
    "lbl-score-obtained": "Số nốt đã chơi",
    "lbl-rating": "Đánh giá",
    "game-hand-detected": "Đã nhận diện bàn tay.",
    "game-ready": "Tuyệt vời! Mọi thứ đã sẵn sàng.",
    "game-ready-sub": "Hãy nhấn Bắt đầu để cùng mình khám phá thế giới âm nhạc này nhé!"
  },
  en: {
    "intro-dedicated": "Designed for the Deaf community and sign language users.",
    "choose-lang": "Please choose your language:",
    "btn-start": "Start Game",
    "btn-start-disabled": "Show hand to unlock",
    "btn-levels": "Select Level",
    "btn-tutorial": "How to Play",
    "btn-achievements": "Achievements",
    "btn-back": "Back to Menu",
    "select-level-title": "Choose a Melody",
    "select-level-subtitle": "Practice your Solfège signs by completing these levels.",
    "label-score": "Score",
    "btn-quit": "Quit Level",
    "btn-mute": "Sound On",
    "btn-skeleton": "Skeleton On",
    "label-volume": "Volume",
    "label-lefty": "Left-Handed Mode",
    "tut-title": "How to Play",
    "tut-step1-title": "Step 1: Setup Octave",
    "tut-step1-desc": "Show 1 to 5 extended fingers with your non-playing hand (default left) to set the octave (C2 - C6). 0 fingers will mute the sound.",
    "tut-step2-title": "Step 2: Sign the Note",
    "tut-step2-desc": "Use your playing hand (default right) to make the Solfège sign corresponding to the active note shown on the sheet music. Watch the yellow ghost guide if stuck!",
    "tut-step3-title": "Step 3: Play and Score",
    "tut-step3-desc": "Match the correct note and octave to trigger the note and gain 1 point! To play consecutive identical notes, briefly release your hand gesture (neutral state) before signing again.",
    "ach-title": "Your Achievements",
    "btn-close": "Close",
    "btn-replay": "Replay",
    "btn-menu": "Main Menu",
    "lbl-score-obtained": "Notes Played",
    "lbl-rating": "Rating",
    "game-hand-detected": "Hand detected.",
    "game-ready": "Awesome! Everything is ready.",
    "game-ready-sub": "Press Start and let's discover the world of music with Melody!"
  },
  ko: {
    "intro-dedicated": "청각장애인과 수어 사용자들을 위해 만들어졌습니다.",
    "choose-lang": "언어를 선택해 주세요:",
    "btn-start": "게임 시작",
    "btn-start-disabled": "손을 올려 잠금을 해제하세요",
    "btn-levels": "레벨 선택",
    "btn-tutorial": "게임 방법",
    "btn-achievements": "업적 보기",
    "btn-back": "메뉴로 돌아가기",
    "select-level-title": "멜로디 선택",
    "select-level-subtitle": "이 레벨을 완료하면서 도레미 수어를 연습해 보세요.",
    "label-score": "점수",
    "btn-quit": "레벨 나가기",
    "btn-mute": "소리 켜기",
    "btn-skeleton": "가이드 켜기",
    "label-volume": "볼륨 조절",
    "label-lefty": "왼손잡이 모드",
    "tut-title": "게임 방법",
    "tut-step1-title": "1단계: 옥타브 설정",
    "tut-step1-desc": "연주하지 않는 손(기본 왼손)으로 1~5개의 손가락을 펴서 옥타브(C2-C6)를 조절합니다. 0개를 펴면 소리가 나지 않습니다.",
    "tut-step2-title": "2단계: 음표 수어 표현",
    "tut-step2-desc": "연주하는 손(기본 오른손)으로 악보에 표시된 음표에 해당하는 수어를 만듭니다. 어려울 때는 화면의 노란색 손가락 가이드를 참고하세요!",
    "tut-step3-title": "3단계: 연주 및 득점",
    "tut-step3-desc": "맞는 음표 수어와 옥타브가 일치하면 소리가 나고 1점을 획득합니다! 같은 음표가 연속될 때는 잠시 손을 풀었다가(중립 상태) 다시 수어를 취해 주세요.",
    "ach-title": "내 업적 기록",
    "btn-close": "닫기",
    "btn-replay": "다시 하기",
    "btn-menu": "메인 메뉴",
    "lbl-score-obtained": "연주한 음표 수",
    "lbl-rating": "평가",
    "game-hand-detected": "손이 인식되었습니다.",
    "game-ready": "멋져요! 모든 준비가 완료되었습니다.",
    "game-ready-sub": "시작 버튼을 눌러 저와 함께 음악의 세계를 탐험해 보아요!"
  }
};

const NOTE_DETAILS = {
  DO: { label: "Do", key: "C", color: "var(--accent-rose)", emoji: "✊", desc: "Make a closed fist (ASL 'S')" },
  RE: { label: "Re", key: "D", color: "#fb923c", emoji: "🤚", desc: "Angled flat hand (ASL 'B' tilted -35°)" },
  MI: { label: "Mi", key: "E", color: "var(--accent-index)", emoji: "✋", desc: "Horizontal flat hand (ASL 'B' tilted -75°)" },
  FA: { note: "FA", label: "Fa", key: "F", color: "var(--accent-emerald)", emoji: "👎", desc: "Thumbs down (ASL 'A' rotated 160°)" },
  SOL: { label: "Sol", key: "G", color: "var(--accent-cyan)", emoji: "👋", desc: "Vertical flat hand (ASL 'B' rotated 0°)" },
  LA: { label: "La", key: "A", color: "var(--accent-indigo)", emoji: "🖐️", desc: "Curved down hand (ASL 'C' rotated 150°)" },
  TI: { label: "Ti", key: "B", color: "var(--accent-violet)", emoji: "☝️", desc: "Pointing up hand (ASL 'D' rotated -20°)" }
};

const NOTE_SEMITONES = { DO: 0, RE: 2, MI: 4, FA: 5, SOL: 7, LA: 9, TI: 11 };

// --- MONOLOGUES FOR INTRO (Index maps to steps) ---
const INTRO_SPEECH = {
  vi: [
    "Xin chào! Mình là Melody. Mình sẽ đồng hành cùng bạn trong hành trình tìm hiểu các nốt nhạc thông qua hình ảnh và ngôn ngữ ký hiệu.",
    "Trong trò chơi này, mỗi nốt nhạc sẽ có màu sắc, vị trí và ký hiệu tay riêng để giúp bạn dễ dàng nhận biết và ghi nhớ.",
    "Hãy quan sát các nốt nhạc xuất hiện trên khuông nhạc và thực hiện đúng ký hiệu tay tương ứng!",
    "Càng hoàn thành nhiều bài học, bạn sẽ càng khám phá được nhiều giai điệu thú vị hơn.",
    "Bây giờ, hãy đưa tay lên trước camera để bắt đầu nào!"
  ],
  en: [
    "Hi There! I'm Melody! I'll be with you in this journey to explore musical notes through visual cues and sign language.",
    "In this game, each musical note has its own color, position, and hand sign to help you recognize and remember it more easily.",
    "Watch the notes as they appear on the sheet and make the matching hand sign.",
    "The more lessons you complete, the more exciting melodies you'll discover.",
    "Now, hold your hand up in front of the camera to get started!"
  ],
  ko: [
    "안녕하세요! 저는 멜로디예요. 그림과 수어를 통해 음표를 배우는 여정을 함께할게요.",
    "이 게임에서는 각 음표마다 고유한 색상과 위치, 손동작이 있어 쉽고 재미있게 배울 수 있어요.",
    "오선지에 나타나는 음표를 보고 맞는 손동작을 해 보세요!",
    "더 많은 학습을 완료할수록 더 멋진 멜로디를 만나게 될 거예요.",
    "이제 카메라 앞에 손을 올리고 시작해 볼까요?"
  ]
};

// --- MASCOT SVG INLINE DATA ---
const MASCOT_SVG = `
<svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="animation: floatMascot 2.5s infinite alternate ease-in-out;">
  <style>
    @keyframes floatMascot {
      from { transform: translateY(0) rotate(0deg); }
      to { transform: translateY(-8px) rotate(3deg); }
    }
  </style>
  <!-- Sketched Note Body Outer Circle -->
  <path d="M 50 12 C 72 13, 87 26, 88 50 C 89 74, 73 87, 50 88 C 27 89, 11 73, 12 50 C 13 27, 28 11, 50 12" fill="#fed7aa" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
  
  <!-- Sketchy note symbol inside -->
  <path d="M 45 35 L 47 62" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M 32 62 C 32 54, 47 54, 47 62 C 47 70, 32 70, 32 62 Z" fill="#1e293b" stroke="#1e293b" stroke-width="2" stroke-linejoin="round"/>
  <path d="M 47 38 L 65 30" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round"/>
  
  <!-- Sketchy Eyes -->
  <path d="M 33 42 C 33 40, 36 40, 36 42" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M 47 42 C 47 40, 50 40, 50 42" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
  
  <!-- Sketched Smile -->
  <path d="M 36 50 C 38 54, 44 54, 46 50" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
  
  <!-- Rosy cheeks: crayon scribbles -->
  <path d="M 26 49 L 30 46 M 25 47 L 29 48 M 27 45 L 27 49" stroke="#fb7185" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M 52 49 L 56 46 M 51 47 L 55 48 M 53 45 L 53 49" stroke="#fb7185" stroke-width="2.5" stroke-linecap="round"/>
</svg>
`;

// --- GAME STATE ---
let currentLang = localStorage.getItem("signquest_lang") || "vi";
let activeView = "intro"; // "intro" | "welcome" | "selection" | "play"
let introDialogueIndex = 0;
let handPresent = false;

// Active level states
let currentSong = null;
let currentNoteIndex = 0;
let currentScore = 0;
let activeNote = "-";
let activeOctave = 4;
let lastMatchedNoteIndex = -1;
let needsRelease = false; // prevents matching next note until user goes to neutral state

// Noise reduction state
let debouncedLeftFingers = 0;
let pendingLeftFingers = -1;
let consecutiveLeftFingersCount = 0;
const LEFT_FINGERS_DEBOUNCE_THRESHOLD = 5;

let pendingNote = "-";
let consecutiveNoteCount = 0;
const NOTE_DEBOUNCE_THRESHOLD = 3;

let consecutiveLostFrames = 0;
const LOSS_DEBOUNCE_THRESHOLD = 8;

let lastPlayedNote = "-";
let lastPlayedOctave = -1;
let lastSynthPlaying = false;

// Audio context unlock
let audioInitialized = false;

// UI controls state cached
let soundMuted = localStorage.getItem("signquest_sound_muted") === "true";
let showSkeleton = localStorage.getItem("signquest_show_skeleton") !== "false";
let userVolume = parseFloat(localStorage.getItem("signquest_user_volume") ?? "0.3");

// Achievements database
let achievements = JSON.parse(localStorage.getItem("signquest_achievements_v1") || "{}");

// UI element cache
let elWebcamWrapper = null;
let elMascotSpeech = null;
let elNextDialogueBtn = null;
let elSkipDialogueBtn = null;
let elMascotSvgIntro = null;
let elMascotSvgWelcome = null;
let elMenuStartBtn = null;
let elCameraStatusTxt = null;
let elCyclingNote = null;
let elSongsContainer = null;
let elProgressText = null;

// Stave cycling interval
let staveCycleTimer = null;
let staveCycleNoteIndex = 0;

/**
 * Calculates note frequency.
 */
function getFrequency(noteName, octave) {
  const semitone = NOTE_SEMITONES[noteName];
  if (semitone === undefined) return 0;
  const midi = 12 * (octave + 1) + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Initial entry called from music_app.js on startup
 */
export function initMusicPage() {
  cacheElements();
  loadLanguage(currentLang);
  setupEventHandlers();
  startStaveNoteCycling();

  // Load visual SVGs
  if (elMascotSvgIntro) elMascotSvgIntro.innerHTML = MASCOT_SVG;
  if (elMascotSvgWelcome) elMascotSvgWelcome.innerHTML = MASCOT_SVG;

  // Set default view based on URL parameters or cached language selection
  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get("view");
  const startParam = params.get("start");
  const songParam = params.get("song");

  if (startParam === "true") {
    transitToView("welcome");
  } else if (viewParam === "selection") {
    transitToView("selection");
  } else if (viewParam === "play") {
    if (songParam !== null) {
      const idx = parseInt(songParam);
      if (idx >= 0 && idx < SONGS.length) {
        setTimeout(() => {
          loadLevel(SONGS[idx]);
        }, 100);
      } else {
        transitToView("play");
      }
    } else {
      transitToView("play");
    }
  } else {
    const skipIntroCached = localStorage.getItem("signquest_skip_intro") === "true";
    if (skipIntroCached) {
      transitToView("welcome");
    } else {
      transitToView("intro");
    }
  }

  // Audio Context Auto-unlock listeners
  window.addEventListener("mousedown", triggerAudioUnlock, { capture: true, once: true });
  window.addEventListener("pointerdown", triggerAudioUnlock, { capture: true, once: true });
  window.addEventListener("touchstart", triggerAudioUnlock, { capture: true, once: true });
  document.addEventListener("click", resumeAudio);

  // Sync synth volume
  setVolume(soundMuted ? 0 : userVolume);
}

function cacheElements() {
  elWebcamWrapper = document.getElementById("global-camera-wrapper");
  elMascotSpeech = document.getElementById("mascot-speech-text");
  elNextDialogueBtn = document.getElementById("btn-next-dialogue");
  elSkipDialogueBtn = document.getElementById("btn-skip-intro");
  elMascotSvgIntro = document.getElementById("mascot-svg-container");
  elMascotSvgWelcome = document.getElementById("mascot-avatar-welcome");
  elMenuStartBtn = document.getElementById("btn-menu-start");
  elCameraStatusTxt = document.getElementById("camera-status-txt");
  elCyclingNote = document.getElementById("cycling-note-node");
  elSongsContainer = document.getElementById("songs-list-container");
}

/**
 * Language Selector Loader
 */
function loadLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("signquest_lang", lang);

  // Sync language selects
  const headerSelector = document.getElementById("lang-selector-header");
  if (headerSelector) headerSelector.value = lang;

  // Apply translations to data-key elements
  document.querySelectorAll("[data-key]").forEach(el => {
    const key = el.getAttribute("data-key");
    const dict = TRANSLATIONS[lang];
    if (dict && dict[key]) {
      // Check if button helper text
      if (el.tagName === "STRONG" || el.className === "btn-subtext") {
        el.innerText = dict[key];
      } else {
        el.innerHTML = dict[key];
      }
    }
  });

  // Re-render intro dialogue if active
  if (activeView === "intro" && mascotSpeechActive()) {
    renderDialogueText();
  }

  // Re-render level selection cards
  if (activeView === "selection") {
    renderSongSelection();
  }

  // Update dynamic placeholders depending on hand state
  updateMenuButtonState();
}

function mascotSpeechActive() {
  const dialogueSection = document.getElementById("mascot-dialogue-section");
  return dialogueSection && dialogueSection.style.display !== "none";
}

function setupEventHandlers() {
  // Header logo clicks reset to welcome page
  const logo = document.getElementById("header-logo");
  if (logo) {
    logo.addEventListener("click", () => {
      deactivateMusicPage();
      window.location.href = "welcome.html";
    });
  }

  // Language selectors
  const headerSelector = document.getElementById("lang-selector-header");
  if (headerSelector) {
    headerSelector.addEventListener("change", (e) => loadLanguage(e.target.value));
  }

  // Lang selection screen buttons
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const selectedLang = btn.dataset.lang;
      loadLanguage(selectedLang);
      
      // Hide language selector block, show Mascot speech block
      const langSelectorBlock = document.querySelector(".lang-grid-selector");
      if (langSelectorBlock) langSelectorBlock.style.display = "none";
      
      const speechBlock = document.getElementById("mascot-dialogue-section");
      if (speechBlock) speechBlock.style.display = "block";
      
      introDialogueIndex = 0;
      renderDialogueText();
    });
  });

  // Dialogue navigation
  if (elNextDialogueBtn) {
    elNextDialogueBtn.addEventListener("click", () => {
      introDialogueIndex++;
      const speeches = INTRO_SPEECH[currentLang];
      if (introDialogueIndex >= speeches.length) {
        localStorage.setItem("signquest_skip_intro", "true");
        transitToView("welcome");
      } else {
        renderDialogueText();
      }
    });
  }

  if (elSkipDialogueBtn) {
    elSkipDialogueBtn.addEventListener("click", () => {
      localStorage.setItem("signquest_skip_intro", "true");
      transitToView("welcome");
    });
  }

  // Menu action buttons
  if (elMenuStartBtn) {
    elMenuStartBtn.addEventListener("click", () => {
      if (!elMenuStartBtn.classList.contains("disabled")) {
        transitToView("selection");
      }
    });
  }

  const btnLevels = document.getElementById("btn-menu-levels");
  if (btnLevels) {
    btnLevels.addEventListener("click", () => transitToView("selection"));
  }

  const btnBackSel = document.getElementById("btn-selection-back");
  if (btnBackSel) {
    btnBackSel.addEventListener("click", () => transitToView("welcome"));
  }

  const btnQuitPlay = document.getElementById("btn-play-quit");
  if (btnQuitPlay) {
    btnQuitPlay.addEventListener("click", () => {
      deactivateMusicPage();
      window.location.href = "level-select.html";
    });
  }

  // Settings in play view
  const btnPlaySound = document.getElementById("btn-play-sound");
  if (btnPlaySound) {
    btnPlaySound.addEventListener("click", () => {
      soundMuted = !soundMuted;
      localStorage.setItem("signquest_sound_muted", soundMuted.toString());
      btnPlaySound.className = soundMuted ? "stage-btn" : "stage-btn active";
      btnPlaySound.innerHTML = soundMuted ? "<span>🔇</span> Muted" : "<span>🔊</span> Sound On";
      setVolume(soundMuted ? 0 : userVolume);
    });
  }

  const btnPlaySkeleton = document.getElementById("btn-play-skeleton");
  if (btnPlaySkeleton) {
    btnPlaySkeleton.className = showSkeleton ? "stage-btn active" : "stage-btn";
    btnPlaySkeleton.addEventListener("click", () => {
      showSkeleton = !showSkeleton;
      localStorage.setItem("signquest_show_skeleton", showSkeleton.toString());
      btnPlaySkeleton.className = showSkeleton ? "stage-btn active" : "stage-btn";
    });
  }

  const sliderVol = document.getElementById("play-volume");
  const lblVol = document.getElementById("lbl-vol-val");
  if (sliderVol) {
    sliderVol.value = userVolume;
    if (lblVol) lblVol.innerText = `${Math.round(userVolume * 100)}%`;
    
    sliderVol.addEventListener("input", (e) => {
      userVolume = parseFloat(e.target.value);
      localStorage.setItem("signquest_user_volume", userVolume.toString());
      if (lblVol) lblVol.innerText = `${Math.round(userVolume * 100)}%`;
      if (!soundMuted) setVolume(userVolume);
    });
  }

  const checkLefty = document.getElementById("play-hand-roles-lefty");
  if (checkLefty) {
    checkLefty.checked = localStorage.getItem("signquest_left_handed") === "true";
    checkLefty.addEventListener("change", (e) => {
      localStorage.setItem("signquest_left_handed", e.target.checked.toString());
    });
  }

  // Modals overlays toggles
  setupModals();
}

function setupModals() {
  const modalTut = document.getElementById("modal-tutorial");
  const modalAch = document.getElementById("modal-achievements");
  
  const btnMenuTut = document.getElementById("btn-menu-tutorial");
  if (btnMenuTut && modalTut) {
    btnMenuTut.addEventListener("click", () => modalTut.classList.add("show"));
  }

  const btnMenuAch = document.getElementById("btn-menu-achievements");
  if (btnMenuAch && modalAch) {
    btnMenuAch.addEventListener("click", () => {
      renderAchievementsList();
      modalAch.classList.add("show");
    });
  }

  // Close buttons
  document.querySelectorAll(".modal-close-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const modal = btn.closest(".game-overlay-modal");
      if (modal) modal.classList.remove("show");
    });
  });

  // Completion buttons
  const btnRetry = document.getElementById("btn-compl-retry");
  if (btnRetry) {
    btnRetry.addEventListener("click", () => {
      document.getElementById("modal-completion").classList.remove("show");
      loadLevel(currentSong);
    });
  }

  const btnMenuCompl = document.getElementById("btn-compl-menu");
  if (btnMenuCompl) {
    btnMenuCompl.addEventListener("click", () => {
      document.getElementById("modal-completion").classList.remove("show");
      deactivateMusicPage();
      window.location.href = "welcome.html";
    });
  }
}

function triggerAudioUnlock() {
  initSynth();
  resumeAudio();
  audioInitialized = true;
}

function renderDialogueText() {
  const speeches = INTRO_SPEECH[currentLang];
  if (elMascotSpeech) {
    elMascotSpeech.innerText = speeches[introDialogueIndex];
  }
  if (elNextDialogueBtn) {
    const isLast = (introDialogueIndex === speeches.length - 1);
    elNextDialogueBtn.innerHTML = isLast ? "Let's Play &rarr;" : "Next &rarr;";
  }
}

/**
 * Transitions view panels and reparents the camera container
 */
function transitToView(viewName) {
  activeView = viewName;
  document.body.className = `view-${viewName}`;

  // Hide all panels
  document.querySelectorAll(".active-view-panel").forEach(p => p.style.display = "none");

  // Move camera container to the active screen parent slot
  if (elWebcamWrapper) {
    if (viewName === "welcome") {
      const slot = document.getElementById("camera-slot-welcome");
      if (slot) slot.appendChild(elWebcamWrapper);
      elWebcamWrapper.style.display = "block";
    } else if (viewName === "play") {
      const slot = document.getElementById("camera-slot-play");
      if (slot) slot.appendChild(elWebcamWrapper);
      elWebcamWrapper.style.display = "block";
    } else {
      // Hide camera for selection or intro screens
      document.body.appendChild(elWebcamWrapper);
      elWebcamWrapper.style.display = "none";
    }
  }

  // Show target panel
  const panel = document.getElementById(`${viewName}-view`);
  if (panel) {
    if (viewName === "play") {
      panel.style.display = "flex";
    } else {
      panel.style.display = "block";
    }
  }

  // Specific initializations
  if (viewName === "selection") {
    renderSongSelection();
  }
  if (viewName === "welcome") {
    // Reset language selections screen state in case they navigate back
    const langSelectorBlock = document.querySelector(".lang-grid-selector");
    if (langSelectorBlock) langSelectorBlock.style.display = "block";
    
    const speechBlock = document.getElementById("mascot-dialogue-section");
    if (speechBlock) speechBlock.style.display = "none";
    
    updateMenuButtonState();
  }
}

/**
 * Render Song Selection Grid
 */
function renderSongSelection() {
  if (!elSongsContainer) return;
  elSongsContainer.innerHTML = "";

  SONGS.forEach(song => {
    const card = document.createElement("div");
    card.className = "song-card";
    
    const scoreKey = `song_score_${song.id}`;
    const highScore = achievements[scoreKey] || 0;
    const notesCount = song.notes.length;
    const completedBadge = highScore === notesCount ? "🏆 Cleared" : "";

    card.innerHTML = `
      <div class="song-card-header">
        <span class="song-badge ${song.difficultyClass}">${song.difficulty}</span>
        <span style="color: #10b981; font-weight: 700; font-size: 0.8rem;">${completedBadge}</span>
      </div>
      <div class="song-card-body">
        <h3 class="song-title">${song.title[currentLang] || song.title['en']}</h3>
        <p class="song-desc">${song.description[currentLang] || song.description['en']}</p>
      </div>
      <div class="song-card-footer">
        <div class="song-meta-info">
          <span class="song-notes-count">🎵 ${notesCount} Notes</span>
          <span>⭐ Record: ${highScore}/${notesCount}</span>
        </div>
        <button class="play-level-btn" data-id="${song.id}">
          <span>▶</span> Play
        </button>
      </div>
    `;

    // Mouse movement hover light effect
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    });

    card.querySelector(".play-level-btn").addEventListener("click", () => {
      loadLevel(song);
    });

    elSongsContainer.appendChild(card);
  });
}

/**
 * Load and start a gameplay level
 */
function loadLevel(song) {
  currentSong = song;
  currentNoteIndex = 0;
  currentScore = 0;
  lastMatchedNoteIndex = -1;
  needsRelease = false;

  // Initialize UI
  document.getElementById("play-song-title").innerText = song.title[currentLang] || song.title['en'];
  const diffBadge = document.getElementById("play-song-difficulty");
  if (diffBadge) {
    diffBadge.innerText = song.difficulty;
    diffBadge.className = `song-badge ${song.difficultyClass}`;
  }
  document.getElementById("play-score-val").innerText = "0";
  document.getElementById("play-progress-bar").style.width = "0%";

  // Setup scrolling note track
  const track = document.getElementById("play-scroll-track");
  if (track) {
    track.innerHTML = "";
    
    song.notes.forEach((step, idx) => {
      const detail = NOTE_DETAILS[step.note];
      const node = document.createElement("div");
      node.className = `sheet-note-card ${idx === 0 ? "active-target" : ""}`;
      node.id = `sheet-note-${idx}`;
      node.style.setProperty("--note-theme-color", detail.color);
      
      node.innerHTML = `
        <span class="sheet-note-emoji">${detail.emoji}</span>
        <span class="sheet-note-name">${detail.label}</span>
        <span class="sheet-note-octave">C${step.octave}</span>
      `;
      
      track.appendChild(node);
    });
  }

  // Update guide displays
  updateActiveGuide();

  // Snaps view
  transitToView("play");
  
  // Audio resume
  triggerAudioUnlock();

  // Scroll to start
  setTimeout(() => {
    centerActiveNoteOnTrack();
  }, 100);
}

function updateActiveGuide() {
  if (!currentSong || currentNoteIndex >= currentSong.notes.length) return;
  const currentStep = currentSong.notes[currentNoteIndex];
  const detail = NOTE_DETAILS[currentStep.note];

  const guideEmoji = document.getElementById("guide-pose-emoji");
  const guidePrompt = document.getElementById("guide-pose-prompt");
  const guideDesc = document.getElementById("guide-pose-desc");

  if (guideEmoji) guideEmoji.innerText = detail.emoji;
  if (guidePrompt) {
    const noteText = `${detail.label} (C${currentStep.octave})`;
    guidePrompt.innerText = currentLang === "vi" 
      ? `Hãy làm: ${noteText}` 
      : currentLang === "ko" 
      ? `${noteText}를 표현하세요` 
      : `Show ${noteText}`;
  }
  if (guideDesc) guideDesc.innerText = detail.desc;
}

function centerActiveNoteOnTrack() {
  const trackWindow = document.getElementById("play-scroll-track");
  const activeCard = document.getElementById(`sheet-note-${currentNoteIndex}`);
  if (trackWindow && activeCard) {
    const scrollPos = activeCard.offsetLeft - (trackWindow.clientWidth / 2) + (activeCard.clientWidth / 2);
    trackWindow.scrollTo({ left: scrollPos, behavior: "smooth" });
  }
}

/**
 * Interactive Background Stave Note Cycling
 */
function startStaveNoteCycling() {
  if (staveCycleTimer) clearInterval(staveCycleTimer);
  
  const notes = ["DO", "RE", "MI", "FA", "SOL", "LA", "TI"];
  
  staveCycleTimer = setInterval(() => {
    if (activeView !== "welcome" || !elCyclingNote) return;
    
    staveCycleNoteIndex = (staveCycleNoteIndex + 1) % notes.length;
    const noteName = notes[staveCycleNoteIndex];
    const detail = NOTE_DETAILS[noteName];
    
    elCyclingNote.innerText = detail.label;
    elCyclingNote.style.background = detail.color;
    elCyclingNote.style.setProperty("--accent-rose", detail.color);
    
    // Animate and play sound
    elCyclingNote.style.transform = `scale(1.15) rotate(${Math.random() * 20 - 10}deg)`;
    setTimeout(() => {
      if (elCyclingNote) elCyclingNote.style.transform = `rotate(-10deg)`;
    }, 200);

    if (audioInitialized && !soundMuted) {
      // Play a soft, non-intrusive preview note at volume 0.1
      const freq = getFrequency(noteName, 4);
      playNote(freq, noteName, 4);
      setTimeout(() => releaseNote(), 200);
    }
  }, 1800);
}

/**
 * Updates menu start button disabled state depending on camera hand detection
 */
function updateMenuButtonState() {
  if (!elMenuStartBtn || !elCameraStatusTxt) return;

  const dot = elCameraStatusTxt.querySelector(".status-dot");

  if (handPresent) {
    elMenuStartBtn.classList.remove("disabled");
    elMenuStartBtn.disabled = false;
    
    dot.className = "status-dot active";
    elCameraStatusTxt.innerHTML = `<span class="status-dot active"></span> ${TRANSLATIONS[currentLang]["game-hand-detected"]}`;

    const sub = document.getElementById("btn-start-subtxt");
    if (sub) {
      sub.innerText = currentLang === "vi" 
        ? "Bắt đầu khám phá âm nhạc!" 
        : currentLang === "ko" 
        ? "음악 탐험을 시작하세요!" 
        : "Start exploring music!";
    }
  } else {
    elMenuStartBtn.classList.add("disabled");
    elMenuStartBtn.disabled = true;
    
    dot.className = "status-dot pulsing";
    elCameraStatusTxt.innerHTML = `<span class="status-dot pulsing"></span> ${TRANSLATIONS[currentLang]["btn-start-disabled"]}`;
    
    const sub = document.getElementById("btn-start-subtxt");
    if (sub) {
      sub.innerText = TRANSLATIONS[currentLang]["btn-start-disabled"];
    }
  }
}

/**
 * Clean shutdown when navigating away
 */
export function deactivateMusicPage() {
  releaseNote();
  lastPlayedNote = "-";
  lastPlayedOctave = -1;
  lastSynthPlaying = false;
  activeNote = "-";
  currentSong = null;
}

/**
 * Runs music hand landmark prediction logic inside the requestAnimationFrame loop.
 * Analyzes note matching, processes octaves, triggers sound updates, and manages scoring steps.
 */
export function updateMusicPrediction(detections, canvasCtx, forceSkeleton) {
  let leftHandLandmarks = null;
  let rightHandLandmarks = null;

  if (detections.landmarks && detections.landmarks.length > 0) {
    detections.landmarks.forEach((landmarks, idx) => {
      const handedness = detections.handedness[idx][0].displayName;
      if (handedness === "Left") {
        leftHandLandmarks = landmarks;
      } else {
        rightHandLandmarks = landmarks;
      }
    });
  }

  const bothHandsPresent = (leftHandLandmarks !== null || rightHandLandmarks !== null);
  
  // Track loss of tracking with a small grace period buffer
  if (bothHandsPresent) {
    consecutiveLostFrames = 0;
    if (!handPresent) {
      handPresent = true;
      updateMenuButtonState();
    }
  } else {
    consecutiveLostFrames++;
    if (consecutiveLostFrames >= LOSS_DEBOUNCE_THRESHOLD) {
      if (handPresent) {
        handPresent = false;
        updateMenuButtonState();
      }
    }
  }

  if (activeView !== "play") {
    // Only verify hand presence when not in active gameplay mode
    if (handPresent && showSkeleton && canvasCtx) {
      const landmarks = rightHandLandmarks || leftHandLandmarks;
      if (landmarks) drawSkeleton(canvasCtx, landmarks, "#06b6d4");
    }
    return;
  }

  // --- ACTIVE GAMEPLAY LOOP ---
  const isLefty = localStorage.getItem("signquest_left_handed") === "true";
  const noteHandLandmarks = isLefty ? leftHandLandmarks : rightHandLandmarks;
  const octaveHandLandmarks = isLefty ? rightHandLandmarks : leftHandLandmarks;
  const noteHandName = isLefty ? "Left" : "Right";

  // 1. Process Octave Hand
  let leftFingers = 4; // default to octave 4 if hand is missing
  if (octaveHandLandmarks) {
    const rawFingers = countExtendedFingers(octaveHandLandmarks);
    if (rawFingers === pendingLeftFingers) {
      consecutiveLeftFingersCount++;
      if (consecutiveLeftFingersCount >= LEFT_FINGERS_DEBOUNCE_THRESHOLD) {
        debouncedLeftFingers = rawFingers;
        if (debouncedLeftFingers >= 1 && debouncedLeftFingers <= 5) {
          activeOctave = debouncedLeftFingers + 1;
        }
      }
    } else {
      pendingLeftFingers = rawFingers;
      consecutiveLeftFingersCount = 1;
    }
    leftFingers = debouncedLeftFingers;

    if (showSkeleton && canvasCtx) {
      drawSkeleton(canvasCtx, octaveHandLandmarks, "#06b6d4");
    }
  } else {
    leftFingers = 4; // fallback
  }

  // Add visual feedback to camera container corner frame
  const lensScan = document.getElementById("lens-scan-overlay");
  if (lensScan) {
    if (noteHandLandmarks) {
      lensScan.classList.add("hand-locked");
    } else {
      lensScan.classList.remove("hand-locked");
    }
  }

  // 2. Process Note Hand
  if (noteHandLandmarks) {
    const rawDetectedNote = classifyMusicNote(noteHandLandmarks, noteHandName);
    
    if (rawDetectedNote === pendingNote) {
      consecutiveNoteCount++;
    } else {
      pendingNote = rawDetectedNote;
      consecutiveNoteCount = 1;
    }

    let detectedNote = activeNote;
    if (consecutiveNoteCount >= NOTE_DEBOUNCE_THRESHOLD) {
      detectedNote = rawDetectedNote;
    }

    if (detectedNote !== "-") {
      activeNote = detectedNote;
      
      const noteChanged = (detectedNote !== lastPlayedNote);
      const octaveChanged = (activeOctave !== lastPlayedOctave);
      
      if ((noteChanged || octaveChanged || !lastSynthPlaying) && !soundMuted) {
        const freq = getFrequency(detectedNote, activeOctave);
        playNote(freq, detectedNote, activeOctave);
        lastPlayedNote = detectedNote;
        lastPlayedOctave = activeOctave;
        lastSynthPlaying = true;
      }
      
      // Check for release criteria to clear consecutive identical note locks
      if (detectedNote === "-") {
        needsRelease = false;
      }

      // --- GAME NOTE MATCH VERIFICATION ---
      verifyNoteMatch(detectedNote, activeOctave);
    } else {
      // User is in neutral state "-"
      needsRelease = false;
      if (lastSynthPlaying) {
        releaseNote();
        lastPlayedNote = "-";
        lastPlayedOctave = -1;
        lastSynthPlaying = false;
        activeNote = "-";
      }
    }

    if (showSkeleton && canvasCtx) {
      drawSkeleton(canvasCtx, noteHandLandmarks, "#d946ef");
    }

    // Render guide ghost blueprint overlays
    renderGhostBlueprint(noteHandLandmarks, canvasCtx);
  } else {
    // Note hand is missing
    needsRelease = false;
    if (lastSynthPlaying) {
      releaseNote();
      lastPlayedNote = "-";
      lastPlayedOctave = -1;
      lastSynthPlaying = false;
      activeNote = "-";
    }
  }
}

/**
 * Check if user is showing the target level note and octave
 */
function verifyNoteMatch(detectedNote, octave) {
  if (!currentSong || currentNoteIndex >= currentSong.notes.length) return;
  const targetStep = currentSong.notes[currentNoteIndex];

  // In the first Tutorial, we relax the octave requirements to make learning easier
  const isTutorial = (currentSong.id === "tutorial_scale");
  const octaveMatches = isTutorial || (octave === targetStep.octave);
  const noteMatches = (detectedNote === targetStep.note);

  if (noteMatches && octaveMatches) {
    if (needsRelease && currentNoteIndex === lastMatchedNoteIndex) {
      // Must release neutral shape to match identical consecutive notes
      return;
    }

    // SUCCESS! MATCH FOUND
    lastMatchedNoteIndex = currentNoteIndex;
    needsRelease = true; // Lock match until release
    
    // Play audio feedback chime
    playSuccessChime();

    // Visual match card animation
    const matchedCard = document.getElementById(`sheet-note-${currentNoteIndex}`);
    if (matchedCard) {
      matchedCard.className = "sheet-note-card completed";
    }

    // Advance note index
    currentNoteIndex++;
    currentScore++;
    
    // Update Score
    document.getElementById("play-score-val").innerText = currentScore;
    
    // Update Progress
    const progressPercent = Math.round((currentNoteIndex / currentSong.notes.length) * 100);
    document.getElementById("play-progress-bar").style.width = `${progressPercent}%`;

    if (currentNoteIndex >= currentSong.notes.length) {
      // Level cleared
      triggerLevelClear();
    } else {
      // Highlight next note
      const nextCard = document.getElementById(`sheet-note-${currentNoteIndex}`);
      if (nextCard) {
        nextCard.classList.add("active-target");
      }
      updateActiveGuide();
      centerActiveNoteOnTrack();
    }
  }
}

function playSuccessChime() {
  if (soundMuted) return;
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880.00, audioCtx.currentTime); // A5 chime
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } catch (e) {}
}

function triggerLevelClear() {
  deactivateMusicPage();

  // Save achievement
  const scoreKey = `song_score_${currentSong.id}`;
  const prevHighScore = achievements[scoreKey] || 0;
  if (currentScore > prevHighScore) {
    achievements[scoreKey] = currentScore;
    localStorage.setItem("signquest_achievements_v1", JSON.stringify(achievements));
  }

  // Star Rating
  const totalNotes = currentSong.notes.length;
  let stars = "⭐";
  if (currentScore >= totalNotes) stars = "⭐⭐⭐";
  else if (currentScore >= totalNotes * 0.7) stars = "⭐⭐";

  // Populate Modal
  document.getElementById("compl-title").innerText = currentLang === "vi" 
    ? "Màn Chơi Hoàn Thành!" 
    : currentLang === "ko" 
    ? "레벨 완료!" 
    : "Level Cleared!";
    
  document.getElementById("compl-subtitle").innerText = currentSong.title[currentLang] || currentSong.title['en'];
  document.getElementById("compl-score").innerText = `${currentScore}/${totalNotes}`;
  document.getElementById("compl-stars").innerText = stars;

  // Show Modal
  const modal = document.getElementById("modal-completion");
  if (modal) modal.classList.add("show");
}

function renderAchievementsList() {
  const container = document.getElementById("achievements-list");
  if (!container) return;
  container.innerHTML = "";

  SONGS.forEach(song => {
    const scoreKey = `song_score_${song.id}`;
    const score = achievements[scoreKey] || 0;
    const total = song.notes.length;
    const percent = total > 0 ? Math.round((score / total) * 100) : 0;
    const medal = percent === 100 ? "🏆" : "🎵";

    const item = document.createElement("div");
    item.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 0.8rem 1rem; border-radius: 12px;";
    
    item.innerHTML = `
      <div>
        <span style="margin-right: 0.5rem;">${medal}</span>
        <strong style="color: var(--text-primary); font-size: 0.95rem;">${song.title[currentLang] || song.title['en']}</strong>
      </div>
      <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; font-weight: 700; color: var(--accent-cyan);">
        ${score}/${total} (${percent}%)
      </div>
    `;
    
    container.appendChild(item);
  });
}

function renderGhostBlueprint(landmarks, canvasCtx) {
  if (!currentSong || currentNoteIndex >= currentSong.notes.length) return;
  const targetNote = currentSong.notes[currentNoteIndex].note;
  const template = getMusicTemplate(targetNote);
  
  if (template) {
    const userWrist = landmarks[0];
    const userScale = Math.sqrt(
      Math.pow(landmarks[9].x - userWrist.x, 2) +
      Math.pow(landmarks[9].y - userWrist.y, 2)
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

    drawSkeleton(canvasCtx, guidedLandmarks, "rgba(253, 224, 71, 0.45)", true);
  }
}

/**
 * Counts the number of extended fingers on a hand.
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

  if (dist(landmarks[8], wrist) > dist(landmarks[6], wrist) * 1.1) extendedCount++;
  if (dist(landmarks[12], wrist) > dist(landmarks[10], wrist) * 1.1) extendedCount++;
  if (dist(landmarks[16], wrist) > dist(landmarks[14], wrist) * 1.1) extendedCount++;
  if (dist(landmarks[20], wrist) > dist(landmarks[18], wrist) * 1.1) extendedCount++;

  const thumbExt = dist(landmarks[4], landmarks[5]) > dist(landmarks[2], landmarks[5]) * 0.8;
  if (thumbExt) extendedCount++;

  return extendedCount;
}
