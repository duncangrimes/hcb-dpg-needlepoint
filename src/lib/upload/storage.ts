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
 * Uploads the original and manufacturer images to blob storage
 * @param projectId The project ID
 * @param originalBuffer The original image buffer
 * @param manufacturerBuffer The manufacturer image buffer
 * @param timestamp Optional timestamp for folder naming
 * @returns URLs for both uploaded images
 */
export async function uploadCanvasImages(
  projectId: string,
  originalBuffer: Buffer,
  manufacturerBuffer: Buffer,
  timestamp?: number
): Promise<{
  originalUrl: string;
  manufacturerUrl: string;
}> {
  const folderPath = generateCanvasFolderPath(projectId, timestamp);

  // Upload original image
  const originalBlob = await uploadImageBuffer(
    originalBuffer,
    `${folderPath}/original.png`
  );

  // Upload manufacturer image
  const manufacturerBlob = await uploadImageBuffer(
    manufacturerBuffer,
    `${folderPath}/manufacturer.png`
  );

  return {
    originalUrl: originalBlob.url,
    manufacturerUrl: manufacturerBlob.url,
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

