import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

router.use(authenticate);
router.use(requireRole("super_admin", "admin"));

// GET /api/menu-allocation — 카테고리 + 아이템 전체 조회
router.get("/menu-allocation", async (_req, res) => {
  try {
    const catRows = await db.execute(sql`
      SELECT id, name, sort_order, status
      FROM menu_categories
      WHERE status = 'Active'
      ORDER BY sort_order ASC, created_on ASC
    `);

    const itemRows = await db.execute(sql`
      SELECT id, category_id, name, route_key, icon_name, sort_order, is_visible
      FROM menu_items
      WHERE status = 'Active'
      ORDER BY sort_order ASC, created_on ASC
    `);

    const categories = catRows.rows.map((cat: any) => ({
      ...cat,
      items: itemRows.rows.filter((item: any) => item.category_id === cat.id),
    }));

    return res.json({ success: true, data: categories });
  } catch (err) {
    console.error("[menu-allocation] GET error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch menu allocation" });
  }
});

// PATCH /api/menu-allocation/order — 순서 일괄 저장
router.patch("/menu-allocation/order", async (req, res) => {
  const { categories, items } = req.body as {
    categories: { id: string; sort_order: number }[];
    items: { id: string; category_id: string; sort_order: number }[];
  };

  try {
    if (Array.isArray(categories)) {
      for (const cat of categories) {
        await db.execute(sql`
          UPDATE menu_categories
          SET sort_order = ${cat.sort_order}, modified_on = NOW()
          WHERE id = ${cat.id}
        `);
      }
    }

    if (Array.isArray(items)) {
      for (const item of items) {
        await db.execute(sql`
          UPDATE menu_items
          SET category_id = ${item.category_id}, sort_order = ${item.sort_order}, modified_on = NOW()
          WHERE id = ${item.id}
        `);
      }
    }

    return res.json({ success: true, message: "Menu order saved" });
  } catch (err) {
    console.error("[menu-allocation] PATCH /order error:", err);
    return res.status(500).json({ success: false, message: "Failed to save menu order" });
  }
});

// PATCH /api/menu-allocation/category/:id — 카테고리 이름 변경
router.patch("/menu-allocation/category/:id", async (req, res) => {
  const { id } = req.params;
  const { name } = req.body as { name: string };

  if (!name?.trim()) {
    return res.status(400).json({ success: false, message: "name is required" });
  }

  try {
    const result = await db.execute(sql`
      UPDATE menu_categories
      SET name = ${name.toUpperCase().trim()}, modified_on = NOW()
      WHERE id = ${id} AND status = 'Active'
      RETURNING id, name
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("[menu-allocation] PATCH /category error:", err);
    return res.status(500).json({ success: false, message: "Failed to rename category" });
  }
});

// PATCH /api/menu-allocation/item/:id — 아이템 이름 변경 / visibility 토글
router.patch("/menu-allocation/item/:id", async (req, res) => {
  const { id } = req.params;
  const { name, is_visible } = req.body as { name?: string; is_visible?: boolean };

  if (name === undefined && is_visible === undefined) {
    return res.status(400).json({ success: false, message: "name or is_visible is required" });
  }

  try {
    let result;
    if (name !== undefined && is_visible !== undefined) {
      result = await db.execute(sql`
        UPDATE menu_items
        SET name = ${name.trim()}, is_visible = ${is_visible}, modified_on = NOW()
        WHERE id = ${id} AND status = 'Active'
        RETURNING id, name, is_visible
      `);
    } else if (name !== undefined) {
      result = await db.execute(sql`
        UPDATE menu_items
        SET name = ${name.trim()}, modified_on = NOW()
        WHERE id = ${id} AND status = 'Active'
        RETURNING id, name, is_visible
      `);
    } else {
      result = await db.execute(sql`
        UPDATE menu_items
        SET is_visible = ${is_visible}, modified_on = NOW()
        WHERE id = ${id} AND status = 'Active'
        RETURNING id, name, is_visible
      `);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("[menu-allocation] PATCH /item error:", err);
    return res.status(500).json({ success: false, message: "Failed to update item" });
  }
});

// POST /api/menu-allocation/category — 카테고리 신규 추가
router.post("/menu-allocation/category", async (req, res) => {
  const { name } = req.body as { name: string };

  if (!name?.trim()) {
    return res.status(400).json({ success: false, message: "name is required" });
  }

  try {
    const maxRes = await db.execute(sql`
      SELECT COALESCE(MAX(sort_order), 0) as max FROM menu_categories WHERE status = 'Active'
    `);
    const nextOrder = Number((maxRes.rows[0] as any).max) + 1;

    const result = await db.execute(sql`
      INSERT INTO menu_categories (name, sort_order)
      VALUES (${name.toUpperCase().trim()}, ${nextOrder})
      RETURNING id, name, sort_order
    `);

    return res.status(201).json({ success: true, data: { ...result.rows[0], items: [] } });
  } catch (err) {
    console.error("[menu-allocation] POST /category error:", err);
    return res.status(500).json({ success: false, message: "Failed to create category" });
  }
});

// DELETE /api/menu-allocation/category/:id — 카테고리 소프트 삭제
router.delete("/menu-allocation/category/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await db.execute(sql`
      UPDATE menu_items SET status = 'Inactive', modified_on = NOW() WHERE category_id = ${id}
    `);
    await db.execute(sql`
      UPDATE menu_categories SET status = 'Inactive', modified_on = NOW() WHERE id = ${id}
    `);

    return res.json({ success: true, message: "Category removed" });
  } catch (err) {
    console.error("[menu-allocation] DELETE /category error:", err);
    return res.status(500).json({ success: false, message: "Failed to delete category" });
  }
});

export default router;
