import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./hooks/use-theme";

// 테넌트 서브도메인(*.edubee.co)으로 접속 시 /admin/ 으로 자동 리다이렉트
// 시스템 서브도메인(www, demo, camp 등)은 제외
// Replit 개발/배포 도메인(*.replit.app, *.replit.dev 등)은 절대 리다이렉트 하지 않음
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
  // 이미 /admin/ 경로면 리다이렉트 불필요
  if (window.location.pathname.startsWith("/admin")) return;
  window.location.replace(window.location.origin + "/admin/");
})();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
