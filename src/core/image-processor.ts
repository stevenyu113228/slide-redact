import type { BlurRegion } from "../types/editor";
import { loadImage, stripDataUrlPrefix } from "../utils/image-loader";

/**
 * Apply pixelation to a rectangular region on a canvas context.
 * Every pixel in each block is overwritten with the block average — no original values survive.
 */
function applyPixelation(
  ctx: CanvasRenderingContext2D,
  region: BlurRegion
): void {
  const blockSize = region.blockSize;
  const { x, y, width, height } = region;

  // Clamp to canvas bounds
  const cx = Math.max(0, Math.round(x));
  const cy = Math.max(0, Math.round(y));
  const cw = Math.min(Math.round(width), ctx.canvas.width - cx);
  const ch = Math.min(Math.round(height), ctx.canvas.height - cy);

  if (cw <= 0 || ch <= 0) return;

  const imageData = ctx.getImageData(cx, cy, cw, ch);
  const data = imageData.data;

  for (let blockY = 0; blockY < ch; blockY += blockSize) {
    for (let blockX = 0; blockX < cw; blockX += blockSize) {
      const bw = Math.min(blockSize, cw - blockX);
      const bh = Math.min(blockSize, ch - blockY);
      let r = 0,
        g = 0,
        b = 0,
        a = 0,
        count = 0;

      // Sum all pixels in block
      for (let py = blockY; py < blockY + bh; py++) {
        for (let px = blockX; px < blockX + bw; px++) {
          const i = (py * cw + px) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          a += data[i + 3];
          count++;
        }
      }

      // Fill block with average (destroys original pixel values)
      const avgR = Math.round(r / count);
      const avgG = Math.round(g / count);
      const avgB = Math.round(b / count);
      const avgA = Math.round(a / count);

      for (let py = blockY; py < blockY + bh; py++) {
        for (let px = blockX; px < blockX + bw; px++) {
          const i = (py * cw + px) * 4;
          data[i] = avgR;
          data[i + 1] = avgG;
          data[i + 2] = avgB;
          data[i + 3] = avgA;
        }
      }
    }
  }

  ctx.putImageData(imageData, cx, cy);
}

/**
 * Apply solid-color fill to a rectangular region.
 */
function applySolidMask(
  ctx: CanvasRenderingContext2D,
  region: BlurRegion
): void {
  ctx.fillStyle = region.fillColor;
  ctx.fillRect(
    Math.round(region.x),
    Math.round(region.y),
    Math.round(region.width),
    Math.round(region.height)
  );
}

/**
 * Process an image by applying all blur regions.
 * Returns the processed image as a base64 PNG string (without data URL prefix).
 */
export async function processImage(
  base64: string,
  regions: BlurRegion[]
): Promise<string> {
  const img = await loadImage(base64);

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to create canvas context");

  // Draw original image
  ctx.drawImage(img, 0, 0);

  // Apply each region
  for (const region of regions) {
    if (region.mode === "pixelate") {
      applyPixelation(ctx, region);
    } else {
      applySolidMask(ctx, region);
    }
  }

  // Export as PNG (lossless — no JPEG compression artifacts leaking original data)
  const dataUrl = canvas.toDataURL("image/png");
  return stripDataUrlPrefix(dataUrl);
}

/**
 * Render a preview of the image with blur regions applied.
 * Draws onto the provided canvas context for live preview.
 */
export async function renderPreview(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  regions: BlurRegion[],
  drawState: { x: number; y: number; width: number; height: number } | null,
  currentMode: "pixelate" | "solid",
  currentBlockSize: number,
  currentFillColor: string
): Promise<void> {
  const canvas = ctx.canvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Scale factor from display to image coordinates
  const scaleX = img.naturalWidth / canvas.width;
  const scaleY = img.naturalHeight / canvas.height;

  // Apply committed regions
  for (const region of regions) {
    const scaledRegion: BlurRegion = {
      ...region,
      x: region.x / scaleX,
      y: region.y / scaleY,
      width: region.width / scaleX,
      height: region.height / scaleY,
      blockSize: Math.max(1, Math.round(region.blockSize / scaleX)),
    };

    if (region.mode === "pixelate") {
      applyPixelation(ctx, scaledRegion);
    } else {
      applySolidMask(ctx, scaledRegion);
    }
  }

  // Draw current selection rectangle (preview)
  if (drawState && drawState.width !== 0 && drawState.height !== 0) {
    if (currentMode === "solid") {
      ctx.fillStyle = currentFillColor;
      ctx.fillRect(
        drawState.x / scaleX,
        drawState.y / scaleY,
        drawState.width / scaleX,
        drawState.height / scaleY
      );
    } else {
      // For pixelate preview, show dashed outline with dash size based on block size
      const dashSize = Math.max(2, currentBlockSize / scaleX);
      ctx.save();
      ctx.setLineDash([dashSize, dashSize]);
      ctx.strokeStyle = "#ff4444";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        drawState.x / scaleX,
        drawState.y / scaleY,
        drawState.width / scaleX,
        drawState.height / scaleY
      );
      ctx.restore();
    }
  }

  // Draw outlines for existing regions
  for (const region of regions) {
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = "rgba(255, 68, 68, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(
      region.x / scaleX,
      region.y / scaleY,
      region.width / scaleX,
      region.height / scaleY
    );
    ctx.restore();
  }
}
