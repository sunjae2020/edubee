// ============================================================
// 🐝  Edubee CRM — Drizzle Schema Patch
//     파일: db/schema.ts 에 아래 내용을 반영
//     작업: accounts 테이블 primary_contact_id, secondary_contact_id 추가
// ============================================================
// 적용 방법:
//   1. db/schema.ts 에서 accounts 정의 부분을 찾아 아래 패치를 적용
//   2. npx drizzle-kit push 또는 migration_001_account_type_expansion.sql 직접 실행
// ============================================================

import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  decimal,
  integer,
  text,
  date,
  jsonb,
} from 'drizzle-orm/pg-core';

// ────────────────────────────────────────────────────────────
// [PATCH] accounts 테이블
// 기존 정의에 아래 두 컬럼을 추가
// ────────────────────────────────────────────────────────────

/*
  기존 accounts 정의 끝 부분 (owner_id 바로 위)에 아래 두 줄 추가:

  primaryContactId: uuid('primary_contact_id').references(() => contacts.id),
  secondaryContactId: uuid('secondary_contact_id').references(() => contacts.id),

  ──────────────────────────────────────────────────────────
  완성 형태 예시 (accounts 테이블 전체):
  ──────────────────────────────────────────────────────────
*/
export const accounts = pgTable('accounts', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  name:                varchar('name', { length: 255 }).notNull(),
  manualInput:         boolean('manual_input').notNull().default(false),

  // ── Account Type ──────────────────────────────────────────
  // 유효값: Student | School | Sub_Agency | Super_Agency |
  //         Supplier | Staff | Branch | Organisation |
  //         Agent | Provider | Partner  (레거시 값 호환 유지)
  accountType:         varchar('account_type', { length: 50 }),
  accountCategory:     varchar('account_category', { length: 50 }),

  // ── Contact 연결 (PATCH 추가) ─────────────────────────────
  // Contract Detail STUDENT 카드에서 nationality, email, phone 조회용
  primaryContactId:    uuid('primary_contact_id').references(() => contacts.id),
  secondaryContactId:  uuid('secondary_contact_id').references(() => contacts.id),

  // ── 계층 구조 ─────────────────────────────────────────────
  parentAccountId:     uuid('parent_account_id').references((): any => accounts.id),

  // ── 기본 정보 ─────────────────────────────────────────────
  phoneNumber:         varchar('phone_number', { length: 50 }),
  email:               varchar('email', { length: 255 }),
  website:             varchar('website', { length: 500 }),
  address:             text('address'),
  country:             varchar('country', { length: 100 }),
  state:               varchar('state', { length: 100 }),
  city:                varchar('city', { length: 100 }),
  postalCode:          varchar('postal_code', { length: 20 }),
  abn:                 varchar('abn', { length: 50 }),
  logoId:              uuid('logo_id'),

  // ── 공통 ──────────────────────────────────────────────────
  ownerId:             uuid('owner_id').notNull().references(() => users.id),
  status:              varchar('status', { length: 20 }).notNull().default('Active'),
  createdOn:           timestamp('created_on').notNull().defaultNow(),
  modifiedOn:          timestamp('modified_on').notNull().defaultNow(),
});

// ────────────────────────────────────────────────────────────
// [PATCH] TypeScript 타입 정의
// 기존 타입에 추가
// ────────────────────────────────────────────────────────────

// Account Type 유효값 — 프론트엔드 드롭다운에서 사용
export const ACCOUNT_TYPE_OPTIONS = [
  { value: 'Student',        label: 'Student',       group: 'Client'   },
  { value: 'School',         label: 'School',        group: 'Partner'  },
  { value: 'Sub_Agency',     label: 'Sub Agency',    group: 'Partner'  },
  { value: 'Super_Agency',   label: 'Super Agency',  group: 'Partner'  },
  { value: 'Supplier',       label: 'Supplier',      group: 'Partner'  },
  { value: 'Staff',          label: 'Staff',         group: 'Internal' },
  { value: 'Branch',         label: 'Branch',        group: 'Internal' },
  { value: 'Organisation',   label: 'Organisation',  group: 'Other'    },
  // 레거시 값 — 기존 데이터 호환
  { value: 'Agent',          label: 'Agent (Legacy)', group: 'Legacy'  },
  { value: 'Provider',       label: 'Provider (Legacy)', group: 'Legacy' },
  { value: 'Partner',        label: 'Partner (Legacy)',  group: 'Legacy' },
] as const;

export type AccountType = typeof ACCOUNT_TYPE_OPTIONS[number]['value'];

// Contract Status — Draft 추가
export const CONTRACT_STATUS_OPTIONS = [
  'Draft',
  'Active',
  'Completed',
  'Cancelled',
  'Pending',
] as const;

export type ContractStatus = typeof CONTRACT_STATUS_OPTIONS[number];

// ────────────────────────────────────────────────────────────
// [NEW] Contract Detail용 조인 타입
// server/src/routes/contracts.ts 에서 사용
// ────────────────────────────────────────────────────────────

export type ContractWithStudentDetail = {
  // Contract 기본 정보
  contractId:     string;
  contractName:   string;
  contractStatus: ContractStatus | null;
  fromDate:       Date | null;
  toDate:         Date | null;

  // Student Account (STUDENT 카드)
  accountId:       string | null;
  accountName:     string | null;    // STUDENT 카드: Name
  accountType:     AccountType | null;

  // Primary Contact (STUDENT 카드 확장 정보)
  contactId:        string | null;
  nationality:      string | null;   // STUDENT 카드: Nationality
  contactEmail:     string | null;   // STUDENT 카드: 연락처
  contactPhone:     string | null;   // STUDENT 카드: 연락처

  // Owner (EC)
  ownerName:       string | null;    // STUDENT 카드: Owner (EC)
};
