/**
 * menuAllocationRoutes.ts
 * 경로: /server/src/routes/menuAllocationRoutes.ts
 *
 * Menu Allocation API — 사이드바 카테고리·메뉴 순서 관리
 *
 * GET  /api/menu-allocation          — 전체 카테고리 + 아이템 조회
 * PATCH /api/menu-allocation/order   — 카테고리·아이템 순서 일괄 저장
 * PATCH /api/menu-allocation/category/:id — 카테고리 이름 변경
 * PATCH /api/menu-allocation/item/:id    — 아이템 이름 변경
 * POST  /api/menu-allocation/category   — 카테고리 신규 추가
 * DELETE /api/menu-allocation/category/:id — 카테고리 삭제 (아이템 포함)
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

const router = Router();

// DB pool — 프로젝트 기존 pool 인스턴스를 import 하거나
// 아래처럼 환경변수에서 직접 생성 (기존 db.ts 패턴에 맞게 교체하세요)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─────────────────────────────────────────────────────────
// GET /api/menu-allocation
// 카테고리 + 아이템 전체 조회 (sort_order 순)
// ─────────────────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  try {
    const catRows = await pool.query<{
      id: string;
      name: string;
      sort_order: number;
      status: string;
    }>(
      `SELECT id, name, sort_order, status
       FROM menu_categories
       WHERE status = 'Active'
       ORDER BY sort_order ASC, created_on ASC`
    );

    const itemRows = await pool.query<{
      id: string;
      category_id: string;
      name: string;
      route_key: string;
      icon_name: string | null;
      sort_order: number;
      is_visible: boolean;
    }>(
      `SELECT id, category_id, name, route_key, icon_name, sort_order, is_visible
       FROM menu_items
       WHERE status = 'Active'
       ORDER BY sort_order ASC, created_on ASC`
    );

    // 카테고리별로 아이템 그루핑
    const categories = catRows.rows.map((cat) => ({
      ...cat,
      items: itemRows.rows.filter((item) => item.category_id === cat.id),
    }));

    res.json({ success: true, data: categories });
  } catch (err) {
    console.error('[menu-allocation] GET error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch menu allocation' });
  }
});

// ─────────────────────────────────────────────────────────
// PATCH /api/menu-allocation/order
// 카테고리 순서 + 아이템 순서·카테고리 이동 일괄 저장
//
// Body:
// {
//   categories: [{ id: string, sort_order: number }],
//   items: [{ id: string, category_id: string, sort_order: number }]
// }
// ─────────────────────────────────────────────────────────
router.patch('/order', async (req: Request, res: Response) => {
  const { categories, items } = req.body as {
    categories: { id: string; sort_order: number }[];
    items: { id: string; category_id: string; sort_order: number }[];
  };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 카테고리 순서 업데이트
    if (Array.isArray(categories)) {
      for (const cat of categories) {
        await client.query(
          `UPDATE menu_categories
           SET sort_order = $1, modified_on = NOW()
           WHERE id = $2`,
          [cat.sort_order, cat.id]
        );
      }
    }

    // 아이템 순서 + 카테고리 이동 업데이트
    if (Array.isArray(items)) {
      for (const item of items) {
        await client.query(
          `UPDATE menu_items
           SET category_id = $1, sort_order = $2, modified_on = NOW()
           WHERE id = $3`,
          [item.category_id, item.sort_order, item.id]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Menu order saved' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[menu-allocation] PATCH /order error:', err);
    res.status(500).json({ success: false, message: 'Failed to save menu order' });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────
// PATCH /api/menu-allocation/category/:id
// 카테고리 이름 변경
// Body: { name: string }
// ─────────────────────────────────────────────────────────
router.patch('/category/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body as { name: string };

  if (!name?.trim()) {
    res.status(400).json({ success: false, message: 'name is required' });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE menu_categories
       SET name = $1, modified_on = NOW()
       WHERE id = $2 AND status = 'Active'
       RETURNING id, name`,
      [name.toUpperCase().trim(), id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[menu-allocation] PATCH /category error:', err);
    res.status(500).json({ success: false, message: 'Failed to rename category' });
  }
});

// ─────────────────────────────────────────────────────────
// PATCH /api/menu-allocation/item/:id
// 메뉴 아이템 이름 변경 또는 visibility 토글
// Body: { name?: string, is_visible?: boolean }
// ─────────────────────────────────────────────────────────
router.patch('/item/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, is_visible } = req.body as { name?: string; is_visible?: boolean };

  if (name === undefined && is_visible === undefined) {
    res.status(400).json({ success: false, message: 'name or is_visible is required' });
    return;
  }

  try {
    const setParts: string[] = ['modified_on = NOW()'];
    const values: unknown[] = [];
    let idx = 1;

    if (name !== undefined) {
      setParts.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (is_visible !== undefined) {
      setParts.push(`is_visible = $${idx++}`);
      values.push(is_visible);
    }
    values.push(id);

    const result = await pool.query(
      `UPDATE menu_items
       SET ${setParts.join(', ')}
       WHERE id = $${idx} AND status = 'Active'
       RETURNING id, name, is_visible`,
      values
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, message: 'Item not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[menu-allocation] PATCH /item error:', err);
    res.status(500).json({ success: false, message: 'Failed to update item' });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/menu-allocation/category
// 카테고리 신규 추가
// Body: { name: string }
// ─────────────────────────────────────────────────────────
router.post('/category', async (req: Request, res: Response) => {
  const { name } = req.body as { name: string };

  if (!name?.trim()) {
    res.status(400).json({ success: false, message: 'name is required' });
    return;
  }

  try {
    // 현재 max sort_order + 1
    const maxRes = await pool.query<{ max: number | null }>(
      `SELECT MAX(sort_order) as max FROM menu_categories WHERE status = 'Active'`
    );
    const nextOrder = (maxRes.rows[0].max ?? 0) + 1;

    const result = await pool.query(
      `INSERT INTO menu_categories (name, sort_order)
       VALUES ($1, $2)
       RETURNING id, name, sort_order`,
      [name.toUpperCase().trim(), nextOrder]
    );

    res.status(201).json({ success: true, data: { ...result.rows[0], items: [] } });
  } catch (err) {
    console.error('[menu-allocation] POST /category error:', err);
    res.status(500).json({ success: false, message: 'Failed to create category' });
  }
});

// ─────────────────────────────────────────────────────────
// DELETE /api/menu-allocation/category/:id
// 카테고리 소프트 삭제 (status = 'Inactive')
// ─────────────────────────────────────────────────────────
router.delete('/category/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 아이템도 같이 비활성화
    await client.query(
      `UPDATE menu_items SET status = 'Inactive', modified_on = NOW() WHERE category_id = $1`,
      [id]
    );
    await client.query(
      `UPDATE menu_categories SET status = 'Inactive', modified_on = NOW() WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Category removed' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[menu-allocation] DELETE /category error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete category' });
  } finally {
    client.release();
  }
});

export default router;
