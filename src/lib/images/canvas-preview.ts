/**
 * Canvas Preview Generation
 *
 * Generates a preview image showing the canvas with colored thread mesh.
 * The design colors ARE the threads (warp/weft) — dark holes show between them.
 *
 * Visual model:
 * - Each stitch cell has colored THREADS crossing over/under
 * - The THREADS are the design color (brightened)
 * - The HOLES (corner gaps between threads) are dark (canvas showing through)
 *
 * Cell pattern (5x5 example):
 * D C C C D    D = dark hole (canvas background)
 * C C C C C    C = stitch color (thread)
 * C C C C C
 * C C C C C
 * D C C C D
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
 * Canvas background color (dark, showing through holes)
 */
const CANVAS_BACKGROUND = { r: 40, g: 35, b: 30 };

/**
 * Applies canvas mesh texture where the design colors ARE the threads.
 * Dark holes appear at corners between threads.
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

  // Hole size relative to cell - corners are holes
  // For a cell of size N, holes occupy ~20% of the corner
  const holeRatio = 0.22;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Determine which stitch cell we're in
      const cellX = Math.floor(x / cellSize);
      const cellY = Math.floor(y / cellSize);

      // Position within the cell (0 to 1)
      const localX = (x % cellSize) / cellSize;
      const localY = (y % cellSize) / cellSize;

      // Check if we're in a corner hole
      // Holes are at the four corners where threads don't cover
      const inLeftEdge = localX < holeRatio;
      const inRightEdge = localX > 1 - holeRatio;
      const inTopEdge = localY < holeRatio;
      const inBottomEdge = localY > 1 - holeRatio;

      const inCornerHole =
        (inLeftEdge && inTopEdge) ||
        (inLeftEdge && inBottomEdge) ||
        (inRightEdge && inTopEdge) ||
        (inRightEdge && inBottomEdge);

      if (inCornerHole) {
        // Dark hole - canvas showing through
        const noise = (random() - 0.5) * 15;
        imageData[idx] = Math.round(clamp(CANVAS_BACKGROUND.r + noise, 0, 255));
        imageData[idx + 1] = Math.round(clamp(CANVAS_BACKGROUND.g + noise, 0, 255));
        imageData[idx + 2] = Math.round(clamp(CANVAS_BACKGROUND.b + noise, 0, 255));
      } else {
        // Thread area - use the stitch color with some variation
        const r = imageData[idx];
        const g = imageData[idx + 1];
        const b = imageData[idx + 2];

        // Brighten threads slightly (they catch light)
        const brightenFactor = 1.08;

        // Add subtle thread texture - slight darkening at edges of thread area
        let edgeDarken = 1.0;
        if (inLeftEdge || inRightEdge || inTopEdge || inBottomEdge) {
          edgeDarken = 0.92;
        }

        // Add subtle variation based on thread direction (horizontal vs vertical areas)
        const inHorizontalThread = !inTopEdge && !inBottomEdge;
        const inVerticalThread = !inLeftEdge && !inRightEdge;
        const threadVariation = (inHorizontalThread && inVerticalThread) ? 1.02 : 0.98;

        // Small random noise for texture
        const noise = (random() - 0.5) * 12;

        const factor = brightenFactor * edgeDarken * threadVariation;
        imageData[idx] = Math.round(clamp(r * factor + noise, 0, 255));
        imageData[idx + 1] = Math.round(clamp(g * factor + noise, 0, 255));
        imageData[idx + 2] = Math.round(clamp(b * factor + noise, 0, 255));
      }
    }
  }
}

/**
 * Generates the canvas preview with colored thread mesh.
 *
 * Pipeline:
 * 1. Nearest-neighbor upscale to preview DPI
 * 2. Extract raw pixel data
 * 3. Apply canvas mesh texture (threads as colors, dark holes at corners)
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
