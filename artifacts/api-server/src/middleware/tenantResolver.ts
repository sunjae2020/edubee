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
 * 테넌트 식별 미들웨어 — 멀티테넌트 데이터 격리 보장
 *
 * ⚠️ 우선순위 설계 원칙:
 *   서브도메인(tsh.edubee.co)이 있으면 그것이 **절대 기준**입니다.
 *   X-Organisation-Id 헤더는 서브도메인이 없을 때만 사용합니다.
 *   이유: 다른 테넌트로 로그인된 슈퍼어드민이 tsh.edubee.co 에 접속할 때
 *         X-Organisation-Id(자신의 org)가 서브도메인(tsh)을 덮어쓰면
 *         다른 테넌트의 데이터가 노출되는 중대한 보안 결함이 발생합니다.
 *
 * 우선순위:
 *   1순위: 서브도메인 자동 감지 (URL / Cloudflare X-Subdomain 헤더)
 *   2순위: X-Organisation-Id 헤더 (서브도메인 없을 때만 — app.edubee.co 등)
 *   3순위: JWT organisationId
 *   4순위: PLATFORM_SUBDOMAIN 폴백
 *   5순위: 완전 통과 (superadmin, auth, settings/theme 등)
 */
export async function tenantResolver(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // ── 1순위: 서브도메인 감지 (가장 신뢰할 수 있는 테넌트 식별자) ──
    // 서브도메인이 있으면 X-Organisation-Id를 완전히 무시합니다.
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
      // 서브도메인이 있지만 매핑된 테넌트 없음 → 404
      res.status(404).json({ message: "Tenant not found" });
      return;
    }

    // ── 2순위: X-Organisation-Id 헤더 (서브도메인 없을 때만 사용) ──
    // app.edubee.co 같은 비테넌트 도메인에서 org 식별에 사용
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

    // ── 3순위: JWT organisationId ───────────────────────────────────
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
          // 토큰 검증 실패 → 다음 폴백
        }
      }
    }

    // ── 4순위: PLATFORM_SUBDOMAIN 폴백 ─────────────────────────────
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

    // ── 5순위: 완전 통과 ────────────────────────────────────────────
    next();
  } catch (err) {
    console.error("[tenantResolver]", err);
    next(err);
  }
}

function extractSubdomain(host: string, baseDomain: string): string | null {
  if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+/.test(host)) {
    return null;
  }
  const cleanHost = host.split(":")[0];
  if (!cleanHost.endsWith(`.${baseDomain}`)) {
    return null;
  }
  const sub = cleanHost.slice(0, cleanHost.length - baseDomain.length - 1);
  if (sub.includes(".")) {
    return null;
  }
  return sub || null;
}
