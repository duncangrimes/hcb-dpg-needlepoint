/**
 * Editor Types
 * Core types for the lasso editor and canvas composer
 */

// =============================================================================
// Geometry
// =============================================================================

export interface Point {
  x: number;
  y: number;
}

export interface Transform {
  x: number;      // Position X (0-1 normalized to canvas)
  y: number;      // Position Y (0-1 normalized to canvas)
  scale: number;  // Scale factor (1 = original)
  rotation: number; // Degrees
  flipX: boolean;
  flipY: boolean;
}

export const DEFAULT_TRANSFORM: Transform = {
  x: 0.5,
  y: 0.5,
  scale: 1,
  rotation: 0,
  flipX: false,
  flipY: false,
};

// =============================================================================
// Source Images
// =============================================================================

export interface SourceImage {
  id: string;
  url: string;
  width: number;
  height: number;
  // Note: Don't store HTMLImageElement in state (not serializable, breaks immer)
  // Load images on-demand in components using the URL
}

// =============================================================================
// Cutouts
// =============================================================================

export interface Cutout {
  id: string;
  sourceImageId: string;
  path: Point[];       // Lasso vertices (normalized 0-1)
  extractedUrl?: string; // Cutout image with transparency
}

export interface PlacedCutout {
  id: string;          // PlacedCutout record ID
  cutoutId: string;
  cutout: Cutout;
  transform: Transform;
  zIndex: number;
  
  // Physical sizing (for consistent mesh sizing)
  widthInches: number;  // Base width in inches at scale=1
  aspectRatio: number;  // height/width ratio from original cutout bounds
}

// =============================================================================
// Canvas Configuration
// =============================================================================

export type BackgroundPattern = 'solid' | 'gingham' | 'stripes' | 'checkerboard';

export interface CanvasConfig {
  widthInches: number;
  heightInches: number;
  meshCount: number;
  bgPattern: BackgroundPattern;
  bgColor1: string;    // Primary color (hex)
  bgColor2?: string;   // Secondary color for patterns (hex)
}

export const DEFAULT_CANVAS_CONFIG: CanvasConfig = {
  widthInches: 8,
  heightInches: 10,
  meshCount: 13,
  bgPattern: 'solid',
  bgColor1: '#FFFFFF',
};

// =============================================================================
// Canvas (Final Output)
// =============================================================================

export type CanvasStatus = 'draft' | 'processing' | 'complete' | 'failed';

export interface Thread {
  floss: string;      // DMC code
  name: string;
  hex: string;
  r: number;
  g: number;
  b: number;
  stitches?: number;
  percentage?: number;
}

export interface Canvas {
  id: string;
  name?: string;
  config: CanvasConfig;
  cutouts: PlacedCutout[];
  status: CanvasStatus;
  
  // Generated output (populated after processing)
  manufacturerUrl?: string;
  threads?: Thread[];
  stitchability?: number;
  widthStitches?: number;
  heightStitches?: number;
  errorMessage?: string;
}

// =============================================================================
// Editor State
// =============================================================================

export type EditorTool = 'select' | 'lasso' | 'pan';
export type EditorStep = 'upload' | 'cutout' | 'arrange' | 'preview';

export interface EditorState {
  // Current step in the flow
  step: EditorStep;
  
  // Source images
  sourceImages: SourceImage[];
  activeSourceId: string | null;
  
  // Cutouts
  cutouts: Cutout[];
  placedCutouts: PlacedCutout[];
  activeCutoutId: string | null;
  
  // Drawing state
  tool: EditorTool;
  isDrawing: boolean;
  currentPath: Point[];
  
  // Canvas config
  canvasConfig: CanvasConfig;
  
  // Processing
  isProcessing: boolean;
  processingProgress?: number;
}

// =============================================================================
// AI Detection (for smart cutout)
// =============================================================================

export interface DetectedSubject {
  id: string;
  label: string;        // AI-detected label ("dog", "person", etc.)
  confidence: number;   // 0-1
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  mask?: string;        // Base64 mask image
  selected: boolean;    // User selection state
}
