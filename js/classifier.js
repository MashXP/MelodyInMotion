// --- TEMPLATE-MATCHING ASL GESTURE CLASSIFIER ---
import { getLetterTemplate } from "./templates.js";

const LETTERS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "K", "L", "M", 
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y"
];

/**
 * Calculates the Euclidean distance between two 3D points.
 */
function getDistance(p1, p2) {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) +
    Math.pow(p1.y - p2.y, 2) +
    Math.pow(p1.z - p2.z, 2)
  );
}

/**
 * Classifies ASL fingerspelling based on hand landmarks using 3D Nearest-Neighbor template matching.
 * Compares user's hand against custom calibrated templates (or procedural fallbacks).
 * @param {Array} landmarks - Array of 21 landmarks {x, y, z}.
 * @param {string} handedness - "Left" or "Right".
 * @returns {string} The matched ASL letter, or "-" if no match meets the confidence threshold.
 */
export function classifyASL(landmarks, handedness) {
  if (!landmarks || landmarks.length < 21) return "-";

  // 1. Normalize the user's hand to match the template coordinate space:
  // - Center the wrist at (0.5, 0.85)
  // - Scale wrist-to-middle-MCP distance to exactly 0.25
  const userWrist = landmarks[0];
  const dx = landmarks[9].x - userWrist.x;
  const dy = landmarks[9].y - userWrist.y;
  const dz = landmarks[9].z - userWrist.z;
  const userScale = Math.sqrt(dx*dx + dy*dy + dz*dz);
  
  if (userScale === 0) return "-";
  
  const targetScale = 0.25;
  const scaleRatio = targetScale / userScale;
  
  const normalizedUser = landmarks.map(lm => {
    let ux = lm.x;
    // Mirror X coordinates if Left Hand so it aligns with standard Right Hand templates
    if (handedness === "Left") {
      ux = userWrist.x - (lm.x - userWrist.x);
    }
    return {
      x: 0.5 + (ux - userWrist.x) * scaleRatio,
      y: 0.85 + (lm.y - userWrist.y) * scaleRatio,
      z: (lm.z - userWrist.z) * scaleRatio
    };
  });

  // 2. Perform Nearest-Neighbor distance calculation against all 24 letter templates
  let minLetter = "-";
  let minDistance = Infinity;
  
  LETTERS.forEach(letter => {
    const template = getLetterTemplate(letter);
    if (!template) return;
    
    let totalDist = 0;
    for (let i = 0; i < 21; i++) {
      const u = normalizedUser[i];
      const t = template[i];
      
      // Weight fingertips (4, 8, 12, 16, 20) double because finger extension 
      // states are the most critical features in ASL fingerspelling.
      const isTip = [4, 8, 12, 16, 20].includes(i);
      const weight = isTip ? 2.0 : 1.0;
      
      const dist = getDistance(u, t);
      totalDist += dist * weight;
    }
    
    if (totalDist < minDistance) {
      minDistance = totalDist;
      minLetter = letter;
    }
  });

  // 3. Match Evaluation & Thresholding
  // A perfect match is around 0.1 - 0.4.
  // Non-matching gestures typically yield total distances > 2.0.
  // Setting a threshold of 1.25 gives a generous and accurate tolerance.
  if (minDistance < 1.25) {
    return minLetter;
  }
  
  return "-";
}
