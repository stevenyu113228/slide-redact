import { useState, useCallback, useRef } from "react";
import type { BlurRegion, BlurMode } from "../types/editor";
import { generateId } from "../utils/file-helpers";

export function useRegions() {
  const [regions, setRegions] = useState<BlurRegion[]>([]);
  // Undo/redo stacks store snapshots of the regions array
  const undoStack = useRef<BlurRegion[][]>([]);
  const redoStack = useRef<BlurRegion[][]>([]);

  /** Push current state onto undo stack before mutating */
  const pushUndo = useCallback((current: BlurRegion[]) => {
    undoStack.current.push(current);
    // Any new action clears the redo stack
    redoStack.current = [];
  }, []);

  const addRegion = useCallback(
    (
      x: number,
      y: number,
      width: number,
      height: number,
      mode: BlurMode,
      blockSize: number,
      fillColor: string
    ) => {
      const nx = width < 0 ? x + width : x;
      const ny = height < 0 ? y + height : y;
      const nw = Math.abs(width);
      const nh = Math.abs(height);

      if (nw < 2 || nh < 2) return;

      const region: BlurRegion = {
        id: generateId(),
        x: nx,
        y: ny,
        width: nw,
        height: nh,
        mode,
        blockSize,
        fillColor,
      };
      setRegions((prev) => {
        pushUndo(prev);
        return [...prev, region];
      });
      return region.id;
    },
    [pushUndo]
  );

  const removeRegion = useCallback(
    (id: string) => {
      setRegions((prev) => {
        pushUndo(prev);
        return prev.filter((r) => r.id !== id);
      });
    },
    [pushUndo]
  );

  const clearRegions = useCallback(() => {
    setRegions((prev) => {
      if (prev.length > 0) pushUndo(prev);
      return [];
    });
    undoStack.current = [];
    redoStack.current = [];
  }, [pushUndo]);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (prev === undefined) return;
    setRegions((current) => {
      redoStack.current.push(current);
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (next === undefined) return;
    setRegions((current) => {
      undoStack.current.push(current);
      return next;
    });
  }, []);

  const canUndo = undoStack.current.length > 0;
  const canRedo = redoStack.current.length > 0;

  return {
    regions,
    addRegion,
    removeRegion,
    clearRegions,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
