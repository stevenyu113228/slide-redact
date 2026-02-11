export function loadImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    // Handle both raw base64 and data URL formats
    if (base64.startsWith("data:")) {
      img.src = base64;
    } else {
      img.src = `data:image/png;base64,${base64}`;
    }
  });
}

export function base64ToDataUrl(
  base64: string,
  mimeType = "image/png"
): string {
  if (base64.startsWith("data:")) return base64;
  return `data:${mimeType};base64,${base64}`;
}

export function stripDataUrlPrefix(dataUrl: string): string {
  const idx = dataUrl.indexOf(",");
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}
