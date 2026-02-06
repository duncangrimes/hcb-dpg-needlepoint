"use client";

import { useState } from "react";
import { useEditorStore, usePlacedCutoutsSorted } from "@/stores/editor-store";
import { ArrangeCanvas } from "./ArrangeCanvas";
import { SettingsSheet } from "./SettingsSheet";

export function ArrangeStep() {
  const setStep = useEditorStore((s) => s.setStep);
  const canvasConfig = useEditorStore((s) => s.canvasConfig);
  const placedCutouts = usePlacedCutoutsSorted();
  const activeCutoutId = useEditorStore((s) => s.activeCutoutId);
  const removeCutout = useEditorStore((s) => s.removeCutout);
  
  const [showSettings, setShowSettings] = useState(false);

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
        <span className="text-sm text-gray-500">
          Drag & pinch to arrange
        </span>
        <button
          onClick={() => setStep("preview")}
          disabled={placedCutouts.length === 0}
          className="text-indigo-600 dark:text-indigo-400 font-medium disabled:opacity-50"
        >
          Preview →
        </button>
      </div>

      {/* Canvas preview area */}
      <ArrangeCanvas className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-800" />

      {/* Bottom toolbar */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 safe-area-inset-bottom">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Add more / Delete */}
          <div className="flex gap-2">
            <button
              onClick={() => setStep("cutout")}
              className="touch-target px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm"
            >
              + Add
            </button>
            
            {activeCutoutId && (
              <button
                onClick={() => removeCutout(activeCutoutId)}
                className="touch-target px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg font-medium text-sm"
              >
                🗑️
              </button>
            )}
          </div>
          
          {/* Center: Canvas info */}
          <div className="flex gap-2 text-xs text-gray-500">
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
              {canvasConfig.widthInches}×{canvasConfig.heightInches}"
            </span>
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
              {canvasConfig.meshCount}ct
            </span>
          </div>

          {/* Right: Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="touch-target px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Settings bottom sheet */}
      <SettingsSheet 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </div>
  );
}
