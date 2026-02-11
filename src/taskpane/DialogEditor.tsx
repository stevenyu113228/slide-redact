import { useState, useCallback, useEffect, useRef } from "react";
import type { BlurMode } from "../types/editor";
import type { ShapeImageInfo } from "../types/office";
import { useRegions } from "../hooks/useRegions";
import { useCanvasRenderer } from "../hooks/useCanvasRenderer";
import { BlurControls } from "./BlurControls";
import { RegionSelector } from "./RegionSelector";

const STORAGE_KEY = "slide-redact-dialog-image";

export function DialogEditor() {
  const [image, setImage] = useState<ShapeImageInfo | null>(null);
  const [mode, setMode] = useState<BlurMode>("pixelate");
  const [blockSize, setBlockSize] = useState(10);
  const [fillColor, setFillColor] = useState("#000000");

  const [drawState, setDrawState] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Load image data from localStorage (put there by the taskpane)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setImage(JSON.parse(raw));
      }
    } catch {
      console.error("Failed to load image from localStorage");
    }
  }, []);

  const {
    regions,
    addRegion,
    removeRegion,
    clearRegions,
    undo,
    redo,
    canUndo,
    canRedo,
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
    image?.base64 ?? null,
    regions,
    drawState,
    mode,
    blockSize,
    fillColor
  );

  const imageReady = imageSize !== null;

  useEffect(() => {
    render();
  }, [regions, render]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        redo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
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
  }, [regions, removeRegion, undo, redo, zoomIn, zoomOut, zoomReset]);

  // Scroll wheel / trackpad pinch zoom — re-attach when imageReady changes
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
    addRegion(0, 0, imageSize.width, imageSize.height, mode, blockSize, fillColor);
  }, [addRegion, mode, blockSize, fillColor, imageSize]);

  // Send regions back to the taskpane and close dialog
  const handleApply = useCallback(() => {
    if (regions.length === 0) return;
    const message = JSON.stringify({
      type: "apply-regions",
      regions,
    });
    Office.context.ui.messageParent(message);
  }, [regions]);

  const handleCancel = useCallback(() => {
    Office.context.ui.messageParent(JSON.stringify({ type: "cancel" }));
  }, []);

  if (!image) {
    return (
      <div className="dialog-editor">
        <div className="loading-screen">
          <div className="spinner" />
          <p>Loading image...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dialog-editor">
      <div className="dialog-top-bar">
        <span className="dialog-title">{image.name}</span>
      </div>

      <div className="dialog-body">
        <div className="dialog-canvas-area" ref={containerRef}>
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
                disabled={false}
              />
            )}
          </div>
        </div>

        <div className="dialog-sidebar">
          <div className="control-group">
            <label className="control-label">Zoom</label>
            <div className="zoom-toolbar sidebar-zoom">
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
          </div>

          <div className="control-group">
            <label className="control-label">History</label>
            <div className="undo-redo-toolbar">
              <button
                className="btn btn-ghost btn-sm"
                onClick={undo}
                disabled={!canUndo}
                title="Undo (Cmd+Z)"
              >
                &#x21A9; Undo
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={redo}
                disabled={!canRedo}
                title="Redo (Cmd+Shift+Z)"
              >
                Redo &#x21AA;
              </button>
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

          <div className="dialog-sidebar-actions">
            <button
              className="btn btn-primary btn-lg"
              onClick={handleApply}
              disabled={regions.length === 0}
            >
              Apply {regions.length} Region{regions.length !== 1 ? "s" : ""}
            </button>
            <button className="btn btn-ghost" onClick={handleCancel}>
              Cancel
            </button>
          </div>

          <p className="editor-hint">
            Draw rectangles on the image.
            <kbd>Cmd</kbd>+<kbd>Z</kbd> undo,
            <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> redo.
            <kbd>Cmd</kbd>+scroll to zoom.
          </p>
        </div>
      </div>
    </div>
  );
}
