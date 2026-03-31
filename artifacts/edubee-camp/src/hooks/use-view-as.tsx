import { createContext, useContext, useState, useCallback, useEffect } from "react";

export const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 100, admin: 80, camp_coordinator: 60,
  education_agent: 40, partner_institute: 30, partner_hotel: 30,
  partner_pickup: 30, partner_tour: 30, parent_client: 20,
};

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin", admin: "Admin", camp_coordinator: "Camp Coordinator",
  education_agent: "Education Agent", partner_institute: "Partner Institute",
  partner_hotel: "Partner Hotel", partner_pickup: "Partner Pickup",
  partner_tour: "Partner Tour", parent_client: "Parent Client",
};

export const ROLE_EMOJIS: Record<string, string> = {
  super_admin: "👑", admin: "🛡️", camp_coordinator: "📋",
  education_agent: "🎓", partner_institute: "🏫", partner_hotel: "🏨",
  partner_pickup: "🚗", partner_tour: "🗺️", parent_client: "👪",
};

const SESSION_KEY = "edubee_view_as";

export interface ViewAsUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl?: string | null;
  _sourceType?: "user" | "account";
  _accountType?: string | null;
}

interface ViewAsContextType {
  viewAsUser: ViewAsUser | null;
  viewAsUserId: string | null;
  setViewAs: (user: ViewAsUser | null) => void;
  clearViewAs: () => void;
  isImpersonating: boolean;
}

const ViewAsContext = createContext<ViewAsContextType | undefined>(undefined);

function applyTheme(impersonating: boolean) {
  if (impersonating) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function ViewAsProvider({ children }: { children: React.ReactNode }) {
  const [viewAsUser, setViewAsUser] = useState<ViewAsUser | null>(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      const user = stored ? JSON.parse(stored) : null;
      applyTheme(!!user);
      return user;
    } catch {
      return null;
    }
  });

  const setViewAs = useCallback((user: ViewAsUser | null) => {
    setViewAsUser(user);
    if (user) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
    applyTheme(!!user);
  }, []);

  const clearViewAs = useCallback(() => setViewAs(null), [setViewAs]);

  return (
    <ViewAsContext.Provider value={{
      viewAsUser,
      viewAsUserId: viewAsUser?.id ?? null,
      setViewAs,
      clearViewAs,
      isImpersonating: !!viewAsUser,
    }}>
      {children}
    </ViewAsContext.Provider>
  );
}

export function useViewAs() {
  const ctx = useContext(ViewAsContext);
  if (!ctx) throw new Error("useViewAs must be used within ViewAsProvider");
  return ctx;
}

export function getViewAsUserId(): string | null {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null")?.id ?? null; }
  catch { return null; }
}
