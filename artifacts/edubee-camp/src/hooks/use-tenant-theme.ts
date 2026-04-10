import { useEffect, useState, createContext, useContext } from "react";

const BASE = (typeof import.meta !== "undefined" && (import.meta as any).env?.BASE_URL)
  ? (import.meta as any).env.BASE_URL.replace(/\/$/, "")
  : "";

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
  planStatus:     string;
  trialEndsAt:    string | null;
  features:       Record<string, boolean>;
}

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
  planStatus:     "active",
  trialEndsAt:    null,
  features:       {},
};

// System subdomains that should NOT trigger tenant resolution
const SYSTEM_SUBDOMAINS = new Set([
  "www", "camp", "admin", "crm", "api", "app", "demo",
  "test", "staging", "dev", "mail", "localhost",
]);

function detectSubdomain(): string | null {
  if (typeof window === "undefined") return null;
  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  if (parts.length >= 3 && !SYSTEM_SUBDOMAINS.has(parts[0])) {
    return parts[0];
  }
  return null;
}

export function useTenantTheme() {
  const [theme, setTheme] = useState<TenantTheme>(DEFAULT_THEME);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const subdomain = detectSubdomain();

    if (!subdomain) {
      applyThemeToDom(DEFAULT_THEME);
      return;
    }

    // Tenant subdomain detected — fetch branding from API
    setIsLoading(true);
    fetch(`${BASE}/api/settings/tenant-settings`, {
      headers: { "X-Subdomain": subdomain },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) {
          applyThemeToDom(DEFAULT_THEME);
          return;
        }
        const resolved: TenantTheme = {
          organisationId: data.organisationId ?? null,
          companyName:    data.companyName    ?? data.name ?? "Edubee CAMP",
          logoUrl:        data.logoUrl        ?? null,
          faviconUrl:     data.faviconUrl     ?? null,
          primaryColor:   data.primaryColor   ?? DEFAULT_THEME.primaryColor,
          secondaryColor: data.secondaryColor ?? DEFAULT_THEME.secondaryColor,
          accentColor:    data.accentColor    ?? DEFAULT_THEME.accentColor,
          customCss:      data.customCss      ?? null,
          subdomain:      subdomain,
          planType:       data.planType       ?? "starter",
          planStatus:     data.planStatus     ?? "active",
          trialEndsAt:    data.trialEndsAt    ?? null,
          features:       data.features       ?? {},
        };
        setTheme(resolved);
        applyThemeToDom(resolved);
      })
      .catch(() => {
        applyThemeToDom(DEFAULT_THEME);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return { theme, isLoading };
}

// ── Tenant Theme Context ──────────────────────────────────────────────────────

export const TenantThemeContext = createContext<TenantTheme>(DEFAULT_THEME);

export function useTenantThemeCtx(): TenantTheme {
  return useContext(TenantThemeContext);
}

/**
 * Inject theme into CSS variables on document.documentElement
 */
export function applyThemeToDom(theme: TenantTheme): void {
  const root = document.documentElement;

  root.style.setProperty("--color-primary",       theme.primaryColor);
  root.style.setProperty("--color-primary-dark",  darken(theme.primaryColor, 15));
  root.style.setProperty("--color-primary-light", lighten(theme.primaryColor, 90));
  root.style.setProperty("--color-secondary",     theme.secondaryColor);
  root.style.setProperty("--color-accent",        theme.accentColor);

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

  if (theme.companyName) {
    document.title = `${theme.companyName} — CAMP`;
  }

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

// ── Color utilities ───────────────────────────────────────────────────────────

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
