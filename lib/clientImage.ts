export const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_AVATAR_UPLOAD_BYTES = 8 * 1024 * 1024; // pre-compression cap

/** Draws the source image cropped-to-cover into a square canvas and
 * re-encodes it as JPEG — this is what makes the stored avatar always a
 * proper square (not just CSS-cropped on display) and keeps the file small
 * regardless of what was uploaded. */
export async function resizeImageToSquareJpeg(file: File, size = 512, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image.");

  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const drawWidth = bitmap.width * scale;
  const drawHeight = bitmap.height * scale;
  const dx = (size - drawWidth) / 2;
  const dy = (size - drawHeight) / 2;
  ctx.drawImage(bitmap, dx, dy, drawWidth, drawHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not process image."))), "image/jpeg", quality);
  });
}
