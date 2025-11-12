import { applyColorCorrection } from "@/lib/colors";
import { createCanvas } from "@/actions/canvas/createCanvas";
import { revalidatePath } from "next/cache";
import {
  extractImageMetadata,
  calculateStitchDimensions,
  resizeImageForNeedlepoint,
  processImageForManufacturing,
  downloadImageBuffer,
} from "./manufacturer-image-processing";
import { uploadManufacturerImage, cleanupBlob } from "./storage";
import type { UploadConfig } from "@/config/upload.config";

export interface ProcessUploadParams {
  blobUrl: string;
  projectId: string;
  userId: string;
  config: UploadConfig;
}

/**
 * Orchestrates the complete image upload and processing pipeline
 * @param params Upload parameters including blob URL and configuration
 * @returns The created canvas
 */
export async function processUpload(params: ProcessUploadParams) {
  const { blobUrl, projectId, userId, config } = params;
  const { meshCount, width, numColors } = config;

  // Download original image
  const imageBuffer = await downloadImageBuffer(blobUrl);

  // Extract metadata
  const metadata = await extractImageMetadata(imageBuffer);
  const { widthInStitches, heightInStitches } = calculateStitchDimensions(
    width,
    meshCount,
    metadata.aspectRatio
  );

  // Resize image for needlepoint
  const resizedBuffer = await resizeImageForNeedlepoint(
    imageBuffer,
    widthInStitches,
    heightInStitches
  );

  // Apply color correction
  const correctedBuffer = await applyColorCorrection(resizedBuffer);

  // Process image for manufacturing
  const { manufacturerImageBuffer, threads: threadsWithStitches, stitchabilityScore } = await processImageForManufacturing(
    correctedBuffer,
    numColors
  );

  console.log(`📊 Stitchability score: ${stitchabilityScore.toFixed(2)} (higher = better)`);

  // Upload both images to blob storage
  const { rawImgUrl, manufacturerImgUrl } = await uploadManufacturerImage(
    projectId,
    imageBuffer,
    manufacturerImageBuffer
  );

  // Map ThreadWithStitches to Thread for createCanvas (it only needs floss codes)
  // Log stitch counts for user information
  const threads = threadsWithStitches.map(({ stitches, ...thread }) => {
    if (stitches > 0) {
      console.log(`  - ${thread.floss} (${thread.name}): ${stitches} stitches`);
    }
    return thread;
  });

  // Create canvas record
  const canvas = await createCanvas({
    projectId,
    userId,
    meshCount,
    width,
    numColors,
    rawImageUrl: rawImgUrl,
    manufacturerImageUrl: manufacturerImgUrl,
    threads,
  });

  // Clean up temporary blob
  await cleanupBlob(blobUrl);

  // Revalidate the project page
  revalidatePath(`/project/${projectId}`);

  console.log(
    `✅ Upload complete: raw=${rawImgUrl}, manufacturer=${manufacturerImgUrl}, threads=${threads.length}`
  );

  return canvas;
}

