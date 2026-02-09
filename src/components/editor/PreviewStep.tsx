"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEditorStore, usePlacedCutoutsSorted } from "@/stores/editor-store";
import { generateCanvasAction, type GenerateCanvasResult } from "@/actions/generateCanvas";
import { useAuthGate } from "@/hooks/useAuthGate";
import { AuthModal } from "@/components/auth/AuthModal";
import { clearEditorSession } from "@/hooks/useEditorPersistence";
import { ArrowDownTrayIcon, ArrowPathIcon, SparklesIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import type { Thread } from "@/lib/colors";

export function PreviewStep() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAuthLoading = status === "loading";
  const setStep = useEditorStore((s) => s.setStep);
  const isProcessing = useEditorStore((s) => s.isProcessing);
  const setProcessing = useEditorStore((s) => s.setProcessing);
  const canvasConfig = useEditorStore((s) => s.canvasConfig);
  const sourceImages = useEditorStore((s) => s.sourceImages);
  const cutouts = useEditorStore((s) => s.cutouts);
  const placedCutouts = usePlacedCutoutsSorted();
  const canvasId = useEditorStore((s) => s.canvasId);
  const setCanvasId = useEditorStore((s) => s.setCanvasId);

  const [result, setResult] = useState<GenerateCanvasResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auth gate for download and generate
  const {
    isAuthenticated,
    showAuthModal,
    requireAuth,
    closeAuthModal,
    pendingAction,
    executePendingAction,
  } = useAuthGate();

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

      // Convert cutouts array to map
      const cutoutsMap: Record<string, typeof cutouts[0]> = {};
      for (const cutout of cutouts) {
        cutoutsMap[cutout.id] = cutout;
      }

      const generationResult = await generateCanvasAction({
        canvasId,
        sourceImages: sourceImageDataUrls,
        cutouts: cutoutsMap,
        placedCutouts,
        canvasConfig,
      });

      if (generationResult.success) {
        setResult(generationResult);
        
        // Update URL with new canvas ID if created
        if (generationResult.canvasId && generationResult.canvasId !== canvasId) {
          setCanvasId(generationResult.canvasId);
          router.replace(`/editor?canvasId=${generationResult.canvasId}`, { scroll: false });
        }
      } else {
        setError(generationResult.error || "Generation failed");
      }
    } catch (err) {
      console.error("Generation error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setProcessing(false);
    }
  }, [sourceImages, cutouts, placedCutouts, canvasConfig, canvasId, setProcessing, setCanvasId, router]);

  // Note: Auto-generation removed for performance
  // Users now explicitly click "Generate Canvas" button
  // This saves ~3-5 seconds on navigation to preview step

  // Gated generate handler (requires auth)
  const handleGenerateWithAuth = useCallback(() => {
    if (!requireAuth("generate")) {
      return; // Modal will show
    }
    handleGenerate();
  }, [requireAuth, handleGenerate]);

  // Actual download logic
  const performDownload = useCallback(() => {
    if (!result?.manufacturerImageUrl) return;

    const link = document.createElement("a");
    link.href = result.manufacturerImageUrl;
    link.download = `needlepoint-canvas-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clear localStorage session after successful download
    clearEditorSession();
  }, [result]);

  // Gated download handler
  const handleDownload = useCallback(() => {
    if (!result?.manufacturerImageUrl) return;

    // Require auth before allowing download
    if (!requireAuth("download")) {
      return; // Modal will show
    }

    // User is authenticated, proceed
    performDownload();
  }, [result, requireAuth, performDownload]);

  // Execute pending action after authentication
  useEffect(() => {
    if (isAuthenticated && pendingAction) {
      executePendingAction({
        download: performDownload,
        generate: handleGenerate,
      });
    }
  }, [isAuthenticated, pendingAction, executePendingAction, performDownload, handleGenerate]);

  // Render stitchability score bar
  const renderStitchabilityBar = (score: number) => {
    const percentage = (score / 10) * 100;
    const color = score >= 7 ? "bg-sage-500" : score >= 5 ? "bg-amber-500" : "bg-error";
    const label = score >= 7 ? "Excellent" : score >= 5 ? "Good" : "Needs Work";

    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-stone-500">Stitchability</span>
          <span className="font-medium">{score.toFixed(1)}/10 — {label}</span>
        </div>
        <div className="h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
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
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={closeAuthModal}
        title={pendingAction === "generate" ? "Sign in to generate" : "Sign in to download"}
        description="Create a free account to generate your canvas, download it, and save your work."
        postAuthAction={pendingAction ?? undefined}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900">
        <button
          onClick={() => setStep("arrange")}
          className="text-terracotta-600 dark:text-terracotta-400 font-medium"
        >
          ← Back
        </button>
        <span className="text-sm text-stone-500">
          {result ? "Your Canvas" : "Preview & Generate"}
        </span>
        {result && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-terracotta-600 dark:text-terracotta-400 font-medium"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            Save
          </button>
        )}
        {!result && <div className="w-16" />}
      </div>

      {/* Preview area */}
      <div className="flex-1 relative overflow-hidden bg-stone-100 dark:bg-stone-800 p-4">
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
            ) : !session && !isAuthLoading ? (
              <div className="text-center p-4">
                <LockClosedIcon className="w-12 h-12 mx-auto mb-2 text-stone-400" />
                <p className="text-stone-600 dark:text-stone-400 font-medium">
                  Sign in to generate your canvas
                </p>
                <p className="text-sm text-stone-500 dark:text-stone-500 mt-1">
                  Create a free account to continue
                </p>
              </div>
            ) : (
              <div className="text-center p-4">
                <SparklesIcon className="w-12 h-12 mx-auto mb-2 text-terracotta-400" />
                <p className="text-stone-600 dark:text-stone-400">
                  Ready to generate
                </p>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-error-light dark:bg-error/30 text-error-dark dark:text-error-light px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Stats / Results */}
          <div className="bg-white dark:bg-stone-800 rounded-xl p-4 w-full max-w-sm">
            <h3 className="font-medium text-stone-900 dark:text-white mb-3">
              {result ? "Canvas Results" : "Canvas Details"}
            </h3>
            <div className="space-y-3 text-sm">
              {result?.stitchabilityScore !== undefined && (
                renderStitchabilityBar(result.stitchabilityScore)
              )}
              
              <div className="flex justify-between">
                <span className="text-stone-500">Size</span>
                <span className="text-stone-900 dark:text-white">
                  {canvasConfig.widthInches}" × {canvasConfig.heightInches}"
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-stone-500">Dimensions</span>
                <span className="text-stone-900 dark:text-white">
                  {result?.dimensions
                    ? `${result.dimensions.width} × ${result.dimensions.height} stitches`
                    : `~${Math.round(canvasConfig.widthInches * canvasConfig.meshCount)} × ${Math.round(canvasConfig.heightInches * canvasConfig.meshCount)}`
                  }
                </span>
              </div>

              {result?.threads && (
                <div className="pt-2 border-t border-stone-200 dark:border-stone-700">
                  <div className="flex justify-between mb-2">
                    <span className="text-stone-500">Thread Colors</span>
                    <span className="text-stone-900 dark:text-white">
                      {result.threads.length} DMC
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {result.threads.map((thread, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded border border-stone-300 dark:border-stone-600"
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
      <div className="px-4 py-4 border-t border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 safe-area-inset-bottom">
        {result ? (
          <div className="flex gap-3">
            <button
              onClick={() => setResult(null)}
              className="flex-1 py-4 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-2xl font-semibold text-lg hover:bg-stone-200 dark:hover:bg-stone-700 active:scale-[0.98] transition-all"
            >
              Regenerate
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 py-4 bg-terracotta-500 text-white rounded-2xl font-semibold text-lg shadow-lg shadow-terracotta-500/25 hover:bg-terracotta-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              Download
            </button>
          </div>
        ) : (
          <button
            onClick={handleGenerateWithAuth}
            disabled={isProcessing || isAuthLoading}
            className="w-full py-4 bg-terracotta-500 text-white rounded-2xl font-semibold text-lg shadow-lg shadow-terracotta-500/25 hover:bg-terracotta-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <SparklesIcon className="w-5 h-5" />
                Generate Canvas
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
