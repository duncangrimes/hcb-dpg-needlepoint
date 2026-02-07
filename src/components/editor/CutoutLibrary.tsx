"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { listCutouts, deleteCutout, type CutoutListItem } from "@/actions/cutouts";
import { useEditorStore } from "@/stores/editor-store";
import type { Cutout, PlacedCutout, Point } from "@/types/editor";
import { getCutout } from "@/actions/cutouts";

interface CutoutLibraryProps {
  isOpen: boolean;
  onClose: () => void;
}

const BATCH_SIZE = 20;

export function CutoutLibrary({ isOpen, onClose }: CutoutLibraryProps) {
  const [cutouts, setCutouts] = useState<CutoutListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const canvasConfig = useEditorStore((s) => s.canvasConfig);
  const addCutout = useEditorStore((s) => s.addCutout);
  const placeCutout = useEditorStore((s) => s.placeCutout);
  const setStep = useEditorStore((s) => s.setStep);

  // Initial load
  useEffect(() => {
    if (isOpen && cutouts.length === 0) {
      loadCutouts();
    }
  }, [isOpen]);

  const loadCutouts = useCallback(async (loadMore = false) => {
    if (loading || loadingMore) return;
    if (loadMore && !hasMore) return;

    loadMore ? setLoadingMore(true) : setLoading(true);
    setError(null);

    try {
      const result = await listCutouts(loadMore ? cursor : undefined, BATCH_SIZE);

      if (result.success && result.cutouts) {
        setCutouts((prev) => 
          loadMore ? [...prev, ...result.cutouts!] : result.cutouts!
        );
        setCursor(result.nextCursor);
        setHasMore(result.hasMore ?? false);
      } else {
        setError(result.error || "Failed to load cutouts");
      }
    } catch (err) {
      setError("Failed to load cutouts");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [cursor, hasMore, loading, loadingMore]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const nearBottom = scrollHeight - scrollTop - clientHeight < 200;

    if (nearBottom && hasMore && !loadingMore) {
      loadCutouts(true);
    }
  }, [hasMore, loadingMore, loadCutouts]);

  // Add cutout to current canvas
  const handleSelectCutout = useCallback(async (item: CutoutListItem) => {
    // Fetch full cutout with path
    const result = await getCutout(item.id);
    if (!result.success || !result.cutout) {
      console.error("Failed to load cutout:", result.error);
      return;
    }

    const fullCutout = result.cutout;

    // Add to editor state
    const cutout: Cutout = {
      id: fullCutout.id,
      sourceImageId: fullCutout.sourceImage.id,
      path: fullCutout.path,
      name: fullCutout.name || undefined,
      extractedUrl: fullCutout.extractedUrl || undefined,
    };

    addCutout(cutout);

    // Auto-place on canvas
    const defaultWidthInches = canvasConfig.widthInches * 0.4;
    
    // Note: placeCutout in store calculates aspectRatio from path
    // but we have it stored, so we could optimize this
    placeCutout(cutout.id, {
      x: 0.5,
      y: 0.5,
      scale: 1,
      rotation: 0,
      flipX: false,
      flipY: false,
    });

    // Close library and go to arrange
    onClose();
    setStep("arrange");
  }, [addCutout, placeCutout, canvasConfig.widthInches, onClose, setStep]);

  // Delete cutout
  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Delete this cutout permanently?")) return;

    const result = await deleteCutout(id);
    if (result.success) {
      setCutouts((prev) => prev.filter((c) => c.id !== id));
    } else {
      alert(result.error || "Failed to delete");
    }
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up">
        <div className="bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl max-h-[75vh] flex flex-col safe-area-inset-bottom">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h2 className="text-lg font-semibold">Your Cutouts</h2>
            <button
              onClick={onClose}
              className="text-indigo-600 dark:text-indigo-400 font-medium"
            >
              Done
            </button>
          </div>

          {/* Grid */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4"
          >
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full" />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-500 mb-4">{error}</p>
                <button
                  onClick={() => loadCutouts()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
                >
                  Retry
                </button>
              </div>
            ) : cutouts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">✂️</p>
                <p className="text-gray-500">No cutouts yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Create cutouts from the editor to see them here
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  {cutouts.map((cutout) => (
                    <button
                      key={cutout.id}
                      onClick={() => handleSelectCutout(cutout)}
                      className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 group hover:ring-2 hover:ring-indigo-500 transition-all"
                    >
                      {/* Thumbnail */}
                      {cutout.thumbnailUrl || cutout.extractedUrl ? (
                        <img
                          src={cutout.thumbnailUrl || cutout.extractedUrl || ""}
                          alt={cutout.name || "Cutout"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <span className="text-2xl">✂️</span>
                        </div>
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          + Add
                        </span>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={(e) => handleDelete(cutout.id, e)}
                        className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>

                      {/* Name badge */}
                      {cutout.name && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                          <p className="text-white text-xs truncate">
                            {cutout.name}
                          </p>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Loading more indicator */}
                {loadingMore && (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full" />
                  </div>
                )}

                {/* End of list */}
                {!hasMore && cutouts.length > 0 && (
                  <p className="text-center text-sm text-gray-400 py-4">
                    {cutouts.length} cutout{cutouts.length !== 1 ? "s" : ""}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
