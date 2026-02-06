"use server";

import { detectSubjects } from "@/lib/vision/subject-detector";

export interface DetectSubjectsResult {
  success: boolean;
  subjects?: {
    id: string;
    label: string;
    confidence: number;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    description?: string;
  }[];
  sceneDescription?: string;
  error?: string;
}

/**
 * Server action to detect subjects in an image
 * Takes a base64 image data URL and returns detected subjects
 */
export async function detectSubjectsAction(
  imageDataUrl: string
): Promise<DetectSubjectsResult> {
  try {
    // Parse the data URL
    const matches = imageDataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      return { success: false, error: "Invalid image data URL" };
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    // Detect subjects
    const result = await detectSubjects(buffer, mimeType);

    return {
      success: true,
      subjects: result.subjects,
      sceneDescription: result.sceneDescription,
    };
  } catch (err) {
    console.error("Subject detection failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Detection failed",
    };
  }
}
