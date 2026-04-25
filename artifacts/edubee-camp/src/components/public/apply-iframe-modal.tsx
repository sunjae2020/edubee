import { useEffect } from "react";
import { X, ExternalLink } from "lucide-react";

const ADMIN_BASE = "https://app.edubee.co";

type Props = {
  open: boolean;
  onClose: () => void;
  packageGroupId?: string;
};

export function ApplyIframeModal({ open, onClose, packageGroupId }: Props) {
  // Build iframe URL — pass packageGroupId as query param if available
  const iframeUrl = packageGroupId
    ? `${ADMIN_BASE}/admin/camp-applications/new?packageGroupId=${packageGroupId}`
    : `${ADMIN_BASE}/admin/camp-applications/new`;

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative flex flex-col bg-white rounded-2xl shadow-2xl w-full max-w-5xl"
        style={{ height: "92vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0 rounded-t-2xl bg-white">
          <div className="flex items-center gap-3">
            <span className="font-bold text-base text-foreground">Camp Application</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={iframeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in new tab
            </a>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* iframe */}
        <iframe
          src={iframeUrl}
          title="Camp Application Form"
          className="flex-1 w-full rounded-b-2xl border-0"
          allow="clipboard-write"
        />
      </div>
    </div>
  );
}
