"use client";

import { cn } from "@/lib/cn";

export type PreviewView = "canvas" | "stitched";

interface PreviewToggleProps {
  activeView: PreviewView;
  onViewChange: (view: PreviewView) => void;
}

/**
 * Segmented toggle control for switching between Canvas and Stitched previews.
 * 
 * Design:
 * - Pill-shaped container with stone-100 background
 * - Active segment has white background + shadow
 * - Smooth 200ms transition between states
 * - Full keyboard accessibility
 */
export function PreviewToggle({ activeView, onViewChange }: PreviewToggleProps) {
  const handleKeyDown = (e: React.KeyboardEvent, view: PreviewView) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onViewChange(view);
    }
    // Arrow key navigation
    if (e.key === "ArrowLeft" && activeView === "stitched") {
      onViewChange("canvas");
    }
    if (e.key === "ArrowRight" && activeView === "canvas") {
      onViewChange("stitched");
    }
  };

  return (
    <div
      className="inline-flex rounded-full bg-stone-100 dark:bg-stone-800 p-1"
      role="tablist"
      aria-label="Preview type selector"
    >
      <button
        role="tab"
        aria-selected={activeView === "canvas"}
        aria-controls="preview-image"
        tabIndex={activeView === "canvas" ? 0 : -1}
        onClick={() => onViewChange("canvas")}
        onKeyDown={(e) => handleKeyDown(e, "canvas")}
        className={cn(
          "relative flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all duration-200",
          activeView === "canvas"
            ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm"
            : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
        )}
      >
        Your Canvas
      </button>
      <button
        role="tab"
        aria-selected={activeView === "stitched"}
        aria-controls="preview-image"
        tabIndex={activeView === "stitched" ? 0 : -1}
        onClick={() => onViewChange("stitched")}
        onKeyDown={(e) => handleKeyDown(e, "stitched")}
        className={cn(
          "relative flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all duration-200",
          activeView === "stitched"
            ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm"
            : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
        )}
      >
        When Stitched
      </button>
    </div>
  );
}
