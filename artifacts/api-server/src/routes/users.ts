import { Router } from "express";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { eq, ilike, and, or, count, SQL } from "drizzle-orm";
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

router.get("/:id", authenticate, async (req, res) => {
  try {
    const [user] = await db.select({
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
