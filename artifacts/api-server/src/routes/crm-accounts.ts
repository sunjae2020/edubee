import { Router } from "express";
import { db } from "@workspace/db";
import { accounts, contacts, authLogs, account_contacts } from "@workspace/db/schema";
import { eq, ilike, and, or, count, ne, asc, desc, SQL, sql, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

// ── Auto-naming helper for Student accounts ──────────────────────────────────
// Rule: LASTNAME_Firstname  (Primary Contact, LASTNAME in uppercase)
// If that name is already taken: LASTNAME_Firstname_YYMM  (signup year/month)
// e.g. KIM_Sohee_2601  (created Jan 2026)
async function buildStudentAutoName(
  contact: { firstName: string; lastName: string },
  excludeAccountId?: string,
): Promise<string> {
  const last  = (contact.lastName  ?? "").toUpperCase().trim();
  const first = (contact.firstName ?? "").trim();
  const base  = last && first ? `${last}_${first}` : last || first || "Student";

  // Check if base name is already used (by a different account)
  const [dup] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(
      and(
        eq(accounts.name, base),
        ...(excludeAccountId ? [ne(accounts.id, excludeAccountId)] : []),
      ),
    );

  if (!dup) return base;

  // Name taken — append YYMM based on current signup date
  const now  = new Date();
  const yy   = String(now.getFullYear()).slice(2);   // "26"
  const mm   = String(now.getMonth() + 1).padStart(2, "0"); // "01"
  const withDate = `${base}_${yy}${mm}`;             // e.g. "KIM_Sohee_2601"

  const [dup2] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(
      and(
        eq(accounts.name, withDate),
        ...(excludeAccountId ? [ne(accounts.id, excludeAccountId)] : []),
      ),
    );

  if (!dup2) return withDate;

  // Still taken — append a numeric counter
  for (let i = 2; i <= 99; i++) {
    const candidate = `${withDate}_${i}`;
    const [dup3] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(
          eq(accounts.name, candidate),
          ...(excludeAccountId ? [ne(accounts.id, excludeAccountId)] : []),
        ),
      );
    if (!dup3) return candidate;
  }
  return withDate; // last resort
}

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin", "camp_coordinator"];

// GET /crm/accounts
router.get("/crm/accounts", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { account_type, status, search, page = "1", limit = "20",
      sortBy = "createdOn", sortDir = "desc" } =
      req.query as Record<string, string>;
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset   = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (req.tenant) conditions.push(eq(accounts.organisationId, req.tenant.id));
    if (status)       conditions.push(eq(accounts.status, status));
    if (account_type) conditions.push(eq(accounts.accountType, account_type));
    if (search) {
      conditions.push(
        or(
          ilike(accounts.name,  `%${search}%`),
          ilike(accounts.email, `%${search}%`),
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ count: count() }).from(accounts).where(whereClause);
    const rows = await db
      .select({
        id:               accounts.id,
        name:             accounts.name,
        accountType:      accounts.accountType,
        accountCategory:  accounts.accountCategory,
        email:            accounts.email,
        phoneNumber:      accounts.phoneNumber,
        status:           accounts.status,
        ownerId:          accounts.ownerId,
        primaryContactId: accounts.primaryContactId,
        createdOn:        accounts.createdOn,
        modifiedOn:       accounts.modifiedOn,
        primaryContactFirstName:    contacts.firstName,
        primaryContactLastName:     contacts.lastName,
        primaryContactOriginalName: contacts.originalName,
        profileImageUrl:            accounts.profileImageUrl,
      })
      .from(accounts)
      .leftJoin(contacts, eq(accounts.primaryContactId, contacts.id))
      .where(whereClause)
      .limit(limitNum)
      .offset(offset)
      .orderBy(sortDir === "asc" ? asc(accounts.createdOn) : desc(accounts.createdOn));

    return res.json({
      data:  rows,
      total: Number(totalResult?.count ?? 0),
      page:  pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error("[GET /crm/accounts]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /crm/accounts/:id
router.get("/crm/accounts/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { id } = req.params as Record<string, string>;
    const [row] = await db.select().from(accounts).where(eq(accounts.id, id));
    if (!row) return res.status(404).json({ error: "Account not found" });

    let primaryContact = null;
    if (row.primaryContactId) {
      const [c] = await db.select().from(contacts).where(eq(contacts.id, row.primaryContactId));
      primaryContact = c ?? null;
    }

    let secondaryContact = null;
    if (row.secondaryContactId) {
      const [c] = await db.select().from(contacts).where(eq(contacts.id, row.secondaryContactId));
      secondaryContact = c ?? null;
    }

    let parentAccount = null;
    if (row.parentAccountId) {
      const [p] = await db.select().from(accounts).where(eq(accounts.id, row.parentAccountId));
      parentAccount = p ?? null;
    }

    return res.json({ ...row, primaryContact, secondaryContact, parentAccount });
  } catch (err) {
    console.error("[GET /crm/accounts/:id]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /crm/accounts
router.post("/crm/accounts", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;

    let name = (body.name as string | undefined) ?? "";

    if (!body.manualInput && ["Student", "Client"].includes(body.accountType as string) && body.primaryContactId) {
      const [c] = await db.select().from(contacts).where(eq(contacts.id, body.primaryContactId as string));
      if (c) name = await buildStudentAutoName(c);
    }

    if (!name) return res.status(400).json({ error: "name is required" });
    if (!body.ownerId) return res.status(400).json({ error: "ownerId is required" });
    if (!body.accountType) return res.status(400).json({ error: "accountType is required" });

    const [created] = await db.insert(accounts).values({
      name,
      manualInput:                (body.manualInput as boolean) ?? false,
      accountType:                body.accountType as string,
      accountCategory:            body.accountCategory as string | undefined,
      parentAccountId:            body.parentAccountId as string | undefined,
      primaryContactId:           body.primaryContactId as string | undefined,
      secondaryContactId:         body.secondaryContactId as string | undefined,
      phoneNumber:                body.phoneNumber as string | undefined,
      phoneNumber2:               body.phoneNumber2 as string | undefined,
      fax:                        body.fax as string | undefined,
      email:                      body.email as string | undefined,
      website:                    body.website as string | undefined,
      websiteUrl2:                body.websiteUrl2 as string | undefined,
      address:                    body.address as string | undefined,
      secondaryAddress:           body.secondaryAddress as string | undefined,
      country:                    body.country as string | undefined,
      state:                      body.state as string | undefined,
      city:                       body.city as string | undefined,
      postalCode:                 body.postalCode as string | undefined,
      abn:                        body.abn as string | undefined,
      isProductSource:            (body.isProductSource as boolean) ?? false,
      isProductProvider:          (body.isProductProvider as boolean) ?? false,
      foundYear:                  body.foundYear as string | undefined,
      totalCapacity:              body.totalCapacity as number | undefined,
      avetmissDeliveryLocationId: body.avetmissDeliveryLocationId as string | undefined,
      description:                body.description as string | undefined,
      ownerId:                    body.ownerId as string,
      status:                     (body.status as string | undefined) ?? "Active",
      organisationId:             req.tenant?.id ?? null,
    }).returning();

    return res.status(201).json(created);
  } catch (err) {
    console.error("[POST /crm/accounts]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /crm/accounts/:id
router.put("/crm/accounts/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { id } = req.params as Record<string, string>;
    const body = req.body as Record<string, unknown>;

    const [existing] = await db.select().from(accounts).where(eq(accounts.id, id));
    if (!existing) return res.status(404).json({ error: "Account not found" });

    let name = (body.name as string | undefined) ?? existing.name;

    if (!body.manualInput && ["Student", "Client"].includes(body.accountType as string) && body.primaryContactId) {
      const [c] = await db.select().from(contacts).where(eq(contacts.id, body.primaryContactId as string));
      if (c) name = await buildStudentAutoName(c, id);
    }

    const [updated] = await db.update(accounts).set({
      name,
      manualInput:                body.manualInput as boolean ?? existing.manualInput,
      accountType:                (body.accountType as string | undefined) ?? existing.accountType ?? undefined,
      accountCategory:            (body.accountCategory as string | undefined) ?? existing.accountCategory ?? undefined,
      parentAccountId:            (body.parentAccountId as string | undefined) ?? existing.parentAccountId ?? undefined,
      primaryContactId:           (body.primaryContactId as string | undefined) ?? existing.primaryContactId ?? undefined,
      secondaryContactId:         (body.secondaryContactId as string | undefined) ?? existing.secondaryContactId ?? undefined,
      phoneNumber:                (body.phoneNumber as string | undefined) ?? existing.phoneNumber ?? undefined,
      phoneNumber2:               (body.phoneNumber2 as string | undefined) ?? existing.phoneNumber2 ?? undefined,
      fax:                        (body.fax as string | undefined) ?? existing.fax ?? undefined,
      email:                      (body.email as string | undefined) ?? existing.email ?? undefined,
      website:                    (body.website as string | undefined) ?? existing.website ?? undefined,
      websiteUrl2:                (body.websiteUrl2 as string | undefined) ?? existing.websiteUrl2 ?? undefined,
      address:                    (body.address as string | undefined) ?? existing.address ?? undefined,
      secondaryAddress:           (body.secondaryAddress as string | undefined) ?? existing.secondaryAddress ?? undefined,
      country:                    (body.country as string | undefined) ?? existing.country ?? undefined,
      state:                      (body.state as string | undefined) ?? existing.state ?? undefined,
      city:                       (body.city as string | undefined) ?? existing.city ?? undefined,
      postalCode:                 (body.postalCode as string | undefined) ?? existing.postalCode ?? undefined,
      location:                   (body.location as string | undefined) ?? existing.location ?? undefined,
      abn:                        (body.abn as string | undefined) ?? existing.abn ?? undefined,
      isProductSource:            body.isProductSource as boolean ?? existing.isProductSource,
      isProductProvider:          body.isProductProvider as boolean ?? existing.isProductProvider,
      foundYear:                  (body.foundYear as string | undefined) ?? existing.foundYear ?? undefined,
      totalCapacity:              (body.totalCapacity as number | undefined) ?? existing.totalCapacity ?? undefined,
      avetmissDeliveryLocationId: (body.avetmissDeliveryLocationId as string | undefined) ?? existing.avetmissDeliveryLocationId ?? undefined,
      description:                (body.description as string | undefined) ?? existing.description ?? undefined,
      ownerId:                    (body.ownerId as string | undefined) ?? existing.ownerId,
      status:                     (body.status as string | undefined) ?? existing.status,
      modifiedOn:                 new Date(),
    }).where(eq(accounts.id, id)).returning();

    return res.json(updated);
  } catch (err) {
    console.error("[PUT /crm/accounts/:id]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /crm/accounts/:id — soft delete only
router.delete("/crm/accounts/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { id } = req.params as Record<string, string>;
    const [existing] = await db.select().from(accounts).where(eq(accounts.id, id));
    if (!existing) return res.status(404).json({ error: "Account not found" });

    await db.update(accounts).set({ status: "Inactive", modifiedOn: new Date() }).where(eq(accounts.id, id));
    return res.json({ message: "Account deactivated" });
  } catch (err) {
    console.error("[DELETE /crm/accounts/:id]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /crm/accounts/:id/contracts
router.get("/crm/accounts/:id/contracts", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { id } = req.params as Record<string, string>;
    const r = (x: any) => x.rows ?? (x as any[]);
    const rows = await db.execute(sql`
      SELECT
        c.id,
        c.contract_number,
        c.status                AS contract_status,
        c.total_amount          AS contract_amount,
        c.start_date            AS from_date,
        c.end_date              AS to_date,
        c.student_name,
        c.created_at            AS created_on,
        u.full_name             AS owner_name
      FROM contracts c
      LEFT JOIN users u ON u.id = c.owner_id
      WHERE c.account_id = ${id}::uuid
      ORDER BY c.created_at DESC
    `);
    return res.json(r(rows));
  } catch (err) {
    console.error("[GET /crm/accounts/:id/contracts]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /crm/accounts/:id/leads
router.get("/crm/accounts/:id/leads", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { id } = req.params as Record<string, string>;
    const r = (x: any) => x.rows ?? (x as any[]);
    const rows = await db.execute(sql`
      SELECT
        l.id,
        l.lead_ref_number,
        l.full_name,
        l.status                AS lead_status,
        l.inquiry_type,
        l.interested_in,
        l.nationality,
        l.source,
        l.created_at            AS created_on,
        u.full_name             AS owner_name
      FROM leads l
      LEFT JOIN users u ON u.id = l.assigned_staff_id
      WHERE l.account_id = ${id}::uuid
      ORDER BY l.created_at DESC
    `);
    return res.json(r(rows));
  } catch (err) {
    console.error("[GET /crm/accounts/:id/leads]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─────────────────────────────────────────────────────────────
// PORTAL ACCESS MANAGEMENT
// ─────────────────────────────────────────────────────────────

// GET /crm/accounts/:id/portal
router.get("/crm/accounts/:id/portal", authenticate, requireRole("super_admin", "admin"), async (req, res) => {
  try {
    const [row] = await db.select({
      portalAccess:        accounts.portalAccess,
      portalRole:          accounts.portalRole,
      portalEmail:         accounts.portalEmail,
      portalLastLoginAt:   accounts.portalLastLoginAt,
      portalMustChangePw:  accounts.portalMustChangePw,
      portalLockedUntil:   accounts.portalLockedUntil,
      portalFailedAttempts:accounts.portalFailedAttempts,
      portalInvitedAt:     accounts.portalInvitedAt,
      portalTempPwExpires: accounts.portalTempPwExpires,
    }).from(accounts).where(eq(accounts.id, req.params.id as string));

    if (!row) return res.status(404).json({ error: "Account not found" });

    return res.json({
      success: true,
      data: {
        ...row,
        hasTempPassword: !!(row.portalTempPwExpires && new Date(row.portalTempPwExpires) > new Date()),
      },
    });
  } catch (err) {
    console.error("[GET /crm/accounts/:id/portal]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /crm/accounts/:id/portal — update portal access settings
router.patch("/crm/accounts/:id/portal", authenticate, requireRole("super_admin", "admin"), async (req, res) => {
  try {
    const { id } = req.params as Record<string, string>;
    const { portalAccess, portalRole, portalEmail } = req.body as {
      portalAccess?: boolean; portalRole?: string; portalEmail?: string;
    };

    if (portalEmail) {
      const [existing] = await db.select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.portalEmail as any, portalEmail.toLowerCase().trim()))
        .limit(1);
      if (existing && existing.id !== id) {
        return res.status(400).json({ success: false, error: "This email is already used by another portal account." });
      }
    }

    const updates: Record<string, unknown> = { modifiedOn: new Date() };
    if (portalAccess !== undefined) updates.portalAccess = portalAccess;
    if (portalRole !== undefined)  updates.portalRole = portalRole;
    if (portalEmail !== undefined) updates.portalEmail = portalEmail.toLowerCase().trim();

    await db.update(accounts).set(updates as any).where(eq(accounts.id, id));
    return res.json({ success: true });
  } catch (err) {
    console.error("[PATCH /crm/accounts/:id/portal]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /crm/accounts/:id/portal/temp-password — generate one-time temp password
router.post("/crm/accounts/:id/portal/temp-password", authenticate, requireRole("super_admin", "admin"), async (req, res) => {
  try {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    const tempPw = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const expires = new Date(Date.now() + 72 * 60 * 60 * 1000);

    await db.update(accounts).set({
      portalTempPassword:  tempPw,
      portalTempPwExpires: expires,
      portalMustChangePw:  true,
      modifiedOn:          new Date(),
    } as any).where(eq(accounts.id, req.params.id as string));

    return res.json({
      success: true,
      tempPassword: tempPw,
      expiresAt: expires,
      message: "Copy this password and share it with the portal user. It expires in 72 hours.",
    });
  } catch (err) {
    console.error("[POST /crm/accounts/:id/portal/temp-password]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /crm/accounts/:id/portal/set-password — super admin direct password set
router.post("/crm/accounts/:id/portal/set-password", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { newPassword } = req.body as { newPassword: string };
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, error: "Password must be at least 8 characters." });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await db.update(accounts).set({
      portalPasswordHash:  hash,
      portalTempPassword:  null,
      portalTempPwExpires: null,
      portalMustChangePw:  false,
      portalFailedAttempts: 0,
      portalLockedUntil:   null,
      modifiedOn:          new Date(),
    } as any).where(eq(accounts.id, req.params.id as string));

    return res.json({ success: true, message: "Portal password set successfully." });
  } catch (err) {
    console.error("[POST /crm/accounts/:id/portal/set-password]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /crm/accounts/:id/portal/unlock — unlock a locked portal account
router.post("/crm/accounts/:id/portal/unlock", authenticate, requireRole("super_admin", "admin"), async (req, res) => {
  try {
    await db.update(accounts).set({
      portalFailedAttempts: 0,
      portalLockedUntil:    null,
      modifiedOn:           new Date(),
    } as any).where(eq(accounts.id, req.params.id as string));
    return res.json({ success: true });
  } catch (err) {
    console.error("[POST /crm/accounts/:id/portal/unlock]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /crm/accounts-search — lightweight contact list for lookups
router.get("/crm/accounts-search", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { search, exclude } = req.query as Record<string, string>;
    const conditions: SQL[] = [eq(accounts.status, "Active")];
    if (search) conditions.push(ilike(accounts.name, `%${search}%`));
    if (exclude) conditions.push(ne(accounts.id, exclude));

    const rows = await db
      .select({ id: accounts.id, name: accounts.name, accountType: accounts.accountType })
      .from(accounts)
      .where(and(...conditions))
      .limit(20);
    return res.json(rows);
  } catch (err) {
    console.error("[GET /crm/accounts-search]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Account Additional Contacts ─────────────────────────────────────────────

// GET: list additional contacts linked to an account
router.get("/crm/accounts/:id/contacts", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const rows = await db
      .select({
        linkId:      account_contacts.id,
        role:        account_contacts.role,
        createdOn:   account_contacts.createdOn,
        id:          contacts.id,
        firstName:   contacts.firstName,
        lastName:    contacts.lastName,
        englishName: contacts.englishName,
        originalName:contacts.originalName,
        email:       contacts.email,
        mobile:      contacts.mobile,
        nationality: contacts.nationality,
        dob:         contacts.dob,
        snsType:     contacts.snsType,
        snsId:       contacts.snsId,
      })
      .from(account_contacts)
      .innerJoin(contacts, eq(account_contacts.contactId, contacts.id))
      .where(eq(account_contacts.accountId, req.params.id as string))
      .orderBy(account_contacts.createdOn);
    return res.json(rows);
  } catch (err) {
    console.error("[GET /crm/accounts/:id/contacts]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST: link a contact to an account
router.post("/crm/accounts/:id/contacts", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { contactId, role } = req.body;
    if (!contactId) return res.status(400).json({ error: "contactId is required" });

    // Prevent duplicates
    const [existing] = await db
      .select()
      .from(account_contacts)
      .where(and(eq(account_contacts.accountId, req.params.id as string), eq(account_contacts.contactId, contactId)));
    if (existing) return res.status(409).json({ error: "Contact already linked" });

    const [created] = await db.insert(account_contacts).values({
      accountId: req.params.id as string,
      contactId,
      role: role || null,
    }).returning();
    return res.status(201).json(created);
  } catch (err) {
    console.error("[POST /crm/accounts/:id/contacts]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE: unlink a contact from an account
router.delete("/crm/accounts/:id/contacts/:linkId", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    await db.delete(account_contacts)
      .where(and(eq(account_contacts.id, req.params.linkId as string), eq(account_contacts.accountId, req.params.id as string)));
    return res.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /crm/accounts/:id/contacts/:linkId]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /crm/accounts/:id/profile-image  { dataUrl: string }
router.patch("/crm/accounts/:id/profile-image", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { dataUrl } = req.body;
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
      return res.status(400).json({ error: "dataUrl is required and must be a valid image data URL" });
    }
    const [updated] = await db.update(accounts)
      .set({ profileImageUrl: dataUrl, modifiedOn: new Date() })
      .where(eq(accounts.id, req.params.id as string))
      .returning();

    if (!updated) return res.status(404).json({ error: "Account not found" });
    return res.json(updated);
  } catch (err) {
    console.error("[PATCH /crm/accounts/:id/profile-image]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/crm/accounts/bulk  (super_admin soft/permanent delete) ──────
router.delete("/crm/accounts/bulk", authenticate, async (req, res) => {
  if ((req.user as any)?.role !== "super_admin") return res.status(403).json({ error: "Forbidden" });
  try {
    const { ids, soft } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids array required" });
    if (soft) {
      await db.update(accounts).set({ status: "Deleted", modifiedOn: new Date() }).where(inArray(accounts.id, ids));
      return res.json({ success: true, updated: ids.length });
    }
    await db.delete(accounts).where(inArray(accounts.id, ids));
    return res.json({ success: true, deleted: ids.length });
  } catch (err) {
    console.error("[DELETE /api/crm/accounts/bulk]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
