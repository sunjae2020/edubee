import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./hooks/use-theme";

// Auto-redirect to /admin/ when accessing via tenant subdomain (*.edubee.co)
// Exclude system subdomains (www, demo, camp, etc.)
// Never redirect on Replit dev/deploy domains (*.replit.app, *.replit.dev, etc.)
const SYSTEM_SUBDOMAINS = new Set([
  "www", "api", "admin", "superadmin", "app",
  "demo", "camp", "mail", "cdn", "static", "dev", "staging",
]);
const BASE_DOMAIN = "edubee.co";
const NON_TENANT_SUFFIXES = [".replit.app", ".replit.dev", ".riker.replit.dev", ".repl.co"];
(function redirectTenantToAdmin() {
  const host = window.location.hostname;
  // Never redirect on Replit or other known dev/hosting platforms
  if (NON_TENANT_SUFFIXES.some((s) => host === s.replace(/^\./, "") || host.endsWith(s))) return;
  if (!host.endsWith(`.${BASE_DOMAIN}`)) return;
  const sub = host.slice(0, host.length - BASE_DOMAIN.length - 1);
  if (!sub || sub.includes(".") || SYSTEM_SUBDOMAINS.has(sub)) return;
  // Already on /admin/ path — no redirect needed
  if (window.location.pathname.startsWith("/admin")) return;
  window.location.replace(window.location.origin + "/admin/");
})();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
