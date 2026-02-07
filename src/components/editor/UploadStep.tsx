"use client";

import { useRef, useState } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { saveSourceImage } from "@/actions/sourceImages";

// Max dimension for uploaded images (reduces upload time significantly)
const MAX_IMAGE_DIMENSION = 2048;

/**
 * Resize an image if it exceeds max dimensions
 * Returns a data URL of the resized image
 */
async function resizeImage(
  file: File,
  maxDimension: number
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      let { width, height } = img;
      
      // Check if resize is needed
      if (width <= maxDimension && height <= maxDimension) {
        // No resize needed, just convert to data URL
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        resolve({
          dataUrl: canvas.toDataURL("image/jpeg", 0.9),
          width,
          height,
        });
        return;
      }
      
      // Calculate new dimensions maintaining aspect ratio
      if (width > height) {
        height = Math.round((height / width) * maxDimension);
        width = maxDimension;
      } else {
        width = Math.round((width / height) * maxDimension);
        height = maxDimension;
      }
      
      // Create canvas and draw resized image
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      
      // Use better quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);
      
      resolve({
        dataUrl: canvas.toDataURL("image/jpeg", 0.9),
        width,
        height,
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    
    img.src = url;
  });
}

export function UploadStep() {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const addSourceImage = useEditorStore((s) => s.addSourceImage);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      // Resize image if needed (reduces upload time significantly)
      const { dataUrl, width, height } = await resizeImage(file, MAX_IMAGE_DIMENSION);

      // Save to database
      const result = await saveSourceImage({
        dataUrl,
        width,
        height,
      });

      if (!result.success || !result.sourceImage) {
        throw new Error(result.error || "Failed to save image");
      }

      // Add to store with the real DB id and blob storage URL
      addSourceImage({
        id: result.sourceImage.id,
        url: result.sourceImage.url,
        width: result.sourceImage.width,
        height: result.sourceImage.height,
      });
    } catch (err) {
      console.error("Upload failed:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Logo/Title */}
        <div>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white">
            🧵 Needlepoint
          </h1>
          <p className="mt-2 text-stone-600 dark:text-stone-400">
            Turn your photos into custom needlepoint canvases
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-error-light dark:bg-error/20 border border-error/30 dark:border-error-dark rounded-lg p-3 text-error dark:text-error-light text-sm">
            {error}
          </div>
        )}

        {/* Upload buttons */}
        <div className="space-y-4">
          {/* Camera button - primary */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={isUploading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-terracotta-500 text-white rounded-xl font-medium text-lg hover:bg-terracotta-600 active:scale-[0.98] transition touch-target disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <span className="animate-spin">⏳</span>
                Uploading...
              </>
            ) : (
              <>
                <span className="text-2xl">📷</span>
                Take Photo
              </>
            )}
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />

          {/* Library button - secondary */}
          <button
            onClick={() => libraryInputRef.current?.click()}
            disabled={isUploading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-stone-800 text-stone-900 dark:text-white border-2 border-stone-200 dark:border-stone-700 rounded-xl font-medium text-lg hover:bg-stone-50 dark:hover:bg-stone-700 active:scale-[0.98] transition touch-target disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-2xl">🖼️</span>
            Choose from Library
          </button>
          <input
            ref={libraryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {/* Hint */}
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Tip: Photos with clear subjects work best
        </p>
      </div>
    </div>
  );
}
