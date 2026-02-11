import type { ShapeImageInfo } from "../types/office";
import { concatUint8Arrays } from "../utils/file-helpers";

/**
 * Get all picture shapes from the currently selected slide.
 */
export async function getSlideImages(): Promise<ShapeImageInfo[]> {
  return PowerPoint.run(async (context) => {
    const slides = context.presentation.getSelectedSlides();
    slides.load("items");
    await context.sync();

    if (slides.items.length === 0) return [];

    const slide = slides.items[0];
    const shapes = slide.shapes;
    shapes.load(
      "items/id,items/name,items/type,items/left,items/top,items/width,items/height"
    );
    await context.sync();

    // Try getImageAsBase64() on Image and GeometricShape types
    // GeometricShapes may have image fills (e.g. from previous blur operations)
    const candidateShapes = shapes.items.filter(
      (s) =>
        s.type === PowerPoint.ShapeType.image ||
        s.type === PowerPoint.ShapeType.geometricShape
    );

    const results: ShapeImageInfo[] = [];

    for (const shape of candidateShapes) {
      try {
        const base64Result = shape.getImageAsBase64();
        await context.sync();

        results.push({
          id: shape.id,
          name: shape.name,
          left: shape.left,
          top: shape.top,
          width: shape.width,
          height: shape.height,
          base64: base64Result.value,
        });
      } catch {
        // Shape doesn't contain an extractable image, skip
      }
    }

    return results;
  });
}

/**
 * Replace a picture shape with a new rectangle filled with the processed image.
 */
export async function replaceImageShape(
  shapeId: string,
  processedBase64: string
): Promise<void> {
  return PowerPoint.run(async (context) => {
    const slide = context.presentation.getSelectedSlides().getItemAt(0);
    const shapes = slide.shapes;
    const oldShape = shapes.getItem(shapeId);

    oldShape.load("left,top,width,height");
    await context.sync();

    const { left, top, width, height } = oldShape;

    // Create new rectangle at same position
    const newShape = shapes.addGeometricShape(
      PowerPoint.GeometricShapeType.rectangle,
      { left, top, width, height }
    );

    // Set fill to processed image
    newShape.fill.setImage(processedBase64);

    // Remove border (geometric shapes have borders by default)
    newShape.lineFormat.visible = false;

    await context.sync();

    // Delete original picture shape
    oldShape.delete();

    await context.sync();
  });
}

/**
 * Get the current PPTX file as an ArrayBuffer via Office.js getFileAsync.
 * Handles slicing for files larger than 4MB.
 */
export function getFileAsync(): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    Office.context.document.getFileAsync(
      Office.FileType.Compressed,
      { sliceSize: 4194304 },
      (result) => {
        if (result.status !== Office.AsyncResultStatus.Succeeded) {
          reject(new Error(result.error.message || "getFileAsync failed"));
          return;
        }

        const file = result.value;
        if (file.sliceCount === 0) {
          file.closeAsync();
          reject(new Error("File has 0 slices"));
          return;
        }

        const slices: Uint8Array[] = [];
        let slicesReceived = 0;

        function getSlice(index: number) {
          file.getSliceAsync(index, (sliceResult) => {
            if (sliceResult.status !== Office.AsyncResultStatus.Succeeded) {
              file.closeAsync();
              reject(
                new Error(
                  sliceResult.error.message || `getSliceAsync(${index}) failed`
                )
              );
              return;
            }

            const raw = sliceResult.value.data;
            // Office.js may return number[] or ArrayBuffer depending on host
            if (raw instanceof ArrayBuffer) {
              slices[index] = new Uint8Array(raw);
            } else if (ArrayBuffer.isView(raw)) {
              slices[index] = new Uint8Array(
                raw.buffer,
                raw.byteOffset,
                raw.byteLength
              );
            } else {
              // number[] fallback
              slices[index] = new Uint8Array(raw);
            }
            slicesReceived++;

            if (slicesReceived === file.sliceCount) {
              file.closeAsync();
              resolve(concatUint8Arrays(slices));
            } else {
              getSlice(index + 1);
            }
          });
        }

        getSlice(0);
      }
    );
  });
}

/**
 * Check if the required PowerPoint API version is available.
 */
export function checkApiSupport(): {
  supported: boolean;
  missingApis: string[];
} {
  const missingApis: string[] = [];

  if (
    !Office.context.requirements.isSetSupported("PowerPointApi", "1.10")
  ) {
    missingApis.push("PowerPointApi 1.10 (getImageAsBase64)");
  }
  if (
    !Office.context.requirements.isSetSupported("PowerPointApi", "1.8")
  ) {
    missingApis.push("PowerPointApi 1.8 (setImage)");
  }
  if (
    !Office.context.requirements.isSetSupported("PowerPointApi", "1.4")
  ) {
    missingApis.push("PowerPointApi 1.4 (addGeometricShape)");
  }
  if (
    !Office.context.requirements.isSetSupported("PowerPointApi", "1.3")
  ) {
    missingApis.push("PowerPointApi 1.3 (shape.delete)");
  }

  return {
    supported: missingApis.length === 0,
    missingApis,
  };
}
