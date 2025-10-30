import sharp from "sharp";
import skmeans from "skmeans";
import * as IQ from "image-q";
import { converter, clampChroma } from "culori";
import type { RepresentativeColorsResult } from "@/lib/colors/types";

// Median-cut palette quantization for better color fidelity and shape preservation
export async function getRepresentativeColorsMedianCut(imageBuffer: Buffer, k: number): Promise<RepresentativeColorsResult> {
  // Moderate saturation boost for bright needlepoint results
  const enhancedBuffer = await sharp(imageBuffer)
    .modulate({ saturation: 1.6, brightness: 1.05 }) // balanced saturation boost + slight brightness
    .toBuffer();

  const { data: pixelBuffer, info } = await sharp(enhancedBuffer)
    .ensureAlpha()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  console.log(`🔍 Median-cut quantization: ${info.width}×${info.height} pixels, ${k} colors`);

  // Create PointContainer from image data
  const pointContainer = IQ.utils.PointContainer.fromUint8Array(pixelBuffer, info.width, info.height);
  
  // Build palette using median-cut
  const palette = await IQ.buildPalette([pointContainer], { colors: k });
  
  // Get palette colors and enhance them for vibrancy
  const paletteColors = palette.getPointContainer().getPointArray();
  const centroids = paletteColors.map((pt: { r: number; g: number; b: number }) => {
    // Enhance color vibrancy by boosting saturation
    const [r, g, b] = [pt.r, pt.g, pt.b];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    
    // Moderate saturation boost for bright needlepoint results
    const enhancedSaturation = Math.min(1, saturation * 1.4);
    const delta = max - min;
    const newDelta = enhancedSaturation * max;
    
    if (delta === 0) return [r, g, b]; // grayscale, no change
    
    const factor = newDelta / delta;
    const newR = Math.min(255, Math.max(0, r + (r - min) * (factor - 1)));
    const newG = Math.min(255, Math.max(0, g + (g - min) * (factor - 1)));
    const newB = Math.min(255, Math.max(0, b + (b - min) * (factor - 1)));
    
    return [Math.round(newR), Math.round(newG), Math.round(newB)];
  });

  console.log(`📊 Median-cut completed: ${centroids.length} colors found`);

  // Create labels array by finding nearest palette color for each pixel
  const labels = new Array(info.width * info.height);
  for (let i = 0; i < info.width * info.height; i++) {
    const pixelIndex = i * 3;
    const r = pixelBuffer[pixelIndex];
    const g = pixelBuffer[pixelIndex + 1];
    const b = pixelBuffer[pixelIndex + 2];
    
    // Find nearest palette color
    let best = 0, min = Infinity;
    for (let j = 0; j < centroids.length; j++) {
      const diff = Math.abs(r - centroids[j][0]) + Math.abs(g - centroids[j][1]) + Math.abs(b - centroids[j][2]);
      if (diff < min) { min = diff; best = j; }
    }
    labels[i] = best;
  }

  return {
    centroids,
    labels,
    width: info.width,
    height: info.height,
  };
}

// Wu's variance-minimization quantizer for smoother color transitions and reduced pixelation
export async function getRepresentativeColorsWu(imageBuffer: Buffer, k: number): Promise<RepresentativeColorsResult> {
  // Moderate saturation boost for bright needlepoint results
  const enhancedBuffer = await sharp(imageBuffer)
    .modulate({ saturation: 1.6, brightness: 1.05 }) // balanced saturation boost + slight brightness
    .toBuffer();

  const { data: pixelBuffer, info } = await sharp(enhancedBuffer)
    .ensureAlpha()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  console.log(`🔍 Wu's quantizer: ${info.width}×${info.height} pixels, ${k} colors`);

  // Create PointContainer from image data
  const pointContainer = IQ.utils.PointContainer.fromUint8Array(pixelBuffer, info.width, info.height);
  
  // Build palette using Wu's variance-minimization algorithm
  const palette = await IQ.buildPalette([pointContainer], { 
    colors: k,
    paletteQuantization: 'wuquant' // Use Wu's quantizer instead of median-cut
  });
  
  // Get palette colors and enhance them for vibrancy
  const paletteColors = palette.getPointContainer().getPointArray();
  const centroids = paletteColors.map((pt: { r: number; g: number; b: number }) => {
    // Enhance color vibrancy by boosting saturation
    const [r, g, b] = [pt.r, pt.g, pt.b];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    
    // Moderate saturation boost for bright needlepoint results
    const enhancedSaturation = Math.min(1, saturation * 1.4);
    const delta = max - min;
    const newDelta = enhancedSaturation * max;
    
    if (delta === 0) return [r, g, b]; // grayscale, no change
    
    const factor = newDelta / delta;
    const newR = Math.min(255, Math.max(0, r + (r - min) * (factor - 1)));
    const newG = Math.min(255, Math.max(0, g + (g - min) * (factor - 1)));
    const newB = Math.min(255, Math.max(0, b + (b - min) * (factor - 1)));
    
    return [Math.round(newR), Math.round(newG), Math.round(newB)];
  });

  console.log(`📊 Wu's quantizer completed: ${centroids.length} colors found`);

  // Create labels array by finding nearest palette color for each pixel
  const labels = new Array(info.width * info.height);
  for (let i = 0; i < info.width * info.height; i++) {
    const pixelIndex = i * 3;
    const r = pixelBuffer[pixelIndex];
    const g = pixelBuffer[pixelIndex + 1];
    const b = pixelBuffer[pixelIndex + 2];
    
    // Find nearest palette color
    let best = 0, min = Infinity;
    for (let j = 0; j < centroids.length; j++) {
      const diff = Math.abs(r - centroids[j][0]) + Math.abs(g - centroids[j][1]) + Math.abs(b - centroids[j][2]);
      if (diff < min) { min = diff; best = j; }
    }
    labels[i] = best;
  }

  return {
    centroids,
    labels,
    width: info.width,
    height: info.height,
  };
}

export async function getRepresentativeColors(
  imageBuffer: Buffer,
  k: number,
  spatialWeight: number,
  maxSamples = 50000,
  boostSaturation = false,
): Promise<RepresentativeColorsResult> {
  let bufferToUse = imageBuffer;
  if (boostSaturation) {
    // Moderate saturation boost for bright needlepoint results
    bufferToUse = await sharp(imageBuffer).modulate({ saturation: 1.5, brightness: 1.05 }).toBuffer();
  }
  const { data: pixelBuffer, info } = await sharp(bufferToUse)
    .blur(0.5)
    .ensureAlpha()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Weaken spatialWeight for more color diversity
  spatialWeight = Math.max(1, spatialWeight * 0.5);

  const channels = 3;
  const totalPixels = pixelBuffer.length / channels;
  
  console.log(`🔍 K-means clustering: ${info.width}×${info.height} pixels, ${totalPixels} total, spatial weight: ${spatialWeight.toFixed(2)}`);

  // Subsample indices
  const indices: number[] = [];
  if (totalPixels <= maxSamples) {
    for (let i = 0; i < totalPixels; i++) indices.push(i);
  } else {
    const step = Math.ceil(totalPixels / maxSamples);
    for (let i = 0; i < totalPixels; i += step) indices.push(i);
  }

  // Build 5D points: OKLab + spatial
  const toOklab = converter("oklab");
  const toRgb = converter("rgb");
  const pixels5D: number[][] = new Array(indices.length);
  const { width, height } = info;
  for (let j = 0; j < indices.length; j++) {
    const p = indices[j];
    const i = p * channels;
    const lab = toOklab({ r: pixelBuffer[i] / 255, g: pixelBuffer[i + 1] / 255, b: pixelBuffer[i + 2] / 255, mode: "rgb" }) as { l: number; a: number; b: number; mode: "oklab" };
    const x = p % width;
    const y = Math.floor(p / width);
    pixels5D[j] = [lab.l, lab.a, lab.b, x / spatialWeight, y / spatialWeight];
  }

  const result = skmeans(pixels5D, k, "kmpp");
  console.log(`📊 K-means completed: ${result.centroids.length} centroids found`);

  // Extract OKLab centroids, convert to RGB, and CLAMP for gamut safety
  const centroidsLab = (result.centroids as number[][]).map((c) => [c[0], c[1], c[2]]);
  const centroids = centroidsLab.map((lab, idx) => {
    let rgb = toRgb({ mode: "oklab", l: lab[0], a: lab[1], b: lab[2] }) as { r: number; g: number; b: number; mode: "rgb" };
    // Clamp chroma to avoid desaturated/out-of-gamut colors post-centroiding
    rgb = clampChroma(rgb, "oklab");
    const r = Math.max(0, Math.min(255, Math.round(rgb.r * 255)));
    const g = Math.max(0, Math.min(255, Math.round(rgb.g * 255)));
    const b = Math.max(0, Math.min(255, Math.round(rgb.b * 255)));
    console.log(`  🎨 Centroid ${idx + 1}: OKLab(${lab.map(x => x.toFixed(2)).join(', ')}) → RGB(${r}, ${g}, ${b})`);
    return [r, g, b];
  });

  // Assign labels for ALL pixels
  const labels = new Array<number>(totalPixels);
  for (let p = 0; p < totalPixels; p++) {
    const base = p * channels;
    const lab = toOklab({ r: pixelBuffer[base] / 255, g: pixelBuffer[base + 1] / 255, b: pixelBuffer[base + 2] / 255, mode: "rgb" }) as { l: number; a: number; b: number; mode: "oklab" };
    const x = p % width;
    const y = Math.floor(p / width);
    let minD = Infinity;
    let best = 0;
    for (let cIdx = 0; cIdx < (result.centroids as number[][]).length; cIdx++) {
      const c = (result.centroids as number[][])[cIdx];
      const dl = lab.l - c[0];
      const da = lab.a - c[1];
      const db = lab.b - c[2];
      const dx = x / spatialWeight - c[3];
      const dy = y / spatialWeight - c[4];
      const d = dl * dl + da * da + db * db + dx * dx + dy * dy;
      if (d < minD) {
        minD = d;
        best = cIdx;
      }
    }
    labels[p] = best;
  }

  return { centroids, labels, width: info.width, height: info.height };
}


