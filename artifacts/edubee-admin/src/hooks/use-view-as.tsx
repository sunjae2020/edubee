import { createContext, useContext, useState, useCallback, useEffect } from "react";

export const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 100, admin: 80, finance: 70, admission: 65,
  team_manager: 60, consultant: 50, camp_coordinator: 40,
};

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin", admin: "Admin", finance: "Finance",
  admission: "Admission", team_manager: "Team Manager",
  consultant: "Consultant", camp_coordinator: "Camp Coordinator",
};

export const ROLE_EMOJIS: Record<string, string> = {
  super_admin: "👑", admin: "🛡️", finance: "💰",
  admission: "📝", team_manager: "👥", consultant: "💼",
  camp_coordinator: "📋",
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Full CRM access within your organisation",
  finance: "Financial reports, invoices, and payments",
  admission: "Applications, contracts, and student intake",
  team_manager: "Team performance and task management",
  consultant: "Student files and service management",
  camp_coordinator: "Delegated camp programs and applications",
};

const SESSION_ROLE_KEY = "edubee_view_as_role";
const SESSION_ACCOUNT_KEY = "edubee_view_as";

// Account view-as (portal preview) — kept for tenant-scoped portal accounts only
export interface ViewAsAccount {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl?: string | null;
  _sourceType: "account";
  _accountType?: string | null;
}

interface ViewAsContextType {
  viewAsRole: string | null;
  viewAsUser: ViewAsAccount | null;
  viewAsUserId: string | null;
  setViewAsRole: (role: string | null) => void;
  setViewAs: (user: ViewAsAccount | null) => void;
  clearViewAs: () => void;
  isImpersonating: boolean;
  effectiveRole: string | null;
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
  const [viewAsRole, setViewAsRoleState] = useState<string | null>(() => {
    try { return sessionStorage.getItem(SESSION_ROLE_KEY) ?? null; } catch { return null; }
  });

  const [viewAsUser, setViewAsUserState] = useState<ViewAsAccount | null>(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_ACCOUNT_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      // Only restore account-type view-as (user-type is removed)
      return parsed?._sourceType === "account" ? parsed : null;
    } catch { return null; }
  });

  const isImpersonating = !!(viewAsRole || viewAsUser);

  useEffect(() => {
    applyTheme(isImpersonating);
  }, [isImpersonating]);

  const setViewAsRole = useCallback((role: string | null) => {
    setViewAsRoleState(role);
    // Switching to role view clears account view
    setViewAsUserState(null);
    sessionStorage.removeItem(SESSION_ACCOUNT_KEY);
    if (role) {
      sessionStorage.setItem(SESSION_ROLE_KEY, role);
    } else {
      sessionStorage.removeItem(SESSION_ROLE_KEY);
    }
  }, []);

  const setViewAs = useCallback((user: ViewAsAccount | null) => {
    setViewAsUserState(user);
    // Switching to account view clears role view
    setViewAsRoleState(null);
    sessionStorage.removeItem(SESSION_ROLE_KEY);
    if (user) {
      sessionStorage.setItem(SESSION_ACCOUNT_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(SESSION_ACCOUNT_KEY);
    }
  }, []);

  const clearViewAs = useCallback(() => {
    setViewAsRoleState(null);
    setViewAsUserState(null);
    sessionStorage.removeItem(SESSION_ROLE_KEY);
    sessionStorage.removeItem(SESSION_ACCOUNT_KEY);
  }, []);

  return (
    <ViewAsContext.Provider value={{
      viewAsRole,
      viewAsUser,
      viewAsUserId: viewAsUser?.id ?? null,
      setViewAsRole,
      setViewAs,
      clearViewAs,
      isImpersonating,
      effectiveRole: viewAsRole,
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

// Legacy: still used by use-auth.tsx fetch interceptor for account portal view
export function getViewAsUserId(): string | null {
  try { return JSON.parse(sessionStorage.getItem(SESSION_ACCOUNT_KEY) || "null")?.id ?? null; }
  catch { return null; }
}

export function getViewAsRole(): string | null {
  try { return sessionStorage.getItem(SESSION_ROLE_KEY) ?? null; }
  catch { return null; }
}
