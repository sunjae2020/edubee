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
  accentColor:    "#fef0e3",
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
  const inflight = { current: false };

  const loadTheme = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      // ?org=<subdomain> 쿼리 파라미터 지원 (개발 모드 테넌트 미리보기용)
      const urlParams = new URLSearchParams(window.location.search);
      const previewOrg = urlParams.get("org");

      // 공개 페이지(register, login 등)는 Edubee 기본 테마를 항상 표시.
      // axios 인터셉터가 이전 세션의 X-Organisation-Id 헤더를 붙여서
      // 다른 테넌트 테마가 bleeding되는 버그를 차단.
      const publicPaths = ["/register", "/login", "/forgot-password", "/reset-password", "/accept-invite"];
      const isPublicPage = publicPaths.some((p) => window.location.pathname.endsWith(p));

      if (isPublicPage && !previewOrg) {
        setTheme(DEFAULT_THEME);
        applyThemeToDom(DEFAULT_THEME);
        setIsLoading(false);
        inflight.current = false;
        return;
      }

      const themeUrl = previewOrg
        ? `/api/settings/theme?subdomain=${encodeURIComponent(previewOrg)}`
        : `/api/settings/theme`;

      // axios 사용 — 인터셉터가 X-Organisation-Id + Authorization 헤더를 자동으로 추가.
      // 서브도메인이 없는 개발 환경에서도 JWT org 기반으로 올바른 테넌트 테마를 불러옴.
      const { data } = await axios.get<TenantTheme>(themeUrl);
      setTheme(data);
      applyThemeToDom(data);
    } catch (err) {
      console.warn("[useTenantTheme] 기본 테마 사용:", err);
      applyThemeToDom(DEFAULT_THEME);
    } finally {
      setIsLoading(false);
      inflight.current = false;
    }
  }, []);

  useEffect(() => {
    loadTheme();

    // 임프로소네이션 변경 시 테마 재로드
    window.addEventListener("edubee:impersonation-changed", loadTheme);
    // 플랜 변경 시 테마 재로드 (슈퍼어드민에서 planType 업데이트 후)
    window.addEventListener("edubee:plan-changed", loadTheme);

    // 탭 포커스 복귀 시 테마 재로드 — 중복 요청은 inflight 플래그로 차단
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadTheme();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("edubee:impersonation-changed", loadTheme);
      window.removeEventListener("edubee:plan-changed", loadTheme);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
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
