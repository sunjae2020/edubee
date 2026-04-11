import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ── 테넌트 서브도메인 감지 및 리다이렉트 ────────────────────────────────
// ts.edubee.co → /admin/ (Admin CRM)
// www.edubee.co, edubee.co → 웹사이트 그대로
// *.replit.app, *.replit.dev 개발 환경 → 웹사이트 그대로
const SYSTEM_SUBDOMAINS = new Set([
  "www", "api", "admin", "superadmin", "app",
  "demo", "camp", "crm", "mail", "cdn", "static", "dev", "staging",
]);
const BASE_DOMAIN = "edubee.co";
const DEV_DOMAIN_SUFFIXES = [".replit.app", ".replit.dev", ".riker.replit.dev", ".repl.co"];

(function redirectTenantSubdomain() {
  const host = window.location.hostname;

  // 개발/Replit 환경 — 스킵
  if (DEV_DOMAIN_SUFFIXES.some((s) => host === s.replace(/^\./, "") || host.endsWith(s))) return;

  // edubee.co 도메인이 아니면 스킵
  if (!host.endsWith(`.${BASE_DOMAIN}`) && host !== BASE_DOMAIN) return;

  // 서브도메인 추출
  if (!host.endsWith(`.${BASE_DOMAIN}`)) return;
  const sub = host.slice(0, host.length - BASE_DOMAIN.length - 1);

  // 중첩 서브도메인, 시스템 서브도메인 제외
  if (!sub || sub.includes(".") || SYSTEM_SUBDOMAINS.has(sub)) return;

  // 이미 /admin/ 경로면 스킵
  if (window.location.pathname.startsWith("/admin")) return;

  // 테넌트 서브도메인 → Admin CRM으로 리다이렉트
  window.location.replace(window.location.origin + "/admin/");
})();

createRoot(document.getElementById("root")!).render(<App />);
