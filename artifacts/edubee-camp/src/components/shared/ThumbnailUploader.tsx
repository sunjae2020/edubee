import { useRef, useState } from "react";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const MAX_WIDTH = 1280;
const MAX_HEIGHT = 720;
const JPEG_QUALITY = 0.82;

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas context error")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    img.src = url;
  });
}

interface ThumbnailUploaderProps {
  currentUrl?: string | null;
  onUploaded: (objectPath: string) => void;
  disabled?: boolean;
}

export function ThumbnailUploader({ currentUrl, onUploaded, disabled }: ThumbnailUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const getImageSrc = () => {
    if (preview) return preview;
    if (!currentUrl) return null;
    if (currentUrl.startsWith("data:")) return currentUrl;
    if (currentUrl.startsWith("/objects/")) return `${BASE}/api/storage${currentUrl}`;
    if (currentUrl.startsWith("http")) return currentUrl;
    return currentUrl;
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Only image files can be uploaded.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be 10MB or less.");
      return;
    }

    setError(null);
    setIsUploading(true);
    setProgress(20);

    try {
      const dataUrl = await compressImage(file);
      setProgress(90);
      setPreview(dataUrl);
      onUploaded(dataUrl);
      setProgress(100);
    } catch (e: any) {
      setError(e.message ?? "Upload failed");
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const imgSrc = getImageSrc();

  return (
    <div className="space-y-2">
      <div
        className={`relative w-full rounded-xl border-2 border-dashed overflow-hidden transition-colors ${
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-[--e-orange]/60"
        } ${imgSrc ? "border-border" : "border-muted-foreground/25"}`}
        style={{ aspectRatio: "16/9", maxHeight: 220 }}
        onClick={() => !disabled && !isUploading && inputRef.current?.click()}
      >
        {imgSrc ? (
          <img src={imgSrc} alt="Thumbnail" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground/60">
            <ImageIcon className="w-10 h-10" />
            <span className="text-sm font-medium">Click to upload image</span>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-7 h-7 text-white animate-spin" />
            <div className="text-white text-sm font-semibold">{progress}%</div>
            <div className="w-32 h-1.5 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-[--e-orange] rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {!isUploading && !disabled && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            className="absolute bottom-2 right-2 bg-white/90 hover:bg-white text-foreground border border-border rounded-lg px-2.5 py-1.5 text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            {imgSrc ? "Change" : "Upload"}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground/70">
          Recommended: <span className="font-semibold">1280 × 720px</span> (16:9) · JPG/PNG/WebP · Max 10MB
        </p>
        {imgSrc && !disabled && !isUploading && (
          <button
            type="button"
            onClick={() => { setPreview(null); onUploaded(""); }}
            className="text-[11px] text-red-500 hover:text-red-600 flex items-center gap-0.5"
          >
            <X className="w-3 h-3" /> Remove
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}
