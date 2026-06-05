import { dom } from "./dom.js";
import { makerState } from "./state.js";
import { PIXELS_PER_BEAT, ROW_HEIGHT, NOTE_ORDER } from "./constants.js";
import { NOTE_DETAILS, getFrequency } from "../rhythm/constants.js";
import { playNote, releaseNote } from "../synth.js";

export function generateLabels() {
  dom.pianoRollLabels.innerHTML = "";
  for (let rowIndex = 0; rowIndex < 21; rowIndex++) {
    const octave = 5 - Math.floor(rowIndex / 7);
    const noteName = NOTE_ORDER[rowIndex % 7];
    const detail = NOTE_DETAILS[noteName] || { color: "#ffffff", label: noteName };
    
    const labelCell = document.createElement("div");
    labelCell.className = "piano-label-cell";
    labelCell.style.color = detail.color;
    labelCell.style.borderBottomColor = "rgba(255, 255, 255, 0.06)";
    labelCell.innerHTML = `<span style="font-family: 'Outfit'; font-weight: 800;">${detail.label}</span><span style="font-family: monospace; font-size: 0.65rem; opacity: 0.6; margin-left: 4px;">C${octave}</span>`;
    dom.pianoRollLabels.appendChild(labelCell);
  }
}

export function updateRuler() {
  const length = parseInt(dom.timelineLength.value);
  dom.rulerBeatsTimeline.innerHTML = "";
  
  const totalWidth = length * PIXELS_PER_BEAT;
  dom.rulerBeatsTimeline.style.width = `${totalWidth}px`;
  dom.pianoRollTracks.style.width = `${totalWidth}px`;
  dom.pianoRollGrid.style.width = `${80 + totalWidth}px`;

  for (let i = 1; i <= length; i++) {
    const mark = document.createElement("div");
    mark.className = "ruler-beat-mark";
    mark.style.left = `${(i - 1) * PIXELS_PER_BEAT}px`;
    mark.style.width = `${PIXELS_PER_BEAT}px`;
    mark.innerText = String(i);
    dom.rulerBeatsTimeline.appendChild(mark);
  }
}

export function renderGrid() {
  const snap = parseFloat(dom.snapResolution.value);
  const snapWidth = snap * PIXELS_PER_BEAT;
  dom.pianoRollTracks.style.backgroundSize = `100% ${ROW_HEIGHT}px, ${snapWidth}px 100%`;
}

export function handleTimelineClick(e) {
  if (e.target.classList.contains("note-capsule") || e.target.parentNode.classList.contains("note-capsule")) {
    return;
  }

  const rect = dom.pianoRollTracks.getBoundingClientRect();
  const startX = e.clientX - rect.left;
  const startY = e.clientY - rect.top;

  let isDragging = false;
  let selectionBox = null;

  const onMouseMove = (moveEvent) => {
    const currentX = moveEvent.clientX - rect.left;
    const currentY = moveEvent.clientY - rect.top;

    const dx = currentX - startX;
    const dy = currentY - startY;

    // Start drawing lasso selection box if moved more than 5 pixels
    if (!isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      isDragging = true;
      makerState.selectedNotes = [];
      renderNotes();

      selectionBox = document.createElement("div");
      selectionBox.id = "selection-overlay";
      selectionBox.style.position = "absolute";
      selectionBox.style.border = "1.5px dashed #ffffff";
      selectionBox.style.background = "rgba(99, 102, 241, 0.25)";
      selectionBox.style.pointerEvents = "none";
      selectionBox.style.zIndex = "100";
      dom.pianoRollTracks.appendChild(selectionBox);
    }

    if (isDragging && selectionBox) {
      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      const w = Math.abs(dx);
      const h = Math.abs(dy);

      selectionBox.style.left = `${x}px`;
      selectionBox.style.top = `${y}px`;
      selectionBox.style.width = `${w}px`;
      selectionBox.style.height = `${h}px`;

      // Select notes overlapping with selection box bounds
      const selected = [];
      makerState.notes.forEach((note) => {
        const renderBeat = note.beat - 4;
        const noteIndex = NOTE_ORDER.indexOf(note.note);
        const octaveOffset = (5 - note.octave) * 7;
        const rowIndex = octaveOffset + noteIndex;

        const noteLeft = renderBeat * PIXELS_PER_BEAT;
        const noteWidth = note.duration * PIXELS_PER_BEAT;
        const noteTop = rowIndex * ROW_HEIGHT + 6;
        const noteHeight = 33;

        const xOverlap = noteLeft < x + w && noteLeft + noteWidth > x;
        const yOverlap = noteTop < y + h && noteTop + noteHeight > y;

        if (xOverlap && yOverlap) {
          selected.push(note);
        }
      });

      makerState.selectedNotes = selected;

      // Update .selected class in real time on note elements
      const capsules = dom.pianoRollTracks.querySelectorAll(".note-capsule");
      capsules.forEach((capsule, index) => {
        const note = makerState.notes[index];
        if (note && selected.includes(note)) {
          capsule.classList.add("selected");
        } else {
          capsule.classList.remove("selected");
        }
      });
    }
  };

  const onMouseUp = () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);

    if (selectionBox) {
      selectionBox.remove();
    }

    if (!isDragging) {
      // Single click - toggle place/remove note
      const beat = startX / PIXELS_PER_BEAT;
      const snap = parseFloat(dom.snapResolution.value);
      const snappedBeat = Math.round(beat / snap) * snap;
      const actualBeat = Math.max(0, snappedBeat);
      
      const rowIndex = Math.floor(startY / ROW_HEIGHT);
      if (rowIndex < 0 || rowIndex >= 21) return;

      const octave = 5 - Math.floor(rowIndex / 7);
      const noteName = NOTE_ORDER[rowIndex % 7];
      const duration = parseFloat(dom.activeDuration.value);

      const targetBeat = actualBeat + 4;

      const existingIndex = makerState.notes.findIndex(n => 
        Math.abs(n.beat - targetBeat) < 0.05 && 
        n.note === noteName && 
        n.octave === octave
      );
      
      if (existingIndex >= 0) {
        makerState.notes.splice(existingIndex, 1);
        makerState.selectedNotes = makerState.selectedNotes.filter(n => n !== makerState.notes[existingIndex]);
      } else {
        makerState.notes.push({
          beat: targetBeat,
          note: noteName,
          octave: octave,
          duration: duration
        });
        
        const freq = getFrequency(noteName, octave);
        playNote(freq, noteName, octave);
        setTimeout(releaseNote, 150);
      }

      makerState.notes.sort((a, b) => a.beat - b.beat);
      renderNotes();
      updateJsonOutput();
    }
  };

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
}

export function renderNotes() {
  const oldCapsules = dom.pianoRollTracks.querySelectorAll(".note-capsule");
  oldCapsules.forEach(c => c.remove());

  dom.timelineTotalNotes.innerText = `Notes: ${makerState.notes.length}`;

  makerState.notes.forEach((note, index) => {
    const renderBeat = note.beat - 4;
    if (renderBeat < 0) return;

    const left = renderBeat * PIXELS_PER_BEAT;
    const width = note.duration * PIXELS_PER_BEAT;
    
    const noteIndex = NOTE_ORDER.indexOf(note.note);
    const octaveOffset = (5 - note.octave) * 7;
    const rowIndex = octaveOffset + noteIndex;
    const top = rowIndex * ROW_HEIGHT + 6;

    const detail = NOTE_DETAILS[note.note] || { color: "#ffffff", label: note.note };

    const capsule = document.createElement("div");
    capsule.className = "note-capsule";
    if (makerState.selectedNotes.includes(note)) {
      capsule.classList.add("selected");
    }
    capsule.style.left = `${left}px`;
    capsule.style.width = `${width}px`;
    capsule.style.top = `${top}px`;
    capsule.style.backgroundColor = detail.color;
    capsule.style.borderColor = "rgba(255,255,255,0.2)";
    capsule.style.borderStyle = "solid";
    capsule.style.borderWidth = "1px";
    capsule.style.color = "#ffffff";
    capsule.style.boxShadow = `inset 0 0 10px rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.5)`;
    
    capsule.innerHTML = `<span style="font-family: 'Outfit'; font-weight: 800;">${detail.label}</span><span style="font-family: monospace; opacity: 0.8; font-size: 0.65rem; margin-left: 2px;">C${note.octave}</span>`;

    // Create drag-to-resize handle on the right side of the note
    const resizeHandle = document.createElement("div");
    resizeHandle.className = "resize-handle";
    resizeHandle.style.position = "absolute";
    resizeHandle.style.right = "0";
    resizeHandle.style.top = "0";
    resizeHandle.style.bottom = "0";
    resizeHandle.style.width = "10px";
    resizeHandle.style.cursor = "ew-resize";
    resizeHandle.style.backgroundColor = "rgba(0, 0, 0, 0.15)";
    resizeHandle.title = "Drag to adjust note length";
    capsule.appendChild(resizeHandle);

    resizeHandle.addEventListener("mousedown", (e) => {
      e.stopPropagation(); // Stop note deletion triggers
      e.preventDefault();
      
      const startX = e.clientX;
      const startDuration = note.duration;
      const snap = parseFloat(dom.snapResolution.value);
      
      const freq = getFrequency(note.note, note.octave);
      playNote(freq, note.note, note.octave);
      
      const onMouseMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaBeats = deltaX / PIXELS_PER_BEAT;
        let newDuration = startDuration + deltaBeats;
        
        newDuration = Math.max(snap, Math.round(newDuration / snap) * snap);
        note.duration = Number(newDuration.toFixed(2));
        
        capsule.style.width = `${newDuration * PIXELS_PER_BEAT}px`;
        updateJsonOutput();
      };
      
      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        releaseNote();
        renderNotes();
        updateJsonOutput();
      };
      
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });

    capsule.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      const freq = getFrequency(note.note, note.octave);
      playNote(freq, note.note, note.octave);
      setTimeout(releaseNote, 150);

      makerState.notes.splice(index, 1);
      renderNotes();
      updateJsonOutput();
    });

    dom.pianoRollTracks.appendChild(capsule);
  });
}

export function updateJsonOutput() {
  const songData = {
    id: dom.songId.value.trim() || "custom_level",
    title: dom.songTitle.value.trim() || "Custom Melody",
    description: dom.songDesc.value.trim() || "Custom Level",
    isTutorial: false,
    bpm: parseInt(dom.songBpm.value) || 80,
    notes: makerState.notes
  };

  dom.jsonTextarea.value = JSON.stringify(songData, null, 2);
}
