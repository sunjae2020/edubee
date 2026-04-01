import { Router } from "express";
import { db } from "@workspace/db";
import { users, products, packageGroupProducts, packageGroups, accounts, contacts } from "@workspace/db/schema";
import { eq, ilike, and, or, count, SQL, asc } from "drizzle-orm";
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

    const conditions: SQL[] = [];
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

    const [totalResult] = await db.select({ count: count() }).from(users).where(whereClause);
    const data = await db.select({
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
    }).from(users).where(whereClause).limit(limitNum).offset(offset);

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
    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash,
      role,
      fullName,
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
  super_admin: 100, admin: 80, camp_coordinator: 60,
  finance: 70, admission: 65, team_manager: 60, consultant: 50, camp_coordinator: 40,
};

router.get("/switchable", authenticate, async (req, res) => {
  try {
    const myLevel = ROLE_HIERARCHY[req.user!.role] || 0;
    if (myLevel < 60) return res.json([]);
    const allUsers = await db.select({
      id: users.id, email: users.email, fullName: users.fullName,
      role: users.role, avatarUrl: users.avatarUrl, status: users.status,
    }).from(users).where(eq(users.status, "active"));
    const switchable = allUsers.filter(u => (ROLE_HIERARCHY[u.role] || 0) < myLevel && u.id !== req.user!.id);
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
    const [user] = await db.select({
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
    }).from(users).where(eq(users.id, req.params.id)).limit(1);
    
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
    if (!isAdmin && req.user!.id !== req.params.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { password, passwordHash, ...rest } = req.body;
    const updates: Record<string, any> = { ...rest, updatedAt: new Date() };
    if (password && isAdmin) {
      updates.passwordHash = await bcrypt.hash(password, 12);
    }

    const [user] = await db.update(users).set(updates).where(eq(users.id, req.params.id)).returning();
    if (!user) return res.status(404).json({ error: "Not Found" });
    const { passwordHash: _, ...userWithoutPassword } = user;
    return res.json(userWithoutPassword);
  } catch (err) {
    console.error("Update user error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// PART 4: Products owned by a partner user
router.get("/:id/products", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const { status, type } = req.query as Record<string, string>;
    const conditions = [eq(products.providerAccountId, req.params.id)];
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
    await db.update(users).set({ status: "inactive", updatedAt: new Date() }).where(eq(users.id, req.params.id));
    return res.json({ success: true, message: "User deactivated" });
  } catch (err) {
    console.error("Delete user error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
