/**
 * Image Pipeline
 *
 * Generates 3 image outputs from a stitch-mapped source:
 * 1. Manufacturer image — high-res PNG with DPI metadata for print
 * 2. Canvas preview — shows mesh grid overlay ("what you'll receive")
 * 3. Stitched preview — clean view ("finished look")
 *
 * @example
 * ```ts
 * import { generateAllImages, type ImageDimensions } from '@/lib/images';
 *
 * const dimensions: ImageDimensions = {
 *   widthInches: 10,
 *   heightInches: 14,
 *   meshCount: 13,
 *   widthStitches: 130,
 *   heightStitches: 182,
 * };
 *
 * const images = await generateAllImages({
 *   stitchMapBuffer,
 *   dimensions,
 * });
 *
 * // images.manufacturer.buffer → High-res PNG
 * // images.canvasPreview.dataUrl → JPEG data URL with grid
 * // images.stitchedPreview.dataUrl → JPEG data URL, clean
 * ```
 */

// Main pipeline function
export { generateAllImages } from "./pipeline";

// Individual generators (for advanced use)
export { generateManufacturerImage } from "./manufacturer-output";
export { generateCanvasPreview } from "./canvas-preview";
export { generateStitchedPreview } from "./stitched-preview";

// Upscaling utilities
export {
  upscaleNearestNeighbor,
  calculateScaleFactor,
  calculateCellSize,
} from "./upscale";

// Configuration
export { getConfig, mergeConfig, DEFAULT_CONFIG } from "./config";

// Types
export type {
  ImageDimensions,
  OutputConfig,
  MeshGridConfig,
  FabricTextureConfig,
  PipelineConfig,
  PipelineInput,
  PipelineOptions,
  GeneratedImages,
  ManufacturerOutputResult,
  CanvasPreviewResult,
  StitchedPreviewResult,
} from "./types";
