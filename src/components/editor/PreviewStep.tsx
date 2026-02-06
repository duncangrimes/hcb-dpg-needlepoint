"use client";

import { useEditorStore } from "@/stores/editor-store";

export function PreviewStep() {
  const setStep = useEditorStore((s) => s.setStep);
  const isProcessing = useEditorStore((s) => s.isProcessing);
  const canvasConfig = useEditorStore((s) => s.canvasConfig);

  const handleGenerate = async () => {
    // TODO: Implement canvas generation
    alert("Canvas generation coming soon!");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setStep("arrange")}
          className="text-indigo-600 dark:text-indigo-400 font-medium"
        >
          ← Back
        </button>
        <span className="text-sm text-gray-500">Preview & Generate</span>
        <div className="w-16" /> {/* Spacer for alignment */}
      </div>

      {/* Preview area */}
      <div className="flex-1 relative overflow-hidden bg-gray-100 dark:bg-gray-800 p-4">
        <div className="h-full flex flex-col items-center justify-center gap-6">
          {/* Canvas preview */}
          <div
            className="bg-white shadow-lg rounded-lg flex items-center justify-center"
            style={{
              aspectRatio: `${canvasConfig.widthInches} / ${canvasConfig.heightInches}`,
              maxWidth: "100%",
              maxHeight: "60%",
              width: "auto",
              height: "60%",
            }}
          >
            <div className="text-center p-4">
              <p className="text-4xl mb-2">🧵</p>
              <p className="text-gray-600 dark:text-gray-400">
                Ready to generate
              </p>
            </div>
          </div>

          {/* Stats preview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-sm">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">
              Canvas Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Size</span>
                <span className="text-gray-900 dark:text-white">
                  {canvasConfig.widthInches}" × {canvasConfig.heightInches}"
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Mesh Count</span>
                <span className="text-gray-900 dark:text-white">
                  {canvasConfig.meshCount} per inch
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Stitches</span>
                <span className="text-gray-900 dark:text-white">
                  ~{Math.round(canvasConfig.widthInches * canvasConfig.meshCount * canvasConfig.heightInches * canvasConfig.meshCount).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action */}
      <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 safe-area-inset-bottom">
        <button
          onClick={handleGenerate}
          disabled={isProcessing}
          className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-700 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? "Generating..." : "Generate Needlepoint Canvas"}
        </button>
      </div>
    </div>
  );
}
