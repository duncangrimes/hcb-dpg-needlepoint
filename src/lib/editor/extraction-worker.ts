/**
 * Web Worker wrapper for cutout extraction
 * Falls back to main-thread extraction if workers aren't available
 */

import type { Point } from "@/types/editor";
import { getPolygonBounds } from "./geometry";

// Singleton worker instance
let worker: Worker | null = null;
let workerSupported: boolean | null = null;

// Pending extraction callbacks
const pendingExtractions = new Map<string, {
  resolve: (data: ImageData) => void;
  reject: (error: Error) => void;
}>();

/**
 * Initialize the extraction worker
 */
function initWorker(): Worker | null {
  if (workerSupported === false) return null;
  if (worker) return worker;

  try {
    // Check if we're in a browser environment with Worker support
    if (typeof window === "undefined" || !window.Worker) {
      console.log("[extraction-worker] No Worker support, using main thread");
      workerSupported = false;
      return null;
    }

    // Create worker from URL
    console.log("[extraction-worker] Creating Web Worker...");
    worker = new Worker(
      new URL("../../workers/extraction.worker.ts", import.meta.url),
      { type: "module" }
    );

    // Handle messages from worker
    worker.onmessage = (e) => {
      const msg = e.data;
      const pending = pendingExtractions.get(msg.id);
      
      if (!pending) return;
      pendingExtractions.delete(msg.id);

      if (msg.type === "result") {
        console.log(`[extraction-worker] Worker completed: ${msg.id}`);
        pending.resolve(msg.imageData);
      } else if (msg.type === "error") {
        console.error(`[extraction-worker] Worker error: ${msg.error}`);
        pending.reject(new Error(msg.error));
      }
    };

    worker.onerror = (e) => {
      console.error("[extraction-worker] Worker error:", e);
      // Reject all pending extractions
      for (const [id, { reject }] of pendingExtractions) {
        reject(new Error("Worker error"));
        pendingExtractions.delete(id);
      }
      // Mark worker as unsupported after error
      workerSupported = false;
      worker = null;
    };

    console.log("[extraction-worker] Web Worker initialized successfully");
    workerSupported = true;
    return worker;
  } catch (err) {
    console.warn("[extraction-worker] Web Worker failed, using main thread:", err);
    workerSupported = false;
    return null;
  }
}

/**
 * Generate unique ID for extraction requests
 */
let extractionId = 0;
function generateId(): string {
  return `extraction-${++extractionId}-${Date.now()}`;
}

/**
 * Extract cutout using Web Worker (or fallback to main thread)
 */
export async function extractCutoutWithWorker(
  imageUrl: string,
  path: Point[],
  options: {
    padding?: number;
    featherRadius?: number;
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
  const cropWidth = Math.min(imgWidth - cropX, Math.ceil(bounds.width) + padding * 2);
  const cropHeight = Math.min(imgHeight - cropY, Math.ceil(bounds.height) + padding * 2);

  // Create canvas and get image data
  const canvas = document.createElement("canvas");
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  // Draw the cropped region
  ctx.drawImage(
    img,
    cropX, cropY, cropWidth, cropHeight,
    0, 0, cropWidth, cropHeight
  );

  // Get image data
  const imageData = ctx.getImageData(0, 0, cropWidth, cropHeight);

  // Try to use worker
  const workerInstance = initWorker();
  const extractionStart = Date.now();
  
  if (workerInstance) {
    // Process in worker (off main thread)
    const id = generateId();
    console.log(`[extraction-worker] Processing ${cropWidth}x${cropHeight} in Web Worker...`);
    
    const processedImageData = await new Promise<ImageData>((resolve, reject) => {
      pendingExtractions.set(id, { resolve, reject });
      
      // Send to worker with transferable buffer
      workerInstance.postMessage({
        type: "extract",
        id,
        imageData,
        path,
        cropX,
        cropY,
        imgWidth,
        imgHeight,
        featherRadius,
      }, [imageData.data.buffer]);
    });

    console.log(`[extraction-worker] Worker extraction took ${Date.now() - extractionStart}ms`);
    // Put processed data back on canvas
    ctx.putImageData(processedImageData, 0, 0);
  } else {
    console.log(`[extraction-worker] Processing ${cropWidth}x${cropHeight} on MAIN THREAD (fallback)...`);
    // Fallback: process on main thread (original implementation)
    const { pointInPolygon } = await import("./geometry");
    const data = imageData.data;

    // Adjust path coordinates relative to crop
    const localPath = pixelPath.map((p) => ({
      x: p.x - cropX,
      y: p.y - cropY,
    }));

    // Pre-compute bounds for fast rejection
    const localBounds = getPolygonBounds(localPath);
    const boundsForCheck = {
      minX: localBounds.minX,
      minY: localBounds.minY,
      maxX: localBounds.maxX,
      maxY: localBounds.maxY,
    };

    // Apply mask
    for (let y = 0; y < cropHeight; y++) {
      for (let x = 0; x < cropWidth; x++) {
        const idx = (y * cropWidth + x) * 4;
        const point = { x, y };

        if (!pointInPolygon(point, localPath, boundsForCheck)) {
          data[idx + 3] = 0;
        } else if (featherRadius > 0) {
          const distToEdge = distanceToPolygonEdge(point, localPath);
          if (distToEdge < featherRadius) {
            const alpha = data[idx + 3];
            const featherAlpha = Math.round(alpha * (distToEdge / featherRadius));
            data[idx + 3] = featherAlpha;
          }
        }
      }
    }

    console.log(`[extraction-worker] Main thread extraction took ${Date.now() - extractionStart}ms`);
    ctx.putImageData(imageData, 0, 0);
  }

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
 * Load an image from URL
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
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
 * (Used in fallback mode)
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
 * Check if Web Workers are supported and the extraction worker is available
 */
export function isWorkerSupported(): boolean {
  if (workerSupported !== null) return workerSupported;
  initWorker();
  return workerSupported ?? false;
}

/**
 * Terminate the worker (cleanup)
 */
export function terminateWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
    workerSupported = null;
  }
}
