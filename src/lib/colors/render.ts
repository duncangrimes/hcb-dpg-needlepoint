import sharp from "sharp";

export async function buildSegmentedManufacturerImage(
  width: number, 
  height: number, 
  labels: number[], 
  mappedThreads: { r: number; g: number; b: number }[]
): Promise<Buffer> {
  const channels = 3;
  const out = Buffer.alloc(width * height * channels);
  for (let i = 0; i < width * height; i++) {
    const rgb = [mappedThreads[labels[i]].r, mappedThreads[labels[i]].g, mappedThreads[labels[i]].b];
    out[i * channels] = rgb[0];
    out[i * channels + 1] = rgb[1];
    out[i * channels + 2] = rgb[2];
  }
  return sharp(out, { raw: { width, height, channels } }).png().toBuffer();
}

export async function buildManufacturerImage(
  width: number,
  height: number,
  labels: number[],
  centroidIndexToThreadRgb: (index: number) => [number, number, number],
): Promise<Buffer> {
  // Fallback to segmented approach when dithering is not available
  // This function is kept for backward compatibility
  const channels = 3;
  const out = Buffer.alloc(width * height * channels);
  for (let p = 0; p < width * height; p++) {
    const rgb = centroidIndexToThreadRgb(labels[p]);
    out[p * channels] = rgb[0];
    out[p * channels + 1] = rgb[1];
    out[p * channels + 2] = rgb[2];
  }
  return sharp(out, { raw: { width, height, channels } }).png().toBuffer();
}


