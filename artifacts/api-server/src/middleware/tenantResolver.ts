import { Request, Response, NextFunction } from "express";
import { staticDb } from "@workspace/db";
import { organisations } from "@workspace/db/schema";
import { eq, and, asc } from "drizzle-orm";
import jwt from "jsonwebtoken";

// UUID 형식 여부 판별 (e.g. "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenant?: typeof organisations.$inferSelect;
    }
  }
}

// BASE_DOMAIN — .env의 APP_DOMAIN 없으면 'edubee.co' 기본값
const BASE_DOMAIN = process.env.APP_DOMAIN ?? "edubee.co";

// PLATFORM_SUBDOMAIN — 공개 랜딩페이지 및 fallback에 사용할 플랫폼 자체 테넌트
// .env에서 설정하지 않으면 'myagency' 기본값 (Edubee International Pty Ltd)
const PLATFORM_SUBDOMAIN = process.env.PLATFORM_SUBDOMAIN ?? "myagency";

// 테넌트로 처리하지 않을 시스템 서브도메인
// camp, website 등 Edubee 자체 서비스 서브도메인도 포함
const SYSTEM_SUBDOMAINS = new Set([
  "www", "api", "admin", "superadmin", "app",
  "mail", "static", "cdn", "dev", "staging",
  "camp", "website", "landing", "blog", "docs",
]);

/**
 * 테넌트 식별 미들웨어
 * 우선순위:
 *   1순위: X-Organisation-Id 헤더 (기존 방식 — Phase 1 호환)
 *   2순위: 서브도메인 자동 감지 (Phase 2 신규)
 *   3순위: MVP 폴백 — superadmin/auth 제외, PLATFORM_SUBDOMAIN(myagency)로 자동 해석
 *   4순위: 완전 통과 (superadmin, auth 등)
 */
export async function tenantResolver(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // ── 1순위: 헤더 방식 (기존 Phase 1 호환) ─────────────────
    const headerOrgId = req.headers["x-organisation-id"] as string | undefined;

    if (headerOrgId) {
      // X-Organisation-Id 헤더는 UUID(JWT에서) 또는 slug(subdomain) 양쪽 모두 지원.
      // UUID면 id 컬럼, slug면 subdomain 컬럼으로 조회. staticDb 사용 (항상 public schema).
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
      // 헤더가 있지만 유효하지 않으면 401
      res.status(401).json({ message: "Invalid organisation" });
      return;
    }

    // ── 2순위: 서브도메인 자동 감지 ──────────────────────────
    // Cloudflare Worker가 X-Subdomain 헤더로 서브도메인을 전달 (*.edubee.co 와일드카드 프록시 시)
    // X-Forwarded-Host 또는 req.hostname에서 직접 추출 (trust proxy 설정 시)
    const xSubdomain = req.headers["x-subdomain"] as string | undefined;
    const subdomain = (xSubdomain && !SYSTEM_SUBDOMAINS.has(xSubdomain))
      ? xSubdomain
      : extractSubdomain(req.hostname, BASE_DOMAIN);

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
      // 서브도메인이 있지만 매핑된 테넌트가 없으면 404
      res.status(404).json({ message: "Tenant not found" });
      return;
    }

    // ── 3순위: JWT organisationId 기반 테넌트 해석 ──────────────
    // Authorization: Bearer <token> 에서 organisationId 추출
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
          // 토큰 검증 실패 시 다음 폴백으로 진행
        }
      }
    }

    // ── 4순위: 플랫폼 폴백 ─────────────────────────────────────
    // superadmin, auth, public, settings/theme 라우트는 테넌트 컨텍스트 불필요 → 건너뜀
    // 그 외 경로는 PLATFORM_SUBDOMAIN(기본: myagency)로 자동 해석
    // → www.edubee.co, camp.edubee.co 등 Edubee 자체 서비스에서 myagency 데이터를 표시
    const skipPaths = ["/superadmin", "/auth", "/public", "/settings/theme"];
    const shouldFallback = !skipPaths.some((p) => req.path.startsWith(p));

    if (shouldFallback) {
      // PLATFORM_SUBDOMAIN으로 조직 조회
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
        // PLATFORM_SUBDOMAIN 조직이 없으면 첫 번째 Active 조직으로 폴백 (안전망)
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

    // ── 5순위: 완전 통과 ─────────────────────────────────────
    next();
  } catch (err) {
    console.error("[tenantResolver]", err);
    next(err);
  }
}

/**
 * 호스트명에서 서브도메인 추출
 * 예: 'abc.edubee.co' → 'abc'
 *     'localhost'       → null
 *     'edubee.co'      → null (루트 도메인)
 */
function extractSubdomain(host: string, baseDomain: string): string | null {
  // localhost, IP 주소 제외
  if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+/.test(host)) {
    return null;
  }

  // 포트 제거 (예: 'abc.edubee.co:3000' → 'abc.edubee.co')
  const cleanHost = host.split(":")[0];

  // baseDomain 이 포함된 경우만 처리
  if (!cleanHost.endsWith(`.${baseDomain}`)) {
    return null;
  }

  // 서브도메인 추출
  const sub = cleanHost.slice(0, cleanHost.length - baseDomain.length - 1);

  // 중첩 서브도메인 제외 (예: 'a.b.edubee.co' → null)
  if (sub.includes(".")) {
    return null;
  }

  return sub || null;
}
