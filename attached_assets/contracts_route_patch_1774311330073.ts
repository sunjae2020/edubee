// ============================================================
// 🐝  Edubee CRM — API Route Patch
//     Contract Detail STUDENT 카드 조인 쿼리
//     파일: server/src/routes/contracts.ts 의 GET /:id 엔드포인트에 반영
// ============================================================

import { db } from '../../db';
import { contracts, accounts, contacts, users } from '../../db/schema';
import { eq } from 'drizzle-orm';

// ────────────────────────────────────────────────────────────
// GET /api/contracts/:id
// Contract Detail 전체 + STUDENT 카드 데이터 조인
// ────────────────────────────────────────────────────────────

// 기존 contracts GET /:id 핸들러 내부에서
// account 조회 부분을 아래 withStudentDetail 쿼리로 교체

export async function getContractWithStudentDetail(contractId: string) {
  const result = await db
    .select({
      // ── Contract 기본 정보 ─────────────────────────────────
      contractId:      contracts.id,
      contractName:    contracts.name,
      contractStatus:  contracts.contractStatus,
      fromDate:        contracts.fromDate,
      toDate:          contracts.toDate,
      contractAmount:  contracts.contractAmount,
      paymentFrequency: contracts.paymentFrequency,
      description:     contracts.description,
      quoteId:         contracts.quoteId,

      // ── STUDENT 카드: Account 정보 ─────────────────────────
      accountId:       accounts.id,
      accountName:     accounts.name,       // STUDENT 카드: Name
      accountType:     accounts.accountType,

      // ── STUDENT 카드: Contact 정보 ─────────────────────────
      contactId:       contacts.id,
      nationality:     contacts.nationality,  // STUDENT 카드: Nationality
      contactEmail:    contacts.emailAddress, // STUDENT 카드: Email
      contactPhone:    contacts.mobileNumber, // STUDENT 카드: Phone

      // ── STUDENT 카드: Owner (EC) ───────────────────────────
      ownerName:       users.name,            // STUDENT 카드: Owner (EC)
    })
    .from(contracts)
    .leftJoin(accounts, eq(contracts.accountId, accounts.id))
    // primary_contact_id FK 를 통해 Contact 조인
    .leftJoin(contacts, eq(accounts.primaryContactId, contacts.id))
    // Account owner = 담당 EC 직원
    .leftJoin(users, eq(accounts.ownerId, users.id))
    .where(eq(contracts.id, contractId))
    .limit(1);

  return result[0] ?? null;
}

// ────────────────────────────────────────────────────────────
// 응답 형태 (프론트엔드 STUDENT 카드에서 사용)
// ────────────────────────────────────────────────────────────
//
// {
//   contractId: "uuid...",
//   contractName: "CT-Student_Kim Min-jun-2026-01-15",
//   contractStatus: "Draft",
//   ...
//   accountId: "uuid...",
//   accountName: "Student_Kim Min-jun",   ← STUDENT 카드: Name
//   nationality: "Korean",               ← STUDENT 카드: Nationality
//   contactEmail: "minjun@email.com",    ← STUDENT 카드: Email
//   contactPhone: "+82-10-1234-5678",    ← STUDENT 카드: Phone
//   ownerName: "Ellaine VITAL",          ← STUDENT 카드: Owner (EC)
// }
//
// ────────────────────────────────────────────────────────────
// primary_contact_id가 NULL인 경우 (기존 레거시 데이터 폴백)
// ────────────────────────────────────────────────────────────
// primary_contact_id가 없는 경우 contacts.account_id 역방향으로 폴백

export async function getContractWithStudentDetailFallback(contractId: string) {
  // 1차: primary_contact_id 조인
  const primary = await getContractWithStudentDetail(contractId);

  // primary_contact 정보가 있으면 그대로 반환
  if (primary?.nationality || primary?.contactEmail || primary?.contactPhone) {
    return primary;
  }

  // 2차 폴백: contacts.account_id 역방향 조인 (레거시 데이터)
  if (!primary?.accountId) return primary;

  const fallbackContact = await db
    .select({
      contactId:    contacts.id,
      nationality:  contacts.nationality,
      contactEmail: contacts.emailAddress,
      contactPhone: contacts.mobileNumber,
    })
    .from(contacts)
    .where(eq(contacts.accountId, primary.accountId))
    .orderBy(contacts.createdOn)   // 가장 먼저 생성된 Contact
    .limit(1);

  if (!fallbackContact[0]) return primary;

  return {
    ...primary,
    contactId:    fallbackContact[0].contactId,
    nationality:  fallbackContact[0].nationality,
    contactEmail: fallbackContact[0].contactEmail,
    contactPhone: fallbackContact[0].contactPhone,
  };
}


// ============================================================
// 🔙 ROLLBACK SQL
//    migration_001을 되돌려야 할 경우 아래 SQL 실행
//    파일명: migration_001_rollback.sql
// ============================================================

/*
-- ⚠️  주의: 롤백 전 primary_contact_id, secondary_contact_id 데이터가
--            있다면 해당 데이터는 삭제됩니다.

-- 인덱스 제거
DROP INDEX IF EXISTS idx_accounts_primary_contact;
DROP INDEX IF EXISTS idx_accounts_secondary_contact;
DROP INDEX IF EXISTS idx_accounts_account_type;
DROP INDEX IF EXISTS idx_contracts_account_id;

-- 컬럼 제거
ALTER TABLE accounts DROP COLUMN IF EXISTS primary_contact_id;
ALTER TABLE accounts DROP COLUMN IF EXISTS secondary_contact_id;

-- 코멘트는 자동 삭제됨
*/
