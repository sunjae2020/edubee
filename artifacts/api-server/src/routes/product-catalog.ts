import { Router } from "express";
import { db } from "@workspace/db";
import { productGroups, productTypes, promotions, commissions } from "@workspace/db/schema";
import { products } from "@workspace/db/schema";
import { accounts } from "@workspace/db/schema";
import { eq, ilike, and, count, SQL, gte, lte, inArray } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin"];

// ─── PRODUCT GROUPS ───────────────────────────────────────────────────────────

router.get("/product-groups", authenticate, async (req, res) => {
  try {
    const { status, search } = req.query as Record<string, string>;
    const conditions: SQL[] = [];
    if (status)  conditions.push(eq(productGroups.status, status));
    if (search)  conditions.push(ilike(productGroups.name, `%${search}%`));
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id:          productGroups.id,
        name:        productGroups.name,
        description: productGroups.description,
        status:      productGroups.status,
        createdOn:   productGroups.createdOn,
        modifiedOn:  productGroups.modifiedOn,
        productCount: count(productTypes.id),
      })
      .from(productGroups)
      .leftJoin(productTypes, eq(productTypes.productGroupId, productGroups.id))
      .where(where)
      .groupBy(productGroups.id)
      .orderBy(productGroups.createdOn);

    res.json(rows);
  } catch (err) {
    console.error("[GET /product-groups]", err);
    res.status(500).json({ error: "Failed to fetch product groups" });
  }
});

router.post("/product-groups", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { name, description, status = "Active" } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const [row] = await db.insert(productGroups).values({ name, description, status }).returning();
    res.status(201).json(row);
  } catch (err) {
    console.error("[POST /product-groups]", err);
    res.status(500).json({ error: "Failed to create product group" });
  }
});

router.get("/product-groups/:id", authenticate, async (req, res) => {
  try {
    const [row] = await db.select().from(productGroups).where(eq(productGroups.id, req.params.id as string));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    console.error("[GET /product-groups/:id]", err);
    res.status(500).json({ error: "Failed to fetch product group" });
  }
});

router.put("/product-groups/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const [row] = await db
      .update(productGroups)
      .set({ name, description, status, modifiedOn: new Date() })
      .where(eq(productGroups.id, req.params.id as string))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    console.error("[PUT /product-groups/:id]", err);
    res.status(500).json({ error: "Failed to update product group" });
  }
});

router.delete("/product-groups/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [row] = await db
      .update(productGroups)
      .set({ status: "Inactive", modifiedOn: new Date() })
      .where(eq(productGroups.id, req.params.id as string))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    console.error("[DELETE /product-groups/:id]", err);
    res.status(500).json({ error: "Failed to deactivate product group" });
  }
});

// ─── PRODUCT TYPES ────────────────────────────────────────────────────────────

router.get("/product-types", authenticate, async (req, res) => {
  try {
    const { status, search, product_group_id, service_module_type } = req.query as Record<string, string>;
    const conditions: SQL[] = [];
    if (status)              conditions.push(eq(productTypes.status, status));
    if (search)              conditions.push(ilike(productTypes.name, `%${search}%`));
    if (product_group_id)    conditions.push(eq(productTypes.productGroupId, product_group_id));
    if (service_module_type) conditions.push(eq(productTypes.serviceModuleType, service_module_type));
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id:                productTypes.id,
        name:              productTypes.name,
        productGroupId:    productTypes.productGroupId,
        productGroupName:  productGroups.name,
        serviceModuleType: productTypes.serviceModuleType,
        description:       productTypes.description,
        status:            productTypes.status,
        createdOn:         productTypes.createdOn,
        modifiedOn:        productTypes.modifiedOn,
      })
      .from(productTypes)
      .leftJoin(productGroups, eq(productTypes.productGroupId, productGroups.id))
      .where(where)
      .orderBy(productTypes.createdOn);

    res.json(rows);
  } catch (err) {
    console.error("[GET /product-types]", err);
    res.status(500).json({ error: "Failed to fetch product types" });
  }
});

router.post("/product-types", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { name, productGroupId, serviceModuleType, description, status = "Active" } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const [row] = await db
      .insert(productTypes)
      .values({ name, productGroupId, serviceModuleType, description, status })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    console.error("[POST /product-types]", err);
    res.status(500).json({ error: "Failed to create product type" });
  }
});

router.get("/product-types/:id", authenticate, async (req, res) => {
  try {
    const [row] = await db
      .select({
        id:                productTypes.id,
        name:              productTypes.name,
        productGroupId:    productTypes.productGroupId,
        productGroupName:  productGroups.name,
        serviceModuleType: productTypes.serviceModuleType,
        description:       productTypes.description,
        status:            productTypes.status,
        createdOn:         productTypes.createdOn,
      })
      .from(productTypes)
      .leftJoin(productGroups, eq(productTypes.productGroupId, productGroups.id))
      .where(eq(productTypes.id, req.params.id as string));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    console.error("[GET /product-types/:id]", err);
    res.status(500).json({ error: "Failed to fetch product type" });
  }
});

router.put("/product-types/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { name, productGroupId, serviceModuleType, description, status } = req.body;
    const [row] = await db
      .update(productTypes)
      .set({ name, productGroupId, serviceModuleType, description, status, modifiedOn: new Date() })
      .where(eq(productTypes.id, req.params.id as string))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    console.error("[PUT /product-types/:id]", err);
    res.status(500).json({ error: "Failed to update product type" });
  }
});

router.delete("/product-types/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [row] = await db
      .update(productTypes)
      .set({ status: "Inactive", modifiedOn: new Date() })
      .where(eq(productTypes.id, req.params.id as string))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    console.error("[DELETE /product-types/:id]", err);
    res.status(500).json({ error: "Failed to deactivate product type" });
  }
});

// ─── PROMOTIONS ───────────────────────────────────────────────────────────────

router.get("/promotions", authenticate, async (req, res) => {
  try {
    const { status, search, product_id } = req.query as Record<string, string>;
    const conditions: SQL[] = [];
    if (status)     conditions.push(eq(promotions.status, status));
    if (search)     conditions.push(ilike(promotions.name, `%${search}%`));
    if (product_id) conditions.push(eq(promotions.productId, product_id));
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id:             promotions.id,
        name:           promotions.name,
        productId:      promotions.productId,
        productName:    products.productName,
        accountId:      promotions.accountId,
        accountName:    accounts.name,
        fromDate:       promotions.fromDate,
        toDate:         promotions.toDate,
        promotionPrice: promotions.promotionPrice,
        status:         promotions.status,
        createdOn:      promotions.createdOn,
        modifiedOn:     promotions.modifiedOn,
      })
      .from(promotions)
      .leftJoin(products, eq(promotions.productId, products.id))
      .leftJoin(accounts, eq(promotions.accountId, accounts.id))
      .where(where)
      .orderBy(promotions.createdOn);

    res.json(rows);
  } catch (err) {
    console.error("[GET /promotions]", err);
    res.status(500).json({ error: "Failed to fetch promotions" });
  }
});

router.post("/promotions", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { name, productId, accountId, fromDate, toDate, promotionPrice, status = "Active" } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const [row] = await db
      .insert(promotions)
      .values({ name, productId, accountId, fromDate, toDate, promotionPrice, status })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    console.error("[POST /promotions]", err);
    res.status(500).json({ error: "Failed to create promotion" });
  }
});

router.get("/promotions/:id", authenticate, async (req, res) => {
  try {
    const [row] = await db
      .select({
        id:             promotions.id,
        name:           promotions.name,
        productId:      promotions.productId,
        productName:    products.productName,
        accountId:      promotions.accountId,
        accountName:    accounts.name,
        fromDate:       promotions.fromDate,
        toDate:         promotions.toDate,
        promotionPrice: promotions.promotionPrice,
        status:         promotions.status,
        createdOn:      promotions.createdOn,
      })
      .from(promotions)
      .leftJoin(products, eq(promotions.productId, products.id))
      .leftJoin(accounts, eq(promotions.accountId, accounts.id))
      .where(eq(promotions.id, req.params.id as string));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    console.error("[GET /promotions/:id]", err);
    res.status(500).json({ error: "Failed to fetch promotion" });
  }
});

router.put("/promotions/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { name, productId, accountId, fromDate, toDate, promotionPrice, status } = req.body;
    const [row] = await db
      .update(promotions)
      .set({ name, productId, accountId, fromDate, toDate, promotionPrice, status, modifiedOn: new Date() })
      .where(eq(promotions.id, req.params.id as string))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    console.error("[PUT /promotions/:id]", err);
    res.status(500).json({ error: "Failed to update promotion" });
  }
});

router.delete("/promotions/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [row] = await db
      .update(promotions)
      .set({ status: "Inactive", modifiedOn: new Date() })
      .where(eq(promotions.id, req.params.id as string))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    console.error("[DELETE /promotions/:id]", err);
    res.status(500).json({ error: "Failed to deactivate promotion" });
  }
});

// ─── COMMISSIONS ──────────────────────────────────────────────────────────────

router.get("/commissions", authenticate, async (req, res) => {
  try {
    const { status, search, commission_type } = req.query as Record<string, string>;
    const conditions: SQL[] = [];
    if (status)          conditions.push(eq(commissions.status, status));
    if (search)          conditions.push(ilike(commissions.name, `%${search}%`));
    if (commission_type) conditions.push(eq(commissions.commissionType, commission_type));
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(commissions)
      .where(where)
      .orderBy(commissions.commissionType, commissions.name);

    res.json(rows);
  } catch (err) {
    console.error("[GET /commissions]", err);
    res.status(500).json({ error: "Failed to fetch commissions" });
  }
});

router.post("/commissions", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { name, commissionType, rateValue, description, status = "Active" } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const [row] = await db
      .insert(commissions)
      .values({ name, commissionType: commissionType ?? "rate", rateValue, description, status })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    console.error("[POST /commissions]", err);
    res.status(500).json({ error: "Failed to create commission" });
  }
});

router.get("/commissions/:id", authenticate, async (req, res) => {
  try {
    const [row] = await db.select().from(commissions).where(eq(commissions.id, req.params.id as string));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    console.error("[GET /commissions/:id]", err);
    res.status(500).json({ error: "Failed to fetch commission" });
  }
});

router.put("/commissions/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { name, commissionType, rateValue, description, status } = req.body;
    const [row] = await db
      .update(commissions)
      .set({ name, commissionType, rateValue, description, status, modifiedOn: new Date() })
      .where(eq(commissions.id, req.params.id as string))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    console.error("[PUT /commissions/:id]", err);
    res.status(500).json({ error: "Failed to update commission" });
  }
});

router.delete("/commissions/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [row] = await db
      .update(commissions)
      .set({ status: "Inactive", modifiedOn: new Date() })
      .where(eq(commissions.id, req.params.id as string))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    console.error("[DELETE /commissions/:id]", err);
    res.status(500).json({ error: "Failed to deactivate commission" });
  }
});

// ─── DELETE /api/product-groups/bulk  (super_admin soft/permanent delete) ─────
router.delete("/product-groups/bulk", authenticate, async (req, res) => {
  if (!["super_admin","admin"].includes((req.user as any)?.role)) return res.status(403).json({ error: "Forbidden" });
  try {
    const { ids, soft } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids array required" });
    if (soft) {
      await db.update(productGroups).set({ status: "Inactive" }).where(inArray(productGroups.id, ids));
      return res.json({ success: true, updated: ids.length });
    }
    await db.delete(productGroups).where(inArray(productGroups.id, ids));
    return res.json({ success: true, deleted: ids.length });
  } catch (err) {
    console.error("[DELETE /api/product-groups/bulk]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/product-types/bulk  (super_admin soft/permanent delete) ─────
router.delete("/product-types/bulk", authenticate, async (req, res) => {
  if (!["super_admin","admin"].includes((req.user as any)?.role)) return res.status(403).json({ error: "Forbidden" });
  try {
    const { ids, soft } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids array required" });
    if (soft) {
      await db.update(productTypes).set({ status: "Inactive" }).where(inArray(productTypes.id, ids));
      return res.json({ success: true, updated: ids.length });
    }
    await db.delete(productTypes).where(inArray(productTypes.id, ids));
    return res.json({ success: true, deleted: ids.length });
  } catch (err) {
    console.error("[DELETE /api/product-types/bulk]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/promotions/bulk  (super_admin soft/permanent delete) ────────
router.delete("/promotions/bulk", authenticate, async (req, res) => {
  if (!["super_admin","admin"].includes((req.user as any)?.role)) return res.status(403).json({ error: "Forbidden" });
  try {
    const { ids, soft } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids array required" });
    if (soft) {
      await db.update(promotions).set({ status: "Inactive" }).where(inArray(promotions.id, ids));
      return res.json({ success: true, updated: ids.length });
    }
    await db.delete(promotions).where(inArray(promotions.id, ids));
    return res.json({ success: true, deleted: ids.length });
  } catch (err) {
    console.error("[DELETE /api/promotions/bulk]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/commissions/bulk  (super_admin soft/permanent delete) ───────
router.delete("/commissions/bulk", authenticate, async (req, res) => {
  if (!["super_admin","admin"].includes((req.user as any)?.role)) return res.status(403).json({ error: "Forbidden" });
  try {
    const { ids, soft } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids array required" });
    if (soft) {
      await db.update(commissions).set({ status: "Inactive" }).where(inArray(commissions.id, ids));
      return res.json({ success: true, updated: ids.length });
    }
    await db.delete(commissions).where(inArray(commissions.id, ids));
    return res.json({ success: true, deleted: ids.length });
  } catch (err) {
    console.error("[DELETE /api/commissions/bulk]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
