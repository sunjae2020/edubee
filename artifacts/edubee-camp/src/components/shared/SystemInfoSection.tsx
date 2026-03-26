import { DetailSection } from "./DetailPageLayout";

interface SystemInfoSectionProps {
  owner?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export function SystemInfoSection({ owner, createdAt, updatedAt }: SystemInfoSectionProps) {
  const fmt = (val?: string | null) => {
    if (!val) return "—";
    try { return new Date(val).toLocaleString(); } catch { return val; }
  };

  return (
    <DetailSection title="System">
      <div className="space-y-4">
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1.5">
            Owner <span className="text-red-500">*</span>
          </div>
          <div className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-muted/30 font-mono">
            {owner ?? "—"}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 pt-1">
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Created On</div>
            <div className="text-sm text-foreground">{fmt(createdAt)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Modified On</div>
            <div className="text-sm text-foreground">{fmt(updatedAt)}</div>
          </div>
        </div>
      </div>
    </DetailSection>
  );
}
