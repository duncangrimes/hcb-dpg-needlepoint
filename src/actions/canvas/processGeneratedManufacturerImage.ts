"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { downloadImageBuffer } from "@/lib/upload/manufacturer-image-processing";
import { processImagePipeline, createManufacturerImage } from "@/lib/canvas";
import { ImageSource, ImageType } from "@prisma/client";

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

    // 3) Download RAW image
    const rawBuffer = await downloadImageBuffer(rawImage.url);

    // 4) Process image pipeline
    const { manufacturerImageBuffer, threads } = await processImagePipeline(rawBuffer, {
      width: canvas.width,
      meshCount: canvas.meshCount,
      numColors: canvas.numColors,
    });

    // 5) Create MANUFACTURER image (upload, create record, update canvas, revalidate)
    await createManufacturerImage({
      canvasId,
      userId,
      projectId: canvas.projectId,
      manufacturerImageBuffer,
      threads,
    });

    return { success: true };
  } catch (error) {
    console.error("Error processing MANUFACTURER image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

