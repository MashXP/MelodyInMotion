import { dom } from "./dom.js";
import { makerState } from "./state.js";
import { PIXELS_PER_BEAT } from "./constants.js";
import { initSynth, playNote, releaseNote, resumeAudio } from "../synth.js";
import { getFrequency } from "../rhythm/constants.js";

export function startPreview() {
  if (makerState.notes.length === 0) {
    alert("Timeline is empty! Add some notes to preview first.");
    return;
  }

  initSynth();
  resumeAudio();

  makerState.isPlayingPreview = true;
  dom.btnPreviewPlay.disabled = true;
  dom.btnPreviewPlay.innerText = "⏳ Playing...";
  dom.btnPreviewStop.disabled = false;

  makerState.previewBpm = parseInt(dom.songBpm.value) || 80;
  // Calculate start time based on currentPlayheadBeat
  const startSeconds = (makerState.currentPlayheadBeat * 60) / makerState.previewBpm;
  makerState.previewStartTime = performance.now() - (startSeconds * 1000);
  makerState.activePlayingNoteObj = null;

  runPreviewLoop();
}

export function stopPreview() {
  makerState.isPlayingPreview = false;
  if (makerState.previewAnimationId) {
    cancelAnimationFrame(makerState.previewAnimationId);
    makerState.previewAnimationId = null;
  }

  releaseNote();
  makerState.activePlayingNoteObj = null;

  dom.btnPreviewPlay.disabled = false;
  dom.btnPreviewPlay.innerText = "▶️ Play Song Preview";
  dom.btnPreviewStop.disabled = true;
}

export function runPreviewLoop() {
  if (!makerState.isPlayingPreview) return;

  const elapsedMs = performance.now() - makerState.previewStartTime;
  const elapsedSeconds = elapsedMs / 1000;
  
  const elapsedBeats = (elapsedSeconds * makerState.previewBpm) / 60;
  
  const renderPlayheadBeat = elapsedBeats;
  makerState.currentPlayheadBeat = renderPlayheadBeat;
  
  const playheadX = renderPlayheadBeat * PIXELS_PER_BEAT;

  dom.timelinePlayhead.style.left = `${playheadX}px`;

  // Autoscroll editor timeline container to keep playhead visible
  const wrapperWidth = dom.rollScrollWrapper.clientWidth;
  const currentScroll = dom.rollScrollWrapper.scrollLeft;
  
  if (playheadX > currentScroll + wrapperWidth - 150) {
    dom.rollScrollWrapper.scrollLeft = playheadX - 100;
  }

  const targetBeat = elapsedBeats + 4; 
  const currentNote = makerState.notes.find(n => targetBeat >= n.beat && targetBeat < n.beat + n.duration);

  if (currentNote) {
    if (makerState.activePlayingNoteObj !== currentNote) {
      releaseNote();

      const freq = getFrequency(currentNote.note, currentNote.octave);
      playNote(freq, currentNote.note, currentNote.octave);
      makerState.activePlayingNoteObj = currentNote;
    }
  } else {
    if (makerState.activePlayingNoteObj) {
      releaseNote();
      makerState.activePlayingNoteObj = null;
    }
  }

  const lastNote = makerState.notes[makerState.notes.length - 1];
  const lastNoteEndBeat = lastNote ? lastNote.beat + lastNote.duration - 4 : 0;
  
  if (renderPlayheadBeat >= lastNoteEndBeat + 1.0 || renderPlayheadBeat >= parseInt(dom.timelineLength.value)) {
    stopPreview();
    makerState.currentPlayheadBeat = 0;
    dom.timelinePlayhead.style.left = `0px`;
  } else {
    makerState.previewAnimationId = requestAnimationFrame(runPreviewLoop);
  }
}
