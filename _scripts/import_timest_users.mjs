/**
 * CSV → DB 임포트 스크립트: Time Study (timest) 유저 업로드
 * 실행: node _scripts/import_timest_users.mjs
 *
 * 수정 사항:
 *  1. 유효하지 않은 UUID → 새 UUID 생성
 *  2. 중복 UUID → 새 UUID 생성
 *  3. 중복 이메일 → 나중 행 스킵
 *  4. 빈 이메일 → placeholder 생성 (english_name@placeholder.timest)
 *  5. role 대소문자 정규화 (Admin → admin)
 *  6. full_name 공백만인 경우 english_name 또는 first+last 조합
 *  7. password_hash → bcrypt(Edubee2026!)
 *  8. organisation_id = Time Study 테넌트 ID
 */

import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { randomUUID } from 'crypto';
import pgPkg from '/Users/sunkim/Edubee/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js';
const { Pool } = pgPkg;
import bcrypt from '/Users/sunkim/Edubee/artifacts/api-server/node_modules/bcryptjs/index.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// .env 로드
const envPath = join(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx > 0) {
    envVars[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
}

const DATABASE_URL = envVars['DATABASE_URL'];
const TIMEST_ORG_ID = '7374edd3-bb70-4207-a82b-d9ced66e3cfc';
const CSV_PATH = '/Users/sunkim/Downloads/users_2026-04-21.csv';
const DEFAULT_PASSWORD = 'Edubee2026!';

// UUID 유효성 검사
function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// timestamp 파싱 (빈 문자열 → null)
function parseTs(val) {
  if (!val || !val.trim()) return null;
  const d = new Date(val.trim());
  return isNaN(d.getTime()) ? null : d;
}

// full_name 정규화
function normalizeName(row) {
  const fn = row.full_name?.trim();
  if (fn) return fn;
  const parts = [row.first_name?.trim(), row.last_name?.trim()].filter(Boolean);
  if (parts.length) return parts.join(' ');
  const en = row.english_name?.trim();
  if (en) return en;
  return 'Unknown';
}

async function parseCsv(path) {
  return new Promise((resolve) => {
    const rows = [];
    const rl = createInterface({ input: createReadStream(path) });
    let headers = null;
    rl.on('line', (line) => {
      if (!headers) { headers = line.split(','); return; }
      const vals = line.split(',');
      const row = {};
      headers.forEach((h, i) => { row[h.trim()] = (vals[i] || '').trim(); });
      rows.push(row);
    });
    rl.on('close', () => resolve(rows));
  });
}

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  console.log('⏳ bcrypt 해시 생성 중...');
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  console.log('✅ 해시 완료');

  const rows = await parseCsv(CSV_PATH);
  console.log(`📋 CSV 행 수: ${rows.length}`);

  // 현재 DB에 있는 email, id 목록 조회
  const existingRes = await pool.query('SELECT id, email FROM users');
  const existingEmails = new Set(existingRes.rows.map(r => r.email?.toLowerCase()));
  const existingIds = new Set(existingRes.rows.map(r => r.id));

  const seenUUIDs = new Set(existingIds);
  const processedEmails = new Set(); // 이번 실행에서 처리한 이메일

  let inserted = 0, skipped = 0, updated = 0;
  const errors = [];
  const fixLog = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 헤더 제외, 1-based
    const fixes = [];

    // ── UUID 검증 & 수정 ────────────────────────────────────────
    let id = row.id?.trim();
    if (!isValidUUID(id)) {
      const newId = randomUUID();
      fixes.push(`UUID 무효("${id}") → 신규 생성(${newId})`);
      id = newId;
    } else if (seenUUIDs.has(id)) {
      const newId = randomUUID();
      fixes.push(`UUID 중복(${id}) → 신규 생성(${newId})`);
      id = newId;
    }

    // ── 이메일 검증 & 수정 ──────────────────────────────────────
    let email = row.email?.trim() || '';
    if (!email) {
      const base = row.english_name?.trim() || row.first_name?.trim() || `user_${i}`;
      email = `${base.toLowerCase().replace(/\s+/g, '_')}@placeholder.timest`;
      fixes.push(`이메일 없음 → placeholder 생성(${email})`);
    }
    email = email.toLowerCase();

    // 이미 이번 실행에서 처리한 이메일 → CSV 중복 스킵
    if (processedEmails.has(email)) {
      fixes.push(`이메일 중복(${email}) → 행 스킵`);
      fixLog.push({ rowNum, email: row.email, fixes });
      skipped++;
      continue;
    }

    // ── role 정규화 ─────────────────────────────────────────────
    let role = row.role?.trim() || 'consultant';
    const normalizedRole = role.toLowerCase();
    if (normalizedRole !== role) {
      fixes.push(`role 대소문자 수정: "${role}" → "${normalizedRole}"`);
      role = normalizedRole;
    }

    // ── full_name 정규화 ────────────────────────────────────────
    const fullName = normalizeName(row);

    // ── timestamps ──────────────────────────────────────────────
    const invitedAt = parseTs(row.invited_at);
    const lastLoginAt = parseTs(row.last_login_at);
    const createdAt = parseTs(row.created_at) || new Date();

    // ── platform_comm_rate ──────────────────────────────────────
    const commRate = row.platform_comm_rate?.trim() || null;
    const platformCommRate = commRate ? parseFloat(commRate) : null;

    // ── team_id ─────────────────────────────────────────────────
    const teamId = isValidUUID(row.team_id) ? row.team_id : null;

    seenUUIDs.add(id);
    processedEmails.add(email);

    if (fixes.length) fixLog.push({ rowNum, email, fixes });

    // ── 기존 유저: organisation_id UPDATE ───────────────────────
    if (existingEmails.has(email)) {
      try {
        await pool.query(
          `UPDATE users SET organisation_id = $1 WHERE email = $2`,
          [TIMEST_ORG_ID, email]
        );
        fixes.push(`기존 유저 organisation_id 업데이트`);
        updated++;
      } catch (e) {
        errors.push({ rowNum, email, error: e.message });
      }
      continue;
    }

    // ── 신규 유저 INSERT ────────────────────────────────────────
    try {
      await pool.query(
        `INSERT INTO users (
          id, email, password_hash, role, staff_role,
          full_name, first_name, last_name, english_name, original_name,
          phone, whatsapp, line_id, avatar_url,
          timezone, preferred_lang,
          company_name, business_reg_no, country_of_ops, platform_comm_rate,
          team_id, status, invited_at, last_login_at, created_at, updated_at,
          organisation_id
        ) VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,$10,
          $11,$12,$13,$14,
          $15,$16,
          $17,$18,$19,$20,
          $21,$22,$23,$24,$25,$25,
          $26
        )`,
        [
          id, email, passwordHash, role, row.staff_role || 'education_agent',
          fullName,
          row.first_name?.trim() || null,
          row.last_name?.trim() || null,
          row.english_name?.trim() || null,
          row.original_name?.trim() || null,
          row.phone?.trim() || null,
          row.whatsapp?.trim() || null,
          row.line_id?.trim() || null,
          row.avatar_url?.trim() || null,
          row.timezone?.trim() || 'Asia/Seoul',
          row.preferred_lang?.trim() || 'en',
          row.company_name?.trim() || null,
          row.business_reg_no?.trim() || null,
          row.country_of_ops?.trim() || null,
          platformCommRate,
          teamId,
          row.status?.trim() || 'active',
          invitedAt, lastLoginAt, createdAt,
          TIMEST_ORG_ID,
        ]
      );
      inserted++;
    } catch (e) {
      errors.push({ rowNum, email, error: e.message });
    }
  }

  await pool.end();

  console.log('\n══════════════════════════════════════════');
  console.log('📊 결과 요약');
  console.log('══════════════════════════════════════════');
  console.log(`✅ 신규 삽입: ${inserted}건`);
  console.log(`🔄 기존 업데이트: ${updated}건`);
  console.log(`⏭️  스킵: ${skipped}건`);

  if (fixLog.length) {
    console.log('\n🔧 수정된 항목:');
    for (const { rowNum, email, fixes } of fixLog) {
      console.log(`  Row ${rowNum} (${email}):`);
      for (const f of fixes) console.log(`    - ${f}`);
    }
  }

  if (errors.length) {
    console.log('\n❌ 오류:');
    for (const { rowNum, email, error } of errors) {
      console.log(`  Row ${rowNum} (${email}): ${error}`);
    }
  }
}

main().catch(console.error);
