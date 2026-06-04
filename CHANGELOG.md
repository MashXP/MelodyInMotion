# Changelog

All notable changes to the SignQuest Sandbox project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-06-04

### Added
- **SignMusic Studio Page**: Created `music.html` and `music_app.js` to enable real-time music note playing via Solfège hand signs.
- **Octave Hand Control**: Integrated left-hand finger counting to set the active octave (**C2** to **C6**).
- **Web Audio Synth**: Added `synth.js` with customizable waveforms (Triangle, Sine, Sawtooth, Square), LFO-driven vibrato, and feedback delay.
- **10-Slot Automated Calibration**: Built a 10-slot automated template calibration sequence in [[js/music_templates.js#saveCustomMusicTemplate|music_templates.js]] and [[js/music.js|music.js]] featuring a 3-second countdown and 1-second interval captures.
- **Left-Handed Mode**: Added a layout checkbox in [[music.html|music.html]] to allow left-handed users to play notes on their left hand and control octaves on their right.
- **Settings Persistence**: Implemented `localStorage` persistence for synth settings (volume, wave, delay, vibrato) and UI toggles (camera, skeleton, mute, hand role).
- **Click to Play Note**: Added click/pointer handlers to keyboard cards and the HUD note-box to permit manual playback.

### Changed
- **Relaxed Hand Detection Thresholds**: Lowered finger ratio to `1.1` and thumb ratio to `0.8` in [[js/music.js#countExtendedFingers|music.js]] to support tilted hands and adducted thumb positions.

### Fixed
- **Portamento Stuttering**: Added a change-detection gate in [[js/music.js|music.js]] to prevent resetting oscillators or calling `playNote` every frame.
- **Persistent Notes**: Fixed note release transitions to call `releaseNote` exactly once per play cycle.
- **Octave Hand Mute Lag**: Implemented split debouncing for octave hand; mutes sound in 2 frames (on 0 fingers) while keeping a 6-frame threshold for octave level changes.

## [1.0.0] - 2026-06-03

### Added
- **ASL Fingerspelling Sandbox**: Created initial `index.html` and `app.js` for real-time fingerspelling practice.
- **3D Nearest-Neighbor Classifier**: Implemented a data-driven distance matcher in [[js/classifier.js|classifier.js]] using normalized 3D landmarks.
- **Fingerspelling Calibration**: Built custom hand shape calibration and template saving to `localStorage`.
- **Blueprints Guide**: Added translucent ghost overlays in [[js/drawing.js|drawing.js]] to guide users in forming ASL shapes.
- **Neon Skeletal Debugger**: Programmed a color-coded joints overlay.
- **Export/Reset Config**: Added functionality to download custom templates as `asl_calibrated_templates.json`.
- **System Controls**: Provided toggles for camera power, feed visibility, skeleton overlay, and game chimes.