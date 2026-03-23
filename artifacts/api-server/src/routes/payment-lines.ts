import { Router } from "express";
import { db } from "@workspace/db";
import {
  paymentLines,
  paymentHeaders,
  invoices,
  contractProducts,
} from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { createJournalEntriesForPaymentLine } from "../services/journalEntryService.js";

const router = Router();
const STAFF_ROLES = ["super_admin", "admin", "camp_coordinator"];

function userId(req: any): string {
  return req.user?.id ?? "00000000-0000-0000-0000-000000000000";
}

// ─── POST /api/payment-lines ─────────────────────────────────────────────────
// Accepts a single line object or an array of line objects.
router.post(
  "/payment-lines",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const items: any[] = Array.isArray(req.body) ? req.body : [req.body];

      if (!items.length) {
        return res.status(400).json({ error: "At least one payment line is required" });
      }

      // All lines must share the same payment_header_id
      const paymentHeaderId: string = items[0].paymentHeaderId ?? items[0].payment_header_id;
      if (!paymentHeaderId) {
        return res.status(400).json({ error: "paymentHeaderId is required" });
      }

      // Verify the header exists and is not voided
      const [header] = await db
        .select()
        .from(paymentHeaders)
        .where(eq(paymentHeaders.id, paymentHeaderId));
      if (!header) return res.status(404).json({ error: "Payment header not found" });
      if (header.status === "Void") {
        return res.status(400).json({ error: "Cannot add lines to a voided payment" });
      }

      const savedLines = await db.transaction(async (tx) => {
        const inserted: any[] = [];

        for (const item of items) {
          const amount = Number(item.amount ?? 0);
          if (amount <= 0) {
            throw new Error(`amount must be > 0 (got ${amount})`);
          }

          const [line] = await tx
            .insert(paymentLines)
            .values({
              paymentHeaderId,
              invoiceId:         item.invoiceId         ?? item.invoice_id         ?? null,
              contractProductId: item.contractProductId ?? item.contract_product_id ?? null,
              coaCode:           item.coaCode           ?? item.coa_code            ?? null,
              splitType:         item.splitType         ?? item.split_type          ?? null,
              amount:            String(amount.toFixed(2)),
              staffId:           item.staffId           ?? item.staff_id            ?? null,
              description:       item.description       ?? null,
            })
            .returning();

          inserted.push(line);

          // ── Invoice-linked updates ────────────────────────────────────────
          const invoiceId: string | null = line.invoiceId ?? null;
          if (invoiceId) {
            // Decrement balance_due on the invoice
            await tx
              .update(invoices)
              .set({
                balanceDue: sql`GREATEST(COALESCE(balance_due, total_amount) - ${String(amount.toFixed(2))}::numeric, 0)`,
              })
              .where(eq(invoices.id, invoiceId));

            // Re-fetch invoice to check if fully paid
            const [inv] = await tx
              .select({ balanceDue: invoices.balanceDue, contractProductId: invoices.contractProductId })
              .from(invoices)
              .where(eq(invoices.id, invoiceId));

            if (inv && Number(inv.balanceDue ?? 0) <= 0) {
              // Mark invoice as paid
              await tx
                .update(invoices)
                .set({ arStatus: "paid" })
                .where(eq(invoices.id, invoiceId));

              // Update the linked contract_product
              const cpId: string | null = inv.contractProductId ?? line.contractProductId ?? null;
              if (cpId) {
                await tx
                  .update(contractProducts)
                  .set({ arStatus: "paid", apStatus: "ready" })
                  .where(eq(contractProducts.id, cpId));
              }
            }
          }

          // Auto-generate journal entry — shares tx so rollback is atomic
          await createJournalEntriesForPaymentLine(
            {
              id:                line.id,
              paymentHeaderId:   line.paymentHeaderId,
              invoiceId:         line.invoiceId         ?? null,
              contractProductId: line.contractProductId ?? null,
              splitType:         line.splitType         ?? null,
              amount:            line.amount,
              staffId:           line.staffId           ?? null,
              description:       line.description       ?? null,
              createdOn:         line.createdOn,
            },
            {
              id:          header.id,
              paymentRef:  header.paymentRef  ?? null,
              paymentDate: header.paymentDate,
              paymentType: header.paymentType,
              receivedFrom: header.receivedFrom ?? null,
              paidTo:       header.paidTo       ?? null,
            },
            userId(req),
            tx as any
          );
        }

        // Recalculate total_amount on the header from all lines
        await tx
          .update(paymentHeaders)
          .set({
            totalAmount: sql`(
              SELECT COALESCE(SUM(amount::numeric), 0)
              FROM payment_lines
              WHERE payment_header_id = ${paymentHeaderId}::uuid
            )`,
            modifiedOn: new Date(),
          })
          .where(eq(paymentHeaders.id, paymentHeaderId));

        return inserted;
      });

      return res.status(201).json({ data: savedLines });
    } catch (err: any) {
      console.error("[POST /api/payment-lines]", err);
      if (err.message?.startsWith("amount must be")) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/payment-lines/:payment_header_id ───────────────────────────────
router.get(
  "/payment-lines/:payment_header_id",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const rows = await db
        .select()
        .from(paymentLines)
        .where(eq(paymentLines.paymentHeaderId, req.params.payment_header_id));

      return res.json({ data: rows });
    } catch (err) {
      console.error("[GET /api/payment-lines/:payment_header_id]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
