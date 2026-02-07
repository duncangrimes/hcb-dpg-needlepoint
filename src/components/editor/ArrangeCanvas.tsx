"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Stage, Layer, Rect, Image as KonvaImage, Transformer } from "react-konva";
import type Konva from "konva";
import { useEditorStore, usePlacedCutoutsSorted, useActiveSource } from "@/stores/editor-store";
import type { PlacedCutout, Transform } from "@/types/editor";
import { extractCutout } from "@/lib/editor/extraction";

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

export function ArrangeCanvas({ className }: ArrangeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [cutoutImages, setCutoutImages] = useState<Map<string, CutoutImage>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const placedCutouts = usePlacedCutoutsSorted();
  const sourceImages = useEditorStore((s) => s.sourceImages);
  const canvasConfig = useEditorStore((s) => s.canvasConfig);
  const updatePlacedCutout = useEditorStore((s) => s.updatePlacedCutout);
  const selectCutout = useEditorStore((s) => s.selectCutout);

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

  // Extract cutout images when placed cutouts change
  useEffect(() => {
    const extractImages = async () => {
      const newImages = new Map<string, CutoutImage>();

      for (const placed of placedCutouts) {
        // Check if we already have this cutout extracted
        const existing = cutoutImages.get(placed.cutoutId);
        if (existing) {
          newImages.set(placed.cutoutId, existing);
          continue;
        }

        // Find source image
        const source = sourceImages.find((s) => s.id === placed.cutout.sourceImageId);
        if (!source) continue;

        try {
          // Extract the cutout pixels
          const { dataUrl, width, height } = await extractCutout(
            source.url,
            placed.cutout.path,
            { padding: 4, featherRadius: 2 }
          );

          // Load as image
          const img = new Image();
          img.src = dataUrl;
          await new Promise((resolve) => { img.onload = resolve; });

          newImages.set(placed.cutoutId, {
            id: placed.id,
            cutoutId: placed.cutoutId,
            image: img,
            naturalWidth: width,
            naturalHeight: height,
          });
        } catch (err) {
          console.error("Failed to extract cutout:", err);
        }
      }

      setCutoutImages(newImages);
    };

    extractImages();
  }, [placedCutouts, sourceImages]);

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
    const { transform, widthInches, aspectRatio } = placed;
    
    // Convert physical inches to display pixels
    // canvasDimensions.width pixels = canvasConfig.widthInches inches
    const pixelsPerInch = canvasDimensions.width / canvasConfig.widthInches;
    
    // Calculate display size from physical dimensions
    const width = widthInches * pixelsPerInch * transform.scale;
    const height = width * aspectRatio;

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

  // Get background color
  const bgColor = canvasConfig.bgColor1;

  return (
    <div ref={containerRef} className={className}>
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleStageClick}
        onTap={handleStageClick}
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

          {/* Placed cutouts */}
          {placedCutouts.map((placed) => {
            const cutoutImg = cutoutImages.get(placed.cutoutId);
            if (!cutoutImg) return null;

            const props = getCutoutProps(placed, cutoutImg);
            const isSelected = selectedId === placed.id;

            return (
              <KonvaImage
                key={placed.id}
                id={`cutout-${placed.id}`}
                image={cutoutImg.image}
                {...props}
                draggable
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

          {/* Transformer for selected cutout */}
          <Transformer
            ref={transformerRef}
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
            anchorSize={24}
            anchorCornerRadius={12}
            borderStroke="#6366f1"
            borderStrokeWidth={2}
            anchorStroke="#6366f1"
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
