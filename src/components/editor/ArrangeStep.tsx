"use client";

import { useEditorStore, usePlacedCutoutsSorted } from "@/stores/editor-store";

export function ArrangeStep() {
  const setStep = useEditorStore((s) => s.setStep);
  const canvasConfig = useEditorStore((s) => s.canvasConfig);
  const placedCutouts = usePlacedCutoutsSorted();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setStep("cutout")}
          className="text-indigo-600 dark:text-indigo-400 font-medium"
        >
          ← Back
        </button>
        <span className="text-sm text-gray-500">Arrange your cutouts</span>
        <button
          onClick={() => setStep("preview")}
          disabled={placedCutouts.length === 0}
          className="text-indigo-600 dark:text-indigo-400 font-medium disabled:opacity-50"
        >
          Preview →
        </button>
      </div>

      {/* Canvas preview area */}
      <div className="flex-1 relative overflow-hidden bg-gray-100 dark:bg-gray-800 p-4">
        <div className="h-full flex items-center justify-center">
          {/* Canvas representation */}
          <div
            className="bg-white shadow-lg rounded-lg flex items-center justify-center"
            style={{
              aspectRatio: `${canvasConfig.widthInches} / ${canvasConfig.heightInches}`,
              maxWidth: "100%",
              maxHeight: "100%",
              width: "auto",
              height: "80%",
            }}
          >
            {placedCutouts.length === 0 ? (
              <p className="text-gray-400 text-sm">No cutouts placed</p>
            ) : (
              <div className="text-center p-4">
                <p className="text-gray-600 dark:text-gray-400">
                  {placedCutouts.length} cutout{placedCutouts.length !== 1 ? "s" : ""} placed
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  🚧 Drag & drop coming soon
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 safe-area-inset-bottom">
        <div className="flex items-center justify-between gap-4">
          <button className="touch-target px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm">
            + Add More
          </button>
          
          <div className="flex gap-2 text-sm">
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">
              {canvasConfig.widthInches}" × {canvasConfig.heightInches}"
            </span>
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">
              {canvasConfig.meshCount} mesh
            </span>
          </div>

          <button className="touch-target px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm">
            ⚙️ Settings
          </button>
        </div>
      </div>
    </div>
  );
}
