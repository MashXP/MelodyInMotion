# Changelog

All notable changes to the SignQuest Sandbox project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-06-05

### Added — SignMusic Rhythm Challenge (`music_game.html`)

**Core Game Engine** (`js/rhythm/`)
- **New Game Mode Page**: Created `music_game.html` as a dedicated Solfège Rhythm Challenge, wiring together MediaPipe hand tracking, a Web Audio synth, a timeline canvas renderer, and a full HUD overlay system.
- **Modular Architecture**: Separated game logic into dedicated ES modules — `main.js`, `state.js`, `dom.js`, `ui.js`, `game_modes.js`, `renderer.js`, `camera.js`, `constants.js`.
- **Practice Mode**: Step-by-step note advance; playback pauses until the player shows the correct sign, removing time pressure for learners.
- **Challenge Mode**: Full real-time BPM-locked rhythm scoring with animated countdown (shows both-hands-visible gate before starting), combo multipliers, per-note accuracy ratings (Perfect / Good / Okay / Miss), and a rank system (S / A / B / C).
- **Tutorial Mode**: Dedicated `isTutorial` exercise type with scrolling timeline, hold-duration progress bar, per-note instruction text, and auto-advance on successful sign hold.
- **Song Maker Integration**: Loads custom exercises exported from the Song Maker via `localStorage` (`signquest_custom_exercises`), applying BPM scaling automatically.
- **4 Built-in Levels**: `music_exercises.json` ships with Tutorial: Solfège Basics, Level 1: Do-Re-Mi Ascent & Descent, Level 2: Twinkle Twinkle Little Star, Level 3: Mary Had a Little Lamb.

**UI / HUD**
- **Floating HUD Overlays**: Score, Rank, Combo, Accuracy, hit-ratio panels anchored inside the camera view; level title and BPM in the top-left; Octave and Sign detection readouts bottom-left / bottom-right.
- **Sliding Drawers**: Level Directory (slides from left) and Audio & Input Settings (slides from right), toggled via header buttons, with smooth cubic-bezier transitions.
- **Retractable Controls Dock**: Start / Stop / Fullscreen buttons in a bottom-center pull-up dock that hides completely during gameplay via CSS opacity + transform animation; toggle tab styled with a cyan accent top-border and glow shadow. Expanded position flush against the track container; minimized state collapses buttons invisibly.
- **Results Overlay**: Post-level modal showing rank badge, final score, max combo, accuracy, and hits/total ratio — dynamically switches layout for tutorial vs. regular levels.
- **Countdown Overlay**: Fullscreen blurred countdown (3-2-1) before Challenge mode levels.
- **Practice Pause Alert**: Inline banner shown when practice mode is waiting for the player to match the current sign.

**Gameplay Features**
- **Click-drag Note Resize**: Notes in the timeline can be right-edge dragged to adjust duration; a resize cursor appears on hover.
- **Click-drag Selection & Copy**: Multi-note selection by click-dragging in the Song Maker canvas; selected notes can be copied.
- **Playback Head**: Draggable and scrollable playback head in the Song Maker.
- **Note Sound-on-Place**: Notes play the corresponding synth tone when added to the timeline.
- **Note Labels**: Lane labels render on the left edge of the track canvas.
- **Horizontal Overflow Scroll**: Track canvas scrolls horizontally without collapsing the full grid into the viewport width.

**Tutorial Skip & Proceed Flow**
- **Skip Tutorial Button**: Styled skip button in the tutorial overlay; clicking invokes `finishLevel(true)` instead of silently stopping.
- **Post-Tutorial Screen**: After completing or skipping the tutorial, a custom results screen hides rank/stats and shows a contextual message ("Are you ready to proceed to Level 1?") with a **Proceed ➡️** button.
- **Proceed to Next Level**: After any level completes, a **Proceed to Level N ➡️** button appears and automatically loads and starts the next exercise.

**Persistence**
- **Selected Level State**: `selectExercise()` now saves the active exercise ID to `localStorage` (`signquest_current_exercise_id`); restored automatically on page reload.
- **Volume, Camera, Skeleton, Sound, Handedness**: All user settings persisted to `localStorage` and rehydrated on init.

**Custom Level Import**
- **Drag-and-Drop / File Upload Zone**: "Import Custom Level" section at the bottom of the Level Directory drawer; accepts `.json` files via drag-and-drop or click-to-browse.
- **Validation**: Checks for `id`, `title`, and `notes[]` fields; shows inline error feedback on invalid files.
- **Merge / Dedup**: Imported levels merge with existing custom list — same `id` updates in place, new ones are appended.
- **Live Refresh**: Song list and in-memory exercise array refresh immediately after import without a page reload.
- **Clear All Custom Levels**: One-click button wipes `localStorage` and removes custom entries from the live list.

**Styling & Design**
- **Premium DAW Aesthetic**: Dark glassmorphism cards, `rgba` backgrounds, `backdrop-filter: blur`, neon cyan accent borders and glow shadows throughout.
- **Retractable Dock Polished**: Rounded `14px` top corners on the tab, fully rounded `16px` controls row capsule, smooth opacity+transform hide animation, per-button hover glows (indigo for Start, red for Stop, subtle white for Fullscreen).
- **Tutorial Skip Button**: Replaced stretched `control-btn` with a compact `#btn-skip-tutorial` style featuring a soft red hover state (`rgba(239,68,68,0.15)`).
- **Drawer Close Buttons**: Replaced stretching `.control-btn` (flex: 1) with `.drawer-close-btn` (flex: none) on Level Directory and Settings close buttons; hover lifts with white tint.
- **Drop Zone**: Dashed cyan border drop zone with glow ring on hover/drag-over, scale micro-animation, and color-coded success/error feedback banner.

### Changed

- **`index.html` & `music.html`**: Minor layout and navigation link fixes (tracked in `git diff`).
- **`style.css`**: Supplementary global style tweaks.
- **BPM Scaling**: All exercises loaded from JSON (including customs) have BPM rounded to 75% for improved playability.

---

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