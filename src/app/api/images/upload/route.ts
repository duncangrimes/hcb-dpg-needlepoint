import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        let parsed: any = {};
        try {
          parsed = typeof clientPayload === "string" ? JSON.parse(clientPayload) : clientPayload;
        } catch {}
        const projectId = parsed?.projectId as string | undefined;

        if (!projectId) {
          throw new Error("Missing projectId");
        }

        // Ensure the authenticated user owns the project
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { id: true, userId: true },
        });

        if (!project || project.userId !== session.user.id) {
          throw new Error("Not authorized to upload to this project");
        }

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId: session.user.id,
            projectId,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        try {
          const { projectId, userId } = JSON.parse(tokenPayload ?? "{}") as {
            projectId?: string;
            userId?: string;
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

          await prisma.image.create({
            data: {
              url: blob.url,
              projectId,
            },
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

 