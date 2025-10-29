"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";

export async function deleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated." };
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { 
        id: true, 
        userId: true,
        canvases: {
          select: {
            id: true,
            originalImage: true,
            manufacturerImage: true,
          },
        },
      },
    });

    if (!project) {
      return { success: false, error: "Project not found." };
    }

    if (project.userId !== session.user.id) {
      return { success: false, error: "Not authorized to delete this project." };
    }

    console.log(`Deleting project ${projectId} by user ${session.user.id}`);

    // Delete all blob storage files for canvases in this project
    for (const canvas of project.canvases) {
      try {
        await del(canvas.originalImage);
        console.log(`Deleted original image blob: ${canvas.originalImage}`);
      } catch (error) {
        console.warn(`Failed to delete original image blob: ${canvas.originalImage}`, error);
      }

      if (canvas.manufacturerImage) {
        try {
          await del(canvas.manufacturerImage);
          console.log(`Deleted manufacturer image blob: ${canvas.manufacturerImage}`);
        } catch (error) {
          console.warn(`Failed to delete manufacturer image blob: ${canvas.manufacturerImage}`, error);
        }
      }
    }

    // Delete all canvases and the project from the database
    await prisma.$transaction([
      prisma.canvas.deleteMany({ where: { projectId } }),
      prisma.project.delete({ where: { id: projectId } }),
    ]);

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete project", { projectId, error });
    return { success: false, error: "Failed to delete project." };
  }
}


