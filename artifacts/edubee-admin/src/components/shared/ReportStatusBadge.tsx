import { ReportSymbol } from "./ReportSymbol";

interface ReportStatusBadgeProps {
  status: "draft" | "published";
  className?: string;
}

const STATUS_CONFIG = {
  draft: {
    label: "Draft",
    bg: "#F4F3F1",
    color: "#57534E",
    symbol: "draft" as const,
  },
  published: {
    label: "Published",
    bg: "#DCFCE7",
    color: "#16A34A",
    symbol: "publish" as const,
  },
};

export function ReportStatusBadge({ status, className }: ReportStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1 ${className ?? ""}`}
      style={{
        background: cfg.bg,
        color: cfg.color,
        borderRadius: 999,
        padding: "3px 10px",
        fontSize: 12,
        fontWeight: 500,
        lineHeight: 1.5,
      }}
    >
      <ReportSymbol name={cfg.symbol} size={12} color={cfg.color} />
      {cfg.label}
    </span>
  );
}
