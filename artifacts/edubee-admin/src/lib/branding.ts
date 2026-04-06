const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export async function fetchLogoSrc(): Promise<string> {
  try {
    const res = await fetch(`${BASE}/api/settings/branding`, { credentials: "include" });
    if (!res.ok) return "";
    const data = await res.json();
    const logoPath: string = data?.logoPath ?? "";
    if (logoPath.startsWith("data:") || logoPath.startsWith("/objects/")) return logoPath;
    return "";
  } catch {
    return "";
  }
}

export function logoImgHtml(src: string, height = 48): string {
  if (!src) return "";
  return `<img src="${src}" style="height:${height}px;max-width:200px;object-fit:contain;display:block;" alt="Logo" />`;
}
