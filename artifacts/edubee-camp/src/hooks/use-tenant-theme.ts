import { useEffect, useState, createContext, useContext } from "react";

export interface TenantTheme {
  organisationId: string | null;
  companyName:    string;
  logoUrl:        string | null;
  faviconUrl:     string | null;
  primaryColor:   string;
  secondaryColor: string;
  accentColor:    string;
  customCss:      string | null;
  subdomain:      string | null;
  planType:       string;
  features:       Record<string, boolean>;
}

// camp.edubee.co 는 멀티 테넌트와 무관 — 고정 Edubee 브랜딩 사용
const DEFAULT_THEME: TenantTheme = {
  organisationId: null,
  companyName:    "Edubee",
  logoUrl:        null,
  faviconUrl:     null,
  primaryColor:   "#F5821F",
  secondaryColor: "#1C1917",
  accentColor:    "#FEF0E3",
  customCss:      null,
  subdomain:      null,
  planType:       "starter",
  features:       {},
};

/**
 * camp.edubee.co 전용 테마 훅 — API 호출 없이 고정 Edubee 브랜딩 적용
 * 멀티 테넌트는 crm.edubee.co 에서만 동작
 */
export function useTenantTheme() {
  const [theme] = useState<TenantTheme>(DEFAULT_THEME);

  useEffect(() => {
    applyThemeToDom(DEFAULT_THEME);
  }, []);

  return { theme, isLoading: false };
}

// ── 테넌트 테마 Context (사이드바/헤더 등에서 logoUrl 접근용) ──────────────

export const TenantThemeContext = createContext<TenantTheme>(DEFAULT_THEME);

export function useTenantThemeCtx(): TenantTheme {
  return useContext(TenantThemeContext);
}

/**
 * 테마를 CSS 변수로 document.documentElement에 주입
 * 모든 CSS 에서 var(--color-primary) 로 사용 가능
 * branding.tsx 저장 후 즉시 반영을 위해 export
 */
export function applyThemeToDom(theme: TenantTheme): void {
  const root = document.documentElement;

  // ── 색상 변수 ──────────────────────────────────────
  root.style.setProperty("--color-primary",       theme.primaryColor);
  root.style.setProperty("--color-primary-dark",  darken(theme.primaryColor, 15));
  root.style.setProperty("--color-primary-light", lighten(theme.primaryColor, 90));
  root.style.setProperty("--color-secondary",     theme.secondaryColor);
  root.style.setProperty("--color-accent",        theme.accentColor);

  // ── e-orange 계열: 사이드바/UI에서 실제로 사용하는 변수 ──
  const p  = theme.primaryColor;
  const dk = darken(p, 15);
  const dk2 = darken(p, 28);
  const lt = lighten(p, 90);
  const lt2 = lighten(p, 83);
  const lt3 = lighten(p, 70);
  const lt4 = lighten(p, 45);
  const rgb = hexToRgb(p);
  // 단일 primary 변수
  root.style.setProperty("--e-orange",      p);
  root.style.setProperty("--e-orange-dk",   dk);
  root.style.setProperty("--e-orange-lt",   lt);
  root.style.setProperty("--e-orange-ring", rgb ? `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.15)` : lt);
  root.style.setProperty("--e-bg-hover",    lt);
  // 그라데이션 팔레트 (Tailwind orange-* 매핑용)
  root.style.setProperty("--e-orange-50",   lt);      // 매우 연한 배경
  root.style.setProperty("--e-orange-100",  lt2);     // 연한 배경
  root.style.setProperty("--e-orange-200",  lt3);     // 테두리/outline
  root.style.setProperty("--e-orange-300",  lt4);     // 호버 테두리
  root.style.setProperty("--e-orange-400",  darken(p, 5));  // 연한 주색
  root.style.setProperty("--e-orange-500",  p);       // 주색
  root.style.setProperty("--e-orange-600",  dk);      // 어두운 주색
  root.style.setProperty("--e-orange-700",  dk2);     // 매우 어두운
  // 버튼 호버/액티브 상태
  root.style.setProperty("--e-orange-hover",  dk);   // hover:bg
  root.style.setProperty("--e-orange-active", dk2);  // active:bg
  // 그림자 rgba 변수 (투명도별)
  const r2 = rgb ? `rgba(${rgb[0]},${rgb[1]},${rgb[2]}` : `rgba(245,130,31`;
  root.style.setProperty("--e-orange-shadow-08",  `${r2},0.08)`);
  root.style.setProperty("--e-orange-shadow-10",  `${r2},0.10)`);
  root.style.setProperty("--e-orange-shadow-12",  `${r2},0.12)`);
  root.style.setProperty("--e-orange-shadow-25",  `${r2},0.25)`);
  root.style.setProperty("--e-orange-shadow-40",  `${r2},0.40)`);
  // border/overlay 알파 변수
  root.style.setProperty("--e-orange-a13", `${r2},0.13)`);
  root.style.setProperty("--e-orange-a20", `${r2},0.20)`);
  root.style.setProperty("--e-orange-a40", `${r2},0.40)`);

  // ── 파비콘 동적 교체 ──────────────────────────────
  if (theme.faviconUrl) {
    const link =
      (document.querySelector("link[rel~='icon']") as HTMLLinkElement) ??
      (() => {
        const el = document.createElement("link");
        el.rel = "icon";
        document.head.appendChild(el);
        return el;
      })();
    link.href = theme.faviconUrl;
  }

  // ── 페이지 타이틀 업데이트 ───────────────────────
  if (theme.companyName) {
    document.title = `${theme.companyName} — CAMP`;
  }

  // ── 커스텀 CSS 주입 ──────────────────────────────
  if (theme.customCss) {
    const existing = document.getElementById("tenant-custom-css");
    if (existing) {
      existing.textContent = theme.customCss;
    } else {
      const style = document.createElement("style");
      style.id = "tenant-custom-css";
      style.textContent = theme.customCss;
      document.head.appendChild(style);
    }
  }
}

// ── 색상 유틸 ────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function darken(hex: string, percentage: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const factor = 1 - percentage / 100;
  return rgbToHex(
    Math.round(rgb[0] * factor),
    Math.round(rgb[1] * factor),
    Math.round(rgb[2] * factor),
  );
}

function lighten(hex: string, percentage: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const factor = percentage / 100;
  return rgbToHex(
    Math.round(rgb[0] + (255 - rgb[0]) * factor),
    Math.round(rgb[1] + (255 - rgb[1]) * factor),
    Math.round(rgb[2] + (255 - rgb[2]) * factor),
  );
}
