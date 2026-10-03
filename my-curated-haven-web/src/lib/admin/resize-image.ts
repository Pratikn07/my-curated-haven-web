/**
 * Shrink a phone photo to web size in the browser before upload: at most
 * 1600 px on the long edge, WebP where the browser can encode it (JPEG on
 * older Safari). A 4 MB camera photo becomes roughly 200-400 KB.
 */
const MAX_EDGE = 1600;

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file);
  } catch {
    // Some browsers can show a format (HEIC on Safari) they can't decode into a bitmap.
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function resizeImage(file: File): Promise<Blob> {
  const source = await decode(file);
  const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  if (!width || !height) throw new Error("Photo has no size");

  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ("close" in source) source.close();

  const webp = await toBlob(canvas, "image/webp", 0.82);
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await toBlob(canvas, "image/jpeg", 0.85);
  if (!jpeg) throw new Error("Photo could not be encoded");
  return jpeg;
}
