import eSymbol from "@assets/edubee_logo_200x200_1773993120966.png";
import beeImg from "@assets/image_1773993095679.png";

type Variant = "full" | "icon" | "white";
type Size = "sm" | "md" | "lg";

const SIZE_MAP: Record<Size, { icon: number; text: number; sub: number }> = {
  sm: { icon: 24, text: 14, sub: 8 },
  md: { icon: 32, text: 18, sub: 11 },
  lg: { icon: 48, text: 24, sub: 14 },
};

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
      <img
        src={eSymbol}
        alt="Edubee"
        width={s.icon}
        height={s.icon}
        style={{ objectFit: "contain", display: "block" }}
        className={className}
      />
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <img
        src={beeImg}
        alt="Edubee bee"
        width={s.icon}
        height={s.icon}
        style={{ objectFit: "contain", display: "block" }}
      />
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
            color: isWhite ? "rgba(255,255,255,0.8)" : "var(--e-orange)",
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
