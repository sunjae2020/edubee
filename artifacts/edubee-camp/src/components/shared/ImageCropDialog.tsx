import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut } from "lucide-react";

const PREVIEW = 280;
const OUTPUT  = 256;

interface Props {
  file: File | null;
  onConfirm: (cropped: File) => void;
  onCancel:  () => void;
}

export function ImageCropDialog({ file, onConfirm, onCancel }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const imgRef     = useRef<HTMLImageElement | null>(null);
  const dragging   = useRef(false);
  const lastPos    = useRef({ x: 0, y: 0 });

  const [imgSrc, setImgSrc]   = useState<string | null>(null);
  const [zoom,   setZoom]     = useState(1);
  const [offset, setOffset]   = useState({ x: 0, y: 0 });
  const [minZoom, setMinZoom] = useState(1);

  // ── Load image whenever file changes ────────────────────────────────────
  useEffect(() => {
    if (!file) { setImgSrc(null); return; }
    const url = URL.createObjectURL(file);
    setImgSrc(url);

    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const min = PREVIEW / Math.min(img.naturalWidth, img.naturalHeight);
      setMinZoom(min);
      setZoom(min);
      setOffset({ x: 0, y: 0 });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // ── Render canvas preview ────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, PREVIEW, PREVIEW);

    const sw = img.naturalWidth  * zoom;
    const sh = img.naturalHeight * zoom;
    const x  = (PREVIEW - sw) / 2 + offset.x;
    const y  = (PREVIEW - sh) / 2 + offset.y;
    ctx.drawImage(img, x, y, sw, sh);
  }, [zoom, offset]);

  useEffect(() => { draw(); }, [draw]);

  // ── Drag handlers ────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    lastPos.current  = { x: e.clientX, y: e.clientY };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setOffset(prev => clampOffset(prev.x + dx, prev.y + dy, zoom));
  };
  const stopDrag = () => { dragging.current = false; };

  // Touch support
  const onTouchStart = (e: React.TouchEvent) => {
    dragging.current = true;
    lastPos.current  = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    const dx = e.touches[0].clientX - lastPos.current.x;
    const dy = e.touches[0].clientY - lastPos.current.y;
    lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setOffset(prev => clampOffset(prev.x + dx, prev.y + dy, zoom));
  };

  // Scroll to zoom
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(prev => {
      const next = Math.min(Math.max(prev - e.deltaY * 0.002, minZoom), minZoom + 3);
      return next;
    });
  };

  // ── Clamp offset so image can't leave the crop area completely ───────────
  function clampOffset(x: number, y: number, z: number) {
    const img = imgRef.current;
    if (!img) return { x, y };
    const sw = img.naturalWidth  * z;
    const sh = img.naturalHeight * z;
    const maxX = sw / 2;
    const maxY = sh / 2;
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  }

  // ── Zoom slider handler ──────────────────────────────────────────────────
  const onZoomSlider = ([v]: number[]) => {
    setZoom(v);
    setOffset(prev => clampOffset(prev.x, prev.y, v));
  };

  // ── Confirm: render at OUTPUT size and return as File ───────────────────
  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;

    const out = document.createElement("canvas");
    out.width  = OUTPUT;
    out.height = OUTPUT;
    const ctx  = out.getContext("2d")!;

    const scale = OUTPUT / PREVIEW;
    const sw = img.naturalWidth  * zoom * scale;
    const sh = img.naturalHeight * zoom * scale;
    const x  = (OUTPUT - sw) / 2 + offset.x * scale;
    const y  = (OUTPUT - sh) / 2 + offset.y * scale;
    ctx.drawImage(img, x, y, sw, sh);

    out.toBlob(blob => {
      if (!blob) return;
      onConfirm(new File([blob], "profile.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.88);
  };

  return (
    <Dialog open={!!file} onOpenChange={open => !open && onCancel()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-base">Crop Profile Photo</DialogTitle>
          <DialogDescription className="sr-only">Drag to reposition and use the slider to zoom the image before saving.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Circular preview canvas */}
          <div className="flex justify-center">
            <div className="relative" style={{ width: PREVIEW, height: PREVIEW }}>
              <canvas
                ref={canvasRef}
                width={PREVIEW}
                height={PREVIEW}
                className="border-2 border-[#F5821F]/40 cursor-grab active:cursor-grabbing select-none"
                style={{ borderRadius: "50%", display: "block", touchAction: "none" }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={stopDrag}
                onMouseLeave={stopDrag}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={stopDrag}
                onWheel={onWheel}
              />
            </div>
          </div>

          {/* Zoom slider */}
          <div className="flex items-center gap-3 px-1">
            <ZoomOut size={15} className="text-stone-400 shrink-0" />
            <Slider
              min={minZoom}
              max={minZoom + 3}
              step={0.01}
              value={[zoom]}
              onValueChange={onZoomSlider}
              className="flex-1"
            />
            <ZoomIn size={15} className="text-stone-400 shrink-0" />
          </div>

          <p className="text-[11px] text-center text-stone-400">
            Drag to reposition · Scroll or use slider to zoom
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={handleConfirm}
            className="bg-[#F5821F] hover:bg-[#E06A10] text-white">
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
