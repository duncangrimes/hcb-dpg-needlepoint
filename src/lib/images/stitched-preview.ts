/**
 * Stitched Preview Generation
 *
 * Generates a preview showing the "finished look" — how the
 * needlepoint will appear when fully stitched.
 *
 * For now, outputs a clean upscaled image. Texture overlay
 * can be added later for a more realistic thread appearance.
 */

import sharp from "sharp";
import { getConfig } from "./config";
import type { ImageDimensions, FabricTextureConfig, StitchedPreviewResult } from "./types";

/**
 * Generates the stitched preview.
 *
 * - Nearest-neighbor upscale to preview DPI
 * - Clean output (no grid lines)
 * - Future: Add subtle fabric/thread texture overlay
 * - JPEG output for web optimization
 *
 * @param stitchMapBuffer - PNG buffer where 1 pixel = 1 stitch
 * @param dimensions - Physical and stitch dimensions
 * @param _configOverride - Fabric texture configuration (reserved for future use)
 * @returns Stitched preview result with buffer and dimensions
 */
export async function generateStitchedPreview(
  stitchMapBuffer: Buffer,
  dimensions: ImageDimensions,
  _configOverride?: Partial<FabricTextureConfig>
): Promise<StitchedPreviewResult> {
  const config = getConfig();
  const { dpi, quality } = config.preview;

  const targetWidth = Math.round(dimensions.widthInches * dpi);
  const targetHeight = Math.round(dimensions.heightInches * dpi);

  // Upscale with nearest-neighbor to preserve stitch blocks
  const buffer = await sharp(stitchMapBuffer)
    .resize(targetWidth, targetHeight, {
      kernel: sharp.kernel.nearest,
      fit: "fill",
    })
    .jpeg({ quality: quality ?? 85 })
    .toBuffer();

  return {
    buffer,
    width: targetWidth,
    height: targetHeight,
  };
}
