import { applyColorCorrection } from "@/lib/colors";
import { createCanvas } from "@/actions/createCanvas";
import { revalidatePath } from "next/cache";
import {
  extractImageMetadata,
  calculateStitchDimensions,
  resizeImageForNeedlepoint,
  processImageForManufacturing,
  downloadImageBuffer,
} from "./image-processing";
import { uploadCanvasImages, cleanupBlob } from "./storage";
import type { UploadConfig } from "./config";

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
  const { canvasImageBuffer, threads } = await processImageForManufacturing(
    correctedBuffer,
    numColors
  );

  // Upload both images to blob storage
  const { rawUrl, canvasUrl } = await uploadCanvasImages(
    projectId,
    imageBuffer,
    canvasImageBuffer
  );

  // Create canvas record
  const canvas = await createCanvas({
    projectId,
    userId,
    meshCount,
    width,
    numColors,
    rawImageUrl: rawUrl,
    canvasImageUrl: canvasUrl,
    threads,
  });

  // Clean up temporary blob
  await cleanupBlob(blobUrl);

  // Revalidate the project page
  revalidatePath(`/project/${projectId}`);

  console.log(
    `✅ Upload complete: raw=${rawUrl}, canvas=${canvasUrl}, threads=${threads.length}`
  );

  return canvas;
}

