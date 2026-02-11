import { useState, useEffect, useCallback, useRef } from "react";
import type { ShapeImageInfo } from "../types/office";
import type { BlurRegion } from "../types/editor";
import { useOfficeContext } from "../hooks/useOfficeContext";
import { useSlideImages } from "../hooks/useSlideImages";
import { processImage } from "../core/image-processor";
import { replaceImageShape } from "../core/office-api";
import { ImageList } from "./ImageList";
import { SecureExport } from "./SecureExport";

const STORAGE_KEY = "slide-redact-dialog-image";

type View = "list" | "export";

export function TaskpaneApp() {
  const { isReady, isSupported, missingApis, error: officeError } = useOfficeContext();
  const { images, loading, error: imageError, refresh } = useSlideImages();
  const [view, setView] = useState<View>("list");
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const dialogRef = useRef<Office.Dialog | null>(null);
  const selectedImageRef = useRef<ShapeImageInfo | null>(null);

  // Load images when the add-in becomes ready
  useEffect(() => {
    if (isReady && isSupported) {
      refresh();
    }
  }, [isReady, isSupported, refresh]);

  // Auto-refresh when slide selection or content changes
  useEffect(() => {
    if (!isReady || !isSupported) return;

    const handler = () => {
      // Only refresh when on the image list view and not currently applying
      if (!applying && !dialogRef.current) {
        refresh();
      }
    };

    Office.context.document.addHandlerAsync(
      Office.EventType.DocumentSelectionChanged,
      handler
    );

    return () => {
      Office.context.document.removeHandlerAsync(
        Office.EventType.DocumentSelectionChanged,
        { handler }
      );
    };
  }, [isReady, isSupported, applying, refresh]);

  const handleDialogMessage = useCallback(
    async (arg: { message: string; origin: string | undefined } | { error: number }) => {
      if ("error" in arg) return; // Dialog error event, ignore
      const data = JSON.parse(arg.message);

      if (data.type === "cancel") {
        dialogRef.current?.close();
        dialogRef.current = null;
        return;
      }

      if (data.type === "apply-regions") {
        dialogRef.current?.close();
        dialogRef.current = null;

        const image = selectedImageRef.current;
        if (!image) return;

        const regions: BlurRegion[] = data.regions;
        setApplying(true);
        setApplyError(null);

        try {
          const processedBase64 = await processImage(image.base64, regions);
          await replaceImageShape(image.id, processedBase64);
          refresh();
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to apply changes";
          setApplyError(message);
        } finally {
          setApplying(false);
        }
      }
    },
    [refresh]
  );

  const handleSelectImage = useCallback(
    (image: ShapeImageInfo) => {
      selectedImageRef.current = image;

      // Store image data for the dialog to read
      localStorage.setItem(STORAGE_KEY, JSON.stringify(image));

      // Open dialog at 90% of screen
      const url = `${window.location.origin}/editor.html`;
      Office.context.ui.displayDialogAsync(
        url,
        { height: 90, width: 90, displayInIframe: false },
        (result) => {
          if (result.status !== Office.AsyncResultStatus.Succeeded) {
            setApplyError("Failed to open editor dialog");
            return;
          }
          const dialog = result.value;
          dialogRef.current = dialog;
          dialog.addEventHandler(
            Office.EventType.DialogMessageReceived,
            handleDialogMessage
          );
          dialog.addEventHandler(
            Office.EventType.DialogEventReceived,
            () => {
              // Dialog was closed by user (X button)
              dialogRef.current = null;
            }
          );
        }
      );
    },
    [handleDialogMessage]
  );

  // Loading state
  if (!isReady) {
    return (
      <div className="taskpane">
        <div className="loading-screen">
          <div className="spinner" />
          <p>Initializing add-in...</p>
        </div>
      </div>
    );
  }

  // Unsupported API version
  if (!isSupported) {
    return (
      <div className="taskpane">
        <div className="error-screen">
          <h2>Unsupported Office Version</h2>
          {officeError && <p>{officeError}</p>}
          {missingApis.length > 0 && (
            <div>
              <p>Missing APIs:</p>
              <ul>
                {missingApis.map((api) => (
                  <li key={api}>{api}</li>
                ))}
              </ul>
            </div>
          )}
          <p>
            Please update to Office version 16.105 or later on macOS to use this
            add-in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="taskpane">
      <header className="taskpane-header">
        <h1 className="taskpane-title">SlideRedact</h1>
        <div className="taskpane-nav">
          <button
            className={`nav-btn ${view === "list" ? "active" : ""}`}
            onClick={() => setView("list")}
          >
            Images
          </button>
          <button
            className={`nav-btn ${view === "export" ? "active" : ""}`}
            onClick={() => setView("export")}
          >
            Secure Export
          </button>
        </div>
      </header>

      <main className="taskpane-content">
        {applying && (
          <div className="applying-overlay">
            <div className="spinner" />
            <p>Applying blur to slide...</p>
          </div>
        )}

        {applyError && (
          <div className="error-message" style={{ marginBottom: 12 }}>
            {applyError}
          </div>
        )}

        {view === "list" && (
          <ImageList
            images={images}
            loading={loading}
            error={imageError}
            onSelectImage={handleSelectImage}
            onRefresh={refresh}
          />
        )}

        {view === "export" && <SecureExport />}
      </main>
    </div>
  );
}
