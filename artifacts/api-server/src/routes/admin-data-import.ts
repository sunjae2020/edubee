import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { runDevSeedPsql } from "../seeds/import-dev-data.js";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execFileAsync = promisify(execFile);

// dist/index.cjs → dist/ → api-server → artifacts → workspace root
function getWorkspaceRoot(): string {
  const entry = path.resolve(process.argv[1] ?? process.cwd());
  return path.resolve(path.dirname(entry), "../../..");
}

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

/**
 * POST /api/admin/export-dev-data
 * 현재 개발 DB를 dev_seed.sql로 내보냅니다.
 * super_admin JWT 필수.
 */
router.post(
  "/export-dev-data",
  authenticate,
  requireRole("super_admin"),
  async (_req, res) => {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return res.status(500).json({ error: "DATABASE_URL not set" });
    }

    const workspaceRoot = getWorkspaceRoot();
    const scriptPath = path.join(workspaceRoot, "scripts", "export-dev-data.sh");
    if (!fs.existsSync(scriptPath)) {
      return res.status(500).json({ error: "export-dev-data.sh 스크립트를 찾을 수 없습니다" });
    }

    console.log("[DataExport] Export requested by super_admin...");
    const start = Date.now();

    try {
      const { stdout, stderr } = await execFileAsync("bash", [scriptPath], {
        env: { ...process.env, DATABASE_URL: dbUrl },
        cwd: workspaceRoot,
        timeout: 120_000,
      });

      const elapsed = Date.now() - start;
      const seedPath = path.join(workspaceRoot, "artifacts/api-server/src/seeds/dev_seed.sql");
      const fileSize = fs.existsSync(seedPath)
        ? Math.round(fs.statSync(seedPath).size / 1024) + " KB"
        : "unknown";

      console.log(`[DataExport] 완료 (${elapsed}ms): ${fileSize}`);

      return res.json({
        success: true,
        elapsed,
        fileSize,
        stdout: stdout.slice(-2000),
        stderr: stderr ? stderr.slice(-1000) : null,
      });
    } catch (err: any) {
      const elapsed = Date.now() - start;
      console.error("[DataExport] 실패:", err.message);
      return res.status(500).json({
        success: false,
        elapsed,
        error: err.message,
        stdout: err.stdout?.slice(-2000) ?? null,
        stderr: err.stderr?.slice(-1000) ?? null,
      });
    }
  }
);

/**
 * GET /api/admin/db-sync-status
 * dev_seed.sql 파일 정보 반환
 */
router.get(
  "/db-sync-status",
  authenticate,
  requireRole("super_admin"),
  async (_req, res) => {
    const workspaceRoot = getWorkspaceRoot();
    const seedPath = path.join(workspaceRoot, "artifacts/api-server/src/seeds/dev_seed.sql");
    const exists = fs.existsSync(seedPath);

    if (!exists) {
      return res.json({ exists: false });
    }

    const stat = fs.statSync(seedPath);
    const content = fs.readFileSync(seedPath, "utf8");
    const generatedMatch = content.match(/생성일:\s*(.+)/);
    const generatedAt = generatedMatch ? generatedMatch[1].trim() : null;
    const lineCount = content.split("\n").length;

    return res.json({
      exists: true,
      sizeKb: Math.round(stat.size / 1024),
      lineCount,
      generatedAt,
      modifiedAt: stat.mtime.toISOString(),
    });
  }
);

export default router;
