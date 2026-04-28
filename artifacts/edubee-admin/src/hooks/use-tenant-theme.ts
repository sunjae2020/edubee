import { useEffect, useState, useCallback, createContext, useContext } from "react";

export interface TenantTheme {
  organisationId: string | null;
  companyName:    string;
  logoUrl:        string | null;
  logoDarkUrl:    string | null;
  faviconUrl:     string | null;
  faviconDarkUrl: string | null;
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
  logoDarkUrl:    null,
  faviconUrl:     null,
  faviconDarkUrl: null,
  primaryColor:   "#F5821F",
  secondaryColor: "#1C1917",
  accentColor:    "#fef0e3",
  customCss:      null,
  subdomain:      null,
  planType:       "starter",
  features:       {},
};

// ─────────────────────────────────────────────────────────────────────────────
// Subdomain detection
// ts.edubee.co → "ts", edubee.co / localhost → null
// ─────────────────────────────────────────────────────────────────────────────
const NON_TENANT_SUBDOMAINS = new Set(["www", "app", "admin", "api", "mail"]);

function getSubdomain(): string | null {
  const parts = window.location.hostname.split(".");
  // prod: timest.edubee.co (3+ parts) | dev: timest.localhost (2 parts, last = "localhost")
  const isLocalhost = parts[parts.length - 1] === "localhost";
  const hasSub = parts.length >= 3 || (isLocalhost && parts.length >= 2);
  if (hasSub) {
    const sub = parts[0].toLowerCase();
    if (!NON_TENANT_SUBDOMAINS.has(sub) && sub !== "localhost") return sub;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// localStorage cache (keyed by subdomain)
// Key examples: edubee_theme_ts, edubee_theme_myagency, edubee_theme_default
// ─────────────────────────────────────────────────────────────────────────────
function themeCacheKey(sub: string | null, previewOrg: string | null): string {
  // Cache key is separated by subdomain — prevents cross-tenant cache pollution
  return `edubee_theme_v2_${previewOrg ?? sub ?? "default"}`;
}

/** Delete all legacy (v1) cache entries — prevents key conflicts */
function clearLegacyCache(): void {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("edubee_theme_") && !k.startsWith("edubee_theme_v2_")) {
        toRemove.push(k);
      }
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
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
  } catch {/* ignore if storage is full */}
}

/**
 * Load the tenant theme and inject it as CSS variables into the document.
 *
 * ── Execution order ──
 * ① Apply theme from cache (localStorage) immediately → prevents FOUC (flash of unstyled content)
 * ② API call:
 *    - Subdomain present (ts.edubee.co) → always call API, even on public pages
 *    - No subdomain + public page → skip API, force default Edubee theme
 * ③ If the API response differs from cache → update DOM + refresh cache
 *
 * Called once inside the Router component in App.tsx.
 */
export function useTenantTheme() {
  const [theme, setTheme] = useState<TenantTheme>(DEFAULT_THEME);
  const [isLoading, setIsLoading] = useState(true);
  const inflight = { current: false };

  // Remove legacy cache keys (edubee_theme_*) — once on app mount
  clearLegacyCache();

  const loadTheme = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;

    try {
      const urlParams   = new URLSearchParams(window.location.search);
      const previewOrg  = urlParams.get("org");
      const subdomain   = getSubdomain();
      const cacheKey    = themeCacheKey(subdomain, previewOrg);

      // ① Determine if this is a public page — handled before cache read
      //    - Subdomain present: show tenant branding even on public pages (ts.edubee.co/login)
      //    - No subdomain + public page: skip API, force default theme
      const publicPaths = ["/register", "/login", "/forgot-password", "/reset-password", "/accept-invite"];
      const isPublicPage = publicPaths.some(p => window.location.pathname.endsWith(p));

      if (isPublicPage && !subdomain && !previewOrg) {
        setTheme(DEFAULT_THEME);
        applyThemeToDom(DEFAULT_THEME);
        setIsLoading(false);
        inflight.current = false;
        return;
      }

      // ② Apply cache immediately → prevents flash (only when tenant context exists)
      // If cached subdomain differs from current subdomain, the cache is stale → delete and apply default
      const cached = readCache(cacheKey);
      const cachedSubdomainMatches =
        cached?.subdomain === (previewOrg ?? subdomain ?? null) ||
        (!subdomain && !previewOrg && !cached?.subdomain);
      if (cached && cachedSubdomainMatches) {
        setTheme(cached);
        applyThemeToDom(cached);
      } else {
        if (cached) localStorage.removeItem(cacheKey); // Remove stale cache immediately
        applyThemeToDom(DEFAULT_THEME);
      }

      // ③ API call
      //    - Subdomain access: Cloudflare Worker injects the X-Tenant-Subdomain header,
      //      so the server returns the correct tenant theme without extra parameters
      //    - ?org= preview mode: look up theme via the subdomain query parameter
      //    - Using fetch: if the axios interceptor auto-adds X-Organisation-Id,
      //      tenantResolver would prioritise the header over the subdomain, returning the wrong tenant theme
      const themeUrl = previewOrg
        ? `/api/settings/theme?subdomain=${encodeURIComponent(previewOrg)}`
        : `/api/settings/theme`;

      const resp = await fetch(themeUrl);
      if (!resp.ok) throw new Error(`theme fetch failed: ${resp.status}`);
      const data: TenantTheme = await resp.json();

      // Only update DOM when there are changes (prevents unnecessary reflow)
      const hasChanged = JSON.stringify(data) !== JSON.stringify(cached);
      if (hasChanged) {
        setTheme(data);
        applyThemeToDom(data);
        writeCache(cacheKey, data);
      }
    } catch (err) {
      console.warn("[useTenantTheme] Using default theme:", err);
      // No cache and API failed → DEFAULT_THEME fallback
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

    // Reload theme on impersonation change
    window.addEventListener("edubee:impersonation-changed", loadTheme);
    // Reload theme on plan change
    window.addEventListener("edubee:plan-changed", loadTheme);
    // Reload theme on logout (handles SPA route changes)
    window.addEventListener("edubee:logout", loadTheme);

    // Detect SPA route changes (including back/forward navigation)
    const handlePopState = () => loadTheme();
    window.addEventListener("popstate", handlePopState);

    // Reload theme when tab regains focus (inflight flag prevents duplicates)
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

// ── Tenant theme Context ───────────────────────────────────────────────────

export const TenantThemeContext = createContext<TenantTheme>(DEFAULT_THEME);

export function useTenantThemeCtx(): TenantTheme {
  return useContext(TenantThemeContext);
}

/**
 * Inject the theme as CSS variables into document.documentElement.
 * Exported so branding.tsx can apply changes immediately on save.
 */
export function applyThemeToDom(theme: TenantTheme): void {
  const root = document.documentElement;

  // ── Color variables ────────────────────────────────
  root.style.setProperty("--color-primary",       theme.primaryColor);
  root.style.setProperty("--color-primary-dark",  darken(theme.primaryColor, 15));
  root.style.setProperty("--color-primary-light", lighten(theme.primaryColor, 90));
  root.style.setProperty("--color-secondary",     theme.secondaryColor);
  root.style.setProperty("--color-accent",        theme.accentColor);

  // ── e-orange family (used across sidebar and UI) ──────
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

  // ── Dynamic favicon swap ──────────────────────────
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

  // ── Page title update ────────────────────────────
  if (theme.companyName) {
    document.title = `${theme.companyName} — CRM`;
  }

  // ── Custom CSS injection ─────────────────────────
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

// ── Color utilities ───────────────────────────────────────────────────────

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
