// @refresh reload
import { createContext, useContext, useEffect, useState } from "react";
import { User, LoginRequest } from "@workspace/api-client-react";
import { useLogin, useGetMe, useLogout } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { getViewAsUserId } from "./use-view-as";
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
  // Impersonation overrides personal org (super-admin feature)
  const impersonateOrgId = sessionStorage.getItem("admin_impersonate_org_id");
  // For regular users: read organisationId from JWT
  const personalOrgId = token ? (parseJwt(token)?.organisationId ?? null) : null;
  const orgId = impersonateOrgId || personalOrgId;

  // theme 엔드포인트는 X-Organisation-Id 없이 호출 — 서브도메인으로만 테넌트 결정
  const isThemeEndpoint = config.url?.includes("/api/settings/theme");

  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  if (viewAsId) config.headers["X-View-As-User-Id"] = viewAsId;
  if (orgId && !isThemeEndpoint) config.headers["X-Organisation-Id"] = orgId;
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

      const currentToken = localStorage.getItem("edubee_token");
      const viewAsId = getViewAsUserId();
      const impersonateOrgId = sessionStorage.getItem("admin_impersonate_org_id");
      const personalOrgId = currentToken ? (parseJwt(currentToken)?.organisationId ?? null) : null;
      const orgId = impersonateOrgId || personalOrgId;

      // theme 엔드포인트는 X-Organisation-Id 없이 호출 — 서브도메인으로만 테넌트 결정
      const isThemeEndpoint = input.toString().includes("/api/settings/theme");

      if (currentToken || viewAsId || (orgId && !isThemeEndpoint)) {
        init = init || {};
        const headers = new Headers(init.headers as HeadersInit);
        if (currentToken) headers.set("Authorization", `Bearer ${currentToken}`);
        if (viewAsId) headers.set("X-View-As-User-Id", viewAsId);
        if (orgId && !isThemeEndpoint) headers.set("X-Organisation-Id", orgId);
        init.headers = headers;
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
    query: { enabled: !!token, retry: false },
  });

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const handleLogin = async (data: LoginRequest) => {
    const res = await loginMutation.mutateAsync({ data });
    localStorage.setItem("edubee_token", res.accessToken);
    setToken(res.accessToken);
    await refetch();
    if ((res as any).user?.role === "super_admin" || (res as any).role === "super_admin") {
      setLocation("/superadmin");
    } else {
      setLocation("/admin/dashboard");
    }
  };

  const handleLogout = async () => {
    try { if (token) await logoutMutation.mutateAsync(); } finally {
      localStorage.removeItem("edubee_token");
      setToken(null);
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
