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
 * Applied during resize step
 */
export const IMAGE_ENHANCEMENT_CONFIG = {
  /** Saturation boost multiplier */
  saturationBoost: 1.3,
  /** Brightness adjustment multiplier */
  brightnessAdjustment: 1.02,
} as const;

/**
 * Majority Filter Configuration
 * Post-processing filter to remove isolated pixels
 */
export const MAJORITY_FILTER_CONFIG = {
  /** Kernel size (must be odd number, e.g., 3 for 3×3, 5 for 5×5) */
  kernelSize: 3,
  /** Number of filter passes to apply */
  passes: 1,
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
} as const;

