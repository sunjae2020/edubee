/** Convert a File/Blob to a base64 data URL. */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("FileReader error"));
    reader.readAsDataURL(file);
  });
}

/**
 * Resizes an image file to a square crop of `size × size` pixels,
 * exported as JPEG at the given quality.
 * Uses center-crop so the subject stays centered.
 */
export async function resizeImageForUpload(
  file: File,
  size = 256,
  quality = 0.85,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement("canvas");
      canvas.width  = size;
      canvas.height = size;

      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas context unavailable")); return; }

      // Center-crop: use the shorter side to fill the square
      const minSide = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth  - minSide) / 2;
      const sy = (img.naturalHeight - minSide) / 2;
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

      canvas.toBlob(blob => {
        if (!blob) { reject(new Error("Canvas toBlob failed")); return; }
        resolve(new File([blob], "profile.jpg", { type: "image/jpeg" }));
      }, "image/jpeg", quality);
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}
