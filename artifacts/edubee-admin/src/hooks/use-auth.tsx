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

// Attach JWT + View-As + Org-Id (multi-tenant) to every axios request
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("edubee_token");
  const viewAsId = getViewAsUserId();
  // Impersonation overrides personal org (super-admin feature)
  const impersonateOrgId = sessionStorage.getItem("admin_impersonate_org_id");
  // For regular users: read organisationId from JWT
  const personalOrgId = token ? (parseJwt(token)?.organisationId ?? null) : null;
  const orgId = impersonateOrgId || personalOrgId;

  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  if (viewAsId) config.headers["X-View-As-User-Id"] = viewAsId;
  if (orgId) config.headers["X-Organisation-Id"] = orgId;
  return config;
});

// Redirect to login on 401
axios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes("/login")) {
      localStorage.removeItem("edubee_token");
      window.location.href = "/login";
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
      const currentToken = localStorage.getItem("edubee_token");
      const viewAsId = getViewAsUserId();
      const impersonateOrgId = sessionStorage.getItem("admin_impersonate_org_id");
      const personalOrgId = currentToken ? (parseJwt(currentToken)?.organisationId ?? null) : null;
      const orgId = impersonateOrgId || personalOrgId;

      if (currentToken || viewAsId || orgId) {
        init = init || {};
        const headers = new Headers(init.headers as HeadersInit);
        if (currentToken) headers.set("Authorization", `Bearer ${currentToken}`);
        if (viewAsId) headers.set("X-View-As-User-Id", viewAsId);
        if (orgId) headers.set("X-Organisation-Id", orgId);
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
