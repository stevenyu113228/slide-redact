import { useState, useCallback, useEffect, useRef } from "react";
import type { ShapeImageInfo } from "../types/office";
import type { BlurMode } from "../types/editor";
import { useRegions } from "../hooks/useRegions";
import { useCanvasRenderer } from "../hooks/useCanvasRenderer";
import { processImage } from "../core/image-processor";
import { replaceImageShape } from "../core/office-api";
import { BlurControls } from "./BlurControls";
import { RegionSelector } from "./RegionSelector";

interface ImageEditorProps {
  image: ShapeImageInfo;
  onBack: () => void;
  onApplied: () => void;
}

export function ImageEditor({ image, onBack, onApplied }: ImageEditorProps) {
  const [mode, setMode] = useState<BlurMode>("pixelate");
  const [blockSize, setBlockSize] = useState(10);
  const [fillColor, setFillColor] = useState("#000000");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [drawState, setDrawState] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const {
    regions,
    addRegion,
    removeRegion,
    clearRegions,
    undo,
    redo,
  } = useRegions();

  const {
    canvasRef,
    containerRef,
    imageSize,
    zoom,
    zoomAt,
    zoomIn,
    zoomOut,
    zoomReset,
    render,
  } = useCanvasRenderer(
    image.base64,
    regions,
    drawState,
    mode,
    blockSize,
    fillColor
  );

  const imageReady = imageSize !== null;

  // Re-render when regions change
  useEffect(() => {
    render();
  }, [regions, render]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        redo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if (e.key === "Escape") {
        onBack();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (regions.length > 0) {
          removeRegion(regions[regions.length - 1].id);
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === "=") {
        e.preventDefault();
        zoomIn();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "-") {
        e.preventDefault();
        zoomOut();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "0") {
        e.preventDefault();
        zoomReset();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onBack, regions, removeRegion, undo, redo, zoomIn, zoomOut, zoomReset]);

  // Scroll wheel / trackpad pinch zoom on the canvas container
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = (e: WheelEvent) => {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        const factor = 1 - e.deltaY * 0.01;
        const newZoom = zoomRef.current * factor;
        zoomAt(newZoom, e.clientX, e.clientY);
      }
    };
    container.addEventListener("wheel", handler, { passive: false });
    return () => container.removeEventListener("wheel", handler);
  }, [imageReady, containerRef, zoomAt]);

  const handleRegionComplete = useCallback(
    (x: number, y: number, width: number, height: number) => {
      addRegion(x, y, width, height, mode, blockSize, fillColor);
    },
    [addRegion, mode, blockSize, fillColor]
  );

  const handleApplyFullImage = useCallback(() => {
    if (!imageSize) return;
    addRegion(
      0,
      0,
      imageSize.width,
      imageSize.height,
      mode,
      blockSize,
      fillColor
    );
  }, [addRegion, mode, blockSize, fillColor, imageSize]);

  const handleApply = useCallback(async () => {
    if (regions.length === 0) return;

    setApplying(true);
    setError(null);

    try {
      const processedBase64 = await processImage(image.base64, regions);
      await replaceImageShape(image.id, processedBase64);
      onApplied();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to apply changes";
      setError(message);
    } finally {
      setApplying(false);
    }
  }, [regions, image, onApplied]);

  return (
    <div className="image-editor">
      <div className="editor-header">
        <button className="btn btn-ghost" onClick={onBack} disabled={applying}>
          &larr; Back
        </button>
        <span className="editor-title">{image.name}</span>
      </div>

<div className="zoom-toolbar">
        <button
          className="btn btn-ghost btn-sm"
          onClick={zoomOut}
          disabled={zoom <= 1}
        >
          &minus;
        </button>
        <span className="zoom-label">{Math.round(zoom * 100)}%</span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={zoomIn}
          disabled={zoom >= 5}
        >
          +
        </button>
        {zoom !== 1 && (
          <button className="btn btn-ghost btn-sm" onClick={zoomReset}>
            Reset
          </button>
        )}
      </div>

      <div className="editor-canvas-scroll" ref={containerRef}>
        {!imageReady && (
          <div className="image-list-status">
            <div className="spinner" />
            <p>Loading image...</p>
          </div>
        )}
        <div
          className="editor-canvas-inner"
          style={{ display: imageReady ? "block" : "none" }}
        >
          <canvas ref={canvasRef} className="editor-canvas" />
          {imageReady && (
            <RegionSelector
              canvasRef={canvasRef}
              imageWidth={imageSize.width}
              imageHeight={imageSize.height}
              onRegionComplete={handleRegionComplete}
              onDrawStateChange={setDrawState}
              mode={mode}
              disabled={applying}
            />
          )}
        </div>
      </div>

      <BlurControls
        mode={mode}
        blockSize={blockSize}
        fillColor={fillColor}
        regionCount={regions.length}
        onModeChange={setMode}
        onBlockSizeChange={setBlockSize}
        onFillColorChange={setFillColor}
        onClearRegions={clearRegions}
        onApplyFullImage={handleApplyFullImage}
      />

      {error && <div className="error-message">{error}</div>}

      <div className="editor-footer">
        <button
          className="btn btn-primary btn-lg"
          onClick={handleApply}
          disabled={applying || regions.length === 0}
        >
          {applying
            ? "Applying..."
            : `Apply ${regions.length} Region${regions.length !== 1 ? "s" : ""} to Slide`}
        </button>
      </div>

      <p className="editor-hint">
        Draw rectangles to mark areas for redaction.
        <kbd>Cmd</kbd>+<kbd>+</kbd>/<kbd>-</kbd> or <kbd>Cmd</kbd>+scroll to
        zoom. <kbd>Delete</kbd> to undo last region.
      </p>
    </div>
  );
}
