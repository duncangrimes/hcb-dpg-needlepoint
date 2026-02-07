"use client";

import { useState, useEffect, useCallback } from "react";
import { useEditorStore, usePlacedCutoutsSorted } from "@/stores/editor-store";
// Thumbnail extraction can be used later for proper cutout previews
// import { createCutoutThumbnail } from "@/lib/editor/extraction";

interface LayerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LayerPanel({ isOpen, onClose }: LayerPanelProps) {
  const placedCutouts = usePlacedCutoutsSorted();
  const cutouts = useEditorStore((s) => s.cutouts);
  const sourceImages = useEditorStore((s) => s.sourceImages);
  const activeCutoutId = useEditorStore((s) => s.activeCutoutId);
  const selectCutout = useEditorStore((s) => s.selectCutout);
  const removePlacedCutout = useEditorStore((s) => s.removePlacedCutout);
  const reorderCutouts = useEditorStore((s) => s.reorderCutouts);

  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Generate thumbnails for cutouts
  useEffect(() => {
    if (placedCutouts.length === 0) return;
    
    // Build lookup map inside effect
    const cutoutsById = new Map(cutouts.map((c) => [c.id, c]));
    
    const generateThumbnails = async () => {
      const newThumbs = new Map<string, string>();

      for (const placed of placedCutouts) {
        // Check if we already have this thumbnail
        if (thumbnails.has(placed.cutoutId)) {
          newThumbs.set(placed.cutoutId, thumbnails.get(placed.cutoutId)!);
          continue;
        }

        // Look up cutout
        const cutout = cutoutsById.get(placed.cutoutId);
        if (!cutout) continue;

        // Find source image
        const source = sourceImages.find((s) => s.id === cutout.sourceImageId);
        if (!source) continue;

        try {
          // Use source URL as thumbnail for now
          newThumbs.set(placed.cutoutId, source.url);
        } catch (err) {
          console.error("Failed to generate thumbnail:", err);
        }
      }

      setThumbnails(newThumbs);
    };

    generateThumbnails();
  }, [placedCutouts.length, cutouts, sourceImages]);

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    // Reorder
    reorderCutouts(draggedIndex, index);
    setDraggedIndex(index);
  }, [draggedIndex, reorderCutouts]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  if (!isOpen) return null;

  // Reverse order so top layer (highest zIndex) is at top of list
  const reversedCutouts = [...placedCutouts].reverse();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up">
        <div className="bg-white dark:bg-stone-900 rounded-t-2xl shadow-xl max-h-[60vh] overflow-hidden safe-area-inset-bottom">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-stone-300 dark:bg-stone-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-3 border-b border-stone-200 dark:border-stone-700">
            <h2 className="text-lg font-semibold">Layers</h2>
            <button
              onClick={onClose}
              className="text-terracotta-600 dark:text-terracotta-400 font-medium"
            >
              Done
            </button>
          </div>

          {/* Layer list */}
          <div className="overflow-y-auto max-h-[calc(60vh-80px)] p-4 space-y-2">
            {reversedCutouts.length === 0 ? (
              <p className="text-center text-stone-500 py-8">
                No cutouts placed yet
              </p>
            ) : (
              reversedCutouts.map((placed, index) => {
                const isActive = activeCutoutId === placed.cutoutId;
                const thumbnail = thumbnails.get(placed.cutoutId);
                const actualIndex = placedCutouts.length - 1 - index;

                return (
                  <div
                    key={placed.id}
                    draggable
                    onDragStart={() => handleDragStart(actualIndex)}
                    onDragOver={(e) => handleDragOver(e, actualIndex)}
                    onDragEnd={handleDragEnd}
                    onClick={() => selectCutout(placed.cutoutId)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                      isActive
                        ? "bg-terracotta-100 dark:bg-terracotta-900/40 ring-2 ring-terracotta-500"
                        : "bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700"
                    } ${draggedIndex === actualIndex ? "opacity-50" : ""}`}
                  >
                    {/* Drag handle */}
                    <div className="text-stone-400 cursor-grab active:cursor-grabbing">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <circle cx="7" cy="6" r="1.5" />
                        <circle cx="13" cy="6" r="1.5" />
                        <circle cx="7" cy="10" r="1.5" />
                        <circle cx="13" cy="10" r="1.5" />
                        <circle cx="7" cy="14" r="1.5" />
                        <circle cx="13" cy="14" r="1.5" />
                      </svg>
                    </div>

                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-white border border-stone-200 dark:border-stone-700 flex-shrink-0">
                      {thumbnail && (
                        <img
                          src={thumbnail}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-900 dark:text-white truncate">
                        Cutout {actualIndex + 1}
                      </p>
                      <p className="text-sm text-stone-500">
                        {placed.widthInches.toFixed(1)}" wide
                      </p>
                    </div>

                    {/* Delete button - removes placement only (factory pattern) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removePlacedCutout(placed.id);
                      }}
                      className="p-2 text-error hover:bg-error-light dark:hover:bg-error/30 rounded-lg transition-colors"
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer hint */}
          {reversedCutouts.length > 1 && (
            <div className="px-4 py-3 border-t border-stone-200 dark:border-stone-700 text-center text-sm text-stone-500">
              Drag layers to reorder • Top = front
            </div>
          )}
        </div>
      </div>
    </>
  );
}
