import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "./api";

export interface PortalUser {
  userType: "portal";
  accountId: string;
  email: string | null;
  portalRole: string | null;
  accountName: string;
}

interface AuthState {
  token: string | null;
  user: PortalUser | null;
  isLoading: boolean;
  mustChangePassword: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<{ mustChangePassword: boolean }>;
  logout: () => void;
  clearMustChangePassword: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function parseJwt(token: string): PortalUser | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.userType !== "portal") return null;
    return payload as PortalUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    isLoading: true,
    mustChangePassword: false,
  });

  useEffect(() => {
    const stored = localStorage.getItem("portal_token");
    if (stored) {
      const user = parseJwt(stored);
      if (user) {
        setState({ token: stored, user, isLoading: false, mustChangePassword: false });
        return;
      }
      localStorage.removeItem("portal_token");
    }
    setState((s) => ({ ...s, isLoading: false }));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{
      accessToken: string;
      refreshToken: string;
      userType: string;
      mustChangePassword?: boolean;
    }>("/auth/login", { email, password });
    if (res.userType !== "portal") {
      throw new Error("This login is for portal users only. Use the admin panel for staff.");
    }
    const user = parseJwt(res.accessToken);
    if (!user) throw new Error("Invalid token received");
    localStorage.setItem("portal_token", res.accessToken);
    if (res.refreshToken) localStorage.setItem("portal_refresh_token", res.refreshToken);
    const mustChangePassword = !!res.mustChangePassword;
    setState({ token: res.accessToken, user, isLoading: false, mustChangePassword });
    return { mustChangePassword, portalRole: user.portalRole };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("portal_token");
    localStorage.removeItem("portal_refresh_token");
    setState({ token: null, user: null, isLoading: false, mustChangePassword: false });
  }, []);

  const clearMustChangePassword = useCallback(() => {
    setState((s) => ({ ...s, mustChangePassword: false }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        clearMustChangePassword,
        isAuthenticated: !!state.token && !!state.user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
