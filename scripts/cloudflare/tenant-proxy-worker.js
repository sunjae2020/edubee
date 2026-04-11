/**
 * Edubee 멀티테넌트 Cloudflare Worker
 * ─────────────────────────────────────────────────────────────────
 * 역할: *.edubee.co 테넌트 서브도메인 요청을 Replit 배포 서버로 프록시
 *       - 브라우저 URL은 ts.edubee.co 그대로 유지 (투명 프록시)
 *       - X-Subdomain 헤더로 서브도메인 정보를 API 서버에 전달
 *
 * Route: *.edubee.co/*
 */

// Replit 배포 서버 (직접 연결 — Cloudflare 루프 방지)
const ORIGIN = "https://edubee-crm-20260401.replit.app";

const SYSTEM_SUBDOMAINS = new Set([
  "www", "api", "admin", "superadmin", "app",
  "demo", "camp", "crm", "mail", "cdn", "static", "dev", "staging",
]);

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const host = url.hostname; // e.g. ts.edubee.co

    // 서브도메인 추출 (edubee.co → null, ts.edubee.co → 'ts')
    const parts = host.split(".");
    const sub = parts.length === 3 ? parts[0] : null;

    // 시스템 서브도메인은 직접 통과
    if (!sub || SYSTEM_SUBDOMAINS.has(sub)) {
      return fetch(request);
    }

    // 프록시 대상 URL: 동일 경로, Origin만 Replit 배포 서버로 변경
    const targetUrl = ORIGIN + url.pathname + url.search + url.hash;

    // 요청 헤더 복사 + 서브도메인 정보 추가
    const newHeaders = new Headers(request.headers);
    newHeaders.set("X-Subdomain", sub);          // API 서버 테넌트 감지용
    newHeaders.set("X-Original-Host", host);      // 원본 호스트 보존
    newHeaders.set("X-Forwarded-Host", host);     // Express trust proxy 호환
    newHeaders.set("Host", "edubee-crm-20260401.replit.app"); // Origin 서버 Host

    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: newHeaders,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "follow",
    });

    return fetch(proxyRequest);
  },
};
