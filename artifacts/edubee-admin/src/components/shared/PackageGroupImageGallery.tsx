import { useRef, useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Star, Trash2, ImagePlus, Loader2, Upload, X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const MAX_IMAGES = 5;
const MAX_W = 1280;
const MAX_H = 720;
const JPEG_Q = 0.85;

type GalleryImage = {
  id: string;
  packageGroupId: string;
  imageUrl: string;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
};

type UploadSlot = { file: File; status: "pending" | "uploading" | "done" | "error"; progress: number; error?: string };

async function compressToBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_W || height > MAX_H) {
        const ratio = Math.min(MAX_W / width, MAX_H / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas error")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Blob error")), "image/jpeg", JPEG_Q);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Load error")); };
    img.src = url;
  });
}

function resolveUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("/objects/")) return `${BASE}/api/storage${url}`;
  return url;
}

interface LightboxProps {
  images: GalleryImage[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (i: number) => void;
}

function Lightbox({ images, index, onClose, onPrev, onNext, onGoTo }: LightboxProps) {
  const img = images[index];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      className="fixed inset-0 z-[500] bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium px-3 py-1 rounded-full bg-black/40">
        {index + 1} / {images.length}
        {img.isPrimary && <span className="ml-2 text-amber-400 text-[11px] font-semibold">★ Main</span>}
      </div>

      {/* Prev */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Image */}
      <img
        src={resolveUrl(img.imageUrl)}
        alt="Preview"
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Next */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((im, i) => (
            <button
              key={im.id}
              onClick={(e) => { e.stopPropagation(); onGoTo(i); }}
              className={`w-12 h-8 rounded overflow-hidden border-2 transition-all ${i === index ? "border-white scale-110" : "border-white/30 opacity-60 hover:opacity-90"}`}
            >
              <img src={resolveUrl(im.imageUrl)} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  packageGroupId: string;
  canEdit: boolean;
}

export function PackageGroupImageGallery({ packageGroupId, canEdit }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadSlot[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const { data: images = [], isLoading } = useQuery<GalleryImage[]>({
    queryKey: ["pkg-group-images", packageGroupId],
    queryFn: () => axios.get(`${BASE}/api/package-groups/${packageGroupId}/images`).then(r => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (imageId: string) =>
      axios.delete(`${BASE}/api/package-groups/${packageGroupId}/images/${imageId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pkg-group-images", packageGroupId] }); },
    onError: () => toast({ variant: "destructive", title: "Failed to delete image" }),
  });

  const setPrimaryMut = useMutation({
    mutationFn: (imageId: string) =>
      axios.put(`${BASE}/api/package-groups/${packageGroupId}/images/${imageId}/set-primary`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pkg-group-images", packageGroupId] });
      qc.invalidateQueries({ queryKey: ["package-group-detail", packageGroupId] });
      toast({ title: "Primary image updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to set primary" }),
  });

  const slotsAvailable = MAX_IMAGES - images.length;

  const uploadFile = useCallback(async (file: File, slotIndex: number) => {
    const updateSlot = (patch: Partial<UploadSlot>) =>
      setUploadQueue(q => q.map((s, i) => i === slotIndex ? { ...s, ...patch } : s));

    updateSlot({ status: "uploading", progress: 10 });
    try {
      const blob = await compressToBlob(file);
      updateSlot({ progress: 40 });

      const form = new FormData();
      form.append("file", blob, "image.jpg");

      const { data: storageRes } = await axios.post<{ objectPath: string }>(
        `${BASE}/api/storage/uploads/direct`,
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
          onUploadProgress: (e) => {
            if (e.total) updateSlot({ progress: 40 + Math.round((e.loaded / e.total) * 50) });
          },
        },
      );
      updateSlot({ progress: 95 });

      await axios.post(`${BASE}/api/package-groups/${packageGroupId}/images`, {
        imageUrl: storageRes.objectPath,
      });

      updateSlot({ status: "done", progress: 100 });
      qc.invalidateQueries({ queryKey: ["pkg-group-images", packageGroupId] });
      qc.invalidateQueries({ queryKey: ["package-group-detail", packageGroupId] });
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? "Upload failed";
      updateSlot({ status: "error", error: msg });
      toast({ variant: "destructive", title: msg });
    }
  }, [packageGroupId, qc, toast]);

  const processFiles = useCallback((files: FileList | File[]) => {
    const valid = Array.from(files).filter(f => f.type.startsWith("image/")).slice(0, slotsAvailable);
    if (!valid.length) return;
    if (Array.from(files).length > slotsAvailable) {
      toast({ title: `Only ${slotsAvailable} slot(s) available. First ${valid.length} image(s) will be uploaded.` });
    }

    const startIdx = uploadQueue.length;
    const newSlots: UploadSlot[] = valid.map(f => ({ file: f, status: "pending", progress: 0 }));
    setUploadQueue(q => [...q, ...newSlots]);

    valid.forEach((file, i) => uploadFile(file, startIdx + i));
  }, [slotsAvailable, uploadQueue.length, uploadFile, toast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = "";
  };

  const activeUploads = uploadQueue.filter(s => s.status === "uploading" || s.status === "pending");

  const openPreview = (index: number) => setPreviewIndex(index);
  const closePreview = () => setPreviewIndex(null);
  const prevImage = () => setPreviewIndex(i => i !== null ? (i - 1 + images.length) % images.length : null);
  const nextImage = () => setPreviewIndex(i => i !== null ? (i + 1) % images.length : null);

  return (
    <div className="space-y-4">

      {/* Lightbox */}
      {previewIndex !== null && images.length > 0 && (
        <Lightbox
          images={images}
          index={previewIndex}
          onClose={closePreview}
          onPrev={prevImage}
          onNext={nextImage}
          onGoTo={setPreviewIndex}
        />
      )}

      {/* Drop Zone */}
      {canEdit && slotsAvailable > 0 && (
        <div
          ref={dropRef}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all
            ${isDragging
              ? "border-(--e-orange) bg-(--e-orange)/5 scale-[1.01]"
              : "border-muted-foreground/25 hover:border-(--e-orange)/50 hover:bg-muted/40"
            }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isDragging ? "bg-(--e-orange)/15" : "bg-muted"}`}>
            <Upload className={`w-5 h-5 ${isDragging ? "text-(--e-orange)" : "text-muted-foreground"}`} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {isDragging ? "Drop images here" : "Drag & drop images or click to select"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              JPG · PNG · WebP · Max 10MB per image · {slotsAvailable} slot{slotsAvailable !== 1 ? "s" : ""} remaining
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={onFileInput}
          />
        </div>
      )}

      {/* Image Grid */}
      {isLoading ? (
        <div className="grid grid-cols-5 gap-2">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="aspect-[16/9] bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {/* Uploaded images */}
          {images.map((img, idx) => (
            <div
              key={img.id}
              className="relative group aspect-[16/9] rounded-lg overflow-hidden border border-border bg-muted cursor-zoom-in"
              onClick={() => openPreview(idx)}
            >
              <img
                src={resolveUrl(img.imageUrl)}
                alt="Program image"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />

              {/* Primary crown badge */}
              {img.isPrimary && (
                <div className="absolute top-1 left-1 bg-(--e-orange) text-white rounded-md px-1.5 py-0.5 flex items-center gap-0.5 text-[9px] font-bold shadow">
                  <Star className="w-2.5 h-2.5 fill-white" /> Main
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45 transition-all flex items-end justify-center pb-2 gap-1.5 opacity-0 group-hover:opacity-100">
                {/* Zoom hint (top-right) */}
                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <ZoomIn className="w-3 h-3 text-white" />
                </div>

                {canEdit && (
                  <>
                    {!img.isPrimary && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setPrimaryMut.mutate(img.id); }}
                        disabled={setPrimaryMut.isPending}
                        className="flex items-center gap-0.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-semibold px-2 py-1 rounded-md shadow transition-colors"
                        title="Set as main image"
                      >
                        <Star className="w-2.5 h-2.5" /> Main
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteMut.mutate(img.id); }}
                      disabled={deleteMut.isPending}
                      className="flex items-center gap-0.5 bg-red-500 hover:bg-red-600 text-white text-[10px] font-semibold px-2 py-1 rounded-md shadow transition-colors"
                      title="Delete image"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Uploading slots */}
          {activeUploads.map((slot, i) => (
            <div key={`upload-${i}`} className="relative aspect-[16/9] rounded-lg overflow-hidden border border-dashed border-(--e-orange)/50 bg-(--e-orange)/5 flex flex-col items-center justify-center gap-1">
              <Loader2 className="w-5 h-5 text-(--e-orange) animate-spin" />
              <span className="text-[10px] font-semibold text-(--e-orange)">{slot.progress}%</span>
              <div className="absolute bottom-1 left-1 right-1 h-1 bg-(--e-orange)/20 rounded-full overflow-hidden">
                <div className="h-full bg-(--e-orange) rounded-full transition-all duration-300" style={{ width: `${slot.progress}%` }} />
              </div>
            </div>
          ))}

          {/* Empty slots */}
          {canEdit && Array(Math.max(0, slotsAvailable - activeUploads.length)).fill(0).map((_, i) => (
            <div
              key={`empty-${i}`}
              onClick={() => fileInputRef.current?.click()}
              className="aspect-[16/9] rounded-lg border-2 border-dashed border-muted-foreground/15 flex items-center justify-center cursor-pointer hover:border-(--e-orange)/30 hover:bg-muted/30 transition-colors"
            >
              <ImagePlus className="w-4 h-4 text-muted-foreground/30" />
            </div>
          ))}
        </div>
      )}

      {/* Info row */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{images.length} / {MAX_IMAGES} images uploaded</span>
        {images.length > 0 && (
          <span className="text-(--e-orange) font-medium flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-(--e-orange)" />
            Click to preview · Hover to manage
          </span>
        )}
      </div>
    </div>
  );
}
