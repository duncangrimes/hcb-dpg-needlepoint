/**
 * Image Pipeline Types
 *
 * Shared interfaces for the 3-image generation pipeline.
 */

/**
 * Physical and stitch dimensions of a canvas
 */
export interface ImageDimensions {
  widthInches: number;
  heightInches: number;
  meshCount: number;
  widthStitches: number;
  heightStitches: number;
}

/**
 * Output configuration for a single image type
 */
export interface OutputConfig {
  dpi: number;
  format: "png" | "jpeg";
  quality?: number; // JPEG quality (1-100)
}

/**
 * Mesh grid overlay configuration
 */
export interface MeshGridConfig {
  /** Grid line width relative to cell size (0-1) */
  lineWidthRatio: number;
  /** Grid line color (RGBA) */
  lineColor: { r: number; g: number; b: number; a: number };
  /** Add 3D highlight effect at intersections */
  highlight3D: boolean;
  /** Highlight opacity (0-1) */
  highlightOpacity: number;
}

/**
 * Fabric texture overlay configuration
 */
export interface FabricTextureConfig {
  /** Texture blend opacity (0-1) */
  opacity: number;
  /** Blend mode for texture overlay */
  blendMode: "multiply" | "overlay" | "soft-light";
  /** Amount of noise/brightness variation for thread texture (default: 30) */
  noiseAmount?: number;
  /** Strength of diagonal pattern for tent stitch appearance (default: 5) */
  diagonalStrength?: number;
}

/**
 * Full pipeline configuration
 */
export interface PipelineConfig {
  manufacturer: OutputConfig;
  preview: OutputConfig;
  meshGrid: MeshGridConfig;
  fabricTexture: FabricTextureConfig;
}

/**
 * Result from manufacturer image generation
 */
export interface ManufacturerOutputResult {
  buffer: Buffer;
  width: number;
  height: number;
  dpi: number;
  format: "png" | "jpeg";
}

/**
 * Result from canvas preview generation
 */
export interface CanvasPreviewResult {
  buffer: Buffer;
  width: number;
  height: number;
}

/**
 * Result from stitched preview generation
 */
export interface StitchedPreviewResult {
  buffer: Buffer;
  width: number;
  height: number;
}

/**
 * All generated images from the pipeline
 */
export interface GeneratedImages {
  /** High-res manufacturer image (PNG with DPI) */
  manufacturer: {
    buffer: Buffer;
    url?: string;
    width: number;
    height: number;
    dpi: number;
  };
  /** Canvas preview with mesh grid overlay */
  canvasPreview: {
    buffer: Buffer;
    dataUrl?: string;
    url?: string;
    width: number;
    height: number;
  };
  /** Stitched preview with fabric texture */
  stitchedPreview: {
    buffer: Buffer;
    dataUrl?: string;
    url?: string;
    width: number;
    height: number;
  };
}

/**
 * Input for the image pipeline
 */
export interface PipelineInput {
  stitchMapBuffer: Buffer;
  dimensions: ImageDimensions;
  config?: Partial<PipelineConfig>;
}

/**
 * Options for pipeline execution
 */
export interface PipelineOptions {
  /** Skip manufacturer image generation */
  skipManufacturer?: boolean;
  /** Skip canvas preview generation */
  skipCanvasPreview?: boolean;
  /** Skip stitched preview generation */
  skipStitchedPreview?: boolean;
  /** Convert previews to data URLs (default: true) */
  previewsAsDataUrls?: boolean;
}
