/**
 * Stitched Preview Generation
 *
 * Generates a preview showing the "finished look" — how the
 * needlepoint will appear when fully stitched with tent stitch.
 *
 * Based on pixel analysis of NeedlePaint reference images:
 * - Random noise texture (NOT a grid)
 * - Low contrast (brightness range ~60)
 * - Subtle variation simulates thread texture
 * - Optional diagonal modulation to mimic tent stitch direction (45°)
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
 * Applies stitch texture to an upscaled image buffer.
 *
 * Creates the realistic filled needlepoint appearance with:
 * - Random noise for thread texture (no visible grid)
 * - Subtle diagonal modulation for tent stitch direction
 * - Low contrast to maintain natural thread look
 *
 * @param imageData - Raw RGBA pixel buffer
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param cellSize - Size of each stitch cell in pixels
 * @param noiseAmount - Amount of brightness variation (default: 30)
 * @param diagonalStrength - Strength of diagonal pattern (default: 5)
 * @param seed - Random seed for deterministic noise
 */
function applyStitchTexture(
  imageData: Buffer,
  width: number,
  height: number,
  cellSize: number,
  noiseAmount: number = 30,
  diagonalStrength: number = 5,
  seed: number = 42
): void {
  const random = seededRandom(seed);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      // Random noise for thread texture
      // Range: -noiseAmount to +noiseAmount
      const noise = (random() - 0.5) * noiseAmount * 2;
      
      // Diagonal modulation for tent stitch appearance
      // Creates subtle brightness variation along 45° diagonal
      // This mimics how light hits diagonal tent stitches differently
      const diagonal = ((x + y) % 2 === 0) ? diagonalStrength : -diagonalStrength;
      
      // Additional within-cell diagonal pattern for more realism
      // Position within the stitch cell
      const cellX = x % cellSize;
      const cellY = y % cellSize;
      const cellDiagonal = (cellX + cellY) / (cellSize * 2);
      const cellVariation = (cellDiagonal - 0.5) * 10;
      
      // Combined texture effect
      const textureOffset = noise + diagonal + cellVariation;
      
      // Apply texture to each color channel
      const r = imageData[idx];
      const g = imageData[idx + 1];
      const b = imageData[idx + 2];
      
      imageData[idx] = Math.round(clamp(r + textureOffset, 0, 255));
      imageData[idx + 1] = Math.round(clamp(g + textureOffset, 0, 255));
      imageData[idx + 2] = Math.round(clamp(b + textureOffset, 0, 255));
      // Alpha remains unchanged
    }
  }
}

/**
 * Generates the stitched preview with thread texture.
 *
 * Pipeline:
 * 1. Nearest-neighbor upscale to preview DPI
 * 2. Extract raw pixel data
 * 3. Apply stitch texture (noise + diagonal pattern)
 * 4. Convert to JPEG for web optimization
 *
 * @param stitchMapBuffer - PNG buffer where 1 pixel = 1 stitch
 * @param dimensions - Physical and stitch dimensions
 * @param configOverride - Fabric texture configuration
 * @returns Stitched preview result with buffer and dimensions
 */
export async function generateStitchedPreview(
  stitchMapBuffer: Buffer,
  dimensions: ImageDimensions,
  configOverride?: Partial<FabricTextureConfig>
): Promise<StitchedPreviewResult> {
  const config = getConfig();
  const { dpi, quality } = config.preview;
  
  // Texture parameters (can be overridden via config)
  const noiseAmount = configOverride?.noiseAmount ?? 30;
  const diagonalStrength = configOverride?.diagonalStrength ?? 5;

  const targetWidth = Math.round(dimensions.widthInches * dpi);
  const targetHeight = Math.round(dimensions.heightInches * dpi);
  
  // Calculate cell size for within-cell texture variation
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
  // Use a deterministic seed based on dimensions for consistency
  const seed = targetWidth * 1000 + targetHeight + 12345;
  applyStitchTexture(
    upscaled,
    targetWidth,
    targetHeight,
    cellSize,
    noiseAmount,
    diagonalStrength,
    seed
  );

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
