import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { runDevSeedPsql } from "../seeds/import-dev-data.js";

const router = Router();

/**
 * POST /api/admin/import-dev-data
 * 개발 DB 덤프를 현재 DB(프로덕션)에 수동으로 적용하는 엔드포인트.
 * super_admin JWT 필수.
 *
 * ⚠️  기존 데이터를 TRUNCATE 후 개발 데이터로 덮어씁니다.
 */
router.post(
  "/import-dev-data",
  authenticate,
  requireRole("super_admin"),
  async (_req, res) => {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return res.status(500).json({ error: "DATABASE_URL not set" });
    }

    console.log("[DataImport] Manual import requested by super_admin...");
    const result = await runDevSeedPsql(dbUrl);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        elapsed: result.elapsed,
        errors: result.errors,
      });
    }

    return res.json({
      success: true,
      elapsed: result.elapsed,
      errors: result.errors,
    });
  }
);

export default router;
