/**
 * Configuration for the manufacturer image processing pipeline.
 * Adjust these values to fine-tune the image processing behavior.
 */

/**
 * Edge Density Configuration
 * Used to determine adaptive blur based on image complexity
 */
export const EDGE_DENSITY_CONFIG = {
  /** Threshold for determining high-detail images (0-1) */
  highDetailThreshold: 0.25,
  /** Multiplier for standard deviation in edge detection (default: 1.0) */
  thresholdMultiplier: 1.0,
} as const;

/**
 * Adaptive Blur Configuration
 * Blur sigma values applied based on edge density
 */
export const ADAPTIVE_BLUR_CONFIG = {
  /** Blur sigma for high-detail images (>threshold) */
  highDetailBlurSigma: 1.0,
  /** Blur sigma for normal images (≤threshold) */
  normalBlurSigma: 0.3,
} as const;

/**
 * Image Enhancement Configuration
 * Applied during resize step.
 * NOTE: Saturation was previously boosted here (1.3x), in color correction (1.02x, 1.03x),
 * AND in quantization (1.6x + 1.4x enhancement) — compounding to ~3x total.
 * Now consolidated to a single subtle boost here; quantization no longer boosts saturation.
 */
export const IMAGE_ENHANCEMENT_CONFIG = {
  /** Saturation boost multiplier (single point of control — no other stages should boost) */
  saturationBoost: 1.15,
  /** Brightness adjustment multiplier */
  brightnessAdjustment: 1.02,
} as const;

/**
 * Majority Filter Configuration
 * Post-processing filter to remove isolated pixels.
 * Research shows 3×3 single-pass isn't aggressive enough to eliminate confetti.
 * Using 2 passes to better dissolve small isolated regions.
 */
export const MAJORITY_FILTER_CONFIG = {
  /** Kernel size (must be odd number, e.g., 3 for 3×3, 5 for 5×5) */
  kernelSize: 3,
  /** Number of filter passes to apply */
  passes: 2,
} as const;

/**
 * Color Limits Configuration
 * Maximum colors based on canvas size to prevent over-complex patterns.
 */
export const COLOR_LIMITS_CONFIG = {
  /** Max colors for small canvases (≤6 inches) */
  smallCanvasMaxColors: 10,
  /** Max colors for medium canvases (6-12 inches) */
  mediumCanvasMaxColors: 15,
  /** Max colors for large canvases (>12 inches) */
  largeCanvasMaxColors: 20,
  /** Absolute maximum regardless of canvas size */
  absoluteMaxColors: 25,
  /** Small canvas threshold in inches */
  smallThresholdInches: 6,
  /** Medium canvas threshold in inches */
  mediumThresholdInches: 12,
} as const;

/**
 * Color Distinctness Configuration
 * Ensures palette colors are distinguishable by stitchers.
 */
export const COLOR_DISTINCTNESS_CONFIG = {
  /** Minimum CIEDE2000 delta-E between any two palette colors */
  minDeltaE: 8,
  /** Preferred minimum for adjacent regions */
  preferredMinDeltaE: 12,
} as const;

/**
 * Stitchability Score Configuration
 * Thresholds for interpreting stitchability scores
 */
export const STITCHABILITY_SCORE_CONFIG = {
  /** Score threshold for "excellent" rating */
  excellentThreshold: 7,
  /** Score threshold for "good" rating */
  goodThreshold: 5,
  /** Score threshold for "fair" rating */
  fairThreshold: 3,
} as const;

/**
 * Complete image processing configuration
 */
export const IMAGE_PROCESSING_CONFIG = {
  edgeDensity: EDGE_DENSITY_CONFIG,
  adaptiveBlur: ADAPTIVE_BLUR_CONFIG,
  imageEnhancement: IMAGE_ENHANCEMENT_CONFIG,
  majorityFilter: MAJORITY_FILTER_CONFIG,
  stitchabilityScore: STITCHABILITY_SCORE_CONFIG,
  colorLimits: COLOR_LIMITS_CONFIG,
  colorDistinctness: COLOR_DISTINCTNESS_CONFIG,
} as const;

