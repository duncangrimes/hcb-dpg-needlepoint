"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { put } from "@vercel/blob";
import type { Point } from "@/types/editor";

// =============================================================================
// Types
// =============================================================================

export interface CutoutListItem {
  id: string;
  name: string | null;
  thumbnailUrl: string | null;
  extractedUrl: string | null;
  aspectRatio: number;
  createdAt: Date;
  sourceImage: {
    id: string;
    url: string;
  };
}

export interface ListCutoutsResult {
  success: boolean;
  cutouts?: CutoutListItem[];
  nextCursor?: string;
  hasMore?: boolean;
  error?: string;
}

export interface SaveCutoutInput {
  sourceImageId: string;
  path: Point[];
  name?: string;
  extractedDataUrl?: string;  // Will be uploaded to blob storage
  thumbnailDataUrl?: string;  // Will be uploaded to blob storage
  aspectRatio: number;
}

export interface SaveCutoutResult {
  success: boolean;
  cutout?: CutoutListItem;
  error?: string;
}

// =============================================================================
// List Cutouts (Paginated)
// =============================================================================

/**
 * Fetch user's cutouts with cursor-based pagination
 * Sorted by createdAt DESC (newest first)
 */
export async function listCutouts(
  cursor?: string,
  limit: number = 20
): Promise<ListCutoutsResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const cutouts = await prisma.cutout.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: limit + 1, // Fetch one extra to check if there's more
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0, // Skip the cursor item itself
      select: {
        id: true,
        name: true,
        thumbnailUrl: true,
        extractedUrl: true,
        aspectRatio: true,
        createdAt: true,
        sourceImage: {
          select: {
            id: true,
            url: true,
          },
        },
      },
    });

    const hasMore = cutouts.length > limit;
    const items = hasMore ? cutouts.slice(0, -1) : cutouts;
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

    return {
      success: true,
      cutouts: items,
      nextCursor,
      hasMore,
    };
  } catch (err) {
    console.error("Failed to list cutouts:", err);
    return { success: false, error: "Failed to fetch cutouts" };
  }
}

// =============================================================================
// Save Cutout
// =============================================================================

/**
 * Save a new cutout to the database
 * Optionally uploads extracted image and thumbnail to blob storage
 */
export async function saveCutout(
  input: SaveCutoutInput
): Promise<SaveCutoutResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify source image belongs to user
    const sourceImage = await prisma.sourceImage.findFirst({
      where: {
        id: input.sourceImageId,
        userId: session.user.id,
      },
    });

    if (!sourceImage) {
      return { success: false, error: "Source image not found" };
    }

    // Upload extracted image to blob storage if provided
    let extractedUrl: string | undefined;
    if (input.extractedDataUrl) {
      const blob = await uploadDataUrl(
        input.extractedDataUrl,
        `cutouts/${session.user.id}/${Date.now()}-extracted.png`
      );
      extractedUrl = blob.url;
    }

    // Upload thumbnail to blob storage if provided
    let thumbnailUrl: string | undefined;
    if (input.thumbnailDataUrl) {
      const blob = await uploadDataUrl(
        input.thumbnailDataUrl,
        `cutouts/${session.user.id}/${Date.now()}-thumb.png`
      );
      thumbnailUrl = blob.url;
    }

    // Create cutout record
    const cutout = await prisma.cutout.create({
      data: {
        userId: session.user.id,
        sourceImageId: input.sourceImageId,
        path: input.path as unknown as object[],
        name: input.name,
        extractedUrl,
        thumbnailUrl,
        aspectRatio: input.aspectRatio,
      },
      select: {
        id: true,
        name: true,
        thumbnailUrl: true,
        extractedUrl: true,
        aspectRatio: true,
        createdAt: true,
        sourceImage: {
          select: {
            id: true,
            url: true,
          },
        },
      },
    });

    return { success: true, cutout };
  } catch (err) {
    console.error("Failed to save cutout:", err);
    return { success: false, error: "Failed to save cutout" };
  }
}

// =============================================================================
// Get Single Cutout
// =============================================================================

export async function getCutout(id: string): Promise<{
  success: boolean;
  cutout?: CutoutListItem & { path: Point[] };
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const cutout = await prisma.cutout.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        path: true,
        thumbnailUrl: true,
        extractedUrl: true,
        aspectRatio: true,
        createdAt: true,
        sourceImage: {
          select: {
            id: true,
            url: true,
          },
        },
      },
    });

    if (!cutout) {
      return { success: false, error: "Cutout not found" };
    }

    return {
      success: true,
      cutout: {
        ...cutout,
        path: cutout.path as unknown as Point[],
      },
    };
  } catch (err) {
    console.error("Failed to get cutout:", err);
    return { success: false, error: "Failed to fetch cutout" };
  }
}

// =============================================================================
// Delete Cutout
// =============================================================================

export async function deleteCutout(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify ownership and delete
    const cutout = await prisma.cutout.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!cutout) {
      return { success: false, error: "Cutout not found" };
    }

    await prisma.cutout.delete({ where: { id } });

    // TODO: Also delete blob storage files (extractedUrl, thumbnailUrl)

    return { success: true };
  } catch (err) {
    console.error("Failed to delete cutout:", err);
    return { success: false, error: "Failed to delete cutout" };
  }
}

// =============================================================================
// Helpers
// =============================================================================

async function uploadDataUrl(
  dataUrl: string,
  pathname: string
): Promise<{ url: string }> {
  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches) {
    throw new Error("Invalid data URL");
  }

  const contentType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, "base64");

  const blob = await put(pathname, buffer, {
    contentType,
    access: "public",
  });

  return { url: blob.url };
}
