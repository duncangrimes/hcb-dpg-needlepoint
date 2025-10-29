"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface CreateCanvasParams {
  projectId: string;
  userId: string; // Add userId parameter
  meshCount: number;
  width: number;
  numColors: number;
  originalImageUrl: string;
  manufacturerImageUrl?: string;
}

export async function createCanvas(params: CreateCanvasParams) {
  // Remove auth check since we're passing userId directly
  const { userId } = params;

  // Verify the user owns the project
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    select: { id: true, userId: true },
  });

  if (!project || project.userId !== userId) {
    throw new Error("Not authorized to create canvas for this project");
  }

  // Get the count of existing canvases in this project to generate the next name
  const canvasCount = await prisma.canvas.count({
    where: { projectId: params.projectId },
  });

  const canvasName = `Canvas ${canvasCount + 1}`;

  // Create the canvas
  const canvas = await prisma.canvas.create({
    data: {
      projectId: params.projectId,
      name: canvasName,
      meshCount: params.meshCount,
      width: params.width,
      numColors: params.numColors,
      originalImage: params.originalImageUrl,
      manufacturerImage: params.manufacturerImageUrl || null,
    },
  });

  revalidatePath(`/project/${params.projectId}`);
  return canvas;
}
