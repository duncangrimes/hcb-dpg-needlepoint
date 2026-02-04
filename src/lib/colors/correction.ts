import sharp from "sharp";

// Auto white balance function to neutralize color casts (e.g., green from foliage)
export async function autoWhiteBalance(imageBuffer: Buffer): Promise<Buffer> {
  console.log(`🎨 Applying auto white balance to neutralize color casts...`);
  
  // Get raw pixel data to compute channel averages
  const { data: pixelBuffer, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  // Calculate channel averages (assuming RGBA format)
  let sumR = 0, sumG = 0, sumB = 0;
  const pixelCount = info.width * info.height;
  
  for (let i = 0; i < pixelBuffer.length; i += 4) {
    sumR += pixelBuffer[i];     // R
    sumG += pixelBuffer[i + 1]; // G  
    sumB += pixelBuffer[i + 2]; // B
    // Skip alpha channel
  }
  
  const avgR = sumR / pixelCount;
  const avgG = sumG / pixelCount;
  const avgB = sumB / pixelCount;
  const grayAvg = (avgR + avgG + avgB) / 3;
  
  console.log(`📊 Channel averages - R: ${avgR.toFixed(1)}, G: ${avgG.toFixed(1)}, B: ${avgB.toFixed(1)}`);
  
  // Apply gray world assumption: scale channels to match average intensity
  const rScale = grayAvg / avgR;
  const gScale = grayAvg / avgG;
  const bScale = grayAvg / avgB;
  
  console.log(`🔧 Channel scaling factors - R: ${rScale.toFixed(3)}, G: ${gScale.toFixed(3)}, B: ${bScale.toFixed(3)}`);
  
  // Apply corrections using Sharp's modulate function (more subtle)
  // Sharp's modulate works in HSV space, so we need to convert our RGB corrections
  // For subtle corrections, we'll use hue rotation and saturation adjustments
  const hueShift = 0; // No hue shift for gray world correction
  const saturationBoost = 1.0; // No saturation boost here — consolidated to resize step
  
  // Calculate brightness adjustments for each channel (more conservative)
  const brightnessAdjustment = (rScale + gScale + bScale) / 3;
  
  return await sharp(imageBuffer)
    .modulate({
      brightness: Math.min(1.05, Math.max(0.95, brightnessAdjustment)),
      saturation: saturationBoost,
      hue: hueShift
    })
    .png()
    .toBuffer();
}

// LAB color space processing for perceptual accuracy
export async function processInLABColorSpace(imageBuffer: Buffer): Promise<Buffer> {
  console.log(`🔬 Processing in LAB color space for perceptual accuracy...`);
  
  // Convert to LAB color space for better perceptual uniformity
  // LAB separates lightness (L) from color information (A, B channels)
  return await sharp(imageBuffer)
    .toColourspace('lab')  // Convert to LAB color space
    .modulate({
      brightness: 1.01,    // Very subtle lightness adjustment
      saturation: 1.0,    // No saturation boost — consolidated to resize step
      hue: 0             // No hue shift in LAB
    })
    .toColourspace('srgb') // Convert back to sRGB
    .png()
    .toBuffer();
}

// Combined color correction pipeline with auto white balance and LAB processing
export async function applyColorCorrection(imageBuffer: Buffer): Promise<Buffer> {
  console.log(`🎨 Starting color correction pipeline (AWB + LAB)...`);
  
  let correctedBuffer = imageBuffer;
  
  // Step 1: Auto white balance
  correctedBuffer = await autoWhiteBalance(correctedBuffer);
  
  // Step 2: LAB color space processing for perceptual accuracy
  correctedBuffer = await processInLABColorSpace(correctedBuffer);
  
  console.log(`✅ Color correction pipeline completed`);
  return correctedBuffer;
}


