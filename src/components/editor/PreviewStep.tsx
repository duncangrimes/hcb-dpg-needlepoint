"use client";

import { useState, useCallback } from "react";
import { useEditorStore, usePlacedCutoutsSorted } from "@/stores/editor-store";
import { generateCanvasAction, type GenerateCanvasResult } from "@/actions/generateCanvas";
import type { Thread } from "@/lib/colors";

export function PreviewStep() {
  const setStep = useEditorStore((s) => s.setStep);
  const isProcessing = useEditorStore((s) => s.isProcessing);
  const setProcessing = useEditorStore((s) => s.setProcessing);
  const canvasConfig = useEditorStore((s) => s.canvasConfig);
  const sourceImages = useEditorStore((s) => s.sourceImages);
  const placedCutouts = usePlacedCutoutsSorted();

  const [result, setResult] = useState<GenerateCanvasResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setProcessing(true);
    setError(null);

    try {
      // Convert source images to data URLs
      const sourceImageDataUrls: Record<string, string> = {};
      
      for (const source of sourceImages) {
        // Fetch each source image and convert to data URL
        const response = await fetch(source.url);
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        sourceImageDataUrls[source.id] = dataUrl;
      }

      const generationResult = await generateCanvasAction({
        sourceImages: sourceImageDataUrls,
        placedCutouts,
        canvasConfig,
      });

      if (generationResult.success) {
        setResult(generationResult);
      } else {
        setError(generationResult.error || "Generation failed");
      }
    } catch (err) {
      console.error("Generation error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setProcessing(false);
    }
  }, [sourceImages, placedCutouts, canvasConfig, setProcessing]);

  const handleDownload = useCallback(() => {
    if (!result?.manufacturerImageUrl) return;

    const link = document.createElement("a");
    link.href = result.manufacturerImageUrl;
    link.download = `needlepoint-canvas-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [result]);

  // Render stitchability score bar
  const renderStitchabilityBar = (score: number) => {
    const percentage = (score / 10) * 100;
    const color = score >= 7 ? "bg-green-500" : score >= 5 ? "bg-yellow-500" : "bg-red-500";
    const label = score >= 7 ? "Excellent" : score >= 5 ? "Good" : "Needs Work";

    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Stitchability</span>
          <span className="font-medium">{score.toFixed(1)}/10 — {label}</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${color} transition-all`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
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
        <span className="text-sm text-gray-500">
          {result ? "Your Canvas" : "Preview & Generate"}
        </span>
        {result && (
          <button
            onClick={handleDownload}
            className="text-indigo-600 dark:text-indigo-400 font-medium"
          >
            📥 Save
          </button>
        )}
        {!result && <div className="w-16" />}
      </div>

      {/* Preview area */}
      <div className="flex-1 relative overflow-hidden bg-gray-100 dark:bg-gray-800 p-4">
        <div className="h-full flex flex-col items-center justify-center gap-4 overflow-y-auto">
          {/* Canvas preview */}
          <div
            className="bg-white shadow-lg rounded-lg flex items-center justify-center overflow-hidden"
            style={{
              aspectRatio: `${canvasConfig.widthInches} / ${canvasConfig.heightInches}`,
              maxWidth: "100%",
              maxHeight: result ? "50%" : "60%",
              width: "auto",
              height: result ? "50%" : "60%",
            }}
          >
            {result?.manufacturerImageUrl ? (
              <img
                src={result.manufacturerImageUrl}
                alt="Generated needlepoint canvas"
                className="w-full h-full object-contain"
                style={{ imageRendering: "pixelated" }}
              />
            ) : (
              <div className="text-center p-4">
                <p className="text-4xl mb-2">🧵</p>
                <p className="text-gray-600 dark:text-gray-400">
                  Ready to generate
                </p>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Stats / Results */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-sm">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">
              {result ? "Canvas Results" : "Canvas Details"}
            </h3>
            <div className="space-y-3 text-sm">
              {result?.stitchabilityScore !== undefined && (
                renderStitchabilityBar(result.stitchabilityScore)
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-500">Size</span>
                <span className="text-gray-900 dark:text-white">
                  {canvasConfig.widthInches}" × {canvasConfig.heightInches}"
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-500">Dimensions</span>
                <span className="text-gray-900 dark:text-white">
                  {result?.dimensions
                    ? `${result.dimensions.width} × ${result.dimensions.height} stitches`
                    : `~${Math.round(canvasConfig.widthInches * canvasConfig.meshCount)} × ${Math.round(canvasConfig.heightInches * canvasConfig.meshCount)}`
                  }
                </span>
              </div>

              {result?.threads && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500">Thread Colors</span>
                    <span className="text-gray-900 dark:text-white">
                      {result.threads.length} DMC
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {result.threads.map((thread, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                        style={{ backgroundColor: thread.hex }}
                        title={`DMC ${thread.floss}: ${thread.name}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action */}
      <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 safe-area-inset-bottom">
        {result ? (
          <div className="flex gap-3">
            <button
              onClick={() => setResult(null)}
              className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-lg"
            >
              Regenerate
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-700 active:scale-[0.98] transition"
            >
              📥 Download
            </button>
          </div>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={isProcessing}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-700 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <span className="animate-spin">⏳</span>
                Generating...
              </>
            ) : (
              "Generate Needlepoint Canvas"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
