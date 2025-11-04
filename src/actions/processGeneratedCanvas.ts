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
import { getCanvasImagePath, uploadImageBuffer } from "@/lib/upload/storage";
import { ImageSource, ImageType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface ProcessGeneratedCanvasResult {
  success: boolean;
  error?: string;
}

/**
 * Processes a generated canvas by applying the full image processing pipeline
 * and creating the CANVAS image
 * @param canvasId - The canvas ID to process
 * @returns Result indicating success or failure
 */
export async function processGeneratedCanvas(
  canvasId: string
): Promise<ProcessGeneratedCanvasResult> {
  try {
    // 1) Validate authentication
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const userId = session.user.id;

    // 2) Fetch the canvas and its RAW image
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

    // Check if CANVAS image already exists
    const existingCanvasImage = await prisma.image.findFirst({
      where: {
        canvasId: canvasId,
        type: ImageType.CANVAS,
      },
    });

    if (existingCanvasImage) {
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
    const { canvasImageBuffer, threads } = await processImageForManufacturing(
      corrected,
      canvas.numColors
    );

    // 4) Upload CANVAS image to blob storage
    const canvasPngPath = getCanvasImagePath(userId, canvas.projectId, canvasId);
    const canvasBlob = await uploadImageBuffer(canvasImageBuffer, canvasPngPath);

    // 5) Create CANVAS Image record
    await prisma.image.create({
      data: {
        url: canvasBlob.url,
        type: ImageType.CANVAS,
        source: ImageSource.AI_GENERATED,
        canvas: { connect: { id: canvasId } },
        project: { connect: { id: canvas.projectId } },
        user: { connect: { id: userId } },
      },
    });

    // 6) Update Canvas with threads
    await prisma.canvas.update({
      where: { id: canvasId },
      data: { threads: threads.map((t) => t.floss) },
    });

    revalidatePath(`/project/${canvas.projectId}`);

    return { success: true };
  } catch (error) {
    console.error("Error processing generated canvas:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

