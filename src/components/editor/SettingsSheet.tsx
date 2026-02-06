"use client";

import { useEditorStore } from "@/stores/editor-store";
import type { BackgroundPattern } from "@/types/editor";

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const MESH_OPTIONS = [10, 12, 13, 14, 18] as const;

const BACKGROUND_PATTERNS: { value: BackgroundPattern; label: string; icon: string }[] = [
  { value: "solid", label: "Solid", icon: "⬜" },
  { value: "gingham", label: "Gingham", icon: "🔲" },
  { value: "stripes", label: "Stripes", icon: "▤" },
  { value: "checkerboard", label: "Checker", icon: "🏁" },
];

const COLOR_PRESETS = [
  "#FFFFFF", // White
  "#FFF8E7", // Cream
  "#FFE4E1", // Misty rose
  "#E6E6FA", // Lavender
  "#F0FFF0", // Honeydew
  "#F5F5DC", // Beige
  "#FFC0CB", // Pink
  "#ADD8E6", // Light blue
  "#98FB98", // Pale green
  "#FFDAB9", // Peach
];

export function SettingsSheet({ isOpen, onClose }: SettingsSheetProps) {
  const canvasConfig = useEditorStore((s) => s.canvasConfig);
  const setCanvasConfig = useEditorStore((s) => s.setCanvasConfig);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up">
        <div className="bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl max-h-[70vh] overflow-y-auto safe-area-inset-bottom">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold">Canvas Settings</h2>
            <button
              onClick={onClose}
              className="text-indigo-600 dark:text-indigo-400 font-medium"
            >
              Done
            </button>
          </div>

          <div className="p-5 space-y-6">
            {/* Canvas Size */}
            <section>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                Canvas Size
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Width (inches)</label>
                  <input
                    type="number"
                    min={4}
                    max={24}
                    value={canvasConfig.widthInches}
                    onChange={(e) => setCanvasConfig({ widthInches: Number(e.target.value) || 8 })}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-center font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Height (inches)</label>
                  <input
                    type="number"
                    min={4}
                    max={24}
                    value={canvasConfig.heightInches}
                    onChange={(e) => setCanvasConfig({ heightInches: Number(e.target.value) || 10 })}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-center font-medium"
                  />
                </div>
              </div>
            </section>

            {/* Mesh Count */}
            <section>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                Mesh Count
              </h3>
              <div className="flex gap-2 flex-wrap">
                {MESH_OPTIONS.map((mesh) => (
                  <button
                    key={mesh}
                    onClick={() => setCanvasConfig({ meshCount: mesh })}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      canvasConfig.meshCount === mesh
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {mesh}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {canvasConfig.meshCount} stitches per inch • 
                {" "}{Math.round(canvasConfig.widthInches * canvasConfig.meshCount)} × {Math.round(canvasConfig.heightInches * canvasConfig.meshCount)} total stitches
              </p>
            </section>

            {/* Background Pattern */}
            <section>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                Background Pattern
              </h3>
              <div className="flex gap-2 flex-wrap">
                {BACKGROUND_PATTERNS.map((pattern) => (
                  <button
                    key={pattern.value}
                    onClick={() => setCanvasConfig({ bgPattern: pattern.value })}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                      canvasConfig.bgPattern === pattern.value
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <span>{pattern.icon}</span>
                    <span>{pattern.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Background Color */}
            <section>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                Background Color
              </h3>
              <div className="flex gap-2 flex-wrap">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setCanvasConfig({ bgColor1: color })}
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${
                      canvasConfig.bgColor1 === color
                        ? "border-indigo-600 scale-110"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                {/* Custom color input */}
                <label className="w-10 h-10 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-indigo-400">
                  <span className="text-lg">🎨</span>
                  <input
                    type="color"
                    value={canvasConfig.bgColor1}
                    onChange={(e) => setCanvasConfig({ bgColor1: e.target.value })}
                    className="sr-only"
                  />
                </label>
              </div>
            </section>

            {/* Secondary color for patterns */}
            {canvasConfig.bgPattern !== "solid" && (
              <section>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                  Pattern Color
                </h3>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_PRESETS.slice(0, 6).map((color) => (
                    <button
                      key={color}
                      onClick={() => setCanvasConfig({ bgColor2: color })}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        canvasConfig.bgColor2 === color
                          ? "border-indigo-600 scale-110"
                          : "border-gray-200 dark:border-gray-700"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <label className="w-10 h-10 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer">
                    <span className="text-lg">🎨</span>
                    <input
                      type="color"
                      value={canvasConfig.bgColor2 || "#E5E7EB"}
                      onChange={(e) => setCanvasConfig({ bgColor2: e.target.value })}
                      className="sr-only"
                    />
                  </label>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
