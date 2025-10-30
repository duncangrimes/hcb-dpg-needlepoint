import { put, del } from "@vercel/blob";

export interface UploadedBlob {
  url: string;
  path: string;
}

/**
 * Generates a folder path for organizing project canvases
 * @param projectId The project ID
 * @param timestamp Optional timestamp (defaults to current time)
 * @returns Folder path string
 */
export function generateCanvasFolderPath(
  projectId: string,
  timestamp?: number
): string {
  const ts = timestamp ?? Date.now();
  return `project-${projectId}/canvas-${ts}`;
}

/**
 * Uploads an image buffer to blob storage
 * @param buffer The image buffer to upload
 * @param path The full path including filename for the blob
 * @returns Uploaded blob information
 */
export async function uploadImageBuffer(
  buffer: Buffer,
  path: string
): Promise<UploadedBlob> {
  const blob = await put(path, buffer, {
    access: "public",
    contentType: "image/png",
  });

  return {
    url: blob.url,
    path,
  };
}

/**
 * Uploads the raw (user) image and processed canvas image to blob storage
 * @param projectId The project ID
 * @param rawBuffer The original raw image buffer
 * @param canvasBuffer The processed canvas image buffer
 * @param timestamp Optional timestamp for folder naming
 * @returns URLs for both uploaded images
 */
export async function uploadCanvasImages(
  projectId: string,
  rawBuffer: Buffer,
  canvasBuffer: Buffer,
  timestamp?: number
): Promise<{
  rawUrl: string;
  canvasUrl: string;
}> {
  const folderPath = generateCanvasFolderPath(projectId, timestamp);

  // Upload raw image
  const rawBlob = await uploadImageBuffer(
    rawBuffer,
    `${folderPath}/raw.png`
  );

  // Upload processed canvas image
  const canvasBlob = await uploadImageBuffer(
    canvasBuffer,
    `${folderPath}/canvas.png`
  );

  return {
    rawUrl: rawBlob.url,
    canvasUrl: canvasBlob.url,
  };
}

/**
 * Attempts to delete a blob from storage
 * @param blobUrl The URL of the blob to delete
 * @returns Promise that resolves when cleanup is complete (does not throw)
 */
export async function cleanupBlob(blobUrl: string): Promise<void> {
  try {
    await del(blobUrl);
    console.log(`🗑️  Cleaned up temporary blob: ${blobUrl}`);
  } catch (error) {
    console.warn(`Failed to clean up temporary blob: ${blobUrl}`, error);
  }
}

