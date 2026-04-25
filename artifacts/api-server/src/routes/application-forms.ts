import { Router } from "express";
import { db } from "@workspace/db";
import { applicationForms, applicationFormPartners, formTermsContent } from "@workspace/db/schema";
import { accounts, organisations } from "@workspace/db/schema";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { eq, and, ilike, inArray, sql, or } from "drizzle-orm";

const router = Router();

const ADMIN_ROLES = ["super_admin", "admin", "admission", "team_manager"] as const;

router.use(authenticate);

// ── Helpers ────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function buildDisplayName(
  form: { name: string },
  account: { name: string },
  partnerParameter: string,
  orgName?: string,
): Promise<string> {
  const sitePart = orgName ? `${orgName}/` : "";
  return `${sitePart}${form.name}-${account.name}(${partnerParameter})`;
}

async function enrichPartners(rows: any[]): Promise<any[]> {
  if (rows.length === 0) return [];
  const accountIds = [...new Set(rows.map(r => r.partnerAccountId))];
  const accts = await db
    .select({ id: accounts.id, name: accounts.name, accountType: accounts.accountType, email: accounts.email })
    .from(accounts)
    .where(inArray(accounts.id, accountIds as string[]));
  const acctMap = new Map(accts.map(a => [a.id, a]));
  return rows.map(r => ({
    ...r,
    partnerName: acctMap.get(r.partnerAccountId)?.name ?? null,
    partnerType: acctMap.get(r.partnerAccountId)?.accountType ?? null,
    partnerEmail: acctMap.get(r.partnerAccountId)?.email ?? null,
  }));
}

// ── GET /api/application-forms ─────────────────────────────────────────────
router.get("/application-forms", requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { search, visibility, status, formType } = req.query as Record<string, string>;

    let query = db.select().from(applicationForms).$dynamic();
    const conds: any[] = [];
    if (search)     conds.push(ilike(applicationForms.name, `%${search}%`));
    if (visibility) conds.push(eq(applicationForms.visibility, visibility));
    if (status)     conds.push(eq(applicationForms.status, status));
    if (formType)   conds.push(eq(applicationForms.formType, formType));
    if (conds.length > 0) query = query.where(and(...conds));

    const forms = await query.orderBy(applicationForms.createdOn);

    // Enrich with partner count + source form name
    const ids = forms.map(f => f.id);
    const partnerCounts = ids.length > 0
      ? await db
          .select({ formId: applicationFormPartners.formId, cnt: sql<number>`count(*)` })
          .from(applicationFormPartners)
          .where(inArray(applicationFormPartners.formId, ids))
          .groupBy(applicationFormPartners.formId)
      : [];
    const countMap = new Map(partnerCounts.map(p => [p.formId, Number(p.cnt)]));

    const sourceIds = forms.map(f => f.sourceFormId).filter(Boolean) as string[];
    const sourceForms = sourceIds.length > 0
      ? await db.select({ id: applicationForms.id, name: applicationForms.name })
          .from(applicationForms)
          .where(inArray(applicationForms.id, sourceIds))
      : [];
    const sourceMap = new Map(sourceForms.map(f => [f.id, f.name]));

    return res.json(forms.map(f => ({
      ...f,
      partnerCount: countMap.get(f.id) ?? 0,
      sourceName: f.sourceFormId ? (sourceMap.get(f.sourceFormId) ?? null) : null,
    })));
  } catch (err) {
    console.error("[GET /api/application-forms]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/application-forms ────────────────────────────────────────────
function isDuplicateKey(err: any): boolean {
  return (
    err?.code === "23505" ||
    err?.cause?.code === "23505" ||
    String(err?.message ?? "").includes("23505") ||
    String(err?.message ?? "").toLowerCase().includes("unique")
  );
}

router.post("/application-forms", requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { name, slug: rawSlug, description, visibility, redirectUrl, organisationId, status } = req.body;
    if (!name) return res.status(400).json({ error: "Form name is required" });

    const slug = rawSlug ? toSlug(rawSlug) : toSlug(name);

    const [form] = await db.insert(applicationForms).values({
      name,
      slug,
      description: description || null,
      formType: (req.body.formType as string) || "camp_application",
      visibility: visibility || "private",
      redirectUrl: redirectUrl || null,
      organisationId: organisationId || null,
      createdBy: req.user!.id,
      status: status || "active",
    }).returning();

    return res.status(201).json(form);
  } catch (err: any) {
    if (isDuplicateKey(err)) return res.status(409).json({ error: "A form with this slug already exists" });
    console.error("[POST /api/application-forms]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/application-forms/:id ────────────────────────────────────────
router.get("/application-forms/:id", requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [form] = await db.select().from(applicationForms).where(eq(applicationForms.id, req.params.id as string)).limit(1);
    if (!form) return res.status(404).json({ error: "Form not found" });
    return res.json(form);
  } catch (err) {
    console.error("[GET /api/application-forms/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/application-forms/:id ────────────────────────────────────────
router.put("/application-forms/:id", requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { name, slug: rawSlug, description, visibility, redirectUrl, organisationId, status } = req.body;
    const slug = rawSlug ? toSlug(rawSlug) : undefined;

    const [form] = await db
      .update(applicationForms)
      .set({
        ...(name        !== undefined && { name }),
        ...(slug        !== undefined && { slug }),
        ...(description !== undefined && { description: description || null }),
        ...(req.body.formType !== undefined && { formType: req.body.formType }),
        ...(visibility  !== undefined && { visibility }),
        ...(redirectUrl !== undefined && { redirectUrl: redirectUrl || null }),
        ...(organisationId !== undefined && { organisationId: organisationId || null }),
        ...(status      !== undefined && { status }),
        modifiedOn: new Date(),
      })
      .where(eq(applicationForms.id, req.params.id as string))
      .returning();

    if (!form) return res.status(404).json({ error: "Form not found" });
    return res.json(form);
  } catch (err: any) {
    if (isDuplicateKey(err)) return res.status(409).json({ error: "A form with this slug already exists" });
    console.error("[PUT /api/application-forms/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/application-forms/:id (soft delete) ───────────────────────
router.delete("/application-forms/:id", requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const partners = await db.select().from(applicationFormPartners)
      .where(eq(applicationFormPartners.formId, req.params.id as string));

    await db.update(applicationFormPartners)
      .set({ isActive: false, modifiedOn: new Date() })
      .where(eq(applicationFormPartners.formId, req.params.id as string));

    await db.update(applicationForms)
      .set({ status: "inactive", modifiedOn: new Date() })
      .where(eq(applicationForms.id, req.params.id as string));

    return res.json({ success: true, partnerCount: partners.length });
  } catch (err) {
    console.error("[DELETE /api/application-forms/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/application-forms/:id/clone ─────────────────────────────────
router.post("/application-forms/:id/clone", requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { newName, newSlug, includePartners } = req.body;
    const [source] = await db.select().from(applicationForms).where(eq(applicationForms.id, req.params.id as string)).limit(1);
    if (!source) return res.status(404).json({ error: "Source form not found" });

    const slug = newSlug ? toSlug(newSlug) : toSlug(newName || `${source.name} Copy`);
    const [clone] = await db.insert(applicationForms).values({
      name: newName || `${source.name} - Copy`,
      slug,
      description: source.description,
      visibility: source.visibility,
      redirectUrl: source.redirectUrl,
      organisationId: source.organisationId,
      sourceFormId: source.id,
      createdBy: req.user!.id,
      status: "active",
    }).returning();

    if (includePartners) {
      const partners = await db.select().from(applicationFormPartners)
        .where(eq(applicationFormPartners.formId, source.id));
      if (partners.length > 0) {
        await db.insert(applicationFormPartners).values(
          partners.map(p => ({
            formId: clone.id,
            partnerAccountId: p.partnerAccountId,
            partnerParameter: p.partnerParameter,
            displayName: p.displayName,
            emailNotification: p.emailNotification,
            partnerEmailOverride: p.partnerEmailOverride,
            isActive: p.isActive,
          }))
        );
      }
    }

    return res.status(201).json(clone);
  } catch (err: any) {
    if (isDuplicateKey(err)) return res.status(409).json({ error: "A form with this slug already exists" });
    console.error("[POST /api/application-forms/:id/clone]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/application-forms/:formId/partners ───────────────────────────
router.get("/application-forms/:formId/partners", requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const rows = await db.select().from(applicationFormPartners)
      .where(eq(applicationFormPartners.formId, req.params.formId as string))
      .orderBy(applicationFormPartners.createdOn);
    return res.json(await enrichPartners(rows));
  } catch (err) {
    console.error("[GET partners]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/application-forms/:formId/partners ──────────────────────────
router.post("/application-forms/:formId/partners", requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { partnerAccountId, partnerParameter, displayName, emailNotification, partnerEmailOverride, isActive } = req.body;
    if (!partnerAccountId || !partnerParameter) {
      return res.status(400).json({ error: "Partner account and parameter are required" });
    }

    const [form] = await db.select().from(applicationForms).where(eq(applicationForms.id, req.params.formId as string)).limit(1);
    if (!form) return res.status(404).json({ error: "Form not found" });

    const [acct] = await db.select().from(accounts).where(eq(accounts.id, partnerAccountId)).limit(1);
    if (!acct) return res.status(404).json({ error: "Partner account not found" });

    let orgName: string | undefined;
    if (form.organisationId) {
      const [org] = await db.select({ name: organisations.name }).from(organisations)
        .where(eq(organisations.id, form.organisationId!)).limit(1);
      orgName = org?.name;
    }

    const autoDisplayName = displayName || await buildDisplayName(form, acct, partnerParameter, orgName);

    const [partner] = await db.insert(applicationFormPartners).values({
      formId: req.params.formId as string,
      partnerAccountId,
      partnerParameter,
      displayName: autoDisplayName,
      emailNotification: emailNotification || "both",
      partnerEmailOverride: partnerEmailOverride || null,
      isActive: isActive !== undefined ? isActive : true,
    }).returning();

    return res.status(201).json({ ...partner, partnerName: acct.name, partnerType: acct.accountType, partnerEmail: acct.email });
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "This partner parameter is already used in this form" });
    console.error("[POST partners]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/application-forms/:formId/partners/:id ───────────────────────
router.put("/application-forms/:formId/partners/:id", requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { partnerParameter, displayName, emailNotification, partnerEmailOverride, isActive } = req.body;

    const [partner] = await db
      .update(applicationFormPartners)
      .set({
        ...(partnerParameter   !== undefined && { partnerParameter }),
        ...(displayName        !== undefined && { displayName: displayName || null }),
        ...(emailNotification  !== undefined && { emailNotification }),
        ...(partnerEmailOverride !== undefined && { partnerEmailOverride: partnerEmailOverride || null }),
        ...(isActive           !== undefined && { isActive }),
        modifiedOn: new Date(),
      })
      .where(and(
        eq(applicationFormPartners.id, req.params.id as string),
        eq(applicationFormPartners.formId, req.params.formId as string)
      ))
      .returning();

    if (!partner) return res.status(404).json({ error: "Partner link not found" });
    return res.json(partner);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "This partner parameter is already used" });
    console.error("[PUT partners/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/application-forms/:formId/partners/:id ────────────────────
router.delete("/application-forms/:formId/partners/:id", requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    await db.delete(applicationFormPartners).where(and(
      eq(applicationFormPartners.id, req.params.id as string),
      eq(applicationFormPartners.formId, req.params.formId as string)
    ));
    return res.json({ success: true });
  } catch (err) {
    console.error("[DELETE partners/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/partner-accounts (for dropdown) ──────────────────────────────
router.get("/partner-accounts", requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { search } = req.query as Record<string, string>;
    const PARTNER_TYPES = ["Agent", "Provider", "Organisation"];
    let query = db
      .select({ id: accounts.id, name: accounts.name, accountType: accounts.accountType, email: accounts.email })
      .from(accounts)
      .where(inArray(accounts.accountType, PARTNER_TYPES))
      .$dynamic();

    if (search) query = query.where(and(
      inArray(accounts.accountType, PARTNER_TYPES),
      ilike(accounts.name, `%${search}%`)
    ));

    const rows = await query.orderBy(accounts.name).limit(100);
    return res.json(rows);
  } catch (err) {
    console.error("[GET /api/partner-accounts]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Terms Content ───────────────────────────────────────────────────────────

// GET /api/application-forms/:formId/terms  — list all language versions
router.get("/application-forms/:formId/terms", requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { formId } = req.params as Record<string, string>;
    const rows = await db
      .select()
      .from(formTermsContent)
      .where(eq(formTermsContent.formId, formId))
      .orderBy(formTermsContent.language);
    return res.json(rows);
  } catch (err) {
    console.error("[GET /api/application-forms/:formId/terms]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/application-forms/:formId/terms/:lang  — upsert a language version
router.put("/application-forms/:formId/terms/:lang", requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { formId, lang } = req.params as Record<string, string>;
    const { content, isDefault } = req.body;
    if (!content) return res.status(400).json({ error: "content is required" });

    // if setting this as default, clear others
    if (isDefault) {
      await db
        .update(formTermsContent)
        .set({ isDefault: false })
        .where(eq(formTermsContent.formId, formId));
    }

    const existing = await db
      .select({ id: formTermsContent.id })
      .from(formTermsContent)
      .where(and(eq(formTermsContent.formId, formId), eq(formTermsContent.language, lang)));

    let row;
    if (existing.length > 0) {
      [row] = await db
        .update(formTermsContent)
        .set({ content, isDefault: !!isDefault, updatedAt: new Date() })
        .where(and(eq(formTermsContent.formId, formId), eq(formTermsContent.language, lang)))
        .returning();
    } else {
      [row] = await db
        .insert(formTermsContent)
        .values({ formId, language: lang, content, isDefault: !!isDefault })
        .returning();
    }
    return res.json(row);
  } catch (err) {
    console.error("[PUT /api/application-forms/:formId/terms/:lang]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/application-forms/:formId/terms/:lang
router.delete("/application-forms/:formId/terms/:lang", requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { formId, lang } = req.params as Record<string, string>;
    await db
      .delete(formTermsContent)
      .where(and(eq(formTermsContent.formId, formId), eq(formTermsContent.language, lang)));
    return res.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/application-forms/:formId/terms/:lang]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
