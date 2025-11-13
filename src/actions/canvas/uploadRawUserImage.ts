"use server";

import {
  validateAuthentication,
  validateProjectOwnership,
  validateRequiredParams,
} from "@/lib/upload/validation";
import {
  validateAndNormalizeConfig,
  ALLOWED_CONTENT_TYPES,
} from "@/config/upload.config";
import { createCanvasWithRawImage } from "@/lib/canvas";
import { ImageSource } from "@prisma/client";

export interface UploadUserImageResult {
  success: boolean;
  error?: string;
  canvasId?: string;
}

export async function uploadRawUserImage(
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

    // 5) Create canvas and RAW image record (consolidated helper)
    const { canvasId } = await createCanvasWithRawImage({
      userId,
      projectId: params.projectId!,
      rawImageBuffer: rawBuffer,
      meshCount: config.meshCount,
      width: config.width,
      numColors: config.numColors,
      source: ImageSource.USER_UPLOAD,
      contentType: file.type, // Preserve original file type
    });

    // Note: MANUFACTURER image processing will be triggered automatically
    // by the polling logic in project-chat-client.tsx when it detects
    // a RAW image without a MANUFACTURER image

    return { success: true, canvasId };
  } catch (error) {
    console.error("Error uploading user image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

