import { Router } from "express";
import { db } from "@workspace/db";
import { organisations, tenantInvitations, platformPlans } from "@workspace/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// Only admin/super_admin can access settings
const settingsAccess = [authenticate, requireRole("super_admin", "admin")];
const anyUser        = [authenticate];

// ── Helper: get the single organisation (MVP: single-tenant) ─────────────────
async function getOrg() {
  const rows = await db.select().from(organisations).limit(1);
  return rows[0] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Company Profile
// ─────────────────────────────────────────────────────────────────────────────

router.get("/company", ...settingsAccess, async (_req, res) => {
  try {
    const org = await getOrg();
    if (!org) return res.status(404).json({ error: "Organisation not found" });
    return res.json(org);
  } catch (err) {
    console.error("GET /api/settings/company", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/company", ...settingsAccess, async (req, res) => {
  try {
    const org = await getOrg();
    if (!org) return res.status(404).json({ error: "Organisation not found" });

    const {
      name, tradingName, abn, phone, companyEmail, websiteUrl, description,
      addressLine1, addressLine2, city, state, postcode, country,
      bankName, bankAccName, bankBsb, bankAccNumber, bankSwift,
      timezone, defaultCurrency, defaultLanguage,
    } = req.body;

    const [updated] = await db
      .update(organisations)
      .set({
        ...(name            !== undefined && { name }),
        ...(tradingName     !== undefined && { tradingName }),
        ...(abn             !== undefined && { abn }),
        ...(phone           !== undefined && { phone }),
        ...(companyEmail    !== undefined && { companyEmail }),
        ...(websiteUrl      !== undefined && { websiteUrl }),
        ...(description     !== undefined && { description }),
        ...(addressLine1    !== undefined && { addressLine1 }),
        ...(addressLine2    !== undefined && { addressLine2 }),
        ...(city            !== undefined && { city }),
        ...(state           !== undefined && { state }),
        ...(postcode        !== undefined && { postcode }),
        ...(country         !== undefined && { country }),
        ...(bankName        !== undefined && { bankName }),
        ...(bankAccName     !== undefined && { bankAccName }),
        ...(bankBsb         !== undefined && { bankBsb }),
        ...(bankAccNumber   !== undefined && { bankAccNumber }),
        ...(bankSwift       !== undefined && { bankSwift }),
        ...(timezone        !== undefined && { timezone }),
        ...(defaultCurrency !== undefined && { defaultCurrency }),
        ...(defaultLanguage !== undefined && { defaultLanguage }),
        modifiedOn: new Date(),
      })
      .where(eq(organisations.id, org.id))
      .returning();

    return res.json(updated);
  } catch (err) {
    console.error("PUT /api/settings/company", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Branding
// ─────────────────────────────────────────────────────────────────────────────

router.get("/branding", ...anyUser, async (_req, res) => {
  try {
    const org = await getOrg();
    if (!org) return res.status(404).json({ error: "Organisation not found" });
    return res.json({
      logoUrl:        org.logoUrl,
      faviconUrl:     org.faviconUrl,
      primaryColor:   org.primaryColor,
      secondaryColor: org.secondaryColor,
      accentColor:    org.accentColor,
      customCss:      org.customCss,
    });
  } catch (err) {
    console.error("GET /api/settings/branding", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/branding", ...settingsAccess, async (req, res) => {
  try {
    const org = await getOrg();
    if (!org) return res.status(404).json({ error: "Organisation not found" });

    const { logoUrl, faviconUrl, primaryColor, secondaryColor, accentColor, customCss } = req.body;

    const [updated] = await db
      .update(organisations)
      .set({
        ...(logoUrl        !== undefined && { logoUrl }),
        ...(faviconUrl     !== undefined && { faviconUrl }),
        ...(primaryColor   !== undefined && { primaryColor }),
        ...(secondaryColor !== undefined && { secondaryColor }),
        ...(accentColor    !== undefined && { accentColor }),
        ...(customCss      !== undefined && { customCss }),
        modifiedOn: new Date(),
      })
      .where(eq(organisations.id, org.id))
      .returning();

    return res.json(updated);
  } catch (err) {
    console.error("PUT /api/settings/branding", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Domain & Access
// ─────────────────────────────────────────────────────────────────────────────

router.get("/domain", ...settingsAccess, async (_req, res) => {
  try {
    const org = await getOrg();
    if (!org) return res.status(404).json({ error: "Organisation not found" });
    return res.json({ subdomain: org.subdomain, customDomain: org.customDomain });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/domain", ...settingsAccess, async (req, res) => {
  try {
    const org = await getOrg();
    if (!org) return res.status(404).json({ error: "Organisation not found" });

    const { subdomain, customDomain } = req.body;
    const [updated] = await db
      .update(organisations)
      .set({
        ...(subdomain    !== undefined && { subdomain }),
        ...(customDomain !== undefined && { customDomain }),
        modifiedOn: new Date(),
      })
      .where(eq(organisations.id, org.id))
      .returning();

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/domain/check", ...settingsAccess, async (req, res) => {
  try {
    const { subdomain } = req.body as { subdomain: string };
    if (!subdomain) return res.status(400).json({ error: "subdomain required" });

    const org = await getOrg();
    const rows = await db
      .select({ id: organisations.id })
      .from(organisations)
      .where(
        org
          ? and(eq(organisations.subdomain, subdomain), ne(organisations.id, org.id))
          : eq(organisations.subdomain, subdomain)
      )
      .limit(1);

    return res.json({ available: rows.length === 0, subdomain });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Plan & Billing
// ─────────────────────────────────────────────────────────────────────────────

router.get("/plan", ...anyUser, async (_req, res) => {
  try {
    const org = await getOrg();
    if (!org) return res.status(404).json({ error: "Organisation not found" });

    const userCount = await db.execute(
      sql`SELECT COUNT(*)::int AS cnt FROM users WHERE status = 'active' OR status IS NULL`
    );
    const r = (x: any) => x.rows ?? (x as any[]);
    const cnt = parseInt(r(userCount)[0]?.cnt ?? "0");

    return res.json({
      planType:       org.planType,
      planStatus:     org.planStatus,
      trialEndsAt:    org.trialEndsAt,
      subscriptionId: org.subscriptionId,
      maxUsers:       org.maxUsers,
      maxStudents:    org.maxStudents,
      features:       org.features,
      currentUsers:   cnt,
    });
  } catch (err) {
    console.error("GET /api/settings/plan", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/plans/available", ...anyUser, async (_req, res) => {
  try {
    const plans = await db
      .select()
      .from(platformPlans)
      .where(eq(platformPlans.isActive, true))
      .orderBy(platformPlans.priceMonthly);
    return res.json(plans);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Users & Invitations
// ─────────────────────────────────────────────────────────────────────────────

router.get("/users", ...settingsAccess, async (_req, res) => {
  try {
    const rows = await db.execute(
      sql`SELECT id, full_name, email, role, is_active, created_at, last_login_at
          FROM users ORDER BY full_name`
    );
    const r = (x: any) => x.rows ?? (x as any[]);
    return res.json(r(rows));
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/invitations", ...settingsAccess, async (_req, res) => {
  try {
    const org = await getOrg();
    if (!org) return res.status(404).json({ error: "Organisation not found" });

    const invs = await db
      .select()
      .from(tenantInvitations)
      .where(eq(tenantInvitations.organisationId, org.id))
      .orderBy(tenantInvitations.createdOn);

    return res.json(invs);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/invitations", ...settingsAccess, async (req, res) => {
  try {
    const org = await getOrg();
    if (!org) return res.status(404).json({ error: "Organisation not found" });

    const { email, role } = req.body as { email: string; role: string };
    if (!email || !role) return res.status(400).json({ error: "email and role are required" });

    const token     = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [inv] = await db
      .insert(tenantInvitations)
      .values({
        organisationId: org.id,
        email:          email.toLowerCase().trim(),
        role,
        token,
        invitedBy:      (req as any).user?.id ?? null,
        expiresAt,
        status:         "Pending",
      })
      .returning();

    return res.status(201).json(inv);
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "An invitation for this email already exists" });
    }
    console.error("POST /api/settings/invitations", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/invitations/:id", ...settingsAccess, async (req, res) => {
  try {
    const org = await getOrg();
    if (!org) return res.status(404).json({ error: "Organisation not found" });

    await db
      .delete(tenantInvitations)
      .where(
        and(
          eq(tenantInvitations.id, req.params.id),
          eq(tenantInvitations.organisationId, org.id)
        )
      );

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
