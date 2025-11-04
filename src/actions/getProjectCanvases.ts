"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ImageRecord = {
  id: string;
  url: string;
  type: "RAW" | "CANVAS";
};

type CanvasRecord = {
  id: string;
  meshCount: number;
  width: number;
  numColors: number;
  images: ImageRecord[];
  createdAt?: Date;
};

/**
 * Fetches canvases for a project with cursor-based pagination.
 * Returns canvases older than the cursor (if provided), ordered by createdAt asc.
 * @param projectId - The project ID
 * @param cursor - The createdAt timestamp of the oldest currently loaded canvas (optional)
 * @returns Object with canvases array and hasMore boolean indicating if more canvases exist
 */
export async function getProjectCanvases(
  projectId: string,
  cursor?: Date
): Promise<{ canvases: CanvasRecord[]; hasMore: boolean }> {
  const session = await auth();

  if (!session?.user?.id) {
    return { canvases: [], hasMore: false };
  }

  // Verify the project belongs to the user
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });

  if (!project || project.userId !== session.user.id) {
    return { canvases: [], hasMore: false };
  }

  const canvasPerPage = parseInt(process.env.CANVAS_PER_PAGE || "4", 10);
  const takeCount: number = canvasPerPage + 1;

  let canvases;
  let hasMore: boolean;

  if (!cursor) {
    // Initial load: fetch the most recent canvases (newest first)
    const allCanvases = await prisma.canvas.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: takeCount,
      select: {
        id: true,
        meshCount: true,
        width: true,
        numColors: true,
        createdAt: true,
        images: {
          select: {
            id: true,
            url: true,
            type: true,
          },
        },
      },
    });

    hasMore = allCanvases.length > canvasPerPage;
    const canvasesToShow = allCanvases.slice(0, canvasPerPage);
    
    // Reverse to show oldest first (asc order) for the chat interface
    canvases = canvasesToShow.reverse();
  } else {
    // Load more: fetch older canvases (older than cursor)
    const whereClause: {
      projectId: string;
      createdAt: { lt: Date };
    } = {
      projectId,
      createdAt: { lt: cursor },
    };

    const allCanvases = await prisma.canvas.findMany({
      where: whereClause,
      orderBy: { createdAt: "asc" },
      take: takeCount,
      select: {
        id: true,
        meshCount: true,
        width: true,
        numColors: true,
        createdAt: true,
        images: {
          select: {
            id: true,
            url: true,
            type: true,
          },
        },
      },
    });

    hasMore = allCanvases.length > canvasPerPage;
    canvases = allCanvases.slice(0, canvasPerPage);
  }

  return {
    canvases: canvases.map((canvas) => ({
      id: canvas.id,
      meshCount: canvas.meshCount,
      width: canvas.width,
      numColors: canvas.numColors,
      createdAt: canvas.createdAt,
      images: canvas.images.map((img) => ({
        id: img.id,
        url: img.url,
        type: img.type as "RAW" | "CANVAS",
      })),
    })),
    hasMore,
  };
}

