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

  // Create primary oscillator
  osc1 = audioCtx.createOscillator();
  osc1.type = waveform;
  osc1.frequency.setValueAtTime(freq, now);

  // Create secondary oscillator for warmth (no detune to prevent flanging)
  osc2 = audioCtx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(freq, now);

  // Create sub-oscillator for bass richness (one octave down)
  subOsc = audioCtx.createOscillator();
  subOsc.type = "triangle";
  subOsc.frequency.setValueAtTime(freq * 0.5, now);

  // Create LFO for vibrato
  lfo = audioCtx.createOscillator();
  lfo.frequency.setValueAtTime(6, now); // 6 Hz vibrato
  
  lfoGain = audioCtx.createGain();
  lfoGain.gain.setValueAtTime(vibratoEnabled ? 2.5 : 0, now); // vibrato depth (Hz)

  // Connect vibrato to oscillator pitch
  lfo.connect(lfoGain);
  lfoGain.connect(osc1.frequency);
  lfoGain.connect(osc2.frequency);

  // Connect synth voices to filter
  const oscGain1 = audioCtx.createGain();
  oscGain1.gain.setValueAtTime(0.4, now);
  osc1.connect(oscGain1);
  oscGain1.connect(filterNode);

  const oscGain2 = audioCtx.createGain();
  oscGain2.gain.setValueAtTime(0.3, now);
  osc2.connect(oscGain2);
  oscGain2.connect(filterNode);

  const subGain = audioCtx.createGain();
  subGain.gain.setValueAtTime(0.15, now);
  subOsc.connect(subGain);
  subGain.connect(filterNode);

  // Start oscillators
  osc1.start(now);
  osc2.start(now);
  subOsc.start(now);
  lfo.start(now);

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
  if (!osc1 && !osc2 && !subOsc && !lfo) return;

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
  }, 160);

  releasingVoices.push(voice);

  osc1 = null;
  osc2 = null;
  subOsc = null;
  lfo = null;
}

/**
 * Triggers a note or smoothly slides to it if already playing.
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

  if (!isPlaying) {
    // Start playing note
    startNodes(freq);
    // Trigger envelope Attack
    mainGain.gain.cancelScheduledValues(now);
    mainGain.gain.setValueAtTime(mainGain.gain.value, now);
    mainGain.gain.linearRampToValueAtTime(volume, now + 0.05);
    
    // Dynamic filter sweep on note trigger
    filterNode.frequency.cancelScheduledValues(now);
    filterNode.frequency.setValueAtTime(200, now);
    filterNode.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
    filterNode.frequency.exponentialRampToValueAtTime(800, now + 0.4);
  } else {
    // Smooth pitch slide (Portamento)
    osc1.frequency.cancelScheduledValues(now);
    osc1.frequency.setValueAtTime(osc1.frequency.value, now);
    osc1.frequency.exponentialRampToValueAtTime(freq, now + 0.08); // 80ms glide

    osc2.frequency.cancelScheduledValues(now);
    osc2.frequency.setValueAtTime(osc2.frequency.value, now);
    osc2.frequency.exponentialRampToValueAtTime(freq, now + 0.08);

    subOsc.frequency.cancelScheduledValues(now);
    subOsc.frequency.setValueAtTime(subOsc.frequency.value, now);
    subOsc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + 0.08);
  }
}

/**
 * Triggers the volume Release phase to fade out the note.
 */
export function releaseNote() {
  if (!isPlaying || !audioCtx) return;

  const now = audioCtx.currentTime;
  
  // Trigger envelope Release
  mainGain.gain.cancelScheduledValues(now);
  mainGain.gain.setValueAtTime(mainGain.gain.value, now);
  mainGain.gain.linearRampToValueAtTime(0, now + 0.15); // 150ms fade out

  // Stop oscillators after fade out completes
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

