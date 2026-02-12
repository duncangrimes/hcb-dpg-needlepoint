"use client";

import { useState, useRef, useCallback } from "react";
import type { PreviewView } from "./PreviewToggle";

interface PreviewImageProps {
  canvasPreviewUrl: string;
  stitchedPreviewUrl: string;
  activeView: PreviewView;
  onViewChange: (view: PreviewView) => void;
  aspectRatio: string;
}

const SWIPE_THRESHOLD = 50; // Minimum pixels to trigger swipe

/**
 * Swipeable preview image container with crossfade animation.
 * 
 * Features:
 * - Touch swipe left/right to toggle views
 * - 300ms crossfade transition between images
 * - Maintains aspect ratio of canvas
 */
export function PreviewImage({
  canvasPreviewUrl,
  stitchedPreviewUrl,
  activeView,
  onViewChange,
  aspectRatio,
}: PreviewImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Prevent default to avoid page scrolling during swipe
    if (isDragging && touchStartX.current !== null) {
      const deltaX = e.touches[0].clientX - touchStartX.current;
      if (Math.abs(deltaX) > 10) {
        e.preventDefault();
      }
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX.current;

    // Swipe right → show canvas (left option)
    if (deltaX > SWIPE_THRESHOLD && activeView === "stitched") {
      onViewChange("canvas");
    }
    // Swipe left → show stitched (right option)
    else if (deltaX < -SWIPE_THRESHOLD && activeView === "canvas") {
      onViewChange("stitched");
    }

    touchStartX.current = null;
    setIsDragging(false);
  }, [activeView, onViewChange]);

  // Mouse swipe support for desktop testing
  const mouseStartX = useRef<number | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseStartX.current = e.clientX;
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (mouseStartX.current === null) return;

    const deltaX = e.clientX - mouseStartX.current;

    if (deltaX > SWIPE_THRESHOLD && activeView === "stitched") {
      onViewChange("canvas");
    } else if (deltaX < -SWIPE_THRESHOLD && activeView === "canvas") {
      onViewChange("stitched");
    }

    mouseStartX.current = null;
  }, [activeView, onViewChange]);

  const currentUrl = activeView === "canvas" ? canvasPreviewUrl : stitchedPreviewUrl;
  const altUrl = activeView === "canvas" ? stitchedPreviewUrl : canvasPreviewUrl;

  return (
    <div
      ref={containerRef}
      id="preview-image"
      role="tabpanel"
      aria-label={activeView === "canvas" ? "Canvas preview with mesh grid" : "Stitched preview showing finished look"}
      className="relative bg-white shadow-lg rounded-lg overflow-hidden cursor-grab active:cursor-grabbing select-none"
      style={{
        aspectRatio,
        maxWidth: "100%",
        maxHeight: "50%",
        width: "auto",
        height: "50%",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {/* Background image (for preloading / smooth transition) */}
      <img
        src={altUrl}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-contain opacity-0"
        style={{ imageRendering: "pixelated" }}
      />
      
      {/* Active image with crossfade */}
      <img
        src={currentUrl}
        alt={activeView === "canvas" 
          ? "Your needlepoint canvas with mesh grid overlay" 
          : "Preview of your finished stitched needlepoint"
        }
        className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300"
        style={{ imageRendering: "pixelated" }}
      />

      {/* Swipe hint indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        <div 
          className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
            activeView === "canvas" 
              ? "bg-terracotta-500" 
              : "bg-stone-300 dark:bg-stone-600"
          }`}
        />
        <div 
          className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
            activeView === "stitched" 
              ? "bg-terracotta-500" 
              : "bg-stone-300 dark:bg-stone-600"
          }`}
        />
      </div>
    </div>
  );
}
