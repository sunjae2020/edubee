import path from "path";
import { Image } from "@react-pdf/renderer";

const LOGO_PATH = path.resolve(process.cwd(), "../../attached_assets/edubee_logo_800x310b_1774000040384.png");

interface EdubeePdfLogoProps {
  size?: "sm" | "md" | "lg";
}

export function EdubeePdfLogo({ size = "sm" }: EdubeePdfLogoProps) {
  const w = size === "lg" ? 180 : size === "md" ? 130 : 96;
  const h = Math.round(w / (800 / 310));
  return (
    <Image
      src={LOGO_PATH}
      style={{ width: w, height: h, objectFit: "contain" }}
    />
  );
}
