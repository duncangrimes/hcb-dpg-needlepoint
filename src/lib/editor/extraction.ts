/**
 * Pixel extraction from lasso selection
 * Creates a cutout image with transparency outside the lasso path
 */

import type { Point } from "@/types/editor";
import { pointInPolygon, getPolygonBounds } from "./geometry";

/**
 * Extract pixels from an image within a lasso path
 * Returns a data URL of the extracted region with transparency
 */
export async function extractCutout(
  imageUrl: string,
  path: Point[],
  options: {
    padding?: number;  // Extra pixels around bounding box
    featherRadius?: number;  // Edge feathering (anti-alias)
  } = {}
): Promise<{
  dataUrl: string;
  width: number;
  height: number;
  bounds: { x: number; y: number; width: number; height: number };
}> {
  const { padding = 2, featherRadius = 1 } = options;

  // Load the image
  const img = await loadImage(imageUrl);
  const imgWidth = img.width;
  const imgHeight = img.height;

  // Convert normalized path to pixel coordinates
  const pixelPath = path.map((p) => ({
    x: p.x * imgWidth,
    y: p.y * imgHeight,
  }));

  // Get bounding box in pixels
  const bounds = getPolygonBounds(pixelPath);
  
  // Add padding
  const cropX = Math.max(0, Math.floor(bounds.minX) - padding);
  const cropY = Math.max(0, Math.floor(bounds.minY) - padding);
  const cropWidth = Math.min(
    imgWidth - cropX,
    Math.ceil(bounds.width) + padding * 2
  );
  const cropHeight = Math.min(
    imgHeight - cropY,
    Math.ceil(bounds.height) + padding * 2
  );

  // Create canvas for extraction
  const canvas = document.createElement("canvas");
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  // Draw the cropped region
  ctx.drawImage(
    img,
    cropX, cropY, cropWidth, cropHeight,  // Source rect
    0, 0, cropWidth, cropHeight            // Dest rect
  );

  // Get image data to manipulate pixels
  const imageData = ctx.getImageData(0, 0, cropWidth, cropHeight);
  const data = imageData.data;

  // Adjust path coordinates relative to crop
  const localPath = pixelPath.map((p) => ({
    x: p.x - cropX,
    y: p.y - cropY,
  }));

  // Pre-compute bounds for fast rejection in pointInPolygon (30-50% faster)
  const localBounds = getPolygonBounds(localPath);
  const boundsForCheck = {
    minX: localBounds.minX,
    minY: localBounds.minY,
    maxX: localBounds.maxX,
    maxY: localBounds.maxY,
  };

  // Apply mask: set alpha to 0 for pixels outside the path
  for (let y = 0; y < cropHeight; y++) {
    for (let x = 0; x < cropWidth; x++) {
      const idx = (y * cropWidth + x) * 4;
      const point = { x, y };

      if (!pointInPolygon(point, localPath, boundsForCheck)) {
        // Outside the lasso - make transparent
        data[idx + 3] = 0;
      } else if (featherRadius > 0) {
        // Inside but near edge - apply feathering
        const distToEdge = distanceToPolygonEdge(point, localPath);
        if (distToEdge < featherRadius) {
          const alpha = data[idx + 3];
          const featherAlpha = Math.round(alpha * (distToEdge / featherRadius));
          data[idx + 3] = featherAlpha;
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: cropWidth,
    height: cropHeight,
    bounds: {
      x: cropX / imgWidth,
      y: cropY / imgHeight,
      width: cropWidth / imgWidth,
      height: cropHeight / imgHeight,
    },
  };
}

/**
 * Load an image from URL (supports both blob URLs and data URLs)
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Only set crossOrigin for external URLs, not data URLs
    if (!url.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Calculate minimum distance from a point to the polygon edge
 */
function distanceToPolygonEdge(point: Point, polygon: Point[]): number {
  let minDist = Infinity;

  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const dist = pointToLineDistance(point, polygon[i], polygon[j]);
    minDist = Math.min(minDist, dist);
  }

  return minDist;
}

/**
 * Distance from point to line segment
 */
function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
  }

  const t = Math.max(0, Math.min(1,
    ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSq
  ));

  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;

  return Math.hypot(point.x - projX, point.y - projY);
}

/**
 * Create a thumbnail of a cutout for the layer panel
 */
export async function createCutoutThumbnail(
  dataUrl: string,
  maxSize: number = 80
): Promise<string> {
  const img = await loadImage(dataUrl);
  
  // Calculate thumbnail size maintaining aspect ratio
  const scale = Math.min(maxSize / img.width, maxSize / img.height);
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL("image/png");
}
