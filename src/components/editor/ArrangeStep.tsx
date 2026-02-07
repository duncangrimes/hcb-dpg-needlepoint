"use client";

import { useState } from "react";
import { useEditorStore, usePlacedCutoutsSorted } from "@/stores/editor-store";
import { ArrangeCanvas } from "./ArrangeCanvas";
import { SettingsSheet } from "./SettingsSheet";
import { LayerPanel } from "./LayerPanel";
import { CutoutLibrary } from "./CutoutLibrary";

export function ArrangeStep() {
  const setStep = useEditorStore((s) => s.setStep);
  const canvasConfig = useEditorStore((s) => s.canvasConfig);
  const placedCutouts = usePlacedCutoutsSorted();
  const activeCutoutId = useEditorStore((s) => s.activeCutoutId);
  const placedCutoutsRaw = useEditorStore((s) => s.placedCutouts);
  const removePlacedCutout = useEditorStore((s) => s.removePlacedCutout);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

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
          {/* Left: Add from library / New cutout / Delete */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowLibrary(true)}
              className="touch-target px-3 py-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg font-medium text-sm"
            >
              📚 Library
            </button>
            <button
              onClick={() => setStep("cutout")}
              className="touch-target px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm"
            >
              + New
            </button>
            
            {activeCutoutId && (
              <button
                onClick={() => {
                  // Find placement for this cutout and remove it (factory pattern)
                  const placement = placedCutoutsRaw.find(pc => pc.cutoutId === activeCutoutId);
                  if (placement) {
                    removePlacedCutout(placement.id);
                  }
                }}
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

          {/* Right: Layers + Settings */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowLayers(true)}
              className="touch-target px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm"
            >
              📚 {placedCutouts.length}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="touch-target px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm"
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>

      {/* Bottom sheets */}
      <SettingsSheet 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
      <LayerPanel
        isOpen={showLayers}
        onClose={() => setShowLayers(false)}
      />
      <CutoutLibrary
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
      />
    </div>
  );
}
