/**
 * Nearest-Neighbor Upscaling
 *
 * CRITICAL: Always use sharp.kernel.nearest to preserve stitch boundaries.
 * Never use bilinear/lanczos — they blur stitch edges.
 */

import sharp from "sharp";

export interface UpscaleOptions {
  targetDpi: number;
  widthInches: number;
  heightInches: number;
  embedDpi?: boolean;
}

/**
 * Upscales a stitch-mapped image using nearest-neighbor interpolation.
 *
 * Each source pixel (1 stitch) becomes a crisp square block.
 * This preserves the sharp boundaries between stitches.
 *
 * @param stitchMapBuffer - PNG buffer where 1 pixel = 1 stitch
 * @param options - Upscale configuration
 * @returns Upscaled PNG buffer with optional DPI metadata
 */
export async function upscaleNearestNeighbor(
  stitchMapBuffer: Buffer,
  options: UpscaleOptions
): Promise<Buffer> {
  const { targetDpi, widthInches, heightInches, embedDpi = true } = options;

  const targetWidth = Math.round(widthInches * targetDpi);
  const targetHeight = Math.round(heightInches * targetDpi);

  let pipeline = sharp(stitchMapBuffer).resize(targetWidth, targetHeight, {
    kernel: sharp.kernel.nearest,
    fit: "fill",
  });

  if (embedDpi) {
    pipeline = pipeline.withMetadata({ density: targetDpi });
  }

  return pipeline.png().toBuffer();
}

/**
 * Calculates the scale factor between stitch map and output.
 *
 * @param meshCount - Stitches per inch
 * @param targetDpi - Target output DPI
 * @returns Scale factor (pixels per stitch)
 */
export function calculateScaleFactor(
  meshCount: number,
  targetDpi: number
): number {
  return targetDpi / meshCount;
}

/**
 * Calculates cell size in pixels for a given DPI.
 *
 * @param meshCount - Stitches per inch
 * @param targetDpi - Target output DPI
 * @returns Cell size in pixels
 */
export function calculateCellSize(
  meshCount: number,
  targetDpi: number
): number {
  return Math.round(targetDpi / meshCount);
}
