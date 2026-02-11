import type { BlurMode } from "../types/editor";

interface BlurControlsProps {
  mode: BlurMode;
  blockSize: number;
  fillColor: string;
  regionCount: number;
  onModeChange: (mode: BlurMode) => void;
  onBlockSizeChange: (size: number) => void;
  onFillColorChange: (color: string) => void;
  onClearRegions: () => void;
  onApplyFullImage: () => void;
}

export function BlurControls({
  mode,
  blockSize,
  fillColor,
  regionCount,
  onModeChange,
  onBlockSizeChange,
  onFillColorChange,
  onClearRegions,
  onApplyFullImage,
}: BlurControlsProps) {
  return (
    <div className="blur-controls">
      <div className="control-group">
        <label className="control-label">Mode</label>
        <div className="mode-toggle">
          <button
            className={`mode-btn ${mode === "pixelate" ? "active" : ""}`}
            onClick={() => onModeChange("pixelate")}
          >
            Pixelate
          </button>
          <button
            className={`mode-btn ${mode === "solid" ? "active" : ""}`}
            onClick={() => onModeChange("solid")}
          >
            Solid Fill
          </button>
        </div>
      </div>

      {mode === "pixelate" ? (
        <div className="control-group">
          <label className="control-label">
            Block Size: {blockSize}px
          </label>
          <input
            type="range"
            min={4}
            max={50}
            value={blockSize}
            onChange={(e) => onBlockSizeChange(Number(e.target.value))}
            className="block-size-slider"
          />
        </div>
      ) : (
        <div className="control-group">
          <label className="control-label">Fill Color</label>
          <div className="color-picker-row">
            <input
              type="color"
              value={fillColor}
              onChange={(e) => onFillColorChange(e.target.value)}
              className="color-picker"
            />
            <span className="color-value">{fillColor}</span>
          </div>
        </div>
      )}

      <div className="control-actions">
        <button
          className="btn btn-outline"
          onClick={onApplyFullImage}
        >
          Apply to Full Image
        </button>
        {regionCount > 0 && (
          <button className="btn btn-ghost" onClick={onClearRegions}>
            Clear All Regions ({regionCount})
          </button>
        )}
      </div>
    </div>
  );
}
