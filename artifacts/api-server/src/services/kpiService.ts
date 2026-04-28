import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

// ─────────────────────────────────────────────
// Type definitions
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
  // Activity KPI
  leadCount: number;
  conversionCount: number;
  conversionRate: number;   // %
  paymentProcessedCount: number;
  visaGrantedCount: number;
  // Finance KPI
  arScheduled: number;
  arCollected: number;
  arOverdue: number;
  apScheduled: number;
  apPaid: number;
  netRevenue: number;       // arCollected - apPaid
  // Target & incentive
  targetAmount: number;
  excessAmount: number;     // netRevenue - targetAmount
  incentiveType: string | null;   // percentage | fixed | none
  incentiveRate: number | null;
  incentiveFixed: number | null;
  incentiveAmount: number;  // Final calculated incentive
  // Period record id (if already saved)
  kpiPeriodId?: string;
  kpiStatus?: string;       // draft | submitted | approved | paid
}

export interface TeamKpiResult {
  teamId: string;
  teamName: string;
  memberCount: number;
  members: StaffKpiResult[];
  // Team totals (members rollup)
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
// Helper: incentive calculation
// ─────────────────────────────────────────────
// Formula: incentive is only generated when excess > 0
//   percentage: excessAmount × incentiveRate
//   fixed:      incentiveFixed (fixed payout when target exceeded)
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
// Core function 1: Calculate staff KPI
// ─────────────────────────────────────────────

export async function calcStaffKpi(
  staffId: string,
  period: KpiPeriodInput
): Promise<StaffKpiResult> {
  const { periodStart, periodEnd, periodType } = period;

  // ① Staff info
  const staffRow = await db.execute(sql`
    SELECT id, full_name
    FROM users
    WHERE id = ${staffId}
    LIMIT 1
  `);
  const staff = staffRow.rows[0] as { id: string; full_name: string };
  if (!staff) throw new Error(`Staff not found: ${staffId}`);

  // ② Activity KPI — lead count (active leads, excluding closed/lost)
  const leadRes = await db.execute(sql`
    SELECT COUNT(*) AS lead_count
    FROM leads
    WHERE assigned_staff_id = ${staffId}
      AND created_at >= ${periodStart}::date
      AND created_at <  ${periodEnd}::date + INTERVAL '1 day'
      AND status NOT IN ('closed', 'lost', 'disqualified')
  `);
  const leadCount = Number((leadRes.rows[0] as any).lead_count ?? 0);

  // ③ Activity KPI — conversion count (based on Contract creation, attributed via camp_provider_id)
  const convRes = await db.execute(sql`
    SELECT COUNT(*) AS conversion_count
    FROM contracts
    WHERE camp_provider_id = ${staffId}
      AND created_at >= ${periodStart}::date
      AND created_at <  ${periodEnd}::date + INTERVAL '1 day'
      AND status IN ('active', 'signed', 'completed')
  `);
  const conversionCount = Number((convRes.rows[0] as any).conversion_count ?? 0);
  const conversionRate =
    leadCount > 0
      ? Math.round((conversionCount / leadCount) * 10000) / 100
      : 0;

  // ④ Activity KPI — visa approvals count
  // Aggregated by visa_decision_date + visa_granted = true combination
  const visaRes = await db.execute(sql`
    SELECT COUNT(*) AS visa_count
    FROM study_abroad_mgt
    WHERE assigned_staff_id = ${staffId}
      AND visa_decision_date >= ${periodStart}::date
      AND visa_decision_date <  ${periodEnd}::date + INTERVAL '1 day'
      AND visa_granted = true
  `);
  const visaGrantedCount = Number((visaRes.rows[0] as any).visa_count ?? 0);

  // ⑤ Activity KPI — payment processing count
  // Uses payment_lines.staff_id directly (accurate after backfill completion)
  // Also uses payment_headers.created_by as OR condition (safety net)
  const paymentRes = await db.execute(sql`
    SELECT COUNT(*) AS payment_count
    FROM payment_lines pl
    JOIN payment_headers ph ON pl.payment_header_id = ph.id
    WHERE (
            pl.staff_id   = ${staffId}
         OR ph.created_by = ${staffId}
          )
      AND ph.payment_date >= ${periodStart}::date
      AND ph.payment_date <  ${periodEnd}::date + INTERVAL '1 day'
  `);
  const paymentProcessedCount = Number(
    (paymentRes.rows[0] as any).payment_count ?? 0
  );

  // ⚠️ AR/AP aggregation is based on contracts.owner_id
  // Current DB: 50 out of 51 contracts have owner_id = NULL (as of 2026-03)
  // → This is why KPI amounts are under-aggregated
  //
  // Resolution (operational process):
  // 1. Make owner_id required when creating a contract (handle as required in UI)
  // 2. Existing data: confirm contract owner then enter manually
  //    UPDATE contracts SET owner_id = '{staff_uuid}'
  //    WHERE id = '{contract_id}';
  // 3. leads.assigned_staff_id also needs to be filled in (currently only 6.7% populated)
  // ⑥ Finance KPI — AR/AP (based on contracts.camp_provider_id)
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
      AND cp.status IN ('pending', 'active')
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

  // ⑦ Fetch target amount (kpi_targets — staff first, fall back to team)
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

  // If no staff target, look up team target
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

  // ⑧ Fetch existing staff_kpi_periods record
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
// Core function 2: Save/update KPI (upsert)
// ─────────────────────────────────────────────
// Only overwrites when status is draft | submitted.
// approved | paid status cannot be modified.

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

  // approved / paid cannot be modified
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
// Core function 3: Calculate team KPI (staff rollup)
// ─────────────────────────────────────────────

export async function calcTeamKpi(
  teamId: string,
  period: KpiPeriodInput
): Promise<TeamKpiResult> {
  // Team info
  const teamRow = await db.execute(sql`
    SELECT id, name FROM teams WHERE id = ${teamId} LIMIT 1
  `);
  const team = teamRow.rows[0] as any;
  if (!team) throw new Error(`Team not found: ${teamId}`);

  // List of team members (users.team_id structure)
  const membersRes = await db.execute(sql`
    SELECT id FROM users
    WHERE team_id = ${teamId}
      AND status  = 'active'
  `);
  const memberIds = (membersRes.rows as any[]).map((r) => r.id as string);

  // Calculate KPI for each staff member
  const members: StaffKpiResult[] = await Promise.all(
    memberIds.map((id) => calcStaffKpi(id, period))
  );

  // Team aggregate rollup
  const sum = <K extends keyof StaffKpiResult>(key: K): number =>
    members.reduce((acc, m) => acc + Number(m[key] ?? 0), 0);

  const totalLeads       = sum("leadCount");
  const totalConversions = sum("conversionCount");
  const totalAr          = sum("arCollected");
  const totalAp          = sum("apPaid");
  const netRevenue       = Math.round((totalAr - totalAp) * 100) / 100;

  // Fetch team target
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

  // Fetch existing team_kpi_periods record
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
// Core function 4: Save/update team KPI (upsert)
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
