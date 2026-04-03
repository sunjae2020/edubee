import { useState } from "react";
import { Copy, Check, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { DetailSection } from "./DetailPageLayout";
import { formatDateTime, formatDate } from "@/lib/date-format";

interface SystemInfoSectionProps {
  id?: string | null;
  recordIdLabel?: string;
  owner?: string | null;
  ownerName?: string | null;
  ownerLabel?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  isActive?: boolean | null;
  onToggleActive?: () => void | Promise<void>;
  isToggling?: boolean;
  title?: string;
  statusLabel?: string;
  dateOnly?: boolean;
}

export function SystemInfoSection({
  id,
  recordIdLabel = "Record ID",
  owner,
  ownerName,
  ownerLabel = "Owner",
  createdAt,
  updatedAt,
  isActive,
  onToggleActive,
  isToggling = false,
  title = "Admin Info",
  statusLabel,
  dateOnly = false,
}: SystemInfoSectionProps) {
  const fmt = (val?: string | null) => dateOnly ? formatDate(val) : formatDateTime(val);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!id) return;
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const displayOwner = ownerName ?? (owner ? `${owner.slice(0, 8)}…` : null);
  const hasToggle = isActive !== null && isActive !== undefined && onToggleActive;
  const hasOwner = ownerName !== undefined || owner !== undefined;

  return (
    <DetailSection title={title}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Created On</div>
            <div className="text-sm text-foreground">{fmt(createdAt)}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Modified On</div>
            <div className="text-sm text-foreground">{fmt(updatedAt)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {hasToggle ? (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                {statusLabel ?? "Status"}
              </div>
              <button
                type="button"
                onClick={onToggleActive}
                disabled={isToggling}
                className="flex items-center gap-2 group focus:outline-none"
                title={isActive ? "Click to deactivate" : "Click to activate"}
              >
                {isToggling ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : isActive ? (
                  <ToggleRight className="w-5 h-5 text-[#16A34A]" />
                ) : (
                  <ToggleLeft className="w-5 h-5 text-[#9CA3AF]" />
                )}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                  ${isActive
                    ? "bg-[#DCFCE7] text-[#16A34A]"
                    : "bg-[#F4F3F1] text-[#57534E]"
                  }`}>
                  {isActive ? "Active" : "Inactive"}
                </span>
              </button>
            </div>
          ) : isActive !== null && isActive !== undefined ? (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                {statusLabel ?? "Status"}
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                ${isActive
                  ? "bg-[#DCFCE7] text-[#16A34A]"
                  : "bg-[#F4F3F1] text-[#57534E]"
                }`}>
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>
          ) : null}

          {id && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">{recordIdLabel}</div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-mono truncate text-muted-foreground">{id}</p>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 hover:text-[#F5821F] transition-colors text-muted-foreground"
                  title="Copy ID"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {hasOwner && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1.5">
              {ownerLabel}
            </div>
            <div className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-muted/30">
              {displayOwner ?? "—"}
            </div>
          </div>
        )}
      </div>
    </DetailSection>
  );
}
