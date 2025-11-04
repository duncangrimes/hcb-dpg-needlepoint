"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ImageType } from "@prisma/client";

export interface CanvasStatus {
  hasRaw: boolean;
  hasCanvas: boolean;
  rawUrl?: string;
  canvasUrl?: string;
}

/**
 * Checks the status of a canvas to see if it has RAW and/or CANVAS images
 * @param canvasId - The canvas ID to check
 * @returns Object indicating which images are available
 */
export async function checkCanvasStatus(
  canvasId: string
): Promise<CanvasStatus | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const canvas = await prisma.canvas.findUnique({
    where: { id: canvasId },
    select: {
      id: true,
      userId: true,
      images: {
        select: {
          url: true,
          type: true,
        },
      },
    },
  });

  if (!canvas || canvas.userId !== session.user.id) {
    return null;
  }

  const raw = canvas.images.find((img) => img.type === ImageType.RAW);
  const canvasImg = canvas.images.find((img) => img.type === ImageType.CANVAS);

  return {
    hasRaw: !!raw,
    hasCanvas: !!canvasImg,
    rawUrl: raw?.url,
    canvasUrl: canvasImg?.url,
  };
}
