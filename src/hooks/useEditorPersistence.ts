"use client";

import { useEffect, useCallback, useRef } from "react";
import { useEditorStore } from "@/stores/editor-store";
import type { BackgroundPattern, EditorStep } from "@/types/editor";

const STORAGE_KEY = "needlepoint_editor_session";
const DEBOUNCE_MS = 1000;

interface PersistedEditorState {
  sourceImages: Array<{
    id: string;
    url: string;
    width: number;
    height: number;
  }>;
  cutouts: Array<{
    id: string;
    sourceImageId: string;
    path: Array<{ x: number; y: number }>;
  }>;
  placedCutouts: Array<{
    id: string;
    cutoutId: string;
    transform: { x: number; y: number; rotation: number };
    zIndex: number;
    widthInches: number;
    aspectRatio: number;
  }>;
  canvasConfig: {
    widthInches: number;
    heightInches: number;
    meshCount: number;
    bgPattern: BackgroundPattern;
    bgColor1: string;
    bgColor2?: string;
  };
  step: EditorStep;
  timestamp: number;
}

/**
 * Persist editor state to localStorage for anonymous users.
 * Allows work to survive page refreshes and browser closes.
 */
export function useEditorPersistence() {
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const hasRestoredRef = useRef(false);

  const sourceImages = useEditorStore((s) => s.sourceImages);
  const cutouts = useEditorStore((s) => s.cutouts);
  const placedCutouts = useEditorStore((s) => s.placedCutouts);
  const canvasConfig = useEditorStore((s) => s.canvasConfig);
  const step = useEditorStore((s) => s.step);
  const canvasId = useEditorStore((s) => s.canvasId);
  
  const addSourceImage = useEditorStore((s) => s.addSourceImage);
  const addCutout = useEditorStore((s) => s.addCutout);
  const placeCutout = useEditorStore((s) => s.placeCutout);
  const setCanvasConfig = useEditorStore((s) => s.setCanvasConfig);
  const setStep = useEditorStore((s) => s.setStep);

  // Save state to localStorage (debounced)
  const saveState = useCallback(() => {
    // Don't save if there's already a cloud-saved canvas
    if (canvasId) return;
    // Don't save if nothing to save
    if (sourceImages.length === 0) return;

    const state: PersistedEditorState = {
      sourceImages: sourceImages.map((img) => ({
        id: img.id,
        url: img.url,
        width: img.width,
        height: img.height,
      })),
      cutouts: cutouts.map((c) => ({
        id: c.id,
        sourceImageId: c.sourceImageId,
        path: c.path,
      })),
      placedCutouts: placedCutouts.map((pc) => ({
        id: pc.id,
        cutoutId: pc.cutoutId,
        transform: pc.transform,
        zIndex: pc.zIndex,
        widthInches: pc.widthInches,
        aspectRatio: pc.aspectRatio,
      })),
      canvasConfig: {
        widthInches: canvasConfig.widthInches,
        heightInches: canvasConfig.heightInches,
        meshCount: canvasConfig.meshCount,
        bgPattern: canvasConfig.bgPattern,
        bgColor1: canvasConfig.bgColor1,
        bgColor2: canvasConfig.bgColor2,
      },
      step,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("Failed to save editor state:", err);
    }
  }, [sourceImages, cutouts, placedCutouts, canvasConfig, step, canvasId]);

  // Debounced save on state changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(saveState, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [saveState]);

  // Restore state from localStorage on mount
  useEffect(() => {
    // Only restore once, and only if no canvasId in URL
    if (hasRestoredRef.current || canvasId) return;
    hasRestoredRef.current = true;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const state: PersistedEditorState = JSON.parse(stored);
      
      // Check if session is recent (within 7 days)
      const maxAge = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - state.timestamp > maxAge) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      // Restore state
      if (state.canvasConfig) {
        setCanvasConfig(state.canvasConfig);
      }

      // Restore source images
      for (const img of state.sourceImages || []) {
        addSourceImage(img);
      }

      // Restore cutouts (but not placements yet - those come from placedCutouts)
      for (const cutout of state.cutouts || []) {
        addCutout(cutout);
      }

      // Restore placements
      for (const pc of state.placedCutouts || []) {
        // placeCutout checks if already placed, so safe to call
        // But we need to update the transform after
        const store = useEditorStore.getState();
        const existing = store.placedCutouts.find((p) => p.cutoutId === pc.cutoutId);
        if (!existing) {
          placeCutout(pc.cutoutId, pc.transform);
          // Update other properties
          const newStore = useEditorStore.getState();
          const placed = newStore.placedCutouts.find((p) => p.cutoutId === pc.cutoutId);
          if (placed) {
            useEditorStore.getState().updatePlacedCutout(placed.id, {
              widthInches: pc.widthInches,
              aspectRatio: pc.aspectRatio,
              zIndex: pc.zIndex,
            });
          }
        }
      }

      // Restore step
      if (state.step && state.step !== "upload") {
        setStep(state.step);
      }
    } catch (err) {
      console.warn("Failed to restore editor state:", err);
    }
  }, [canvasId, addSourceImage, addCutout, placeCutout, setCanvasConfig, setStep]);

  // Clear saved state
  const clearPersistedState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Check if there's a saved session
  const hasSavedSession = useCallback((): boolean => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return false;
      
      const state: PersistedEditorState = JSON.parse(stored);
      const maxAge = 7 * 24 * 60 * 60 * 1000;
      return Date.now() - state.timestamp <= maxAge && state.sourceImages.length > 0;
    } catch {
      return false;
    }
  }, []);

  return {
    clearPersistedState,
    hasSavedSession,
  };
}

/**
 * Clear the persisted editor session.
 * Call this after successfully saving to cloud.
 */
export function clearEditorSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("Failed to clear editor session:", err);
  }
}
