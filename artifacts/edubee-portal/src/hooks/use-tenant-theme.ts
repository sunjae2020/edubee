import { useEffect, useState, useCallback } from "react";

export interface TenantTheme {
  organisationId: string | null;
  companyName:    string;
  logoUrl:        string | null;
  faviconUrl:     string | null;
  primaryColor:   string;
  secondaryColor: string;
  accentColor:    string;
  subdomain:      string | null;
}

export const DEFAULT_THEME: TenantTheme = {
  organisationId: null,
  companyName:    "Edubee",
  logoUrl:        null,
  faviconUrl:     null,
  primaryColor:   "#F5821F",
  secondaryColor: "#1C1917",
  accentColor:    "#FEF0E3",
  subdomain:      null,
};

function getTenantSlug(): string | null {
  const m = window.location.hostname.match(/^([^.]+)\.edubee\.co$/);
  return m && !["www", "app", "portal"].includes(m[1]) ? m[1] : null;
}

function themeCacheKey(slug: string | null): string {
  return `edubee_portal_theme_${slug ?? "default"}`;
}

function readCache(key: string): TenantTheme | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as TenantTheme) : null;
  } catch { return null; }
}

function writeCache(key: string, theme: TenantTheme): void {
  try { localStorage.setItem(key, JSON.stringify(theme)); } catch {}
}

export function applyThemeToDom(theme: TenantTheme): void {
  const root = document.documentElement;
  const p = theme.primaryColor;

  const hexToRgb = (hex: string): [number, number, number] | null => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : null;
  };
  const darken = (hex: string, pct: number): string => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    const f = 1 - pct / 100;
    return "#" + rgb.map(v => Math.round(v * f).toString(16).padStart(2, "0")).join("");
  };
  const lighten = (hex: string, pct: number): string => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    const f = pct / 100;
    return "#" + rgb.map(v => Math.round(v + (255 - v) * f).toString(16).padStart(2, "0")).join("");
  };

  const dk  = darken(p, 15);
  const dk2 = darken(p, 28);
  const lt  = lighten(p, 90);
  const rgb = hexToRgb(p);
  const r2  = rgb ? `rgba(${rgb[0]},${rgb[1]},${rgb[2]}` : `rgba(245,130,31`;

  root.style.setProperty("--e-orange",       p);
  root.style.setProperty("--e-orange-dk",    dk);
  root.style.setProperty("--e-orange-lt",    lt);
  root.style.setProperty("--e-orange-hover", dk);
  root.style.setProperty("--e-orange-active",dk2);
  root.style.setProperty("--e-orange-ring",  rgb ? `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.15)` : lt);
  root.style.setProperty("--e-orange-shadow-25", `${r2},0.25)`);
  root.style.setProperty("--e-bg-hover",     lt);
  root.style.setProperty("--e-orange-lt",    lt);

  if (theme.faviconUrl) {
    const link = (document.querySelector("link[rel~='icon']") as HTMLLinkElement) ??
      (() => { const el = document.createElement("link"); el.rel = "icon"; document.head.appendChild(el); return el; })();
    link.href = theme.faviconUrl;
  }

  if (theme.companyName) {
    document.title = `${theme.companyName} — Portal`;
  }
}

export function useTenantTheme(): { theme: TenantTheme; isLoading: boolean } {
  const [theme, setTheme]       = useState<TenantTheme>(DEFAULT_THEME);
  const [isLoading, setIsLoading] = useState(true);

  const loadTheme = useCallback(async () => {
    const slug     = getTenantSlug();
    const cacheKey = themeCacheKey(slug);

    const cached = readCache(cacheKey);
    if (cached) {
      setTheme(cached);
      applyThemeToDom(cached);
    } else {
      applyThemeToDom(DEFAULT_THEME);
    }

    if (!slug) {
      setTheme(DEFAULT_THEME);
      applyThemeToDom(DEFAULT_THEME);
      setIsLoading(false);
      return;
    }

    try {
      const hdrs: Record<string, string> = { "Content-Type": "application/json" };
      hdrs["X-Organisation-Id"] = slug;

      const token = localStorage.getItem("portal_token");
      if (token) hdrs["Authorization"] = `Bearer ${token}`;

      const res  = await fetch("/api/settings/theme", { headers: hdrs });
      const data = (await res.json()) as TenantTheme;

      const changed = JSON.stringify(data) !== JSON.stringify(cached);
      if (changed) {
        setTheme(data);
        applyThemeToDom(data);
        writeCache(cacheKey, data);
      }
    } catch {
      if (!cached) {
        setTheme(DEFAULT_THEME);
        applyThemeToDom(DEFAULT_THEME);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadTheme(); }, [loadTheme]);

  return { theme, isLoading };
}
