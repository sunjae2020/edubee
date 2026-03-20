type Variant = "full" | "icon" | "white";
type Size = "sm" | "md" | "lg";

const SIZE_MAP: Record<Size, { icon: number; text: number; sub: number }> = {
  sm: { icon: 24, text: 14, sub: 8 },
  md: { icon: 32, text: 18, sub: 11 },
  lg: { icon: 48, text: 24, sub: 14 },
};

interface BeeIconProps {
  size: number;
  white?: boolean;
}

function BeeIcon({ size, white }: BeeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Left wing */}
      <ellipse
        cx="10" cy="17" rx="7.5" ry="10.5"
        fill={white ? "rgba(255,255,255,0.18)" : "#FEF0E3"}
        stroke={white ? "rgba(255,255,255,0.7)" : "#F5821F"}
        strokeWidth="1"
      />
      {/* Right wing */}
      <ellipse
        cx="30" cy="17" rx="7.5" ry="10.5"
        fill={white ? "rgba(255,255,255,0.18)" : "#FEF0E3"}
        stroke={white ? "rgba(255,255,255,0.7)" : "#F5821F"}
        strokeWidth="1"
      />
      {/* Body */}
      <ellipse
        cx="20" cy="25" rx="9" ry="12"
        fill={white ? "#FFFFFF" : "#F5821F"}
      />
      {/* Stripe 1 */}
      <path
        d="M 12,22 Q 20,20 28,22"
        stroke={white ? "#F5821F" : "#FFFFFF"}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Stripe 2 */}
      <path
        d="M 12,27 Q 20,25 28,27"
        stroke={white ? "#F5821F" : "#FFFFFF"}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Left antenna */}
      <path
        d="M 16,13 Q 13,8 11,4"
        stroke={white ? "rgba(255,255,255,0.8)" : "#D96A0A"}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="11" cy="4" r="1.5" fill={white ? "rgba(255,255,255,0.8)" : "#D96A0A"} />
      {/* Right antenna */}
      <path
        d="M 24,13 Q 27,8 29,4"
        stroke={white ? "rgba(255,255,255,0.8)" : "#D96A0A"}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="29" cy="4" r="1.5" fill={white ? "rgba(255,255,255,0.8)" : "#D96A0A"} />
    </svg>
  );
}

interface EdubeLogoProps {
  variant?: Variant;
  size?: Size;
  className?: string;
}

export function EdubeeLogo({ variant = "full", size = "md", className }: EdubeLogoProps) {
  const s = SIZE_MAP[size];
  const isWhite = variant === "white";
  const textColor = isWhite ? "#FFFFFF" : "#1C1917";

  if (variant === "icon") {
    return (
      <span className={className}>
        <BeeIcon size={s.icon} />
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <BeeIcon size={s.icon} white={isWhite} />
      <div className="flex flex-col leading-none select-none">
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: s.text,
            fontWeight: 700,
            color: textColor,
            lineHeight: 1,
            letterSpacing: "-0.01em",
          }}
        >
          edubee
        </span>
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: s.sub,
            fontWeight: 500,
            color: "#F5821F",
            letterSpacing: "0.15em",
            lineHeight: 1.3,
            marginTop: 2,
          }}
        >
          CAMP
        </span>
      </div>
    </div>
  );
}
