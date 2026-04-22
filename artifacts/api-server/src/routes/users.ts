import { Router } from "express";
import { db, staticDb } from "@workspace/db";
import { users, products, packageGroupProducts, packageGroups, accounts, contacts } from "@workspace/db/schema";
import { eq, ilike, and, or, count, SQL, asc, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin"];

router.get("/", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const { role, status, search, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    // Scope to current tenant. Super-admin without org context sees all.
    const orgId = req.tenantId ?? req.user?.organisationId ?? null;

    const conditions: SQL[] = [];
    if (orgId) conditions.push(eq(users.organisationId, orgId));
    if (role) conditions.push(eq(users.role, role));
    if (status) conditions.push(eq(users.status, status));
    if (search) {
      conditions.push(
        or(
          ilike(users.fullName, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await staticDb.select({ count: count() }).from(users).where(whereClause);
    const data = await staticDb.select({
      id: users.id,
      email: users.email,
      role: users.role,
      fullName: users.fullName,
      phone: users.phone,
      whatsapp: users.whatsapp,
      lineId: users.lineId,
      avatarUrl: users.avatarUrl,
      timezone: users.timezone,
      preferredLang: users.preferredLang,
      companyName: users.companyName,
      businessRegNo: users.businessRegNo,
      countryOfOps: users.countryOfOps,
      platformCommRate: users.platformCommRate,
      status: users.status,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).where(whereClause).orderBy(asc(users.createdAt)).limit(limitNum).offset(offset);

    const total = Number(totalResult.count);
    return res.json({
      data,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error("List users error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { email, password, role, fullName, ...rest } = req.body;
    if (!email || !password || !role || !fullName) {
      return res.status(400).json({ error: "Bad Request", message: "Required fields missing" });
    }
    const orgId = req.tenantId ?? req.user?.organisationId ?? null;
    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await staticDb.insert(users).values({
      email: email.toLowerCase(),
      passwordHash,
      role,
      fullName,
      organisationId: orgId,
      ...rest,
    }).returning();

    const { passwordHash: _, ...userWithoutPassword } = user;
    return res.status(201).json(userWithoutPassword);
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Conflict", message: "Email already exists" });
    }
    console.error("Create user error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 100, admin: 80,
  finance: 70, admission: 65, team_manager: 60, camp_coordinator: 60, consultant: 50,
};

router.get("/switchable", authenticate, async (req, res) => {
  try {
    const myRole  = req.user!.role;
    const myLevel = ROLE_HIERARCHY[myRole] || 0;
    // Consultant (50) can only switch to Camp Coordinator view; everyone else needs level >= 60
    if (myLevel < 50) return res.json([]);
    // Use staticDb to always query public.users (all tenants' users, not just current tenant schema)
    const allUsers = await staticDb.select({
      id: users.id, email: users.email, fullName: users.fullName,
      role: users.role, avatarUrl: users.avatarUrl, status: users.status,
    }).from(users).where(eq(users.status, "active"));
    const switchable = myRole === "consultant"
      // Consultant: camp_coordinator view only
      ? allUsers.filter(u => u.role === "camp_coordinator" && u.id !== req.user!.id)
      // Others: all users below their own level
      : allUsers.filter(u => (ROLE_HIERARCHY[u.role] || 0) < myLevel && u.id !== req.user!.id);
    return res.json(switchable);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/switchable-accounts", authenticate, async (req, res) => {
  try {
    const myLevel = ROLE_HIERARCHY[req.user!.role] || 0;
    if (myLevel < 60) return res.json([]);
    const rows = await db
      .select({
        id:           accounts.id,
        name:         accounts.name,
        accountType:  accounts.accountType,
        portalAccess: accounts.portalAccess,
        portalRole:   accounts.portalRole,
        portalEmail:  accounts.portalEmail,
        primaryContactFirstName:  contacts.firstName,
        primaryContactLastName:   contacts.lastName,
        primaryContactOriginalName: contacts.originalName,
      })
      .from(accounts)
      .leftJoin(contacts, eq(accounts.primaryContactId, contacts.id))
      .where(eq(accounts.portalAccess, true));
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:id", authenticate, async (req, res) => {
  try {
    const [user] = await staticDb.select({
      id: users.id,
      email: users.email,
      role: users.role,
      fullName: users.fullName,
      firstName: users.firstName,
      lastName: users.lastName,
      englishName: users.englishName,
      originalName: users.originalName,
      phone: users.phone,
      whatsapp: users.whatsapp,
      lineId: users.lineId,
      avatarUrl: users.avatarUrl,
      timezone: users.timezone,
      preferredLang: users.preferredLang,
      companyName: users.companyName,
      businessRegNo: users.businessRegNo,
      countryOfOps: users.countryOfOps,
      platformCommRate: users.platformCommRate,
      status: users.status,
      lastLoginAt: users.lastLoginAt,
      teamId: users.teamId,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).where(eq(users.id, req.params.id as string)).limit(1);
    
    if (!user) return res.status(404).json({ error: "Not Found" });
    return res.json(user);
  } catch (err) {
    console.error("Get user error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id", authenticate, async (req, res) => {
  try {
    const isAdmin = ADMIN_ROLES.includes(req.user!.role);
    if (!isAdmin && req.user!.id !== req.params.id as string) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Strip read-only / auto-managed fields before passing to Drizzle.
    // Timestamp columns must be Date objects — strings from the client cause
    // `value.toISOString is not a function` inside Drizzle's PgTimestamp serialiser.
    const READONLY_FIELDS = new Set([
      "id", "createdAt", "updatedAt", "lastLoginAt",
      "organisationId", "passwordHash",
    ]);

    const { password, passwordHash: _ph, ...rest } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };

    // Fetch current user record to compare email — prevents spurious 409 when
    // the client sends back the same email the user already has (multi-tenant
    // environments share a global unique constraint on email).
    let currentEmail: string | undefined;
    if ("email" in rest) {
      const [current] = await staticDb
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, req.params.id as string))
        .limit(1);
      currentEmail = current?.email;
    }

    for (const [key, value] of Object.entries(rest)) {
      if (READONLY_FIELDS.has(key)) continue;
      // Skip email if it hasn't changed — avoids triggering the global unique
      // constraint when another tenant's user happens to share the same email.
      if (key === "email" && typeof value === "string" && value.toLowerCase() === currentEmail) {
        continue;
      }
      // Convert ISO date strings to Date objects for any timestamp columns
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        const d = new Date(value);
        updates[key] = isNaN(d.getTime()) ? value : d;
      } else {
        updates[key] = value;
      }
    }

    if (password && isAdmin) {
      updates.passwordHash = await bcrypt.hash(password, 12);
    }

    const [user] = await staticDb.update(users).set(updates).where(eq(users.id, req.params.id as string)).returning();
    if (!user) return res.status(404).json({ error: "Not Found" });
    const { passwordHash: _, ...userWithoutPassword } = user;
    return res.json(userWithoutPassword);
  } catch (err: any) {
    // Drizzle wraps PG errors in err.cause — check both for unique constraint violations
    const pgErr = err?.cause ?? err;
    if (pgErr?.code === "23505" && pgErr?.constraint?.includes("email")) {
      return res.status(409).json({ error: "Email already in use by another account" });
    }
    console.error("Update user error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// PART 4: Products owned by a partner user
router.get("/:id/products", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const { status, type } = req.query as Record<string, string>;
    const conditions = [eq(products.providerAccountId, req.params.id as string)];
    if (status) conditions.push(eq(products.status, status));
    if (type)   conditions.push(eq(products.productType, type));

    const rows = await db
      .select({
        product:   products,
        linkCount: count(packageGroupProducts.id),
      })
      .from(products)
      .leftJoin(packageGroupProducts, eq(packageGroupProducts.productId, products.id))
      .where(and(...conditions))
      .groupBy(products.id)
      .orderBy(asc(products.productType), asc(products.productName));

    return res.json(rows);
  } catch (err) {
    console.error("[GET /users/:id/products]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    await db.update(users).set({ status: "inactive", updatedAt: new Date() }).where(eq(users.id, req.params.id as string));
    return res.json({ success: true, message: "User deactivated" });
  } catch (err) {
    console.error("Delete user error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /users/:id/avatar  { dataUrl: string }
router.patch("/:id/avatar", authenticate, async (req, res) => {
  try {
    const { dataUrl } = req.body;
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
      return res.status(400).json({ error: "dataUrl is required and must be a valid image data URL" });
    }
    const [updated] = await db.update(users)
      .set({ avatarUrl: dataUrl, updatedAt: new Date() })
      .where(eq(users.id, req.params.id as string))
      .returning();

    if (!updated) return res.status(404).json({ error: "User not found" });
    return res.json(updated);
  } catch (err) {
    console.error("[PATCH /users/:id/avatar]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── DELETE /api/users/bulk  (super_admin 임시/영구 삭제) ────────────────────
router.delete("/bulk", authenticate, async (req, res) => {
  if ((req.user as any)?.role !== "super_admin") return res.status(403).json({ error: "Forbidden" });
  try {
    const { ids, soft } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids array required" });
    if (soft) {
      await db.update(users).set({ status: "inactive" }).where(inArray(users.id, ids));
      return res.json({ success: true, updated: ids.length });
    }
    await db.delete(users).where(inArray(users.id, ids));
    return res.json({ success: true, deleted: ids.length });
  } catch (err) {
    console.error("[DELETE /api/users/bulk]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
