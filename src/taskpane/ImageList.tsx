import type { ShapeImageInfo } from "../types/office";
import { base64ToDataUrl } from "../utils/image-loader";

interface ImageListProps {
  images: ShapeImageInfo[];
  loading: boolean;
  error: string | null;
  onSelectImage: (image: ShapeImageInfo) => void;
  onRefresh: () => void;
}

export function ImageList({
  images,
  loading,
  error,
  onSelectImage,
  onRefresh,
}: ImageListProps) {
  if (loading) {
    return (
      <div className="image-list-status">
        <div className="spinner" />
        <p>Loading images from slide...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="image-list-status error">
        <p>{error}</p>
        <button className="btn btn-primary" onClick={onRefresh}>
          Retry
        </button>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="image-list-status">
        <p className="empty-message">
          No images found on the current slide.
        </p>
        <p className="empty-hint">
          Select a slide with images and click refresh.
        </p>
        <button className="btn btn-primary" onClick={onRefresh}>
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="image-list">
      <div className="image-list-header">
        <span>{images.length} image{images.length !== 1 ? "s" : ""} found</span>
        <button className="btn btn-ghost btn-sm" onClick={onRefresh}>
          Refresh
        </button>
      </div>
      <div className="image-grid">
        {images.map((img) => (
          <button
            key={img.id}
            className="image-thumbnail-btn"
            onClick={() => onSelectImage(img)}
          >
            <img
              src={base64ToDataUrl(img.base64)}
              alt={img.name}
              className="image-thumbnail"
            />
            <span className="image-name">{img.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
