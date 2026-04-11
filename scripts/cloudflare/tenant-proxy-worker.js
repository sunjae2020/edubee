/**
 * Edubee 멀티테넌트 Cloudflare Worker
 * ─────────────────────────────────────────────────────────────────
 * 역할: *.edubee.co 테넌트 서브도메인 요청을 www.edubee.co로 프록시
 *       - 브라우저 URL은 ts.edubee.co 그대로 유지 (투명 프록시)
 *       - X-Subdomain 헤더로 서브도메인 정보를 API 서버에 전달
 *
 * 설치: Cloudflare Dashboard → Workers & Pages → Create Worker
 *       아래 코드 붙여넣기 후 Save and Deploy
 *       Route: *.edubee.co/*  (www.edubee.co는 제외)
 */

const ORIGIN = "https://www.edubee.co"; // Replit 배포 도메인

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

    // 시스템 서브도메인은 직접 통과 (www는 이 Worker로 오지 않음)
    if (!sub || SYSTEM_SUBDOMAINS.has(sub)) {
      return fetch(request);
    }

    // 프록시 대상 URL: 동일 경로, Origin만 www.edubee.co로 변경
    const targetUrl = ORIGIN + url.pathname + url.search + url.hash;

    // 요청 헤더 복사 + 서브도메인 정보 추가
    const newHeaders = new Headers(request.headers);
    newHeaders.set("X-Subdomain", sub);              // API 서버 테넌트 감지용
    newHeaders.set("X-Original-Host", host);          // 원본 호스트 정보
    newHeaders.set("X-Forwarded-Host", host);         // Express trust proxy 호환

    // 새 요청 생성 (Host는 origin 서버로 변경)
    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: newHeaders,
      body: request.body,
      redirect: "follow",
    });

    // Cloudflare → Replit 프록시
    const response = await fetch(proxyRequest);

    // 응답 헤더에 CORS 허용 추가 (필요 시)
    const newResponse = new Response(response.body, response);
    newResponse.headers.set("X-Tenant-Subdomain", sub);

    return newResponse;
  },
};
