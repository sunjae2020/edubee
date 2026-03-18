import { createContext, useContext, useEffect, useState } from "react";
import { User, LoginRequest } from "@workspace/api-client-react";
import { useLogin, useGetMe, useLogout } from "@workspace/api-client-react";
import { useLocation } from "wouter";

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
  
  // Intercept all fetches to add token if it exists
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const currentToken = localStorage.getItem("edubee_token");
      if (currentToken) {
        init = init || {};
        init.headers = {
          ...init.headers,
          Authorization: `Bearer ${currentToken}`,
        };
      }
      const response = await originalFetch(input, init);
      if (response.status === 401 && !input.toString().includes('/login')) {
        localStorage.removeItem("edubee_token");
        setToken(null);
        setLocation("/login");
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [setLocation]);

  const { data: user, isLoading, refetch } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    }
  });

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const handleLogin = async (data: LoginRequest) => {
    const res = await loginMutation.mutateAsync({ data });
    localStorage.setItem("edubee_token", res.accessToken);
    setToken(res.accessToken);
    await refetch();
    setLocation("/dashboard");
  };

  const handleLogout = async () => {
    try {
      if (token) await logoutMutation.mutateAsync();
    } finally {
      localStorage.removeItem("edubee_token");
      setToken(null);
      setLocation("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading: !!token && isLoading,
        login: handleLogin,
        logout: handleLogout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
