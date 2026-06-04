// --- SOLFEGE SIGN MUSIC TEMPLATES GENERATOR ---
import { getLetterTemplate } from "./templates.js";

// Notes in solfege
const MUSIC_NOTES = ["DO", "RE", "MI", "FA", "SOL", "LA", "TI"];

// Base rotation configurations for default solfege signs
// DO = Fist (ASL 'S')
// RE = Angled Flat Hand (ASL 'B' rotated -35 deg)
// MI = Horizontal Flat Hand (ASL 'B' rotated -75 deg)
// FA = Thumbs Down (ASL 'A' rotated 160 deg)
// SOL = Vertical Flat Hand (ASL 'B' rotated 0 deg)
// LA = Curved Down Hand (ASL 'C' rotated 150 deg)
// TI = Pointing Hand (ASL 'D' rotated -20 deg)
const DEFAULT_TEMPLATES_CONFIG = {
  DO: { baseLetter: "S", rotationDeg: 0 },
  RE: { baseLetter: "B", rotationDeg: -35 },
  MI: { baseLetter: "B", rotationDeg: -75 },
  FA: { baseLetter: "A", rotationDeg: 160 },
  SOL: { baseLetter: "B", rotationDeg: 0 },
  LA: { baseLetter: "C", rotationDeg: 150 },
  TI: { baseLetter: "D", rotationDeg: -20 }
};

let customMusicTemplates = {};
let fileMusicTemplates = {};

// Load calibrated templates from the exported JSON file
export async function initMusicTemplates() {
  try {
    const response = await fetch("./music_calibrated_templates.json");
    if (response.ok) {
      fileMusicTemplates = await response.json();
      console.log("Successfully loaded calibrated templates from music_calibrated_templates.json");
      return true;
    } else {
      console.warn("Could not load music_calibrated_templates.json, status:", response.status);
    }
  } catch (e) {
    console.error("Failed to fetch music_calibrated_templates.json:", e);
  }
  return false;
}

// Load custom templates from localStorage
export function loadCustomMusicTemplates() {
  const saved = localStorage.getItem("signquest_custom_music_templates");
  if (saved) {
    try {
      customMusicTemplates = JSON.parse(saved);
      console.log("Successfully loaded custom music templates from localStorage.");
    } catch (e) {
      console.error("Error parsing custom music templates:", e);
      customMusicTemplates = {};
    }
  }
}

// Initial load
loadCustomMusicTemplates();

/**
 * Rotates a 3D hand landmark template around its wrist (landmark 0) in the Z-axis (screen plane).
 */
function rotateTemplateZ(template, angleDegrees) {
  if (!template || template.length < 21) return template;
  
  const angleRad = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  
  const wrist = template[0]; // Anchor point (usually 0.5, 0.85)
  
  return template.map(pt => {
    const dx = pt.x - wrist.x;
    const dy = pt.y - wrist.y;
    return {
      x: wrist.x + dx * cos - dy * sin,
      y: wrist.y + dx * sin + dy * cos,
      z: pt.z
    };
  });
}

/**
 * Retrieves a list of 21-point templates for a given solfege note.
 * Returns an array containing up to 5 template variations.
 * @param {string} noteName - "DO", "RE", "MI", "FA", "SOL", "LA", "TI".
 * @returns {Array} Array of templates (each is a 21-landmark array).
 */
export function getMusicTemplatesList(noteName) {
  const normalizedKey = noteName.toUpperCase();
  let templates = [];
  
  // 1. Check custom user calibration first (from localStorage)
  if (customMusicTemplates[normalizedKey]) {
    const val = customMusicTemplates[normalizedKey];
    if (Array.isArray(val)) {
      if (val.length > 0 && Array.isArray(val[0])) {
        templates = templates.concat(val);
      } else if (val.length === 21) {
        templates.push(val);
      }
    }
  }
  
  // 2. Check loaded file calibrated templates (from music_calibrated_templates.json)
  if (fileMusicTemplates[normalizedKey]) {
    const val = fileMusicTemplates[normalizedKey];
    if (Array.isArray(val)) {
      if (val.length > 0 && Array.isArray(val[0])) {
        val.forEach(t => {
          if (templates.length < 10) templates.push(t);
        });
      } else if (val.length === 21) {
        if (templates.length < 10) templates.push(val);
      }
    }
  }
  
  // 3. Fallback to procedural rotated ASL templates
  if (templates.length === 0) {
    const config = DEFAULT_TEMPLATES_CONFIG[normalizedKey];
    if (config) {
      const baseTemplate = getLetterTemplate(config.baseLetter);
      if (baseTemplate) {
        templates.push(rotateTemplateZ(baseTemplate, config.rotationDeg));
      }
    }
  }
  
  // Return deep copy
  return JSON.parse(JSON.stringify(templates));
}

/**
 * Retrieves the primary 21-point template for a given solfege note (for visual blueprints).
 */
export function getMusicTemplate(noteName) {
  const list = getMusicTemplatesList(noteName);
  return list.length > 0 ? list[0] : null;
}

/**
 * Calibrates and saves a custom template for a solfege note shape.
 * Stores up to 5 templates per note, functioning as a circular calibration buffer.
 * @returns {number} The current number of saved templates for this note (1 to 5).
 */
export function saveCustomMusicTemplate(noteName, landmarks, handedness) {
  if (!landmarks || landmarks.length < 21) return 0;
  
  const normalizedKey = noteName.toUpperCase();
  if (!MUSIC_NOTES.includes(normalizedKey)) return 0;
  
  const userWrist = landmarks[0];
  const dx = landmarks[9].x - userWrist.x;
  const dy = landmarks[9].y - userWrist.y;
  const dz = landmarks[9].z - userWrist.z;
  const userScale = Math.sqrt(dx*dx + dy*dy + dz*dz);
  
  if (userScale === 0) return 0;
  
  const targetScale = 0.25; // standard template scale
  const scaleRatio = targetScale / userScale;
  
  // Normalize coordinates relative to wrist centered at (0.5, 0.85)
  const normalized = landmarks.map(lm => {
    let lx = lm.x;
    if (handedness === "Left") {
      lx = userWrist.x - (lm.x - userWrist.x);
    }
    return {
      x: 0.5 + (lx - userWrist.x) * scaleRatio,
      y: 0.85 + (lm.y - userWrist.y) * scaleRatio,
      z: (lm.z - userWrist.z) * scaleRatio
    };
  });
  
  // Retrieve existing custom templates list
  let currentList = [];
  if (customMusicTemplates[normalizedKey]) {
    const val = customMusicTemplates[normalizedKey];
    if (Array.isArray(val)) {
      if (val.length > 0 && Array.isArray(val[0])) {
        currentList = val;
      } else if (val.length === 21) {
        currentList = [val];
      }
    }
  }

  // Push new template (up to 10 slots, circular buffer)
  currentList.push(normalized);
  if (currentList.length > 10) {
    currentList.shift(); // remove oldest
  }
  
  customMusicTemplates[normalizedKey] = currentList;
  localStorage.setItem("signquest_custom_music_templates", JSON.stringify(customMusicTemplates));
  return currentList.length;
}

/**
 * Resets all custom music templates.
 */
export function resetCustomMusicTemplates() {
  customMusicTemplates = {};
  localStorage.removeItem("signquest_custom_music_templates");
}

/**
 * Exports custom music templates as a JSON file.
 */
export function exportCustomMusicTemplates() {
  const merged = {};
  MUSIC_NOTES.forEach(note => {
    merged[note] = getMusicTemplatesList(note);
  });
  
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(merged, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "music_calibrated_templates.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
