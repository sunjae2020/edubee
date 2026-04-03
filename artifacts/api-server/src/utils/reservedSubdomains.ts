/**
 * 예약어 서브도메인 차단 목록
 * POST /api/settings/domain/check
 * PUT  /api/settings/domain/subdomain
 * 두 엔드포인트에서 공통 사용
 */

export const RESERVED_SUBDOMAINS: readonly string[] = [
  // ── 시스템 핵심 ──────────────────────
  "admin",
  "superadmin",
  "api",
  "app",
  "www",
  "mail",
  "ftp",
  "smtp",
  "pop",
  "imap",
  "ns1",
  "ns2",
  "dns",

  // ── 인프라 ───────────────────────────
  "static",
  "cdn",
  "assets",
  "media",
  "upload",
  "uploads",
  "files",
  "images",

  // ── 개발 환경 ─────────────────────────
  "dev",
  "development",
  "staging",
  "test",
  "testing",
  "demo",
  "sandbox",
  "beta",
  "preview",
  "local",

  // ── 서비스 예약어 ─────────────────────
  "support",
  "help",
  "docs",
  "billing",
  "payment",
  "payments",
  "auth",
  "login",
  "logout",
  "signup",
  "register",
  "portal",
  "dashboard",
  "console",
  "status",
  "monitor",

  // ── 브랜드 예약어 ─────────────────────
  "edubee",
  "crm",
  "platform",
] as const;

/**
 * 서브도메인이 예약어인지 확인
 * @param subdomain - 확인할 서브도메인 (대소문자 무관)
 * @returns true면 예약어 (사용 불가)
 */
export function isReservedSubdomain(subdomain: string): boolean {
  return (RESERVED_SUBDOMAINS as readonly string[]).includes(
    subdomain.toLowerCase().trim(),
  );
}

/**
 * 예약어 목록 반환 (클라이언트 안내용)
 */
export function getReservedList(): readonly string[] {
  return RESERVED_SUBDOMAINS;
}
