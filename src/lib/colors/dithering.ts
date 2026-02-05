import sharp from "sharp";
import { differenceEuclidean, converter } from "culori";
import type { Thread } from "./types";

// Perceptual dithering using OKLab color space for better visual results
export async function buildDitheredManufacturerImage(
  reducedPngBuffer: Buffer,
  mappedPalette: { original: number[]; thread: Thread }[],
): Promise<Buffer> {
  // Read raw pixels in whatever channel count the image has
  const { data, info } = await sharp(reducedPngBuffer)
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const { width, height, channels } = info;

  // Normalize to 3-channel RGB buffer
  let rgbData: Uint8Array;
  if (channels === 3) {
    rgbData = data;
  } else if (channels === 4) {
    // Drop alpha
    rgbData = new Uint8Array(width * height * 3);
    for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
      rgbData[j] = data[i];
      rgbData[j + 1] = data[i + 1];
      rgbData[j + 2] = data[i + 2];
    }
  } else if (channels === 1) {
    // Grayscale -> replicate channels
    rgbData = new Uint8Array(width * height * 3);
    for (let i = 0, j = 0; i < data.length; i += 1, j += 3) {
      const v = data[i];
      rgbData[j] = v;
      rgbData[j + 1] = v;
      rgbData[j + 2] = v;
    }
  } else if (channels === 2) {
    // Gray + alpha -> drop alpha, replicate gray
    rgbData = new Uint8Array(width * height * 3);
    for (let i = 0, j = 0; i < data.length; i += 2, j += 3) {
      const v = data[i];
      rgbData[j] = v;
      rgbData[j + 1] = v;
      rgbData[j + 2] = v;
    }
  } else {
    // Fallback: convert via sharp
    const converted = await sharp(reducedPngBuffer).removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true });
    rgbData = converted.data;
  }

  // Create floating-point RGB buffer for error accumulation
  const pixels = new Float32Array(rgbData.length);
  for (let i = 0; i < rgbData.length; i++) {
    pixels[i] = rgbData[i];
  }

  const finalImageData = Buffer.alloc(rgbData.length);
  const toOklab = converter("oklab");
  const toRgb = converter("rgb");
  const colorDifference = differenceEuclidean("oklab");

  // Pre-convert thread palette to OKLab for faster comparisons
  const threadPaletteLab = mappedPalette.map(({ thread }) => ({
    thread,
    lab: toOklab({ r: thread.r / 255, g: thread.g / 255, b: thread.b / 255, mode: 'rgb' })
  }));

  console.log(`🎨 Starting perceptual dithering with OKLab error propagation...`);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;

      // Get the current pixel's color (including propagated error)
      const old_r = Math.max(0, Math.min(255, pixels[i]));
      const old_g = Math.max(0, Math.min(255, pixels[i + 1]));
      const old_b = Math.max(0, Math.min(255, pixels[i + 2]));
      
      // Convert current pixel to OKLab for perceptual color matching
      const currentLab = toOklab({ r: old_r / 255, g: old_g / 255, b: old_b / 255, mode: 'rgb' }) as { l: number; a: number; b: number; mode: "oklab" };
      
      // Find the closest thread in OKLab space
      let closest = threadPaletteLab[0];
      let minDiff = Infinity;

      for(const p of threadPaletteLab) {
        const diff = colorDifference(currentLab, p.lab);
        if (diff < minDiff) {
          minDiff = diff;
          closest = p;
        }
      }
      
      const new_r = closest.thread.r;
      const new_g = closest.thread.g;
      const new_b = closest.thread.b;

      // Set the final color for this pixel in the output buffer
      finalImageData[i] = new_r;
      finalImageData[i+1] = new_g;
      finalImageData[i+2] = new_b;
      
      // Calculate error in OKLab space for perceptual dithering
      const newLab = toOklab({ r: new_r / 255, g: new_g / 255, b: new_b / 255, mode: 'rgb' }) as { l: number; a: number; b: number; mode: "oklab" };
      const errorLab = {
        l: currentLab.l - newLab.l,
        a: currentLab.a - newLab.a,
        b: currentLab.b - newLab.b,
        mode: 'oklab' as const
      };

      // Convert error back to RGB for propagation
      const errorRgb = toRgb(errorLab) as { r: number; g: number; b: number; mode: "rgb" };
      const err_r = errorRgb.r * 255;
      const err_g = errorRgb.g * 255;
      const err_b = errorRgb.b * 255;

      // Propagate the perceptual error to neighboring pixels (Floyd-Steinberg)
      const p1 = i + 3;          // right
      const p2 = i + width * 3 - 3; // bottom-left
      const p3 = i + width * 3;     // bottom
      const p4 = i + width * 3 + 3; // bottom-right

      if (x < width - 1) {
        pixels[p1] += err_r * 7/16; 
        pixels[p1+1] += err_g * 7/16; 
        pixels[p1+2] += err_b * 7/16;
      }
      if (y < height - 1) {
        if (x > 0) {
          pixels[p2] += err_r * 3/16; 
          pixels[p2+1] += err_g * 3/16; 
          pixels[p2+2] += err_b * 3/16;
        }
        pixels[p3] += err_r * 5/16; 
        pixels[p3+1] += err_g * 5/16; 
        pixels[p3+2] += err_b * 5/16;
        if (x < width - 1) {
          pixels[p4] += err_r * 1/16; 
          pixels[p4+1] += err_g * 1/16; 
          pixels[p4+2] += err_b * 1/16;
        }
      }
    }
  }

  console.log(`✅ Perceptual dithering completed`);
  return sharp(finalImageData, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

/**
 * Enhanced anti-aliasing function for post-processing dithered images.
 * 
 * @deprecated This function is no longer used in the manufacturing pipeline.
 * Anti-aliasing introduces blended colors that don't map to discrete thread shades,
 * which reduces stitchability. This function is kept for potential future use in
 * generating preview/display images where visual smoothness is prioritized over
 * manufacturing accuracy.
 * 
 * @param imageBuffer The image buffer to apply anti-aliasing to
 * @returns Anti-aliased image buffer
 */
/**
 * Builds a flat-quantized manufacturer image WITHOUT dithering.
 * Each pixel is mapped to its nearest thread color directly.
 * This produces cleaner, more stitchable results with solid color regions.
 * 
 * @param reducedPngBuffer Input image buffer
 * @param mappedPalette Thread palette with original colors mapped to threads
 * @returns Flat-quantized image buffer where each pixel is a discrete thread color
 */
export async function buildFlatManufacturerImage(
  reducedPngBuffer: Buffer,
  mappedPalette: { original: number[]; thread: Thread }[],
): Promise<Buffer> {
  const { data, info } = await sharp(reducedPngBuffer)
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const { width, height, channels } = info;

  // Normalize to 3-channel RGB buffer
  let rgbData: Uint8Array;
  if (channels === 3) {
    rgbData = data;
  } else if (channels === 4) {
    rgbData = new Uint8Array(width * height * 3);
    for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
      rgbData[j] = data[i];
      rgbData[j + 1] = data[i + 1];
      rgbData[j + 2] = data[i + 2];
    }
  } else if (channels === 1) {
    rgbData = new Uint8Array(width * height * 3);
    for (let i = 0, j = 0; i < data.length; i += 1, j += 3) {
      rgbData[j] = data[i];
      rgbData[j + 1] = data[i + 1] = data[i + 2] = data[i];
    }
  } else {
    const converted = await sharp(reducedPngBuffer).removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true });
    rgbData = converted.data;
  }

  const finalImageData = Buffer.alloc(rgbData.length);
  const toOklab = converter("oklab");
  const colorDifference = differenceEuclidean("oklab");

  // Pre-convert thread palette to OKLab
  const threadPaletteLab = mappedPalette.map(({ thread }) => ({
    thread,
    lab: toOklab({ r: thread.r / 255, g: thread.g / 255, b: thread.b / 255, mode: 'rgb' })
  }));

  console.log(`🎨 Building flat-quantized image (no dithering)...`);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;

      const r = rgbData[i];
      const g = rgbData[i + 1];
      const b = rgbData[i + 2];
      
      // Convert to OKLab for perceptual matching
      const currentLab = toOklab({ r: r / 255, g: g / 255, b: b / 255, mode: 'rgb' });
      
      // Find nearest thread
      let closest = threadPaletteLab[0];
      let minDiff = Infinity;

      for (const p of threadPaletteLab) {
        const diff = colorDifference(currentLab, p.lab);
        if (diff < minDiff) {
          minDiff = diff;
          closest = p;
        }
      }
      
      finalImageData[i] = closest.thread.r;
      finalImageData[i + 1] = closest.thread.g;
      finalImageData[i + 2] = closest.thread.b;
    }
  }

  console.log(`✅ Flat quantization completed`);
  return sharp(finalImageData, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

/**
 * Enhanced anti-aliasing function for post-processing dithered images.
 * 
 * @deprecated This function is no longer used in the manufacturing pipeline.
 * Anti-aliasing introduces blended colors that don't map to discrete thread shades,
 * which reduces stitchability. This function is kept for potential future use in
 * generating preview/display images where visual smoothness is prioritized over
 * manufacturing accuracy.
 * 
 * @param imageBuffer The image buffer to apply anti-aliasing to
 * @returns Anti-aliased image buffer
 */
export async function applyEnhancedAntiAliasing(imageBuffer: Buffer): Promise<Buffer> {
  console.log(`🔧 Applying enhanced anti-aliasing...`);
  
  return await sharp(imageBuffer)
    .modulate({ saturation: 1.05, brightness: 1.01 }) // subtle final enhancement
    // Multi-step anti-aliasing: targeted blur for high-contrast edges
    .convolve({
      width: 3,
      height: 3,
      kernel: [
        -1, -1, -1,
        -1, 16, -1,
        -1, -1, -1
      ]
    })
    .blur(0.3) // gentle blur to smooth harsh pixel edges
    .sharpen({ sigma: 0.5, m1: 0.5, m2: 2.0, x1: 2.0, y2: 10.0 }) // selective sharpening
    .png()
    .toBuffer();
}


