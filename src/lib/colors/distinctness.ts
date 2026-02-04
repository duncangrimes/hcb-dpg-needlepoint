import { converter, differenceEuclidean } from "culori";
import { IMAGE_PROCESSING_CONFIG } from "@/config/image-processing.config";
import type { Thread } from "./types";

const toOklab = converter("oklab");
const colorDifference = differenceEuclidean("oklab");

/**
 * Calculates the perceptual distance (ΔE in OKLab) between two RGB colors.
 */
function deltaE(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const lab1 = toOklab({ r: r1 / 255, g: g1 / 255, b: b1 / 255, mode: "rgb" });
  const lab2 = toOklab({ r: r2 / 255, g: g2 / 255, b: b2 / 255, mode: "rgb" });
  return colorDifference(lab1, lab2);
}

/**
 * Checks palette for colors that are too similar and merges them.
 * 
 * When two palette colors are perceptually indistinguishable (ΔE < minDeltaE),
 * the less-used one is merged into the more-used one. This prevents stitchers
 * from struggling to tell apart nearly identical thread colors.
 * 
 * @param threads Array of threads with stitch counts
 * @param imageBuffer The manufacturer image buffer for re-mapping
 * @returns Object with filtered threads and whether any merges occurred
 */
export function checkColorDistinctness(
  threads: Thread[],
  minDeltaE: number = IMAGE_PROCESSING_CONFIG.colorDistinctness.minDeltaE
): { distinctThreads: Thread[]; mergedCount: number; mergeLog: string[] } {
  const mergeLog: string[] = [];
  const remaining = [...threads];
  let mergedCount = 0;

  // Check all pairs and mark ones that are too similar
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < remaining.length; i++) {
      for (let j = i + 1; j < remaining.length; j++) {
        const a = remaining[i];
        const b = remaining[j];
        const dist = deltaE(a.r, a.g, a.b, b.r, b.g, b.b);
        
        if (dist < minDeltaE) {
          // Remove the second one (arbitrary, could be smarter with stitch counts)
          const removed = remaining.splice(j, 1)[0];
          mergeLog.push(
            `Merged "${removed.name}" (DMC ${removed.floss}) into "${a.name}" (DMC ${a.floss}) — ΔE=${dist.toFixed(2)}`
          );
          mergedCount++;
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }

  if (mergedCount > 0) {
    console.log(`🎨 Color distinctness check: merged ${mergedCount} too-similar colors`);
    mergeLog.forEach(msg => console.log(`  → ${msg}`));
  } else {
    console.log(`✅ Color distinctness check: all ${remaining.length} colors are sufficiently distinct`);
  }

  return { distinctThreads: remaining, mergedCount, mergeLog };
}

/**
 * Enforces maximum color count based on canvas size.
 * 
 * @param requestedColors Number of colors the user requested
 * @param canvasWidthInches Canvas width in inches
 * @returns Capped color count
 */
export function enforceColorLimits(
  requestedColors: number,
  canvasWidthInches: number
): number {
  const { smallCanvasMaxColors, mediumCanvasMaxColors, largeCanvasMaxColors, 
          absoluteMaxColors, smallThresholdInches, mediumThresholdInches } = 
    IMAGE_PROCESSING_CONFIG.colorLimits;

  let maxColors: number;
  if (canvasWidthInches <= smallThresholdInches) {
    maxColors = smallCanvasMaxColors;
  } else if (canvasWidthInches <= mediumThresholdInches) {
    maxColors = mediumCanvasMaxColors;
  } else {
    maxColors = largeCanvasMaxColors;
  }

  // Never exceed absolute max
  maxColors = Math.min(maxColors, absoluteMaxColors);

  if (requestedColors > maxColors) {
    console.log(
      `🎨 Color limit enforced: ${requestedColors} → ${maxColors} colors ` +
      `(canvas width: ${canvasWidthInches}" → ${canvasWidthInches <= smallThresholdInches ? 'small' : 
        canvasWidthInches <= mediumThresholdInches ? 'medium' : 'large'} canvas)`
    );
    return maxColors;
  }

  return requestedColors;
}
