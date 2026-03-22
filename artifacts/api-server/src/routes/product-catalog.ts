import { Router } from "express";
import { db } from "@workspace/db";
import { productGroups, productTypes, promotions } from "@workspace/db/schema";
import { products } from "@workspace/db/schema";
import { accounts } from "@workspace/db/schema";
import { eq, ilike, and, count, SQL, gte, lte } from "drizzle-orm";
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
    const [row] = await db.select().from(productGroups).where(eq(productGroups.id, req.params.id));
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
      .where(eq(productGroups.id, req.params.id))
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
      .where(eq(productGroups.id, req.params.id))
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
      .where(eq(productTypes.id, req.params.id));
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
      .where(eq(productTypes.id, req.params.id))
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
      .where(eq(productTypes.id, req.params.id))
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
      .where(eq(promotions.id, req.params.id));
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
      .where(eq(promotions.id, req.params.id))
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
      .where(eq(promotions.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    console.error("[DELETE /promotions/:id]", err);
    res.status(500).json({ error: "Failed to deactivate promotion" });
  }
});

export default router;
