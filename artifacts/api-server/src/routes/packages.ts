import { Router } from "express";
import { db, runWithTenantSchema } from "@workspace/db";
import { packageGroups, packages, products, packageGroupProducts, packageProducts, enrollmentSpots, exchangeRates, users, interviewSettings, productTypes, commissions, promotions, taxRates, accounts, packageGroupImages, organisations, applicationGrade, applicationParticipants } from "@workspace/db/schema";
import { eq, and, count, asc, SQL, ilike, desc, sql, or, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin"];
// Master tenant slug — all package/camp data lives here (CC users from partner orgs read this)
const MASTER_TENANT = process.env.PLATFORM_SUBDOMAIN ?? "myagency";

// Package Groups
router.get("/package-groups", authenticate, async (req, res) => {
  const isCC = req.user!.role === "camp_coordinator";

  const handler = async () => {
  try {
    const { status, countryCode, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (status) conditions.push(ilike(packageGroups.status, status));
    if (countryCode) conditions.push(eq(packageGroups.countryCode, countryCode));

    // Camp coordinators see package groups where they are the camp provider OR assigned as coordinator.
    // Priority: org impersonation (req.tenant) → user's own org → user's id
    if (isCC) {
      const orgId = req.tenant?.id ?? req.user!.organisationId ?? req.user!.id;
      conditions.push(
        or(
          eq(packageGroups.campProviderId, orgId),
          eq(packageGroups.coordinatorId, orgId)
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalResult] = await db.select({ count: count() }).from(packageGroups).where(whereClause);

    // JOIN organisation (tenant) info + type info
    const rows = await db
      .select({
        group: packageGroups,
        orgId: organisations.id,
        orgName: organisations.name,
        orgTradingName: organisations.tradingName,
        orgSubdomain: organisations.subdomain,
        typeName: productTypes.name,
      })
      .from(packageGroups)
      .leftJoin(organisations, eq(packageGroups.campProviderId, organisations.id))
      .leftJoin(productTypes, eq(packageGroups.typeId, productTypes.id))
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
      typeName: r.typeName ?? null,
      campProvider: r.orgId ? {
        id: r.orgId,
        name: r.orgName,
        tradingName: r.orgTradingName,
        subdomain: r.orgSubdomain,
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
  }; // end handler

  // CC users from partner orgs must query master schema (their org has no package data)
  if (isCC) {
    await runWithTenantSchema(MASTER_TENANT, handler);
  } else {
    await handler();
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
    const acInstit  = alias(accounts, "acInstit");
    const acAccom   = alias(accounts, "acAccom");
    const acTour    = alias(accounts, "acTour");
    const acPickup  = alias(accounts, "acPickup");

    const coordOrg = alias(organisations, "coordOrg");
    const [row] = await db
      .select({
        group: packageGroups,
        coordinatorOrgId: coordOrg.id,
        coordinatorOrgName: coordOrg.name,
        coordinatorOrgSubdomain: coordOrg.subdomain,
        coordinatorOrgEmail: coordOrg.email,
        coordinatorOrgWebsite: coordOrg.websiteUrl,
        typeName: productTypes.name,
        instituteName2: acInstit.name,
        accommodationName: acAccom.name,
        tourCompanyName: acTour.name,
        pickupDriverName: acPickup.name,
      })
      .from(packageGroups)
      .leftJoin(coordOrg, eq(packageGroups.coordinatorId, coordOrg.id))
      .leftJoin(productTypes, eq(packageGroups.typeId, productTypes.id))
      .leftJoin(acInstit,  eq(packageGroups.instituteId,      acInstit.id))
      .leftJoin(acAccom,   eq(packageGroups.accommodationId,  acAccom.id))
      .leftJoin(acTour,    eq(packageGroups.tourCompanyId,    acTour.id))
      .leftJoin(acPickup,  eq(packageGroups.pickupDriverId,   acPickup.id))
      .where(eq(packageGroups.id, req.params.id))
      .limit(1);
    if (!row) return res.status(404).json({ error: "Not Found" });
    return res.json({
      ...row.group,
      typeName: row.typeName ?? null,
      coordinator: row.coordinatorOrgId ? {
        id: row.coordinatorOrgId,
        name: row.coordinatorOrgName,
        subdomain: row.coordinatorOrgSubdomain,
        email: row.coordinatorOrgEmail,
        websiteUrl: row.coordinatorOrgWebsite,
      } : null,
      instituteAccountName:     row.instituteName2 ?? null,
      accommodationAccountName: row.accommodationName ?? null,
      tourCompanyAccountName:   row.tourCompanyName ?? null,
      pickupDriverAccountName:  row.pickupDriverName ?? null,
    });
  } catch (err) {
    console.error("[GET /package-groups/:id]", err);
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
    if (body.minAge !== undefined) (payload as any).minAge = toIntOrNull(body.minAge);
    if (body.maxAge !== undefined) (payload as any).maxAge = toIntOrNull(body.maxAge);
    const allowed = ["campProviderId","coordinatorId","nameEn","nameKo","nameJa","nameTh","descriptionEn","descriptionKo","descriptionJa","descriptionTh","inclusionsEn","inclusionsKo","exclusionsEn","exclusionsKo","durationText","thumbnailUrl","location","countryCode","status","sortOrder","landingOrder","minAge","maxAge","startDate","endDate","typeId","year","month","instituteName","instituteId","accommodation","accommodationId","tourCompany","tourCompanyId","pickupDriver","pickupDriverId","requiredDocuments","packagePptUrl","googleDriveUrl","packageCode","localManual","departureOt","updatedAt"] as const;
    const cleanPayload = Object.fromEntries(allowed.filter(k => (payload as any)[k] !== undefined).map(k => [k, (payload as any)[k]]));
    cleanPayload.updatedAt = new Date();
    const [group] = await db.update(packageGroups).set(cleanPayload as any)
      .where(eq(packageGroups.id, req.params.id)).returning();
    if (!group) return res.status(404).json({ error: "Not Found" });

    // Cascade status to all packages in this group when group status changes
    if (cleanPayload.status) {
      await db.update(packages)
        .set({ status: cleanPayload.status as string, updatedAt: new Date() })
        .where(eq(packages.packageGroupId, req.params.id));
    }

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

// Clone package group
router.post("/package-groups/:id/clone", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const [original] = await db.select().from(packageGroups).where(eq(packageGroups.id, req.params.id)).limit(1);
    if (!original) return res.status(404).json({ error: "Not Found" });

    const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = original;
    const [cloned] = await db.insert(packageGroups).values({
      ...fields,
      nameEn: `${original.nameEn} (Copy)`,
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return res.status(201).json(cloned);
  } catch (err) {
    console.error("[POST /package-groups/:id/clone]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Package Group Images ──────────────────────────────────────────────────────

// GET /package-groups/:id/images
router.get("/package-groups/:id/images", authenticate, async (req, res) => {
  try {
    const images = await db
      .select()
      .from(packageGroupImages)
      .where(eq(packageGroupImages.packageGroupId, req.params.id))
      .orderBy(asc(packageGroupImages.sortOrder), asc(packageGroupImages.createdAt));
    return res.json(images);
  } catch (err) {
    console.error("[GET /package-groups/:id/images]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /package-groups/:id/images
router.post("/package-groups/:id/images", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const { imageUrl } = req.body as { imageUrl: string };
    if (!imageUrl) return res.status(400).json({ error: "imageUrl is required" });

    const existing = await db
      .select({ id: packageGroupImages.id })
      .from(packageGroupImages)
      .where(eq(packageGroupImages.packageGroupId, req.params.id));

    if (existing.length >= 5) {
      return res.status(400).json({ error: "Maximum 5 images per package group" });
    }

    const isFirst = existing.length === 0;
    const [image] = await db
      .insert(packageGroupImages)
      .values({
        packageGroupId: req.params.id,
        imageUrl,
        isPrimary: isFirst,
        sortOrder: existing.length,
      })
      .returning();

    if (isFirst) {
      await db.update(packageGroups).set({ thumbnailUrl: imageUrl, updatedAt: new Date() })
        .where(eq(packageGroups.id, req.params.id));
    }

    return res.status(201).json(image);
  } catch (err) {
    console.error("[POST /package-groups/:id/images]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /package-groups/:id/images/:imageId
router.delete("/package-groups/:id/images/:imageId", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const [deleted] = await db
      .delete(packageGroupImages)
      .where(and(
        eq(packageGroupImages.id, req.params.imageId),
        eq(packageGroupImages.packageGroupId, req.params.id),
      ))
      .returning();

    if (deleted?.isPrimary) {
      // Promote next image to primary
      const [next] = await db.select().from(packageGroupImages)
        .where(eq(packageGroupImages.packageGroupId, req.params.id))
        .orderBy(asc(packageGroupImages.sortOrder)).limit(1);

      if (next) {
        await db.update(packageGroupImages).set({ isPrimary: true }).where(eq(packageGroupImages.id, next.id));
        await db.update(packageGroups).set({ thumbnailUrl: next.imageUrl, updatedAt: new Date() })
          .where(eq(packageGroups.id, req.params.id));
      } else {
        await db.update(packageGroups).set({ thumbnailUrl: null, updatedAt: new Date() })
          .where(eq(packageGroups.id, req.params.id));
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("[DELETE /package-groups/:id/images/:imageId]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /package-groups/:id/images/:imageId/set-primary
router.put("/package-groups/:id/images/:imageId/set-primary", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const { id: groupId, imageId } = req.params;
    await db.update(packageGroupImages).set({ isPrimary: false })
      .where(eq(packageGroupImages.packageGroupId, groupId));

    const [image] = await db.update(packageGroupImages).set({ isPrimary: true })
      .where(and(eq(packageGroupImages.id, imageId), eq(packageGroupImages.packageGroupId, groupId)))
      .returning();

    if (image) {
      await db.update(packageGroups).set({ thumbnailUrl: image.imageUrl, updatedAt: new Date() })
        .where(eq(packageGroups.id, groupId));
    }

    return res.json(image);
  } catch (err) {
    console.error("[PUT /package-groups/:id/images/:imageId/set-primary]", err);
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
        adults: packages.maxAdults,
        children: packages.maxStudents,
        priceAud: packages.priceAud,
        priceUsd: packages.priceUsd,
        priceKrw: packages.priceKrw,
        priceJpy: packages.priceJpy,
        priceThb: packages.priceThb,
        pricePhp: packages.pricePhp,
        priceSgd: packages.priceSgd,
        priceGbp: packages.priceGbp,
        features: packages.features,
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
        adults: packages.maxAdults,
        children: packages.maxStudents,
        priceAud: packages.priceAud,
        priceUsd: packages.priceUsd,
        priceKrw: packages.priceKrw,
        priceJpy: packages.priceJpy,
        priceThb: packages.priceThb,
        pricePhp: packages.pricePhp,
        priceSgd: packages.priceSgd,
        priceGbp: packages.priceGbp,
        features: packages.features,
        createdAt: packages.createdAt,
        updatedAt: packages.updatedAt,
        groupNameEn: packageGroups.nameEn,
        groupNameKo: packageGroups.nameKo,
        groupLocation: packageGroups.location,
        groupCountryCode: packageGroups.countryCode,
        groupStatus: packageGroups.status,
        groupCampProviderId: packageGroups.campProviderId,
        groupTypeId: packageGroups.typeId,
        groupProductGroupId: productTypes.productGroupId,
        durationDays: packages.durationDays,
        status: packages.status,
        coordinatorName: users.fullName,
        coordinatorEmail: users.email,
      })
      .from(packages)
      .leftJoin(packageGroups, eq(packages.packageGroupId, packageGroups.id))
      .leftJoin(productTypes, eq(packageGroups.typeId, productTypes.id))
      .leftJoin(users, eq(packageGroups.campProviderId, users.id))
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
    const allowed = ["name", "status", "maxAdults", "maxStudents", "features",
      "priceAud", "priceUsd", "priceKrw", "priceJpy", "priceThb", "pricePhp", "priceSgd", "priceGbp",
      "agentCommissionType", "agentCommissionRate", "agentCommissionFixed"] as const;
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of allowed) {
      if (key in req.body) patch[key] = req.body[key];
    }
    // Support alias fields from frontend (adults → maxAdults, children → maxStudents)
    if ("adults" in req.body) patch.maxAdults = req.body.adults;
    if ("children" in req.body) patch.maxStudents = req.body.children;
    const [pkg] = await db.update(packages).set(patch)
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

// Per-Package Products
router.get("/packages/:id/products", authenticate, async (req, res) => {
  try {
    const rows = await db
      .select({
        linkId:      packageProducts.id,
        packageId:   packageProducts.packageId,
        isOptional:  packageProducts.isOptional,
        quantity:    packageProducts.quantity,
        unitPrice:   packageProducts.unitPrice,
        productId:        products.id,
        productName:      products.productName,
        productType:      products.productType,
        description:      products.description,
        cost:             products.cost,
        currency:         products.currency,
        status:           products.status,
      })
      .from(packageProducts)
      .innerJoin(products, eq(packageProducts.productId, products.id))
      .where(eq(packageProducts.packageId, req.params.id))
      .orderBy(asc(packageProducts.isOptional), asc(products.productType), asc(products.productName));
    return res.json(rows);
  } catch (err) {
    console.error("[GET /packages/:id/products]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/packages/:id/products", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const { productId, isOptional = false, quantity = 1, unitPrice } = req.body;
    if (!productId) return res.status(400).json({ error: "productId is required" });
    const [link] = await db.insert(packageProducts).values({
      packageId:  req.params.id,
      productId,
      isOptional: Boolean(isOptional),
      quantity:   Number(quantity),
      unitPrice:  unitPrice ?? null,
    }).returning();
    return res.status(201).json(link);
  } catch (err: any) {
    console.error("[POST /packages/:id/products]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/packages/:id/products/:productId", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const { quantity, unitPrice, isOptional } = req.body;
    const updates: Record<string, unknown> = {};
    if (quantity != null) updates.quantity = Number(quantity);
    if (unitPrice != null) updates.unitPrice = unitPrice === "" ? null : String(unitPrice);
    if (isOptional != null) updates.isOptional = Boolean(isOptional);
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "No fields to update" });
    const [updated] = await db.update(packageProducts)
      .set(updates)
      .where(and(
        eq(packageProducts.packageId, req.params.id),
        eq(packageProducts.productId, req.params.productId),
      ))
      .returning();
    if (!updated) return res.status(404).json({ error: "Link not found" });
    return res.json(updated);
  } catch (err) {
    console.error("[PATCH /packages/:id/products/:productId]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/packages/:id/products/:productId", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const deleted = await db.delete(packageProducts)
      .where(and(
        eq(packageProducts.packageId,  req.params.id),
        eq(packageProducts.productId,  req.params.productId),
      ))
      .returning();
    if (deleted.length === 0) return res.status(404).json({ error: "Link not found" });
    return res.json({ success: true, message: "Product unlinked from package" });
  } catch (err) {
    console.error("[DELETE /packages/:id/products/:productId]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Products
// ─── PRODUCT LOOKUP HELPERS ───────────────────────────────────────────────────

router.get("/products-lookup/product-types", authenticate, async (_req, res) => {
  try {
    const rows = await db.select({ id: productTypes.id, name: productTypes.name, productGroupId: productTypes.productGroupId })
      .from(productTypes).where(eq(productTypes.status, "Active")).orderBy(asc(productTypes.name));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

router.get("/products-lookup/accounts", authenticate, async (_req, res) => {
  try {
    const rows = await db.select({ id: accounts.id, name: accounts.name, country: accounts.country, city: accounts.city, location: accounts.location })
      .from(accounts).where(eq(accounts.status, "Active")).orderBy(asc(accounts.name)).limit(300);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

router.get("/products-lookup/commissions", authenticate, async (_req, res) => {
  try {
    const rows = await db.select({ id: commissions.id, name: commissions.name })
      .from(commissions).where(eq(commissions.status, "Active")).orderBy(asc(commissions.name));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

router.get("/products-lookup/promotions", authenticate, async (_req, res) => {
  try {
    const rows = await db.select({ id: promotions.id, name: promotions.name })
      .from(promotions).where(eq(promotions.status, "Active")).orderBy(asc(promotions.name)).limit(200);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

router.get("/products-lookup/tax-rates", authenticate, async (_req, res) => {
  try {
    const rows = await db.select({ id: taxRates.id, name: taxRates.name, rate: taxRates.rate })
      .from(taxRates).where(eq(taxRates.status, "Active")).orderBy(asc(taxRates.name));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

router.get("/products-lookup/package-groups", authenticate, async (req, res) => {
  try {
    const { search } = req.query as Record<string, string>;
    const conditions: SQL[] = [eq(packageGroups.status, "active")];
    if (search) conditions.push(ilike(packageGroups.nameEn, `%${search}%`));
    const rows = await db
      .select({ id: packageGroups.id, name: packageGroups.nameEn, countryCode: packageGroups.countryCode })
      .from(packageGroups)
      .where(and(...conditions))
      .orderBy(asc(packageGroups.nameEn))
      .limit(100);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

router.get("/products-lookup/commissions-detail", authenticate, async (_req, res) => {
  try {
    const rows = await db
      .select({ id: commissions.id, name: commissions.name, commissionType: commissions.commissionType, rateValue: commissions.rateValue })
      .from(commissions).where(eq(commissions.status, "Active")).orderBy(asc(commissions.name));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

router.get("/products-lookup/promotions-detail", authenticate, async (_req, res) => {
  try {
    const rows = await db
      .select({ id: promotions.id, name: promotions.name, fromDate: promotions.fromDate, toDate: promotions.toDate })
      .from(promotions).where(eq(promotions.status, "Active")).orderBy(asc(promotions.name)).limit(200);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

router.get("/products-lookup/camp-packages", authenticate, async (_req, res) => {
  try {
    const rows = await db
      .select({
        id:            products.id,
        productName:   products.productName,
        cost:          products.cost,
        price:         products.price,
        currency:      products.currency,
        campPackageId: products.campPackageId,
        status:        products.status,
      })
      .from(products)
      .where(and(eq(products.productContext, "camp_package"), eq(products.status, "Active")))
      .orderBy(asc(products.productName));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

router.get("/products-lookup/camp-addons", authenticate, async (req, res) => {
  try {
    const { campPackageId } = req.query as Record<string, string>;
    const conds = [eq(products.productContext, "camp_addon"), eq(products.status, "Active")];
    if (campPackageId) conds.push(eq(products.campPackageId, campPackageId));
    const rows = await db
      .select({
        id:              products.id,
        productName:     products.productName,
        cost:            products.cost,
        price:           products.price,
        currency:        products.currency,
        campPackageId:   products.campPackageId,
        itemDescription: products.itemDescription,
        status:          products.status,
      })
      .from(products)
      .where(and(...conds))
      .orderBy(asc(products.productName));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

// ─── PRODUCTS ────────────────────────────────────────────────────────────────

router.get("/products", authenticate, async (req, res) => {
  try {
    const {
      productType, status, page = "1", limit = "20",
      search, productPriority, productGrade, productTypeId, productGroup,
      searchCategory, display_on_quote, provider, productContext,
      country, location,
    } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (productType)      conditions.push(eq(products.productType, productType));
    if (status)           conditions.push(eq(products.status, status));
    if (productPriority)  conditions.push(eq(products.productPriority, parseInt(productPriority)));
    if (productGrade)     conditions.push(eq(products.productGrade, productGrade));
    if (productTypeId)    conditions.push(eq(products.productTypeId, productTypeId));
    if (productGroup)     conditions.push(eq(productTypes.productGroupId, productGroup));
    if (display_on_quote === "true")  conditions.push(eq(products.displayOnQuote, true));
    if (display_on_quote === "false") conditions.push(eq(products.displayOnQuote, false));
    if (provider)         conditions.push(eq(products.providerId, provider));
    if (productContext)   conditions.push(eq(products.productContext, productContext));
    if (country)          conditions.push(eq(accounts.country, country));
    if (location)         conditions.push(ilike(accounts.location, `%${location}%`));
    if (search) {
      const q = `%${search}%`;
      if (searchCategory === "provider") {
        conditions.push(ilike(accounts.name, q));
      } else if (searchCategory === "name") {
        conditions.push(ilike(products.productName, q));
      } else {
        conditions.push(or(ilike(products.productName, q), ilike(accounts.name, q)) as SQL);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const baseFrom = db.select({
      id:                products.id,
      productName:       products.productName,
      productType:       products.productType,
      description:       products.description,
      itemDescription:   products.itemDescription,
      cost:              products.cost,
      currency:          products.currency,
      price:             products.price,
      productGrade:      products.productGrade,
      productPriority:   products.productPriority,
      status:            products.status,
      providerId:        products.providerId,
      providerName:      accounts.name,
      providerCountry:   accounts.country,
      providerLocation:  accounts.location,
      numberOfPayments:  products.numberOfPayments,
      minimumPayment:    products.minimumPayment,
      isRecommend:       products.isRecommend,
      isGstIncluded:     products.isGstIncluded,
      displayOnQuote:    products.displayOnQuote,
      displayOnInvoice:  products.displayOnInvoice,
      defaultPaymentTerm: products.defaultPaymentTerm,
      installmentPlan:   products.installmentPlan,
      promotionId:       products.promotionId,
      productContext:    products.productContext,
      campPackageId:     products.campPackageId,
      productTypeId:     products.productTypeId,
      serviceModuleType: products.serviceModuleType,
      country:           products.country,
      city:              products.city,
      location:          products.location,
      createdAt:         products.createdAt,
      updatedAt:         products.updatedAt,
    })
      .from(products)
      .leftJoin(accounts, eq(products.providerId, accounts.id))
      .leftJoin(productTypes, eq(products.productTypeId, productTypes.id));

    const [totalResult] = await db
      .select({ count: count() })
      .from(products)
      .leftJoin(accounts, eq(products.providerId, accounts.id))
      .leftJoin(productTypes, eq(products.productTypeId, productTypes.id))
      .where(whereClause);

    const [data, allRates] = await Promise.all([
      baseFrom.where(whereClause).limit(limitNum).offset(offset),
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

router.get("/products/:id/linked-packages", authenticate, async (req, res) => {
  try {
    const rows = await db
      .select({
        linkId:         packageProducts.id,
        isOptional:     packageProducts.isOptional,
        quantity:       packageProducts.quantity,
        unitPrice:      packageProducts.unitPrice,
        packageId:      packages.id,
        packageName:    packages.name,
        packageStatus:  packages.status,
        durationDays:   packages.durationDays,
        packageGroupId: packages.packageGroupId,
        groupNameEn:    packageGroups.nameEn,
        groupNameKo:    packageGroups.nameKo,
        groupLocation:  packageGroups.location,
        groupCountryCode: packageGroups.countryCode,
      })
      .from(packageProducts)
      .innerJoin(packages, eq(packageProducts.packageId, packages.id))
      .leftJoin(packageGroups, eq(packages.packageGroupId, packageGroups.id))
      .where(eq(packageProducts.productId, req.params.id))
      .orderBy(asc(packageGroups.nameEn), asc(packages.name));
    return res.json(rows);
  } catch (err) {
    console.error("[GET /products/:id/linked-packages]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/products/:id/linked-groups", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const productId = req.params.id;
    const { packageGroupIds }: { packageGroupIds: string[] } = req.body;
    if (!Array.isArray(packageGroupIds)) {
      return res.status(400).json({ error: "packageGroupIds must be an array" });
    }

    const existing = await db
      .select({ id: packageGroupProducts.id, packageGroupId: packageGroupProducts.packageGroupId })
      .from(packageGroupProducts)
      .where(eq(packageGroupProducts.productId, productId));

    const existingIds = existing.map(r => r.packageGroupId!);
    const toAdd    = packageGroupIds.filter(id => !existingIds.includes(id));
    const toRemove = existing.filter(r => !packageGroupIds.includes(r.packageGroupId!)).map(r => r.id);

    if (toRemove.length > 0) {
      for (const linkId of toRemove) {
        await db.delete(packageGroupProducts).where(eq(packageGroupProducts.id, linkId));
      }
    }
    if (toAdd.length > 0) {
      await db.insert(packageGroupProducts).values(
        toAdd.map(packageGroupId => ({ productId, packageGroupId, quantity: 1 }))
      );
    }

    const updated = await db
      .select({
        linkId:         packageGroupProducts.id,
        packageGroupId: packageGroups.id,
        nameEn:         packageGroups.nameEn,
      })
      .from(packageGroupProducts)
      .innerJoin(packageGroups, eq(packageGroupProducts.packageGroupId, packageGroups.id))
      .where(eq(packageGroupProducts.productId, productId))
      .orderBy(asc(packageGroups.nameEn));

    return res.json(updated);
  } catch (err) {
    console.error("[PUT /products/:id/linked-groups]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/products/:id", authenticate, async (req, res) => {
  try {
    const [row] = await db
      .select({
        product: products,
        providerName:    accounts.name,
        providerCountry:   accounts.country,
        providerLocation:  accounts.location,
      })
      .from(products)
      .leftJoin(accounts, eq(products.providerId, accounts.id))
      .where(eq(products.id, req.params.id))
      .limit(1);
    if (!row) return res.status(404).json({ error: "Not Found" });
    return res.json({
      ...row.product,
      providerName:    row.providerName    ?? null,
      providerCountry:  row.providerCountry  ?? null,
      providerLocation: row.providerLocation ?? null,
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/products/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    // Strip non-column and computed/join fields
    const {
      id: _id, createdAt: _ca, updatedAt: _ua, modifiedOn: _mo, convertedCost: _cc,
      providerCountry: _pc, providerLocation: _pl, providerName: _pn, typeName: _tn,
      ...body
    } = req.body;

    // Convert timestamp string fields to Date objects
    const toDate = (v: unknown): Date | null => {
      if (!v) return null;
      if (v instanceof Date) return v;
      const d = new Date(v as string);
      return isNaN(d.getTime()) ? null : d;
    };

    const cleaned: Record<string, unknown> = { ...body };
    if ("startDate" in cleaned) cleaned.startDate = toDate(cleaned.startDate);
    if ("endDate"   in cleaned) cleaned.endDate   = toDate(cleaned.endDate);

    const [product] = await db.update(products).set({ ...cleaned, updatedAt: new Date(), modifiedOn: new Date() })
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
  const isCC = req.user!.role === "camp_coordinator";

  const handler = async () => {
  try {
    const { packageGroupId } = req.query as Record<string, string>;
    const conditions: SQL[] = [];

    if (packageGroupId) conditions.push(eq(enrollmentSpots.packageGroupId, packageGroupId));

    // Camp coordinators can only see spots for groups where they are campProvider OR coordinator
    // Priority: org impersonation (req.tenant) → user's own org → user's id
    if (isCC) {
      const orgId = req.tenant?.id ?? req.user!.organisationId ?? req.user!.id;
      conditions.push(
        or(
          eq(packageGroups.campProviderId, orgId),
          eq(packageGroups.coordinatorId, orgId)
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: enrollmentSpots.id,
        packageGroupId: enrollmentSpots.packageGroupId,
        packageGroupName: packageGroups.nameEn,
        enrollName: enrollmentSpots.enrollName,
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
        note: enrollmentSpots.note,
        updatedAt: enrollmentSpots.updatedAt,
      })
      .from(enrollmentSpots)
      .leftJoin(packageGroups, eq(enrollmentSpots.packageGroupId, packageGroups.id))
      .where(whereClause)
      .orderBy(asc(enrollmentSpots.gradeOrder), asc(enrollmentSpots.gradeLabel));

    // Compute enrollCount + instituteMgt per spot from applicationGrade + applicationParticipants
    const spotIds = rows.map(r => r.id);
    let gradeRows: { spotId: string; schoolName: string | null; fullName: string; fullNameNative: string | null }[] = [];
    if (spotIds.length > 0) {
      gradeRows = await db
        .select({
          spotId: applicationGrade.enrollmentSpotId,
          schoolName: applicationParticipants.schoolName,
          fullName: applicationParticipants.fullName,
          fullNameNative: applicationParticipants.fullNameNative,
        })
        .from(applicationGrade)
        .innerJoin(applicationParticipants, eq(applicationGrade.participantId, applicationParticipants.id))
        .where(
          sql`${applicationGrade.enrollmentSpotId} = ANY(${sql.raw(`ARRAY[${spotIds.map(id => `'${id}'`).join(",")}]::uuid[]`)})`,
        );
    }

    // Group gradeRows by spotId
    const gradeBySpot = new Map<string, typeof gradeRows>();
    for (const g of gradeRows) {
      if (!g.spotId) continue;
      if (!gradeBySpot.has(g.spotId)) gradeBySpot.set(g.spotId, []);
      gradeBySpot.get(g.spotId)!.push(g);
    }

    const data = rows.map(r => {
      const entries = gradeBySpot.get(r.id) ?? [];
      const enrollCount = entries.length;
      const instituteMgt = entries
        .map(e => {
          const school = e.schoolName ?? "";
          const name = e.fullName ?? "";
          const native = e.fullNameNative ?? "";
          if (!school && !name) return null;
          if (school && native) return `${school}_${name} | ${native}`;
          if (school) return `${school}_${name}`;
          return name;
        })
        .filter(Boolean)
        .join(", ");

      return {
        ...r,
        enrollCount,
        instituteMgt: instituteMgt || null,
        available: (r.totalSpots ?? 0) - enrollCount,
      };
    });

    return res.json({ data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
  }; // end handler

  // CC users from partner orgs must query master schema (their org schema has no data)
  if (isCC) {
    await runWithTenantSchema(MASTER_TENANT, handler);
  } else {
    await handler();
  }
});

router.post("/enrollment-spots", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const { packageGroupId, enrollName, gradeLabel, gradeOrder, totalSpots, manualReserved, status, startDate, endDate, dobRangeStart, dobRangeEnd, note } = req.body;
    if (!packageGroupId || !gradeLabel || totalSpots == null) {
      return res.status(400).json({ error: "packageGroupId, gradeLabel, totalSpots are required" });
    }
    // Camp coordinators can only create for groups where they are campProvider OR coordinator
    if (req.user!.role === "camp_coordinator") {
      const orgId = req.user!.organisationId ?? req.user!.id;
      const [grp] = await db.select({ campProviderId: packageGroups.campProviderId, coordinatorId: packageGroups.coordinatorId })
        .from(packageGroups).where(eq(packageGroups.id, packageGroupId)).limit(1);
      if (!grp || (grp.campProviderId !== orgId && grp.coordinatorId !== orgId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }
    const [spot] = await db.insert(enrollmentSpots).values({
      packageGroupId,
      enrollName: enrollName ?? null,
      gradeLabel,
      gradeOrder: gradeOrder ?? 0,
      totalSpots: Number(totalSpots),
      manualReserved: manualReserved != null ? Number(manualReserved) : 0,
      status: status ?? "available",
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      dobRangeStart: dobRangeStart ? new Date(dobRangeStart) : null,
      dobRangeEnd: dobRangeEnd ? new Date(dobRangeEnd) : null,
      note: note ?? null,
    }).returning();
    return res.status(201).json(spot);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/enrollment-spots/:id", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const allowed = ["enrollName", "gradeLabel", "gradeOrder", "totalSpots", "manualReserved", "status", "startDate", "endDate", "dobRangeStart", "dobRangeEnd", "note"] as const;
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of allowed) {
      if (key in req.body) {
        if (["startDate", "endDate", "dobRangeStart", "dobRangeEnd"].includes(key)) {
          patch[key] = req.body[key] ? new Date(req.body[key]) : null;
        } else {
          patch[key] = req.body[key];
        }
      }
    }
    const [spot] = await db.update(enrollmentSpots).set(patch)
      .where(eq(enrollmentSpots.id, req.params.id)).returning();
    if (!spot) return res.status(404).json({ error: "Not Found" });
    return res.json(spot);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/enrollment-spots/:id", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const [spot] = await db.delete(enrollmentSpots)
      .where(eq(enrollmentSpots.id, req.params.id)).returning({ id: enrollmentSpots.id });
    if (!spot) return res.status(404).json({ error: "Not Found" });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Interview Settings
router.post("/interview-settings", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const { packageGroupId, isRequired, format, durationMinutes, notes } = req.body;
    if (!packageGroupId) return res.status(400).json({ error: "packageGroupId is required" });
    const [row] = await db.insert(interviewSettings)
      .values({ packageGroupId, isRequired, format, durationMinutes, notes })
      .onConflictDoUpdate({
        target: interviewSettings.packageGroupId,
        set: { isRequired, format, durationMinutes, notes, updatedAt: new Date() },
      })
      .returning();
    return res.status(201).json(row);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/interview-settings/:packageGroupId", authenticate, async (req, res) => {
  try {
    const [row] = await db.select().from(interviewSettings)
      .where(eq(interviewSettings.packageGroupId, req.params.packageGroupId)).limit(1);
    if (!row) return res.status(404).json({ error: "Not Found" });
    return res.json(row);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── DELETE /api/package-groups/bulk  (super_admin 임시/영구 삭제) ────────────
router.delete("/package-groups/bulk", authenticate, async (req, res) => {
  if ((req.user as any)?.role !== "super_admin") return res.status(403).json({ error: "Forbidden" });
  try {
    const { ids, soft } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids array required" });
    if (soft) {
      await db.update(packageGroups).set({ status: "archived" }).where(inArray(packageGroups.id, ids));
      return res.json({ success: true, updated: ids.length });
    }
    await db.delete(packageGroups).where(inArray(packageGroups.id, ids));
    return res.json({ success: true, deleted: ids.length });
  } catch (err) {
    console.error("[DELETE /api/package-groups/bulk]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/packages/bulk  (super_admin 임시/영구 삭제) ─────────────────
router.delete("/packages/bulk", authenticate, async (req, res) => {
  if ((req.user as any)?.role !== "super_admin") return res.status(403).json({ error: "Forbidden" });
  try {
    const { ids, soft } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids array required" });
    if (soft) {
      await db.update(packages).set({ status: "archived" }).where(inArray(packages.id, ids));
      return res.json({ success: true, updated: ids.length });
    }
    await db.delete(packages).where(inArray(packages.id, ids));
    return res.json({ success: true, deleted: ids.length });
  } catch (err) {
    console.error("[DELETE /api/packages/bulk]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
