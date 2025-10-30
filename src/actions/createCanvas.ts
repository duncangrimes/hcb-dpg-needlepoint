"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Thread } from "@/lib/colors";
import { ImageSource, ImageType } from "@prisma/client";

export interface CreateCanvasParams {
  projectId: string;
  userId: string; // Add userId paramenter
  meshCount: number;
  width: number;
  numColors: number;
  rawImageUrl: string;
  canvasImageUrl: string;
  threads: Thread[];
}

export async function createCanvas(params: CreateCanvasParams) {
  const { userId } = params;

  // Verify the user owns the project
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    select: { id: true, userId: true },
  });

  if (!project || project.userId !== userId) {
    throw new Error("Not authorized to create canvas for this project");
  }

  const serializedThreads = params.threads.map((thread) => thread.floss);

  const canvas = await prisma.canvas.create({
    data: {
      project: {
        connect: { id: params.projectId },
      },
      user: {
        connect: { id: userId },
      },
      meshCount: params.meshCount,
      width: params.width,
      numColors: params.numColors,
      threads: serializedThreads,
      images: {
        create: [
          {
            url: params.rawImageUrl,
            type: ImageType.RAW,
            source: ImageSource.USER_UPLOAD,
            project: {
              connect: { id: params.projectId },
            },
            user: {
              connect: { id: userId },
            },
          },
          {
            url: params.canvasImageUrl,
            type: ImageType.CANVAS,
            source: ImageSource.AI_GENERATED,
            project: {
              connect: { id: params.projectId },
            },
            user: {
              connect: { id: userId },
            },
          },
        ],
      },
    },
    include: {
      images: true,
    },
  });

  revalidatePath(`/project/${params.projectId}`);
  return canvas;
}
