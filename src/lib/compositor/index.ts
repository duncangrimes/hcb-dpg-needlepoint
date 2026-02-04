import sharp from "sharp";

export interface CompositeLayer {
  /** RGB pixel data */
  buffer: Buffer;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

/**
 * Composites subject onto background using a mask, with an optional outline layer.
 *
 * Layering order (bottom to top):
 *   1. Background (full canvas, generated pattern)
 *   2. Subject (placed centered, mask-applied)
 *   3. Outline (optional, drawn in outline color)
 *
 * @param background - Background RGB buffer at final canvas dimensions
 * @param subject - Subject RGBA buffer (transparent background)
 * @param outlineMask - Optional outline mask (grayscale, 255 = outline pixel)
 * @param outlineColor - RGB color for the outline (default: black)
 * @param canvasWidth - Final canvas width in stitches
 * @param canvasHeight - Final canvas height in stitches
 * @param subjectScale - Subject scale as fraction of canvas (0.4-0.65, default: 0.55)
 * @returns Final composited RGB buffer
 */
export async function compositeCanvas(
  background: Buffer,
  subject: Buffer,
  outlineMask: Buffer | null,
  outlineColor: [number, number, number] = [0, 0, 0],
  canvasWidth: number,
  canvasHeight: number,
  subjectScale: number = 0.55
): Promise<Buffer> {
  console.log(
    `🖼️ Compositing canvas: ${canvasWidth}×${canvasHeight}, ` +
    `subject scale: ${(subjectScale * 100).toFixed(0)}%`
  );

  // 1. Get subject dimensions and resize to target scale
  const subjectMeta = await sharp(subject).metadata();
  const subjectW = subjectMeta.width!;
  const subjectH = subjectMeta.height!;
  const subjectAspect = subjectW / subjectH;

  // Calculate target subject dimensions to fit within scale bounds
  let targetSubjectH = Math.round(canvasHeight * subjectScale);
  let targetSubjectW = Math.round(targetSubjectH * subjectAspect);

  // Ensure subject doesn't exceed canvas width
  if (targetSubjectW > canvasWidth * subjectScale) {
    targetSubjectW = Math.round(canvasWidth * subjectScale);
    targetSubjectH = Math.round(targetSubjectW / subjectAspect);
  }

  // Center position
  const offsetX = Math.round((canvasWidth - targetSubjectW) / 2);
  const offsetY = Math.round((canvasHeight - targetSubjectH) / 2);

  // 2. Resize subject with its alpha
  const resizedSubject = await sharp(subject)
    .resize(targetSubjectW, targetSubjectH, {
      kernel: sharp.kernel.lanczos3,
      fit: "fill",
    })
    .ensureAlpha()
    .png()
    .toBuffer();

  // 3. Composite subject onto background
  let result = await sharp(background)
    .resize(canvasWidth, canvasHeight, { fit: "fill" })
    .composite([
      {
        input: resizedSubject,
        left: offsetX,
        top: offsetY,
        blend: "over",
      },
    ])
    .removeAlpha()
    .png()
    .toBuffer();

  // 4. Apply outline if provided
  if (outlineMask) {
    const resizedOutline = await sharp(outlineMask)
      .resize(targetSubjectW, targetSubjectH, {
        kernel: sharp.kernel.nearest,
        fit: "fill",
      })
      .raw()
      .toBuffer();

    // Read the current composited image
    const { data: resultData, info } = await sharp(result)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Paint outline pixels
    for (let y = 0; y < targetSubjectH; y++) {
      for (let x = 0; x < targetSubjectW; x++) {
        const outlineIdx = y * targetSubjectW + x;
        if (resizedOutline[outlineIdx] > 128) {
          const canvasX = offsetX + x;
          const canvasY = offsetY + y;
          if (canvasX >= 0 && canvasX < canvasWidth && canvasY >= 0 && canvasY < canvasHeight) {
            const resultIdx = (canvasY * canvasWidth + canvasX) * 3;
            resultData[resultIdx] = outlineColor[0];
            resultData[resultIdx + 1] = outlineColor[1];
            resultData[resultIdx + 2] = outlineColor[2];
          }
        }
      }
    }

    result = await sharp(resultData, {
      raw: { width: info.width, height: info.height, channels: 3 },
    })
      .png()
      .toBuffer();
  }

  console.log(
    `✅ Canvas composited: subject ${targetSubjectW}×${targetSubjectH} ` +
    `at offset (${offsetX}, ${offsetY})`
  );

  return result;
}
