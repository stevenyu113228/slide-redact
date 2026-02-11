import { useCallback, useRef, useState } from "react";
import type { BlurMode } from "../types/editor";

interface RegionSelectorProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  imageWidth: number;
  imageHeight: number;
  onRegionComplete: (
    x: number,
    y: number,
    width: number,
    height: number
  ) => void;
  onDrawStateChange: (
    state: { x: number; y: number; width: number; height: number } | null
  ) => void;
  mode: BlurMode;
  disabled?: boolean;
}

export function RegionSelector({
  canvasRef,
  imageWidth,
  imageHeight,
  onRegionComplete,
  onDrawStateChange,
  disabled,
}: RegionSelectorProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const startRef = useRef({ x: 0, y: 0 });

  const getImageCoords = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      // getBoundingClientRect accounts for scroll and zoom automatically
      const rect = canvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      // rect.width/height = actual displayed size (may differ from canvas.width if CSS scaled)
      // canvas.width/height = internal pixel buffer
      // We use rect dimensions to correctly map from screen to canvas pixels
      const scaleToCanvas_X = canvas.width / rect.width;
      const scaleToCanvas_Y = canvas.height / rect.height;

      const pixelX = canvasX * scaleToCanvas_X;
      const pixelY = canvasY * scaleToCanvas_Y;

      // Then canvas pixels to image coordinates
      const scaleX = imageWidth / canvas.width;
      const scaleY = imageHeight / canvas.height;

      return {
        x: pixelX * scaleX,
        y: pixelY * scaleY,
      };
    },
    [canvasRef, imageWidth, imageHeight]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      const coords = getImageCoords(e);
      startRef.current = coords;
      setIsDrawing(true);
      onDrawStateChange({ x: coords.x, y: coords.y, width: 0, height: 0 });
    },
    [disabled, getImageCoords, onDrawStateChange]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing) return;
      const coords = getImageCoords(e);
      const start = startRef.current;
      onDrawStateChange({
        x: start.x,
        y: start.y,
        width: coords.x - start.x,
        height: coords.y - start.y,
      });
    },
    [isDrawing, getImageCoords, onDrawStateChange]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing) return;
      setIsDrawing(false);
      const coords = getImageCoords(e);
      const start = startRef.current;
      const width = coords.x - start.x;
      const height = coords.y - start.y;

      if (Math.abs(width) > 2 && Math.abs(height) > 2) {
        onRegionComplete(start.x, start.y, width, height);
      }
      onDrawStateChange(null);
    },
    [isDrawing, getImageCoords, onRegionComplete, onDrawStateChange]
  );

  return (
    <div
      className="region-selector-overlay"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: disabled ? "default" : "crosshair" }}
    />
  );
}
