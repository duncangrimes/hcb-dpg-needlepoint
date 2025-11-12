export interface UploadConfig {
  meshCount: number;
  width: number;
  numColors: number;
}

export interface UploadConstraints {
  meshCount: readonly number[];
  widthMin: number;
  widthMax: number;
  numColorsMin: number;
  numColorsMax: number;
}

/**
 * Default upload constraints
 */
export const UPLOAD_CONSTRAINTS: UploadConstraints = {
  meshCount: [13, 18] as const,
  widthMin: 2,
  widthMax: 12,
  numColorsMin: 3,
  numColorsMax: 30,
};

/**
 * Default upload configuration values
 */
export const DEFAULT_UPLOAD_CONFIG: UploadConfig = {
  meshCount: 13,
  width: 8,
  numColors: 12,
};

/**
 * Validates and normalizes upload configuration parameters
 * @param params The parsed upload parameters
 * @returns Validated and normalized upload configuration
 */
export function validateAndNormalizeConfig(
  params: {
    meshCount?: number;
    width?: number;
    numColors?: number;
  }
): UploadConfig {
  const { meshCount, width, numColors } = params;
  const { meshCount: allowedMesh, widthMin, widthMax, numColorsMin, numColorsMax } =
    UPLOAD_CONSTRAINTS;

  const mesh =
    typeof meshCount === "number" && allowedMesh.includes(meshCount)
      ? meshCount
      : DEFAULT_UPLOAD_CONFIG.meshCount;

  const w =
    typeof width === "number"
      ? Math.min(widthMax, Math.max(widthMin, width))
      : DEFAULT_UPLOAD_CONFIG.width;

  const colors =
    typeof numColors === "number"
      ? Math.min(numColorsMax, Math.max(numColorsMin, numColors))
      : DEFAULT_UPLOAD_CONFIG.numColors;

  return { meshCount: mesh, width: w, numColors: colors };
}

/**
 * Allowed content types for image uploads
 */
export const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

