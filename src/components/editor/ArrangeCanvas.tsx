"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Stage, Layer, Rect, Image as KonvaImage, Transformer, Group } from "react-konva";
import type Konva from "konva";
import { useEditorStore, usePlacedCutoutsSorted } from "@/stores/editor-store";
import type { PlacedCutout, Transform } from "@/types/editor";
import { extractCutoutWithWorker } from "@/lib/editor/extraction-worker";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

interface ArrangeCanvasProps {
  className?: string;
}

interface CutoutImage {
  id: string;
  cutoutId: string;
  image: HTMLImageElement;
  naturalWidth: number;
  naturalHeight: number;
}

// Cache for loaded images to avoid re-fetching
const imageCache = new Map<string, HTMLImageElement>();

export function ArrangeCanvas({ className }: ArrangeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [cutoutImages, setCutoutImages] = useState<Map<string, CutoutImage>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Pinch-to-zoom state
  const [pinchState, setPinchState] = useState<{
    initialDistance: number;
    initialScale: number;
    placedId: string;
  } | null>(null);

  const placedCutouts = usePlacedCutoutsSorted();
  const cutouts = useEditorStore((s) => s.cutouts);
  const sourceImages = useEditorStore((s) => s.sourceImages);
  const canvasConfig = useEditorStore((s) => s.canvasConfig);
  const updatePlacedCutout = useEditorStore((s) => s.updatePlacedCutout);
  const selectCutout = useEditorStore((s) => s.selectCutout);
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);

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

  // Calculate canvas dimensions to fit in container
  useEffect(() => {
    if (!dimensions.width || !dimensions.height) return;

    const canvasAspect = canvasConfig.widthInches / canvasConfig.heightInches;
    const containerAspect = dimensions.width / dimensions.height;
    
    const padding = 32; // px padding around canvas
    const availWidth = dimensions.width - padding * 2;
    const availHeight = dimensions.height - padding * 2;

    let canvasWidth: number;
    let canvasHeight: number;

    if (canvasAspect > containerAspect) {
      canvasWidth = availWidth;
      canvasHeight = availWidth / canvasAspect;
    } else {
      canvasHeight = availHeight;
      canvasWidth = availHeight * canvasAspect;
    }

    setCanvasDimensions({
      width: canvasWidth,
      height: canvasHeight,
      x: (dimensions.width - canvasWidth) / 2,
      y: (dimensions.height - canvasHeight) / 2,
    });
  }, [dimensions, canvasConfig]);

  // Load image with caching (supports both blob URLs and data URLs)
  const loadImage = useCallback(async (url: string): Promise<HTMLImageElement> => {
    const cached = imageCache.get(url);
    if (cached) return cached;
    
    const img = new Image();
    // Only set crossOrigin for external URLs, not data URLs
    if (!url.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.src = url;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    
    imageCache.set(url, img);
    return img;
  }, []);

  // Extract cutout images when placed cutouts change
  // Uses Promise.allSettled for parallel loading (1-2s faster)
  useEffect(() => {
    // Skip if no placements
    if (placedCutouts.length === 0) return;
    
    // Build a map for lookups (inside effect to avoid dependency issues)
    const cutoutsById = new Map(cutouts.map((c) => [c.id, c]));
    
    const extractImages = async () => {
      setIsExtracting(true);
      setExtractionError(null);
      
      // Process all cutouts in parallel
      const extractionPromises = placedCutouts.map(async (placed): Promise<{ cutoutId: string; image: CutoutImage } | null> => {
        // Check if we already have this cutout extracted
        const existing = cutoutImages.get(placed.cutoutId);
        if (existing) {
          return { cutoutId: placed.cutoutId, image: existing };
        }

        // Look up cutout
        const cutout = cutoutsById.get(placed.cutoutId);
        if (!cutout) {
          console.warn("Cutout not found:", placed.cutoutId);
          return null;
        }

        try {
          // If cutout has a pre-extracted URL, use it (faster)
          if (cutout.extractedUrl) {
            const img = await loadImage(cutout.extractedUrl);
            return {
              cutoutId: placed.cutoutId,
              image: {
                id: placed.id,
                cutoutId: placed.cutoutId,
                image: img,
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
              },
            };
          }

          // Otherwise, extract from source image
          const source = sourceImages.find((s) => s.id === cutout.sourceImageId);
          if (!source) {
            console.warn("Source image not found:", cutout.sourceImageId);
            return null;
          }

          // Extract the cutout pixels (uses Web Worker if available)
          const { dataUrl, width, height } = await extractCutoutWithWorker(
            source.url,
            cutout.path,
            { padding: 4, featherRadius: 2 }
          );

          // Load as image (dataUrl is always a data URL, no crossOrigin needed)
          const img = new Image();
          img.src = dataUrl;
          await new Promise((resolve, reject) => { 
            img.onload = resolve;
            img.onerror = reject;
          });

          return {
            cutoutId: placed.cutoutId,
            image: {
              id: placed.id,
              cutoutId: placed.cutoutId,
              image: img,
              naturalWidth: width,
              naturalHeight: height,
            },
          };
        } catch (err) {
          console.error("Failed to extract cutout:", err);
          return null;
        }
      });

      // Wait for all extractions in parallel
      const results = await Promise.allSettled(extractionPromises);
      
      const newImages = new Map<string, CutoutImage>();
      let hasErrors = false;
      
      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          newImages.set(result.value.cutoutId, result.value.image);
        } else if (result.status === "rejected") {
          console.error("Extraction failed:", result.reason);
          hasErrors = true;
        }
      }
      
      if (hasErrors && newImages.size === 0) {
        setExtractionError("Failed to extract cutouts");
      }

      setCutoutImages(newImages);
      setIsExtracting(false);
    };

    extractImages();
  }, [placedCutouts.length, cutouts, sourceImages, loadImage]); // Use .length to avoid reference changes

  // Update transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;

    const transformer = transformerRef.current;
    
    if (selectedId) {
      const node = stageRef.current.findOne(`#cutout-${selectedId}`);
      if (node) {
        transformer.nodes([node]);
        transformer.getLayer()?.batchDraw();
        return;
      }
    }
    
    transformer.nodes([]);
    transformer.getLayer()?.batchDraw();
  }, [selectedId]);

  // Handle cutout transform (drag, scale, rotate)
  const handleTransformEnd = useCallback(
    (placedId: string, node: Konva.Node, placed: PlacedCutout) => {
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      
      // Calculate new physical width based on node's current dimensions
      const pixelsPerInch = canvasDimensions.width / canvasConfig.widthInches;
      const currentDisplayWidth = node.width() * Math.abs(scaleX);
      const newWidthInches = currentDisplayWidth / pixelsPerInch;
      
      // Convert position to normalized (0-1) relative to canvas
      const newTransform: Partial<Transform> = {
        x: (node.x() - canvasDimensions.x) / canvasDimensions.width,
        y: (node.y() - canvasDimensions.y) / canvasDimensions.height,
        scale: 1, // Reset scale since we're updating widthInches directly
        rotation: node.rotation(),
        flipX: scaleX < 0,
        flipY: scaleY < 0,
      };

      // Reset scale on node
      node.scaleX(scaleX < 0 ? -1 : 1);
      node.scaleY(scaleY < 0 ? -1 : 1);

      updatePlacedCutout(placedId, { 
        transform: newTransform as Transform,
        widthInches: newWidthInches,
      });
    },
    [canvasDimensions, canvasConfig.widthInches, updatePlacedCutout]
  );

  // Handle stage click (deselect when clicking empty space)
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
      selectCutout(null);
    }
  }, [selectCutout]);

  // Calculate cutout position and size on canvas
  // Uses physical dimensions (inches) for consistent mesh sizing
  const getCutoutProps = (placed: PlacedCutout, cutoutImg: CutoutImage) => {
    const { transform, widthInches } = placed;
    
    // Use actual image dimensions for correct aspect ratio
    const actualAspectRatio = cutoutImg.naturalHeight / cutoutImg.naturalWidth;
    
    // Convert physical inches to display pixels
    // canvasDimensions.width pixels = canvasConfig.widthInches inches
    const pixelsPerInch = canvasDimensions.width / canvasConfig.widthInches;
    
    // Calculate display size from physical dimensions
    const width = widthInches * pixelsPerInch * transform.scale;
    const height = width * actualAspectRatio;

    return {
      x: canvasDimensions.x + transform.x * canvasDimensions.width,
      y: canvasDimensions.y + transform.y * canvasDimensions.height,
      width,
      height,
      rotation: transform.rotation,
      scaleX: transform.flipX ? -1 : 1,
      scaleY: transform.flipY ? -1 : 1,
      offsetX: width / 2,
      offsetY: height / 2,
    };
  };
  
  // Handle pinch-to-zoom gesture
  const handleTouchStart = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    if (touches.length !== 2) return;
    
    // Only allow pinch on selected cutout
    if (!selectedId) return;
    
    const placed = placedCutouts.find((p) => p.id === selectedId);
    if (!placed) return;
    
    const touch1 = touches[0];
    const touch2 = touches[1];
    const distance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );
    
    setPinchState({
      initialDistance: distance,
      initialScale: placed.transform.scale,
      placedId: selectedId,
    });
    
    e.evt.preventDefault();
  }, [selectedId, placedCutouts]);

  const handleTouchMove = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    if (!pinchState) return;
    
    const touches = e.evt.touches;
    if (touches.length !== 2) return;
    
    const touch1 = touches[0];
    const touch2 = touches[1];
    const currentDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );
    
    const scaleFactor = currentDistance / pinchState.initialDistance;
    const newScale = Math.max(0.1, Math.min(5, pinchState.initialScale * scaleFactor));
    
    updatePlacedCutout(pinchState.placedId, {
      transform: { scale: newScale } as Transform,
    });
    
    e.evt.preventDefault();
  }, [pinchState, updatePlacedCutout]);

  const handleTouchEnd = useCallback(() => {
    setPinchState(null);
  }, []);

  // Get background color
  const bgColor = canvasConfig.bgColor1;

  // Show loading state
  if (isExtracting && cutoutImages.size === 0) {
    return (
      <div ref={containerRef} className={className}>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <ArrowPathIcon className="w-10 h-10 animate-spin text-terracotta-500 mx-auto mb-2" />
            <p className="text-stone-500">Loading cutouts...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (extractionError) {
    return (
      <div ref={containerRef} className={className}>
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-error">
            <p className="text-xl mb-2">⚠️</p>
            <p>{extractionError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className}>
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Layer>
          {/* Canvas background - click to deselect */}
          <Rect
            x={canvasDimensions.x}
            y={canvasDimensions.y}
            width={canvasDimensions.width}
            height={canvasDimensions.height}
            fill={bgColor}
            shadowColor="black"
            shadowBlur={10}
            shadowOpacity={0.2}
            shadowOffset={{ x: 2, y: 2 }}
            cornerRadius={4}
            onClick={() => {
              setSelectedId(null);
              selectCutout(null);
            }}
            onTap={() => {
              setSelectedId(null);
              selectCutout(null);
            }}
          />

          {/* Pattern overlay for non-solid backgrounds */}
          {canvasConfig.bgPattern !== "solid" && canvasConfig.bgColor2 && (
            <PatternOverlay
              x={canvasDimensions.x}
              y={canvasDimensions.y}
              width={canvasDimensions.width}
              height={canvasDimensions.height}
              pattern={canvasConfig.bgPattern}
              color={canvasConfig.bgColor2}
            />
          )}

          {/* Placed cutouts - clipped to canvas area */}
          <Group
            clipFunc={(ctx) => {
              ctx.rect(
                canvasDimensions.x,
                canvasDimensions.y,
                canvasDimensions.width,
                canvasDimensions.height
              );
            }}
          >
            {placedCutouts.map((placed) => {
              const cutoutImg = cutoutImages.get(placed.cutoutId);
              if (!cutoutImg) return null;

              const props = getCutoutProps(placed, cutoutImg);

              return (
                <KonvaImage
                  key={placed.id}
                  id={`cutout-${placed.id}`}
                  image={cutoutImg.image}
                  {...props}
                  draggable
                  dragBoundFunc={(pos) => {
                    // Constrain dragging so cutout center stays within canvas
                    const minX = canvasDimensions.x;
                    const maxX = canvasDimensions.x + canvasDimensions.width;
                    const minY = canvasDimensions.y;
                    const maxY = canvasDimensions.y + canvasDimensions.height;
                    
                    return {
                      x: Math.max(minX, Math.min(maxX, pos.x)),
                      y: Math.max(minY, Math.min(maxY, pos.y)),
                    };
                  }}
                  onClick={() => {
                    setSelectedId(placed.id);
                    selectCutout(placed.cutoutId);
                  }}
                  onTap={() => {
                    setSelectedId(placed.id);
                    selectCutout(placed.cutoutId);
                  }}
                  onDragEnd={(e) => handleTransformEnd(placed.id, e.target, placed)}
                  onTransformEnd={(e) => handleTransformEnd(placed.id, e.target, placed)}
                />
              );
            })}
          </Group>

          {/* Transformer for selected cutout */}
          <Transformer
            ref={transformerRef}
            keepRatio={true}
            boundBoxFunc={(oldBox, newBox) => {
              // Limit resize to reasonable bounds
              const minSize = 20;
              if (newBox.width < minSize || newBox.height < minSize) {
                return oldBox;
              }
              return newBox;
            }}
            rotateEnabled={true}
            enabledAnchors={[
              "top-left",
              "top-right",
              "bottom-left",
              "bottom-right",
            ]}
            anchorSize={32}
            anchorCornerRadius={16}
            borderStroke="#E86142"
            borderStrokeWidth={2}
            anchorStroke="#E86142"
            anchorFill="#ffffff"
          />
        </Layer>
      </Stage>
    </div>
  );
}

// Simple pattern overlay component
function PatternOverlay({
  x,
  y,
  width,
  height,
  pattern,
  color,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  pattern: string;
  color: string;
}) {
  // For now, just render stripes as an example
  if (pattern === "stripes") {
    const stripeWidth = 10;
    const stripes = [];
    for (let i = 0; i < width / stripeWidth; i += 2) {
      stripes.push(
        <Rect
          key={i}
          x={x + i * stripeWidth}
          y={y}
          width={stripeWidth}
          height={height}
          fill={color}
          opacity={0.3}
        />
      );
    }
    return <>{stripes}</>;
  }

  // Gingham pattern (simplified)
  if (pattern === "gingham") {
    const size = 20;
    const rects = [];
    for (let row = 0; row < Math.ceil(height / size); row++) {
      for (let col = 0; col < Math.ceil(width / size); col++) {
        if ((row + col) % 2 === 0) {
          rects.push(
            <Rect
              key={`${row}-${col}`}
              x={x + col * size}
              y={y + row * size}
              width={size}
              height={size}
              fill={color}
              opacity={0.3}
            />
          );
        }
      }
    }
    return <>{rects}</>;
  }

  return null;
}
