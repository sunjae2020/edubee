import { Router } from "express";
import { db } from "@workspace/db";
import { packageGroups, packages, products, packageGroupProducts, enrollmentSpots, exchangeRates, users } from "@workspace/db/schema";
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

    // JOIN coordinator info
    const rows = await db
      .select({
        group: packageGroups,
        coordinatorId: users.id,
        coordinatorName: users.fullName,
        coordinatorEmail: users.email,
        coordinatorPhone: users.phone,
      })
      .from(packageGroups)
      .leftJoin(users, eq(packageGroups.campProviderId, users.id))
      .where(whereClause)
      .limit(limitNum)
      .offset(offset)
      .orderBy(asc(packageGroups.sortOrder), desc(packageGroups.createdAt));

    const groupIds = rows.map(r => r.group.id);
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

    const data = rows.map(r => ({
      ...r.group,
      packageCount: pkgCounts[r.group.id] ?? 0,
      coordinator: r.coordinatorId ? {
        id: r.coordinatorId,
        fullName: r.coordinatorName,
        email: r.coordinatorEmail,
        phone: r.coordinatorPhone,
      } : null,
    }));
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
    const [row] = await db
      .select({
        group: packageGroups,
        coordinatorId: users.id,
        coordinatorName: users.fullName,
        coordinatorEmail: users.email,
        coordinatorPhone: users.phone,
        coordinatorCompany: users.companyName,
        coordinatorCountry: users.countryOfOps,
      })
      .from(packageGroups)
      .leftJoin(users, eq(packageGroups.campProviderId, users.id))
      .where(eq(packageGroups.id, req.params.id))
      .limit(1);
    if (!row) return res.status(404).json({ error: "Not Found" });
    return res.json({
      ...row.group,
      coordinator: row.coordinatorId ? {
        id: row.coordinatorId,
        fullName: row.coordinatorName,
        email: row.coordinatorEmail,
        phone: row.coordinatorPhone,
        companyName: row.coordinatorCompany,
        countryOfOps: row.coordinatorCountry,
      } : null,
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/package-groups/:id", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    // Coerce integer fields — they may arrive as strings from form inputs
    const toIntOrNull = (v: unknown) => (v === null || v === "" || v === undefined) ? null : parseInt(String(v), 10);
    const toInt = (v: unknown) => (v === null || v === "" || v === undefined) ? 0 : parseInt(String(v), 10);
    const payload = {
      ...body,
      sortOrder: body.sortOrder !== undefined ? toInt(body.sortOrder) : undefined,
      landingOrder: body.landingOrder !== undefined ? toIntOrNull(body.landingOrder) : undefined,
      updatedAt: new Date(),
    };
    // Coerce date fields — they may arrive as ISO strings or null
    const toDateOrNull = (v: unknown) => (v === null || v === "" || v === undefined) ? null : new Date(String(v));
    if (body.startDate !== undefined) (payload as any).startDate = toDateOrNull(body.startDate);
    if (body.endDate !== undefined) (payload as any).endDate = toDateOrNull(body.endDate);

    // Strip computed/unknown fields that aren't in the schema
    const allowed = ["campProviderId","nameEn","nameKo","nameJa","nameTh","descriptionEn","descriptionKo","descriptionJa","descriptionTh","thumbnailUrl","location","countryCode","status","sortOrder","landingOrder","startDate","endDate","updatedAt"] as const;
    const cleanPayload = Object.fromEntries(allowed.filter(k => (payload as any)[k] !== undefined).map(k => [k, (payload as any)[k]]));
    cleanPayload.updatedAt = new Date();
    const [group] = await db.update(packageGroups).set(cleanPayload as any)
      .where(eq(packageGroups.id, req.params.id)).returning();
    if (!group) return res.status(404).json({ error: "Not Found" });
    return res.json(group);
  } catch (err) {
    console.error("[PUT /package-groups/:id]", err);
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

// Package-Group → Products links (PART 2)
router.get("/package-groups/:id/products", authenticate, async (req, res) => {
  try {
    const rows = await db
      .select({
        linkId:           packageGroupProducts.id,
        packageGroupId:   packageGroupProducts.packageGroupId,
        quantity:         packageGroupProducts.quantity,
        unitPrice:        packageGroupProducts.unitPrice,
        productId:        products.id,
        productName:      products.productName,
        productType:      products.productType,
        description:      products.description,
        cost:             products.cost,
        currency:         products.currency,
        status:           products.status,
        providerAccountId: products.providerAccountId,
        productCreatedAt: products.createdAt,
        productUpdatedAt: products.updatedAt,
      })
      .from(packageGroupProducts)
      .innerJoin(products, eq(packageGroupProducts.productId, products.id))
      .where(eq(packageGroupProducts.packageGroupId, req.params.id))
      .orderBy(asc(products.productType), asc(products.productName));
    return res.json(rows);
  } catch (err) {
    console.error("[GET /package-groups/:id/products]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/package-groups/:id/products", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { productId, quantity = 1, unitPrice } = req.body;
    if (!productId) return res.status(400).json({ error: "productId is required" });
    const [link] = await db.insert(packageGroupProducts).values({
      packageGroupId: req.params.id,
      productId,
      quantity:  quantity  ?? 1,
      unitPrice: unitPrice ?? null,
    }).returning();
    return res.status(201).json(link);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "Product already linked to this package group" });
    console.error("[POST /package-groups/:id/products]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/package-groups/:id/products/:productId", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { quantity, unitPrice } = req.body;
    const updates: Record<string, unknown> = {};
    if (quantity != null) updates.quantity = Number(quantity);
    if (unitPrice != null) updates.unitPrice = unitPrice === "" ? null : String(unitPrice);
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "No fields to update" });
    const [updated] = await db.update(packageGroupProducts)
      .set(updates)
      .where(and(
        eq(packageGroupProducts.packageGroupId, req.params.id),
        eq(packageGroupProducts.productId, req.params.productId),
      ))
      .returning();
    if (!updated) return res.status(404).json({ error: "Link not found" });
    return res.json(updated);
  } catch (err) {
    console.error("[PATCH /package-groups/:id/products/:productId]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/package-groups/:id/products/:productId", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const deleted = await db.delete(packageGroupProducts)
      .where(and(
        eq(packageGroupProducts.packageGroupId, req.params.id),
        eq(packageGroupProducts.productId,      req.params.productId),
      ))
      .returning();
    if (deleted.length === 0) return res.status(404).json({ error: "Link not found" });
    return res.json({ success: true, message: "Product unlinked from package group" });
  } catch (err) {
    console.error("[DELETE /package-groups/:id/products/:productId]", err);
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
    const { id: _id, createdAt: _ca, updatedAt: _ua, convertedCost: _cc, ...body } = req.body;
    const [product] = await db.insert(products).values(body).returning();
    return res.status(201).json(product);
  } catch (err) {
    console.error("[POST /products]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/products/:id/linked-groups", authenticate, async (req, res) => {
  try {
    const rows = await db
      .select({
        linkId:           packageGroupProducts.id,
        quantity:         packageGroupProducts.quantity,
        unitPrice:        packageGroupProducts.unitPrice,
        packageGroupId:   packageGroups.id,
        nameEn:           packageGroups.nameEn,
        nameKo:           packageGroups.nameKo,
        nameJa:           packageGroups.nameJa,
        nameTh:           packageGroups.nameTh,
        location:         packageGroups.location,
        countryCode:      packageGroups.countryCode,
        groupStatus:      packageGroups.status,
      })
      .from(packageGroupProducts)
      .innerJoin(packageGroups, eq(packageGroupProducts.packageGroupId, packageGroups.id))
      .where(eq(packageGroupProducts.productId, req.params.id))
      .orderBy(asc(packageGroups.nameEn));
    return res.json(rows);
  } catch (err) {
    console.error("[GET /products/:id/linked-groups]", err);
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
    const { id: _id, createdAt: _ca, updatedAt: _ua, convertedCost: _cc, ...body } = req.body;
    const [product] = await db.update(products).set({ ...body, updatedAt: new Date() })
      .where(eq(products.id, req.params.id)).returning();
    if (!product) return res.status(404).json({ error: "Not Found" });
    return res.json(product);
  } catch (err) {
    console.error("[PUT /products/:id]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/products/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const linkedGroups = await db
      .select({ id: packageGroupProducts.id })
      .from(packageGroupProducts)
      .where(eq(packageGroupProducts.productId, req.params.id))
      .limit(1);
    if (linkedGroups.length > 0) {
      const [{ groupCount }] = await db
        .select({ groupCount: count(packageGroupProducts.id) })
        .from(packageGroupProducts)
        .where(eq(packageGroupProducts.productId, req.params.id));
      return res.status(409).json({
        error: `이 상품은 ${groupCount}개의 Package Group에서 사용 중입니다. 먼저 연결을 해제해주세요.`,
        linkedGroupCount: Number(groupCount),
      });
    }
    await db.update(products).set({ status: "archived", updatedAt: new Date() })
      .where(eq(products.id, req.params.id));
    return res.json({ success: true, message: "Product archived" });
  } catch (err) {
    console.error("[DELETE /products/:id]", err);
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
