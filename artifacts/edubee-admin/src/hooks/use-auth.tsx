// @refresh reload
import { createContext, useContext, useEffect, useState } from "react";
import { User, LoginRequest } from "@workspace/api-client-react";
import { useLogin, useGetMe, useLogout } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { getViewAsUserId, getViewAsRole } from "./use-view-as";
import axios from "axios";

// Decode JWT payload (no verification — client-side read only)
function parseJwt(token: string): Record<string, any> | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

// The admin app is served at BASE_URL = "/admin/" but the API server is at "/api/".
// Components use `${BASE}/api/...` = `/admin/api/...` which incorrectly routes to
// the static file server. Rewrite to `/api/...` so requests reach the API server.
const ADMIN_BASE_STRIP = import.meta.env.BASE_URL.replace(/\/$/, ""); // e.g. "/admin"

function fixApiUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  if (ADMIN_BASE_STRIP && url.startsWith(ADMIN_BASE_STRIP + "/api")) {
    return url.slice(ADMIN_BASE_STRIP.length);
  }
  return url;
}

// Attach JWT + View-As + Org-Id (multi-tenant) to every axios request
axios.interceptors.request.use((config) => {
  // Rewrite /admin/api/... → /api/... so requests reach the API server
  config.url = fixApiUrl(config.url);

  const token = localStorage.getItem("edubee_token");
  const viewAsId = getViewAsUserId();
  const viewAsRole = getViewAsRole();

  // ── Determine tenant org ID ──────────────────────────────────────
  // When on a subdomain (tsh.edubee.co):
  //   The server tenantResolver handles the subdomain with top priority,
  //   so we do NOT send X-Organisation-Id.
  //   (Sending a wrong org ID could expose another tenant's data.)
  //
  // When no subdomain (app.edubee.co etc.):
  //   Send the impersonation override or the JWT's organisationId
  const NON_TENANT_SUBS = new Set(["www", "app", "admin", "api", "mail"]);
  const hostParts = window.location.hostname.split(".");
  const _isLocalhost = hostParts[hostParts.length - 1] === "localhost";
  const _hasSub = hostParts.length >= 3 || (_isLocalhost && hostParts.length >= 2);
  const currentSub = _hasSub ? hostParts[0].toLowerCase() : null;
  const isOnTenantSubdomain = !!currentSub && !NON_TENANT_SUBS.has(currentSub) && currentSub !== "localhost";

  let orgId: string | null = null;
  if (!isOnTenantSubdomain) {
    // Non-tenant domain: use impersonation override or JWT org
    const impersonateOrgId = sessionStorage.getItem("admin_impersonate_org_id");
    const personalOrgId = token ? (parseJwt(token)?.organisationId ?? null) : null;
    orgId = impersonateOrgId || personalOrgId;
  }
  // On tenant subdomains, only allow impersonation (View-As within the same tenant)
  if (isOnTenantSubdomain) {
    const impersonateOrgId = sessionStorage.getItem("admin_impersonate_org_id");
    if (impersonateOrgId) orgId = impersonateOrgId;
  }

  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  if (viewAsRole) {
    config.headers["X-View-As-Role"] = viewAsRole;
  } else if (viewAsId) {
    config.headers["X-View-As-User-Id"] = viewAsId;
  }
  if (orgId) config.headers["X-Organisation-Id"] = orgId;
  return config;
});

// Redirect to login on 401 — use BASE_URL so we stay in the admin CRM (e.g. /admin/login)
const ADMIN_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
axios.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    if (status === 401 && !err.config?.url?.includes("/login")) {
      localStorage.removeItem("edubee_token");
      window.location.href = `${ADMIN_BASE}/login`;
    }
    if (status >= 500) {
      console.error(`[API 500] ${err.config?.method?.toUpperCase()} ${err.config?.url}`, err.response?.data);
    }
    return Promise.reject(err);
  }
);

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(localStorage.getItem("edubee_token"));

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      // Rewrite /admin/api/... → /api/... for fetch-based calls (same as axios interceptor)
      if (typeof input === "string") {
        input = fixApiUrl(input) ?? input;
      } else if (input instanceof URL) {
        const fixed = fixApiUrl(input.pathname);
        if (fixed !== input.pathname) {
          input = new URL(fixed!, input.origin);
        }
      }

      // Auth endpoints must NOT receive stale session headers — skip injection for login/refresh
      const resolvedUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
      const isAuthEndpoint = /\/api\/auth\/(login|refresh)/.test(resolvedUrl);

      if (!isAuthEndpoint) {
        const currentToken = localStorage.getItem("edubee_token");
        const viewAsId = getViewAsUserId();
        const viewAsRole = getViewAsRole();
        const impersonateOrgId = sessionStorage.getItem("admin_impersonate_org_id");
        const personalOrgId = currentToken ? (parseJwt(currentToken)?.organisationId ?? null) : null;
        const orgId = impersonateOrgId || personalOrgId;

        if (currentToken || viewAsId || viewAsRole || orgId) {
          init = init || {};
          const headers = new Headers(init.headers as HeadersInit);
          if (currentToken) headers.set("Authorization", `Bearer ${currentToken}`);
          if (viewAsRole) {
            headers.set("X-View-As-Role", viewAsRole);
          } else if (viewAsId) {
            headers.set("X-View-As-User-Id", viewAsId);
          }
          if (orgId) headers.set("X-Organisation-Id", orgId);
          init.headers = headers;
        }
      }
      const response = await originalFetch(input, init);
      if (response.status === 401 && !input.toString().includes("/login")) {
        localStorage.removeItem("edubee_token");
        setToken(null);
        setLocation("/login");
      }
      return response;
    };
    return () => { window.fetch = originalFetch; };
  }, [setLocation]);

  const { data: user, isLoading, refetch } = useGetMe({
    query: { queryKey: ['me'], enabled: !!token, retry: false },
  });

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const handleLogin = async (data: LoginRequest) => {
    const res = await loginMutation.mutateAsync({ data });
    localStorage.setItem("edubee_token", res.accessToken);
    setToken(res.accessToken);
    await refetch();

    // On a tenant subdomain, do not redirect to /superadmin even for super_admin
    const NON_TENANT_SUBS_LOGIN = new Set(["www", "app", "admin", "api", "mail"]);
    const loginHostParts = window.location.hostname.split(".");
    const _loginIsLocalhost = loginHostParts[loginHostParts.length - 1] === "localhost";
    const _loginHasSub = loginHostParts.length >= 3 || (_loginIsLocalhost && loginHostParts.length >= 2);
    const loginSub = _loginHasSub ? loginHostParts[0].toLowerCase() : null;
    const isOnTenantSubdomainLogin = !!loginSub && !NON_TENANT_SUBS_LOGIN.has(loginSub) && loginSub !== "localhost";

    const isSuperAdmin = (res as any).user?.role === "super_admin" || (res as any).role === "super_admin";
    if (!isOnTenantSubdomainLogin && isSuperAdmin) {
      setLocation("/superadmin");
    } else {
      setLocation("/admin/dashboard");
    }
  };

  const handleLogout = async () => {
    try { if (token) await logoutMutation.mutateAsync(); } finally {
      localStorage.removeItem("edubee_token");
      setToken(null);
      // Clear theme cache → show the default Edubee CRM theme on the login screen
      try {
        Object.keys(localStorage)
          .filter(k => k.startsWith("edubee_theme_"))
          .forEach(k => localStorage.removeItem(k));
      } catch {}
      window.dispatchEvent(new Event("edubee:logout"));
      setLocation("/login");
    }
  };

  return (
    <AuthContext.Provider value={{
      user: user || null,
      isLoading: !!token && isLoading,
      login: handleLogin,
      logout: handleLogout,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
