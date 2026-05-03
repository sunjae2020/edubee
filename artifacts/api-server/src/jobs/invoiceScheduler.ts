import cron from "node-cron";
import { db } from "@workspace/db";
import {
  invoiceSchedules,
  invoiceScheduleRuns,
  invoices,
  invoiceProducts,
} from "@workspace/db/schema";
import { eq, and, lte, sql } from "drizzle-orm";

// ─────────────────────────────────────────────
// Frequency → next-run-date advancement
// ─────────────────────────────────────────────
function advanceDate(d: string, frequency: string): string {
  const date = new Date(d + "T00:00:00Z");
  switch (frequency) {
    case "weekly":    date.setUTCDate(date.getUTCDate() + 7); break;
    case "monthly":   date.setUTCMonth(date.getUTCMonth() + 1); break;
    case "quarterly": date.setUTCMonth(date.getUTCMonth() + 3); break;
    case "termly":    date.setUTCMonth(date.getUTCMonth() + 4); break;
    default:          date.setUTCMonth(date.getUTCMonth() + 1);
  }
  return date.toISOString().split("T")[0];
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function genInvoiceNumber(): string {
  return "INV-R-" + Date.now().toString(36).toUpperCase();
}

// ─────────────────────────────────────────────
// Core: process due schedules
// ─────────────────────────────────────────────
export async function runDueInvoiceSchedules(): Promise<{
  processed: number; succeeded: number; failed: number; skipped: number;
}> {
  const today = todayISO();
  const due = await db
    .select()
    .from(invoiceSchedules)
    .where(and(
      eq(invoiceSchedules.status, "active"),
      lte(invoiceSchedules.nextRunDate, today),
    ));

  let succeeded = 0, failed = 0, skipped = 0;

  for (const s of due) {
    // End-date / max-runs guards
    if (s.endDate && s.nextRunDate > s.endDate) {
      await db.update(invoiceSchedules)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(invoiceSchedules.id, s.id));
      skipped++;
      continue;
    }
    if (s.maxRuns != null && s.runCount >= s.maxRuns) {
      await db.update(invoiceSchedules)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(invoiceSchedules.id, s.id));
      skipped++;
      continue;
    }

    try {
      await db.transaction(async (tx) => {
        // Idempotency: insert run row first; UNIQUE(schedule_id, run_date) blocks dupes.
        const [run] = await tx.insert(invoiceScheduleRuns).values({
          organisationId: s.organisationId,
          scheduleId: s.id,
          runDate:    s.nextRunDate,
          status:     "ok",
        }).returning();

        const [inv] = await tx.insert(invoices).values({
          organisationId:    s.organisationId,
          invoiceNumber:     genInvoiceNumber(),
          contractId:        s.contractId,
          accountId:         s.accountId,
          invoiceType:       s.invoiceType,
          totalAmount:       s.amount,
          subtotal:          s.amount,
          balanceDue:        s.amount,
          currency:          s.currency,
          status:            "draft",
          arStatus:          "invoiced",
          isRecurring:       true,
          recurringCycle:    s.frequency,
          recurringSeq:      s.runCount + 1,
          contractProductId: s.contractProductId,
          dueDate:           s.nextRunDate,
          notes:             s.description ?? `Auto-generated from schedule ${s.id}`,
          createdBy:         s.createdBy,
        }).returning();

        if (s.contractProductId) {
          await tx.insert(invoiceProducts).values({
            organisationId:    s.organisationId,
            invoiceId:         inv.id,
            contractProductId: s.contractProductId,
            name:              s.description ?? "Recurring charge",
            quantity:          1,
            unitPrice:         s.amount,
            amount:            s.amount,
            sortIndex:         0,
          });
        }

        await tx.update(invoiceScheduleRuns)
          .set({ invoiceId: inv.id })
          .where(eq(invoiceScheduleRuns.id, run.id));

        const nextDate = advanceDate(s.nextRunDate, s.frequency);
        const newRunCount = s.runCount + 1;
        const exhausted = s.maxRuns != null && newRunCount >= s.maxRuns;
        await tx.update(invoiceSchedules)
          .set({
            lastRunDate:  s.nextRunDate,
            nextRunDate:  exhausted ? s.nextRunDate : nextDate,
            runCount:     newRunCount,
            status:       exhausted ? "completed" : "active",
            updatedAt:    new Date(),
          })
          .where(eq(invoiceSchedules.id, s.id));
      });
      succeeded++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Unique violation = already ran today; treat as skip, not failure.
      if (msg.includes("invoice_schedule_runs_idem") || msg.includes("duplicate key")) {
        skipped++;
        continue;
      }
      console.error(`[InvoiceScheduler] schedule ${s.id} failed:`, msg);
      try {
        await db.insert(invoiceScheduleRuns).values({
          organisationId: s.organisationId,
          scheduleId: s.id,
          runDate:    s.nextRunDate,
          status:     "failed",
          errorMsg:   msg.slice(0, 1000),
        }).onConflictDoNothing();
      } catch (logErr) {
        console.error("[InvoiceScheduler] failed to log run failure:", logErr);
      }
      failed++;
    }
  }

  return { processed: due.length, succeeded, failed, skipped };
}

// ─────────────────────────────────────────────
// Cron registration
// ─────────────────────────────────────────────
export function startInvoiceScheduler(): void {
  // Every day at 02:00 Australia/Sydney
  cron.schedule(
    "0 2 * * *",
    async () => {
      console.log("[InvoiceScheduler] Daily run starting");
      try {
        const r = await runDueInvoiceSchedules();
        console.log(
          `[InvoiceScheduler] Done — processed: ${r.processed}, ok: ${r.succeeded}, ` +
          `skipped: ${r.skipped}, failed: ${r.failed}`
        );
      } catch (err) {
        console.error("[InvoiceScheduler] Run crashed:", err);
      }
    },
    { timezone: "Australia/Sydney" }
  );
  console.log("[InvoiceScheduler] Cron job registered — runs at 02:00 Australia/Sydney");
}

// Suppress unused-import warning for `sql` (kept for future use)
void sql;
