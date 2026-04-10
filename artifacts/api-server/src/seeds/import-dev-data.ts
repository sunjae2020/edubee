/**
 * 개발 DB 데이터를 프로덕션 DB에 임포트하는 자동 마이그레이션 모듈
 *
 * ─── 실행 조건 (우선순위 순) ──────────────────────────────────────
 *   A) FORCE_DEV_DATA_IMPORT=true   → 무조건 임포트 (기존 데이터 덮어씀)
 *   B) AUTO_SYNC_DEV_DATA=true      → dev_seed.sql이 바뀐 경우에만 자동 임포트
 *                                      (스테이징 환경 등 항상 개발 데이터 동기화)
 *   C) 프로덕션 && users < 5         → 빈 DB 자동 초기 임포트
 *
 * ─── 배포 흐름 (단방향 자동 마이그레이션) ────────────────────────
 *   배포(Publish) 클릭
 *     → 빌드: API 컴파일 + dev DB 스냅샷 → dev_seed.sql 자동 갱신
 *     → 시작: drizzle push (스키마) → importDevDataIfNeeded() (데이터)
 *
 * ─── 환경변수 옵션 ───────────────────────────────────────────────
 *   FORCE_DEV_DATA_IMPORT=true   기존 데이터 무시하고 강제 덮어쓰기
 *   AUTO_SYNC_DEV_DATA=true      dev_seed.sql 변경 시 자동 동기화 (스테이징용)
 *
 * ─── 수동 실행 ───────────────────────────────────────────────────
 *   POST /api/admin/import-dev-data  (super_admin JWT 필요)
 */

import { exec } from "child_process";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { fileURLToPath } from "url";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

// ─── SQL 파일 경로 ───────────────────────────────────────────────
function getSeedsDir(): string {
  // ESM: import.meta.url is a full "file://" string
  const metaUrl = (import.meta as any)?.url;
  if (typeof metaUrl === "string" && metaUrl.startsWith("file://")) {
    return path.dirname(fileURLToPath(metaUrl));
  }
  // CJS bundle fallback: navigate from dist/index.cjs → ../src/seeds
  const entryPoint = process.argv[1] ?? process.cwd();
  return path.resolve(path.dirname(path.resolve(entryPoint)), "..", "src", "seeds");
}

function getSeedFilePath(): string {
  return path.resolve(getSeedsDir(), "dev_seed.sql");
}

// ─── dev_seed.sql SHA-256 해시 계산 ─────────────────────────────
function computeSeedHash(): string | null {
  try {
    const filePath = getSeedFilePath();
    const content = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(content).digest("hex");
  } catch {
    return null;
  }
}

// ─── _seed_meta 테이블 (해시 추적용) ─────────────────────────────
async function ensureSeedMetaTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS _seed_meta (
      key   text PRIMARY KEY,
      value text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function getLastImportedHash(): Promise<string | null> {
  try {
    await ensureSeedMetaTable();
    const rows = await db.execute<{ value: string }>(
      sql`SELECT value FROM _seed_meta WHERE key = 'last_seed_hash'`
    );
    return (rows[0] as any)?.value ?? null;
  } catch {
    return null;
  }
}

async function saveImportedHash(hash: string): Promise<void> {
  try {
    await ensureSeedMetaTable();
    await db.execute(sql`
      INSERT INTO _seed_meta (key, value, updated_at)
      VALUES ('last_seed_hash', ${hash}, now())
      ON CONFLICT (key) DO UPDATE SET value = ${hash}, updated_at = now()
    `);
  } catch (err) {
    console.warn("[DevDataImport] 해시 저장 실패:", err);
  }
}

// ─── psql 실행 ───────────────────────────────────────────────────
export function runDevSeedPsql(
  dbUrl: string
): Promise<{ success: boolean; errors: string[]; elapsed: string }> {
  return new Promise((resolve) => {
    const sqlFile = getSeedFilePath();
    const start = Date.now();
    exec(
      `psql "${dbUrl}" -f "${sqlFile}" 2>&1`,
      { maxBuffer: 20 * 1024 * 1024 },
      (err, stdout) => {
        const elapsed = ((Date.now() - start) / 1000).toFixed(1) + "s";
        const output = stdout || "";
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

// ─── 메인 함수 ───────────────────────────────────────────────────
export async function importDevDataIfNeeded(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn("[DevDataImport] DATABASE_URL 없음 — 스킵");
    return;
  }

  const forceImport  = process.env.FORCE_DEV_DATA_IMPORT === "true";
  const autoSync     = process.env.AUTO_SYNC_DEV_DATA    === "true";
  const isProduction = process.env.NODE_ENV              === "production";

  // ── A) FORCE: 무조건 임포트 ──────────────────────────────────
  if (forceImport) {
    console.log("[DevDataImport] ⚡ FORCE_DEV_DATA_IMPORT=true — 강제 임포트 시작...");
    await doImport(dbUrl, true);
    return;
  }

  // ── B) AUTO_SYNC: 해시 비교 후 변경분만 임포트 ───────────────
  if (autoSync) {
    const currentHash = computeSeedHash();
    if (!currentHash) {
      console.warn("[DevDataImport] dev_seed.sql을 찾을 수 없음 — AUTO_SYNC 스킵");
      return;
    }
    const lastHash = await getLastImportedHash();
    if (lastHash === currentHash) {
      console.log("[DevDataImport] ✅ dev_seed.sql 변경 없음 — AUTO_SYNC 스킵");
      return;
    }
    console.log("[DevDataImport] 🔄 AUTO_SYNC_DEV_DATA=true — dev_seed.sql 변경 감지, 동기화 시작...");
    console.log(`[DevDataImport]   이전 해시: ${lastHash?.slice(0, 12) ?? "없음"}`);
    console.log(`[DevDataImport]   현재 해시: ${currentHash.slice(0, 12)}`);
    await doImport(dbUrl, false, currentHash);
    return;
  }

  // ── C) 프로덕션 최초 배포: 빈 DB에만 자동 임포트 ────────────
  if (!isProduction) {
    return;
  }

  try {
    const result = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM users`);
    const row = (result as any)[0] ?? (result as any).rows?.[0];
    const userCount = parseInt(row?.cnt ?? "0", 10);

    if (userCount >= 5) {
      console.log(`[DevDataImport] 프로덕션 DB에 데이터 있음 (users: ${userCount}) — 스킵`);
      console.log("[DevDataImport] 💡 옵션:");
      console.log("[DevDataImport]   강제 덮어쓰기: Secrets → FORCE_DEV_DATA_IMPORT=true 후 재배포");
      console.log("[DevDataImport]   배포마다 자동 동기화: Secrets → AUTO_SYNC_DEV_DATA=true");
      return;
    }

    console.log(`[DevDataImport] 프로덕션 DB 비어있음 (users: ${userCount}) — 초기 데이터 임포트 시작...`);
    const currentHash = computeSeedHash();
    await doImport(dbUrl, false, currentHash ?? undefined);
  } catch (err) {
    console.error("[DevDataImport] users 카운트 조회 실패:", err);
  }
}

// ─── 실제 임포트 실행 ────────────────────────────────────────────
async function doImport(
  dbUrl: string,
  isForced: boolean,
  hashToSave?: string
): Promise<void> {
  const result = await runDevSeedPsql(dbUrl);

  if (result.success) {
    console.log(`[DevDataImport] ✅ 임포트 완료 (${result.elapsed}), 에러: ${result.errors.length}건`);
    if (result.errors.length > 0) {
      console.warn("[DevDataImport] 에러 목록:", result.errors);
    }
    // 해시 저장 (AUTO_SYNC 중복 임포트 방지)
    if (hashToSave) {
      await saveImportedHash(hashToSave);
    }
    if (isForced) {
      console.log("[DevDataImport] ⚠️  완료 후 FORCE_DEV_DATA_IMPORT 시크릿을 삭제하세요.");
    }
  } else {
    console.error(`[DevDataImport] ❌ 임포트 실패 (${result.elapsed}):`, result.errors);
  }
}
