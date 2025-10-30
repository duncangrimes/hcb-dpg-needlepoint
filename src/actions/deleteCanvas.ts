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
          canvases: {
            select: {
              id: true,
            },
          },
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

  // Identify images that are only connected to this canvas
  // These should be deleted from storage and database
  const imagesToDelete = canvas.images.filter(
    (image) => image.canvases.length === 1 && image.canvases[0].id === canvasId
  );

  // Delete blobs for images that won't be used by other canvases
  await Promise.all(
    imagesToDelete.map(async (image) => {
      try {
        await del(image.url);
        console.log(`Deleted image blob: ${image.url}`);
      } catch (error) {
        console.warn(`Failed to delete image blob: ${image.url}`, error);
      }
    })
  );

  // Delete the canvas from the database
  // This disconnects it from shared images automatically via the join table
  await prisma.canvas.delete({
    where: { id: canvasId },
  });

  // Delete orphaned images (images that are no longer connected to any canvas)
  if (imagesToDelete.length > 0) {
    await prisma.image.deleteMany({
      where: {
        id: {
          in: imagesToDelete.map((img) => img.id),
        },
      },
    });
    console.log(`Deleted ${imagesToDelete.length} orphaned images`);
  }

  revalidatePath(`/project/${canvas.project.id}`);
}
