# 🤟 SignQuest Sandbox

SignQuest Sandbox is a modern, interactive, and inclusive web application designed to teach and practice American Sign Language (ASL) fingerspelling and Solfège-based musical performance in real time.

It uses **MediaPipe Tasks Vision** for high-fidelity hand tracking, a custom **3D Nearest-Neighbor template-matching classifier** for hand shape calibration, a **Web Audio API Synthesizer** for expressive sound generation, and a full **Rhythm Challenge game engine** for structured music learning.

---

## 🌟 Key Features

### 1. 🤟 ASL Fingerspelling Sandbox (`index.html`)
- **3D Nearest-Neighbor Recognition:** Real-time 3D coordinate normalization and Euclidean distance matching against all target letters.
- **Custom Hand Calibration:** Instantly register your own hand shapes using the **"Calibrate Shape"** utility.
- **Translucent Guide Blueprints:** A dashed ghost skeleton overlay warped to your hand showing exactly how to bend your fingers.
- **Export / Reset Config:** Download your custom templates as `asl_calibrated_templates.json` and reload them anytime.

### 2. 🎵 SignMusic Studio (`music.html`)
- **Solfège Sign Synthesis:** Play musical notes (**Do, Re, Mi, Fa, Sol, La, Ti**) in real time using Solfège hand signs.
- **Pitch & Octave Hand Control:** Use your secondary hand to set the active octave (**C2–C6**) via finger-counting. Mutes automatically when the octave hand is closed.
- **10-Slot Automated Calibration:** 3-second countdown then 10 consecutive 1-per-second captures to train the classifier across diverse angles and motion profiles.
- **Left-Handed Mode:** Swap hand roles so left-handed players sign notes with the left hand and control octaves with the right.
- **Web Audio Synth:** Customizable waveforms (Triangle, Sine, Sawtooth, Square), LFO vibrato, and feedback delay.
- **Persistent Settings:** Volume, waveform, delay/vibrato, camera/skeleton visibility, and handedness all persist across page reloads via `localStorage`.

### 3. 🎮 SignMusic Rhythm Challenge (`music_game.html`)
A full rhythm game built on the Solfège sign system:

- **Three Game Modes:**
  - **Tutorial** – Scrolling timeline with per-note hold instructions; auto-advances on successful sign hold with a progress bar.
  - **Practice** – Step-by-step note advance; pauses until the correct sign is shown. No time pressure.
  - **Challenge** – Real-time BPM-locked scoring with a both-hands-visible gate countdown, combo multipliers, per-note accuracy ratings (Perfect / Good / Okay / Miss), and a rank system (S / A / B / C).
- **Interactive Visual Guide Panel:** Real-time visual guide panel displaying the target ASL handsign image (`public/handsign/${detail.label}.png`) for the active note to assist learners.
- **Rendering Performance Caching:** caches staff lines and treble clefs onto an offscreen canvas (`_staticCanvas`) to avoid frame redraw lag, and debounces HUD DOM updates.
- **Automatic Camera Start:** Level playback triggers automatically as soon as the note hand is detected by the webcam.
- **Dynamic Particle Bursts:** Spawns color-coded hit particle explosions (`spawnHitBurst`) at the timeline hit-zone on successful note impacts.
- **4 Built-in Levels:** Tutorial: Solfège Basics, Level 1: Do-Re-Mi Ascent & Descent, Level 2: Twinkle Twinkle Little Star, Level 3: Mary Had a Little Lamb.
- **Song Maker Integration:** Create your own levels in the Song Maker and play them instantly in the Rhythm Challenge.
- **Custom Level Import:** Drag-and-drop or browse to upload a level JSON file directly into the Level Directory drawer — no reload required.
- **Persistent State:** Your selected level and all settings are restored automatically on page reload.
- **Post-Level Results:** Rank badge, score, combo, accuracy, hits/total, and a **Proceed to Next Level** button.
- **Tutorial Skip Flow:** Skip the tutorial at any time; a dedicated completion/skip screen guides you to Level 1.

### 4. 🛠️ Song Maker (`song_maker.html`)
- **Piano-Roll Style Editor:** Click to place and resize notes on a multi-lane timeline canvas.
- **Click-drag Resize:** Drag the right edge of any note to change its duration.
- **Click-drag Selection & Copy:** Click-drag a selection box to select multiple notes; copy and paste.
- **Note Sound-on-Place:** Notes play their synth tone when added.
- **Playback Head:** Drag or scroll the playback head to scrub through the composition.
- **Horizontal Overflow Scroll:** The canvas scrolls horizontally independently of the viewport.
- **Export to JSON:** Export your song as a level JSON importable into the Rhythm Challenge.

---

## 📁 Project Structure

```text
SignQuest/
├── index.html              # ASL Fingerspelling Sandbox
├── intro.html              # Home/Welcome page
├── level-select.html       # Level Selection Screen
├── music.html              # SignMusic Studio
├── music_game.html         # SignMusic Rhythm Challenge
├── song_maker.html         # Song Maker / Level Editor
├── music_exercises.json    # Built-in rhythm level database
├── style.css               # Global stylesheet (imports modular CSS)
├── js/
│   ├── classifier.js       # ASL 3D Nearest-Neighbor gesture classifier
│   ├── drawing.js          # Skeleton & ghost blueprint drawing utilities
│   ├── templates.js        # ASL template database & calibration storage
│   ├── music.js            # SignMusic Studio coordinator & UI logic
│   ├── music_classifier.js # Solfège gesture classifier
│   ├── music_templates.js  # Solfège templates & custom calibration slots
│   ├── synth.js            # Web Audio synth with portamento & LFO effects
│   ├── rhythm/             # Rhythm Challenge game engine (ES modules)
│   │   ├── main.js         # App entry: MediaPipe init, exercise loading
│   │   ├── state.js        # Central game state object
│   │   ├── dom.js          # DOM element cache & initDom()
│   │   ├── ui.js           # UI listeners, drawer logic, custom import
│   │   ├── game_modes.js   # startGame, stopGame, finishLevel, tutorial logic
│   │   ├── renderer.js     # Canvas lane drawing & track animation
│   │   ├── camera.js       # MediaPipe camera lifecycle & hand detection
│   │   └── constants.js    # Note definitions, frequencies, BPM constants
│   └── song_maker/         # Song Maker editor (ES modules)
│       ├── main.js         # Song Maker app entry
│       ├── state.js        # Editor state
│       ├── dom.js          # DOM cache
│       ├── editor.js       # Canvas draw, note placement, resize, selection
│       ├── preview.js      # Playback engine
│       └── constants.js    # Lane/grid constants
└── styles/
    ├── base.css            # CSS variables, resets, animations
    ├── layout.css          # Page structure, containers, header/footer
    ├── viewport.css        # Webcam window, overlays, control buttons
    ├── hud.css             # Glass cards, letter grid, challenge controls
    ├── music.css           # Music keyboard and indicators
    ├── music_game.css      # Rhythm Challenge HUD, drawers, dock, overlays
    └── song_maker.css      # Song Maker canvas, toolbar, DAW controls
```

---

## 🚀 Getting Started (Running Locally)

Serve the project directory with any static HTTP server.

### Option A — Python (built-in)
```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

### Option B — Node.js
```bash
npx http-server ./ -p 8000
```

| Page | URL |
|---|---|
| ASL Fingerspelling Sandbox | `http://localhost:8000` |
| SignMusic Studio | `http://localhost:8000/music.html` |
| **Rhythm Challenge** | **`http://localhost:8000/music_game.html`** |
| Song Maker | `http://localhost:8000/song_maker.html` |

> **Note:** MediaPipe models are loaded from CDN on first load. A network connection is required on initial startup.

---

## 🎮 How to Play

### ASL Fingerspelling Sandbox
1. Select a target letter from the game grid.
2. Hold your hand in front of the camera and match the ghost guide overlay.
3. Click **"Calibrate Shape"** to train your own hand profile for a letter.

### SignMusic Studio
1. Show Solfège signs with your **Note hand** (default: Right) to trigger notes.
2. Control the octave (**C2–C6**) with extended finger counts (1–5) on your **Octave hand** (default: Left). Closing the hand stops the note.
3. Click **📸 Calibrate Note**, wait for the countdown, and hold/rotate your hand while 10 captures are taken.

### Rhythm Challenge
1. Open the **Level Directory** (🎵 Level List button) and select an exercise.
2. Choose **Practice** or **Challenge** mode (the active gameplay mode indicator turns red).
3. Click **▶️ Start Level** — the controls dock pulls up from the bottom automatically during gameplay.
4. **Tutorial:** Follow the on-screen instruction and hold the sign until the progress bar fills.
5. **Practice:** Show the correct sign to advance the timeline — it pauses until you match.
6. **Challenge:** Match signs to the scrolling notes on the beat. Both hands must be visible to start.
7. Results are shown after the level completes with rank, score, and a **Proceed ➡️** button.

### Song Maker
1. Click on the canvas grid to place a note. Click the right edge and drag to resize.
2. Click-drag an empty area to draw a selection box; copy selected notes with the copy button.
3. Set BPM and use the playback head to preview.
4. Click **Export JSON** and import the file into the Rhythm Challenge via the **Import Custom Level** drop zone.

---

## 🛠️ Technical Stack

| Layer | Technology |
|---|---|
| Hand Tracking | [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) `@0.10.8` |
| Gesture Recognition | Custom 3D Nearest-Neighbor Classifier (Euclidean distance on normalized landmarks) |
| Audio Synthesis | Web Audio API — OscillatorNode, GainNode, DelayNode, LFO vibrato |
| Rendering | HTML5 Canvas 2D API |
| Persistence | `localStorage` |
| Architecture | Vanilla JS ES Modules (no build step, no framework) |
| Styling | Vanilla CSS with custom properties, glassmorphism, `backdrop-filter` |

---

## 📝 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the full version history.
