"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ImageType, ImageSource } from "@prisma/client";

export interface CanvasStatus {
  hasRaw: boolean;
  hasManufacturerImage: boolean;
  rawUrl?: string;
  manufacturerImageUrl?: string;
  rawSource?: ImageSource;
}

/**
 * Checks the status of a Canvas to see if it has RAW and/or MANUFACTURER images.
 * 
 * Note: Canvas is the database entity. MANUFACTURER is the ImageType of the processed image.
 * 
 * @param canvasId - The Canvas ID to check
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
          source: true,
        },
      },
    },
  });

  if (!canvas || canvas.userId !== session.user.id) {
    return null;
  }

  const rawImage = canvas.images.find((img) => img.type === ImageType.RAW);
  const manufacturerImage = canvas.images.find((img) => img.type === ImageType.MANUFACTURER);

  return {
    hasRaw: !!rawImage,
    hasManufacturerImage: !!manufacturerImage,
    rawUrl: rawImage?.url,
    manufacturerImageUrl: manufacturerImage?.url,
    rawSource: rawImage?.source,
  };
}
