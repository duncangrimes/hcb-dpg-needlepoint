"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { CanvasConfig, PlacedCutout, Transform } from "@/types/editor";

// =============================================================================
// Types
// =============================================================================

export interface CanvasListItem {
  id: string;
  name: string | null;
  widthInches: number;
  heightInches: number;
  status: string;
  manufacturerUrl: string | null;
  stitchability: number | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    cutouts: number;
  };
}

export interface CanvasDetail {
  id: string;
  name: string | null;
  widthInches: number;
  heightInches: number;
  meshCount: number;
  bgPattern: string;
  bgColor1: string;
  bgColor2: string | null;
  status: string;
  manufacturerUrl: string | null;
  threads: unknown;
  stitchability: number | null;
  widthStitches: number | null;
  heightStitches: number | null;
  createdAt: Date;
  updatedAt: Date;
  cutouts: {
    id: string;
    cutoutId: string;
    transform: unknown;
    zIndex: number;
    cutout: {
      id: string;
      path: unknown;
      extractedUrl: string | null;
      sourceImage: {
        id: string;
        url: string;
      };
    };
  }[];
}

// =============================================================================
// List Canvases
// =============================================================================

export async function listCanvases(): Promise<{
  success: boolean;
  canvases?: CanvasListItem[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const canvases = await prisma.canvas.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        widthInches: true,
        heightInches: true,
        status: true,
        manufacturerUrl: true,
        stitchability: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { cutouts: true },
        },
      },
    });

    return { success: true, canvases };
  } catch (err) {
    console.error("Failed to list canvases:", err);
    return { success: false, error: "Failed to load canvases" };
  }
}

// =============================================================================
// Get Single Canvas
// =============================================================================

export async function getCanvas(id: string): Promise<{
  success: boolean;
  canvas?: CanvasDetail;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const canvas = await prisma.canvas.findFirst({
      where: { id, userId: session.user.id },
      include: {
        cutouts: {
          include: {
            cutout: {
              include: {
                sourceImage: {
                  select: { id: true, url: true },
                },
              },
            },
          },
          orderBy: { zIndex: "asc" },
        },
      },
    });

    if (!canvas) {
      return { success: false, error: "Canvas not found" };
    }

    return { success: true, canvas: canvas as unknown as CanvasDetail };
  } catch (err) {
    console.error("Failed to get canvas:", err);
    return { success: false, error: "Failed to load canvas" };
  }
}

// =============================================================================
// Create Canvas
// =============================================================================

export async function createCanvas(input?: {
  name?: string;
  config?: Partial<CanvasConfig>;
}): Promise<{
  success: boolean;
  canvas?: { id: string };
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const canvas = await prisma.canvas.create({
      data: {
        userId: session.user.id,
        name: input?.name || null,
        widthInches: input?.config?.widthInches ?? 8,
        heightInches: input?.config?.heightInches ?? 10,
        meshCount: input?.config?.meshCount ?? 13,
        bgPattern: (input?.config?.bgPattern?.toUpperCase() as any) ?? "SOLID",
        bgColor1: input?.config?.bgColor1 ?? "#FFFFFF",
        bgColor2: input?.config?.bgColor2 ?? null,
        status: "DRAFT",
      },
      select: { id: true },
    });

    return { success: true, canvas };
  } catch (err) {
    console.error("Failed to create canvas:", err);
    return { success: false, error: "Failed to create canvas" };
  }
}

// =============================================================================
// Update Canvas
// =============================================================================

export async function updateCanvas(
  id: string,
  input: {
    name?: string;
    config?: Partial<CanvasConfig>;
    status?: string;
    manufacturerUrl?: string;
    threads?: unknown;
    stitchability?: number;
    widthStitches?: number;
    heightStitches?: number;
  }
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify ownership
    const existing = await prisma.canvas.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return { success: false, error: "Canvas not found" };
    }

    await prisma.canvas.update({
      where: { id },
      data: {
        name: input.name,
        widthInches: input.config?.widthInches,
        heightInches: input.config?.heightInches,
        meshCount: input.config?.meshCount,
        bgPattern: input.config?.bgPattern?.toUpperCase() as any,
        bgColor1: input.config?.bgColor1,
        bgColor2: input.config?.bgColor2,
        status: input.status?.toUpperCase() as any,
        manufacturerUrl: input.manufacturerUrl,
        threads: input.threads as any,
        stitchability: input.stitchability,
        widthStitches: input.widthStitches,
        heightStitches: input.heightStitches,
      },
    });

    return { success: true };
  } catch (err) {
    console.error("Failed to update canvas:", err);
    return { success: false, error: "Failed to update canvas" };
  }
}

// =============================================================================
// Save Canvas with Placements
// =============================================================================

export async function saveCanvasWithPlacements(
  canvasId: string,
  placements: {
    cutoutId: string;
    transform: Transform;
    zIndex: number;
    widthInches: number;
    aspectRatio: number;
  }[]
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify ownership
    const canvas = await prisma.canvas.findFirst({
      where: { id: canvasId, userId: session.user.id },
    });

    if (!canvas) {
      return { success: false, error: "Canvas not found" };
    }

    // Delete existing placements and recreate
    await prisma.$transaction([
      prisma.placedCutout.deleteMany({ where: { canvasId } }),
      ...placements.map((p) =>
        prisma.placedCutout.create({
          data: {
            canvasId,
            cutoutId: p.cutoutId,
            transform: p.transform as any,
            zIndex: p.zIndex,
          },
        })
      ),
    ]);

    return { success: true };
  } catch (err) {
    console.error("Failed to save canvas placements:", err);
    return { success: false, error: "Failed to save canvas" };
  }
}

// =============================================================================
// Delete Canvas
// =============================================================================

export async function deleteCanvas(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify ownership
    const canvas = await prisma.canvas.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!canvas) {
      return { success: false, error: "Canvas not found" };
    }

    await prisma.canvas.delete({ where: { id } });

    return { success: true };
  } catch (err) {
    console.error("Failed to delete canvas:", err);
    return { success: false, error: "Failed to delete canvas" };
  }
}
