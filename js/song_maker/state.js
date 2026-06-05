export const makerState = {
  notes: [], // Array of { beat, note, octave, duration }
  isPlayingPreview: false,
  previewStartTime: 0,
  previewBpm: 80,
  previewAnimationId: null,
  activePlayingNoteObj: null,
  
  // Selection & Clipboard
  selectedNotes: [], // Array of note references
  clipboardNotes: [], // Array of { offsetBeat, note, octave, duration }
  lastHoveredBeat: 0,
  currentPlayheadBeat: 0
};
