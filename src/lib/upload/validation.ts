import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface UploadParams {
  projectId?: string;
  meshCount?: number;
  width?: number;
  numColors?: number;
}

/**
 * Validates and extracts upload parameters from client payload
 */
export function parseUploadParams(
  clientPayload: unknown
): UploadParams {
  try {
    return typeof clientPayload === "string"
      ? JSON.parse(clientPayload)
      : (clientPayload as UploadParams);
  } catch {
    return {};
  }
}

/**
 * Validates that the user is authenticated
 * @returns The authenticated user's ID
 * @throws Error if user is not authenticated
 */
export async function validateAuthentication(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  return session.user.id;
}

/**
 * Validates that the user owns the specified project
 * @param projectId The project ID to validate
 * @param userId The authenticated user's ID
 * @throws Error if project doesn't exist or user doesn't own it
 */
export async function validateProjectOwnership(
  projectId: string,
  userId: string
): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, userId: true },
  });

  if (!project || project.userId !== userId) {
    throw new Error("Not authorized to access this project");
  }
}

/**
 * Validates that required upload parameters are present
 * @param params The parsed upload parameters
 * @throws Error if required parameters are missing
 */
export function validateRequiredParams(params: UploadParams): void {
  if (!params.projectId) {
    throw new Error("Missing projectId");
  }
  if (
    params.meshCount === undefined ||
    params.width === undefined ||
    params.numColors === undefined
  ) {
    throw new Error("Missing required canvas configuration");
  }
}

