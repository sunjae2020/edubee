import { db } from "@workspace/db";
import { taxInvoices, accounts, notifications, users } from "@workspace/db/schema";
import { eq, and, lte, sql } from "drizzle-orm";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

async function runGrossNotifications() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const dueInvoices = await db
      .select({
        id:           taxInvoices.id,
        invoiceRef:   taxInvoices.invoiceRef,
        studentName:  taxInvoices.studentName,
        programName:  taxInvoices.programName,
        commissionAmount: taxInvoices.commissionAmount,
        contractProductId: taxInvoices.contractProductId,
        schoolAccountId:   taxInvoices.schoolAccountId,
        contractId:   taxInvoices.contractId,
      })
      .from(taxInvoices)
      .where(
        and(
          eq(taxInvoices.invoiceType, "gross"),
          eq(taxInvoices.status, "draft"),
          lte(taxInvoices.courseStartDate, today)
        )
      );

    if (dueInvoices.length === 0) return;

    // Find a consultant / super_admin to notify
    const [consultant] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "camp_coordinator"))
      .limit(1);
    const [admin] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "super_admin"))
      .limit(1);

    const notifyUserId = consultant?.id ?? admin?.id;
    if (!notifyUserId) return;

    for (const inv of dueInvoices) {
      const [school] = await db
        .select({ name: accounts.name })
        .from(accounts)
        .where(eq(accounts.id, inv.schoolAccountId))
        .limit(1);

      await db.insert(notifications).values({
        userId:        notifyUserId,
        type:          "tax_invoice_required",
        title:         "Tax Invoice Required",
        message:       `Tax Invoice required: ${inv.studentName} / ${school?.name ?? "School"} / Commission A$${parseFloat(inv.commissionAmount ?? "0").toFixed(2)} — ${inv.invoiceRef}`,
        referenceType: "tax_invoice",
        referenceId:   inv.id,
        isRead:        false,
      });
    }

    console.log(`[TaxInvoiceScheduler] Created ${dueInvoices.length} GROSS notification(s)`);
  } catch (err) {
    console.error("[TaxInvoiceScheduler] Error:", String(err));
  }
}

export function startTaxInvoiceScheduler() {
  const now = new Date();
  const msUntil9am = (() => {
    const next = new Date(now);
    next.setHours(9, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.getTime() - now.getTime();
  })();

  setTimeout(() => {
    runGrossNotifications();
    setInterval(runGrossNotifications, MS_PER_DAY);
  }, msUntil9am);

  console.log(`[TaxInvoiceScheduler] Started — first run in ${Math.round(msUntil9am / 60000)} min`);
}
