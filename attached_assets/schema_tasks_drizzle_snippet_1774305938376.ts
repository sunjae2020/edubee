// ============================================================
// 🐝  Edubee CRM — Drizzle ORM schema.ts 적용 스니펫
// ============================================================
// 파일    : /db/schema.ts 에 반영할 tasks 테이블 정의
// 변경점  : taskType 필드 추가
// ============================================================

import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

// ────────────────────────────────────────────────────────────
// tasks 테이블 전체 정의 (schema.ts 에서 기존 tasks 정의를 아래로 교체)
// ────────────────────────────────────────────────────────────
export const tasks = pgTable("tasks", {
  id:            uuid("id").primaryKey().defaultRandom(),
  name:          varchar("name", { length: 255 }),
  manualInput:   boolean("manual_input").notNull().default(false),
  subject:       varchar("subject", { length: 255 }),

  // ★ 신규 추가 ─────────────────────────────────────────────
  taskType:      varchar("task_type", { length: 20 }).notNull().default("internal"),
  //   'internal' : 직원 내부 업무
  //   'cs'       : 고객 응대 (Customer Support)
  // ─────────────────────────────────────────────────────────

  taskStatus:    varchar("task_status", { length: 50 }).notNull(),
  taskCategory:  varchar("task_category", { length: 100 }),
  startDate:     timestamp("start_date"),
  dueDate:       timestamp("due_date"),
  endDate:       timestamp("end_date"),
  priority:      varchar("priority", { length: 20 }),
  contactId:     uuid("contact_id").references(() => contacts.id),
  accountId:     uuid("account_id").references(() => accounts.id),
  contractId:    uuid("contract_id").references(() => contracts.id),
  leadId:        uuid("lead_id").references(() => leads.id),
  ownerId:       uuid("owner_id").notNull().references(() => users.id),
  description:   varchar("description"),  // TEXT → varchar 매핑 (Drizzle text() 사용 시 text("description") 으로 변경)
  status:        varchar("status", { length: 20 }).notNull().default("Active"),
  createdOn:     timestamp("created_on").notNull().defaultNow(),
  modifiedOn:    timestamp("modified_on").notNull().defaultNow(),
});

// ────────────────────────────────────────────────────────────
// Zod 타입 (insertTaskSchema / selectTaskSchema) 사용 시
// drizzle-zod 로 자동 파생 → task_type 필드 자동 포함됨
// ────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────
// task_type 상수 (프론트 / 백엔드 공통 사용 권장)
// ────────────────────────────────────────────────────────────
export const TASK_TYPE = {
  INTERNAL: "internal",   // 내부 업무
  CS:       "cs",         // 고객 응대
} as const;

export type TaskType = (typeof TASK_TYPE)[keyof typeof TASK_TYPE];

// ────────────────────────────────────────────────────────────
// UI 탭 필터 쿼리 예시 (routes/tasks.ts 참고용)
// ────────────────────────────────────────────────────────────
//
// -- 내부 Task 목록
// SELECT * FROM tasks WHERE task_type = 'internal' AND status = 'Active';
//
// -- CS 목록
// SELECT * FROM tasks WHERE task_type = 'cs' AND status = 'Active';
//
// Drizzle 버전:
// db.select().from(tasks).where(eq(tasks.taskType, TASK_TYPE.INTERNAL))
// db.select().from(tasks).where(eq(tasks.taskType, TASK_TYPE.CS))
