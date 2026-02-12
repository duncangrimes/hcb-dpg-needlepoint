/**
 * Extraction Promise Cache
 * 
 * Manages pending extraction promises so ArrangeCanvas can await
 * extractions that started in LassoCanvas.
 * 
 * This enables "eager extraction" - extraction starts immediately
 * when lasso completes, not when user navigates to canvas.
 */

import type { Point } from "@/types/editor";

export interface ExtractionResult {
  dataUrl: string;
  width: number;
  height: number;
  bounds: { x: number; y: number; width: number; height: number };
}

interface PendingExtraction {
  promise: Promise<ExtractionResult>;
  startedAt: number;
}

// Cache of pending/completed extractions by cutout ID
const extractionCache = new Map<string, PendingExtraction>();

// Cache of completed results (dataUrls) for quick lookup
const resultCache = new Map<string, ExtractionResult>();

/**
 * Start an extraction and cache the promise
 */
export function startExtraction(
  cutoutId: string,
  sourceUrl: string,
  path: Point[],
  extractFn: (url: string, path: Point[]) => Promise<ExtractionResult>
): Promise<ExtractionResult> {
  // Check if we already have a result
  const cached = resultCache.get(cutoutId);
  if (cached) {
    console.log(`[extraction-cache] Using cached result for ${cutoutId}`);
    return Promise.resolve(cached);
  }

  // Check if extraction is already in progress
  const pending = extractionCache.get(cutoutId);
  if (pending) {
    console.log(`[extraction-cache] Returning existing promise for ${cutoutId}`);
    return pending.promise;
  }

  // Start new extraction
  console.log(`[extraction-cache] Starting extraction for ${cutoutId}`);
  const startedAt = Date.now();
  
  const promise = extractFn(sourceUrl, path)
    .then((result) => {
      const elapsed = Date.now() - startedAt;
      console.log(`[extraction-cache] Completed ${cutoutId} in ${elapsed}ms`);
      resultCache.set(cutoutId, result);
      return result;
    })
    .catch((err) => {
      console.error(`[extraction-cache] Failed ${cutoutId}:`, err);
      // Remove from cache on failure so it can be retried
      extractionCache.delete(cutoutId);
      throw err;
    });

  extractionCache.set(cutoutId, { promise, startedAt });
  return promise;
}

/**
 * Get extraction result if available (sync check)
 */
export function getExtractionResult(cutoutId: string): ExtractionResult | null {
  return resultCache.get(cutoutId) ?? null;
}

/**
 * Check if extraction is in progress
 */
export function isExtractionPending(cutoutId: string): boolean {
  return extractionCache.has(cutoutId) && !resultCache.has(cutoutId);
}

/**
 * Wait for extraction to complete (returns cached result if available)
 */
export async function awaitExtraction(cutoutId: string): Promise<ExtractionResult | null> {
  // Check result cache first
  const cached = resultCache.get(cutoutId);
  if (cached) return cached;

  // Check pending extractions
  const pending = extractionCache.get(cutoutId);
  if (pending) {
    try {
      return await pending.promise;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Clear extraction cache for a cutout (e.g., when cutout is deleted)
 */
export function clearExtraction(cutoutId: string): void {
  extractionCache.delete(cutoutId);
  resultCache.delete(cutoutId);
}

/**
 * Clear all extraction caches
 */
export function clearAllExtractions(): void {
  extractionCache.clear();
  resultCache.clear();
}

/**
 * Get cache stats for debugging
 */
export function getCacheStats(): { pending: number; completed: number } {
  return {
    pending: extractionCache.size - resultCache.size,
    completed: resultCache.size,
  };
}
