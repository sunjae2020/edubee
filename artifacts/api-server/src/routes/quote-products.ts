import { Router } from "express";
import { db } from "@workspace/db";
import { quote_products, quotes, products, accounts } from "@workspace/db/schema";
import { eq, and, desc, asc, inArray } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin", "camp_coordinator"];

// ─── Helpers ────────────────────────────────────────────────────────────────
async function getMaxSortIndex(quoteId: string): Promise<number> {
  const rows = await db
    .select({ sortIndex: quote_products.sortIndex })
    .from(quote_products)
    .where(and(eq(quote_products.quoteId, quoteId), eq(quote_products.status, "Active")));
  return rows.length ? Math.max(...rows.map(r => r.sortIndex ?? 0)) : -1;
}

// ─── GET /api/quote-products?quoteId=xxx ────────────────────────────────────
router.get("/quote-products", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { quoteId } = req.query as Record<string, string>;
    if (!quoteId) return res.status(400).json({ error: "quoteId is required" });

    const rows = await db
      .select({
        qp: quote_products,
        providerName: accounts.name,
      })
      .from(quote_products)
      .leftJoin(products, eq(quote_products.productId, products.id))
      .leftJoin(accounts, eq(products.providerId, accounts.id))
      .where(and(eq(quote_products.quoteId, quoteId), eq(quote_products.status, "Active")))
      .orderBy(asc(quote_products.sortIndex));

    return res.json(rows.map(r => ({ ...r.qp, providerName: r.providerName ?? null })));
  } catch (err) {
    console.error("[GET /api/quote-products]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/quote-products/bulk ─────────────────────────────────────────
router.post("/quote-products/bulk", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { quoteId, items } = req.body;
    if (!quoteId || !Array.isArray(items) || !items.length)
      return res.status(400).json({ error: "quoteId and items[] are required" });

    const inserted = await db.insert(quote_products).values(
      items.map((it: any) => ({
        quoteId,
        productId:         it.product_id ?? null,
        manualInput:       it.manual_input ?? false,
        name:              it.name ?? "Item",
        productName:       it.name ?? "Item",
        itemDescription:   it.item_description ?? null,
        price:             String(it.price ?? "0"),
        quantity:          it.quantity ?? 1,
        isInitialPayment:  it.is_initial_payment ?? false,
        dueDate:           it.due_date ? new Date(it.due_date) : null,
        sortIndex:         it.sort_index ?? 0,
        isGstIncluded:     it.is_gst_included ?? false,
        serviceModuleType: it.service_module_type ?? null,
        status:            "Active",
      }))
    ).returning();

    return res.status(201).json(inserted);
  } catch (err) {
    console.error("[POST /api/quote-products/bulk]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/quote-products/reorder ─────────────────────────────────────
router.patch("/quote-products/reorder", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { quoteId, items } = req.body as { quoteId: string; items: { id: string; sort_index: number }[] };
    if (!quoteId || !Array.isArray(items))
      return res.status(400).json({ error: "quoteId and items[] are required" });

    // Validate all IDs belong to this quote
    const existing = await db
      .select({ id: quote_products.id })
      .from(quote_products)
      .where(eq(quote_products.quoteId, quoteId));
    const ownedIds = new Set(existing.map(r => r.id));
    for (const it of items) {
      if (!ownedIds.has(it.id)) return res.status(403).json({ error: `Item ${it.id} does not belong to quote` });
    }

    // Update each item's sort_index
    await Promise.all(
      items.map(it =>
        db.update(quote_products)
          .set({ sortIndex: it.sort_index, modifiedOn: new Date() })
          .where(and(eq(quote_products.id, it.id), eq(quote_products.quoteId, quoteId)))
      )
    );

    return res.json({ success: true, updated: items.length });
  } catch (err) {
    console.error("[PATCH /api/quote-products/reorder]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/quote-products/:id ─────────────────────────────────────────
router.patch("/quote-products/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [existing] = await db.select().from(quote_products).where(eq(quote_products.id, req.params.id));
    if (!existing) return res.status(404).json({ error: "Quote product not found" });

    const { price, due_date, quantity, is_initial_payment, name, item_description, sort_index, product_id } = req.body;
    const updates: Record<string, any> = { modifiedOn: new Date() };
    if (price !== undefined)            updates.price            = String(price);
    if (due_date !== undefined)         updates.dueDate          = due_date ? new Date(due_date) : null;
    if (quantity !== undefined)         updates.quantity         = Number(quantity);
    if (is_initial_payment !== undefined) updates.isInitialPayment = Boolean(is_initial_payment);
    if (name !== undefined) {
      updates.name        = name;
      updates.productName = name; // keep legacy column in sync
    }
    if (item_description !== undefined) updates.itemDescription  = item_description;
    if (sort_index !== undefined)       updates.sortIndex        = Number(sort_index);
    if (product_id !== undefined)       updates.productId        = product_id ?? null;

    const [updated] = await db.update(quote_products).set(updates)
      .where(eq(quote_products.id, req.params.id)).returning();

    return res.json(updated);
  } catch (err) {
    console.error("[PATCH /api/quote-products/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/quote-products ───────────────────────────────────────────────
router.post("/quote-products", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { quote_id, name, item_description, price, quantity, is_initial_payment, sort_index, manual_input, product_id, service_module_type } = req.body;
    if (!quote_id) return res.status(400).json({ error: "quote_id is required" });

    const maxIdx = sort_index !== undefined ? sort_index : (await getMaxSortIndex(quote_id)) + 1;

    const [created] = await db.insert(quote_products).values({
      quoteId:           quote_id,
      productId:         product_id ?? null,
      manualInput:       manual_input ?? false,
      name:              name ?? "Item",
      productName:       name ?? "Item",
      itemDescription:   item_description ?? null,
      price:             String(price ?? "0"),
      quantity:          quantity ?? 1,
      isInitialPayment:  is_initial_payment ?? false,
      sortIndex:         maxIdx,
      status:            "Active",
      serviceModuleType: service_module_type ?? null,
    }).returning();

    return res.status(201).json(created);
  } catch (err) {
    console.error("[POST /api/quote-products]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/quote-products/bulk ───────────────────────────────────────
router.delete("/quote-products/bulk", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { quoteId, productId } = req.body;
    if (!quoteId || !productId) return res.status(400).json({ error: "quoteId and productId are required" });

    await db.update(quote_products)
      .set({ status: "Inactive", modifiedOn: new Date() })
      .where(and(
        eq(quote_products.quoteId, quoteId),
        eq(quote_products.productId, productId),
        eq(quote_products.status, "Active"),
      ));

    return res.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/quote-products/bulk]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/quote-products/:id ────────────────────────────────────────
router.delete("/quote-products/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    await db.update(quote_products)
      .set({ status: "Inactive", modifiedOn: new Date() })
      .where(eq(quote_products.id, req.params.id));
    return res.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/quote-products/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
