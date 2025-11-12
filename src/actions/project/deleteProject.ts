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
        images: {
          select: {
            id: true,
            url: true,
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

    // Delete all blob storage files for images in this project
    // Since images are project-scoped, we can delete all of them
    for (const image of project.images) {
      try {
        await del(image.url);
        console.log(`Deleted image blob: ${image.url}`);
      } catch (error) {
        console.warn(`Failed to delete image blob: ${image.url}`, error);
      }
    }

    // Delete project from database
    // Cascade rules in schema will handle:
    // - Canvases (onDelete: Cascade)
    // - Images (onDelete: Cascade) 
    // - Join table entries (automatic with Prisma)
    await prisma.project.delete({ 
      where: { id: projectId } 
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete project", { projectId, error });
    return { success: false, error: "Failed to delete project." };
  }
}


