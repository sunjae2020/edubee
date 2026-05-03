import cron from "node-cron";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

// ─────────────────────────────────────────────
// KPI monthly auto-calculation scheduler
// Runs: 1st of each month at 00:05 (Australia/Sydney)
// Target: calculate KPI for all staff in the previous month → upsert staff_kpi_periods
// ─────────────────────────────────────────────

async function calcAndSaveAllStaffKpi(
  periodStart: string,
  periodEnd:   string,
  periodType:  string
): Promise<void> {

  console.log(`[KPI Scheduler] Aggregation started: ${periodStart} ~ ${periodEnd}`);

  const staffRes = await db.execute(sql`
    SELECT id, full_name, role FROM users
    WHERE status = 'active'
  `);
  const staffList = staffRes.rows as { id: string; full_name: string; role: string | null }[];

  let successCount = 0;
  let skipCount    = 0;
  let errorCount   = 0;

  for (const staff of staffList) {
    try {
      const leadRes = await db.execute(sql`
        SELECT COUNT(*) AS cnt FROM leads
        WHERE assigned_staff_id = ${staff.id}
          AND created_at >= ${periodStart}
          AND created_at <= ${periodEnd}
          AND status NOT IN ('closed', 'lost', 'disqualified')
      `);
      const leadCount = Number((leadRes.rows[0] as any).cnt ?? 0);

      const convRes = await db.execute(sql`
        SELECT COUNT(*) AS cnt FROM contracts
        WHERE owner_id   = ${staff.id}
          AND created_at >= ${periodStart}
          AND created_at <= ${periodEnd}
          AND status NOT IN ('cancelled')
      `);
      const conversionCount = Number((convRes.rows[0] as any).cnt ?? 0);
      const conversionRate  = leadCount > 0
        ? Math.round((conversionCount / leadCount) * 10000) / 100
        : 0;

      const visaRes = await db.execute(sql`
        SELECT COUNT(*) AS cnt FROM study_abroad_mgt
        WHERE assigned_staff_id = ${staff.id}
          AND visa_granted       = true
          AND visa_decision_date >= ${periodStart}
          AND visa_decision_date <= ${periodEnd}
      `);
      const visaGrantedCount = Number((visaRes.rows[0] as any).cnt ?? 0);

      const paymentRes = await db.execute(sql`
        SELECT COUNT(*) AS cnt
        FROM payment_lines pl
        JOIN payment_headers ph ON pl.payment_header_id = ph.id
        WHERE (pl.staff_id = ${staff.id} OR ph.created_by = ${staff.id})
          AND ph.payment_date >= ${periodStart}
          AND ph.payment_date <= ${periodEnd}
      `);
      const paymentProcessedCount = Number(
        (paymentRes.rows[0] as any).cnt ?? 0
      );

      const arApRes = await db.execute(sql`
        SELECT
          COALESCE(SUM(cp.ar_amount), 0) AS ar_scheduled,
          COALESCE(SUM(
            CASE WHEN cp.ar_status = 'paid' THEN cp.ar_amount ELSE 0 END
          ), 0) AS ar_collected,
          COALESCE(SUM(
            CASE WHEN cp.ar_status = 'overdue' THEN cp.ar_amount ELSE 0 END
          ), 0) AS ar_overdue,
          COALESCE(SUM(cp.ap_amount), 0) AS ap_scheduled,
          COALESCE(SUM(
            CASE WHEN cp.ap_status = 'paid' THEN cp.ap_amount ELSE 0 END
          ), 0) AS ap_paid
        FROM contract_products cp
        JOIN contracts c ON cp.contract_id = c.id
        WHERE c.owner_id = ${staff.id}
          AND cp.status IN ('pending', 'active')
          AND cp.ar_due_date >= ${periodStart}
          AND cp.ar_due_date <= ${periodEnd}
      `);
      const aa          = arApRes.rows[0] as any;
      const arScheduled = Number(aa.ar_scheduled ?? 0);
      const arCollected = Number(aa.ar_collected ?? 0);
      const arOverdue   = Number(aa.ar_overdue   ?? 0);
      const apScheduled = Number(aa.ap_scheduled ?? 0);
      const apPaid      = Number(aa.ap_paid      ?? 0);
      const netRevenue  = Math.round((arCollected - apPaid) * 100) / 100;

      const targetRes = await db.execute(sql`
        SELECT target_amount, incentive_type, incentive_rate, incentive_fixed
        FROM kpi_targets
        WHERE staff_id    = ${staff.id}
          AND period_type  = ${periodType}
          AND valid_from   <= ${periodStart}
          AND (valid_to IS NULL OR valid_to >= ${periodEnd})
          AND status = 'Active'
        ORDER BY created_on DESC LIMIT 1
      `);
      let targetRow = targetRes.rows[0] as any;

      if (!targetRow) {
        const teamTargetRes = await db.execute(sql`
          SELECT kt.target_amount, kt.incentive_type,
                 kt.incentive_rate, kt.incentive_fixed
          FROM kpi_targets kt
          JOIN users u ON u.team_id = kt.team_id
          WHERE u.id          = ${staff.id}
            AND kt.period_type  = ${periodType}
            AND kt.valid_from   <= ${periodStart}
            AND (kt.valid_to IS NULL OR kt.valid_to >= ${periodEnd})
            AND kt.status = 'Active'
          ORDER BY kt.created_on DESC LIMIT 1
        `);
        targetRow = teamTargetRes.rows[0] as any;
      }

      const targetAmount   = Number(targetRow?.target_amount  ?? 0);
      let   incentiveType  = (targetRow?.incentive_type  ?? null) as string | null;
      let   incentiveRate  = targetRow?.incentive_rate
                               ? Number(targetRow.incentive_rate)  : null;
      let   incentiveFixed = targetRow?.incentive_fixed
                               ? Number(targetRow.incentive_fixed) : null;
      const excessAmount   = Math.max(0, netRevenue - targetAmount);

      let incentiveAmount = 0;
      let incentiveSource: "target" | "tier" | "none" = "none";

      if (excessAmount > 0 && incentiveType) {
        if (incentiveType === "percentage" && incentiveRate)
          incentiveAmount = Math.round(excessAmount * incentiveRate * 100) / 100;
        if (incentiveType === "fixed" && incentiveFixed)
          incentiveAmount = incentiveFixed;
        if (incentiveAmount > 0) incentiveSource = "target";
      }

      // ── Tier fallback (incentive_tiers) ─────────────────────
      // Applied when no kpi_targets policy or it produced 0.
      // Picks the bracket where: role match (or null=any), period_type match,
      // effective at periodStart, and min_revenue <= netRevenue < max_revenue.
      let tierName: string | null = null;
      if (incentiveAmount === 0 && netRevenue > 0) {
        const tierRes = await db.execute(sql`
          SELECT tier_name, incentive_type, incentive_rate,
                 incentive_fixed, applies_to, min_revenue
          FROM incentive_tiers
          WHERE status = 'Active'
            AND period_type = ${periodType}
            AND (applies_to_role IS NULL OR applies_to_role = ${staff.role ?? ""})
            AND effective_from  <= ${periodStart}
            AND (effective_to IS NULL OR effective_to >= ${periodEnd})
            AND min_revenue     <= ${netRevenue}
            AND (max_revenue IS NULL OR ${netRevenue} < max_revenue)
          ORDER BY (applies_to_role IS NOT NULL) DESC,  -- role-specific wins over generic
                   min_revenue DESC                      -- highest matching bracket wins
          LIMIT 1
        `);
        const tier = tierRes.rows[0] as any | undefined;
        if (tier) {
          tierName        = tier.tier_name as string;
          incentiveType   = tier.incentive_type as string;
          incentiveRate   = tier.incentive_rate  ? Number(tier.incentive_rate)  : null;
          incentiveFixed  = tier.incentive_fixed ? Number(tier.incentive_fixed) : null;
          const tierMinRevenue = Number(tier.min_revenue ?? 0);
          const base = tier.applies_to === "total"
            ? netRevenue
            : Math.max(0, netRevenue - tierMinRevenue); // 'excess' default
          if (incentiveType === "percentage" && incentiveRate)
            incentiveAmount = Math.round(base * incentiveRate * 100) / 100;
          else if (incentiveType === "fixed" && incentiveFixed)
            incentiveAmount = incentiveFixed;
          if (incentiveAmount > 0) incentiveSource = "tier";
        }
      }

      const existRes = await db.execute(sql`
        SELECT id, status FROM staff_kpi_periods
        WHERE staff_id    = ${staff.id}
          AND period_type  = ${periodType}
          AND period_start = ${periodStart}
        LIMIT 1
      `);
      const existing = existRes.rows[0] as any;

      if (existing?.status === "approved" || existing?.status === "paid") {
        skipCount++;
        continue;
      }

      if (existing) {
        await db.execute(sql`
          UPDATE staff_kpi_periods SET
            period_end               = ${periodEnd},
            lead_count               = ${leadCount},
            conversion_count         = ${conversionCount},
            conversion_rate          = ${conversionRate},
            payment_processed_count  = ${paymentProcessedCount},
            visa_granted_count       = ${visaGrantedCount},
            ar_scheduled             = ${arScheduled},
            ar_collected             = ${arCollected},
            ar_overdue               = ${arOverdue},
            ap_scheduled             = ${apScheduled},
            ap_paid                  = ${apPaid},
            net_revenue              = ${netRevenue},
            target_amount            = ${targetAmount},
            excess_amount            = ${excessAmount},
            incentive_type           = ${incentiveType},
            incentive_rate           = ${incentiveRate},
            incentive_fixed          = ${incentiveFixed},
            incentive_amount         = ${incentiveAmount},
            incentive_tier           = ${tierName},
            attributed_revenue       = ${netRevenue},
            modified_on              = NOW()
          WHERE id = ${existing.id}
        `);
      } else {
        await db.execute(sql`
          INSERT INTO staff_kpi_periods (
            staff_id, period_type, period_start, period_end,
            lead_count, conversion_count, conversion_rate,
            payment_processed_count, visa_granted_count,
            ar_scheduled, ar_collected, ar_overdue,
            ap_scheduled, ap_paid, net_revenue,
            target_amount, excess_amount,
            incentive_type, incentive_rate, incentive_fixed,
            incentive_amount, incentive_tier, attributed_revenue,
            status, created_on, modified_on
          ) VALUES (
            ${staff.id}, ${periodType}, ${periodStart}, ${periodEnd},
            ${leadCount}, ${conversionCount}, ${conversionRate},
            ${paymentProcessedCount}, ${visaGrantedCount},
            ${arScheduled}, ${arCollected}, ${arOverdue},
            ${apScheduled}, ${apPaid}, ${netRevenue},
            ${targetAmount}, ${excessAmount},
            ${incentiveType}, ${incentiveRate}, ${incentiveFixed},
            ${incentiveAmount}, ${tierName}, ${netRevenue},
            'draft', NOW(), NOW()
          )
        `);
      }

      successCount++;
      console.log(
        `[KPI Scheduler] ✅ ${staff.full_name}: ` +
        `net=${netRevenue}, incentive=${incentiveAmount} ` +
        `(source=${incentiveSource}${tierName ? `, tier=${tierName}` : ""})`
      );

    } catch (err) {
      errorCount++;
      console.error(`[KPI Scheduler] ❌ ${staff.full_name} error:`, err);
    }
  }

  console.log(
    `[KPI Scheduler] Done — ` +
    `success: ${successCount}, skipped: ${skipCount}, errors: ${errorCount}`
  );
}

// ─────────────────────────────────────────────
// Scheduler start function (called from index.ts)
// ─────────────────────────────────────────────
export function startKpiScheduler(): void {

  cron.schedule(
    "5 0 1 * *",
    async () => {
      const now  = new Date();
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const start = prev.toISOString().split("T")[0];
      const end   = new Date(prev.getFullYear(), prev.getMonth() + 1, 0)
                      .toISOString().split("T")[0];
      await calcAndSaveAllStaffKpi(start, end, "monthly");
    },
    { timezone: "Australia/Sydney" }
  );

  cron.schedule(
    "10 0 1 3,6,9,12 *",
    async () => {
      const now  = new Date();
      const m    = now.getMonth();
      const qEnd   = new Date(now.getFullYear(), m, 0);
      const qStart = new Date(qEnd.getFullYear(), qEnd.getMonth() - 2, 1);
      const start  = qStart.toISOString().split("T")[0];
      const end    = qEnd.toISOString().split("T")[0];
      await calcAndSaveAllStaffKpi(start, end, "quarterly");
    },
    { timezone: "Australia/Sydney" }
  );

  console.log("[KPI Scheduler] Registered — monthly (1st of each month 00:05) + quarterly (1st of quarter 00:10)");
}

// ─────────────────────────────────────────────
// Manual trigger function (for API or testing)
// Can be called from POST /api/kpi/scheduler/run
// ─────────────────────────────────────────────
export async function runKpiSchedulerNow(
  periodType: string = "monthly"
): Promise<{ success: boolean; message: string }> {
  try {
    const now  = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const start = prev.toISOString().split("T")[0];
    const end   = new Date(prev.getFullYear(), prev.getMonth() + 1, 0)
                    .toISOString().split("T")[0];
    await calcAndSaveAllStaffKpi(start, end, periodType);
    return { success: true, message: `KPI aggregation complete: ${start} ~ ${end}` };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}
