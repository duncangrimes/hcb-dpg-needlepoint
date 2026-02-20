/**
 * Canvas Preview Generation
 *
 * Generates a preview image showing a realistic needlepoint canvas mesh.
 * 
 * REALITY MODEL (based on research):
 * - Canvas is a WOVEN MESH with horizontal (weft) and vertical (warp) threads
 * - Threads are CYLINDRICAL - they have rounded 3D appearance
 * - Threads weave OVER and UNDER each other at intersections
 * - Holes are the GAPS BETWEEN threads at corners where 4 cells meet
 * - Base color is ECRU/CREAM (warm off-white)
 * - Paint/color is absorbed INTO the cotton threads
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
const ECRU_BACKGROUND = { r: 235, g: 228, b: 210 };

/**
 * Dark shadow color for depth in holes
 */
const HOLE_SHADOW = { r: 140, g: 130, b: 110 };

/**
 * Desaturates and warms a color to simulate paint absorption into cotton
 */
function absorbColor(r: number, g: number, b: number): { r: number; g: number; b: number } {
  // Reduce saturation by ~15%
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  const desatFactor = 0.85;
  
  const newR = gray + (r - gray) * desatFactor;
  const newG = gray + (g - gray) * desatFactor;
  const newB = gray + (b - gray) * desatFactor;
  
  // Add slight warm tint (cotton absorption)
  return {
    r: Math.min(255, newR + 5),
    g: newG,
    b: Math.max(0, newB - 3),
  };
}

/**
 * Calculates cylindrical thread shading.
 * Thread center is brightest, edges fall off like a cylinder.
 * 
 * @param t - Position across thread width (0 = one edge, 1 = other edge)
 * @returns Brightness multiplier (0.55 to 1.15)
 */
function cylindricalShading(t: number): number {
  // Map to -1 to 1 (center = 0)
  const x = t * 2 - 1;
  // Cylindrical falloff: sqrt(1 - x²) gives circular cross-section
  const cylinderHeight = Math.sqrt(Math.max(0, 1 - x * x));
  // Strong 3D effect: edges ~0.55, center ~1.15
  return 0.55 + cylinderHeight * 0.60;
}

/**
 * Applies realistic woven canvas mesh texture with cylindrical 3D threads.
 * 
 * The mesh is modeled as:
 * - Warp threads run vertically through each cell (cylindrical)
 * - Weft threads run horizontally through each cell (cylindrical)
 * - At intersections, one thread passes OVER the other (alternating pattern)
 * - Holes are the gaps BETWEEN threads at corners
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
  
  // Thread takes up ~65% of cell, hole gap is ~35%
  const threadRatio = 0.65;
  const holeRatio = 1 - threadRatio;
  const halfHole = holeRatio / 2; // ~0.175

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

      // Define thread zones
      const inLeftHoleZone = localX < halfHole;
      const inRightHoleZone = localX > (1 - halfHole);
      const inTopHoleZone = localY < halfHole;
      const inBottomHoleZone = localY > (1 - halfHole);
      
      // Holes are where BOTH horizontal AND vertical hole zones overlap (corners)
      const inHole = (inLeftHoleZone || inRightHoleZone) && (inTopHoleZone || inBottomHoleZone);
      
      // Thread zones
      const inWarpZone = !inLeftHoleZone && !inRightHoleZone; // Vertical thread
      const inWeftZone = !inTopHoleZone && !inBottomHoleZone; // Horizontal thread
      const atIntersection = inWarpZone && inWeftZone;

      // Cotton fiber noise (stronger for texture)
      const noise = (random() - 0.5) * 18;

      if (inHole) {
        // HOLE - show ecru background with depth shading
        // Darker toward center of hole (deeper shadow)
        const holeX = inLeftHoleZone ? localX / halfHole : (1 - localX) / halfHole;
        const holeY = inTopHoleZone ? localY / halfHole : (1 - localY) / halfHole;
        
        // Distance from hole edge (0 = edge/thread, 1 = center of hole)
        const distFromEdge = 1 - Math.max(holeX, holeY);
        
        // Blend from ecru at edges to shadow at center
        const shadowBlend = 0.3 + distFromEdge * 0.5; // 30% base + up to 50% more
        const r = ECRU_BACKGROUND.r * (1 - shadowBlend) + HOLE_SHADOW.r * shadowBlend;
        const g = ECRU_BACKGROUND.g * (1 - shadowBlend) + HOLE_SHADOW.g * shadowBlend;
        const b = ECRU_BACKGROUND.b * (1 - shadowBlend) + HOLE_SHADOW.b * shadowBlend;
        
        imageData[idx] = Math.round(clamp(r + noise * 0.5, 0, 255));
        imageData[idx + 1] = Math.round(clamp(g + noise * 0.5, 0, 255));
        imageData[idx + 2] = Math.round(clamp(b + noise * 0.5, 0, 255));
        
      } else if (atIntersection) {
        // INTERSECTION - one thread on top of another
        const warpOnTop = (cellX + cellY) % 2 === 0;
        
        // Position within the thread zones (0 to 1)
        const threadX = (localX - halfHole) / threadRatio;
        const threadY = (localY - halfHole) / threadRatio;
        
        let brightness: number;
        
        if (warpOnTop) {
          // Warp (vertical) thread is on top - shade based on X position
          brightness = cylindricalShading(threadX);
          // Add vertical fiber texture
          brightness *= 1.0 + Math.sin(threadX * Math.PI * 5) * 0.04;
        } else {
          // Weft (horizontal) thread is on top - shade based on Y position
          brightness = cylindricalShading(threadY);
          // Add horizontal fiber texture
          brightness *= 1.0 + Math.sin(threadY * Math.PI * 5) * 0.04;
        }
        
        // The "bottom" thread shows at the edges if it were visible, 
        // but we simplify by just showing the top thread with full brightness
        
        imageData[idx] = Math.round(clamp(absorbed.r * brightness + noise, 0, 255));
        imageData[idx + 1] = Math.round(clamp(absorbed.g * brightness + noise, 0, 255));
        imageData[idx + 2] = Math.round(clamp(absorbed.b * brightness + noise, 0, 255));
        
      } else if (inWarpZone) {
        // WARP thread (vertical) - only horizontal parts visible (top/bottom edges)
        // These are the parts of the vertical thread that span above/below intersection
        const threadX = (localX - halfHole) / threadRatio;
        
        // Cylindrical shading based on X position
        let brightness = cylindricalShading(threadX);
        
        // Add vertical fiber texture
        brightness *= 1.0 + Math.sin(threadX * Math.PI * 5) * 0.03;
        
        // These parts are more shadowed - they're "under" adjacent weft threads
        brightness *= 0.78;
        
        imageData[idx] = Math.round(clamp(absorbed.r * brightness + noise, 0, 255));
        imageData[idx + 1] = Math.round(clamp(absorbed.g * brightness + noise, 0, 255));
        imageData[idx + 2] = Math.round(clamp(absorbed.b * brightness + noise, 0, 255));
        
      } else if (inWeftZone) {
        // WEFT thread (horizontal) - only vertical parts visible (left/right edges)
        const threadY = (localY - halfHole) / threadRatio;
        
        // Cylindrical shading based on Y position
        let brightness = cylindricalShading(threadY);
        
        // Add horizontal fiber texture  
        brightness *= 1.0 + Math.sin(threadY * Math.PI * 5) * 0.03;
        
        // These parts are more shadowed - they're "under" adjacent warp threads
        brightness *= 0.78;
        
        imageData[idx] = Math.round(clamp(absorbed.r * brightness + noise, 0, 255));
        imageData[idx + 1] = Math.round(clamp(absorbed.g * brightness + noise, 0, 255));
        imageData[idx + 2] = Math.round(clamp(absorbed.b * brightness + noise, 0, 255));
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
