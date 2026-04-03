import { useRef, useState, useCallback } from "react";
import { Upload, X, Star, ImageIcon, Loader2, AlertCircle } from "lucide-react";

const MAX_IMAGES   = 5;
const MAX_FILE_MB  = 10;
const TARGET_PX    = 900;
const TARGET_BYTES = 300 * 1024;
const QUALITY_STEP = 0.05;

export interface ProductImage {
  url: string;
  isPrimary: boolean;
}

interface Props {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  disabled?: boolean;
}

async function resizeAndCompress(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(src);
      const { naturalWidth: w, naturalHeight: h } = img;
      let sw = w, sh = h;
      if (Math.max(w, h) > TARGET_PX) {
        const ratio = TARGET_PX / Math.max(w, h);
        sw = Math.round(w * ratio);
        sh = Math.round(h * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width  = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, sw, sh);

      let quality = 0.82;
      const tryExport = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error("Canvas export failed")); return; }
            if (blob.size <= TARGET_BYTES || quality <= QUALITY_STEP) {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error("FileReader failed"));
              reader.readAsDataURL(blob);
            } else {
              quality = Math.max(QUALITY_STEP, quality - QUALITY_STEP);
              tryExport();
            }
          },
          "image/jpeg",
          quality,
        );
      };
      tryExport();
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}

function getDisplayUrl(url: string) {
  if (!url) return "";
  return url;
}

function ImageSlot({
  image, index, onUpload, onRemove, onSetPrimary, uploading, progress, disabled,
}: {
  image: ProductImage | null;
  index: number;
  onUpload: (idx: number, file: File) => void;
  onRemove: (idx: number) => void;
  onSetPrimary: (idx: number) => void;
  uploading: boolean;
  progress: number;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files[0];
    if (file) onUpload(index, file);
  };

  const isEmpty = !image;
  const isPrimary = image?.isPrimary ?? false;
  const displayUrl = image ? getDisplayUrl(image.url) : null;

  return (
    <div className="relative group">
      <div
        className={`relative rounded-xl border-2 overflow-hidden bg-[#FAFAF9] transition-all cursor-pointer
          ${isEmpty
            ? dragOver
              ? "border-(--e-orange) bg-(--e-orange-lt)"
              : "border-dashed border-[#E8E6E2] hover:border-(--e-orange)/50"
            : isPrimary
              ? "border-(--e-orange)"
              : "border-[#E8E6E2] hover:border-(--e-orange)/50"}
          ${disabled ? "opacity-60 cursor-not-allowed" : ""}
        `}
        style={{ aspectRatio: "4/3" }}
        onDragOver={e => { e.preventDefault(); if (!disabled) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && !uploading && isEmpty && inputRef.current?.click()}
      >
        {displayUrl ? (
          <img src={displayUrl} alt={`Product image ${index + 1}`} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-[#A8A29E]">
            <ImageIcon className="w-7 h-7 opacity-50" />
            <span className="text-[11px] font-medium">
              {index === 0 ? "Main Image" : `Image ${index + 1}`}
            </span>
            <span className="text-[10px] opacity-70">Click or drag</span>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
            <div className="text-white text-xs font-semibold">{progress}%</div>
            <div className="w-20 h-1.5 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-(--e-orange) rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {displayUrl && !uploading && !disabled && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
              className="bg-white/90 hover:bg-white text-[#1C1917] rounded-lg px-2.5 py-1.5 text-xs font-medium flex items-center gap-1.5 shadow-sm"
            >
              <Upload className="w-3 h-3" /> Replace
            </button>
          </div>
        )}

        {isPrimary && (
          <div className="absolute top-1.5 left-1.5 bg-(--e-orange) text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
            <Star className="w-2.5 h-2.5 fill-white" /> Primary
          </div>
        )}

        {displayUrl && !disabled && !uploading && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onRemove(index); }}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 hover:bg-red-50 hover:text-red-500 text-[#57534E] flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {displayUrl && !disabled && (
        <div className="flex items-center gap-1.5 mt-1.5">
          {!isPrimary && (
            <button
              type="button"
              onClick={() => onSetPrimary(index)}
              className="flex-1 text-[10px] font-medium text-[#57534E] border border-[#E8E6E2] rounded-lg py-1 hover:border-(--e-orange) hover:text-(--e-orange) transition-colors flex items-center justify-center gap-1"
            >
              <Star className="w-2.5 h-2.5" /> Set Primary
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(index, f); e.target.value = ""; }}
      />
    </div>
  );
}

export function ProductImageGallery({ images, onChange, disabled }: Props) {
  const [uploadingIdx, setUploadingIdx]   = useState<number | null>(null);
  const [progress,     setProgress]       = useState(0);
  const [error,        setError]          = useState<string | null>(null);

  const handleUpload = useCallback(async (idx: number, file: File) => {
    setError(null);

    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setError("Only JPG, PNG, and WebP images are supported."); return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_FILE_MB} MB.`); return;
    }

    setUploadingIdx(idx); setProgress(10);

    try {
      setProgress(30);
      const dataUrl = await resizeAndCompress(file);
      setProgress(90);

      const newImages = [...images];
      const hasPrimary = newImages.some(img => img?.isPrimary);
      const entry: ProductImage = {
        url: dataUrl,
        isPrimary: !hasPrimary,
      };

      newImages[idx] = entry;
      if (entry.isPrimary) {
        newImages.forEach((img, i) => { if (img && i !== idx) img.isPrimary = false; });
      }
      setProgress(100);
      onChange(newImages.filter(Boolean) as ProductImage[]);
    } catch (e: any) {
      setError(e.message ?? "Upload failed.");
    } finally {
      setUploadingIdx(null);
      setProgress(0);
    }
  }, [images, onChange]);

  const handleRemove = (idx: number) => {
    const newImages = images.filter((_, i) => i !== idx);
    if (newImages.length > 0 && !newImages.some(img => img.isPrimary)) {
      newImages[0].isPrimary = true;
    }
    onChange(newImages);
  };

  const handleSetPrimary = (idx: number) => {
    const newImages = images.map((img, i) => ({ ...img, isPrimary: i === idx }));
    onChange(newImages);
  };

  const slots: (ProductImage | null)[] = Array.from({ length: MAX_IMAGES }, (_, i) => images[i] ?? null);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg bg-(--e-orange-lt)/60 border border-(--e-orange)/20 px-3.5 py-2.5">
        <AlertCircle className="w-3.5 h-3.5 text-(--e-orange) shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#57534E] leading-relaxed">
          <span className="font-semibold text-(--e-orange)">Recommended:</span>{" "}
          900 × 675 px (4:3 ratio) · JPG / PNG / WebP · Max {MAX_FILE_MB} MB per file.
          Images are automatically resized and compressed before saving.
          Select one image as the <span className="font-semibold">Primary</span> (shown as the main product image).
          Up to {MAX_IMAGES} images allowed.
        </p>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {slots.map((img, idx) => (
          <ImageSlot
            key={idx}
            image={img}
            index={idx}
            onUpload={handleUpload}
            onRemove={handleRemove}
            onSetPrimary={handleSetPrimary}
            uploading={uploadingIdx === idx}
            progress={progress}
            disabled={disabled || (uploadingIdx !== null && uploadingIdx !== idx)}
          />
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      )}

      <p className="text-[11px] text-[#A8A29E]">
        {images.length} / {MAX_IMAGES} images uploaded
        {images.some(i => i.isPrimary) && ` · Primary: Image ${images.findIndex(i => i.isPrimary) + 1}`}
      </p>
    </div>
  );
}
