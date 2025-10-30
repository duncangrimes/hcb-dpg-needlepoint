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
import { processUpload } from "@/lib/upload/orchestration";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        // Validate authentication
        const userId = await validateAuthentication();

        // Parse and validate upload parameters
        const params = parseUploadParams(clientPayload);
        validateRequiredParams(params);

        // Validate project ownership
        await validateProjectOwnership(params.projectId!, userId);

        // Normalize config for token payload (preserve original values)
        const config = validateAndNormalizeConfig(params);

        return {
          allowedContentTypes: [...ALLOWED_CONTENT_TYPES],
          addRandomSuffix: true, // Enable random suffix to prevent conflicts
          tokenPayload: JSON.stringify({
            userId,
            projectId: params.projectId,
            meshCount: params.meshCount,
            width: params.width,
            numColors: params.numColors,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        try {
          // Parse token payload
          const parsed = JSON.parse(tokenPayload ?? "{}") as {
            projectId?: string;
            userId?: string;
            meshCount?: number;
            width?: number;
            numColors?: number;
          };

          const { projectId, userId } = parsed;

          if (!projectId || !userId) {
            throw new Error("Missing identifiers in tokenPayload");
          }

          // Double-check ownership before processing
          await validateProjectOwnership(projectId, userId);

          // Validate and normalize configuration
          const config = validateAndNormalizeConfig({
            meshCount: parsed.meshCount,
            width: parsed.width,
            numColors: parsed.numColors,
          });

          // Process the upload through the complete pipeline
          await processUpload({
            blobUrl: blob.url,
            projectId,
            userId,
            config,
          });
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