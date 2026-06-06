export const HIT_ZONE_X = 120;
export const BEAT_WIDTH = 220; // pixels per beat
export const NOTE_RADIUS = 30;
export const TUTORIAL_REQUIRED_HOLD = 1.5; // seconds
export const LOSS_THRESHOLD = 8; // frames
export const OCTAVE_LOSS_GRACE_PERIOD = 1.5; // seconds grace buffer
export const LEFT_FINGERS_DEBOUNCE_THRESHOLD = 6;
export const NOTE_DEBOUNCE_THRESHOLD = 4;

export const NOTE_DETAILS = {
  DO: { label: "Do", key: "C", color: "#f43f5e", emoji: "✊" },
  RE: { label: "Re", key: "D", color: "#fb923c", emoji: "🤚" },
  MI: { label: "Mi", key: "E", color: "#f59e0b", emoji: "✋" },
  FA: { label: "Fa", key: "F", color: "#10b981", emoji: "👎" },
  SOL: { label: "Sol", key: "G", color: "#06b6d4", emoji: "👋" },
  LA: { label: "La", key: "A", color: "#6366f1", emoji: "🖐️" },
  TI: { label: "Ti", key: "B", color: "#8b5cf6", emoji: "☝️" }
};

export const NOTE_SEMITONES = { DO: 0, RE: 2, MI: 4, FA: 5, SOL: 7, LA: 9, TI: 11 };

export function getFrequency(noteName, octave) {
  const semitone = NOTE_SEMITONES[noteName];
  if (semitone === undefined) return 0;
  const midi = 12 * (octave + 1) + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}
