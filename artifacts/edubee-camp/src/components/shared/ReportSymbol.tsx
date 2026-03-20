export type SymbolName =
  | "student" | "pickup" | "accommodation" | "academic"
  | "tour" | "summary" | "custom" | "report" | "pdf"
  | "publish" | "sync" | "edit" | "draft" | "coordinator" | "camp";

interface ReportSymbolProps {
  name: SymbolName;
  size?: number;
  color?: string;
  className?: string;
}

const STROKE_PROPS = {
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 1.5,
  fill: "none" as const,
};

const SYMBOLS: Record<SymbolName, (color: string) => React.ReactNode> = {
  student: (c) => (
    <>
      <circle cx="12" cy="7" r="4" stroke={c} {...STROKE_PROPS} />
      <path d="M 4,21 Q 4,15 12,15 Q 20,15 20,21" stroke={c} {...STROKE_PROPS} />
      <rect x="7" y="3" width="10" height="3" rx="0.5" stroke={c} {...STROKE_PROPS} />
      <path d="M 7,3 L 12,1 L 17,3" stroke={c} {...STROKE_PROPS} />
      <line x1="17" y1="3" x2="17" y2="6" stroke={c} {...STROKE_PROPS} />
      <circle cx="17" cy="6.5" r="0.8" fill={c} />
    </>
  ),

  pickup: (c) => (
    <>
      <rect x="2" y="9" width="17" height="9" rx="1.5" stroke={c} {...STROKE_PROPS} />
      <path d="M 19,13 L 22,13 L 22,18 L 19,18" stroke={c} {...STROKE_PROPS} />
      <path d="M 13,9 L 16,5 L 22,5 L 22,9" stroke={c} {...STROKE_PROPS} />
      <circle cx="6" cy="18" r="2.5" stroke={c} {...STROKE_PROPS} />
      <circle cx="15" cy="18" r="2.5" stroke={c} {...STROKE_PROPS} />
      <line x1="5" y1="13" x2="11" y2="13" stroke={c} {...STROKE_PROPS} />
    </>
  ),

  accommodation: (c) => (
    <>
      <rect x="3" y="11" width="18" height="11" rx="1" stroke={c} {...STROKE_PROPS} />
      <path d="M 2,11 L 12,3 L 22,11" stroke={c} {...STROKE_PROPS} />
      <path d="M 10,22 L 10,16 Q 10,14 12,14 Q 14,14 14,16 L 14,22" stroke={c} {...STROKE_PROPS} />
      <rect x="5" y="14" width="3" height="3" rx="0.5" stroke={c} {...STROKE_PROPS} />
      <rect x="16" y="14" width="3" height="3" rx="0.5" stroke={c} {...STROKE_PROPS} />
    </>
  ),

  academic: (c) => (
    <>
      <path d="M 4,5 L 4,19 Q 4,21 6,21 L 12,21" stroke={c} {...STROKE_PROPS} />
      <path d="M 12,3 L 12,21" stroke={c} {...STROKE_PROPS} />
      <path d="M 12,3 L 20,5 L 20,19 Q 20,21 18,21 L 12,21" stroke={c} {...STROKE_PROPS} />
      <path d="M 4,3 L 12,5" stroke={c} {...STROKE_PROPS} />
      <path d="M 17,3 L 19,3 L 19,9 L 17,8 Z" stroke={c} {...STROKE_PROPS} fill={c} fillOpacity={0.2} />
    </>
  ),

  tour: (c) => (
    <>
      <path d="M 3,5 L 3,19 L 10,16 L 14,19 L 21,16 L 21,5 L 14,8 L 10,5 Z" stroke={c} {...STROKE_PROPS} />
      <circle cx="12" cy="11" r="3" stroke={c} {...STROKE_PROPS} />
      <path d="M 12,8 L 12,5" stroke={c} {...STROKE_PROPS} />
      <circle cx="12" cy="11" r="1" fill={c} />
    </>
  ),

  summary: (c) => (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" stroke={c} {...STROKE_PROPS} />
      <path d="M 9,4 L 9,2 L 15,2 L 15,4" stroke={c} {...STROKE_PROPS} />
      <line x1="8" y1="9" x2="16" y2="9" stroke={c} {...STROKE_PROPS} />
      <line x1="8" y1="13" x2="14" y2="13" stroke={c} {...STROKE_PROPS} />
      <path d="M 11,17 L 13,19 L 17,15" stroke={c} {...STROKE_PROPS} />
    </>
  ),

  custom: (c) => (
    <>
      <path d="M 16,3 L 21,8 L 9,20 L 4,20 L 4,15 Z" stroke={c} {...STROKE_PROPS} />
      <line x1="13" y1="6" x2="18" y2="11" stroke={c} {...STROKE_PROPS} />
      <rect x="19" y="2" width="3" height="4" rx="0.5" stroke={c} {...STROKE_PROPS} />
      <line x1="2" y1="20" x2="8" y2="20" stroke={c} {...STROKE_PROPS} strokeWidth={1} />
    </>
  ),

  report: (c) => (
    <>
      <path d="M 5,3 L 17,3 L 19,5 L 19,21 L 5,21 Z" stroke={c} {...STROKE_PROPS} />
      <path d="M 17,3 L 17,5 L 19,5" stroke={c} {...STROKE_PROPS} />
      <line x1="8" y1="8" x2="16" y2="8" stroke={c} {...STROKE_PROPS} />
      <line x1="8" y1="11" x2="16" y2="11" stroke={c} {...STROKE_PROPS} />
      <rect x="8" y="14" width="2" height="4" rx="0.5" stroke={c} {...STROKE_PROPS} />
      <rect x="11" y="16" width="2" height="2" rx="0.5" stroke={c} {...STROKE_PROPS} />
      <rect x="14" y="15" width="2" height="3" rx="0.5" stroke={c} {...STROKE_PROPS} />
    </>
  ),

  pdf: (c) => (
    <>
      <path d="M 5,3 L 17,3 L 19,5 L 19,14 L 5,14 Z" stroke={c} {...STROKE_PROPS} />
      <path d="M 17,3 L 17,5 L 19,5" stroke={c} {...STROKE_PROPS} />
      <line x1="8" y1="7" x2="10" y2="7" stroke={c} {...STROKE_PROPS} />
      <line x1="8" y1="10" x2="16" y2="10" stroke={c} {...STROKE_PROPS} />
      <path d="M 12,16 L 12,22" stroke={c} {...STROKE_PROPS} />
      <path d="M 8,20 L 12,22 L 16,20" stroke={c} {...STROKE_PROPS} />
    </>
  ),

  publish: (c) => (
    <>
      <path d="M 20,4 L 3,12 L 10,15 L 20,4 Z" stroke={c} {...STROKE_PROPS} />
      <path d="M 20,4 L 13,21 L 10,15 L 20,4 Z" stroke={c} {...STROKE_PROPS} />
      <line x1="10" y1="15" x2="15" y2="10" stroke={c} {...STROKE_PROPS} strokeDasharray="2 2" />
    </>
  ),

  sync: (c) => (
    <>
      <path d="M 20,12 A 8,8 0 0 0 8,5" stroke={c} {...STROKE_PROPS} />
      <path d="M 8,5 L 5,5 L 5,8" stroke={c} {...STROKE_PROPS} />
      <path d="M 4,12 A 8,8 0 0 0 16,19" stroke={c} {...STROKE_PROPS} />
      <path d="M 16,19 L 19,19 L 19,16" stroke={c} {...STROKE_PROPS} />
    </>
  ),

  edit: (c) => (
    <>
      <rect x="3" y="5" width="12" height="14" rx="1.5" stroke={c} {...STROKE_PROPS} />
      <path d="M 15,7 L 20,12 L 13,19 L 8,19 L 8,14 Z" stroke={c} {...STROKE_PROPS} />
      <line x1="15" y1="9" x2="18" y2="12" stroke={c} {...STROKE_PROPS} />
    </>
  ),

  draft: (c) => (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2"
        stroke={c} strokeWidth={1.5} fill="none"
        strokeDasharray="3 2"
      />
      <line x1="7" y1="9" x2="17" y2="9" stroke={c} {...STROKE_PROPS} />
      <line x1="7" y1="13" x2="14" y2="13" stroke={c} {...STROKE_PROPS} />
      <line x1="7" y1="17" x2="11" y2="17" stroke={c} {...STROKE_PROPS} />
      <path d="M 16,3 L 16,5 L 18,3 Z" fill={c} />
    </>
  ),

  coordinator: (c) => (
    <>
      <circle cx="10" cy="7" r="4" stroke={c} {...STROKE_PROPS} />
      <path d="M 2,21 Q 2,15 10,15 Q 15,15 17,18" stroke={c} {...STROKE_PROPS} />
      <rect x="15" y="14" width="7" height="5" rx="1" stroke={c} {...STROKE_PROPS} />
      <path d="M 17,14 L 17,12 L 21,12 L 21,14" stroke={c} {...STROKE_PROPS} />
      <line x1="15" y1="17" x2="22" y2="17" stroke={c} {...STROKE_PROPS} />
    </>
  ),

  camp: (c) => (
    <>
      <path d="M 5,20 L 12,5 L 19,20 Z" stroke={c} {...STROKE_PROPS} />
      <path d="M 2,20 L 12,8 L 22,20" stroke={c} {...STROKE_PROPS} />
      <line x1="12" y1="5" x2="12" y2="2" stroke={c} {...STROKE_PROPS} />
      <path d="M 12,2 L 15,3 L 12,4" fill={c} />
      <line x1="2" y1="20" x2="22" y2="20" stroke={c} {...STROKE_PROPS} />
    </>
  ),
};

export function ReportSymbol({
  name,
  size = 24,
  color = "currentColor",
  className,
}: ReportSymbolProps) {
  const render = SYMBOLS[name];
  if (!render) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {render(color)}
    </svg>
  );
}
