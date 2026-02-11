import { useState, useCallback } from "react";
import type { ShapeImageInfo } from "../types/office";
import { getSlideImages } from "../core/office-api";

export function useSlideImages() {
  const [images, setImages] = useState<ShapeImageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const slideImages = await getSlideImages();
      setImages(slideImages);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load images";
      setError(message);
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { images, loading, error, refresh };
}
