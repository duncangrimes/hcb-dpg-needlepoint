/**
 * Manufacturer Image Generation
 *
 * Generates high-resolution PNG for print production.
 * - Nearest-neighbor upscale to target DPI
 * - DPI metadata embedded
 * - No overlays or modifications
 */

import sharp from "sharp";
import { getConfig } from "./config";
import type { ImageDimensions, OutputConfig, ManufacturerOutputResult } from "./types";

/**
 * Generates the manufacturer-ready image.
 *
 * @param stitchMapBuffer - PNG buffer where 1 pixel = 1 stitch
 * @param dimensions - Physical and stitch dimensions
 * @param config - Output configuration override
 * @returns Manufacturer image result with buffer and metadata
 */
export async function generateManufacturerImage(
  stitchMapBuffer: Buffer,
  dimensions: ImageDimensions,
  config?: Partial<OutputConfig>
): Promise<ManufacturerOutputResult> {
  const { manufacturer } = getConfig();
  const mergedConfig = { ...manufacturer, ...config };
  const { dpi, format } = mergedConfig;

  const targetWidth = Math.round(dimensions.widthInches * dpi);
  const targetHeight = Math.round(dimensions.heightInches * dpi);

  let pipeline = sharp(stitchMapBuffer)
    .resize(targetWidth, targetHeight, {
      kernel: sharp.kernel.nearest,
      fit: "fill",
    })
    .withMetadata({ density: dpi });

  const buffer =
    format === "jpeg"
      ? await pipeline
          .jpeg({ quality: 95, chromaSubsampling: "4:4:4" })
          .toBuffer()
      : await pipeline.png().toBuffer();

  return {
    buffer,
    width: targetWidth,
    height: targetHeight,
    dpi,
    format,
  };
}
