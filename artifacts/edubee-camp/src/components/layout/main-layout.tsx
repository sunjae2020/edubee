import { useState } from "react";
import { AppSidebar } from "./app-sidebar";
import { Header } from "./header";
import { useAuth } from "@/hooks/use-auth";
import { useViewAs } from "@/hooks/use-view-as";
import { Redirect } from "wouter";

export function MainLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { isImpersonating } = useViewAs();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("edubee_sidebar_collapsed") === "1"; }
    catch { return false; }
  });

  const toggleCollapsed = () => {
    setCollapsed(c => {
      const next = !c;
      try { localStorage.setItem("edubee_sidebar_collapsed", next ? "1" : "0"); } catch {}
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading workspace…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Redirect to="/login" />;

  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ background: isImpersonating ? "#0f172a" : undefined }}
    >
      <AppSidebar collapsed={collapsed} onToggle={toggleCollapsed} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header collapsed={collapsed} onToggle={toggleCollapsed} title={title} />
        <main
          className="flex-1 overflow-y-auto p-5 md:p-6"
          style={{ background: isImpersonating ? "#1e293b" : undefined }}
        >
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
