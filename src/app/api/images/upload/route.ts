import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import {
  validateAuthentication,
  validateProjectOwnership,
  validateRequiredParams,
  parseUploadParams,
} from "@/lib/upload/validation";
import {
  validateAndNormalizeConfig,
  ALLOWED_CONTENT_TYPES,
} from "@/lib/upload/config";
import { prisma } from "@/lib/prisma";
import {
  getCanvasImagePath,
  getRawImagePath,
  uploadImageBuffer,
} from "@/lib/upload/storage";
import {
  extractImageMetadata,
  calculateStitchDimensions,
  resizeImageForNeedlepoint,
  processImageForManufacturing,
  downloadImageBuffer,
} from "@/lib/upload/image-processing";
import { applyColorCorrection } from "@/lib/colors";
import { ImageSource, ImageType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        // 1) Auth and ownership
        const userId = await validateAuthentication();
        const params = parseUploadParams(clientPayload);
        validateRequiredParams(params);
        await validateProjectOwnership(params.projectId!, userId);

        // 2) Normalize and persist Canvas immediately (confirm-first)
        const config = validateAndNormalizeConfig({
          meshCount: params.meshCount,
          width: params.width,
          numColors: params.numColors,
        });

        const canvas = await prisma.canvas.create({
          data: {
            project: { connect: { id: params.projectId! } },
            user: { connect: { id: userId } },
            meshCount: config.meshCount,
            width: config.width,
            numColors: config.numColors,
            threads: [],
          },
          select: { id: true, projectId: true },
        });

        const pathname = getRawImagePath(userId, canvas.projectId, canvas.id);

        return {
          allowedContentTypes: [...ALLOWED_CONTENT_TYPES],
          addRandomSuffix: true,
          pathname,
          tokenPayload: JSON.stringify({
            userId,
            projectId: params.projectId,
            canvasId: canvas.id,
            meshCount: config.meshCount,
            width: config.width,
            numColors: config.numColors,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        try {
          // Parse token payload
          const parsed = JSON.parse(tokenPayload ?? "{}") as {
            projectId?: string;
            userId?: string;
            canvasId?: string;
            meshCount?: number;
            width?: number;
            numColors?: number;
          };

          const { projectId, userId, canvasId } = parsed;
          if (!projectId || !userId || !canvasId) {
            throw new Error("Missing identifiers in tokenPayload");
          }

          await validateProjectOwnership(projectId, userId);

          // 1) Create RAW image record (already uploaded at deterministic path)
          await prisma.image.create({
            data: {
              url: blob.url,
              type: ImageType.RAW,
              source: ImageSource.USER_UPLOAD,
              canvas: { connect: { id: canvasId } },
              project: { connect: { id: projectId } },
              user: { connect: { id: userId } },
            },
          });

          // 2) Download RAW and process
          const rawBuffer = await downloadImageBuffer(blob.url);
          const metadata = await extractImageMetadata(rawBuffer);
          const { width: widthInches, meshCount, numColors } = {
            width: parsed.width!,
            meshCount: parsed.meshCount!,
            numColors: parsed.numColors!,
          };
          const { widthInStitches, heightInStitches } = calculateStitchDimensions(
            widthInches,
            meshCount,
            metadata.aspectRatio
          );
          const resized = await resizeImageForNeedlepoint(
            rawBuffer,
            widthInStitches,
            heightInStitches
          );
          const corrected = await applyColorCorrection(resized);
          const { canvasImageBuffer, threads } = await processImageForManufacturing(
            corrected,
            numColors
          );

          // 3) Upload CANVAS image to same folder
          const canvasPngPath = getCanvasImagePath(userId, projectId, canvasId);
          const canvasBlob = await uploadImageBuffer(canvasImageBuffer, canvasPngPath);

          // 4) Persist CANVAS image and update Canvas threads
          await prisma.image.create({
            data: {
              url: canvasBlob.url,
              type: ImageType.CANVAS,
              source: ImageSource.AI_GENERATED,
              canvas: { connect: { id: canvasId } },
              project: { connect: { id: projectId } },
              user: { connect: { id: userId } },
            },
          });

          await prisma.canvas.update({
            where: { id: canvasId },
            data: { threads: threads.map((t) => t.floss) },
          });

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