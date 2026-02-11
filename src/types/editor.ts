export interface BlurRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  mode: "pixelate" | "solid";
  blockSize: number;
  fillColor: string;
}

export type BlurMode = "pixelate" | "solid";

export interface EditorState {
  imageId: string | null;
  imageBase64: string | null;
  regions: BlurRegion[];
  activeRegionId: string | null;
  mode: BlurMode;
  blockSize: number;
  fillColor: string;
  zoom: number;
  panX: number;
  panY: number;
  isDrawing: boolean;
}

export interface DrawState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}
