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

export const DEFAULT_THEME: TenantTheme = {
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

// ─────────────────────────────────────────────────────────────────────────────
// 서브도메인 감지
// ts.edubee.co → "ts", edubee.co / localhost → null
// ─────────────────────────────────────────────────────────────────────────────
const NON_TENANT_SUBDOMAINS = new Set(["www", "app", "admin", "api", "mail"]);

function getSubdomain(): string | null {
  const parts = window.location.hostname.split(".");
  if (parts.length >= 3) {
    const sub = parts[0].toLowerCase();
    if (!NON_TENANT_SUBDOMAINS.has(sub)) return sub;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// localStorage 캐시 (서브도메인 기준 분리)
// 키 예시: edubee_theme_ts, edubee_theme_myagency, edubee_theme_default
// ─────────────────────────────────────────────────────────────────────────────
function themeCacheKey(sub: string | null, previewOrg: string | null): string {
  return `edubee_theme_${previewOrg ?? sub ?? "default"}`;
}

function readCache(key: string): TenantTheme | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as TenantTheme) : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, theme: TenantTheme): void {
  try {
    localStorage.setItem(key, JSON.stringify(theme));
  } catch {/* 스토리지 가득 찬 경우 무시 */}
}

/**
 * 테넌트 테마를 로드하고 CSS 변수로 document에 주입.
 *
 * ── 동작 순서 ──
 * ① 캐시(localStorage)에서 즉시 테마 적용 → FOUC(깜빡임) 제거
 * ② API 호출:
 *    - 서브도메인 있음(ts.edubee.co) → 공개 페이지 포함 항상 API 호출
 *    - 서브도메인 없음 + 공개 페이지 → API 생략, Edubee 기본 테마 사용
 * ③ API 응답이 캐시와 다르면 DOM 업데이트 + 캐시 갱신
 *
 * App.tsx 내부 Router 컴포넌트에서 1회 호출.
 */
export function useTenantTheme() {
  const [theme, setTheme] = useState<TenantTheme>(DEFAULT_THEME);
  const [isLoading, setIsLoading] = useState(true);
  const inflight = { current: false };

  const loadTheme = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;

    try {
      const urlParams   = new URLSearchParams(window.location.search);
      const previewOrg  = urlParams.get("org");
      const subdomain   = getSubdomain();
      const cacheKey    = themeCacheKey(subdomain, previewOrg);

      // ① 공개 페이지 판별 — 캐시 읽기보다 먼저 처리
      //    - 서브도메인 있으면 공개 페이지도 테넌트 브랜딩 표시 (ts.edubee.co/login)
      //    - 서브도메인 없고 공개 페이지면 API 생략, 기본 테마 강제 적용
      const publicPaths = ["/register", "/login", "/forgot-password", "/reset-password", "/accept-invite"];
      const isPublicPage = publicPaths.some(p => window.location.pathname.endsWith(p));

      if (isPublicPage && !subdomain && !previewOrg) {
        setTheme(DEFAULT_THEME);
        applyThemeToDom(DEFAULT_THEME);
        setIsLoading(false);
        inflight.current = false;
        return;
      }

      // ② 캐시 즉시 적용 → 깜빡임 방지 (테넌트 컨텍스트 있을 때만)
      const cached = readCache(cacheKey);
      if (cached) {
        setTheme(cached);
        applyThemeToDom(cached);
      } else {
        applyThemeToDom(DEFAULT_THEME);
      }

      // ③ API 호출
      //    - 서브도메인 접속: Cloudflare Worker가 X-Tenant-Subdomain 헤더를 주입하므로
      //      추가 파라미터 없이도 서버가 올바른 테넌트 테마를 반환
      //    - ?org= 미리보기 모드: subdomain 쿼리 파라미터로 테마 조회
      //    - 인증된 사용자: axios 인터셉터가 X-Organisation-Id 헤더 자동 추가
      const themeUrl = previewOrg
        ? `/api/settings/theme?subdomain=${encodeURIComponent(previewOrg)}`
        : `/api/settings/theme`;

      const { data } = await axios.get<TenantTheme>(themeUrl);

      // 변경 있을 때만 DOM 업데이트 (불필요한 reflow 방지)
      const hasChanged = JSON.stringify(data) !== JSON.stringify(cached);
      if (hasChanged) {
        setTheme(data);
        applyThemeToDom(data);
        writeCache(cacheKey, data);
      }
    } catch (err) {
      console.warn("[useTenantTheme] 기본 테마 사용:", err);
      // 캐시 없고 API 실패 → DEFAULT_THEME fallback
      const subdomain  = getSubdomain();
      const previewOrg = new URLSearchParams(window.location.search).get("org");
      if (!readCache(themeCacheKey(subdomain, previewOrg))) {
        setTheme(DEFAULT_THEME);
        applyThemeToDom(DEFAULT_THEME);
      }
    } finally {
      setIsLoading(false);
      inflight.current = false;
    }
  }, []);

  useEffect(() => {
    loadTheme();

    // 임프로소네이션 변경 시 테마 재로드
    window.addEventListener("edubee:impersonation-changed", loadTheme);
    // 플랜 변경 시 테마 재로드
    window.addEventListener("edubee:plan-changed", loadTheme);
    // 로그아웃 시 테마 재로드 (SPA 내 라우트 변경 처리)
    window.addEventListener("edubee:logout", loadTheme);

    // SPA 라우트 변경 감지 (뒤로/앞으로 이동 포함)
    const handlePopState = () => loadTheme();
    window.addEventListener("popstate", handlePopState);

    // 탭 포커스 복귀 시 테마 재로드 (inflight 플래그로 중복 차단)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadTheme();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("edubee:impersonation-changed", loadTheme);
      window.removeEventListener("edubee:plan-changed", loadTheme);
      window.removeEventListener("edubee:logout", loadTheme);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadTheme]);

  return { theme, isLoading };
}

// ── 테넌트 테마 Context ────────────────────────────────────────────────────

export const TenantThemeContext = createContext<TenantTheme>(DEFAULT_THEME);

export function useTenantThemeCtx(): TenantTheme {
  return useContext(TenantThemeContext);
}

/**
 * 테마를 CSS 변수로 document.documentElement에 주입.
 * branding.tsx 저장 후 즉시 반영을 위해 export.
 */
export function applyThemeToDom(theme: TenantTheme): void {
  const root = document.documentElement;

  // ── 색상 변수 ──────────────────────────────────────
  root.style.setProperty("--color-primary",       theme.primaryColor);
  root.style.setProperty("--color-primary-dark",  darken(theme.primaryColor, 15));
  root.style.setProperty("--color-primary-light", lighten(theme.primaryColor, 90));
  root.style.setProperty("--color-secondary",     theme.secondaryColor);
  root.style.setProperty("--color-accent",        theme.accentColor);

  // ── e-orange 계열 (사이드바/UI 전반에서 사용) ──────
  const p   = theme.primaryColor;
  const dk  = darken(p, 15);
  const dk2 = darken(p, 28);
  const lt  = lighten(p, 90);
  const lt2 = lighten(p, 83);
  const lt3 = lighten(p, 70);
  const lt4 = lighten(p, 45);
  const rgb = hexToRgb(p);

  root.style.setProperty("--e-orange",      p);
  root.style.setProperty("--e-orange-dk",   dk);
  root.style.setProperty("--e-orange-lt",   lt);
  root.style.setProperty("--e-orange-ring", rgb ? `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.15)` : lt);
  root.style.setProperty("--e-bg-hover",    lt);

  root.style.setProperty("--e-orange-50",   lt);
  root.style.setProperty("--e-orange-100",  lt2);
  root.style.setProperty("--e-orange-200",  lt3);
  root.style.setProperty("--e-orange-300",  lt4);
  root.style.setProperty("--e-orange-400",  darken(p, 5));
  root.style.setProperty("--e-orange-500",  p);
  root.style.setProperty("--e-orange-600",  dk);
  root.style.setProperty("--e-orange-700",  dk2);

  root.style.setProperty("--e-orange-hover",  dk);
  root.style.setProperty("--e-orange-active", dk2);

  const r2 = rgb ? `rgba(${rgb[0]},${rgb[1]},${rgb[2]}` : `rgba(245,130,31`;
  root.style.setProperty("--e-orange-shadow-08",  `${r2},0.08)`);
  root.style.setProperty("--e-orange-shadow-10",  `${r2},0.10)`);
  root.style.setProperty("--e-orange-shadow-12",  `${r2},0.12)`);
  root.style.setProperty("--e-orange-shadow-25",  `${r2},0.25)`);
  root.style.setProperty("--e-orange-shadow-40",  `${r2},0.40)`);
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

// ── 색상 유틸 ─────────────────────────────────────────────────────────────

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
