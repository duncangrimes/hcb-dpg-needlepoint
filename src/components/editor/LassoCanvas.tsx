"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Stage, Layer, Line, Circle, Image as KonvaImage } from "react-konva";
import { useEditorStore, useActiveSource } from "@/stores/editor-store";
import { saveCutout } from "@/actions/cutouts";
import type { Point } from "@/types/editor";

interface LassoCanvasProps {
  className?: string;
  onCutoutComplete?: () => void;
}

const CLOSE_THRESHOLD = 20; // px to detect path close
const MIN_PATH_LENGTH = 10; // minimum points for valid lasso

export function LassoCanvas({ className, onCutoutComplete }: LassoCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

  const activeSource = useActiveSource();
  const tool = useEditorStore((s) => s.tool);
  const isDrawing = useEditorStore((s) => s.isDrawing);
  const currentPath = useEditorStore((s) => s.currentPath);
  const cutouts = useEditorStore((s) => s.cutouts);
  const activeCutoutId = useEditorStore((s) => s.activeCutoutId);

  const startDrawing = useEditorStore((s) => s.startDrawing);
  const continueDrawing = useEditorStore((s) => s.continueDrawing);
  const finishDrawing = useEditorStore((s) => s.finishDrawing);
  const cancelDrawing = useEditorStore((s) => s.cancelDrawing);
  const selectCutout = useEditorStore((s) => s.selectCutout);
  const updateCutout = useEditorStore((s) => s.updateCutout);

  // Load source image
  useEffect(() => {
    if (!activeSource?.url) {
      setLoadedImage(null);
      return;
    }

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = activeSource.url;
    img.onload = () => setLoadedImage(img);

    return () => {
      img.onload = null;
    };
  }, [activeSource?.url]);

  // Resize observer for container
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

  // Calculate image fit dimensions
  useEffect(() => {
    if (!loadedImage || !dimensions.width || !dimensions.height) return;

    const containerAspect = dimensions.width / dimensions.height;
    const imageAspect = loadedImage.width / loadedImage.height;

    let fitWidth: number;
    let fitHeight: number;

    if (imageAspect > containerAspect) {
      // Image is wider - fit to width
      fitWidth = dimensions.width;
      fitHeight = dimensions.width / imageAspect;
    } else {
      // Image is taller - fit to height
      fitHeight = dimensions.height;
      fitWidth = dimensions.height * imageAspect;
    }

    setImageSize({ width: fitWidth, height: fitHeight });
    setImageOffset({
      x: (dimensions.width - fitWidth) / 2,
      y: (dimensions.height - fitHeight) / 2,
    });
  }, [loadedImage, dimensions]);

  // Convert screen coords to normalized (0-1) coords relative to image
  const screenToNormalized = useCallback(
    (screenX: number, screenY: number): Point | null => {
      if (!imageSize.width || !imageSize.height) return null;

      const x = (screenX - imageOffset.x) / imageSize.width;
      const y = (screenY - imageOffset.y) / imageSize.height;

      // Only allow points within image bounds
      if (x < 0 || x > 1 || y < 0 || y > 1) return null;

      return { x, y };
    },
    [imageSize, imageOffset]
  );

  // Convert normalized coords back to screen coords
  const normalizedToScreen = useCallback(
    (point: Point): { x: number; y: number } => {
      return {
        x: point.x * imageSize.width + imageOffset.x,
        y: point.y * imageSize.height + imageOffset.y,
      };
    },
    [imageSize, imageOffset]
  );

  // Check if point is near the start point (for closing the path)
  const isNearStart = useCallback(
    (point: Point): boolean => {
      if (currentPath.length < MIN_PATH_LENGTH) return false;

      const startScreen = normalizedToScreen(currentPath[0]);
      const pointScreen = normalizedToScreen(point);

      const distance = Math.hypot(
        pointScreen.x - startScreen.x,
        pointScreen.y - startScreen.y
      );

      return distance < CLOSE_THRESHOLD;
    },
    [currentPath, normalizedToScreen]
  );

  // Mouse/touch event handlers - using Konva's event system
  const handlePointerDown = useCallback(
    (e: any) => {
      if (tool !== "lasso") return;

      // Get stage from the event target
      const stage = e.target.getStage();
      if (!stage) return;
      
      const pos = stage.getPointerPosition();
      if (!pos) return;

      const normalized = screenToNormalized(pos.x, pos.y);
      if (!normalized) return;

      startDrawing(normalized);
    },
    [tool, screenToNormalized, startDrawing]
  );

  const handlePointerMove = useCallback(
    (e: any) => {
      if (!isDrawing || tool !== "lasso") return;

      const stage = e.target.getStage();
      if (!stage) return;
      
      const pos = stage.getPointerPosition();
      if (!pos) return;

      const normalized = screenToNormalized(pos.x, pos.y);
      if (!normalized) return;

      continueDrawing(normalized);
    },
    [isDrawing, tool, screenToNormalized, continueDrawing]
  );

  const handlePointerUp = useCallback(async () => {
    if (!isDrawing) return;

    if (currentPath.length >= MIN_PATH_LENGTH && activeSource) {
      // Capture the path before finishDrawing clears it
      const pathToSave = [...currentPath];
      
      // Calculate aspect ratio from path bounds
      const pathXs = pathToSave.map(p => p.x);
      const pathYs = pathToSave.map(p => p.y);
      const pathWidth = Math.max(...pathXs) - Math.min(...pathXs);
      const pathHeight = Math.max(...pathYs) - Math.min(...pathYs);
      const aspectRatio = pathHeight / Math.max(pathWidth, 0.001);
      
      // Create cutout in store (shows immediately)
      finishDrawing();
      
      // Get the cutout ID that was just created
      const newCutoutId = useEditorStore.getState().activeCutoutId;
      
      onCutoutComplete?.();
      
      // Defer heavy extraction work to avoid UI freeze
      // Use setTimeout to let the UI update first, then do extraction in idle time
      setTimeout(() => {
        // Use requestIdleCallback if available for better scheduling
        const doExtraction = async () => {
          try {
            // Dynamically import extraction to avoid SSR issues
            const { extractCutout, createCutoutThumbnail } = await import("@/lib/editor/extraction");
            
            // Extract the cutout image
            const { dataUrl } = await extractCutout(
              activeSource.url,
              pathToSave,
              { padding: 4, featherRadius: 2 }
            );
            
            // Create thumbnail for library
            const thumbnailDataUrl = await createCutoutThumbnail(dataUrl, 200);
            
            // Save to database with extracted images
            const result = await saveCutout({
              sourceImageId: activeSource.id,
              path: pathToSave,
              aspectRatio,
              extractedDataUrl: dataUrl,
              thumbnailDataUrl,
            });
            
            if (!result.success) {
              console.error("Failed to save cutout:", result.error);
            } else if (result.cutout?.extractedUrl && newCutoutId) {
              // Update the store's cutout with the blob storage URL
              updateCutout(newCutoutId, { extractedUrl: result.cutout.extractedUrl });
            }
          } catch (err) {
            console.error("Failed to extract/save cutout:", err);
            // Still try to save without extracted image
            saveCutout({
              sourceImageId: activeSource.id,
              path: pathToSave,
              aspectRatio,
            });
          }
        };
        
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(doExtraction, { timeout: 2000 });
        } else {
          doExtraction();
        }
      }, 50); // Small delay to let UI update
    } else {
      cancelDrawing();
    }
  }, [isDrawing, currentPath, activeSource, finishDrawing, cancelDrawing, onCutoutComplete, updateCutout]);

  // Convert path to flat array for Konva Line
  const pathToPoints = useCallback(
    (path: Point[]): number[] => {
      return path.flatMap((p) => {
        const screen = normalizedToScreen(p);
        return [screen.x, screen.y];
      });
    },
    [normalizedToScreen]
  );

  // Get cutouts for the active source
  const sourceCutouts = cutouts.filter(
    (c) => c.sourceImageId === activeSource?.id
  );

  if (!activeSource) {
    return (
      <div className={className}>
        <div className="h-full flex items-center justify-center text-stone-500">
          No image loaded
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className}>
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        style={{ touchAction: "none" }}
      >
        <Layer>
          {/* Source Image */}
          {loadedImage && (
            <KonvaImage
              image={loadedImage}
              x={imageOffset.x}
              y={imageOffset.y}
              width={imageSize.width}
              height={imageSize.height}
            />
          )}

          {/* Completed cutouts */}
          {sourceCutouts.map((cutout) => (
            <Line
              key={cutout.id}
              points={pathToPoints(cutout.path)}
              closed
              stroke={activeCutoutId === cutout.id ? "#E86142" : "#7A8A5E"}
              strokeWidth={activeCutoutId === cutout.id ? 3 : 2}
              dash={[5, 5]}
              fill={
                activeCutoutId === cutout.id
                  ? "rgba(232, 97, 66, 0.2)"
                  : "rgba(122, 138, 94, 0.15)"
              }
              onClick={() => selectCutout(cutout.id)}
              onTap={() => selectCutout(cutout.id)}
              hitStrokeWidth={20}
            />
          ))}

          {/* Current drawing path */}
          {isDrawing && currentPath.length > 0 && (
            <>
              <Line
                points={pathToPoints(currentPath)}
                stroke="#FBBF24"
                strokeWidth={2}
                dash={[4, 4]}
                lineCap="round"
                lineJoin="round"
              />
              {/* Start point indicator */}
              {currentPath.length >= MIN_PATH_LENGTH && (
                <Circle
                  x={normalizedToScreen(currentPath[0]).x}
                  y={normalizedToScreen(currentPath[0]).y}
                  radius={CLOSE_THRESHOLD / 2}
                  stroke="#FBBF24"
                  strokeWidth={2}
                  fill="rgba(251, 191, 36, 0.3)"
                />
              )}
            </>
          )}
        </Layer>
      </Stage>
    </div>
  );
}
