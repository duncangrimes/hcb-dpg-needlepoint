/**
 * Web Worker for cutout extraction
 * Runs heavy pixel processing off the main thread
 */

import type { Point } from "@/types/editor";

interface ExtractionMessage {
  type: "extract";
  id: string;
  imageData: ImageData;
  path: Point[];
  cropX: number;
  cropY: number;
  imgWidth: number;
  imgHeight: number;
  featherRadius: number;
}

interface ExtractionResult {
  type: "result";
  id: string;
  imageData: ImageData;
}

interface ExtractionError {
  type: "error";
  id: string;
  error: string;
}

// Bounds type for fast rejection
interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
function pointInPolygon(point: Point, polygon: Point[], bounds?: Bounds): boolean {
  if (polygon.length < 3) return false;

  const { x, y } = point;

  // Fast rejection: check bounds first
  if (bounds) {
    if (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY) {
      return false;
    }
  }

  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    if (
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Get the bounding box of a polygon
 */
function getPolygonBounds(polygon: Point[]): Bounds & { width: number; height: number } {
  if (polygon.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of polygon) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
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
 * Process extraction in the worker
 */
function processExtraction(msg: ExtractionMessage): ImageData {
  const { imageData, path, cropX, cropY, imgWidth, imgHeight, featherRadius } = msg;
  const data = imageData.data;
  const cropWidth = imageData.width;
  const cropHeight = imageData.height;

  // Convert normalized path to pixel coordinates relative to crop
  const localPath = path.map((p) => ({
    x: p.x * imgWidth - cropX,
    y: p.y * imgHeight - cropY,
  }));

  // Pre-compute bounds for fast rejection
  const bounds = getPolygonBounds(localPath);

  // Apply mask: set alpha to 0 for pixels outside the path
  for (let y = 0; y < cropHeight; y++) {
    for (let x = 0; x < cropWidth; x++) {
      const idx = (y * cropWidth + x) * 4;
      const point = { x, y };

      if (!pointInPolygon(point, localPath, bounds)) {
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

  return imageData;
}

// Handle messages from main thread
self.onmessage = (e: MessageEvent<ExtractionMessage>) => {
  const msg = e.data;
  
  if (msg.type === "extract") {
    try {
      const result = processExtraction(msg);
      
      // Post result back with transferable ImageData buffer
      const response: ExtractionResult = {
        type: "result",
        id: msg.id,
        imageData: result,
      };
      
      self.postMessage(response, { transfer: [result.data.buffer] });
    } catch (err) {
      const response: ExtractionError = {
        type: "error",
        id: msg.id,
        error: err instanceof Error ? err.message : String(err),
      };
      self.postMessage(response);
    }
  }
};

export {};
