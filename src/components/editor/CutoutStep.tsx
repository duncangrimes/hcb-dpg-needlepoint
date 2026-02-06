"use client";

import { useEditorStore, useActiveSource, useEditorHistory } from "@/stores/editor-store";
import { LassoCanvas } from "./LassoCanvas";

export function CutoutStep() {
  const activeSource = useActiveSource();
  const setStep = useEditorStore((s) => s.setStep);
  const cutouts = useEditorStore((s) => s.cutouts);
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const activeCutoutId = useEditorStore((s) => s.activeCutoutId);
  const removeCutout = useEditorStore((s) => s.removeCutout);
  
  const { undo, redo, canUndo, canRedo } = useEditorHistory();

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
      <LassoCanvas className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-800" />

      {/* Bottom toolbar */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 safe-area-inset-bottom">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {/* Tool buttons */}
            <button
              onClick={() => setTool("lasso")}
              className={`touch-target px-4 py-2 rounded-lg font-medium transition-colors ${
                tool === "lasso"
                  ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              }`}
            >
              ✏️ Lasso
            </button>
            <button
              onClick={() => setTool("select")}
              className={`touch-target px-4 py-2 rounded-lg font-medium transition-colors ${
                tool === "select"
                  ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              }`}
            >
              👆 Select
            </button>
            
            {/* Divider */}
            <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
            
            {/* Undo/Redo */}
            <button
              onClick={() => undo()}
              disabled={!canUndo}
              className="touch-target px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium disabled:opacity-40"
            >
              ↩️
            </button>
            <button
              onClick={() => redo()}
              disabled={!canRedo}
              className="touch-target px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium disabled:opacity-40"
            >
              ↪️
            </button>
            
            {/* Delete selected */}
            {activeCutoutId && (
              <>
                <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
                <button
                  onClick={() => removeCutout(activeCutoutId)}
                  className="touch-target px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg font-medium"
                >
                  🗑️
                </button>
              </>
            )}
          </div>
          
          <div className="text-sm text-gray-500">
            {cutouts.length} cutout{cutouts.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
