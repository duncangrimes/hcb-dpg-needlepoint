"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { listCanvases, deleteCanvas, createCanvas, type CanvasListItem } from "@/actions/canvas";
import { PlusIcon, ArrowPathIcon, SparklesIcon, TrashIcon } from "@heroicons/react/24/outline";

export function DashboardContent() {
  const router = useRouter();
  const [canvases, setCanvases] = useState<CanvasListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Load canvases on mount
  useEffect(() => {
    loadCanvases();
  }, []);

  const loadCanvases = async () => {
    setLoading(true);
    setError(null);
    const result = await listCanvases();
    if (result.success && result.canvases) {
      setCanvases(result.canvases);
    } else {
      setError(result.error || "Failed to load canvases");
    }
    setLoading(false);
  };

  const handleCreateNew = async () => {
    setCreating(true);
    const result = await createCanvas();
    if (result.success && result.canvas) {
      router.push(`/editor?canvasId=${result.canvas.id}`);
    } else {
      setError(result.error || "Failed to create canvas");
      setCreating(false);
    }
  };

  const handleOpenCanvas = (id: string) => {
    router.push(`/editor?canvasId=${id}`);
  };

  const handleDeleteCanvas = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this canvas? This cannot be undone.")) return;
    
    const result = await deleteCanvas(id);
    if (result.success) {
      setCanvases((prev) => prev.filter((c) => c.id !== id));
    } else {
      alert(result.error || "Failed to delete");
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-stone-900/80 backdrop-blur-lg border-b border-stone-200 dark:border-stone-800">
        <div className="px-4 py-4 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-stone-900 dark:text-white">
                My Canvases
              </h1>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                {canvases.length} {canvases.length === 1 ? "project" : "projects"}
              </p>
            </div>
            {/* Desktop create button */}
            <button
              onClick={handleCreateNew}
              disabled={creating}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-terracotta-600 hover:bg-terracotta-700 text-white rounded-lg font-medium transition disabled:opacity-50"
            >
              {creating ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <PlusIcon className="w-5 h-5" />
                  New Canvas
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 max-w-6xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-3 border-terracotta-600 border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-error mb-4">{error}</p>
            <button
              onClick={loadCanvases}
              className="px-4 py-2 bg-terracotta-600 text-white rounded-lg"
            >
              Retry
            </button>
          </div>
        ) : canvases.length === 0 ? (
          <EmptyState onCreateNew={handleCreateNew} creating={creating} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {canvases.map((canvas) => (
              <CanvasCard
                key={canvas.id}
                canvas={canvas}
                onOpen={() => handleOpenCanvas(canvas.id)}
                onDelete={(e) => handleDeleteCanvas(canvas.id, e)}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </main>

      {/* Mobile FAB */}
      <button
        onClick={handleCreateNew}
        disabled={creating}
        className="sm:hidden fixed bottom-20 right-4 w-14 h-14 bg-terracotta-600 hover:bg-terracotta-700 text-white rounded-full shadow-lg shadow-terracotta-600/25 flex items-center justify-center transition active:scale-95 disabled:opacity-50 z-20"
        aria-label="Create new canvas"
      >
        {creating ? (
          <ArrowPathIcon className="w-6 h-6 animate-spin" />
        ) : (
          <PlusIcon className="w-6 h-6" />
        )}
      </button>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function EmptyState({ onCreateNew, creating }: { onCreateNew: () => void; creating: boolean }) {
  return (
    <div className="text-center py-20 px-4">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-terracotta-100 dark:bg-terracotta-900/30 flex items-center justify-center">
        <SparklesIcon className="w-10 h-10 text-terracotta-500" />
      </div>
      <h2 className="text-xl font-semibold text-stone-900 dark:text-white mb-2">
        No canvases yet
      </h2>
      <p className="text-stone-500 dark:text-stone-400 mb-6 max-w-sm mx-auto">
        Create your first needlepoint canvas from a photo
      </p>
      <button
        onClick={onCreateNew}
        disabled={creating}
        className="inline-flex items-center gap-2 px-6 py-3 bg-terracotta-600 hover:bg-terracotta-700 text-white rounded-xl font-medium transition disabled:opacity-50"
      >
        {creating ? (
          <>
            <ArrowPathIcon className="w-5 h-5 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <PlusIcon className="w-5 h-5" />
            Create Your First Canvas
          </>
        )}
      </button>
    </div>
  );
}

function CanvasCard({
  canvas,
  onOpen,
  onDelete,
  formatDate,
}: {
  canvas: CanvasListItem;
  onOpen: () => void;
  onDelete: (e: React.MouseEvent) => void;
  formatDate: (date: Date) => string;
}) {
  const aspectRatio = canvas.heightInches / canvas.widthInches;

  return (
    <button
      onClick={onOpen}
      className="group relative bg-white dark:bg-stone-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition text-left w-full"
    >
      {/* Thumbnail */}
      <div
        className="relative bg-stone-100 dark:bg-stone-700"
        style={{ paddingBottom: `${Math.min(aspectRatio * 100, 125)}%` }}
      >
        {canvas.manufacturerUrl ? (
          <img
            src={canvas.manufacturerUrl}
            alt={canvas.name || "Canvas"}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <SparklesIcon className="w-8 h-8 text-stone-300 dark:text-stone-600" />
          </div>
        )}
        
        {/* Status badge */}
        {canvas.status !== "DRAFT" && (
          <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium ${
            canvas.status === "COMPLETE" 
              ? "bg-success-light text-success-dark dark:bg-success/20 dark:text-success-light"
              : canvas.status === "PROCESSING"
              ? "bg-warning-light text-warning-dark dark:bg-warning/20 dark:text-warning-light"
              : "bg-error-light text-error-dark dark:bg-error/20 dark:text-error-light"
          }`}>
            {canvas.status.toLowerCase()}
          </div>
        )}

        {/* Delete button */}
        <button
          onClick={onDelete}
          className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Delete canvas"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-medium text-stone-900 dark:text-white truncate text-sm">
          {canvas.name || "Untitled Canvas"}
        </p>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
          {canvas.widthInches}" × {canvas.heightInches}" · {formatDate(canvas.updatedAt)}
        </p>
      </div>
    </button>
  );
}

// Icons are imported from @heroicons/react/24/outline
