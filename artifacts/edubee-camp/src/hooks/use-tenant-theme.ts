import { useEffect, useState, useCallback, createContext, useContext } from "react";
import axios from "axios";

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

const DEFAULT_THEME: TenantTheme = {
  organisationId: null,
  companyName:    "Edubee CRM",
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
 * 테넌트 테마를 로드하고 CSS 변수로 document에 주입
 * App.tsx 내부 컴포넌트에서 1회 호출.
 * 임프로소네이션 변경 시 "edubee:impersonation-changed" 이벤트를 들어 자동 재로드.
 */
export function useTenantTheme() {
  const [theme, setTheme] = useState<TenantTheme>(DEFAULT_THEME);
  const [isLoading, setIsLoading] = useState(true);

  const loadTheme = useCallback(async () => {
    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
      // axios 사용 → X-Organisation-Id 헤더가 인터셉터에 의해 자동 첨부됨
      const { data } = await axios.get<TenantTheme>(`${BASE}/api/settings/theme`);
      setTheme(data);
      applyThemeToDom(data);
    } catch (err) {
      console.warn("[useTenantTheme] 기본 테마 사용:", err);
      applyThemeToDom(DEFAULT_THEME);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTheme();
    // 임프로소네이션 변경 시 테마 재로드
    window.addEventListener("edubee:impersonation-changed", loadTheme);
    return () => window.removeEventListener("edubee:impersonation-changed", loadTheme);
  }, [loadTheme]);

  return { theme, isLoading };
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
    document.title = `${theme.companyName} — CRM`;
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
