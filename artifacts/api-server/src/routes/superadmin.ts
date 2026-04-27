import { Router } from "express";
import { db, staticDb } from "@workspace/db";
import { organisations, platformPlans } from "@workspace/db/schema";
import { eq, ilike, sql, desc } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { superAdminOnly } from "../middleware/superAdminOnly.js";
import { onboardTenant, getSeedStatus } from "../services/onboardingService.js";
import { getDefaultFeatures } from "../middleware/featureGuard.js";
import { sendTenantCreatedEmail } from "../services/emailService.js";
import { exec } from "child_process";
import { promisify } from "util";
import {
  provisionTenantSchema,
  migrateTenantDataFromPublic,
  checkTenantSchemaExists,
  listTenantSchemas,
} from "../seeds/provision-tenant.js";
import { runWithTenantSchema } from "@workspace/db/tenant-context";

const execAsync = promisify(exec);

const router = Router();
const guard  = [authenticate, superAdminOnly];

// ─────────────────────────────────────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────────────────────────────────────

router.get("/superadmin/stats", ...guard, async (_req, res) => {
  try {
    const [tenantsRes, usersRes, studentsRes] = await Promise.all([
      db.execute(sql`
        SELECT
          COUNT(*)::int                                                             AS total_tenants,
          COUNT(*) FILTER (WHERE status = 'Active')::int                           AS active_tenants,
          COUNT(*) FILTER (WHERE plan_status = 'trial')::int                       AS trial_tenants,
          COUNT(*) FILTER (WHERE plan_type = 'starter')::int                       AS starter_count,
          COUNT(*) FILTER (WHERE plan_type = 'professional')::int                  AS professional_count,
          COUNT(*) FILTER (WHERE plan_type = 'enterprise')::int                    AS enterprise_count
        FROM organisations
      `),
      db.execute(sql`SELECT COUNT(*)::int AS cnt FROM accounts`),
      db.execute(sql`SELECT COUNT(*)::int AS cnt FROM accounts WHERE account_type = 'Student'`),
    ]);

    const r   = (x: any) => x.rows ?? (x as any[]);
    const t   = r(tenantsRes)[0]  ?? {};
    const u   = r(usersRes)[0]    ?? {};
    const s   = r(studentsRes)[0] ?? {};

    return res.json({
      totalTenants:       t.total_tenants    ?? 0,
      activeTenants:      t.active_tenants   ?? 0,
      trialTenants:       t.trial_tenants    ?? 0,
      planDistribution: {
        starter:          t.starter_count      ?? 0,
        professional:     t.professional_count ?? 0,
        enterprise:       t.enterprise_count   ?? 0,
      },
      totalAccounts: u.cnt ?? 0,
      totalStudents: s.cnt ?? 0,
    });
  } catch (err) {
    console.error("GET /api/superadmin/stats", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Tenants
// ─────────────────────────────────────────────────────────────────────────────

router.get("/superadmin/tenants", ...guard, async (req, res) => {
  try {
    const { search = "", page = "1", pageSize = "20" } = req.query as Record<string, string>;
    const pageNum     = Math.max(1, parseInt(page));
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize)));
    const offsetNum   = (pageNum - 1) * pageSizeNum;

    const conds = search
      ? sql`WHERE (o.name ILIKE ${"%" + search + "%"} OR o.subdomain ILIKE ${"%" + search + "%"} OR o.owner_email ILIKE ${"%" + search + "%"})`
      : sql``;

    const [countRes, rowsRes] = await Promise.all([
      db.execute(sql`SELECT COUNT(*)::int AS total FROM organisations o ${conds}`),
      db.execute(sql`
        SELECT
          o.id, o.name, o.trading_name, o.subdomain, o.custom_domain,
          o.plan_type, o.plan_status, o.status, o.trial_ends_at,
          o.max_users, o.max_students, o.owner_email,
          o.created_on, o.onboarded_at, o.last_login_at,
          (SELECT COUNT(*)::int FROM users) AS user_count
        FROM organisations o
        ${conds}
        ORDER BY o.created_on DESC
        LIMIT ${pageSizeNum} OFFSET ${offsetNum}
      `),
    ]);

    const r     = (x: any) => x.rows ?? (x as any[]);
    const total = parseInt(r(countRes)[0]?.total ?? "0");

    return res.json({
      data:       r(rowsRes),
      pagination: {
        total,
        page:       pageNum,
        pageSize:   pageSizeNum,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    });
  } catch (err) {
    console.error("GET /api/superadmin/tenants", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/superadmin/tenants/:id", ...guard, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(organisations)
      .where(eq(organisations.id, req.params.id as string))
      .limit(1);

    if (!rows.length) return res.status(404).json({ error: "Tenant not found" });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/superadmin/tenants", ...guard, async (req, res) => {
  try {
    const { name, subdomain, ownerEmail, planType, planStatus } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Company name is required" });

    // Subdomain uniqueness check
    if (subdomain?.trim()) {
      const exists = await db
        .select({ id: organisations.id })
        .from(organisations)
        .where(eq(organisations.subdomain, subdomain.trim().toLowerCase()))
        .limit(1);
      if (exists.length) return res.status(409).json({ error: "Subdomain already in use" });
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const [created] = await db
      .insert(organisations)
      .values({
        name:       name.trim(),
        subdomain:  subdomain?.trim().toLowerCase() || null,
        ownerEmail: ownerEmail?.trim() || null,
        planType:   planType   ?? "starter",
        planStatus: planStatus ?? "trial",
        trialEndsAt,
        features:   getDefaultFeatures(planType ?? "starter"),
        status: "Active",
      })
      .returning();

    // ── 테넌트 PostgreSQL Schema 자동 프로비저닝 ────────────────────────────
    // 신규 테넌트는 자신만의 격리된 schema에서 시작 (빈 상태로 초기화)
    if (created.subdomain) {
      try {
        await provisionTenantSchema(created.subdomain);
        console.log(`[Schema] Provisioned schema "${created.subdomain}" for new tenant`);
      } catch (provisionErr) {
        // Non-fatal: public schema fallback으로 동작 가능
        console.warn(`[Schema WARN] Could not provision schema for "${created.subdomain}":`, provisionErr);
      }
    }

    // Run onboarding seed in tenant schema context (tax_rates, product_groups, etc.)
    try {
      if (created.subdomain) {
        await runWithTenantSchema(created.subdomain, () => onboardTenant(created.id));
      } else {
        await onboardTenant(created.id);
      }
    } catch (seedErr) {
      // Soft Delete the partially-created organisation
      await db
        .update(organisations)
        .set({ status: "Inactive", modifiedOn: new Date() })
        .where(eq(organisations.id, created.id));

      console.error("[ONBOARDING FAILED] organisationId:", created.id, seedErr);

      return res.status(500).json({
        success: false,
        message: "Tenant onboarding failed. Please try again.",
        organisationId: created.id,
        ...(process.env.NODE_ENV === "development" && {
          error: (seedErr as Error).message,
        }),
      });
    }

    // Send tenant creation email to owner — does NOT affect the 201 response
    if (created.ownerEmail) {
      await sendTenantCreatedEmail({
        toEmail:   created.ownerEmail,
        orgName:   created.name,
        subdomain: created.subdomain ?? '',
        planType:  created.planType  ?? 'starter',
      });
    }

    console.log(`[Invite] ${ownerEmail ?? "—"} → ${subdomain ?? "—"}.edubee.co`);
    return res.status(201).json(created);
  } catch (err) {
    console.error("POST /api/superadmin/tenants", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Seed Status
// ─────────────────────────────────────────────────────────────────────────────

router.get("/superadmin/tenants/:id/seed-status", ...guard, async (req, res) => {
  try {
    const org = await db
      .select({ id: organisations.id })
      .from(organisations)
      .where(eq(organisations.id, req.params.id as string))
      .limit(1);
    if (!org.length) return res.status(404).json({ error: "Tenant not found" });

    const status = await getSeedStatus(req.params.id as string);
    return res.json(status);
  } catch (err) {
    console.error("GET /api/superadmin/tenants/:id/seed-status", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Re-seed — run onboarding seed for an existing tenant (idempotent)
// ─────────────────────────────────────────────────────────────────────────────

router.post("/superadmin/tenants/:id/re-seed", ...guard, async (req, res) => {
  try {
    const [org] = await db
      .select({ id: organisations.id, subdomain: organisations.subdomain })
      .from(organisations)
      .where(eq(organisations.id, req.params.id as string))
      .limit(1);
    if (!org) return res.status(404).json({ error: "Tenant not found" });

    // Run in tenant schema context so seed data goes to the correct schema
    if (org.subdomain) {
      await runWithTenantSchema(org.subdomain, () => onboardTenant(org.id));
    } else {
      await onboardTenant(org.id);
    }

    const status = await getSeedStatus(req.params.id as string);
    return res.json({ success: true, message: "Re-seed completed in tenant schema", ...status });
  } catch (err) {
    console.error("POST /api/superadmin/tenants/:id/re-seed", err);
    return res.status(500).json({ error: "Re-seed failed" });
  }
});

router.put("/superadmin/tenants/:id", ...guard, async (req, res) => {
  try {
    const {
      name, tradingName, subdomain, customDomain, ownerEmail,
      planType, planStatus, status, maxUsers, maxStudents, trialEndsAt, features,
      logoUrl, faviconUrl, primaryColor, secondaryColor, accentColor,
    } = req.body;

    // Subdomain uniqueness check (skip if unchanged)
    if (subdomain !== undefined && subdomain !== null && subdomain !== "") {
      const exists = await db
        .select({ id: organisations.id })
        .from(organisations)
        .where(eq(organisations.subdomain, subdomain.trim().toLowerCase()))
        .limit(1);
      if (exists.length && exists[0].id !== req.params.id as string) {
        return res.status(409).json({ error: "Subdomain already in use" });
      }
    }

    const [updated] = await db
      .update(organisations)
      .set({
        ...(name         !== undefined && { name }),
        ...(tradingName  !== undefined && { tradingName }),
        ...(subdomain    !== undefined && { subdomain: subdomain?.trim().toLowerCase() || null }),
        ...(customDomain !== undefined && { customDomain: customDomain?.trim() || null }),
        ...(ownerEmail   !== undefined && { ownerEmail: ownerEmail?.trim() || null }),
        ...(planType     !== undefined && { planType }),
        ...(planStatus   !== undefined && { planStatus }),
        ...(status       !== undefined && { status }),
        ...(maxUsers     !== undefined && { maxUsers }),
        ...(maxStudents  !== undefined && { maxStudents }),
        ...(trialEndsAt  !== undefined && { trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null }),
        // planType 변경 시 features도 자동 갱신 (명시적 features가 없는 경우에만)
        ...(planType !== undefined && features === undefined && {
          features: getDefaultFeatures(planType),
        }),
        ...(features !== undefined && { features }),
        ...(logoUrl        !== undefined && { logoUrl }),
        ...(faviconUrl     !== undefined && { faviconUrl }),
        ...(primaryColor   !== undefined && { primaryColor }),
        ...(secondaryColor !== undefined && { secondaryColor }),
        ...(accentColor    !== undefined && { accentColor }),
        modifiedOn: new Date(),
      })
      .where(eq(organisations.id, req.params.id as string))
      .returning();

    if (!updated) return res.status(404).json({ error: "Tenant not found" });
    return res.json(updated);
  } catch (err) {
    console.error("PUT /api/superadmin/tenants/:id", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Plans
// ─────────────────────────────────────────────────────────────────────────────

router.get("/superadmin/plans", ...guard, async (_req, res) => {
  try {
    const plans = await staticDb
      .select()
      .from(platformPlans)
      .orderBy(platformPlans.sortOrder, platformPlans.priceMonthly);
    return res.json(plans);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/superadmin/plans", ...guard, async (req, res) => {
  try {
    const {
      name, code, priceMonthly, priceAnnually,
      maxUsers, maxStudents, maxBranches, storageGb,
      featureCommission, featureVisa, featureServiceModules,
      featureMultiBranch, featureAiAssistant, featureAccounting,
      featureAvetmiss, featureCamp, featureFinance,
      featureApiAccess, featureWhiteLabel,
      features, isPopular, isActive, sortOrder,
    } = req.body;

    const [plan] = await staticDb
      .insert(platformPlans)
      .values({
        name, code, priceMonthly, priceAnnually,
        maxUsers, maxStudents, maxBranches, storageGb,
        featureCommission, featureVisa, featureServiceModules,
        featureMultiBranch, featureAiAssistant, featureAccounting,
        featureAvetmiss, featureCamp, featureFinance,
        featureApiAccess, featureWhiteLabel,
        features, isPopular, isActive: isActive ?? true,
        sortOrder: sortOrder ?? 99,
      })
      .returning();

    return res.status(201).json(plan);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "Plan code already exists" });
    console.error("POST /superadmin/plans", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/superadmin/plans/:id", ...guard, async (req, res) => {
  try {
    const {
      name, priceMonthly, priceAnnually,
      maxUsers, maxStudents, maxBranches, storageGb,
      featureCommission, featureVisa, featureServiceModules,
      featureMultiBranch, featureAiAssistant, featureAccounting,
      featureAvetmiss, featureCamp, featureFinance,
      featureApiAccess, featureWhiteLabel,
      features, isPopular, isActive, status, sortOrder,
    } = req.body;

    const [updated] = await staticDb
      .update(platformPlans)
      .set({
        ...(name                  !== undefined && { name }),
        ...(priceMonthly          !== undefined && { priceMonthly }),
        ...(priceAnnually         !== undefined && { priceAnnually }),
        ...(maxUsers              !== undefined && { maxUsers }),
        ...(maxStudents           !== undefined && { maxStudents }),
        ...(maxBranches           !== undefined && { maxBranches }),
        ...(storageGb             !== undefined && { storageGb }),
        ...(featureCommission     !== undefined && { featureCommission }),
        ...(featureVisa           !== undefined && { featureVisa }),
        ...(featureServiceModules !== undefined && { featureServiceModules }),
        ...(featureMultiBranch    !== undefined && { featureMultiBranch }),
        ...(featureAiAssistant    !== undefined && { featureAiAssistant }),
        ...(featureAccounting     !== undefined && { featureAccounting }),
        ...(featureAvetmiss       !== undefined && { featureAvetmiss }),
        ...(featureCamp           !== undefined && { featureCamp }),
        ...(featureFinance        !== undefined && { featureFinance }),
        ...(featureApiAccess      !== undefined && { featureApiAccess }),
        ...(featureWhiteLabel     !== undefined && { featureWhiteLabel }),
        ...(features              !== undefined && { features }),
        ...(isPopular             !== undefined && { isPopular }),
        ...(isActive              !== undefined && { isActive }),
        ...(status                !== undefined && { status }),
        ...(sortOrder             !== undefined && { sortOrder }),
        modifiedOn: new Date(),
      })
      .where(eq(platformPlans.id, req.params.id as string))
      .returning();

    if (!updated) return res.status(404).json({ error: "Plan not found" });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Stripe Settings (Price IDs per plan + key status)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/superadmin/stripe-settings
router.get("/superadmin/stripe-settings", ...guard, async (_req, res) => {
  try {
    const plans = await db
      .select({
        id:                 platformPlans.id,
        code:               platformPlans.code,
        name:               platformPlans.name,
        priceMonthly:       platformPlans.priceMonthly,
        priceAnnually:      platformPlans.priceAnnually,
        stripePriceMonthly: platformPlans.stripePriceMonthly,
        stripePriceAnnually:platformPlans.stripePriceAnnually,
        isActive:           platformPlans.isActive,
      })
      .from(platformPlans)
      .orderBy(platformPlans.sortOrder);

    const appUrl     = process.env.APP_URL ?? '';
    const webhookUrl = `${appUrl}/api/webhook/stripe`;

    return res.json({
      plans,
      keyStatus: {
        secretKey:     !!process.env.STRIPE_SECRET_KEY,
        webhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      },
      webhookUrl,
    });
  } catch (err) {
    console.error("[GET /superadmin/stripe-settings]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /api/superadmin/stripe-settings  — update Price IDs in DB
router.put("/superadmin/stripe-settings", ...guard, async (req, res) => {
  try {
    const { plans } = req.body as {
      plans: Array<{ id: string; stripePriceMonthly: string; stripePriceAnnually: string }>;
    };

    if (!Array.isArray(plans)) return res.status(400).json({ error: "plans array required" });

    for (const p of plans) {
      await staticDb.update(platformPlans)
        .set({
          stripePriceMonthly:  p.stripePriceMonthly  || null,
          stripePriceAnnually: p.stripePriceAnnually || null,
        })
        .where(eq(platformPlans.id, p.id));
    }

    return res.json({ success: true, updated: plans.length });
  } catch (err) {
    console.error("[PUT /superadmin/stripe-settings]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Schema 관리 (프로비저닝 & 백업)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/superadmin/tenant-schemas — 존재하는 테넌트 schema 목록
router.get("/superadmin/tenant-schemas", ...guard, async (_req, res) => {
  try {
    const schemas = await listTenantSchemas();
    return res.json({ schemas });
  } catch (err) {
    console.error("[GET /superadmin/tenant-schemas]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/superadmin/tenants/:slug/provision — 테넌트 schema 프로비저닝
router.post("/superadmin/tenants/:slug/provision", ...guard, async (req, res) => {
  const { slug } = req.params as Record<string, string>;
  if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
    return res.status(400).json({ error: "Invalid tenant slug" });
  }
  try {
    const alreadyExists = await checkTenantSchemaExists(slug);
    await provisionTenantSchema(slug);
    return res.json({
      success: true,
      slug,
      created: !alreadyExists,
      message: alreadyExists
        ? `Schema "${slug}" already existed — tables synced`
        : `Schema "${slug}" created with all tenant tables`,
    });
  } catch (err: any) {
    console.error(`[POST /superadmin/tenants/${slug}/provision]`, err);
    return res.status(500).json({ error: err.message ?? "Provision failed" });
  }
});

// POST /api/superadmin/tenants/:slug/migrate — public → tenant schema 데이터 이전
router.post("/superadmin/tenants/:slug/migrate", ...guard, async (req, res) => {
  const { slug } = req.params as Record<string, string>;
  const { orgId } = req.body as { orgId?: string };

  if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
    return res.status(400).json({ error: "Invalid tenant slug" });
  }
  if (!orgId) {
    return res.status(400).json({ error: "orgId is required" });
  }

  try {
    const schemaExists = await checkTenantSchemaExists(slug);
    if (!schemaExists) {
      return res.status(404).json({ error: `Schema "${slug}" does not exist. Provision it first.` });
    }
    const results = await migrateTenantDataFromPublic(slug, orgId);
    const totalMigrated = results.reduce((sum, r) => sum + r.rowsMigrated, 0);
    return res.json({
      success: true,
      slug,
      orgId,
      totalMigrated,
      tables: results,
    });
  } catch (err: any) {
    console.error(`[POST /superadmin/tenants/${slug}/migrate]`, err);
    return res.status(500).json({ error: err.message ?? "Migration failed" });
  }
});

// POST /api/superadmin/tenants/:slug/reset — 테넌트 운영 데이터 전체 삭제 후 마스터 데이터 재시드
router.post("/superadmin/tenants/:slug/reset", ...guard, async (req, res) => {
  const { slug } = req.params as Record<string, string>;
  if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
    return res.status(400).json({ error: "Invalid tenant slug" });
  }

  try {
    const schemaExists = await checkTenantSchemaExists(slug);
    if (!schemaExists) {
      return res.status(404).json({ error: `Schema "${slug}" does not exist. Provision it first.` });
    }

    // 1. 해당 schema의 모든 테이블 목록 조회
    const client = await (await import("@workspace/db")).pool.connect();
    let tablesTruncated: string[] = [];
    try {
      const tablesResult = await client.query<{ tablename: string }>(
        `SELECT tablename FROM pg_tables WHERE schemaname = $1 ORDER BY tablename`,
        [slug]
      );
      const tables = tablesResult.rows.map(r => r.tablename);

      if (tables.length > 0) {
        // TRUNCATE … RESTART IDENTITY CASCADE — 모든 데이터 삭제 + 시퀀스 초기화
        const qualified = tables.map(t => `"${slug}"."${t}"`).join(", ");
        await client.query(`TRUNCATE ${qualified} RESTART IDENTITY CASCADE`);
        tablesTruncated = tables;
      }
    } finally {
      client.release();
    }

    // 2. 마스터 데이터(세금 코드, CoA, 결제 수단 등) 재시드
    const [org] = await db
      .select({ id: organisations.id })
      .from(organisations)
      .where(eq(organisations.subdomain as any, slug))
      .limit(1);

    if (org) {
      await runWithTenantSchema(slug, () => onboardTenant(org.id));
    }

    return res.json({
      success: true,
      slug,
      tablesCleared: tablesTruncated.length,
      tables: tablesTruncated,
      message: `Schema "${slug}" data cleared (${tablesTruncated.length} tables). Master data re-seeded.`,
    });
  } catch (err: any) {
    console.error(`[POST /superadmin/tenants/${slug}/reset]`, err);
    return res.status(500).json({ error: err.message ?? "Reset failed" });
  }
});

// GET /api/superadmin/tenants/:slug/backup — pg_dump → SQL 파일 다운로드
// 해당 테넌트 schema 전체를 SQL 파일로 스트리밍 다운로드
router.get("/superadmin/tenants/:slug/backup", ...guard, async (req, res) => {
  const { slug } = req.params as Record<string, string>;

  if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
    return res.status(400).json({ error: "Invalid tenant slug" });
  }

  try {
    const schemaExists = await checkTenantSchemaExists(slug);
    if (!schemaExists) {
      return res.status(404).json({ error: `Schema "${slug}" does not exist` });
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return res.status(500).json({ error: "DATABASE_URL not configured" });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename  = `${slug}_backup_${timestamp}.sql`;

    res.setHeader("Content-Type", "application/sql");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // DATABASE_URL을 파싱하여 pg_dump 환경변수로 전달 (패스워드를 커맨드라인에 노출하지 않음)
    const parsedUrl = new URL(dbUrl);
    const pgEnv = {
      ...process.env,
      PGHOST:     parsedUrl.hostname,
      PGPORT:     parsedUrl.port || "5432",
      PGUSER:     parsedUrl.username,
      PGPASSWORD: decodeURIComponent(parsedUrl.password),
      PGDATABASE: parsedUrl.pathname.replace(/^\//, ""),
    };

    // pg_dump: --schema=slug 로 해당 테넌트 schema만 덤프
    // --no-owner: 소유자 정보 제외 (이식성)
    // --no-privileges: 권한 정보 제외
    const cmd = `pg_dump --schema="${slug}" --no-owner --no-privileges`;

    const { stdout, stderr } = await execAsync(cmd, {
      env: pgEnv,
      maxBuffer: 500 * 1024 * 1024, // 500MB
      timeout: 120_000,              // 2분
    });

    if (stderr && !stderr.includes("WARNING")) {
      console.error(`[pg_dump stderr for ${slug}]:`, stderr);
    }

    return res.send(stdout);
  } catch (err: any) {
    console.error(`[GET /superadmin/tenants/${slug}/backup]`, err);
    return res.status(500).json({ error: err.message ?? "Backup failed" });
  }
});

// POST /api/superadmin/stripe-settings/test — verify STRIPE_SECRET_KEY
router.post("/superadmin/stripe-settings/test", ...guard, async (_req, res) => {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return res.status(400).json({ success: false, error: "STRIPE_SECRET_KEY is not set" });

    // Dynamically import Stripe to avoid crashing if key is missing at startup
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });

    const account = await stripe.accounts.retrieve();
    return res.json({
      success: true,
      accountId:    account.id,
      displayName:  (account as any).settings?.dashboard?.display_name ?? null,
      country:      account.country ?? null,
      email:        (account as any).email ?? null,
    });
  } catch (err: any) {
    console.error("[POST /superadmin/stripe-settings/test]", err);
    const message = err?.raw?.message ?? err?.message ?? "Stripe connection failed";
    return res.status(400).json({ success: false, error: message });
  }
});

export default router;
