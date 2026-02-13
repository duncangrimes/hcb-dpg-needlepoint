/**
 * Stitched Preview Generation
 *
 * Generates a preview showing the "finished look" — how the
 * needlepoint will appear when fully stitched with tent stitch.
 *
 * Visual model:
 * - Each stitch is a DIAGONAL LINE within its cell (tent stitch at 45°)
 * - The diagonal is the stitch color (slightly varied for thread texture)
 * - Areas off the diagonal are darker (shadow from adjacent stitches)
 *
 * Cell pattern (5x5 example, top-left to bottom-right diagonal):
 * B D D D D    B = bright (stitch thread)
 * D B D D D    D = darker (shadow/gap)
 * D D B D D
 * D D D B D
 * D D D D B
 */

import sharp from "sharp";
import { getConfig } from "./config";
import type { ImageDimensions, FabricTextureConfig, StitchedPreviewResult } from "./types";

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
 * Applies stitch texture with visible diagonal tent stitches.
 *
 * Each stitch cell shows a clear diagonal line (the stitch) with
 * darker areas on either side (shadows/gaps between stitches).
 *
 * @param imageData - Raw RGBA pixel buffer
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param cellSize - Size of each stitch cell in pixels
 * @param seed - Random seed for deterministic noise
 */
function applyStitchTexture(
  imageData: Buffer,
  width: number,
  height: number,
  cellSize: number,
  seed: number = 42
): void {
  const random = seededRandom(seed);

  // Diagonal stitch width as a ratio of cell size
  // Wider diagonal = more visible stitch
  const diagonalWidthRatio = 0.35;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Position within the cell (0 to cellSize-1)
      const localX = x % cellSize;
      const localY = y % cellSize;

      // Normalize to 0-1 range
      const normX = localX / (cellSize - 1 || 1);
      const normY = localY / (cellSize - 1 || 1);

      // Distance from the diagonal line (top-left to bottom-right)
      // On the diagonal: normX === normY, so distance = 0
      // Distance is perpendicular to the diagonal
      const diagonalDistance = Math.abs(normX - normY) / Math.sqrt(2);

      // Determine if we're on the stitch (diagonal) or in shadow
      const onStitch = diagonalDistance < diagonalWidthRatio;

      // Get the base stitch color
      const r = imageData[idx];
      const g = imageData[idx + 1];
      const b = imageData[idx + 2];

      let newR: number, newG: number, newB: number;

      if (onStitch) {
        // On the diagonal stitch - bright thread color
        // Vary brightness along the diagonal for thread texture
        const threadPosition = (normX + normY) / 2;
        
        // Subtle highlights in the middle of the stitch
        const highlightFactor = 1.0 + 0.12 * (1 - Math.abs(threadPosition - 0.5) * 2);
        
        // Small thread texture variation
        const threadNoise = (random() - 0.5) * 15;
        
        // Edge darkening within the stitch (softer edges)
        const edgeSoftness = 1.0 - (diagonalDistance / diagonalWidthRatio) * 0.15;

        const factor = highlightFactor * edgeSoftness;
        newR = r * factor + threadNoise;
        newG = g * factor + threadNoise;
        newB = b * factor + threadNoise;
      } else {
        // Off the diagonal - shadow area between stitches
        // Darken based on distance from stitch
        const shadowDepth = Math.min((diagonalDistance - diagonalWidthRatio) * 2, 1);
        const shadowFactor = 0.65 - shadowDepth * 0.2;
        
        // Less noise in shadow areas
        const shadowNoise = (random() - 0.5) * 8;

        newR = r * shadowFactor + shadowNoise;
        newG = g * shadowFactor + shadowNoise;
        newB = b * shadowFactor + shadowNoise;
      }

      imageData[idx] = Math.round(clamp(newR, 0, 255));
      imageData[idx + 1] = Math.round(clamp(newG, 0, 255));
      imageData[idx + 2] = Math.round(clamp(newB, 0, 255));
    }
  }
}

/**
 * Generates the stitched preview with visible diagonal tent stitches.
 *
 * Pipeline:
 * 1. Nearest-neighbor upscale to preview DPI
 * 2. Extract raw pixel data
 * 3. Apply stitch texture (diagonal lines with shadows)
 * 4. Convert to JPEG for web optimization
 *
 * @param stitchMapBuffer - PNG buffer where 1 pixel = 1 stitch
 * @param dimensions - Physical and stitch dimensions
 * @param configOverride - Fabric texture configuration (reserved)
 * @returns Stitched preview result with buffer and dimensions
 */
export async function generateStitchedPreview(
  stitchMapBuffer: Buffer,
  dimensions: ImageDimensions,
  configOverride?: Partial<FabricTextureConfig>
): Promise<StitchedPreviewResult> {
  const config = getConfig();
  const { dpi, quality } = config.preview;

  const targetWidth = Math.round(dimensions.widthInches * dpi);
  const targetHeight = Math.round(dimensions.heightInches * dpi);

  // Calculate cell size for stitch rendering
  const cellSize = Math.round(dpi / dimensions.meshCount);

  // 1. Upscale with nearest-neighbor to preserve stitch blocks
  const upscaled = await sharp(stitchMapBuffer)
    .resize(targetWidth, targetHeight, {
      kernel: sharp.kernel.nearest,
      fit: "fill",
    })
    .ensureAlpha()
    .raw()
    .toBuffer();

  // 2. Apply stitch texture to the raw pixel data
  const seed = targetWidth * 1000 + targetHeight + 12345;
  applyStitchTexture(upscaled, targetWidth, targetHeight, cellSize, seed);

  // 3. Convert to JPEG
  const buffer = await sharp(upscaled, {
    raw: { width: targetWidth, height: targetHeight, channels: 4 },
  })
    .jpeg({ quality: quality ?? 85 })
    .toBuffer();

  return {
    buffer,
    width: targetWidth,
    height: targetHeight,
  };
}
