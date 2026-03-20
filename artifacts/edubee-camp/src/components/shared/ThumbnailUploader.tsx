import { useRef, useState } from "react";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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
    if (currentUrl.startsWith("/objects/")) return `${BASE}/api/storage${currentUrl}`;
    if (currentUrl.startsWith("http")) return currentUrl;
    return currentUrl;
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드 가능합니다.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("파일 크기는 10MB 이하여야 합니다.");
      return;
    }

    setError(null);
    setIsUploading(true);
    setProgress(0);

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    try {
      const urlRes = await fetch(`${BASE}/api/storage/uploads/request-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("edubee_token")}`,
        },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });

      if (!urlRes.ok) throw new Error("업로드 URL 생성 실패");
      const { uploadURL, objectPath } = await urlRes.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.open("PUT", uploadURL);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      onUploaded(objectPath);
      setProgress(100);
    } catch (e: any) {
      setError(e.message ?? "업로드 실패");
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
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-[#F5821F]/60"
        } ${imgSrc ? "border-border" : "border-muted-foreground/25"}`}
        style={{ aspectRatio: "16/9", maxHeight: 220 }}
        onClick={() => !disabled && !isUploading && inputRef.current?.click()}
      >
        {imgSrc ? (
          <img src={imgSrc} alt="Thumbnail" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground/60">
            <ImageIcon className="w-10 h-10" />
            <span className="text-sm font-medium">클릭하여 이미지 업로드</span>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-7 h-7 text-white animate-spin" />
            <div className="text-white text-sm font-semibold">{progress}%</div>
            <div className="w-32 h-1.5 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-[#F5821F] rounded-full transition-all" style={{ width: `${progress}%` }} />
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
            {imgSrc ? "변경" : "업로드"}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground/70">
          권장 사이즈: <span className="font-semibold">1280 × 720px</span> (16:9) · JPG/PNG/WebP · 최대 10MB
        </p>
        {imgSrc && !disabled && !isUploading && (
          <button
            type="button"
            onClick={() => { setPreview(null); onUploaded(""); }}
            className="text-[11px] text-red-500 hover:text-red-600 flex items-center gap-0.5"
          >
            <X className="w-3 h-3" /> 제거
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
