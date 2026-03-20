import { ReportSymbol, SymbolName } from "./ReportSymbol";

interface SectionHeaderProps {
  symbol: SymbolName;
  number: string;
  title: string;
  variant?: "editor" | "viewer" | "pdf";
  className?: string;
}

export function SectionHeader({
  symbol,
  number,
  title,
  variant = "viewer",
  className,
}: SectionHeaderProps) {
  const isEditor = variant === "editor";

  return (
    <div
      className={`flex items-center gap-2 ${className ?? ""}`}
      style={{
        background: isEditor ? "transparent" : "#FEF0E3",
        borderLeft: "4px solid #F5821F",
        padding: isEditor ? "8px 12px" : "12px 16px",
        borderRadius: "0 8px 8px 0",
      }}
    >
      <ReportSymbol name={symbol} size={isEditor ? 16 : 20} color="#F5821F" />
      <span
        style={{
          fontSize: isEditor ? 10 : 11,
          fontWeight: 500,
          color: "#F5821F",
          letterSpacing: "0.1em",
          flexShrink: 0,
        }}
      >
        {number}
      </span>
      <span
        style={{
          fontSize: isEditor ? 13 : 14,
          fontWeight: 700,
          color: "#1C1917",
          textTransform: "uppercase" as const,
          letterSpacing: "0.02em",
        }}
      >
        {title}
      </span>
    </div>
  );
}
