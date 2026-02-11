/**
 * Image Pipeline Orchestrator
 *
 * Generates all 3 image types from a single stitch-mapped source:
 * 1. Manufacturer image (high-res PNG with DPI)
 * 2. Canvas preview (with mesh grid overlay)
 * 3. Stitched preview (clean "finished" look)
 */

import { generateManufacturerImage } from "./manufacturer-output";
import { generateCanvasPreview } from "./canvas-preview";
import { generateStitchedPreview } from "./stitched-preview";
import { mergeConfig } from "./config";
import type {
  PipelineInput,
  PipelineOptions,
  GeneratedImages,
} from "./types";

/**
 * Orchestrates generation of all 3 image types from a stitch-mapped source.
 *
 * Runs manufacturer and preview generations in parallel for performance.
 * All outputs maintain stitch precision via nearest-neighbor interpolation.
 *
 * @param input - Pipeline input with stitch map and dimensions
 * @param options - Options to skip certain outputs or control data URL generation
 * @returns Generated images object with buffers and optional data URLs
 */
export async function generateAllImages(
  input: PipelineInput,
  options: PipelineOptions = {}
): Promise<GeneratedImages> {
  const {
    skipManufacturer = false,
    skipCanvasPreview = false,
    skipStitchedPreview = false,
    previewsAsDataUrls = true,
  } = options;

  const { stitchMapBuffer, dimensions, config: configOverride } = input;
  const config = mergeConfig(configOverride);

  // Run generations in parallel for performance
  const [manufacturer, canvasPreview, stitchedPreview] = await Promise.all([
    skipManufacturer
      ? Promise.resolve(null)
      : generateManufacturerImage(
          stitchMapBuffer,
          dimensions,
          config.manufacturer
        ),

    skipCanvasPreview
      ? Promise.resolve(null)
      : generateCanvasPreview(stitchMapBuffer, dimensions, config.meshGrid),

    skipStitchedPreview
      ? Promise.resolve(null)
      : generateStitchedPreview(
          stitchMapBuffer,
          dimensions,
          config.fabricTexture
        ),
  ]);

  // Build result object
  const result: GeneratedImages = {
    manufacturer: manufacturer
      ? {
          buffer: manufacturer.buffer,
          width: manufacturer.width,
          height: manufacturer.height,
          dpi: manufacturer.dpi,
        }
      : { buffer: Buffer.alloc(0), width: 0, height: 0, dpi: 0 },

    canvasPreview: canvasPreview
      ? {
          buffer: canvasPreview.buffer,
          width: canvasPreview.width,
          height: canvasPreview.height,
          dataUrl: previewsAsDataUrls
            ? `data:image/jpeg;base64,${canvasPreview.buffer.toString("base64")}`
            : undefined,
        }
      : { buffer: Buffer.alloc(0), width: 0, height: 0 },

    stitchedPreview: stitchedPreview
      ? {
          buffer: stitchedPreview.buffer,
          width: stitchedPreview.width,
          height: stitchedPreview.height,
          dataUrl: previewsAsDataUrls
            ? `data:image/jpeg;base64,${stitchedPreview.buffer.toString("base64")}`
            : undefined,
        }
      : { buffer: Buffer.alloc(0), width: 0, height: 0 },
  };

  return result;
}
