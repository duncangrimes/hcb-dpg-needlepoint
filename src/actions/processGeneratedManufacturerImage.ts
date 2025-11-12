"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  extractImageMetadata,
  calculateStitchDimensions,
  resizeImageForNeedlepoint,
  processImageForManufacturing,
  downloadImageBuffer,
} from "@/lib/upload/image-processing";
import { applyColorCorrection } from "@/lib/colors";
import { getManufacturerImagePath, uploadImageBuffer } from "@/lib/upload/storage";
import { ImageSource, ImageType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface ProcessGeneratedManufacturerResult {
  success: boolean;
  error?: string;
}

/**
 * Processes a Canvas's RAW image by applying the full image processing pipeline
 * and creating the MANUFACTURER image for that Canvas.
 * 
 * Note: Canvas is the database entity. MANUFACTURER is the ImageType of the processed image.
 * 
 * @param canvasId - The Canvas ID whose RAW image should be processed into a MANUFACTURER image
 * @returns Result indicating success or failure
 */
export async function processGeneratedManufacturerImage(
  canvasId: string
): Promise<ProcessGeneratedManufacturerResult> {
  try {
    // 1) Validate authentication
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const userId = session.user.id;

    // 2) Fetch the Canvas entity and its RAW image
    const canvas = await prisma.canvas.findUnique({
      where: { id: canvasId },
      include: {
        images: {
          where: { type: ImageType.RAW, source: ImageSource.AI_GENERATED },
        },
        project: {
          select: { id: true, userId: true },
        },
      },
    });

    if (!canvas || canvas.project.userId !== userId) {
      return { success: false, error: "Canvas not found or not authorized" };
    }

    const rawImage = canvas.images.find(
      (img) => img.type === ImageType.RAW && img.source === ImageSource.AI_GENERATED
    );
    if (!rawImage) {
      return { success: false, error: "Canvas does not have an AI-generated RAW image" };
    }

    // Check if MANUFACTURER image already exists
    const existingManufacturerImage = await prisma.image.findFirst({
      where: {
        canvasId: canvasId,
        type: ImageType.MANUFACTURER,
      },
    });

    if (existingManufacturerImage) {
      // Already processed
      return { success: true };
    }

    // 3) Download RAW image and process
    const rawBuffer = await downloadImageBuffer(rawImage.url);
    const metadata = await extractImageMetadata(rawBuffer);
    const { widthInStitches, heightInStitches } = calculateStitchDimensions(
      canvas.width,
      canvas.meshCount,
      metadata.aspectRatio
    );

    const resized = await resizeImageForNeedlepoint(
      rawBuffer,
      widthInStitches,
      heightInStitches
    );
    const corrected = await applyColorCorrection(resized);
    const { manufacturerImageBuffer, threads } = await processImageForManufacturing(
      corrected,
      canvas.numColors
    );

    // 4) Upload MANUFACTURER image to blob storage
    const manufacturerImagePath = getManufacturerImagePath(userId, canvas.projectId, canvasId);
    const manufacturerImageBlob = await uploadImageBuffer(manufacturerImageBuffer, manufacturerImagePath);

    // 5) Create MANUFACTURER Image record (this is an Image with type MANUFACTURER, belonging to the Canvas)
    await prisma.image.create({
      data: {
        url: manufacturerImageBlob.url,
        type: ImageType.MANUFACTURER,
        source: ImageSource.AI_GENERATED,
        canvas: { connect: { id: canvasId } },
        project: { connect: { id: canvas.projectId } },
        user: { connect: { id: userId } },
      },
    });

    // 6) Update Canvas entity with threads
    await prisma.canvas.update({
      where: { id: canvasId },
      data: { threads: threads.map((t) => t.floss) },
    });

    revalidatePath(`/project/${canvas.projectId}`);

    return { success: true };
  } catch (error) {
    console.error("Error processing MANUFACTURER image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

