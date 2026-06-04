# 🤟 SignQuest Sandbox

SignQuest Sandbox is a modern, interactive, and inclusive web application designed to teach and practice American Sign Language (ASL) fingerspelling and Solfège-based musical performance in real time.

It uses **MediaPipe Tasks Vision** for high-fidelity hand tracking, features a custom **3D Nearest-Neighbor template-matching classifier** for custom shape calibration, and integrates a **Web Audio API Synthesizer** for expressive sound generation.

---

## 🌟 Key Features

### 1. 🤟 ASL Fingerspelling Sandbox
* **3D Nearest-Neighbor Recognition:** Real-time 3D coordinate normalization and Euclidean distance calculations matching your hand pose against all target letters.
* **Custom Hand Calibration:** Instantly register your own hand shapes to the recognition engine using the **"Calibrate Shape"** utility.
* **Translucent Guide Blueprints:** A dashed, translucent ghost skeleton overlay warped to your hand showing you exactly how to bend your fingers.

### 2. 🎵 SignMusic Studio
* **Solfège Sign Synthesis:** Play musical notes (**Do, Re, Mi, Fa, Sol, La, Ti**) in real time using Solfège hand signs.
* **Pitch & Octave Hand Control:** Use your secondary hand to set the active octave (**C2 to C6**) via finger-counting (1 to 5 extended fingers). Mutes automatically when the octave hand is closed (0 fingers) with a fast 2-frame response.
* **10-Slot Automated Calibration:** Initiate a 3-second countdown followed by 10 consecutive captures (1 per second) to easily train the classifier on diverse angles and motion profiles for each note.
* **Left-Handed Mode:** A setting to swap hand roles, allowing left-handed users to play notes with their left hand and control octaves with their right hand.
* **Persistent Settings:** Your volume level, active waveform (Triangle, Sine, Sawtooth, Square), delay/vibrato toggle states, camera/skeleton visibility, and Left-Handed Mode preferences are saved automatically to `localStorage` and persist across page reloads.

---

## 📁 Project Structure

```text
/home/mashxp/Projects/SignQuest/
├── index.html            # ASL Fingerspelling Sandbox HTML interface
├── music.html            # SignMusic Studio HTML interface
├── style.css             # Main stylesheet importing modular components
├── app.js                # App entry for ASL Fingerspelling
├── music_app.js          # App entry for SignMusic Studio
├── js/
│   ├── classifier.js     # ASL 3D Nearest-Neighbor gesture classifier
│   ├── drawing.js        # Multi-color skeleton and ghost blueprint drawing utils
│   ├── templates.js      # Procedural ASL templates and calibration database
│   ├── music.js          # SignMusic coordinator, calibration & UI logic
│   ├── music_classifier.js# Solfège gesture classifier
│   ├── music_templates.js# Solfège templates and custom calibration slots
│   └── synth.js          # Web Audio synthesizer with portamento & LFO effects
└── styles/
    ├── base.css          # Core CSS variables, resets, and animations
    ├── layout.css        # Main page structures, containers, header/footer
    ├── viewport.css      # Webcam window, loading overlays, and device buttons
    ├── hud.css           # Glass cards, letter grid, and challenge controls
    └── music.css         # Styling for music keyboard and indicators
```

---

## 🚀 Getting Started (How to Run Locally)

To run the application, serve the directory using a local HTTP server.

### Option A: Using Python (Built-in)
If you have Python installed, run this command in your terminal:
```bash
python3 -m http.server 8000 --directory ./
```
* **ASL Sandbox:** Navigate to 👉 **`http://localhost:8000`**
* **Music Studio:** Navigate to 👉 **`http://localhost:8000/music.html`**

### Option B: Using Node (npx)
If you prefer Node.js, run:
```bash
npx http-server ./ -p 8000
```
* **ASL Sandbox:** Navigate to 👉 **`http://localhost:8000`**
* **Music Studio:** Navigate to 👉 **`http://localhost:8000/music.html`**

---

## 🎮 How to Play & Calibrate

### ASL Fingerspelling Sandbox
1. Select a target letter from the game grid.
2. Hold your hand in front of the camera and match the translucent ghost guide.
3. **Calibrate:** Make your natural shape and click **"Calibrate Shape"** to customize the template for your hand.

### SignMusic Studio
1. Show Solfège signs with your **Note hand** (default Right) to trigger notes.
2. Control octave (**C2 - C6**) using extended finger counts (1 - 5) on your **Octave hand** (default Left). Closing your hand (0 fingers) stops the note immediately.
3. **Automated Calibration:** Select a target note, click **📸 Calibrate Note**, wait for the 3-second countdown, and hold/rotate your hand as the studio captures 10 consecutive shapes at 1-second intervals.
