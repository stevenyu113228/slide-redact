import JSZip from "jszip";
import { cleanOrphanedMedia, stripMetadata } from "./media-cleaner";
import { downloadBlob } from "../utils/file-helpers";

export interface ExportOptions {
  stripMetadata: boolean;
  filename: string;
}

export interface ExportResult {
  orphanedCount: number;
  orphanedFiles: string[];
  originalSize: number;
  cleanedSize: number;
  metadataStripped: boolean;
}

/**
 * Perform a secure export on a user-provided .pptx file:
 * remove orphaned media, optionally strip metadata, and trigger a download.
 */
export async function secureExport(
  file: File,
  options: ExportOptions,
  onProgress?: (stage: string) => void
): Promise<ExportResult> {
  // 1. Read file bytes
  onProgress?.("Reading file...");
  const arrayBuffer = await file.arrayBuffer();
  const originalSize = arrayBuffer.byteLength;

  // Validate ZIP magic bytes (PK\x03\x04)
  const header = new Uint8Array(arrayBuffer, 0, 4);
  if (header[0] !== 0x50 || header[1] !== 0x4b) {
    throw new Error("Not a valid .pptx file (not a ZIP archive).");
  }

  // 2. Load into JSZip
  onProgress?.("Analyzing file structure...");
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 3. Remove orphaned media
  onProgress?.("Scanning for orphaned media files...");
  const cleanupResult = await cleanOrphanedMedia(zip);

  // 4. Optionally strip metadata
  let metadataStripped = false;
  if (options.stripMetadata) {
    onProgress?.("Stripping metadata...");
    metadataStripped = await stripMetadata(zip);
  }

  // 5. Generate clean PPTX
  onProgress?.("Generating secure file...");
  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  // 6. Trigger download
  onProgress?.("Downloading...");
  downloadBlob(blob, options.filename);

  return {
    orphanedCount: cleanupResult.removedCount,
    orphanedFiles: cleanupResult.orphanedFiles,
    originalSize,
    cleanedSize: blob.size,
    metadataStripped,
  };
}
