"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";

export async function deleteCanvas(canvasId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated.");
  }

  // Find the canvas and verify ownership through the project
  const canvas = await prisma.canvas.findUnique({
    where: { id: canvasId },
    select: {
      id: true,
      images: {
        select: {
          id: true,
          url: true,
        },
      },
      project: {
        select: {
          userId: true,
          id: true,
        },
      },
    },
  });

  if (!canvas) {
    throw new Error("Canvas not found.");
  }

  if (canvas.project.userId !== session.user.id) {
    throw new Error("Not authorized to delete this canvas.");
  }

  console.log(`Deleting canvas ${canvasId} by user ${session.user.id}`);

  // Delete blobs for images associated with this canvas
  await Promise.all(
    canvas.images.map(async (image) => {
      try {
        await del(image.url);
        console.log(`Deleted image blob: ${image.url}`);
      } catch (error) {
        console.warn(`Failed to delete image blob: ${image.url}`, error);
      }
    })
  );

  // Delete the canvas from the database
  // Related images will be deleted automatically via ON DELETE CASCADE
  await prisma.canvas.delete({
    where: { id: canvasId },
  });

  revalidatePath(`/project/${canvas.project.id}`);
}
