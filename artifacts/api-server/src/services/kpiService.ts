import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────

export interface KpiPeriodInput {
  periodType: "monthly" | "quarterly" | "half_year" | "yearly";
  periodStart: string; // ISO date 'YYYY-MM-DD'
  periodEnd: string;   // ISO date 'YYYY-MM-DD'
}

export interface StaffKpiResult {
  staffId: string;
  staffName: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  // 활동 KPI
  leadCount: number;
  conversionCount: number;
  conversionRate: number;   // %
  paymentProcessedCount: number;
  visaGrantedCount: number;
  // 파이낸스 KPI
  arScheduled: number;
  arCollected: number;
  arOverdue: number;
  apScheduled: number;
  apPaid: number;
  netRevenue: number;       // arCollected - apPaid
  // 목표 & 성과급
  targetAmount: number;
  excessAmount: number;     // netRevenue - targetAmount
  incentiveType: string | null;   // percentage | fixed | none
  incentiveRate: number | null;
  incentiveFixed: number | null;
  incentiveAmount: number;  // 최종 계산 성과급
  // 기간 레코드 id (이미 저장된 경우)
  kpiPeriodId?: string;
  kpiStatus?: string;       // draft | submitted | approved | paid
}

export interface TeamKpiResult {
  teamId: string;
  teamName: string;
  memberCount: number;
  members: StaffKpiResult[];
  // 팀 합산 (members 롤업)
  leadCount: number;
  conversionCount: number;
  conversionRate: number;
  arScheduled: number;
  arCollected: number;
  arOverdue: number;
  apScheduled: number;
  apPaid: number;
  netRevenue: number;
  targetAmount: number;
  excessAmount: number;
  incentiveType: string | null;
  incentiveRate: number | null;
  incentiveFixed: number | null;
  incentiveAmount: number;
  kpiPeriodId?: string;
  kpiStatus?: string;
}

// ─────────────────────────────────────────────
// 헬퍼: 성과급 계산
// ─────────────────────────────────────────────
// 공식: excess > 0 일 때만 성과급 발생
//   percentage: excessAmount × incentiveRate
//   fixed:      incentiveFixed (초과 달성 시 고정 지급)
//   none:       0

function calcIncentive(
  excessAmount: number,
  incentiveType: string | null,
  incentiveRate: number | null,
  incentiveFixed: number | null
): number {
  if (excessAmount <= 0 || !incentiveType || incentiveType === "none") return 0;
  if (incentiveType === "percentage" && incentiveRate) {
    return Math.round(excessAmount * incentiveRate * 100) / 100;
  }
  if (incentiveType === "fixed" && incentiveFixed) {
    return incentiveFixed;
  }
  return 0;
}

// ─────────────────────────────────────────────
// 핵심 함수 1: 직원 KPI 계산
// ─────────────────────────────────────────────

export async function calcStaffKpi(
  staffId: string,
  period: KpiPeriodInput
): Promise<StaffKpiResult> {
  const { periodStart, periodEnd, periodType } = period;

  // ① 직원 정보
  const staffRow = await db.execute(sql`
    SELECT id, full_name
    FROM users
    WHERE id = ${staffId}
    LIMIT 1
  `);
  const staff = staffRow.rows[0] as { id: string; full_name: string };
  if (!staff) throw new Error(`Staff not found: ${staffId}`);

  // ② 활동 KPI — 리드 수
  const leadRes = await db.execute(sql`
    SELECT COUNT(*) AS lead_count
    FROM leads
    WHERE assigned_staff_id = ${staffId}
      AND created_at >= ${periodStart}::date
      AND created_at <  ${periodEnd}::date + INTERVAL '1 day'
      AND status = 'Active'
  `);
  const leadCount = Number((leadRes.rows[0] as any).lead_count ?? 0);

  // ③ 활동 KPI — 전환 수 (Contract 생성 기준, camp_provider_id 로 직원 귀속)
  const convRes = await db.execute(sql`
    SELECT COUNT(*) AS conversion_count
    FROM contracts
    WHERE camp_provider_id = ${staffId}
      AND created_at >= ${periodStart}::date
      AND created_at <  ${periodEnd}::date + INTERVAL '1 day'
      AND status = 'Active'
  `);
  const conversionCount = Number((convRes.rows[0] as any).conversion_count ?? 0);
  const conversionRate =
    leadCount > 0
      ? Math.round((conversionCount / leadCount) * 10000) / 100
      : 0;

  // ④ 활동 KPI — 비자 승인 수
  // visa_decision_date + visa_granted = true 조합으로 집계
  const visaRes = await db.execute(sql`
    SELECT COUNT(*) AS visa_count
    FROM study_abroad_mgt
    WHERE assigned_staff_id = ${staffId}
      AND visa_decision_date >= ${periodStart}::date
      AND visa_decision_date <  ${periodEnd}::date + INTERVAL '1 day'
      AND visa_granted = true
  `);
  const visaGrantedCount = Number((visaRes.rows[0] as any).visa_count ?? 0);

  // ⑤ 활동 KPI — 결제 처리 건수
  // payment_lines.staff_id 가 현재 NULL이므로 payment_headers.created_by 로 우회
  const paymentRes = await db.execute(sql`
    SELECT COUNT(*) AS payment_count
    FROM payment_lines pl
    JOIN payment_headers ph ON pl.payment_header_id = ph.id
    WHERE ph.created_by = ${staffId}
      AND ph.payment_date >= ${periodStart}::date
      AND ph.payment_date <  ${periodEnd}::date + INTERVAL '1 day'
  `);
  const paymentProcessedCount = Number(
    (paymentRes.rows[0] as any).payment_count ?? 0
  );

  // ⑥ 파이낸스 KPI — AR/AP (contracts.camp_provider_id 기준)
  const arApRes = await db.execute(sql`
    SELECT
      COALESCE(SUM(cp.ar_amount), 0)                                                     AS ar_scheduled,
      COALESCE(SUM(CASE WHEN cp.ar_status = 'paid'    THEN cp.ar_amount ELSE 0 END), 0) AS ar_collected,
      COALESCE(SUM(CASE WHEN cp.ar_status = 'overdue' THEN cp.ar_amount ELSE 0 END), 0) AS ar_overdue,
      COALESCE(SUM(cp.ap_amount), 0)                                                     AS ap_scheduled,
      COALESCE(SUM(CASE WHEN cp.ap_status = 'paid'    THEN cp.ap_amount ELSE 0 END), 0) AS ap_paid
    FROM contract_products cp
    JOIN contracts c ON cp.contract_id = c.id
    WHERE c.camp_provider_id = ${staffId}
      AND cp.ar_due_date >= ${periodStart}::date
      AND cp.ar_due_date <  ${periodEnd}::date + INTERVAL '1 day'
  `);
  const arAp = arApRes.rows[0] as any;
  const arScheduled = Number(arAp.ar_scheduled ?? 0);
  const arCollected = Number(arAp.ar_collected ?? 0);
  const arOverdue   = Number(arAp.ar_overdue   ?? 0);
  const apScheduled = Number(arAp.ap_scheduled ?? 0);
  const apPaid      = Number(arAp.ap_paid      ?? 0);
  const netRevenue  = Math.round((arCollected - apPaid) * 100) / 100;

  // ⑦ 목표 금액 조회 (kpi_targets — staff 우선, 없으면 team 기준)
  const targetRes = await db.execute(sql`
    SELECT
      kt.target_amount,
      kt.incentive_type,
      kt.incentive_rate,
      kt.incentive_fixed
    FROM kpi_targets kt
    WHERE kt.staff_id  = ${staffId}
      AND kt.period_type = ${periodType}
      AND kt.valid_from  <= ${periodStart}::date
      AND (kt.valid_to IS NULL OR kt.valid_to >= ${periodEnd}::date)
      AND kt.status = 'Active'
    ORDER BY kt.created_on DESC
    LIMIT 1
  `);

  // staff 목표 없으면 team 목표 조회
  let targetRow = targetRes.rows[0] as any;
  if (!targetRow) {
    const teamTargetRes = await db.execute(sql`
      SELECT
        kt.target_amount,
        kt.incentive_type,
        kt.incentive_rate,
        kt.incentive_fixed
      FROM kpi_targets kt
      JOIN users u ON u.team_id = kt.team_id
      WHERE u.id = ${staffId}
        AND kt.period_type = ${periodType}
        AND kt.valid_from  <= ${periodStart}::date
        AND (kt.valid_to IS NULL OR kt.valid_to >= ${periodEnd}::date)
        AND kt.status = 'Active'
      ORDER BY kt.created_on DESC
      LIMIT 1
    `);
    targetRow = teamTargetRes.rows[0] as any;
  }

  const targetAmount   = Number(targetRow?.target_amount  ?? 0);
  const incentiveType  = targetRow?.incentive_type  ?? null;
  const incentiveRate  = targetRow?.incentive_rate  ? Number(targetRow.incentive_rate)  : null;
  const incentiveFixed = targetRow?.incentive_fixed ? Number(targetRow.incentive_fixed) : null;
  const excessAmount   = Math.round(Math.max(0, netRevenue - targetAmount) * 100) / 100;
  const incentiveAmount = calcIncentive(excessAmount, incentiveType, incentiveRate, incentiveFixed);

  // ⑧ 기존 staff_kpi_periods 레코드 조회
  const kpiRow = await db.execute(sql`
    SELECT id, status
    FROM staff_kpi_periods
    WHERE staff_id    = ${staffId}
      AND period_type  = ${periodType}
      AND period_start = ${periodStart}::date
    LIMIT 1
  `);
  const existing = kpiRow.rows[0] as any;

  return {
    staffId,
    staffName:            staff.full_name,
    periodType,
    periodStart,
    periodEnd,
    leadCount,
    conversionCount,
    conversionRate,
    paymentProcessedCount,
    visaGrantedCount,
    arScheduled,
    arCollected,
    arOverdue,
    apScheduled,
    apPaid,
    netRevenue,
    targetAmount,
    excessAmount,
    incentiveType,
    incentiveRate,
    incentiveFixed,
    incentiveAmount,
    kpiPeriodId: existing?.id     ?? undefined,
    kpiStatus:   existing?.status ?? undefined,
  };
}

// ─────────────────────────────────────────────
// 핵심 함수 2: KPI 저장/갱신 (upsert)
// ─────────────────────────────────────────────
// draft | submitted 상태일 때만 덮어쓴다.
// approved | paid 상태는 수정 불가.

export async function saveStaffKpi(
  data: StaffKpiResult
): Promise<{ id: string; status: string }> {
  const existing = await db.execute(sql`
    SELECT id, status
    FROM staff_kpi_periods
    WHERE staff_id    = ${data.staffId}
      AND period_type  = ${data.periodType}
      AND period_start = ${data.periodStart}::date
    LIMIT 1
  `);
  const row = existing.rows[0] as any;

  // approved / paid 는 수정 금지
  if (row && (row.status === "approved" || row.status === "paid")) {
    return { id: row.id, status: row.status };
  }

  if (row) {
    // UPDATE
    await db.execute(sql`
      UPDATE staff_kpi_periods SET
        period_end              = ${data.periodEnd}::date,
        lead_count              = ${data.leadCount},
        conversion_count        = ${data.conversionCount},
        conversion_rate         = ${data.conversionRate},
        payment_processed_count = ${data.paymentProcessedCount},
        visa_granted_count      = ${data.visaGrantedCount},
        ar_scheduled            = ${data.arScheduled},
        ar_collected            = ${data.arCollected},
        ar_overdue              = ${data.arOverdue},
        ap_scheduled            = ${data.apScheduled},
        ap_paid                 = ${data.apPaid},
        net_revenue             = ${data.netRevenue},
        target_amount           = ${data.targetAmount},
        excess_amount           = ${data.excessAmount},
        incentive_type          = ${data.incentiveType},
        incentive_rate          = ${data.incentiveRate},
        incentive_fixed         = ${data.incentiveFixed},
        incentive_amount        = ${data.incentiveAmount},
        attributed_revenue      = ${data.netRevenue},
        modified_on             = NOW()
      WHERE id = ${row.id}
    `);
    return { id: row.id, status: row.status };
  } else {
    // INSERT
    const inserted = await db.execute(sql`
      INSERT INTO staff_kpi_periods (
        staff_id, period_type, period_start, period_end,
        lead_count, conversion_count, conversion_rate,
        payment_processed_count, visa_granted_count,
        ar_scheduled, ar_collected, ar_overdue,
        ap_scheduled, ap_paid, net_revenue,
        target_amount, excess_amount,
        incentive_type, incentive_rate, incentive_fixed, incentive_amount,
        attributed_revenue,
        status, created_on, modified_on
      ) VALUES (
        ${data.staffId}, ${data.periodType}, ${data.periodStart}::date, ${data.periodEnd}::date,
        ${data.leadCount}, ${data.conversionCount}, ${data.conversionRate},
        ${data.paymentProcessedCount}, ${data.visaGrantedCount},
        ${data.arScheduled}, ${data.arCollected}, ${data.arOverdue},
        ${data.apScheduled}, ${data.apPaid}, ${data.netRevenue},
        ${data.targetAmount}, ${data.excessAmount},
        ${data.incentiveType}, ${data.incentiveRate}, ${data.incentiveFixed}, ${data.incentiveAmount},
        ${data.netRevenue},
        'draft', NOW(), NOW()
      )
      RETURNING id, status
    `);
    const ins = inserted.rows[0] as any;
    return { id: ins.id, status: ins.status };
  }
}

// ─────────────────────────────────────────────
// 핵심 함수 3: 팀 KPI 계산 (직원 롤업)
// ─────────────────────────────────────────────

export async function calcTeamKpi(
  teamId: string,
  period: KpiPeriodInput
): Promise<TeamKpiResult> {
  // 팀 정보
  const teamRow = await db.execute(sql`
    SELECT id, name FROM teams WHERE id = ${teamId} LIMIT 1
  `);
  const team = teamRow.rows[0] as any;
  if (!team) throw new Error(`Team not found: ${teamId}`);

  // 팀 소속 직원 목록 (users.team_id 구조)
  const membersRes = await db.execute(sql`
    SELECT id FROM users
    WHERE team_id = ${teamId}
      AND status  = 'active'
  `);
  const memberIds = (membersRes.rows as any[]).map((r) => r.id as string);

  // 각 직원 KPI 계산
  const members: StaffKpiResult[] = await Promise.all(
    memberIds.map((id) => calcStaffKpi(id, period))
  );

  // 팀 합산 롤업
  const sum = <K extends keyof StaffKpiResult>(key: K): number =>
    members.reduce((acc, m) => acc + Number(m[key] ?? 0), 0);

  const totalLeads       = sum("leadCount");
  const totalConversions = sum("conversionCount");
  const totalAr          = sum("arCollected");
  const totalAp          = sum("apPaid");
  const netRevenue       = Math.round((totalAr - totalAp) * 100) / 100;

  // 팀 목표 조회
  const teamTargetRes = await db.execute(sql`
    SELECT target_amount, incentive_type, incentive_rate, incentive_fixed
    FROM kpi_targets
    WHERE team_id    = ${teamId}
      AND period_type = ${period.periodType}
      AND valid_from  <= ${period.periodStart}::date
      AND (valid_to IS NULL OR valid_to >= ${period.periodEnd}::date)
      AND status = 'Active'
    ORDER BY created_on DESC
    LIMIT 1
  `);
  const tt             = teamTargetRes.rows[0] as any;
  const targetAmount   = Number(tt?.target_amount  ?? 0);
  const incentiveType  = tt?.incentive_type  ?? null;
  const incentiveRate  = tt?.incentive_rate  ? Number(tt.incentive_rate)  : null;
  const incentiveFixed = tt?.incentive_fixed ? Number(tt.incentive_fixed) : null;
  const excessAmount   = Math.round(Math.max(0, netRevenue - targetAmount) * 100) / 100;
  const incentiveAmount = calcIncentive(excessAmount, incentiveType, incentiveRate, incentiveFixed);

  // 기존 team_kpi_periods 조회
  const tkRow = await db.execute(sql`
    SELECT id, status FROM team_kpi_periods
    WHERE team_id    = ${teamId}
      AND period_type = ${period.periodType}
      AND period_start = ${period.periodStart}::date
    LIMIT 1
  `);
  const tkExisting = tkRow.rows[0] as any;

  return {
    teamId,
    teamName:    team.name,
    memberCount: members.length,
    members,
    leadCount:       totalLeads,
    conversionCount: totalConversions,
    conversionRate:
      totalLeads > 0
        ? Math.round((totalConversions / totalLeads) * 10000) / 100
        : 0,
    arScheduled:  sum("arScheduled"),
    arCollected:  totalAr,
    arOverdue:    sum("arOverdue"),
    apScheduled:  sum("apScheduled"),
    apPaid:       totalAp,
    netRevenue,
    targetAmount,
    excessAmount,
    incentiveType,
    incentiveRate,
    incentiveFixed,
    incentiveAmount,
    kpiPeriodId: tkExisting?.id     ?? undefined,
    kpiStatus:   tkExisting?.status ?? undefined,
  };
}

// ─────────────────────────────────────────────
// 핵심 함수 4: 팀 KPI 저장/갱신 (upsert)
// ─────────────────────────────────────────────

export async function saveTeamKpi(
  data: TeamKpiResult
): Promise<{ id: string; status: string }> {
  const pStart = data.members[0]?.periodStart ?? "";
  const pEnd   = data.members[0]?.periodEnd   ?? "";
  const pType  = data.members[0]?.periodType  ?? "";

  const existing = await db.execute(sql`
    SELECT id, status FROM team_kpi_periods
    WHERE team_id    = ${data.teamId}
      AND period_type = ${pType}
      AND period_start = ${pStart}::date
    LIMIT 1
  `);
  const row = existing.rows[0] as any;

  if (row && (row.status === "approved" || row.status === "paid")) {
    return { id: row.id, status: row.status };
  }

  if (row) {
    await db.execute(sql`
      UPDATE team_kpi_periods SET
        period_end              = ${pEnd}::date,
        member_count            = ${data.memberCount},
        lead_count              = ${data.leadCount},
        conversion_count        = ${data.conversionCount},
        conversion_rate         = ${data.conversionRate},
        ar_scheduled            = ${data.arScheduled},
        ar_collected            = ${data.arCollected},
        ar_overdue              = ${data.arOverdue},
        ap_scheduled            = ${data.apScheduled},
        ap_paid                 = ${data.apPaid},
        net_revenue             = ${data.netRevenue},
        target_amount           = ${data.targetAmount},
        excess_amount           = ${data.excessAmount},
        incentive_type          = ${data.incentiveType},
        incentive_rate          = ${data.incentiveRate},
        incentive_fixed         = ${data.incentiveFixed},
        incentive_amount        = ${data.incentiveAmount},
        modified_on             = NOW()
      WHERE id = ${row.id}
    `);
    return { id: row.id, status: row.status };
  } else {
    const ins = await db.execute(sql`
      INSERT INTO team_kpi_periods (
        team_id, period_type, period_start, period_end,
        member_count, lead_count, conversion_count, conversion_rate,
        ar_scheduled, ar_collected, ar_overdue,
        ap_scheduled, ap_paid, net_revenue,
        target_amount, excess_amount,
        incentive_type, incentive_rate, incentive_fixed, incentive_amount,
        status, created_on, modified_on
      ) VALUES (
        ${data.teamId}, ${pType}, ${pStart}::date, ${pEnd}::date,
        ${data.memberCount}, ${data.leadCount}, ${data.conversionCount}, ${data.conversionRate},
        ${data.arScheduled}, ${data.arCollected}, ${data.arOverdue},
        ${data.apScheduled}, ${data.apPaid}, ${data.netRevenue},
        ${data.targetAmount}, ${data.excessAmount},
        ${data.incentiveType}, ${data.incentiveRate}, ${data.incentiveFixed}, ${data.incentiveAmount},
        'draft', NOW(), NOW()
      )
      RETURNING id, status
    `);
    const r = ins.rows[0] as any;
    return { id: r.id, status: r.status };
  }
}
