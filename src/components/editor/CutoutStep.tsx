"use client";

import { useEditorStore, useActiveSource } from "@/stores/editor-store";

export function CutoutStep() {
  const activeSource = useActiveSource();
  const setStep = useEditorStore((s) => s.setStep);
  const cutouts = useEditorStore((s) => s.cutouts);

  if (!activeSource) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">No image selected</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setStep("upload")}
          className="text-indigo-600 dark:text-indigo-400 font-medium"
        >
          ← Back
        </button>
        <span className="text-sm text-gray-500">
          Draw around what to include
        </span>
        <button
          onClick={() => setStep("arrange")}
          disabled={cutouts.length === 0}
          className="text-indigo-600 dark:text-indigo-400 font-medium disabled:opacity-50"
        >
          Next →
        </button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative overflow-hidden bg-gray-100 dark:bg-gray-800">
        {/* Source image */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <img
            src={activeSource.url}
            alt="Source"
            className="max-w-full max-h-full object-contain"
          />
        </div>

        {/* TODO: Lasso drawing canvas overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-black/50 text-white px-4 py-2 rounded-lg text-sm">
            🚧 Lasso tool coming soon
          </div>
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 safe-area-inset-bottom">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button className="touch-target px-4 py-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg font-medium">
              ✏️ Lasso
            </button>
            <button className="touch-target px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium">
              ↩️ Undo
            </button>
          </div>
          <div className="text-sm text-gray-500">
            {cutouts.length} cutout{cutouts.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
