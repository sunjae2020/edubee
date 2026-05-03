import { Request, Response, NextFunction } from "express";
import { staticDb } from "@workspace/db";
import { organisations } from "@workspace/db/schema";
import { eq, and, asc } from "drizzle-orm";
import jwt from "jsonwebtoken";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenant?: typeof organisations.$inferSelect;
    }
  }
}

const BASE_DOMAIN = process.env.APP_DOMAIN ?? "edubee.co";
const PLATFORM_SUBDOMAIN = process.env.PLATFORM_SUBDOMAIN ?? "myagency";

const SYSTEM_SUBDOMAINS = new Set([
  "www", "api", "admin", "superadmin", "app",
  "mail", "static", "cdn", "dev", "staging",
  "camp", "website", "landing", "blog", "docs",
]);

/**
 * Tenant identification middleware — guarantees multi-tenant data isolation
 *
 * ⚠️ Priority design principle:
 *   If a subdomain (tsh.edubee.co) is present, it is the **absolute authority**.
 *   The X-Organisation-Id header is only used when there is no subdomain.
 *   Reason: When a super admin logged into another tenant accesses tsh.edubee.co,
 *           allowing X-Organisation-Id (their own org) to override the subdomain (tsh)
 *           would be a critical security flaw exposing another tenant's data.
 *
 * Priority:
 *   1st: Subdomain auto-detection (URL / Cloudflare X-Subdomain header)
 *   2nd: X-Organisation-Id header (only when no subdomain — app.edubee.co etc.)
 *   3rd: JWT organisationId
 *   4th: PLATFORM_SUBDOMAIN fallback
 *   5th: Full pass-through (superadmin, auth, settings/theme etc.)
 */
export async function tenantResolver(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // ── 1st priority: Subdomain detection (most reliable tenant identifier) ──
    // When a subdomain is present, X-Organisation-Id is completely ignored.
    const xSubdomain = req.headers["x-subdomain"] as string | undefined;
    const rawHost = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0].trim()
      ?? req.hostname;
    const subdomain = (xSubdomain && !SYSTEM_SUBDOMAINS.has(xSubdomain))
      ? xSubdomain
      : extractSubdomain(rawHost, BASE_DOMAIN);

    if (subdomain && !SYSTEM_SUBDOMAINS.has(subdomain)) {
      const [org] = await staticDb
        .select()
        .from(organisations)
        .where(
          and(
            eq(organisations.subdomain as any, subdomain),
            eq(organisations.status as any, "Active")
          )
        )
        .limit(1);

      if (org) {
        req.tenantId = org.id;
        req.tenant   = org;
        return next();
      }
      // Subdomain present but no matching tenant found → 404
      res.status(404).json({ message: "Tenant not found" });
      return;
    }

    // ── 2nd priority: X-Organisation-Id header (only when no subdomain) ──
    // Used to identify org on non-tenant domains like app.edubee.co
    const headerOrgId = req.headers["x-organisation-id"] as string | undefined;

    if (headerOrgId) {
      const isUuid = UUID_RE.test(headerOrgId);
      const [org] = await staticDb
        .select()
        .from(organisations)
        .where(
          and(
            isUuid
              ? eq(organisations.id, headerOrgId)
              : eq(organisations.subdomain as any, headerOrgId),
            eq(organisations.status as any, "Active")
          )
        )
        .limit(1);

      if (org) {
        req.tenantId = org.id;
        req.tenant   = org;
        return next();
      }
      res.status(401).json({ message: "Invalid organisation" });
      return;
    }

    // ── 3rd priority: JWT organisationId ────────────────────────────
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const JWT_SECRET = process.env.JWT_SECRET;
      if (JWT_SECRET) {
        try {
          const token = authHeader.split(" ")[1];
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          const jwtOrgId = decoded?.organisationId as string | undefined;
          if (jwtOrgId && UUID_RE.test(jwtOrgId)) {
            const [org] = await staticDb
              .select()
              .from(organisations)
              .where(and(eq(organisations.id, jwtOrgId), eq(organisations.status as any, "Active")))
              .limit(1);
            if (org) {
              req.tenantId = org.id;
              req.tenant   = org;
              return next();
            }
          }
        } catch {
          // Token verification failed → fall through to next fallback
        }
      }
    }

    // ── 4th priority: PLATFORM_SUBDOMAIN fallback ─────────────────────────────
    const skipPaths = ["/superadmin", "/auth", "/public", "/settings/theme"];
    const shouldFallback = !skipPaths.some((p) => req.path.startsWith(p));

    if (shouldFallback) {
      const [platformOrg] = await staticDb
        .select()
        .from(organisations)
        .where(
          and(
            eq(organisations.subdomain as any, PLATFORM_SUBDOMAIN),
            eq(organisations.status as any, "Active")
          )
        )
        .limit(1);

      if (platformOrg) {
        req.tenantId = platformOrg.id;
        req.tenant   = platformOrg;
      } else {
        const [firstOrg] = await staticDb
          .select()
          .from(organisations)
          .where(eq(organisations.status as any, "Active"))
          .orderBy(asc(organisations.createdOn))
          .limit(1);

        if (firstOrg) {
          req.tenantId = firstOrg.id;
          req.tenant   = firstOrg;
        }
      }
    }

    // ── 5th priority: Full pass-through ────────────────────────────────────────────
    next();
  } catch (err: any) {
    if (err?.message?.includes("timeout") || err?.code === "ETIMEDOUT" || err?.code === "57014") {
      console.error("[tenantResolver] DB timeout — returning 503");
      res.status(503).json({ message: "Service temporarily unavailable. Please try again." });
      return;
    }
    console.error("[tenantResolver]", err);
    next(err);
  }
}

function extractSubdomain(host: string, baseDomain: string): string | null {
  if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+/.test(host)) {
    return null;
  }
  const cleanHost = host.split(":")[0];
  // dev: timest.localhost — treat "localhost" as a base domain equivalent
  if (cleanHost.endsWith(".localhost")) {
    const sub = cleanHost.slice(0, cleanHost.length - ".localhost".length);
    return sub && !sub.includes(".") ? sub : null;
  }
  if (!cleanHost.endsWith(`.${baseDomain}`)) {
    return null;
  }
  const sub = cleanHost.slice(0, cleanHost.length - baseDomain.length - 1);
  if (sub.includes(".")) {
    return null;
  }
  return sub || null;
}
