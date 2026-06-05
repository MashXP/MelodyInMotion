// --- WEB AUDIO API SYNTHESIZER FOR SIGNMUSIC ---

let audioCtx = null;
let mainGain = null;
let filterNode = null;
let delayNode = null;
let feedbackGain = null;

// Oscillators
let osc1 = null;
let osc2 = null;
let subOsc = null;

// Vibrato LFO
let lfo = null;
let lfoGain = null;

// State variables
let isPlaying = false;
let currentFrequency = 0;
let currentNote = null;
let currentOctave = 4;
let releasingVoices = []; // tracks active voices in release fade-out phase

// User settings (defaults loaded from localStorage if available)
let volume = parseFloat(localStorage.getItem("signquest_volume") ?? "0.3");
let waveform = localStorage.getItem("signquest_waveform") ?? "triangle"; // triangle, sine, sawtooth, square
let delayEnabled = (localStorage.getItem("signquest_delay") ?? "true") === "true";
let vibratoEnabled = (localStorage.getItem("signquest_vibrato") ?? "true") === "true";

/**
 * Initializes the audio context and synth routing graph.
 * Must be triggered by a user gesture.
 */
export function initSynth() {
  if (audioCtx) return;

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create nodes
    mainGain = audioCtx.createGain();
    mainGain.gain.setValueAtTime(0, audioCtx.currentTime); // start silent

    filterNode = audioCtx.createBiquadFilter();
    filterNode.type = "lowpass";
    filterNode.frequency.setValueAtTime(1000, audioCtx.currentTime);
    filterNode.Q.setValueAtTime(1.5, audioCtx.currentTime);

    delayNode = audioCtx.createDelay(1.0);
    delayNode.delayTime.setValueAtTime(0.35, audioCtx.currentTime);

    feedbackGain = audioCtx.createGain();
    feedbackGain.gain.setValueAtTime(delayEnabled ? 0.3 : 0, audioCtx.currentTime);

    // Audio connections:
    // Oscillators -> Filter -> MainGain -> Destination
    //                   └---> DelayNode -> FeedbackGain -> DelayNode
    //                             └-------> MainGain
    
    filterNode.connect(mainGain);
    
    // Setup Delay Effect
    filterNode.connect(delayNode);
    delayNode.connect(feedbackGain);
    feedbackGain.connect(delayNode); // feedback loop
    delayNode.connect(mainGain);

    mainGain.connect(audioCtx.destination);
    console.log("Synthesizer audio graph initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Web Audio API:", error);
  }
}

/**
 * Starts the synthesizers nodes if not already playing.
 */
function startNodes(freq) {
  if (!audioCtx) initSynth();
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  stopNodesNow();

  const now = audioCtx.currentTime;

  // Additive oscillators representing piano string harmonics
  // 1. Fundamental
  osc1 = audioCtx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(freq, now);

  // 2. Second harmonic (octave)
  osc2 = audioCtx.createOscillator();
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(freq * 2, now);

  // 3. Third harmonic (octave + fifth)
  subOsc = audioCtx.createOscillator();
  subOsc.type = "sine";
  subOsc.frequency.setValueAtTime(freq * 3, now);

  // Connect vibrato (if enabled)
  if (vibratoEnabled) {
    lfo = audioCtx.createOscillator();
    lfo.frequency.setValueAtTime(5.5, now);
    
    lfoGain = audioCtx.createGain();
    lfoGain.gain.setValueAtTime(1.5, now);
    
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);
    
    lfo.start(now);
  }

  // Combine harmonics with roll-off weights
  const gain1 = audioCtx.createGain();
  gain1.gain.setValueAtTime(0.70, now);
  osc1.connect(gain1);
  gain1.connect(filterNode);

  const gain2 = audioCtx.createGain();
  gain2.gain.setValueAtTime(0.22, now);
  osc2.connect(gain2);
  gain2.connect(filterNode);

  const gain3 = audioCtx.createGain();
  gain3.gain.setValueAtTime(0.08, now);
  subOsc.connect(gain3);
  gain3.connect(filterNode);

  // Start oscillators
  osc1.start(now);
  osc2.start(now);
  subOsc.start(now);

  isPlaying = true;
}

/**
 * Stops/Disconnects all releasing voices immediately (instantly terminates overlap).
 */
function stopReleasingVoicesNow() {
  releasingVoices.forEach(voice => {
    if (voice.stopTimer) clearTimeout(voice.stopTimer);
    try { if (voice.osc1) { voice.osc1.stop(); voice.osc1.disconnect(); } } catch(e){}
    try { if (voice.osc2) { voice.osc2.stop(); voice.osc2.disconnect(); } } catch(e){}
    try { if (voice.subOsc) { voice.subOsc.stop(); voice.subOsc.disconnect(); } } catch(e){}
    try { if (voice.lfo) { voice.lfo.stop(); voice.lfo.disconnect(); } } catch(e){}
  });
  releasingVoices = [];
}

/**
 * Stops/Disconnects the synthesizers nodes instantly.
 */
function stopNodesNow() {
  if (osc1) { try { osc1.stop(); osc1.disconnect(); } catch(e){} osc1 = null; }
  if (osc2) { try { osc2.stop(); osc2.disconnect(); } catch(e){} osc2 = null; }
  if (subOsc) { try { subOsc.stop(); subOsc.disconnect(); } catch(e){} subOsc = null; }
  if (lfo) { try { lfo.stop(); lfo.disconnect(); } catch(e){} lfo = null; }
  stopReleasingVoicesNow();
}

/**
 * Stops the oscillators with a delayed fade-out to prevent pops.
 */
function stopNodesDelay() {
  if (!osc1 && !osc2 && !subOsc) return;

  const voice = {
    osc1,
    osc2,
    subOsc,
    lfo,
    stopTimer: null
  };

  voice.stopTimer = setTimeout(() => {
    try { if (voice.osc1) { voice.osc1.stop(); voice.osc1.disconnect(); } } catch(e){}
    try { if (voice.osc2) { voice.osc2.stop(); voice.osc2.disconnect(); } } catch(e){}
    try { if (voice.subOsc) { voice.subOsc.stop(); voice.subOsc.disconnect(); } } catch(e){}
    try { if (voice.lfo) { voice.lfo.stop(); voice.lfo.disconnect(); } } catch(e){}
    
    // Remove this voice from releasing list
    releasingVoices = releasingVoices.filter(v => v !== voice);
  }, 110);

  releasingVoices.push(voice);

  osc1 = null;
  osc2 = null;
  subOsc = null;
  lfo = null;
}

/**
 * Triggers a piano note key strike.
 * @param {number} freq - Target frequency in Hz.
 * @param {string} noteName - Solfège note name.
 * @param {number} octave - Current octave.
 */
export function playNote(freq, noteName, octave) {
  if (!audioCtx) initSynth();
  if (freq <= 0) {
    releaseNote();
    return;
  }

  currentFrequency = freq;
  currentNote = noteName;
  currentOctave = octave;

  const now = audioCtx.currentTime;

  // Always trigger a fresh key strike (no portamento glide for authentic piano feel)
  startNodes(freq);

  // Piano strike volume envelope (5ms attack, natural decay over 2 seconds)
  mainGain.gain.cancelScheduledValues(now);
  mainGain.gain.setValueAtTime(0, now);
  mainGain.gain.linearRampToValueAtTime(volume, now + 0.005);
  mainGain.gain.exponentialRampToValueAtTime(0.005, now + 2.0);
  
  // Piano filter sweep (bright initial strike, decaying rapidly to warm tone)
  filterNode.frequency.cancelScheduledValues(now);
  filterNode.frequency.setValueAtTime(2500, now);
  filterNode.frequency.exponentialRampToValueAtTime(320, now + 0.28);
}

/**
 * Triggers piano damper pedal release (quick dampening of string).
 */
export function releaseNote() {
  if (!isPlaying || !audioCtx) return;

  const now = audioCtx.currentTime;
  
  // Fast dampening (100ms fade-out)
  mainGain.gain.cancelScheduledValues(now);
  mainGain.gain.setValueAtTime(mainGain.gain.value, now);
  mainGain.gain.linearRampToValueAtTime(0, now + 0.1);

  // Stop oscillators
  stopNodesDelay();

  isPlaying = false;
  currentNote = null;
}

// --- SYNTH SETTERS & CONTROLLERS ---

export function setVolume(vol, persist = true) {
  volume = Math.max(0, Math.min(1, vol));
  if (persist) {
    localStorage.setItem("signquest_volume", volume.toString());
  }
  if (audioCtx && isPlaying) {
    mainGain.gain.setValueAtTime(volume, audioCtx.currentTime);
  }
}

export function setWaveform(wave) {
  if (["sine", "square", "sawtooth", "triangle"].includes(wave)) {
    waveform = wave;
    localStorage.setItem("signquest_waveform", wave);
    if (osc1) osc1.type = wave;
  }
}

export function setDelayEnabled(enabled) {
  delayEnabled = enabled;
  localStorage.setItem("signquest_delay", enabled.toString());
  if (feedbackGain) {
    feedbackGain.gain.setValueAtTime(enabled ? 0.3 : 0, audioCtx ? audioCtx.currentTime : 0);
  }
}

export function setVibratoEnabled(enabled) {
  vibratoEnabled = enabled;
  localStorage.setItem("signquest_vibrato", enabled.toString());
  if (lfoGain) {
    lfoGain.gain.setValueAtTime(enabled ? 2.5 : 0, audioCtx ? audioCtx.currentTime : 0);
  }
}

export function getSynthState() {
  return {
    isPlaying,
    currentNote,
    currentOctave,
    currentFrequency,
    volume,
    waveform,
    delayEnabled,
    vibratoEnabled
  };
}

export function resumeAudio() {
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

