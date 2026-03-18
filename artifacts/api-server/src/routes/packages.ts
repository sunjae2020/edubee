import { Router } from "express";
import { db } from "@workspace/db";
import { packageGroups, packages, products, enrollmentSpots } from "@workspace/db/schema";
import { eq, and, count, asc, SQL, ilike } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin"];

// Package Groups
router.get("/package-groups", authenticate, async (req, res) => {
  try {
    const { status, countryCode, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (status) conditions.push(eq(packageGroups.status, status));
    if (countryCode) conditions.push(eq(packageGroups.countryCode, countryCode));

    // Camp coordinators see only their own
    if (req.user!.role === "camp_coordinator") {
      conditions.push(eq(packageGroups.campProviderId, req.user!.id));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalResult] = await db.select({ count: count() }).from(packageGroups).where(whereClause);
    const data = await db.select().from(packageGroups).where(whereClause).limit(limitNum).offset(offset);

    const total = Number(totalResult.count);
    return res.json({
      data,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/package-groups", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const body = req.body;
    if (req.user!.role === "camp_coordinator") {
      body.campProviderId = req.user!.id;
    }
    const [group] = await db.insert(packageGroups).values(body).returning();
    return res.status(201).json(group);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/package-groups/:id", authenticate, async (req, res) => {
  try {
    const [group] = await db.select().from(packageGroups).where(eq(packageGroups.id, req.params.id)).limit(1);
    if (!group) return res.status(404).json({ error: "Not Found" });
    return res.json(group);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/package-groups/:id", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const [group] = await db.update(packageGroups).set({ ...req.body, updatedAt: new Date() })
      .where(eq(packageGroups.id, req.params.id)).returning();
    if (!group) return res.status(404).json({ error: "Not Found" });
    return res.json(group);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/package-groups/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    await db.update(packageGroups).set({ status: "archived", updatedAt: new Date() })
      .where(eq(packageGroups.id, req.params.id));
    return res.json({ success: true, message: "Package group archived" });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Packages
router.get("/packages", authenticate, async (req, res) => {
  try {
    const { packageGroupId, status, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (packageGroupId) conditions.push(eq(packages.packageGroupId, packageGroupId));
    if (status) conditions.push(eq(packages.status, status));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalResult] = await db.select({ count: count() }).from(packages).where(whereClause);
    const data = await db.select().from(packages).where(whereClause).limit(limitNum).offset(offset);

    const total = Number(totalResult.count);
    return res.json({
      data,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/packages", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const [pkg] = await db.insert(packages).values(req.body).returning();
    return res.status(201).json(pkg);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/packages/:id", authenticate, async (req, res) => {
  try {
    const [pkg] = await db.select().from(packages).where(eq(packages.id, req.params.id)).limit(1);
    if (!pkg) return res.status(404).json({ error: "Not Found" });
    return res.json(pkg);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/packages/:id", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const [pkg] = await db.update(packages).set({ ...req.body, updatedAt: new Date() })
      .where(eq(packages.id, req.params.id)).returning();
    if (!pkg) return res.status(404).json({ error: "Not Found" });
    return res.json(pkg);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/packages/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    await db.update(packages).set({ status: "archived", updatedAt: new Date() })
      .where(eq(packages.id, req.params.id));
    return res.json({ success: true, message: "Package archived" });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Products
router.get("/products", authenticate, async (req, res) => {
  try {
    const { productType, status, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (productType) conditions.push(eq(products.productType, productType));
    if (status) conditions.push(eq(products.status, status));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalResult] = await db.select({ count: count() }).from(products).where(whereClause);
    const data = await db.select().from(products).where(whereClause).limit(limitNum).offset(offset);

    const total = Number(totalResult.count);
    return res.json({
      data,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/products", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [product] = await db.insert(products).values(req.body).returning();
    return res.status(201).json(product);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/products/:id", authenticate, async (req, res) => {
  try {
    const [product] = await db.select().from(products).where(eq(products.id, req.params.id)).limit(1);
    if (!product) return res.status(404).json({ error: "Not Found" });
    return res.json(product);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/products/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [product] = await db.update(products).set({ ...req.body, updatedAt: new Date() })
      .where(eq(products.id, req.params.id)).returning();
    if (!product) return res.status(404).json({ error: "Not Found" });
    return res.json(product);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/products/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    await db.update(products).set({ status: "archived", updatedAt: new Date() })
      .where(eq(products.id, req.params.id));
    return res.json({ success: true, message: "Product archived" });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Enrollment Spots
router.get("/enrollment-spots", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const conditions: SQL[] = [];

    // Camp coordinators can only see spots for their own package groups
    if (req.user!.role === "camp_coordinator") {
      conditions.push(eq(packageGroups.campProviderId, req.user!.id));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: enrollmentSpots.id,
        packageGroupId: enrollmentSpots.packageGroupId,
        packageGroupName: packageGroups.nameEn,
        gradeLabel: enrollmentSpots.gradeLabel,
        gradeOrder: enrollmentSpots.gradeOrder,
        totalSpots: enrollmentSpots.totalSpots,
        reservedSpots: enrollmentSpots.reservedSpots,
        manualReserved: enrollmentSpots.manualReserved,
        status: enrollmentSpots.status,
        startDate: enrollmentSpots.startDate,
        endDate: enrollmentSpots.endDate,
        dobRangeStart: enrollmentSpots.dobRangeStart,
        dobRangeEnd: enrollmentSpots.dobRangeEnd,
        updatedAt: enrollmentSpots.updatedAt,
      })
      .from(enrollmentSpots)
      .leftJoin(packageGroups, eq(enrollmentSpots.packageGroupId, packageGroups.id))
      .where(whereClause)
      .orderBy(asc(packageGroups.nameEn), asc(enrollmentSpots.gradeOrder));

    const data = rows.map(r => ({
      ...r,
      available: (r.totalSpots ?? 0) - (r.reservedSpots ?? 0) - (r.manualReserved ?? 0),
    }));

    return res.json({ data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
