"use server";

import {
  validateAuthentication,
  validateProjectOwnership,
  validateRequiredParams,
} from "@/lib/upload/validation";
import {
  validateAndNormalizeConfig,
  ALLOWED_CONTENT_TYPES,
} from "@/lib/upload/config";
import { prisma } from "@/lib/prisma";
import { getRawImagePath } from "@/lib/upload/storage";
import { processImagePipeline, createManufacturerImage } from "@/lib/canvas";
import { ImageSource, ImageType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface UploadUserImageResult {
  success: boolean;
  error?: string;
  canvasId?: string;
}

export async function uploadUserImage(
  formData: FormData
): Promise<UploadUserImageResult> {
  try {
    // 1) Validate authentication
    const userId = await validateAuthentication();

    // 2) Parse and validate FormData
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // Validate file type
    if (!ALLOWED_CONTENT_TYPES.includes(file.type as typeof ALLOWED_CONTENT_TYPES[number])) {
      return { success: false, error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." };
    }

    const projectId = formData.get("projectId") as string | null;
    const meshCount = formData.get("meshCount");
    const width = formData.get("width");
    const numColors = formData.get("numColors");

    const params = {
      projectId: projectId || undefined,
      meshCount: meshCount ? Number(meshCount) : undefined,
      width: width ? Number(width) : undefined,
      numColors: numColors ? Number(numColors) : undefined,
    };

    validateRequiredParams(params);
    await validateProjectOwnership(params.projectId!, userId);

    // 3) Normalize config
    const config = validateAndNormalizeConfig({
      meshCount: params.meshCount,
      width: params.width,
      numColors: params.numColors,
    });

    // 4) Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);

    // 5) Create canvas record
    const canvas = await prisma.canvas.create({
      data: {
        project: { connect: { id: params.projectId! } },
        user: { connect: { id: userId } },
        meshCount: config.meshCount,
        width: config.width,
        numColors: config.numColors,
        threads: [],
      },
      select: { id: true, projectId: true },
    });

    // 6) Upload raw image to Vercel Blob (preserve original file type)
    const rawImagePath = getRawImagePath(userId, canvas.projectId, canvas.id);
    const { put } = await import("@vercel/blob");
    const rawBlob = await put(rawImagePath, rawBuffer, {
      access: "public",
      contentType: file.type,
    });

    // 7) Create RAW image record immediately (so user sees it right away)
    await prisma.image.create({
      data: {
        url: rawBlob.url,
        type: ImageType.RAW,
        source: ImageSource.USER_UPLOAD,
        canvas: { connect: { id: canvas.id } },
        project: { connect: { id: canvas.projectId } },
        user: { connect: { id: userId } },
      },
    });

    // 8) Revalidate project path to show RAW image immediately
    revalidatePath(`/project/${canvas.projectId}`);

    // 9) Process image pipeline (happens after RAW is visible)
    const { manufacturerImageBuffer, threads } = await processImagePipeline(rawBuffer, {
      width: config.width,
      meshCount: config.meshCount,
      numColors: config.numColors,
    });

    // 10) Create MANUFACTURER image (upload, create record, update canvas, revalidate)
    await createManufacturerImage({
      canvasId: canvas.id,
      userId,
      projectId: canvas.projectId,
      manufacturerImageBuffer,
      threads,
    });

    return { success: true, canvasId: canvas.id };
  } catch (error) {
    console.error("Error uploading user image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

