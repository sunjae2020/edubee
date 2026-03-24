import { Router } from "express";
import { db } from "@workspace/db";
import { accounts, contacts } from "@workspace/db/schema";
import { eq, ilike, and, or, count, ne, SQL, sql } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin", "camp_coordinator"];

// GET /crm/accounts
router.get("/crm/accounts", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { account_type, status, search, page = "1", limit = "20" } =
      req.query as Record<string, string>;
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset   = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
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
        primaryContactFirstName: contacts.firstName,
        primaryContactLastName:  contacts.lastName,
      })
      .from(accounts)
      .leftJoin(contacts, eq(accounts.primaryContactId, contacts.id))
      .where(whereClause)
      .limit(limitNum)
      .offset(offset)
      .orderBy(accounts.createdOn);

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
    const { id } = req.params;
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

    if (!body.manualInput && body.accountType === "Student" && body.primaryContactId) {
      const [c] = await db.select().from(contacts).where(eq(contacts.id, body.primaryContactId as string));
      if (c) name = `Student_${c.firstName} ${c.lastName}`.trim();
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
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;

    const [existing] = await db.select().from(accounts).where(eq(accounts.id, id));
    if (!existing) return res.status(404).json({ error: "Account not found" });

    let name = (body.name as string | undefined) ?? existing.name;

    if (!body.manualInput && body.accountType === "Student" && body.primaryContactId) {
      const [c] = await db.select().from(contacts).where(eq(contacts.id, body.primaryContactId as string));
      if (c) name = `${c.firstName} ${c.lastName}`.trim();
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
    const { id } = req.params;
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
    const { id } = req.params;
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
    const { id } = req.params;
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

export default router;
