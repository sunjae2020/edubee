import { Router } from "express";
import { db } from "@workspace/db";
import { packageGroups, packages, products, enrollmentSpots, exchangeRates } from "@workspace/db/schema";
import { eq, and, count, asc, SQL, ilike, desc, sql } from "drizzle-orm";
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
    const groups = await db.select().from(packageGroups).where(whereClause).limit(limitNum).offset(offset);

    // Attach package count per group
    const groupIds = groups.map(g => g.id);
    let pkgCounts: Record<string, number> = {};
    if (groupIds.length > 0) {
      const countRows = await db
        .select({ packageGroupId: packages.packageGroupId, cnt: count() })
        .from(packages)
        .where(sql`${packages.packageGroupId} = ANY(ARRAY[${sql.join(groupIds.map(id => sql`${id}::uuid`), sql`, `)}])`)
        .groupBy(packages.packageGroupId);
      for (const r of countRows) {
        if (r.packageGroupId) pkgCounts[r.packageGroupId] = Number(r.cnt);
      }
    }

    const data = groups.map(g => ({ ...g, packageCount: pkgCounts[g.id] ?? 0 }));
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
    const { packageGroupId, status, search, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (packageGroupId) conditions.push(eq(packages.packageGroupId, packageGroupId));
    if (status) conditions.push(eq(packages.status, status));
    if (search) conditions.push(ilike(packages.name, `%${search}%`));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ count: count() })
      .from(packages)
      .leftJoin(packageGroups, eq(packages.packageGroupId, packageGroups.id))
      .where(whereClause);

    const data = await db
      .select({
        id: packages.id,
        packageGroupId: packages.packageGroupId,
        name: packages.name,
        durationDays: packages.durationDays,
        maxParticipants: packages.maxParticipants,
        priceAud: packages.priceAud,
        priceUsd: packages.priceUsd,
        priceKrw: packages.priceKrw,
        priceJpy: packages.priceJpy,
        priceThb: packages.priceThb,
        pricePhp: packages.pricePhp,
        priceSgd: packages.priceSgd,
        priceGbp: packages.priceGbp,
        features: packages.features,
        status: packages.status,
        createdAt: packages.createdAt,
        updatedAt: packages.updatedAt,
        groupNameEn: packageGroups.nameEn,
        groupNameKo: packageGroups.nameKo,
        groupLocation: packageGroups.location,
        groupCountryCode: packageGroups.countryCode,
        groupStatus: packageGroups.status,
      })
      .from(packages)
      .leftJoin(packageGroups, eq(packages.packageGroupId, packageGroups.id))
      .where(whereClause)
      .limit(limitNum)
      .offset(offset);

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
    const [row] = await db
      .select({
        id: packages.id,
        packageGroupId: packages.packageGroupId,
        name: packages.name,
        durationDays: packages.durationDays,
        maxParticipants: packages.maxParticipants,
        priceAud: packages.priceAud,
        priceUsd: packages.priceUsd,
        priceKrw: packages.priceKrw,
        priceJpy: packages.priceJpy,
        priceThb: packages.priceThb,
        pricePhp: packages.pricePhp,
        priceSgd: packages.priceSgd,
        priceGbp: packages.priceGbp,
        features: packages.features,
        status: packages.status,
        createdAt: packages.createdAt,
        updatedAt: packages.updatedAt,
        groupNameEn: packageGroups.nameEn,
        groupNameKo: packageGroups.nameKo,
        groupLocation: packageGroups.location,
        groupCountryCode: packageGroups.countryCode,
        groupStatus: packageGroups.status,
      })
      .from(packages)
      .leftJoin(packageGroups, eq(packages.packageGroupId, packageGroups.id))
      .where(eq(packages.id, req.params.id))
      .limit(1);
    if (!row) return res.status(404).json({ error: "Not Found" });
    return res.json(row);
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
    const [data, allRates] = await Promise.all([
      db.select().from(products).where(whereClause).limit(limitNum).offset(offset),
      db.select().from(exchangeRates).orderBy(desc(exchangeRates.effectiveDate)),
    ]);

    // Build latest AUD→X rate map
    const rateMap: Record<string, { rate: number; date: string }> = { AUD: { rate: 1, date: new Date().toISOString().slice(0, 10) } };
    for (const r of allRates) {
      if (r.fromCurrency === "AUD") {
        const key = r.toCurrency.toUpperCase();
        if (!rateMap[key]) rateMap[key] = { rate: parseFloat(r.rate), date: r.effectiveDate };
      } else if (r.toCurrency === "AUD") {
        const key = r.fromCurrency.toUpperCase();
        if (!rateMap[key]) rateMap[key] = { rate: 1 / parseFloat(r.rate), date: r.effectiveDate };
      }
    }

    const enriched = data.map((p) => {
      const audCost = p.cost ? parseFloat(p.cost) : null;
      const convertedCost: Record<string, number | null> = {};
      for (const [ccy, info] of Object.entries(rateMap)) {
        convertedCost[ccy.toLowerCase()] = audCost !== null ? Math.round(audCost * info.rate * 100) / 100 : null;
      }
      return { ...p, convertedCost };
    });

    const total = Number(totalResult.count);
    return res.json({
      data: enriched,
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
