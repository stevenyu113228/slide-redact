import { useRef, useEffect, useCallback, useState } from "react";
import type { BlurRegion } from "../types/editor";
import { loadImage } from "../utils/image-loader";
import { renderPreview } from "../core/image-processor";

interface DrawRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ZoomAnchor {
  // Cursor position relative to container viewport
  containerX: number;
  containerY: number;
  // The point in the canvas (as fraction) that was under the cursor before zoom
  fractionX: number;
  fractionY: number;
}

export function useCanvasRenderer(
  base64: string | null,
  regions: BlurRegion[],
  drawState: DrawRect | null,
  currentMode: "pixelate" | "solid",
  currentBlockSize: number,
  currentFillColor: string
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [zoom, setZoom] = useState(1);
  const zoomAnchorRef = useRef<ZoomAnchor | null>(null);

  // Store render params in refs so `render` identity stays stable
  const regionsRef = useRef(regions);
  const drawStateRef = useRef(drawState);
  const modeRef = useRef(currentMode);
  const blockSizeRef = useRef(currentBlockSize);
  const fillColorRef = useRef(currentFillColor);

  regionsRef.current = regions;
  drawStateRef.current = drawState;
  modeRef.current = currentMode;
  blockSizeRef.current = currentBlockSize;
  fillColorRef.current = currentFillColor;

  // Load image when base64 changes
  useEffect(() => {
    if (!base64) {
      imageRef.current = null;
      setImageSize(null);
      return;
    }
    let cancelled = false;
    loadImage(base64).then((img) => {
      if (cancelled) return;
      imageRef.current = img;
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    });
    return () => {
      cancelled = true;
    };
  }, [base64]);

  // Reset zoom when switching images
  useEffect(() => {
    setZoom(1);
  }, [base64]);

  // Stable render function — reads from refs, never causes dependency cascades
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => {
      renderPreview(
        ctx,
        img,
        regionsRef.current,
        drawStateRef.current,
        modeRef.current,
        blockSizeRef.current,
        fillColorRef.current
      );
    });
  }, []); // Stable — no deps, reads from refs

  // Re-render when any drawing parameter changes
  useEffect(() => {
    render();
  }, [regions, drawState, currentMode, currentBlockSize, currentFillColor, render]);

  // Resize canvas based on zoom — only runs when zoom or image changes
  useEffect(() => {
    if (!imageSize) return;

    const canvas = canvasRef.current;
    const img = imageRef.current;
    const container = containerRef.current;
    if (!canvas || !img || !container) return;

    const baseWidth = container.clientWidth;
    const aspect = img.naturalWidth / img.naturalHeight;
    const displayWidth = Math.round(baseWidth * zoom);
    const displayHeight = Math.round(displayWidth / aspect);

    canvas.width = displayWidth;
    canvas.height = displayHeight;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    // Apply scroll anchor so the point under cursor stays put
    const anchor = zoomAnchorRef.current;
    if (anchor) {
      container.scrollLeft = anchor.fractionX * displayWidth - anchor.containerX;
      container.scrollTop = anchor.fractionY * displayHeight - anchor.containerY;
      zoomAnchorRef.current = null;
    }

    render();
  }, [imageSize, zoom, render]);

  /**
   * Zoom to a specific level, anchored at a cursor position.
   * The point under the cursor stays visually fixed.
   */
  const zoomAt = useCallback(
    (newZoom: number, clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const containerX = clientX - rect.left;
      const containerY = clientY - rect.top;

      // Current canvas dimensions
      const canvasW = container.scrollWidth;
      const canvasH = container.scrollHeight;

      // The absolute point on the canvas under the cursor
      const absX = container.scrollLeft + containerX;
      const absY = container.scrollTop + containerY;

      zoomAnchorRef.current = {
        containerX,
        containerY,
        fractionX: canvasW > 0 ? absX / canvasW : 0,
        fractionY: canvasH > 0 ? absY / canvasH : 0,
      };

      setZoom(Math.min(5, Math.max(0.5, newZoom)));
    },
    []
  );

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.5, 5));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 0.5, 0.5));
  }, []);

  const zoomReset = useCallback(() => {
    setZoom(1);
  }, []);

  return {
    canvasRef,
    containerRef,
    imageRef,
    imageSize,
    zoom,
    zoomAt,
    zoomIn,
    zoomOut,
    zoomReset,
    render,
  };
}
