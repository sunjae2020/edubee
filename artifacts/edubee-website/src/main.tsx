import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ── Tenant subdomain detection and redirect ────────────────────────────────
// ts.edubee.co → /admin/ (Admin CRM)
// www.edubee.co, edubee.co → serve website as-is
// *.replit.app, *.replit.dev dev environment → serve website as-is
const SYSTEM_SUBDOMAINS = new Set([
  "www", "api", "admin", "superadmin", "app",
  "demo", "camp", "crm", "mail", "cdn", "static", "dev", "staging",
]);
const BASE_DOMAIN = "edubee.co";
const DEV_DOMAIN_SUFFIXES = [".replit.app", ".replit.dev", ".riker.replit.dev", ".repl.co"];

(function redirectTenantSubdomain() {
  const host = window.location.hostname;

  // Dev/Replit environment — skip
  if (DEV_DOMAIN_SUFFIXES.some((s) => host === s.replace(/^\./, "") || host.endsWith(s))) return;

  // Not an edubee.co domain — skip
  if (!host.endsWith(`.${BASE_DOMAIN}`) && host !== BASE_DOMAIN) return;

  // Extract subdomain
  if (!host.endsWith(`.${BASE_DOMAIN}`)) return;
  const sub = host.slice(0, host.length - BASE_DOMAIN.length - 1);

  // Exclude nested subdomains and system subdomains
  if (!sub || sub.includes(".") || SYSTEM_SUBDOMAINS.has(sub)) return;

  // Already on /admin/ path — skip
  if (window.location.pathname.startsWith("/admin")) return;

  // Tenant subdomain → redirect to Admin CRM
  window.location.replace(window.location.origin + "/admin/");
})();

createRoot(document.getElementById("root")!).render(<App />);
