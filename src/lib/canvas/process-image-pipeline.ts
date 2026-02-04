import {
  extractImageMetadata,
  calculateStitchDimensions,
  resizeImageForNeedlepoint,
  processImageForManufacturing,
} from "@/lib/upload/manufacturer-image-processing";
import { applyColorCorrection, enforceColorLimits } from "@/lib/colors";
import type { Thread } from "@/lib/colors";

export interface CanvasConfig {
  width: number;
  meshCount: number;
  numColors: number;
}

export interface ProcessedImageResult {
  manufacturerImageBuffer: Buffer;
  threads: Thread[];
}

/**
 * Processes a raw image buffer through the complete needlepoint conversion pipeline.
 * This is the shared logic used by both user uploads and AI-generated images.
 * 
 * @param rawBuffer - The raw image buffer to process
 * @param config - Canvas configuration (width, meshCount, numColors)
 * @returns Processed manufacturer image buffer and thread list
 */
export async function processImagePipeline(
  rawBuffer: Buffer,
  config: CanvasConfig
): Promise<ProcessedImageResult> {
  // 1. Extract image metadata
  const metadata = await extractImageMetadata(rawBuffer);
  
  // 2. Enforce size-based color limits
  const numColors = enforceColorLimits(config.numColors, config.width);
  
  // 3. Calculate stitch dimensions based on canvas width and mesh count
  const { widthInStitches, heightInStitches } = calculateStitchDimensions(
    config.width,
    config.meshCount,
    metadata.aspectRatio
  );
  
  // 4. Resize image for needlepoint
  const resized = await resizeImageForNeedlepoint(
    rawBuffer,
    widthInStitches,
    heightInStitches
  );
  
  // 5. Apply color correction
  const corrected = await applyColorCorrection(resized);
  
  // 6. Process image for manufacturing (quantization, dithering, thread mapping, majority filtering)
  const { manufacturerImageBuffer, threads: threadsWithStitches, stitchabilityScore } = await processImageForManufacturing(
    corrected,
    numColors
  );

  console.log(`📊 Stitchability score: ${stitchabilityScore.toFixed(2)} (higher = better)`);
  
  // Map ThreadWithStitches to Thread for backward compatibility
  // (stitch counts are available but not required by this interface)
  const threads: Thread[] = threadsWithStitches.map(({ stitches, ...thread }) => thread);
  
  return {
    manufacturerImageBuffer,
    threads,
  };
}

