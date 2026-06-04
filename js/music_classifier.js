// --- SOLFEGE SIGN MUSIC GESTURE CLASSIFIER ---
import { getMusicTemplatesList } from "./music_templates.js";

const MUSIC_NOTES = ["DO", "RE", "MI", "FA", "SOL", "LA", "TI"];

function getDistance(p1, p2) {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) +
    Math.pow(p1.y - p2.y, 2) +
    Math.pow(p1.z - p2.z, 2)
  );
}

/**
 * Classifies a hand pose into a Solfege note (DO, RE, MI, FA, SOL, LA, TI) based on template distance.
 * @param {Array} landmarks - Array of 21 landmarks {x, y, z}.
 * @param {string} handedness - "Left" or "Right".
 * @returns {string} The matched Solfege note, or "-" if no match meets the confidence threshold.
 */
export function classifyMusicNote(landmarks, handedness) {
  if (!landmarks || landmarks.length < 21) return "-";

  // 1. Normalize user hand landmarks:
  // - Center wrist at (0.5, 0.85)
  // - Scale wrist-to-middle-MCP distance to 0.25
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
    // Mirror Left hand so it aligns with Right-hand templates
    if (handedness === "Left") {
      ux = userWrist.x - (lm.x - userWrist.x);
    }
    return {
      x: 0.5 + (ux - userWrist.x) * scaleRatio,
      y: 0.85 + (lm.y - userWrist.y) * scaleRatio,
      z: (lm.z - userWrist.z) * scaleRatio
    };
  });

  // 2. Perform Nearest-Neighbor distance calculation against all 7 notes and all their calibrated slots
  let minNote = "-";
  let minDistance = Infinity;
  
  MUSIC_NOTES.forEach(note => {
    const templates = getMusicTemplatesList(note);
    if (!templates || templates.length === 0) return;
    
    templates.forEach(template => {
      let totalDist = 0;
      for (let i = 0; i < 21; i++) {
        const u = normalizedUser[i];
        const t = template[i];
        
        // Weight fingertips (4, 8, 12, 16, 20) double for accuracy
        const isTip = [4, 8, 12, 16, 20].includes(i);
        const weight = isTip ? 2.0 : 1.0;
        
        const dist = getDistance(u, t);
        totalDist += dist * weight;
      }
      
      if (totalDist < minDistance) {
        minDistance = totalDist;
        minNote = note;
      }
    });
  });

  // 3. Match evaluation and thresholding
  // A relaxed distance threshold of 1.35 allows robust recognition with generous error room
  if (minDistance < 1.35) {
    return minNote;
  }
  
  return "-";
}
