/**
 * ⚠️ VISION FEATURES - NOT IN USE FOR MVP
 * 
 * These Gemini-powered features are deferred to post-MVP.
 * Do not import or use these in the main application flow.
 * 
 * Future use cases:
 * - Vision-guided color palette selection
 * - AI subject detection for auto-selection
 */

export { 
  analyzeImageForPalette, 
  hexToRgb,
  type SuggestedColor,
  type PaletteAnalysisResult,
} from "./palette-analyzer";

export {
  mapSuggestedColorsToDMC,
  extractThreadsFromMappedPalette,
  type MappedPaletteColor,
} from "./palette-mapper";

export {
  quantizeWithVisionGuidance,
  type VisionGuidedResult,
} from "./guided-quantization";

// Subject detector removed - not in MVP
