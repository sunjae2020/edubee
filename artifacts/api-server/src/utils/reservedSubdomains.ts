/**
 * Reserved subdomain block list
 * POST /api/settings/domain/check
 * PUT  /api/settings/domain/subdomain
 * Shared by both endpoints
 */

export const RESERVED_SUBDOMAINS: readonly string[] = [
  // ── System core ──────────────────────
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

  // ── Infrastructure ────────────────────
  "static",
  "cdn",
  "assets",
  "media",
  "upload",
  "uploads",
  "files",
  "images",

  // ── Development environments ──────────
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

  // ── Service reserved words ────────────
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

  // ── Brand reserved words ──────────────
  "edubee",
  "crm",
  "platform",
] as const;

/**
 * Check if a subdomain is reserved
 * @param subdomain - Subdomain to check (case-insensitive)
 * @returns true if reserved (not available)
 */
export function isReservedSubdomain(subdomain: string): boolean {
  return (RESERVED_SUBDOMAINS as readonly string[]).includes(
    subdomain.toLowerCase().trim(),
  );
}

/**
 * Returns the reserved word list (for client-side guidance)
 */
export function getReservedList(): readonly string[] {
  return RESERVED_SUBDOMAINS;
}
