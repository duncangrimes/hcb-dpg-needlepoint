/**
 * Image Pipeline Configuration
 *
 * DPI and quality settings with environment variable support.
 */

import type { PipelineConfig, MeshGridConfig, FabricTextureConfig } from "./types";

/**
 * Default mesh grid configuration
 */
export const DEFAULT_MESH_GRID_CONFIG: MeshGridConfig = {
  lineWidthRatio: 0.08,
  lineColor: { r: 255, g: 255, b: 255, a: 77 }, // ~30% white
  highlight3D: true,
  highlightOpacity: 0.15,
};

/**
 * Default fabric texture configuration
 */
export const DEFAULT_FABRIC_TEXTURE_CONFIG: FabricTextureConfig = {
  opacity: 0.12,
  blendMode: "multiply",
};

/**
 * Default pipeline configuration
 */
export const DEFAULT_CONFIG: PipelineConfig = {
  manufacturer: {
    dpi: 300,
    format: "png",
  },
  preview: {
    dpi: 150,
    format: "jpeg",
    quality: 85,
  },
  meshGrid: DEFAULT_MESH_GRID_CONFIG,
  fabricTexture: DEFAULT_FABRIC_TEXTURE_CONFIG,
};

/**
 * Get pipeline configuration with environment variable overrides.
 *
 * Supported env vars:
 * - MANUFACTURER_DPI (default: 300)
 * - PREVIEW_DPI (default: 150)
 * - PREVIEW_JPEG_QUALITY (default: 85)
 */
export function getConfig(): PipelineConfig {
  return {
    ...DEFAULT_CONFIG,
    manufacturer: {
      ...DEFAULT_CONFIG.manufacturer,
      dpi: parseInt(process.env.MANUFACTURER_DPI || "300", 10),
    },
    preview: {
      ...DEFAULT_CONFIG.preview,
      dpi: parseInt(process.env.PREVIEW_DPI || "150", 10),
      quality: parseInt(process.env.PREVIEW_JPEG_QUALITY || "85", 10),
    },
  };
}

/**
 * Merge user config with defaults
 */
export function mergeConfig(
  userConfig?: Partial<PipelineConfig>
): PipelineConfig {
  const baseConfig = getConfig();

  if (!userConfig) {
    return baseConfig;
  }

  return {
    manufacturer: { ...baseConfig.manufacturer, ...userConfig.manufacturer },
    preview: { ...baseConfig.preview, ...userConfig.preview },
    meshGrid: { ...baseConfig.meshGrid, ...userConfig.meshGrid },
    fabricTexture: { ...baseConfig.fabricTexture, ...userConfig.fabricTexture },
  };
}
