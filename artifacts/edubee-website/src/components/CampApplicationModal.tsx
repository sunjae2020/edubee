import { useEffect, useRef, useState } from "react";
import { X, Loader2 } from "lucide-react";

interface CampApplicationModalProps {
  slug: string;
  queryString?: string;
  onClose: () => void;
}

export function CampApplicationModal({ slug, queryString = "", onClose }: CampApplicationModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const campUrl = `/camp/${slug}${queryString}`;

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal panel */}
      <div className="relative flex flex-col flex-1 m-4 md:m-8 lg:m-12 rounded-2xl overflow-hidden bg-white shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close application form"
          className="absolute top-3 right-3 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-white/90 shadow-md hover:bg-neutral-100 transition-colors"
        >
          <X className="w-5 h-5 text-neutral-600" />
        </button>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 gap-4">
            <Loader2 className="w-10 h-10 text-[#F5821F] animate-spin" />
            <p className="text-sm text-neutral-500">Loading application form…</p>
          </div>
        )}

        {/* iframe */}
        <iframe
          ref={iframeRef}
          src={campUrl}
          className="flex-1 w-full border-none"
          title="Camp Application Form"
          onLoad={() => setLoading(false)}
          allow="clipboard-write"
        />
      </div>
    </div>
  );
}
