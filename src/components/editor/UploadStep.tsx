"use client";

import { useRef, useState } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { saveSourceImage } from "@/actions/sourceImages";

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
      // Create object URL for preview
      const url = URL.createObjectURL(file);

      // Get image dimensions
      const img = new Image();
      img.src = url;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Convert to base64 for upload
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Save to database
      const result = await saveSourceImage({
        dataUrl,
        width: img.naturalWidth,
        height: img.naturalHeight,
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

      // Revoke the local blob URL (we're using the stored one now)
      URL.revokeObjectURL(url);
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            🧵 Needlepoint
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Turn your photos into custom needlepoint canvases
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Upload buttons */}
        <div className="space-y-4">
          {/* Camera button - primary */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={isUploading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 text-white rounded-xl font-medium text-lg hover:bg-indigo-700 active:scale-[0.98] transition touch-target disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-700 rounded-xl font-medium text-lg hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-[0.98] transition touch-target disabled:opacity-50 disabled:cursor-not-allowed"
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
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Tip: Photos with clear subjects work best
        </p>
      </div>
    </div>
  );
}
