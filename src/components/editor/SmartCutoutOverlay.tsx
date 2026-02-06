"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useEditorStore, useActiveSource } from "@/stores/editor-store";
import { detectSubjectsAction } from "@/actions/detectSubjects";
import { boundingBoxToPath } from "@/lib/vision/subject-detector";
import type { DetectedSubject } from "@/types/editor";

interface SmartCutoutOverlayProps {
  onComplete: () => void;
  onManualMode: () => void;
}

export function SmartCutoutOverlay({ onComplete, onManualMode }: SmartCutoutOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedSubjects, setDetectedSubjects] = useState<DetectedSubject[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const activeSource = useActiveSource();
  const addCutout = useEditorStore((s) => s.addCutout);
  const placeCutout = useEditorStore((s) => s.placeCutout);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Calculate image fit
  useEffect(() => {
    if (!activeSource || !dimensions.width || !dimensions.height) return;

    const containerAspect = dimensions.width / dimensions.height;
    const imageAspect = activeSource.width / activeSource.height;

    let fitWidth: number;
    let fitHeight: number;

    if (imageAspect > containerAspect) {
      fitWidth = dimensions.width;
      fitHeight = dimensions.width / imageAspect;
    } else {
      fitHeight = dimensions.height;
      fitWidth = dimensions.height * imageAspect;
    }

    setImageSize({ width: fitWidth, height: fitHeight });
    setImageOffset({
      x: (dimensions.width - fitWidth) / 2,
      y: (dimensions.height - fitHeight) / 2,
    });
  }, [activeSource, dimensions]);

  // Auto-detect subjects when image loads
  useEffect(() => {
    if (!activeSource?.url || detectedSubjects.length > 0 || isDetecting) return;

    const detect = async () => {
      setIsDetecting(true);
      setError(null);

      try {
        // Fetch the image and convert to data URL
        const response = await fetch(activeSource.url);
        const blob = await response.blob();
        
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });

        const result = await detectSubjectsAction(dataUrl);

        if (result.success && result.subjects) {
          const subjects: DetectedSubject[] = result.subjects.map((s) => ({
            ...s,
            selected: true,  // Default to selected
          }));
          setDetectedSubjects(subjects);
          // Auto-select all high-confidence subjects
          const autoSelect = new Set(
            subjects
              .filter((s) => s.confidence >= 0.7)
              .map((s) => s.id)
          );
          setSelectedIds(autoSelect);
        } else {
          setError(result.error || "Detection failed");
        }
      } catch (err) {
        console.error("Detection error:", err);
        setError("Failed to analyze image");
      } finally {
        setIsDetecting(false);
      }
    };

    detect();
  }, [activeSource?.url]);

  // Toggle subject selection
  const toggleSubject = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Confirm selections and create cutouts
  const handleConfirm = useCallback(() => {
    if (!activeSource) return;

    detectedSubjects
      .filter((s) => selectedIds.has(s.id))
      .forEach((subject) => {
        // Convert bounding box to lasso path
        const path = boundingBoxToPath(subject.boundingBox);

        const cutoutId = crypto.randomUUID();
        
        addCutout({
          id: cutoutId,
          sourceImageId: activeSource.id,
          path,
          name: subject.label,
        });

        // Auto-place on canvas
        placeCutout(cutoutId, {
          x: 0.5,
          y: 0.5,
          scale: 1,
          rotation: 0,
          flipX: false,
          flipY: false,
        });
      });

    onComplete();
  }, [activeSource, detectedSubjects, selectedIds, addCutout, placeCutout, onComplete]);

  if (!activeSource) return null;

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Source image */}
      <div
        className="absolute"
        style={{
          left: imageOffset.x,
          top: imageOffset.y,
          width: imageSize.width,
          height: imageSize.height,
        }}
      >
        <img
          src={activeSource.url}
          alt="Source"
          className="w-full h-full object-contain"
        />

        {/* Detection overlay boxes */}
        {detectedSubjects.map((subject) => {
          const isSelected = selectedIds.has(subject.id);
          const box = subject.boundingBox;

          return (
            <button
              key={subject.id}
              onClick={() => toggleSubject(subject.id)}
              className={`absolute border-2 rounded transition-all ${
                isSelected
                  ? "border-green-500 bg-green-500/20"
                  : "border-gray-400 bg-gray-500/10"
              }`}
              style={{
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                width: `${box.width * 100}%`,
                height: `${box.height * 100}%`,
              }}
            >
              {/* Checkbox indicator */}
              <div
                className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                  isSelected ? "bg-green-500" : "bg-gray-400"
                }`}
              >
                {isSelected ? "✓" : ""}
              </div>

              {/* Label */}
              <div
                className={`absolute -bottom-6 left-0 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                  isSelected
                    ? "bg-green-500 text-white"
                    : "bg-gray-500 text-white"
                }`}
              >
                {subject.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {isDetecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="bg-white dark:bg-gray-800 px-6 py-4 rounded-xl shadow-lg text-center">
            <div className="animate-spin w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Detecting subjects...
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !isDetecting && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 px-6 py-4 rounded-xl shadow-lg text-center max-w-xs">
            <p className="text-red-500 mb-3">{error}</p>
            <button
              onClick={onManualMode}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium"
            >
              Draw manually instead
            </button>
          </div>
        </div>
      )}

      {/* Bottom action bar */}
      {!isDetecting && detectedSubjects.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-4">
          <button
            onClick={onManualMode}
            className="px-4 py-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur text-gray-700 dark:text-gray-300 rounded-xl font-medium shadow-lg"
          >
            ✏️ Draw manually
          </button>

          <button
            onClick={handleConfirm}
            disabled={selectedIds.size === 0}
            className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue with {selectedIds.size} selected →
          </button>
        </div>
      )}

      {/* No subjects found */}
      {!isDetecting && !error && detectedSubjects.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 px-6 py-4 rounded-xl shadow-lg text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-3">
              No subjects detected
            </p>
            <button
              onClick={onManualMode}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium"
            >
              Draw selection manually
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
