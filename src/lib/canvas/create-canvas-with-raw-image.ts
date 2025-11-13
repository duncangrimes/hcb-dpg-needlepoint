import { prisma } from "@/lib/prisma";
import { getRawImagePath, uploadImageBuffer } from "@/lib/upload/storage";
import { ImageSource, ImageType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface CreateCanvasWithRawImageParams {
  userId: string;
  projectId: string;
  rawImageBuffer: Buffer;
  meshCount: number;
  width: number;
  numColors: number;
  source: ImageSource;
  contentType?: string; // Optional content type for preserving original file type
}

export interface CreateCanvasWithRawImageResult {
  canvasId: string;
  rawImageId: string;
  rawImageUrl: string;
}

/**
 * Creates a canvas record and uploads/creates the RAW image record.
 * This consolidates the common logic used by both user uploads and AI-generated images.
 * 
 * @param params - Parameters for creating the canvas and RAW image
 * @returns The created canvas ID, raw image ID, and raw image URL
 */
export async function createCanvasWithRawImage(
  params: CreateCanvasWithRawImageParams
): Promise<CreateCanvasWithRawImageResult> {
  const { userId, projectId, rawImageBuffer, meshCount, width, numColors, source, contentType } = params;

  // 1. Create canvas record
  const canvas = await prisma.canvas.create({
    data: {
      project: { connect: { id: projectId } },
      user: { connect: { id: userId } },
      meshCount,
      width,
      numColors,
      threads: [],
    },
    select: { id: true, projectId: true },
  });

  // 2. Upload raw image to blob storage
  const rawImagePath = getRawImagePath(userId, canvas.projectId, canvas.id);
  const rawBlob = await uploadImageBuffer(
    rawImageBuffer,
    rawImagePath,
    contentType
  );

  // 3. Create RAW image record
  const rawImage = await prisma.image.create({
    data: {
      url: rawBlob.url,
      type: ImageType.RAW,
      source,
      canvas: { connect: { id: canvas.id } },
      project: { connect: { id: canvas.projectId } },
      user: { connect: { id: userId } },
    },
    select: { id: true },
  });

  // 4. Revalidate project path to show RAW image immediately
  revalidatePath(`/project/${canvas.projectId}`);

  return {
    canvasId: canvas.id,
    rawImageId: rawImage.id,
    rawImageUrl: rawBlob.url,
  };
}

