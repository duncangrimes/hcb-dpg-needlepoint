"use client";

import { useRef } from "react";
import { useEditorStore } from "@/stores/editor-store";

export function UploadStep() {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const addSourceImage = useEditorStore((s) => s.addSourceImage);

  const handleFile = async (file: File | null) => {
    if (!file) return;

    // Create object URL for preview
    const url = URL.createObjectURL(file);

    // Get image dimensions
    const img = new Image();
    img.src = url;
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    addSourceImage({
      id: crypto.randomUUID(),
      url,
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
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

        {/* Upload buttons */}
        <div className="space-y-4">
          {/* Camera button - primary */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 text-white rounded-xl font-medium text-lg hover:bg-indigo-700 active:scale-[0.98] transition touch-target"
          >
            <span className="text-2xl">📷</span>
            Take Photo
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
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-700 rounded-xl font-medium text-lg hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-[0.98] transition touch-target"
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
