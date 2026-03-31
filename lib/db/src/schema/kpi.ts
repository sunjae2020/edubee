import { pgTable, uuid, varchar, date, integer,
         decimal, timestamp, text, unique } from 'drizzle-orm/pg-core';
import { users } from './users';
import { teams } from './teams';

// ─────────────────────────────────────────────
// 1. staffKpiPeriods
//    - 기존 DB 테이블을 Drizzle에 등록
//    - AR/AP / 목표 / 성과급 컬럼 신규 추가
// ─────────────────────────────────────────────
export const staffKpiPeriods = pgTable('staff_kpi_periods', {
  id:          uuid('id').primaryKey().defaultRandom(),
  staffId:     uuid('staff_id').notNull().references(() => users.id),

  periodType:  varchar('period_type', { length: 20 }).notNull(),
               // monthly | quarterly | half_year | yearly

  periodStart: date('period_start').notNull(),
  periodEnd:   date('period_end').notNull(),

  // ── 활동 KPI ──────────────────────────────
  leadCount:              integer('lead_count').notNull().default(0),
  conversionCount:        integer('conversion_count').notNull().default(0),
  conversionRate:         decimal('conversion_rate', { precision: 8, scale: 4 }),
  paymentProcessedCount:  integer('payment_processed_count').notNull().default(0),
  visaGrantedCount:       integer('visa_granted_count').notNull().default(0),

  // ── 파이낸스 KPI (신규) ───────────────────
  arScheduled:  decimal('ar_scheduled',  { precision: 12, scale: 2 }).default('0'),
  arCollected:  decimal('ar_collected',  { precision: 12, scale: 2 }).default('0'),
  arOverdue:    decimal('ar_overdue',    { precision: 12, scale: 2 }).default('0'),
  apScheduled:  decimal('ap_scheduled',  { precision: 12, scale: 2 }).default('0'),
  apPaid:       decimal('ap_paid',       { precision: 12, scale: 2 }).default('0'),
  netRevenue:   decimal('net_revenue',   { precision: 12, scale: 2 }).default('0'),
                // ar_collected - ap_paid

  // ── 목표 & 성과급 (신규) ──────────────────
  targetAmount:    decimal('target_amount',    { precision: 12, scale: 2 }).default('0'),
  excessAmount:    decimal('excess_amount',    { precision: 12, scale: 2 }).default('0'),
                   // net_revenue - target_amount
  incentiveType:   varchar('incentive_type',   { length: 20 }),
                   // percentage | fixed | none
  incentiveRate:   decimal('incentive_rate',   { precision: 8,  scale: 4 }),
                   // 초과분에 적용할 % (예: 0.0500 = 5%)
  incentiveFixed:  decimal('incentive_fixed',  { precision: 12, scale: 2 }),
                   // 고정 성과급 금액
  incentiveAmount: decimal('incentive_amount', { precision: 12, scale: 2 }).default('0'),
                   // 최종 계산 성과급

  // ── 기존 컬럼 유지 (하위 호환) ───────────
  attributedRevenue: decimal('attributed_revenue', { precision: 12, scale: 2 }).default('0'),
  incentiveTier:     varchar('incentive_tier', { length: 50 }),
                     // standard | silver | gold | platinum

  // ── 승인 흐름 ─────────────────────────────
  status:      varchar('status', { length: 20 }).notNull().default('draft'),
               // draft | submitted | approved | paid | rejected
  approvedBy:  uuid('approved_by').references(() => users.id),
  approvedAt:  timestamp('approved_at'),
  paidAt:      timestamp('paid_at'),
  notes:       text('notes'),

  createdOn:   timestamp('created_on').notNull().defaultNow(),
  modifiedOn:  timestamp('modified_on').notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 2. kpiTargets — 직원/팀별 목표 + 성과급 설정
// ─────────────────────────────────────────────
export const kpiTargets = pgTable('kpi_targets', {
  id:          uuid('id').primaryKey().defaultRandom(),

  // 직원 또는 팀 중 하나만 설정 (CHECK 제약은 마이그레이션 SQL에서 처리)
  staffId:     uuid('staff_id').references(() => users.id),
  teamId:      uuid('team_id').references(() => teams.id),

  periodType:  varchar('period_type', { length: 20 }).notNull(),
               // monthly | quarterly | half_year | yearly

  targetAmount:   decimal('target_amount',   { precision: 12, scale: 2 }).notNull().default('0'),

  // 성과급 설정
  incentiveType:  varchar('incentive_type',  { length: 20 }).notNull().default('none'),
                  // percentage | fixed | none
  incentiveRate:  decimal('incentive_rate',  { precision: 8,  scale: 4 }),
                  // percentage 일 때 사용 (예: 0.0500 = 5%)
  incentiveFixed: decimal('incentive_fixed', { precision: 12, scale: 2 }),
                  // fixed 일 때 사용 (초과 달성 시 지급 고정액)

  validFrom:   date('valid_from').notNull(),
  validTo:     date('valid_to'),

  description: text('description'),
  status:      varchar('status', { length: 20 }).notNull().default('Active'),
  createdBy:   uuid('created_by').notNull().references(() => users.id),
  createdOn:   timestamp('created_on').notNull().defaultNow(),
  modifiedOn:  timestamp('modified_on').notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 3. teamKpiPeriods — 팀 KPI 집계
//    users.team_id 기준으로 소속 직원 KPI 롤업
// ─────────────────────────────────────────────
export const teamKpiPeriods = pgTable('team_kpi_periods', {
  id:          uuid('id').primaryKey().defaultRandom(),
  teamId:      uuid('team_id').notNull().references(() => teams.id),

  periodType:  varchar('period_type', { length: 20 }).notNull(),
  periodStart: date('period_start').notNull(),
  periodEnd:   date('period_end').notNull(),

  // ── 활동 KPI (팀 합산) ───────────────────
  memberCount:            integer('member_count').notNull().default(0),
  leadCount:              integer('lead_count').notNull().default(0),
  conversionCount:        integer('conversion_count').notNull().default(0),
  conversionRate:         decimal('conversion_rate', { precision: 8, scale: 4 }),
  paymentProcessedCount:  integer('payment_processed_count').notNull().default(0),
  visaGrantedCount:       integer('visa_granted_count').notNull().default(0),

  // ── 파이낸스 KPI (팀 합산) ───────────────
  arScheduled:  decimal('ar_scheduled',  { precision: 12, scale: 2 }).default('0'),
  arCollected:  decimal('ar_collected',  { precision: 12, scale: 2 }).default('0'),
  arOverdue:    decimal('ar_overdue',    { precision: 12, scale: 2 }).default('0'),
  apScheduled:  decimal('ap_scheduled',  { precision: 12, scale: 2 }).default('0'),
  apPaid:       decimal('ap_paid',       { precision: 12, scale: 2 }).default('0'),
  netRevenue:   decimal('net_revenue',   { precision: 12, scale: 2 }).default('0'),

  // ── 목표 & 팀 성과급 ─────────────────────
  targetAmount:    decimal('target_amount',    { precision: 12, scale: 2 }).default('0'),
  excessAmount:    decimal('excess_amount',    { precision: 12, scale: 2 }).default('0'),
  incentiveType:   varchar('incentive_type',   { length: 20 }),
  incentiveRate:   decimal('incentive_rate',   { precision: 8,  scale: 4 }),
  incentiveFixed:  decimal('incentive_fixed',  { precision: 12, scale: 2 }),
  incentiveAmount: decimal('incentive_amount', { precision: 12, scale: 2 }).default('0'),

  // ── 승인 흐름 ────────────────────────────
  status:      varchar('status', { length: 20 }).notNull().default('draft'),
  approvedBy:  uuid('approved_by').references(() => users.id),
  approvedAt:  timestamp('approved_at'),
  paidAt:      timestamp('paid_at'),
  notes:       text('notes'),

  createdOn:   timestamp('created_on').notNull().defaultNow(),
  modifiedOn:  timestamp('modified_on').notNull().defaultNow(),
},
(table) => ({
  uniquePeriod: unique().on(table.teamId, table.periodType, table.periodStart),
}));

// ─────────────────────────────────────────────
// Type exports
// ─────────────────────────────────────────────
export type StaffKpiPeriod    = typeof staffKpiPeriods.$inferSelect;
export type NewStaffKpiPeriod = typeof staffKpiPeriods.$inferInsert;
export type KpiTarget         = typeof kpiTargets.$inferSelect;
export type NewKpiTarget      = typeof kpiTargets.$inferInsert;
export type TeamKpiPeriod     = typeof teamKpiPeriods.$inferSelect;
export type NewTeamKpiPeriod  = typeof teamKpiPeriods.$inferInsert;
