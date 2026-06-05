import { dom, initDom } from "./dom.js";
import { makerState } from "./state.js";
import { PIXELS_PER_BEAT } from "./constants.js";
import { getFrequency } from "../rhythm/constants.js";
import { initSynth, resumeAudio, playNote, releaseNote } from "../synth.js";
import { generateLabels, updateRuler, renderGrid, renderNotes, updateJsonOutput, handleTimelineClick } from "./editor.js";
import { startPreview, stopPreview } from "./preview.js";

function init() {
  initDom();
  setupListeners();
  generateLabels();
  updateRuler();
  renderGrid();
  renderNotes();
  updateJsonOutput();
  
  // Scroll to bottom (C3 view default)
  setTimeout(() => {
    dom.rollScrollWrapper.scrollTop = dom.rollScrollWrapper.scrollHeight;
  }, 50);
  
  // Unmute synth on first body click
  const unlockAudio = () => {
    initSynth();
    resumeAudio();
    window.removeEventListener("click", unlockAudio);
  };
  window.addEventListener("click", unlockAudio);
}

function setupListeners() {
  // Metadata Changes
  dom.songBpm.addEventListener("input", (e) => {
    dom.songBpmVal.innerText = e.target.value;
    makerState.previewBpm = parseInt(e.target.value);
    updateJsonOutput();
  });
  dom.songId.addEventListener("input", updateJsonOutput);
  dom.songTitle.addEventListener("input", updateJsonOutput);
  dom.songDesc.addEventListener("input", updateJsonOutput);
  
  // Resolution / Length Changes
  dom.timelineLength.addEventListener("input", () => {
    updateRuler();
    renderGrid();
    renderNotes();
    updateJsonOutput();
  });
  
  dom.snapResolution.addEventListener("change", () => {
    renderGrid();
  });

  // Timeline Click (Place Note)
  dom.pianoRollTracks.addEventListener("mousedown", handleTimelineClick);

  // Copy JSON
  dom.btnCopyJson.addEventListener("click", () => {
    dom.jsonTextarea.select();
    document.execCommand("copy");
    const originalText = dom.btnCopyJson.innerText;
    dom.btnCopyJson.innerText = "✅ Copied!";
    setTimeout(() => dom.btnCopyJson.innerText = originalText, 1500);
  });

  // Preview Play/Stop
  dom.btnPreviewPlay.addEventListener("click", startPreview);
  dom.btnPreviewStop.addEventListener("click", stopPreview);

  // Clear Timeline
  dom.btnClearTimeline.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all notes from the timeline?")) {
      makerState.notes = [];
      renderNotes();
      updateJsonOutput();
    }
  });

  // Load Example
  dom.btnLoadSample.addEventListener("click", loadExampleMelody);

  // Export to Game
  dom.btnExportGame.addEventListener("click", exportLevelToGame);
  dom.btnModalClose.addEventListener("click", () => {
    dom.successModal.classList.remove("active");
  });

  // Import JSON Modals
  dom.btnImportDialog.addEventListener("click", () => {
    dom.importTextarea.value = "";
    dom.importModal.classList.add("active");
  });
  dom.btnImportCancel.addEventListener("click", () => {
    dom.importModal.classList.remove("active");
  });
  dom.btnImportConfirm.addEventListener("click", importLevelJson);

  // Download File
  dom.btnDownloadSong.addEventListener("click", downloadSongFile);

  // Mouse hover beat tracker
  dom.pianoRollTracks.addEventListener("mousemove", (e) => {
    const rect = dom.pianoRollTracks.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const beat = clickX / PIXELS_PER_BEAT;
    const snap = parseFloat(dom.snapResolution.value);
    makerState.lastHoveredBeat = Math.max(0, Math.round(beat / snap) * snap);
  });

  // Clipboard Keyboard Shortcuts
  window.addEventListener("keydown", (e) => {
    // Prevent overriding form fields input
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT")) {
      return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    // Ctrl + C (Copy selected notes)
    if (isCmdOrCtrl && e.key.toLowerCase() === "c") {
      if (makerState.selectedNotes.length > 0) {
        e.preventDefault();
        const minBeat = Math.min(...makerState.selectedNotes.map(n => n.beat));
        
        makerState.clipboardNotes = makerState.selectedNotes.map(n => {
          return {
            offsetBeat: n.beat - minBeat,
            note: n.note,
            octave: n.octave,
            duration: n.duration
          };
        });
        console.log(`Copied ${makerState.clipboardNotes.length} notes.`);
      }
    }

    // Ctrl + V (Paste copied notes)
    if (isCmdOrCtrl && e.key.toLowerCase() === "v") {
      if (makerState.clipboardNotes.length > 0) {
        e.preventDefault();
        
        let pasteStartBeat = 4; // default base (with +4 offset)
        if (makerState.lastHoveredBeat !== undefined) {
          pasteStartBeat = makerState.lastHoveredBeat + 4; // apply pre-run offset
        }

        const pasted = [];
        makerState.clipboardNotes.forEach(c => {
          const newNote = {
            beat: pasteStartBeat + c.offsetBeat,
            note: c.note,
            octave: c.octave,
            duration: c.duration
          };
          makerState.notes.push(newNote);
          pasted.push(newNote);
        });

        makerState.notes.sort((a, b) => a.beat - b.beat);
        makerState.selectedNotes = pasted; // select pasted block

        // Acoustic feedback of pasted notes
        if (pasted.length > 0) {
          const first = pasted[0];
          const freq = getFrequency(first.note, first.octave);
          playNote(freq, first.note, first.octave);
          setTimeout(releaseNote, 200);
        }

        renderNotes();
        updateJsonOutput();
        console.log(`Pasted ${pasted.length} notes.`);
      }
    }

    // Backspace or Delete (Remove selected notes)
    if (e.key === "Backspace" || e.key === "Delete") {
      if (makerState.selectedNotes.length > 0) {
        e.preventDefault();
        makerState.notes = makerState.notes.filter(n => !makerState.selectedNotes.includes(n));
        makerState.selectedNotes = [];
        
        renderNotes();
        updateJsonOutput();
        console.log("Deleted selected notes.");
      }
    }

    // Ctrl + A (Select All)
    if (isCmdOrCtrl && e.key.toLowerCase() === "a") {
      e.preventDefault();
      makerState.selectedNotes = [...makerState.notes];
      renderNotes();
    }
  });

  // Handle click & drag on ruler to position playhead
  dom.rulerBeatsTimeline.addEventListener("mousedown", (e) => {
    e.preventDefault();
    
    const updatePlayheadFromEvent = (event) => {
      const rect = dom.rulerBeatsTimeline.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      
      const beat = clickX / PIXELS_PER_BEAT;
      const snap = parseFloat(dom.snapResolution.value);
      const length = parseInt(dom.timelineLength.value);
      
      let snappedBeat = Math.round(beat / snap) * snap;
      snappedBeat = Math.max(0, Math.min(length, snappedBeat));
      
      makerState.currentPlayheadBeat = snappedBeat;
      const playheadX = snappedBeat * PIXELS_PER_BEAT;
      dom.timelinePlayhead.style.left = `${playheadX}px`;
      
      // Autoscroll timeline horizontally if playhead is dragged near or beyond boundaries
      const wrapperWidth = dom.rollScrollWrapper.clientWidth;
      const currentScroll = dom.rollScrollWrapper.scrollLeft;

      if (playheadX > currentScroll + wrapperWidth - 100) {
        dom.rollScrollWrapper.scrollLeft = playheadX - wrapperWidth + 150;
      } else if (playheadX < currentScroll + 100) {
        dom.rollScrollWrapper.scrollLeft = Math.max(0, playheadX - 100);
      }
      
      // If playing, update previewStartTime so it jumps audio playback dynamically!
      if (makerState.isPlayingPreview) {
        const elapsedSeconds = (snappedBeat * 60) / makerState.previewBpm;
        makerState.previewStartTime = performance.now() - (elapsedSeconds * 1000);
      }
    };
    
    updatePlayheadFromEvent(e);
    
    const onMouseMove = (moveEvent) => {
      updatePlayheadFromEvent(moveEvent);
    };
    
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  });
}

function loadExampleMelody() {
  if (makerState.notes.length > 0 && !confirm("Loading example will overwrite your current timeline. Proceed?")) {
    return;
  }

  makerState.notes = [
    { "beat": 4.0, "note": "MI", "octave": 4, "duration": 1.2 },
    { "beat": 5.5, "note": "RE", "octave": 4, "duration": 0.4 },
    { "beat": 6.0, "note": "DO", "octave": 4, "duration": 0.8 },
    { "beat": 7.0, "note": "RE", "octave": 4, "duration": 0.8 },
    { "beat": 8.0, "note": "MI", "octave": 4, "duration": 0.8 },
    { "beat": 9.0, "note": "MI", "octave": 4, "duration": 0.8 },
    { "beat": 10.0, "note": "MI", "octave": 4, "duration": 1.6 },
    { "beat": 12.0, "note": "RE", "octave": 4, "duration": 0.8 },
    { "beat": 13.0, "note": "RE", "octave": 4, "duration": 0.8 },
    { "beat": 14.0, "note": "RE", "octave": 4, "duration": 1.6 },
    { "beat": 16.0, "note": "MI", "octave": 4, "duration": 0.8 },
    { "beat": 17.0, "note": "SOL", "octave": 4, "duration": 0.8 },
    { "beat": 18.0, "note": "SOL", "octave": 4, "duration": 1.6 },
    { "beat": 20.0, "note": "MI", "octave": 4, "duration": 1.2 },
    { "beat": 21.5, "note": "RE", "octave": 4, "duration": 0.4 },
    { "beat": 22.0, "note": "DO", "octave": 4, "duration": 0.8 },
    { "beat": 23.0, "note": "RE", "octave": 4, "duration": 0.8 },
    { "beat": 24.0, "note": "MI", "octave": 4, "duration": 0.8 },
    { "beat": 25.0, "note": "MI", "octave": 4, "duration": 0.8 },
    { "beat": 26.0, "note": "MI", "octave": 4, "duration": 0.8 },
    { "beat": 27.0, "note": "MI", "octave": 4, "duration": 0.8 },
    { "beat": 28.0, "note": "RE", "octave": 4, "duration": 0.8 },
    { "beat": 29.0, "note": "RE", "octave": 4, "duration": 0.8 },
    { "beat": 30.0, "note": "MI", "octave": 4, "duration": 0.8 },
    { "beat": 31.0, "note": "RE", "octave": 4, "duration": 0.8 },
    { "beat": 32.0, "note": "DO", "octave": 4, "duration": 3.2 }
  ];

  dom.songId.value = "mary_had_lamb_custom";
  dom.songTitle.value = "Mary Had a Little Lamb (Custom)";
  dom.songDesc.value = "Mary Had a Little Lamb visual composition preview";
  dom.songBpm.value = 60;
  dom.songBpmVal.innerText = "60";
  dom.timelineLength.value = "64";
  
  updateRuler();
  renderGrid();
  renderNotes();
  updateJsonOutput();
}

function exportLevelToGame() {
  if (makerState.notes.length === 0) {
    alert("Please add some notes to the timeline before saving the level.");
    return;
  }

  const songData = {
    id: dom.songId.value.trim() || "custom_level",
    title: dom.songTitle.value.trim() || "Custom Melody",
    description: dom.songDesc.value.trim() || "Custom Level",
    isTutorial: false,
    bpm: parseInt(dom.songBpm.value) || 80,
    notes: makerState.notes
  };

  let customList = [];
  try {
    const raw = localStorage.getItem("signquest_custom_exercises");
    if (raw) {
      customList = JSON.parse(raw);
      if (!Array.isArray(customList)) customList = [];
    }
  } catch (e) {
    customList = [];
  }

  const index = customList.findIndex(x => x.id === songData.id);
  if (index >= 0) {
    if (!confirm(`A custom level with ID "${songData.id}" already exists. Overwrite?`)) {
      return;
    }
    customList[index] = songData;
  } else {
    customList.push(songData);
  }

  localStorage.setItem("signquest_custom_exercises", JSON.stringify(customList));

  dom.modalSuccessMsg.innerText = `The level "${songData.title}" has been successfully exported. You can find it decorated with a green 'Custom' badge in the rhythm level directory drawer.`;
  dom.successModal.classList.add("active");
}

function importLevelJson() {
  const rawText = dom.importTextarea.value.trim();
  if (!rawText) {
    alert("JSON field is empty!");
    return;
  }

  try {
    let data = JSON.parse(rawText);
    
    if (Array.isArray(data) && data.length > 0) {
      data = data[0];
    }

    if (!data.id || !data.title || !data.notes || !Array.isArray(data.notes)) {
      alert("Invalid format. Exercise must contain 'id', 'title', and a 'notes' list.");
      return;
    }

    dom.songId.value = data.id;
    dom.songTitle.value = data.title;
    dom.songDesc.value = data.description || "Imported Custom Level";
    dom.songBpm.value = data.bpm || 80;
    dom.songBpmVal.innerText = String(data.bpm || 80);

    makerState.notes = data.notes.map(note => {
      return {
        beat: parseFloat(note.beat) || 4.0,
        note: String(note.note).toUpperCase(),
        octave: parseInt(note.octave) || 4,
        duration: parseFloat(note.duration) || 0.5
      };
    });

    makerState.notes.sort((a,b) => a.beat - b.beat);

    const lastNote = makerState.notes[makerState.notes.length - 1];
    const maxNoteBeat = lastNote ? lastNote.beat - 4 + lastNote.duration : 0;
    if (maxNoteBeat > 64) {
      dom.timelineLength.value = "128";
    } else if (maxNoteBeat > 32) {
      dom.timelineLength.value = "64";
    } else {
      dom.timelineLength.value = "32";
    }

    updateRuler();
    renderGrid();
    renderNotes();
    updateJsonOutput();

    dom.importModal.classList.remove("active");
  } catch (err) {
    alert(`JSON parsing failed: ${err.message}`);
  }
}

function downloadSongFile() {
  if (makerState.notes.length === 0) {
    alert("Timeline is empty! Add notes before saving.");
    return;
  }

  const songData = {
    id: dom.songId.value.trim() || "custom_level",
    title: dom.songTitle.value.trim() || "Custom Melody",
    description: dom.songDesc.value.trim() || "Custom Level",
    isTutorial: false,
    bpm: parseInt(dom.songBpm.value) || 80,
    notes: makerState.notes
  };

  const filename = `${songData.id}.json`;
  const jsonStr = JSON.stringify(songData, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  
  if (window.navigator && window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveOrOpenBlob(blob, filename);
  } else {
    const e = document.createElement("a");
    e.href = URL.createObjectURL(blob);
    e.download = filename;
    document.body.appendChild(e);
    e.click();
    document.body.removeChild(e);
  }
}

window.addEventListener("DOMContentLoaded", init);
