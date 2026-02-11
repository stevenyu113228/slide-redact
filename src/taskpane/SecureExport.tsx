import { useState, useCallback, useRef } from "react";
import { secureExport, type ExportResult } from "../core/secure-export";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SecureExport() {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stripMeta, setStripMeta] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".pptx")) {
        setError("Please select a .pptx file.");
        return;
      }

      setExporting(true);
      setError(null);
      setResult(null);

      try {
        const baseName = file.name.replace(/\.pptx$/i, "");
        const exportResult = await secureExport(
          file,
          {
            stripMetadata: stripMeta,
            filename: `${baseName}_secured.pptx`,
          },
          setProgress
        );
        setResult(exportResult);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Export failed";
        setError(message);
      } finally {
        setExporting(false);
        setProgress(null);
      }
    },
    [stripMeta]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      // Reset so the same file can be selected again
      e.target.value = "";
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  return (
    <div className="secure-export">
      <h3 className="section-title">Secure Export</h3>
      <p className="section-desc">
        <strong>Why is this needed?</strong> When you apply blur in PowerPoint,
        the original image may still remain inside the .pptx file. A .pptx is
        actually a ZIP archive — anyone can rename it to .zip, open it, and find
        the unblurred original in the <code>ppt/media/</code> folder.
      </p>
      <p className="section-desc">
        This tool scans the file, removes orphaned originals that are no longer
        referenced by any slide, and downloads a clean copy.
      </p>
      <p className="section-desc">
        <strong>Steps:</strong> Apply blur &rarr; Save (Cmd+S) &rarr; Select the
        saved .pptx below &rarr; Use the downloaded secure copy.
      </p>

      <div className="export-options">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={stripMeta}
            onChange={(e) => setStripMeta(e.target.checked)}
            disabled={exporting}
          />
          Strip author metadata
        </label>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pptx"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <div
        className={`drop-zone ${dragOver ? "drop-zone-active" : ""} ${exporting ? "drop-zone-disabled" : ""}`}
        onClick={() => !exporting && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {exporting ? (
          <>
            <div className="spinner" />
            <p>{progress ?? "Processing..."}</p>
          </>
        ) : (
          <>
            <p className="drop-zone-title">
              Drop .pptx file here or click to browse
            </p>
            <p className="drop-zone-hint">
              Save your presentation first (Cmd+S)
            </p>
          </>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {result && (
        <div className="export-result">
          <div className="result-item">
            <span className="result-label">Orphaned files removed:</span>
            <span className="result-value">{result.orphanedCount}</span>
          </div>
          {result.orphanedFiles.length > 0 && (
            <div className="result-files">
              {result.orphanedFiles.map((f) => (
                <div key={f} className="result-file">
                  {f}
                </div>
              ))}
            </div>
          )}
          <div className="result-item">
            <span className="result-label">Original size:</span>
            <span className="result-value">
              {formatBytes(result.originalSize)}
            </span>
          </div>
          <div className="result-item">
            <span className="result-label">Cleaned size:</span>
            <span className="result-value">
              {formatBytes(result.cleanedSize)}
            </span>
          </div>
          {result.metadataStripped && (
            <div className="result-item">
              <span className="result-label">Metadata:</span>
              <span className="result-value">Stripped</span>
            </div>
          )}
          <div className="result-success">
            Secure file downloaded.
          </div>
        </div>
      )}
    </div>
  );
}
