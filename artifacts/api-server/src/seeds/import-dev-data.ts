/**
 * 개발 DB 데이터를 현재 DB(프로덕션)에 임포트하는 일회성 시드 스크립트.
 *
 * 실행 조건 (두 가지 중 하나):
 *   A) FORCE_DEV_DATA_IMPORT=true 환경변수가 설정된 경우 (우선순위 높음)
 *   B) NODE_ENV=production AND users 테이블 rows < 5 (빈 프로덕션 DB 자동 감지)
 *
 * 동작:
 *   - 기존 데이터 TRUNCATE → 개발 데이터 INSERT
 *   - FK 비활성화(session_replication_role=replica) 후 복원
 *
 * 프로덕션 적용 방법:
 *   1) Secrets 에 FORCE_DEV_DATA_IMPORT=true 추가
 *   2) 배포(Publish) → 서버 시작 시 자동 실행
 *   3) 완료 후 FORCE_DEV_DATA_IMPORT 시크릿 삭제
 *
 * 수동 실행:
 *   POST /api/admin/import-dev-data (super_admin JWT 필요)
 */

import { exec } from "child_process";
import path from "path";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

/**
 * SQL 파일 경로 계산:
 * - ESM 개발 환경(tsx): import.meta.url 사용
 * - CJS 프로덕션 번들(esbuild): import.meta가 {} 로 변환되어 url이 undefined.
 *   process.argv[1] (entry point 절대경로)을 기준으로 경로를 계산.
 */
function getSeedsDir(): string {
  // ESM: import.meta.url is a full "file://" string
  const metaUrl = (import.meta as any)?.url;
  if (typeof metaUrl === "string" && metaUrl.startsWith("file://")) {
    const { fileURLToPath } = require("url");
    return path.dirname(fileURLToPath(metaUrl));
  }
  // CJS bundle fallback: navigate from dist/index.cjs → ../src/seeds
  const entryPoint = process.argv[1] ?? process.cwd();
  return path.resolve(path.dirname(path.resolve(entryPoint)), "..", "src", "seeds");
}

export function runDevSeedPsql(dbUrl: string): Promise<{ success: boolean; errors: string[]; elapsed: string }> {
  return new Promise((resolve) => {
    const seedsDir = getSeedsDir();
    const sqlFile = path.resolve(seedsDir, "dev_seed.sql");
    const start = Date.now();
    exec(
      `psql "${dbUrl}" -f "${sqlFile}" 2>&1`,
      { maxBuffer: 20 * 1024 * 1024 },
      (err, stdout) => {
        const elapsed = ((Date.now() - start) / 1000).toFixed(1) + "s";
        const output = stdout || "";
        // psql errors appear as "psql:<file>:<line>: ERROR:  <msg>" — capture both formats
        const errors = output
          .split("\n")
          .filter((l) => l.startsWith("ERROR") || /^psql:[^:]+:\d+: ERROR/i.test(l))
          .slice(0, 20);
        if (err) {
          resolve({ success: false, errors: [err.message, ...errors], elapsed });
        } else {
          resolve({ success: true, errors, elapsed });
        }
      }
    );
  });
}

export async function importDevDataIfNeeded(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn("[DevDataImport] DATABASE_URL 없음 — 스킵");
    return;
  }

  const forceImport = process.env.FORCE_DEV_DATA_IMPORT === "true";
  const isProduction = process.env.NODE_ENV === "production";

  if (!forceImport && !isProduction) {
    return;
  }

  if (forceImport) {
    console.log("[DevDataImport] FORCE_DEV_DATA_IMPORT=true 감지 — 강제 임포트 시작...");
  } else {
    // 프로덕션이지만 FORCE가 아닌 경우: DB가 비어있을 때만 실행
    try {
      const [row] = await db.execute<{ cnt: string }>(
        sql`SELECT COUNT(*) as cnt FROM users`
      );
      const userCount = parseInt((row as any).cnt ?? "0", 10);
      if (userCount >= 5) {
        console.log(`[DevDataImport] 프로덕션 DB에 이미 데이터 있음 (users: ${userCount}) — 스킵`);
        console.log("[DevDataImport] 강제 임포트가 필요하면 FORCE_DEV_DATA_IMPORT=true 시크릿을 설정하세요.");
        return;
      }
      console.log(`[DevDataImport] 프로덕션 DB 비어있음 (users: ${userCount}) — 자동 임포트 시작...`);
    } catch (err) {
      console.error("[DevDataImport] users 카운트 조회 실패:", err);
      return;
    }
  }

  const result = await runDevSeedPsql(dbUrl);

  if (result.success) {
    console.log(`[DevDataImport] ✅ 완료 (${result.elapsed}), 에러: ${result.errors.length}건`);
    if (result.errors.length > 0) {
      console.warn("[DevDataImport] 에러 목록:", result.errors);
    }
    if (forceImport) {
      console.log("[DevDataImport] ⚠️  완료 후 FORCE_DEV_DATA_IMPORT 시크릿을 삭제하세요.");
    }
  } else {
    console.error(`[DevDataImport] ❌ 실패 (${result.elapsed}):`, result.errors);
  }
}
