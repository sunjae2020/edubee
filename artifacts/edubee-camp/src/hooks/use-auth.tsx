import { createContext, useContext, useEffect, useState } from "react";
import { User, LoginRequest } from "@workspace/api-client-react";
import { useLogin, useGetMe, useLogout } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { getViewAsUserId } from "./use-view-as";

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
      if (currentToken || viewAsId) {
        init = init || {};
        const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
        if (currentToken) headers["Authorization"] = `Bearer ${currentToken}`;
        if (viewAsId) headers["X-View-As-User-Id"] = viewAsId;
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
    setLocation("/admin/dashboard");
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
