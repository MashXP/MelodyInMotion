// --- DRAWING MULTI-COLOR SKELETON UTILS ---

const SKELETON_CONNECTIONS = [
  // Thumb
  { joints: [0, 1], group: "thumb" },
  { joints: [1, 2], group: "thumb" },
  { joints: [2, 3], group: "thumb" },
  { joints: [3, 4], group: "thumb" },
  // Index
  { joints: [0, 5], group: "index" },
  { joints: [5, 6], group: "index" },
  { joints: [6, 7], group: "index" },
  { joints: [7, 8], group: "index" },
  // Middle
  { joints: [9, 10], group: "middle" },
  { joints: [10, 11], group: "middle" },
  { joints: [11, 12], group: "middle" },
  // Ring
  { joints: [13, 14], group: "ring" },
  { joints: [14, 15], group: "ring" },
  { joints: [15, 16], group: "ring" },
  // Pinky
  { joints: [0, 17], group: "pinky" },
  { joints: [17, 18], group: "pinky" },
  { joints: [18, 19], group: "pinky" },
  { joints: [19, 20], group: "pinky" },
  // Palm connections
  { joints: [5, 9], group: "palm" },
  { joints: [9, 13], group: "palm" },
  { joints: [13, 17], group: "palm" }
];

const FINGER_COLORS = {
  thumb: "#f43f5e",   // Rose/Red
  index: "#fbbf24",   // Amber/Yellow
  middle: "#10b981",  // Emerald/Green
  ring: "#06b6d4",    // Cyan/Blue
  pinky: "#8b5cf6",   // Violet/Purple
  palm: "#9ca3af"     // Gray/White
};

function getTranslucentColor(hex, opacity) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function getGroupForLandmark(idx) {
  if (idx === 0) return "palm";
  if (idx >= 1 && idx <= 4) return "thumb";
  if (idx >= 5 && idx <= 8) return "index";
  if (idx >= 9 && idx <= 12) return "middle";
  if (idx >= 13 && idx <= 16) return "ring";
  if (idx >= 17 && idx <= 20) return "pinky";
  return "palm";
}

/**
 * Draws the hand landmarks skeleton on the specified canvas context.
 * Draws each finger in a distinct color for easier calibration and debugging.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context.
 * @param {Array} landmarks - MediaPipe hand landmarks.
 * @param {string} fallbackColor - Fallback stroke color (unused, kept for signature compatibility).
 * @param {boolean} isGhost - Whether to render as a translucent guide overlay.
 */
export function drawSkeleton(ctx, landmarks, fallbackColor, isGhost = false) {
  if (!landmarks || landmarks.length === 0) return;
  
  ctx.save();
  
  // 1. Draw Connection Lines (Bones)
  if (isGhost) {
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 2.5;
  } else {
    ctx.lineWidth = 4;
  }
  ctx.lineCap = "round";
  
  SKELETON_CONNECTIONS.forEach(({ joints: [startIdx, endIdx], group }) => {
    const start = landmarks[startIdx];
    const end = landmarks[endIdx];
    
    if (start && end) {
      ctx.beginPath();
      ctx.moveTo(start.x * ctx.canvas.width, start.y * ctx.canvas.height);
      ctx.lineTo(end.x * ctx.canvas.width, end.y * ctx.canvas.height);
      
      const baseColor = FINGER_COLORS[group];
      const color = isGhost ? getTranslucentColor(baseColor, 0.4) : baseColor;
      
      // Beautiful glowing gradient line
      const grad = ctx.createLinearGradient(
        start.x * ctx.canvas.width, start.y * ctx.canvas.height,
        end.x * ctx.canvas.width, end.y * ctx.canvas.height
      );
      grad.addColorStop(0, color);
      grad.addColorStop(1, isGhost ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.8)");
      
      ctx.strokeStyle = grad;
      ctx.stroke();
    }
  });
  
  // 2. Draw Knuckles (Joints)
  landmarks.forEach((lm, idx) => {
    ctx.beginPath();
    const radius = isGhost ? 3.5 : 6;
    ctx.arc(lm.x * ctx.canvas.width, lm.y * ctx.canvas.height, radius, 0, 2 * Math.PI);
    
    const group = getGroupForLandmark(idx);
    const baseColor = FINGER_COLORS[group];
    const color = isGhost ? getTranslucentColor(baseColor, 0.5) : baseColor;
    
    const isTip = [4, 8, 12, 16, 20].includes(idx);
    if (isTip) {
      ctx.fillStyle = isGhost ? "rgba(255, 255, 255, 0.6)" : "#ffffff";
      ctx.strokeStyle = color;
      ctx.lineWidth = isGhost ? 1.5 : 3;
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.fill();
    }
  });
  
  ctx.restore();
}
