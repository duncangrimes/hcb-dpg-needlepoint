/**
 * Canvas Preview Generation
 *
 * Generates a preview image with realistic canvas mesh texture.
 * Shows users "what you'll receive" — the canvas with visible mesh holes
 * and thread texture, similar to NeedlePaint's high-quality previews.
 *
 * Based on pixel analysis of NeedlePaint reference images:
 * - 4-pixel repeating grid pattern with dark holes at intersections
 * - High contrast (brightness range ~200)
 * - Dark pixels (gray 50-100) simulate mesh holes
 * - Creates visible mesh/weave appearance
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
 * Uses a linear congruential generator.
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return (state >>> 0) / 0xffffffff;
  };
}

/**
 * Applies canvas mesh texture to an upscaled image buffer.
 *
 * This creates the realistic woven canvas appearance with:
 * - Dark holes at thread intersections
 * - Lighter areas where threads cross
 * - Subtle noise for natural variation
 *
 * @param imageData - Raw RGBA pixel buffer
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
  
  // Grid size determines the mesh pattern frequency within each cell
  // Using 4-pixel repeating pattern as observed in NeedlePaint analysis
  const gridSize = Math.max(2, Math.round(cellSize / 4));
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      const gridX = x % gridSize;
      const gridY = y % gridSize;
      
      // Determine mesh texture factor (0 = hole/dark, 1 = full brightness)
      let meshFactor: number;
      
      if (gridX === 0 && gridY === 0) {
        // Intersection - darkest (mesh hole)
        // This creates the visible "holes" in the canvas mesh
        meshFactor = 0.25;
      } else if (gridX === 0 || gridY === 0) {
        // Thread line - medium dark
        // The vertical and horizontal canvas threads
        meshFactor = 0.55;
      } else if (gridX === 1 || gridY === 1 || gridX === gridSize - 1 || gridY === gridSize - 1) {
        // Near thread - medium light
        // Areas adjacent to thread lines
        meshFactor = 0.80;
      } else {
        // Center of cell - brightest
        // The printed design color shows through most clearly here
        meshFactor = 0.95;
      }
      
      // Apply mesh darkening to each channel
      const r = imageData[idx];
      const g = imageData[idx + 1];
      const b = imageData[idx + 2];
      
      // Apply mesh factor
      let newR = r * meshFactor;
      let newG = g * meshFactor;
      let newB = b * meshFactor;
      
      // Add slight noise for realism (±10 brightness variation)
      const noise = (random() - 0.5) * 20;
      newR = clamp(newR + noise, 0, 255);
      newG = clamp(newG + noise, 0, 255);
      newB = clamp(newB + noise, 0, 255);
      
      imageData[idx] = Math.round(newR);
      imageData[idx + 1] = Math.round(newG);
      imageData[idx + 2] = Math.round(newB);
      // Alpha remains unchanged
    }
  }
}

/**
 * Generates the canvas preview with realistic mesh texture.
 *
 * Pipeline:
 * 1. Nearest-neighbor upscale to preview DPI
 * 2. Extract raw pixel data
 * 3. Apply canvas mesh texture (dark holes, thread pattern)
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
  // Use a deterministic seed based on dimensions for consistency
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
