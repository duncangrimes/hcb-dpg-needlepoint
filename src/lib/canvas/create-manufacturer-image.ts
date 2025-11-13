import { prisma } from "@/lib/prisma";
import { getManufacturerImagePath, uploadImageBuffer } from "@/lib/upload/storage";
import { ImageSource, ImageType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { Thread } from "@/lib/colors";

export interface CreateManufacturerImageParams {
  canvasId: string;
  userId: string;
  projectId: string;
  manufacturerImageBuffer: Buffer;
  threads: Thread[];
  source: ImageSource;
}

/**
 * Creates a MANUFACTURER image for a canvas by:
 * 1. Uploading the processed image to blob storage
 * 2. Creating the MANUFACTURER image record in the database
 * 3. Updating the canvas with the thread list
 * 4. Revalidating the project path
 * 
 * This is the shared logic used by both user uploads and AI-generated images.
 * 
 * @param params - Parameters for creating the manufacturer image
 * @returns The created image record
 */
export async function createManufacturerImage(
  params: CreateManufacturerImageParams
) {
  const { canvasId, userId, projectId, manufacturerImageBuffer, threads, source } = params;

  // 1. Upload manufacturer image to blob storage
  const manufacturerImagePath = getManufacturerImagePath(userId, projectId, canvasId);
  const manufacturerImageBlob = await uploadImageBuffer(
    manufacturerImageBuffer,
    manufacturerImagePath
  );

  // 2. Create MANUFACTURER image record
  const manufacturerImage = await prisma.image.create({
    data: {
      url: manufacturerImageBlob.url,
      type: ImageType.MANUFACTURER,
      source,
      canvas: { connect: { id: canvasId } },
      project: { connect: { id: projectId } },
      user: { connect: { id: userId } },
    },
  });

  // 3. Update canvas with threads
  await prisma.canvas.update({
    where: { id: canvasId },
    data: { threads: threads.map((t) => t.floss) },
  });

  // 4. Revalidate project path to show MANUFACTURER image
  revalidatePath(`/project/${projectId}`);

  return manufacturerImage;
}

