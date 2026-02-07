"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { put } from "@vercel/blob";

export interface SaveSourceImageInput {
  dataUrl: string;
  width: number;
  height: number;
}

export interface SaveSourceImageResult {
  success: boolean;
  sourceImage?: {
    id: string;
    url: string;
    width: number;
    height: number;
  };
  error?: string;
}

/**
 * Upload and save a source image to blob storage and database
 */
export async function saveSourceImage(
  input: SaveSourceImageInput
): Promise<SaveSourceImageResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Parse data URL
    const matches = input.dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      return { success: false, error: "Invalid image data" };
    }

    const contentType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    // Upload to blob storage
    const blob = await put(
      `sources/${session.user.id}/${Date.now()}.${contentType.split("/")[1] || "png"}`,
      buffer,
      { contentType, access: "public" }
    );

    // Save to database
    const sourceImage = await prisma.sourceImage.create({
      data: {
        userId: session.user.id,
        url: blob.url,
        width: input.width,
        height: input.height,
      },
      select: {
        id: true,
        url: true,
        width: true,
        height: true,
      },
    });

    return { success: true, sourceImage };
  } catch (err) {
    console.error("Failed to save source image:", err);
    return { success: false, error: "Failed to save image" };
  }
}

/**
 * Get user's source images (for potential future gallery feature)
 */
export async function listSourceImages(limit = 50): Promise<{
  success: boolean;
  images?: { id: string; url: string; width: number; height: number; createdAt: Date }[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const images = await prisma.sourceImage.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        url: true,
        width: true,
        height: true,
        createdAt: true,
      },
    });

    return { success: true, images };
  } catch (err) {
    console.error("Failed to list source images:", err);
    return { success: false, error: "Failed to load images" };
  }
}
