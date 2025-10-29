// app/api/upload/route.ts (or wherever your API route is)
import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { put, del } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { getRepresentativeColors, getRepresentativeColorsMedianCut, getRepresentativeColorsWu, getThreadPalette, mapColorsToThreads, buildSegmentedManufacturerImage, buildDitheredManufacturerImage, applyEnhancedAntiAliasing, applyColorCorrection } from "@/lib/colors";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const session = await auth();
        if (!session?.user?.id) {
          throw new Error("Not authenticated");
        }
        const userId = session.user.id;
        let parsed: { projectId?: string; meshCount?: number; width?: number; numColors?: number } = {};
        try {
          parsed = typeof clientPayload === "string" ? JSON.parse(clientPayload) : clientPayload;
        } catch {}
        const projectId = parsed?.projectId as string | undefined;
        const meshCountRaw = parsed?.meshCount;
        const widthRaw = parsed?.width;
        const numColorsRaw = parsed?.numColors;

        if (!projectId) {
          throw new Error("Missing projectId");
        }

        // Ensure the authenticated user owns the project
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { id: true, userId: true },
        });

        if (!project || project.userId !== userId) {
          throw new Error("Not authorized to upload to this project");
        }

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          addRandomSuffix: false, // We'll handle the path structure ourselves
          tokenPayload: JSON.stringify({
            userId,
            projectId,
            meshCount: typeof meshCountRaw === "number" ? meshCountRaw : undefined,
            width: typeof widthRaw === "number" ? widthRaw : undefined,
            numColors: typeof numColorsRaw === "number" ? numColorsRaw : undefined,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        try {
          const { projectId, userId, meshCount, width, numColors } = JSON.parse(tokenPayload ?? "{}") as {
            projectId?: string;
            userId?: string;
            meshCount?: number;
            width?: number;
            numColors?: number;
          };

          if (!projectId || !userId) {
            throw new Error("Missing identifiers in tokenPayload");
          }

          // Double-check ownership before writing
          const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { userId: true },
          });
          if (!project || project.userId !== userId) {
            throw new Error("Not authorized to save image for this project");
          }

          // Validate inputs with sane defaults
          const mesh = typeof meshCount === "number" && [13, 18].includes(meshCount) ? meshCount : 13;
          const w = typeof width === "number" ? Math.min(14, Math.max(6, width)) : 8;
          const colors = typeof numColors === "number" ? Math.min(30, Math.max(3, numColors)) : 12;

          // Download original image to buffer
          const response = await fetch(blob.url);
          if (!response.ok) {
            throw new Error(`Failed to fetch uploaded image: ${response.status}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          const imageBuffer = Buffer.from(arrayBuffer);

          // Inspect metadata to preserve aspect ratio
          const metadata = await sharp(imageBuffer).metadata();
          const originalWidth = metadata.width ?? 0;
          const originalHeight = metadata.height ?? 0;
          if (!originalWidth || !originalHeight) {
            throw new Error("Unable to read image dimensions");
          }
          const aspectRatio = originalHeight / originalWidth;
          const canvasHeightInches = w * aspectRatio;

          // Calculate stitch dimensions
          const targetWidthInStitches = Math.round(w * mesh);
          const targetHeightInStitches = Math.round(canvasHeightInches * mesh);

          // Resize using high-quality downsampling with moderate saturation boost for bright needlepoint
          const resizedBuffer = await sharp(imageBuffer)
            .resize(targetWidthInStitches, targetHeightInStitches, {
              kernel: sharp.kernel.lanczos3,
              fit: "fill", // ensure exact pixel grid without cropping
            })
            .modulate({ saturation: 1.3, brightness: 1.02 }) // moderate saturation boost for bright results
            .blur(0.5) // slight blur to smooth transitions
            .png()
            .toBuffer();

          // Apply color correction (auto white balance + LAB processing)
          const correctedBuffer = await applyColorCorrection(resizedBuffer);

          // Note: correctedBuffer is used for processing but not stored separately

          // Use Wu's quantizer for smoother color transitions and reduced pixelation
          console.log(`🖼️  Processing image: ${targetWidthInStitches}×${targetHeightInStitches} stitches, ${colors} colors`);
          
          const { centroids, labels, width: reducedW, height: reducedH } = await getRepresentativeColorsWu(
            correctedBuffer,
            colors
          );
          const palette = await getThreadPalette();
          const mapped = mapColorsToThreads(centroids, palette);

          // Build manufacturer image using dithered approach for smoother results
          console.log(`🎨 Building dithered manufacturer image: ${reducedW}×${reducedH} pixels`);
          let manufacturerPngBuffer = await buildDitheredManufacturerImage(correctedBuffer, mapped);
          
          // Enhanced anti-aliasing post-processing for smoother transitions
          manufacturerPngBuffer = await applyEnhancedAntiAliasing(manufacturerPngBuffer);

          // Create Canvas row first to get the canvas ID
          const canvas = await prisma.canvas.create({
            data: {
              projectId,
              originalImage: "", // Will be updated after blob creation
              manufacturerImage: null, // Will be updated after blob creation
              meshCount: mesh,
              width: w,
              numColors: colors,
            },
          });

          // Create folder structure: project-{projectId}/canvas-{canvasId}/
          const folderPath = `project-${projectId}/canvas-${canvas.id}`;
          
          // Move the original image to the new folder structure
          const originalBlobName = `${folderPath}/original.png`;
          const originalBlob = await put(originalBlobName, imageBuffer, {
            access: "public",
            contentType: "image/png",
          });
          
          // Upload manufacturer image to the new folder structure
          const manufacturerBlobName = `${folderPath}/manufacturer.png`;
          const manufacturerBlob = await put(manufacturerBlobName, manufacturerPngBuffer, {
            access: "public",
            contentType: "image/png",
          });

          // Update the canvas with the correct image URLs
          await prisma.canvas.update({
            where: { id: canvas.id },
            data: {
              originalImage: originalBlob.url,
              manufacturerImage: manufacturerBlob.url,
            },
          });

          // Clean up the temporary blob that was uploaded initially
          try {
            await del(blob.url);
            console.log(`🗑️  Cleaned up temporary blob: ${blob.url}`);
          } catch (error) {
            console.warn(`Failed to clean up temporary blob: ${blob.url}`, error);
          }

          console.log(`✅ Upload complete: original=${originalBlob.url}, manufacturer=${manufacturerBlob.url}`);

          revalidatePath(`/project/${projectId}`);
        } catch (error) {
          console.error("Error finalizing upload:", error);
          throw error;
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}