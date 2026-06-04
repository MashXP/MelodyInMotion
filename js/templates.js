// --- ASL HAND LANDMARKS TEMPLATE GENERATOR ---

const BASE_MCPs = {
  wrist: { x: 0.50, y: 0.85, z: 0 },
  thumb: { x: 0.44, y: 0.80, z: 0.02 },
  index: { x: 0.45, y: 0.62, z: 0 },
  middle: { x: 0.50, y: 0.60, z: 0 },
  ring: { x: 0.55, y: 0.62, z: 0 },
  pinky: { x: 0.60, y: 0.65, z: 0 }
};

// Finger configurations for A-Y
const FINGER_STATES = {
  A: { thumb: "tucked-side", index: "folded", middle: "folded", ring: "folded", pinky: "folded" },
  B: { thumb: "tucked-front", index: "extended", middle: "extended", ring: "extended", pinky: "extended" },
  C: { thumb: "curved", index: "curved", middle: "curved", ring: "curved", pinky: "curved" },
  D: { thumb: "tucked-front", index: "extended", middle: "folded", ring: "folded", pinky: "folded" },
  E: { thumb: "tucked-front", index: "folded", middle: "folded", ring: "folded", pinky: "folded" },
  F: { thumb: "touching-index", index: "touching-thumb", middle: "extended", ring: "extended", pinky: "extended" },
  G: { thumb: "horizontal", index: "horizontal", middle: "folded", ring: "folded", pinky: "folded" },
  H: { thumb: "tucked-front", index: "horizontal", middle: "horizontal", ring: "folded", pinky: "folded" },
  I: { thumb: "tucked-front", index: "folded", middle: "folded", ring: "folded", pinky: "extended" },
  K: { thumb: "touching-index-pip", index: "extended", middle: "extended", ring: "folded", pinky: "folded" },
  L: { thumb: "side", index: "extended", middle: "folded", ring: "folded", pinky: "folded" },
  M: { thumb: "tucked-pink", index: "folded", middle: "folded", ring: "folded", pinky: "folded" },
  N: { thumb: "tucked-middle", index: "folded", middle: "folded", ring: "folded", pinky: "folded" },
  O: { thumb: "touching-index", index: "curved", middle: "curved", ring: "curved", pinky: "curved" },
  P: { thumb: "tucked-front", index: "downward", middle: "downward", ring: "folded", pinky: "folded" },
  Q: { thumb: "downward", index: "downward", middle: "folded", ring: "folded", pinky: "folded" },
  R: { thumb: "tucked-front", index: "crossed-index", middle: "crossed-middle", ring: "folded", pinky: "folded" },
  S: { thumb: "tucked-front", index: "folded", middle: "folded", ring: "folded", pinky: "folded" },
  T: { thumb: "under-index", index: "folded", middle: "folded", ring: "folded", pinky: "folded" },
  U: { thumb: "tucked-front", index: "extended-close", middle: "extended-close", ring: "folded", pinky: "folded" },
  V: { thumb: "tucked-front", index: "extended", middle: "extended", ring: "folded", pinky: "folded" },
  W: { thumb: "tucked-front", index: "extended", middle: "extended", ring: "extended", pinky: "folded" },
  X: { thumb: "tucked-front", index: "hooked", middle: "folded", ring: "folded", pinky: "folded" },
  Y: { thumb: "side", index: "folded", middle: "folded", ring: "folded", pinky: "extended" }
};

// --- CUSTOM TEMPLATE SYSTEM ---
let customTemplates = {};
let fileTemplates = {};

function loadCustomTemplates() {
  const saved = localStorage.getItem("signquest_custom_templates");
  if (saved) {
    try {
      customTemplates = JSON.parse(saved);
    } catch (e) {
      console.error("Error parsing custom templates:", e);
      customTemplates = {};
    }
  }
}
loadCustomTemplates();

// Fetch calibrated templates from the JSON file
export async function initTemplates() {
  try {
    const response = await fetch("./asl_calibrated_templates.json");
    if (response.ok) {
      fileTemplates = await response.json();
      console.log("Successfully loaded calibrated templates from asl_calibrated_templates.json");
      return true;
    } else {
      console.warn("Could not load asl_calibrated_templates.json, status:", response.status);
    }
  } catch (e) {
    console.error("Failed to fetch asl_calibrated_templates.json:", e);
  }
  return false;
}

export function saveCustomTemplate(letter, landmarks, handedness) {
  if (!landmarks || landmarks.length < 21) return false;
  
  const userWrist = landmarks[0];
  
  // Calculate middle MCP distance as user scale
  const dx = landmarks[9].x - userWrist.x;
  const dy = landmarks[9].y - userWrist.y;
  const dz = landmarks[9].z - userWrist.z;
  const userScale = Math.sqrt(dx*dx + dy*dy + dz*dz);
  
  if (userScale === 0) return false;

  const targetScale = 0.25; // standard template scale
  const scaleRatio = targetScale / userScale;
  
  // Normalize coordinates relative to wrist centered at (0.5, 0.85)
  const normalized = landmarks.map(lm => {
    let lx = lm.x;
    // If Left hand is used for calibration, mirror it horizontally BEFORE saving
    // so that the template is always saved as a standard Right Hand.
    if (handedness === "Left") {
      lx = userWrist.x - (lm.x - userWrist.x);
    }
    return {
      x: 0.5 + (lx - userWrist.x) * scaleRatio,
      y: 0.85 + (lm.y - userWrist.y) * scaleRatio,
      z: (lm.z - userWrist.z) * scaleRatio
    };
  });
  
  customTemplates[letter] = normalized;
  localStorage.setItem("signquest_custom_templates", JSON.stringify(customTemplates));
  return true;
}

export function resetCustomTemplates() {
  customTemplates = {};
  localStorage.removeItem("signquest_custom_templates");
}

export function exportCustomTemplates() {
  // Merge fileTemplates with customTemplates so the exported file is complete
  const merged = { ...fileTemplates, ...customTemplates };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(merged, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "asl_calibrated_templates.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// --- PROCEDURAL GENERATORS ---

function getFingerOffsets(state, fingerName) {
  let spread = 0;
  if (fingerName === "index") spread = -0.015;
  if (fingerName === "middle") spread = 0;
  if (fingerName === "ring") spread = 0.015;
  if (fingerName === "pinky") spread = 0.03;

  switch (state) {
    case "extended":
      return [
        { x: spread, y: -0.08, z: -0.01 }, // PIP
        { x: spread * 1.5, y: -0.14, z: -0.02 }, // DIP
        { x: spread * 2.0, y: -0.19, z: -0.03 }  // Tip
      ];
    case "extended-close":
      return [
        { x: 0, y: -0.08, z: -0.01 }, // PIP
        { x: 0, y: -0.14, z: -0.02 }, // DIP
        { x: 0, y: -0.19, z: -0.03 }  // Tip
      ];
    case "folded":
      return [
        { x: spread * 0.2, y: 0.04, z: -0.01 }, // PIP
        { x: spread * 0.4, y: 0.06, z: -0.02 }, // DIP
        { x: spread * 0.2, y: 0.04, z: -0.03 }  // Tip
      ];
    case "horizontal":
      return [
        { x: -0.07, y: 0.01, z: -0.01 }, // PIP
        { x: -0.13, y: 0.01, z: -0.02 }, // DIP
        { x: -0.18, y: 0.01, z: -0.03 }  // Tip
      ];
    case "downward":
      return [
        { x: spread * 0.2, y: 0.08, z: -0.01 }, // PIP
        { x: spread * 0.4, y: 0.14, z: -0.02 }, // DIP
        { x: spread * 0.5, y: 0.19, z: -0.03 }  // Tip
      ];
    case "curved":
      return [
        { x: spread - 0.02, y: -0.05, z: -0.02 }, // PIP
        { x: spread - 0.04, y: -0.03, z: -0.04 }, // DIP
        { x: spread - 0.04, y: 0.01, z: -0.05 }   // Tip
      ];
    case "hooked":
      return [
        { x: spread, y: -0.06, z: -0.02 }, // PIP
        { x: spread, y: -0.03, z: -0.04 }, // DIP
        { x: spread, y: -0.01, z: -0.05 }  // Tip
      ];
    case "touching-thumb":
      return [
        { x: -0.02, y: -0.04, z: -0.01 }, // PIP
        { x: -0.03, y: -0.06, z: -0.02 }, // DIP
        { x: -0.04, y: -0.07, z: -0.03 }  // Tip
      ];
    case "crossed-index":
      return [
        { x: 0.015, y: -0.08, z: -0.01 }, // PIP
        { x: 0.025, y: -0.14, z: -0.02 }, // DIP
        { x: 0.03, y: -0.19, z: -0.03 }   // Tip
      ];
    case "crossed-middle":
      return [
        { x: -0.015, y: -0.08, z: -0.015 }, // PIP
        { x: -0.025, y: -0.14, z: -0.025 }, // DIP
        { x: -0.03, y: -0.19, z: -0.03 }    // Tip
      ];
    default:
      return [
        { x: 0, y: 0.04, z: 0 },
        { x: 0, y: 0.06, z: 0 },
        { x: 0, y: 0.05, z: 0 }
      ];
  }
}

function getThumbOffsets(state) {
  switch (state) {
    case "tucked-side":
      return [
        { x: -0.02, y: -0.08, z: -0.01 }, // MCP
        { x: 0.0, y: -0.06, z: -0.01 },   // IP
        { x: 0.0, y: -0.06, z: -0.01 }    // Tip
      ];
    case "side":
      return [
        { x: -0.06, y: -0.06, z: -0.01 }, // MCP
        { x: -0.10, y: -0.12, z: -0.02 }, // IP
        { x: -0.13, y: -0.18, z: -0.03 }  // Tip
      ];
    case "tucked-front":
      return [
        { x: 0.02, y: -0.04, z: -0.01 }, // MCP
        { x: 0.04, y: -0.08, z: -0.02 }, // IP
        { x: 0.05, y: -0.11, z: -0.03 }  // Tip
      ];
    case "curved":
      return [
        { x: -0.07, y: -0.02, z: -0.02 }, // MCP
        { x: -0.11, y: -0.06, z: -0.04 }, // IP
        { x: -0.12, y: -0.12, z: -0.05 }  // Tip
      ];
    case "touching-index":
      return [
        { x: -0.02, y: -0.10, z: -0.01 }, // MCP
        { x: -0.03, y: -0.18, z: -0.02 }, // IP
        { x: -0.03, y: -0.25, z: -0.03 }  // Tip
      ];
    case "horizontal":
      return [
        { x: -0.06, y: -0.06, z: -0.01 }, // MCP
        { x: -0.08, y: -0.12, z: -0.02 }, // IP
        { x: -0.08, y: -0.20, z: -0.03 }  // Tip
      ];
    case "downward":
      return [
        { x: -0.05, y: 0.02, z: -0.01 }, // MCP
        { x: -0.08, y: 0.04, z: -0.02 }, // IP
        { x: -0.10, y: 0.06, z: -0.03 }  // Tip
      ];
    case "under-index":
      return [
        { x: 0, y: -0.06, z: -0.01 }, // MCP
        { x: 0.01, y: -0.10, z: -0.02 }, // IP
        { x: 0, y: -0.14, z: -0.03 }  // Tip
      ];
    case "tucked-pink":
      return [
        { x: 0.06, y: -0.02, z: -0.01 }, // MCP
        { x: 0.10, y: -0.05, z: -0.02 }, // IP
        { x: 0.12, y: -0.08, z: -0.03 }  // Tip
      ];
    case "tucked-middle":
      return [
        { x: 0.04, y: -0.02, z: -0.01 }, // MCP
        { x: 0.06, y: -0.06, z: -0.02 }, // IP
        { x: 0.07, y: -0.10, z: -0.03 }  // Tip
      ];
    case "touching-index-pip":
      return [
        { x: -0.01, y: -0.06, z: -0.01 }, // MCP
        { x: -0.01, y: -0.12, z: -0.02 }, // IP
        { x: -0.01, y: -0.17, z: -0.03 }  // Tip
      ];
    default:
      return [
        { x: 0, y: -0.05, z: 0 },
        { x: 0, y: -0.09, z: 0 },
        { x: 0, y: -0.12, z: 0 }
      ];
  }
}

/**
 * Generates 21 landmark templates for the selected ASL letter.
 * Supports custom calibrated templates first, falling back to procedural templates.
 * @param {string} letter - ASL Letter A-Y.
 * @returns {Array} List of 21 landmarks {x, y, z}.
 */
export function getLetterTemplate(letter) {
  if (customTemplates[letter]) {
    // Return a deep copy
    return JSON.parse(JSON.stringify(customTemplates[letter]));
  }

  if (fileTemplates[letter]) {
    // Return a deep copy
    return JSON.parse(JSON.stringify(fileTemplates[letter]));
  }

  const state = FINGER_STATES[letter];
  if (!state) return null;

  const lm = new Array(21);
  
  // 0: Wrist
  lm[0] = { ...BASE_MCPs.wrist };

  // Thumb base
  lm[1] = { ...BASE_MCPs.thumb };
  const thumbOffsets = getThumbOffsets(state.thumb);
  lm[2] = { x: lm[1].x + thumbOffsets[0].x, y: lm[1].y + thumbOffsets[0].y, z: lm[1].z + thumbOffsets[0].z };
  lm[3] = { x: lm[2].x + thumbOffsets[1].x, y: lm[2].y + thumbOffsets[1].y, z: lm[2].z + thumbOffsets[1].z };
  lm[4] = { x: lm[3].x + thumbOffsets[2].x, y: lm[3].y + thumbOffsets[2].y, z: lm[3].z + thumbOffsets[2].z };

  // Helper to generate fingers
  const buildFinger = (baseIdx, mcpKey, fingerKey) => {
    lm[baseIdx] = { ...BASE_MCPs[mcpKey] }; // MCP
    const offsets = getFingerOffsets(state[fingerKey], fingerKey);
    
    lm[baseIdx + 1] = { x: lm[baseIdx].x + offsets[0].x, y: lm[baseIdx].y + offsets[0].y, z: lm[baseIdx].z + offsets[0].z }; // PIP
    lm[baseIdx + 2] = { x: lm[baseIdx + 1].x + offsets[1].x, y: lm[baseIdx + 1].y + offsets[1].y, z: lm[baseIdx + 1].z + offsets[1].z }; // DIP
    lm[baseIdx + 3] = { x: lm[baseIdx + 2].x + offsets[2].x, y: lm[baseIdx + 2].y + offsets[2].y, z: lm[baseIdx + 2].z + offsets[2].z }; // Tip
  };

  buildFinger(5, "index", "index");
  buildFinger(9, "middle", "middle");
  buildFinger(13, "ring", "ring");
  buildFinger(17, "pinky", "pinky");

  return lm;
}
