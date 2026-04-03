import { Router } from "express";
import { db } from "@workspace/db";
import { contacts, accounts } from "@workspace/db/schema";
import { eq, ilike, and, or, count, asc, desc, SQL } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin", "camp_coordinator"];

router.get("/crm/contacts", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { status, accountType, nationality, search, page = "1", limit = "20",
      sortBy = "createdOn", sortDir = "desc" } =
      req.query as Record<string, string>;
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset   = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (status)      conditions.push(eq(contacts.status, status));
    if (accountType) conditions.push(eq(contacts.accountType, accountType));
    if (nationality) conditions.push(eq(contacts.nationality, nationality));
    if (search) {
      conditions.push(
        or(
          ilike(contacts.firstName, `%${search}%`),
          ilike(contacts.lastName,  `%${search}%`),
          ilike(contacts.email,     `%${search}%`),
          ilike(contacts.fullName,  `%${search}%`),
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ count: count() }).from(contacts).where(whereClause);
    const orderExpr = sortDir === "asc" ? asc(contacts.createdOn) : desc(contacts.createdOn);
    const data = await db.select().from(contacts).where(whereClause).limit(limitNum).offset(offset)
      .orderBy(orderExpr);

    return res.json({
      data,
      meta: { total: Number(totalResult.count), page: pageNum, limit: limitNum,
              totalPages: Math.ceil(Number(totalResult.count) / limitNum) },
    });
  } catch (err) {
    console.error("[GET /api/crm/contacts]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Helper: fetch all accounts linked to a contact ────────────────────────
async function getLinkedAccounts(contactId: string) {
  const cols = {
    id: accounts.id, name: accounts.name, accountType: accounts.accountType,
    status: accounts.status, email: accounts.email, phoneNumber: accounts.phoneNumber,
    country: accounts.country, city: accounts.city,
    primaryContactId: accounts.primaryContactId, secondaryContactId: accounts.secondaryContactId,
  };
  const primRows = await db.select(cols).from(accounts)
    .where(eq(accounts.primaryContactId, contactId));
  const secRows  = await db.select(cols).from(accounts)
    .where(eq(accounts.secondaryContactId, contactId));

  const seen = new Set<string>();
  const merged: any[] = [];
  for (const r of primRows) {
    if (!seen.has(r.id)) { seen.add(r.id); merged.push({ ...r, role: "primary" }); }
  }
  for (const r of secRows) {
    if (!seen.has(r.id)) { seen.add(r.id); merged.push({ ...r, role: "secondary" }); }
    else {
      const existing = merged.find((m: any) => m.id === r.id);
      if (existing) existing.role = "both";
    }
  }
  return merged;
}

router.get("/crm/contacts/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [row] = await db.select().from(contacts).where(eq(contacts.id, req.params.id));
    if (!row) return res.status(404).json({ error: "Contact not found" });

    const linkedAccounts = await getLinkedAccounts(req.params.id);
    const linkedAccount  = linkedAccounts[0] ?? null;

    return res.json({ ...row, linkedAccount, linkedAccounts });
  } catch (err) {
    console.error("[GET /api/crm/contacts/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET all accounts linked to a contact
router.get("/crm/contacts/:id/accounts", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [row] = await db.select({ id: contacts.id }).from(contacts)
      .where(eq(contacts.id, req.params.id)).limit(1);
    if (!row) return res.status(404).json({ error: "Contact not found" });

    const linkedAccounts = await getLinkedAccounts(req.params.id);
    return res.json({ data: linkedAccounts });
  } catch (err) {
    console.error("[GET /api/crm/contacts/:id/accounts]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST create a new account linked to this contact
router.post("/crm/contacts/:id/accounts", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [contact] = await db.select().from(contacts)
      .where(eq(contacts.id, req.params.id)).limit(1);
    if (!contact) return res.status(404).json({ error: "Contact not found" });

    const { accountType, name, role = "primary" } = req.body;
    if (!accountType) return res.status(400).json({ error: "accountType is required" });

    const accountName = name?.trim() ||
      `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim() || "New Account";

    const ownerId = (req as any).user?.id;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });

    const insertValues: any = {
      name: accountName,
      accountType,
      status: "Active",
      ownerId,
    };
    if (role === "secondary") {
      insertValues.secondaryContactId = req.params.id;
    } else {
      insertValues.primaryContactId = req.params.id;
    }

    const [created] = await db.insert(accounts).values(insertValues).returning();
    return res.status(201).json({ ...created, role: role === "secondary" ? "secondary" : "primary" });
  } catch (err) {
    console.error("[POST /api/crm/contacts/:id/accounts]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH update basic info of an account linked to this contact
router.patch("/crm/contacts/:id/accounts/:accountId", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { accountId } = req.params;
    const { name, accountType, status } = req.body;

    const [existing] = await db.select({ id: accounts.id })
      .from(accounts).where(eq(accounts.id, accountId)).limit(1);
    if (!existing) return res.status(404).json({ error: "Account not found" });

    const updates: Record<string, any> = { modifiedOn: new Date() };
    if (name      !== undefined) updates.name        = name;
    if (accountType !== undefined) updates.accountType = accountType;
    if (status    !== undefined) updates.status      = status;

    const [updated] = await db.update(accounts).set(updates)
      .where(eq(accounts.id, accountId)).returning();
    return res.json(updated);
  } catch (err) {
    console.error("[PATCH /api/crm/contacts/:id/accounts/:accountId]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST link an existing account to this contact
router.post("/crm/contacts/:id/link-account", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { accountId, role = "primary" } = req.body;
    if (!accountId) return res.status(400).json({ error: "accountId is required" });

    const [existing] = await db.select({ id: accounts.id })
      .from(accounts).where(eq(accounts.id, accountId)).limit(1);
    if (!existing) return res.status(404).json({ error: "Account not found" });

    const updates: Record<string, any> = { modifiedOn: new Date() };
    if (role === "secondary") updates.secondaryContactId = req.params.id;
    else updates.primaryContactId = req.params.id;

    const [updated] = await db.update(accounts).set(updates)
      .where(eq(accounts.id, accountId)).returning();
    return res.json(updated);
  } catch (err) {
    console.error("[POST /api/crm/contacts/:id/link-account]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE unlink an account from this contact
router.delete("/crm/contacts/:id/accounts/:accountId", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { id: contactId, accountId } = req.params;

    const [existing] = await db.select({
      id: accounts.id,
      primaryContactId: accounts.primaryContactId,
      secondaryContactId: accounts.secondaryContactId,
    }).from(accounts).where(eq(accounts.id, accountId)).limit(1);

    if (!existing) return res.status(404).json({ error: "Account not found" });

    const updates: Record<string, any> = { modifiedOn: new Date() };
    if (existing.primaryContactId === contactId)   updates.primaryContactId = null;
    if (existing.secondaryContactId === contactId) updates.secondaryContactId = null;

    if (Object.keys(updates).length === 1) {
      return res.status(400).json({ error: "This contact is not linked to the account" });
    }

    await db.update(accounts).set(updates).where(eq(accounts.id, accountId));
    return res.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/crm/contacts/:id/accounts/:accountId]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/crm/contacts", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { firstName, lastName, englishName, title, dob, gender, nationality, email, mobile,
            officeNumber, snsType, snsId, influxChannel, importantDate1, importantDate2,
            originalName, fullName, description, status, accountType } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ error: "firstName and lastName are required" });
    }

    const [created] = await db.insert(contacts).values({
      firstName, lastName, englishName, title, dob, gender, nationality, email, mobile,
      officeNumber, snsType, snsId, influxChannel, importantDate1, importantDate2,
      originalName, fullName, description,
      status:      status      ?? "Active",
      accountType: accountType ?? "Student",
    }).returning();

    return res.status(201).json(created);
  } catch (err) {
    console.error("[POST /api/crm/contacts]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/crm/contacts/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [existing] = await db.select().from(contacts).where(eq(contacts.id, req.params.id));
    if (!existing) return res.status(404).json({ error: "Contact not found" });

    const { firstName, lastName, englishName, title, dob, gender, nationality, email, mobile,
            officeNumber, snsType, snsId, influxChannel, importantDate1, importantDate2,
            originalName, fullName, description, status, accountType } = req.body;

    const [updated] = await db.update(contacts)
      .set({ firstName, lastName, englishName, title, dob, gender, nationality, email, mobile,
             officeNumber, snsType, snsId, influxChannel, importantDate1, importantDate2,
             originalName, fullName, description, status, accountType, modifiedOn: new Date() })
      .where(eq(contacts.id, req.params.id))
      .returning();

    return res.json(updated);
  } catch (err) {
    console.error("[PUT /api/crm/contacts/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/crm/contacts/:id/status", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "status is required" });

    const [updated] = await db.update(contacts)
      .set({ status, modifiedOn: new Date() })
      .where(eq(contacts.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Contact not found" });
    return res.json(updated);
  } catch (err) {
    console.error("[PATCH /api/crm/contacts/:id/status]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /crm/contacts/:id/profile-image  { objectPath: string }
router.patch("/crm/contacts/:id/profile-image", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { objectPath } = req.body;
    if (typeof objectPath !== "string") {
      return res.status(400).json({ error: "objectPath is required" });
    }
    const [updated] = await db.update(contacts)
      .set({ profileImageUrl: objectPath, modifiedOn: new Date() })
      .where(eq(contacts.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Contact not found" });
    return res.json(updated);
  } catch (err) {
    console.error("[PATCH /api/crm/contacts/:id/profile-image]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
