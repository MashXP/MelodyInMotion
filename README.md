# 🤟 SignQuest Sandbox

SignQuest Sandbox is a modern, interactive, and inclusive web application designed to teach and practice American Sign Language (ASL) fingerspelling in real time. It uses **MediaPipe Tasks Vision** for hand tracking and features a custom **3D Nearest-Neighbor template-matching classifier** that allows users to calibrate and save their own hand shapes.

---

## 🌟 Key Features

* **3D Nearest-Neighbor Recognition:** We completely replaced hardcoded geometric rules with a data-driven nearest-neighbor algorithm. The app normalizes your hand coordinates and measures Euclidean distance against all templates in real time, making recognition highly accurate and hand-size agnostic.
* **Dynamic Hand Calibration:** Every hand is unique. Hold your hand in the target sign shape and click **"Calibrate Shape"** to instantly update the recognition engine with your personal hand landmarks.
* **Exportable Configurations:** Your custom shapes are saved automatically to `localStorage` and can be downloaded as a standard JSON file (`asl_calibrated_templates.json`) using the **"Export JSON"** utility.
* **Translucent Guide Blueprints:** Shows a dashed, translucent ghost skeleton overlay directly over your hand (or centered on the screen when no hand is detected), guiding your fingers exactly where to bend.
* **Multi-Color Debug Overlay:** Draws each finger in a distinct glowing neon color (Red for Thumb, Yellow for Index, Green for Middle, Cyan for Ring, Purple for Pinky) to easily inspect joint tracking.
* **Hardware & UX Toggles:**
  * **Stop/Start Camera:** Reclaims system resource and completely shuts off your webcam stream (and physical camera LED light).
  * **Mute Toggle:** Enable or disable Web Audio synthesized game chimes.
  * **Hide/Show skeleton overlays:** Toggle raw tracking line visibility.

---

## 📁 Project Structure

```text
/home/mashxp/Projects/Unnamed/
├── index.html            # Main HTML layout, HUD panels, and challenge cards
├── style.css             # Stylesheet entry point importing modular components
├── app.js                # App coordinator, webcam lifecycle, and prediction loops
├── js/
│   ├── classifier.js     # Data-driven 3D Nearest-Neighbor matching classifier
│   ├── drawing.js        # Multi-color skeleton and ghost guideline drawing utils
│   ├── templates.js      # Procedural ASL templates and calibration database
└── styles/
    ├── base.css          # Core CSS variables, resets, and animations
    ├── layout.css        # Main page structures, containers, header/footer
    ├── viewport.css      # Webcam window, loading overlays, and device buttons
    └── hud.css           # Glass cards, letter grid, and challenge controls
```

---

## 🚀 Getting Started (How to Run Locally)

To run the application, serve the directory using a local HTTP server.

### Option A: Using Python (Built-in)
If you have Python installed, run this command in your terminal:
```bash
python3 -m http.server 8000 --directory ./
```
Then open your web browser and navigate to:
👉 **`http://localhost:8000`**

### Option B: Using Node (npx)
If you prefer Node.js, run:
```bash
npx http-server ./ -p 8000
```
Then navigate to:
👉 **`http://localhost:8000`**

---

## 🎮 How to Play & Calibrate
1. Select a target letter from the **ASL Fingerspelling Game** grid.
2. Hold your hand in front of the camera. A translucent ghost guide will scale and overlay on your hand, showing you how to sign it.
3. Once your hand matches the guide, it will turn green on the dashboard.
4. **Custom Calibration:** If the default shape doesn't match your hand perfectly, make your natural shape and click **"Calibrate Shape"**. The guide will instantly warp to your hand, and the recognition engine will immediately use your custom shape for detection!
