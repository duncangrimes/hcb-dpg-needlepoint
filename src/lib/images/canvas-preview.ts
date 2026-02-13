/**
 * Canvas Preview Generation
 *
 * Generates a preview image showing a realistic needlepoint canvas mesh.
 * 
 * REALITY MODEL (based on research):
 * - Canvas is a WOVEN MESH with horizontal (weft) and vertical (warp) threads
 * - Threads weave OVER and UNDER each other at intersections
 * - Holes are the GAPS BETWEEN threads, NOT at thread intersections
 * - Base color is ECRU/CREAM (warm off-white), not black
 * - Threads are WIDER than holes (~60% thread, ~40% hole)
 * - Paint/color is absorbed INTO the cotton threads
 *
 * Cell structure (each stitch cell):
 * ```
 *   ┌─────────────────────┐
 *   │  H │  WARP THREAD   │ H │
 *   ├────┼────────────────┼───┤
 *   │  W │  INTERSECTION  │ W │
 *   │  E │  (over/under)  │ E │
 *   │  F │                │ F │
 *   │  T │                │ T │
 *   ├────┼────────────────┼───┤
 *   │  H │  WARP THREAD   │ H │
 *   └─────────────────────┘
 *   H = Hole (gap showing ecru background)
 *   WEFT/WARP = Colored threads
 * ```
 */

import sharp from "sharp";
import { getConfig } from "./config";
import { calculateCellSize } from "./upscale";
import type { ImageDimensions, MeshGridConfig, CanvasPreviewResult } from "./types";

/**
 * Clamps a value between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Simple seeded random number generator for deterministic noise.
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return (state >>> 0) / 0xffffffff;
  };
}

/**
 * Ecru/cream canvas background color - warm off-white
 * This shows through the holes in the mesh
 */
const ECRU_BACKGROUND = { r: 245, g: 240, b: 225 };

/**
 * Desaturates and warms a color to simulate paint absorption into cotton
 */
function absorbColor(r: number, g: number, b: number): { r: number; g: number; b: number } {
  // Reduce saturation by ~12%
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  const desatFactor = 0.88;
  
  const newR = gray + (r - gray) * desatFactor;
  const newG = gray + (g - gray) * desatFactor;
  const newB = gray + (b - gray) * desatFactor;
  
  // Add slight warm tint (cotton absorption)
  return {
    r: Math.min(255, newR + 3),
    g: newG,
    b: Math.max(0, newB - 2),
  };
}

/**
 * Applies realistic woven canvas mesh texture.
 * 
 * The mesh is modeled as:
 * - Warp threads run vertically through each cell
 * - Weft threads run horizontally through each cell
 * - At intersections, one thread passes OVER the other (alternating pattern)
 * - Holes are the gaps BETWEEN threads (at the four quadrant corners of each cell)
 *
 * @param imageData - Raw RGBA pixel buffer (colors already upscaled)
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param cellSize - Size of each stitch cell in pixels
 * @param seed - Random seed for deterministic noise
 */
function applyCanvasMeshTexture(
  imageData: Buffer,
  width: number,
  height: number,
  cellSize: number,
  seed: number = 42
): void {
  const random = seededRandom(seed);
  
  // Thread takes up ~60% of cell, hole gap is ~40%
  // But the hole is at the CORNER where 4 cells meet, so within one cell
  // we see quarter-holes at each corner
  const threadRatio = 0.62; // Thread coverage
  const holeRatio = 1 - threadRatio; // Hole/gap coverage
  
  // Half the hole width (since hole spans two cells)
  const halfHole = holeRatio / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Determine which stitch cell we're in
      const cellX = Math.floor(x / cellSize);
      const cellY = Math.floor(y / cellSize);

      // Position within the cell (0 to 1)
      const localX = (x % cellSize) / cellSize;
      const localY = (y % cellSize) / cellSize;

      // Get the stitch color at this pixel
      const baseR = imageData[idx];
      const baseG = imageData[idx + 1];
      const baseB = imageData[idx + 2];
      
      // Apply color absorption (paint into cotton)
      const absorbed = absorbColor(baseR, baseG, baseB);

      // Determine thread zones within the cell
      // Threads run through the CENTER of the cell
      // Holes appear at the edges where cells meet
      
      // Is this pixel in a thread zone or a hole zone?
      const inLeftHoleZone = localX < halfHole;
      const inRightHoleZone = localX > (1 - halfHole);
      const inTopHoleZone = localY < halfHole;
      const inBottomHoleZone = localY > (1 - halfHole);
      
      // Holes are where BOTH horizontal AND vertical hole zones overlap
      // These are the four corners of each cell
      const inHole = (inLeftHoleZone || inRightHoleZone) && (inTopHoleZone || inBottomHoleZone);
      
      // Thread zones
      const inWarpThread = !inLeftHoleZone && !inRightHoleZone; // Vertical thread (center column)
      const inWeftThread = !inTopHoleZone && !inBottomHoleZone; // Horizontal thread (center row)
      const atIntersection = inWarpThread && inWeftThread; // Where threads cross

      if (inHole) {
        // Hole - show ecru background with subtle variation
        const noise = (random() - 0.5) * 8;
        // Add slight shadow at hole edges (depth)
        const edgeX = inLeftHoleZone ? localX / halfHole : (1 - localX) / halfHole;
        const edgeY = inTopHoleZone ? localY / halfHole : (1 - localY) / halfHole;
        const edgeFactor = Math.min(edgeX, edgeY);
        const shadowFactor = 0.85 + 0.15 * edgeFactor;
        
        imageData[idx] = Math.round(clamp(ECRU_BACKGROUND.r * shadowFactor + noise, 0, 255));
        imageData[idx + 1] = Math.round(clamp(ECRU_BACKGROUND.g * shadowFactor + noise, 0, 255));
        imageData[idx + 2] = Math.round(clamp(ECRU_BACKGROUND.b * shadowFactor + noise, 0, 255));
      } else if (atIntersection) {
        // Intersection - threads weave over/under
        // Use alternating pattern based on cell position
        const warpOnTop = (cellX + cellY) % 2 === 0;
        
        // The "top" thread is brighter, "bottom" thread is slightly shadowed
        // Calculate position within the intersection zone
        const intersectLocalX = (localX - halfHole) / threadRatio;
        const intersectLocalY = (localY - halfHole) / threadRatio;
        
        // Add thread texture - subtle striations along thread direction
        let textureFactor = 1.0;
        if (warpOnTop) {
          // Warp (vertical) is on top - add vertical striations
          const striation = Math.sin(intersectLocalX * Math.PI * 3) * 0.04;
          textureFactor = 1.0 + striation;
          // Slight shadow at edges of the "top" thread
          const edgeDist = Math.min(intersectLocalX, 1 - intersectLocalX);
          textureFactor *= 0.95 + 0.05 * Math.min(edgeDist * 4, 1);
        } else {
          // Weft (horizontal) is on top - add horizontal striations
          const striation = Math.sin(intersectLocalY * Math.PI * 3) * 0.04;
          textureFactor = 1.0 + striation;
          const edgeDist = Math.min(intersectLocalY, 1 - intersectLocalY);
          textureFactor *= 0.95 + 0.05 * Math.min(edgeDist * 4, 1);
        }
        
        // Thread texture noise
        const noise = (random() - 0.5) * 10;
        
        imageData[idx] = Math.round(clamp(absorbed.r * textureFactor + noise, 0, 255));
        imageData[idx + 1] = Math.round(clamp(absorbed.g * textureFactor + noise, 0, 255));
        imageData[idx + 2] = Math.round(clamp(absorbed.b * textureFactor + noise, 0, 255));
      } else if (inWarpThread) {
        // Warp thread (vertical) - not at intersection
        const threadLocalX = (localX - halfHole) / threadRatio;
        
        // Add vertical thread striations
        const striation = Math.sin(threadLocalX * Math.PI * 3) * 0.03;
        
        // Slight darkening at thread edges
        const edgeDist = Math.min(threadLocalX, 1 - threadLocalX);
        const edgeFactor = 0.93 + 0.07 * Math.min(edgeDist * 3, 1);
        
        const textureFactor = (1.0 + striation) * edgeFactor;
        const noise = (random() - 0.5) * 8;
        
        imageData[idx] = Math.round(clamp(absorbed.r * textureFactor + noise, 0, 255));
        imageData[idx + 1] = Math.round(clamp(absorbed.g * textureFactor + noise, 0, 255));
        imageData[idx + 2] = Math.round(clamp(absorbed.b * textureFactor + noise, 0, 255));
      } else if (inWeftThread) {
        // Weft thread (horizontal) - not at intersection
        const threadLocalY = (localY - halfHole) / threadRatio;
        
        // Add horizontal thread striations
        const striation = Math.sin(threadLocalY * Math.PI * 3) * 0.03;
        
        // Slight darkening at thread edges
        const edgeDist = Math.min(threadLocalY, 1 - threadLocalY);
        const edgeFactor = 0.93 + 0.07 * Math.min(edgeDist * 3, 1);
        
        const textureFactor = (1.0 + striation) * edgeFactor;
        const noise = (random() - 0.5) * 8;
        
        imageData[idx] = Math.round(clamp(absorbed.r * textureFactor + noise, 0, 255));
        imageData[idx + 1] = Math.round(clamp(absorbed.g * textureFactor + noise, 0, 255));
        imageData[idx + 2] = Math.round(clamp(absorbed.b * textureFactor + noise, 0, 255));
      }
    }
  }
}

/**
 * Generates the canvas preview with realistic woven mesh texture.
 *
 * Pipeline:
 * 1. Nearest-neighbor upscale to preview DPI
 * 2. Extract raw pixel data
 * 3. Apply woven mesh texture (threads with holes between them)
 * 4. Convert back to JPEG for web optimization
 *
 * @param stitchMapBuffer - PNG buffer where 1 pixel = 1 stitch
 * @param dimensions - Physical and stitch dimensions
 * @param _configOverride - Mesh grid configuration override (reserved)
 * @returns Canvas preview result with buffer and dimensions
 */
export async function generateCanvasPreview(
  stitchMapBuffer: Buffer,
  dimensions: ImageDimensions,
  _configOverride?: Partial<MeshGridConfig>
): Promise<CanvasPreviewResult> {
  const config = getConfig();
  const { dpi, quality } = config.preview;

  const targetWidth = Math.round(dimensions.widthInches * dpi);
  const targetHeight = Math.round(dimensions.heightInches * dpi);
  const cellSize = calculateCellSize(dimensions.meshCount, dpi);

  // 1. Upscale stitch map with nearest-neighbor to preserve stitch blocks
  const upscaled = await sharp(stitchMapBuffer)
    .resize(targetWidth, targetHeight, {
      kernel: sharp.kernel.nearest,
      fit: "fill",
    })
    .ensureAlpha()
    .raw()
    .toBuffer();

  // 2. Apply canvas mesh texture to the raw pixel data
  const seed = targetWidth * 1000 + targetHeight;
  applyCanvasMeshTexture(upscaled, targetWidth, targetHeight, cellSize, seed);

  // 3. Convert back to JPEG
  const composited = await sharp(upscaled, {
    raw: { width: targetWidth, height: targetHeight, channels: 4 },
  })
    .jpeg({ quality: quality ?? 85 })
    .toBuffer();

  return {
    buffer: composited,
    width: targetWidth,
    height: targetHeight,
  };
}
