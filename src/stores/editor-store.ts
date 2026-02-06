/**
 * Editor Store (Zustand)
 * 
 * Central state management for the lasso editor.
 * Uses immer for immutable updates and zundo for undo/redo.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { temporal } from 'zundo';
import {
  DEFAULT_TRANSFORM,
  DEFAULT_CANVAS_CONFIG,
  type EditorState,
  type EditorStep,
  type EditorTool,
  type SourceImage,
  type Cutout,
  type PlacedCutout,
  type Point,
  type Transform,
  type CanvasConfig,
} from '@/types/editor';

// =============================================================================
// Store Interface
// =============================================================================

interface EditorActions {
  // Navigation
  setStep: (step: EditorStep) => void;
  
  // Source Images
  addSourceImage: (image: SourceImage) => void;
  setActiveSource: (id: string | null) => void;
  removeSourceImage: (id: string) => void;
  
  // Drawing
  setTool: (tool: EditorTool) => void;
  startDrawing: (point: Point) => void;
  continueDrawing: (point: Point) => void;
  finishDrawing: (name?: string) => void;
  cancelDrawing: () => void;
  
  // Cutouts
  addCutout: (cutout: Cutout) => void;
  updateCutout: (id: string, updates: Partial<Cutout>) => void;
  removeCutout: (id: string) => void;
  selectCutout: (id: string | null) => void;
  
  // Placed Cutouts (on canvas)
  placeCutout: (cutoutId: string, transform?: Partial<Transform>) => void;
  updatePlacedCutout: (id: string, updates: Partial<PlacedCutout>) => void;
  removePlacedCutout: (id: string) => void;
  reorderCutouts: (fromIndex: number, toIndex: number) => void;
  
  // Canvas Config
  setCanvasConfig: (config: Partial<CanvasConfig>) => void;
  
  // Processing
  setProcessing: (isProcessing: boolean, progress?: number) => void;
  
  // Reset
  reset: () => void;
}

type EditorStore = EditorState & EditorActions;

// =============================================================================
// Initial State
// =============================================================================

const initialState: EditorState = {
  step: 'upload',
  sourceImages: [],
  activeSourceId: null,
  cutouts: [],
  placedCutouts: [],
  activeCutoutId: null,
  tool: 'lasso',
  isDrawing: false,
  currentPath: [],
  canvasConfig: { ...DEFAULT_CANVAS_CONFIG },
  isProcessing: false,
};

// =============================================================================
// Store
// =============================================================================

export const useEditorStore = create<EditorStore>()(
  temporal(
    immer((set, get) => ({
      ...initialState,

      // =========================================================================
      // Navigation
      // =========================================================================
      
      setStep: (step) => set((state) => {
        state.step = step;
      }),

      // =========================================================================
      // Source Images
      // =========================================================================
      
      addSourceImage: (image) => set((state) => {
        state.sourceImages.push(image);
        state.activeSourceId = image.id;
        // Auto-advance to cutout step
        if (state.step === 'upload') {
          state.step = 'cutout';
        }
      }),

      setActiveSource: (id) => set((state) => {
        state.activeSourceId = id;
      }),

      removeSourceImage: (id) => set((state) => {
        state.sourceImages = state.sourceImages.filter((img) => img.id !== id);
        // Remove associated cutouts
        const cutoutIds = state.cutouts
          .filter((c) => c.sourceImageId === id)
          .map((c) => c.id);
        state.cutouts = state.cutouts.filter((c) => c.sourceImageId !== id);
        state.placedCutouts = state.placedCutouts.filter(
          (pc) => !cutoutIds.includes(pc.cutoutId)
        );
        // Update active source
        if (state.activeSourceId === id) {
          state.activeSourceId = state.sourceImages[0]?.id ?? null;
        }
      }),

      // =========================================================================
      // Drawing
      // =========================================================================
      
      setTool: (tool) => set((state) => {
        state.tool = tool;
        if (state.isDrawing) {
          state.isDrawing = false;
          state.currentPath = [];
        }
      }),

      startDrawing: (point) => set((state) => {
        if (state.tool !== 'lasso') return;
        state.isDrawing = true;
        state.currentPath = [point];
      }),

      continueDrawing: (point) => set((state) => {
        if (!state.isDrawing) return;
        state.currentPath.push(point);
      }),

      finishDrawing: (name) => set((state) => {
        if (!state.isDrawing || state.currentPath.length < 3) {
          state.isDrawing = false;
          state.currentPath = [];
          return;
        }
        
        const activeSourceId = state.activeSourceId;
        if (!activeSourceId) {
          state.isDrawing = false;
          state.currentPath = [];
          return;
        }

        // Create new cutout
        const newCutout: Cutout = {
          id: crypto.randomUUID(),
          sourceImageId: activeSourceId,
          path: [...state.currentPath],
          name,
        };
        state.cutouts.push(newCutout);

        // Auto-place on canvas
        const newPlacement: PlacedCutout = {
          id: crypto.randomUUID(),
          cutoutId: newCutout.id,
          cutout: newCutout,
          transform: { ...DEFAULT_TRANSFORM },
          zIndex: state.placedCutouts.length,
        };
        state.placedCutouts.push(newPlacement);
        state.activeCutoutId = newCutout.id;

        // Reset drawing state
        state.isDrawing = false;
        state.currentPath = [];
      }),

      cancelDrawing: () => set((state) => {
        state.isDrawing = false;
        state.currentPath = [];
      }),

      // =========================================================================
      // Cutouts
      // =========================================================================
      
      addCutout: (cutout) => set((state) => {
        state.cutouts.push(cutout);
      }),

      updateCutout: (id, updates) => set((state) => {
        const cutout = state.cutouts.find((c) => c.id === id);
        if (cutout) {
          Object.assign(cutout, updates);
        }
        // Update references in placed cutouts
        state.placedCutouts.forEach((pc) => {
          if (pc.cutoutId === id && pc.cutout) {
            Object.assign(pc.cutout, updates);
          }
        });
      }),

      removeCutout: (id) => set((state) => {
        state.cutouts = state.cutouts.filter((c) => c.id !== id);
        state.placedCutouts = state.placedCutouts.filter((pc) => pc.cutoutId !== id);
        if (state.activeCutoutId === id) {
          state.activeCutoutId = null;
        }
      }),

      selectCutout: (id) => set((state) => {
        state.activeCutoutId = id;
      }),

      // =========================================================================
      // Placed Cutouts
      // =========================================================================
      
      placeCutout: (cutoutId, transform) => set((state) => {
        const cutout = state.cutouts.find((c) => c.id === cutoutId);
        if (!cutout) return;
        
        // Check if already placed
        const existing = state.placedCutouts.find((pc) => pc.cutoutId === cutoutId);
        if (existing) return;

        const newPlacement: PlacedCutout = {
          id: crypto.randomUUID(),
          cutoutId,
          cutout,
          transform: { ...DEFAULT_TRANSFORM, ...transform },
          zIndex: state.placedCutouts.length,
        };
        state.placedCutouts.push(newPlacement);
      }),

      updatePlacedCutout: (id, updates) => set((state) => {
        const placement = state.placedCutouts.find((pc) => pc.id === id);
        if (placement) {
          if (updates.transform) {
            placement.transform = { ...placement.transform, ...updates.transform };
          }
          if (updates.zIndex !== undefined) {
            placement.zIndex = updates.zIndex;
          }
        }
      }),

      removePlacedCutout: (id) => set((state) => {
        state.placedCutouts = state.placedCutouts.filter((pc) => pc.id !== id);
      }),

      reorderCutouts: (fromIndex, toIndex) => set((state) => {
        const [removed] = state.placedCutouts.splice(fromIndex, 1);
        state.placedCutouts.splice(toIndex, 0, removed);
        // Update z-indices
        state.placedCutouts.forEach((pc, i) => {
          pc.zIndex = i;
        });
      }),

      // =========================================================================
      // Canvas Config
      // =========================================================================
      
      setCanvasConfig: (config) => set((state) => {
        Object.assign(state.canvasConfig, config);
      }),

      // =========================================================================
      // Processing
      // =========================================================================
      
      setProcessing: (isProcessing, progress) => set((state) => {
        state.isProcessing = isProcessing;
        state.processingProgress = progress;
      }),

      // =========================================================================
      // Reset
      // =========================================================================
      
      reset: () => set(() => ({ ...initialState })),
    })),
    {
      limit: 50, // Undo history limit
      partialize: (state) => {
        // Only track these fields for undo/redo
        const { cutouts, placedCutouts, canvasConfig } = state;
        return { cutouts, placedCutouts, canvasConfig };
      },
    }
  )
);

// =============================================================================
// Undo/Redo Hook
// =============================================================================

export const useEditorHistory = () => {
  const { undo, redo, pastStates, futureStates } = useEditorStore.temporal.getState();
  return {
    undo,
    redo,
    canUndo: pastStates.length > 0,
    canRedo: futureStates.length > 0,
  };
};

// =============================================================================
// Selectors
// =============================================================================

export const useActiveSource = () => {
  const { sourceImages, activeSourceId } = useEditorStore();
  return sourceImages.find((img) => img.id === activeSourceId) ?? null;
};

export const useActiveCutout = () => {
  const { cutouts, activeCutoutId } = useEditorStore();
  return cutouts.find((c) => c.id === activeCutoutId) ?? null;
};

export const usePlacedCutoutsSorted = () => {
  const { placedCutouts } = useEditorStore();
  return [...placedCutouts].sort((a, b) => a.zIndex - b.zIndex);
};
