import { Router } from "express";
import { db } from "@workspace/db";
import { invoices, transactions, exchangeRates, receipts, contracts, applications, users, accountLedgerEntries, settlementMgt, banking, journalEntries } from "@workspace/db/schema";
import { eq, and, count, inArray, sql, SQL, desc, asc } from "drizzle-orm";
import { createLedgerEntry, confirmLedgerEntriesBySource, reverseLedgerEntry } from "../services/ledgerService.js";
import { sendMail } from "../mailer.js";

async function enrichWithStudentName(rows: any[]): Promise<any[]> {
  const contractIds = [...new Set(rows.map(r => r.contractId).filter(Boolean))] as string[];
  if (contractIds.length === 0) return rows;
  const contractRows = await db
    .select({
      contractId: contracts.id,
      contractNumber: contracts.contractNumber,
      studentName: contracts.studentName,
      clientEmail: contracts.clientEmail,
      agentName: contracts.agentName,
      clientId: applications.clientId,
    })
    .from(contracts)
    .leftJoin(applications, eq(contracts.applicationId, applications.id))
    .where(inArray(contracts.id, contractIds));

  const contractMap = new Map(contractRows.map(c => [c.contractId, {
    contractNumber: c.contractNumber,
    studentName: c.studentName,
    studentEmail: c.clientEmail,
    agentName: c.agentName,
  }]));

  return rows.map(r => {
    const info = contractMap.get(r.contractId) ?? {};
    return { ...r, ...info };
  });
}
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { syncExchangeRates, getLastSyncInfo } from "../services/exchangeRateSync.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin"];

function generateInvoiceNumber() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${year}${month}-${random}`;
}

// Invoices
router.get("/invoices", authenticate, async (req, res) => {
  try {
    const { contractId, status, invoiceType, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (contractId) conditions.push(eq(invoices.contractId, contractId));
    if (status) conditions.push(eq(invoices.status, status));
    if (invoiceType) conditions.push(eq(invoices.invoiceType, invoiceType));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalResult] = await db.select({ count: count() }).from(invoices).where(whereClause);
    const rawData = await db.select().from(invoices).where(whereClause).limit(limitNum).offset(offset).orderBy(invoices.createdAt);
    const data = await enrichWithStudentName(rawData);

    const total = Number(totalResult.count);
    return res.json({ data, meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/invoices", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const body = req.body;
    body.invoiceNumber = generateInvoiceNumber();
    body.createdBy = req.user!.id;
    const [invoice] = await db.insert(invoices).values(body).returning();

    // TRIGGER A: Invoice issued → debit ledger entry
    try {
      const today = new Date().toISOString().split('T')[0];
      const ledgerEntry = await createLedgerEntry({
        accountId:         invoice.recipientId,
        sourceType:        'invoice',
        sourceId:          invoice.id,
        contractId:        invoice.contractId,
        entryType:         'debit',
        amount:            parseFloat(invoice.totalAmount),
        currency:          invoice.currency ?? 'AUD',
        originalAmount:    parseFloat(invoice.originalAmount ?? invoice.totalAmount),
        originalCurrency:  invoice.originalCurrency ?? invoice.currency ?? 'AUD',
        audEquivalent:     parseFloat(invoice.audEquivalent ?? invoice.totalAmount),
        exchangeRateToAud: parseFloat(invoice.exchangeRateToAud ?? '1'),
        status:            'pending',
        description:       `Invoice ${invoice.invoiceNumber} issued`,
        entryDate:         today,
        createdBy:         req.user!.id,
      });
      await db.update(invoices)
        .set({ ledgerEntryId: ledgerEntry.id })
        .where(eq(invoices.id, invoice.id));
    } catch (ledgerErr: any) {
      console.error('Ledger entry for invoice failed:', ledgerErr.message);
    }

    return res.status(201).json(invoice);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/invoices/:id", authenticate, async (req, res) => {
  try {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, req.params.id as string)).limit(1);
    if (!invoice) return res.status(404).json({ error: "Not Found" });
    return res.json(invoice);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/invoices/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [invoice] = await db.update(invoices).set({ ...req.body, updatedAt: new Date() })
      .where(eq(invoices.id, req.params.id as string)).returning();
    if (!invoice) return res.status(404).json({ error: "Not Found" });
    return res.json(invoice);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Send Invoice by Email
router.post("/invoices/:id/send-email", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, req.params.id as string)).limit(1);
    if (!inv) return res.status(404).json({ error: "Invoice not found" });

    const toEmail: string | undefined = req.body.email;
    if (!toEmail) return res.status(400).json({ error: "email is required" });

    const invNumber = inv.invoiceNumber ?? req.params.id as string;
    const amount = inv.totalAmount ? `${inv.currency ?? "AUD"} ${Number(inv.totalAmount).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—";
    const dueDate = inv.dueDate ?? "—";

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px">
        <div style="text-align:center;margin-bottom:24px">
          <h1 style="color:#F5821F;font-size:28px;margin:0">Edubee Camp</h1>
          <p style="color:#64748b;margin:4px 0">Invoice Notification</p>
        </div>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0" />
        <h2 style="color:#1a1917;font-size:20px">Invoice ${invNumber}</h2>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px 0;color:#64748b;width:140px">Invoice Number</td><td style="padding:8px 0;font-weight:bold">${invNumber}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Amount</td><td style="padding:8px 0;font-weight:bold">${amount}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Due Date</td><td style="padding:8px 0">${dueDate}</td></tr>
          ${inv.notes ? `<tr><td style="padding:8px 0;color:#64748b">Notes</td><td style="padding:8px 0">${inv.notes}</td></tr>` : ""}
        </table>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0" />
        <p style="color:#64748b;font-size:13px;text-align:center">Please process this payment by the due date. Contact us if you have any questions.</p>
        <p style="color:#64748b;font-size:12px;text-align:center">Edubee Camp Administration</p>
      </div>
    `;

    await sendMail({ to: toEmail, subject: `Invoice ${invNumber} from Edubee Camp`, html });

    await db.update(invoices).set({
      status: inv.status === "draft" ? "sent" : inv.status,
      issuedAt: inv.issuedAt ?? new Date(),
      updatedAt: new Date(),
    }).where(eq(invoices.id, inv.id));

    return res.json({ success: true, sentTo: toEmail });
  } catch (err: any) {
    console.error("[POST /invoices/:id/send-email]", err);
    return res.status(500).json({ error: err.message ?? "Internal Server Error" });
  }
});

// Transactions
router.get("/transactions", authenticate, async (req, res) => {
  try {
    const { contractId, invoiceId, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (contractId) conditions.push(eq(transactions.contractId, contractId));
    if (invoiceId) conditions.push(eq(transactions.invoiceId, invoiceId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalResult] = await db.select({ count: count() }).from(transactions).where(whereClause);
    const rawData = await db.select().from(transactions).where(whereClause).limit(limitNum).offset(offset).orderBy(transactions.createdAt);
    const data = await enrichWithStudentName(rawData);

    const total = Number(totalResult.count);
    return res.json({ data, meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/transactions", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const body = { ...req.body, createdBy: req.user!.id };
    const [transaction] = await db.insert(transactions).values(body).returning();

    // TRIGGER B: payment_received → credit ledger entry
    if (transaction.transactionType === 'payment_received') {
      try {
        const ledgerEntry = await createLedgerEntry({
          accountId:         req.body.payerId ?? req.body.clientId,
          sourceType:        'transaction',
          sourceId:          transaction.id,
          contractId:        transaction.contractId,
          entryType:         'credit',
          amount:            parseFloat(transaction.amount),
          currency:          transaction.currency ?? 'AUD',
          originalAmount:    parseFloat(transaction.originalAmount ?? transaction.amount),
          originalCurrency:  transaction.originalCurrency ?? transaction.currency ?? 'AUD',
          audEquivalent:     parseFloat(transaction.audEquivalent ?? transaction.amount),
          exchangeRateToAud: parseFloat(transaction.exchangeRateToAud ?? '1'),
          status:            'pending',
          description:       `Payment received - ${transaction.bankReference ?? ''}`,
          entryDate:         transaction.transactionDate,
          createdBy:         req.user!.id,
        });
        await db.update(transactions)
          .set({ ledgerEntryId: ledgerEntry.id })
          .where(eq(transactions.id, transaction.id));

        // Partial payment check
        if (transaction.contractId && transaction.invoiceId) {
          const paidRows = await db.select({ total: sql<string>`SUM(amount)` })
            .from(accountLedgerEntries)
            .where(and(
              eq(accountLedgerEntries.contractId, transaction.contractId),
              eq(accountLedgerEntries.sourceType, 'transaction'),
              eq(accountLedgerEntries.entryType, 'credit'),
              sql`status IN ('pending','confirmed')`,
            ));
          const paidSoFar = parseFloat(paidRows[0]?.total ?? '0');
          const linkedInv = await db.select().from(invoices)
            .where(eq(invoices.id, transaction.invoiceId)).limit(1);
          const invoiceTotal = parseFloat(linkedInv[0]?.totalAmount ?? '0');

          if (paidSoFar > 0 && paidSoFar < invoiceTotal) {
            await db.update(invoices)
              .set({ status: 'partially_paid' })
              .where(eq(invoices.id, transaction.invoiceId));
          } else if (paidSoFar >= invoiceTotal) {
            await db.update(invoices)
              .set({ status: 'awaiting_receipt' })
              .where(eq(invoices.id, transaction.invoiceId));
          }
        }
      } catch (ledgerErr: any) {
        console.error('Ledger entry for transaction failed:', ledgerErr.message);
      }
    }

    // TRIGGER B: refund_issued → reverse original credit entry
    if (transaction.transactionType === 'refund_issued') {
      try {
        const original = await db.select()
          .from(accountLedgerEntries)
          .where(and(
            eq(accountLedgerEntries.contractId, transaction.contractId),
            eq(accountLedgerEntries.sourceType, 'transaction'),
            eq(accountLedgerEntries.entryType, 'credit'),
            sql`status != 'reversed'`,
          ))
          .limit(1);
        if (original[0]) {
          await reverseLedgerEntry(original[0].id, 'Refund issued', req.user!.id);
          if (req.body.invoiceId) {
            await db.update(invoices)
              .set({ status: 'refunded' })
              .where(eq(invoices.id, req.body.invoiceId));
          }
        }
      } catch (e: any) {
        console.error('Refund reversal failed:', e.message);
      }
    }

    return res.status(201).json(transaction);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Exchange Rates
router.get("/exchange-rates", authenticate, async (req, res) => {
  try {
    const data = await db.select().from(exchangeRates).orderBy(exchangeRates.effectiveDate);
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/exchange-rates", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const body = { ...req.body, createdBy: req.user!.id };
    const [rate] = await db.insert(exchangeRates).values(body).returning();
    return res.status(201).json(rate);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/exchange-rates/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { id } = req.params as Record<string, string>;
    const deleted = await db.delete(exchangeRates).where(eq(exchangeRates.id, id)).returning();
    if (deleted.length === 0) return res.status(404).json({ error: "Not found" });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Manual sync trigger — fetches from external API immediately
router.post("/exchange-rates/sync", authenticate, requireRole(...ADMIN_ROLES), async (_req, res) => {
  try {
    const result = await syncExchangeRates();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Sync status info — when was last auto-sync
router.get("/exchange-rates/sync-info", authenticate, async (_req, res) => {
  try {
    const info = await getLastSyncInfo();
    return res.json(info);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Receipts ─────────────────────────────────────────────────
router.get("/receipts", authenticate, async (req, res) => {
  try {
    const { invoiceId, status, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;
    const conditions: SQL[] = [];
    if (invoiceId) conditions.push(eq(receipts.invoiceId, invoiceId));
    if (status) conditions.push(eq(receipts.status, status));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalResult] = await db.select({ count: count() }).from(receipts).where(whereClause);
    const rawData = await db.select().from(receipts).where(whereClause).limit(limitNum).offset(offset).orderBy(receipts.createdAt);

    // Enrich via invoiceId → invoice (contractId + invoiceNumber) → contracts (studentName, contractNumber, studentEmail)
    const invIds = [...new Set(rawData.map(r => r.invoiceId).filter(Boolean))] as string[];
    const invRows = invIds.length > 0
      ? await db.select({ id: invoices.id, contractId: invoices.contractId, invoiceNumber: invoices.invoiceNumber }).from(invoices).where(inArray(invoices.id, invIds))
      : [];
    const withInvoiceData = rawData.map(r => {
      const inv = invRows.find(i => i.id === r.invoiceId);
      return { ...r, contractId: inv?.contractId ?? null, invoiceNumber: inv?.invoiceNumber ?? null };
    });
    const data = await enrichWithStudentName(withInvoiceData);

    const total = Number(totalResult.count);
    return res.json({ data, meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get single receipt
router.get("/receipts/:id", authenticate, async (req, res) => {
  try {
    const [rcp] = await db.select().from(receipts).where(eq(receipts.id, req.params.id as string)).limit(1);
    if (!rcp) return res.status(404).json({ error: "Receipt not found" });
    const inv = rcp.invoiceId
      ? (await db.select({ id: invoices.id, contractId: invoices.contractId, invoiceNumber: invoices.invoiceNumber }).from(invoices).where(eq(invoices.id, rcp.invoiceId)).limit(1))[0]
      : null;
    const withInvoice = { ...rcp, contractId: inv?.contractId ?? null, invoiceNumber: inv?.invoiceNumber ?? null };
    const [enriched] = await enrichWithStudentName([withInvoice]);
    return res.json({ data: enriched });
  } catch {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update receipt status
router.patch("/receipts/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [existing] = await db.select().from(receipts).where(eq(receipts.id, req.params.id as string)).limit(1);
    if (!existing) return res.status(404).json({ error: "Receipt not found" });
    const { status, confirmedAt } = req.body;
    const updates: Record<string, any> = {};
    if (status !== undefined) updates.status = status;
    if (confirmedAt !== undefined) updates.confirmedAt = confirmedAt;
    const [updated] = await db.update(receipts).set(updates).where(eq(receipts.id, req.params.id as string)).returning();
    return res.json({ data: updated });
  } catch {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Send Receipt by Email
router.post("/receipts/:id/send-email", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [rcp] = await db.select().from(receipts).where(eq(receipts.id, req.params.id as string)).limit(1);
    if (!rcp) return res.status(404).json({ error: "Receipt not found" });

    const toEmail: string | undefined = req.body.email;
    if (!toEmail) return res.status(400).json({ error: "email is required" });

    const rcpNumber = rcp.receiptNumber ?? req.params.id as string;
    const sym = (rcp.currency ?? "AUD") === "AUD" ? "A$" : (rcp.currency ?? "");
    const amountStr = rcp.amount ? `${rcp.currency ?? "AUD"} ${Number(rcp.amount).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—";
    const dateStr = rcp.receiptDate ?? "—";

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px">
        <div style="text-align:center;margin-bottom:24px">
          <h1 style="color:#F5821F;font-size:28px;margin:0">Edubee Camp</h1>
          <p style="color:#64748b;margin:4px 0">Payment Receipt</p>
        </div>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0" />
        <h2 style="color:#1a1917;font-size:20px">Receipt ${rcpNumber}</h2>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px 0;color:#64748b;width:150px">Receipt Number</td><td style="padding:8px 0;font-weight:bold">${rcpNumber}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Amount Received</td><td style="padding:8px 0;font-weight:bold;color:#16A34A">${amountStr}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Payment Method</td><td style="padding:8px 0;text-transform:capitalize">${(rcp.paymentMethod ?? "—").replace(/_/g, " ")}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Receipt Date</td><td style="padding:8px 0">${dateStr}</td></tr>
          ${rcp.notes ? `<tr><td style="padding:8px 0;color:#64748b">Notes</td><td style="padding:8px 0">${rcp.notes}</td></tr>` : ""}
        </table>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0" />
        <p style="color:#64748b;font-size:13px;text-align:center">Thank you — your payment has been received and confirmed.</p>
        <p style="color:#64748b;font-size:12px;text-align:center">Edubee Camp Administration</p>
      </div>
    `;

    await sendMail({ to: toEmail, subject: `Payment Receipt ${rcpNumber} — Edubee Camp`, html });

    return res.json({ success: true, sentTo: toEmail });
  } catch (err: any) {
    console.error("[POST /receipts/:id/send-email]", err);
    return res.status(500).json({ error: err.message ?? "Internal Server Error" });
  }
});

router.post("/receipts", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    function generateReceiptNumber() {
      const now = new Date();
      return `RCP-${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`;
    }
    const body = { ...req.body, receiptNumber: req.body.receiptNumber || generateReceiptNumber(), createdBy: req.user!.id };
    const [receipt] = await db.insert(receipts).values(body).returning();

    // TRIGGER C: Receipt confirmed → confirm ledger entries + mark invoice paid + agent commission
    try {
      const PLATFORM_ADMIN_ID = process.env.PLATFORM_ADMIN_USER_ID;
      const today = new Date().toISOString().split('T')[0];

      // Step 1: Confirm the invoice debit entry
      if (receipt.invoiceId) {
        await confirmLedgerEntriesBySource('invoice', receipt.invoiceId);
      }

      // Step 3: Resolve contractId via invoice
      let linkedContractId: string | null = null;
      let linkedContract: any = null;
      if (receipt.invoiceId) {
        const [inv] = await db.select().from(invoices).where(eq(invoices.id, receipt.invoiceId)).limit(1);
        if (inv) {
          linkedContractId = inv.contractId;
          // Step 3a: Mark invoice as paid
          await db.update(invoices)
            .set({ status: 'paid', paidAt: new Date() })
            .where(eq(invoices.id, receipt.invoiceId));
          // Step 3b: Fetch contract
          if (linkedContractId) {
            const [con] = await db.select().from(contracts).where(eq(contracts.id, linkedContractId)).limit(1);
            linkedContract = con ?? null;
          }
        }
      }

      // Step 4: Platform receipt credit entry
      if (PLATFORM_ADMIN_ID && linkedContractId) {
        const platformEntry = await createLedgerEntry({
          accountId:     PLATFORM_ADMIN_ID,
          sourceType:    'receipt',
          sourceId:      receipt.id,
          contractId:    linkedContractId,
          entryType:     'credit',
          amount:        parseFloat(receipt.amount),
          currency:      receipt.currency ?? 'AUD',
          audEquivalent: parseFloat(receipt.audEquivalent ?? receipt.amount),
          status:        'confirmed',
          description:   `Receipt ${receipt.receiptNumber} confirmed`,
          entryDate:     receipt.receiptDate ?? today,
          createdBy:     req.user!.id,
        });
        await db.update(receipts)
          .set({ ledgerEntryId: platformEntry.id })
          .where(eq(receipts.id, receipt.id));
      }

      // Step 5: Auto-create agent commission entry
      if (linkedContract?.applicationId && linkedContractId) {
        const [application] = await db.select()
          .from(applications)
          .where(eq(applications.id, linkedContract.applicationId))
          .limit(1);
        if (application?.agentId) {
          const [agentSettlement] = await db.select()
            .from(settlementMgt)
            .where(and(
              eq(settlementMgt.contractId, linkedContractId),
              eq(settlementMgt.providerRole, 'education_agent'),
            ))
            .limit(1);
          if (agentSettlement && !agentSettlement.ledgerEntryId) {
            const agentEntry = await createLedgerEntry({
              accountId:   application.agentId,
              sourceType:  'settlement_mgt',
              sourceId:    agentSettlement.id,
              contractId:  linkedContractId,
              entryType:   'credit',
              amount:      parseFloat(agentSettlement.netAmount),
              currency:    'AUD',
              status:      'pending',
              description: `Agent commission - ${receipt.receiptNumber}`,
              entryDate:   today,
              createdBy:   req.user!.id,
            });
            await db.update(settlementMgt)
              .set({ ledgerEntryId: agentEntry.id })
              .where(eq(settlementMgt.id, agentSettlement.id));
          }
        }
      }
      // Step 6: Auto-generate journal entry (trust_receipt → DR 1200 Trust / CR 2100 Student Tuition Payable)
      if (receipt.invoiceId && receipt.amount && parseFloat(receipt.amount) > 0) {
        try {
          await db.insert(journalEntries).values({
            entryDate:     receipt.receiptDate ?? today,
            debitCoa:      "1200",
            creditCoa:     "2100",
            amount:        receipt.amount,
            description:   `Auto JE: Receipt ${receipt.receiptNumber}`,
            entryType:     "trust_receipt",
            invoiceId:     receipt.invoiceId,
            contractId:    linkedContractId,
            autoGenerated: true,
            createdBy:     req.user!.id,
          });
        } catch (jeErr: any) {
          console.error("[POST /receipts] Journal entry creation failed:", jeErr.message);
        }
      }
    } catch (ledgerErr: any) {
      console.error('Receipt ledger processing failed:', ledgerErr.message);
    }

    return res.status(201).json(receipt);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Bank Accounts ────────────────────────────────────────────────────────────

// GET /finance/bank-accounts
router.get("/bank-accounts", authenticate, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(banking)
      .where(eq(banking.status, "active"))
      .orderBy(desc(banking.isPrimary), asc(banking.accountName));
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /finance/bank-accounts/:id
router.get("/bank-accounts/:id", authenticate, async (req, res) => {
  try {
    const [row] = await db.select().from(banking).where(eq(banking.id, req.params.id as string));
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /finance/bank-accounts
router.post("/bank-accounts", authenticate, requireRole("admin", "superadmin"), async (req, res) => {
  try {
    const {
      organisationId, accountName, bankName, accountNumber, accountHolder,
      bsb, bankCode, swiftCode, countryCode, defaultCurrency,
      accountEntity, bankAddress,
      isPrimary, status, notes,
    } = req.body;

    if (!accountName || !bankName) {
      return res.status(400).json({ error: "accountName and bankName are required" });
    }

    // If new account is primary, unset existing primary
    if (isPrimary) {
      await db.update(banking).set({ isPrimary: false });
    }

    const [created] = await db.insert(banking).values({
      organisationId: organisationId ?? null,
      accountName,
      bankName,
      accountNumber: accountNumber ?? null,
      accountHolder: accountHolder ?? null,
      bsb: bsb ?? null,
      bankCode: bankCode ?? null,
      swiftCode: swiftCode ?? null,
      countryCode: countryCode ?? "AU",
      defaultCurrency: defaultCurrency ?? "AUD",
      accountEntity: accountEntity ?? null,
      bankAddress: bankAddress ?? null,
      isPrimary: isPrimary ?? false,
      status: status ?? "active",
      notes: notes ?? null,
    }).returning();

    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /finance/bank-accounts/:id
router.patch("/bank-accounts/:id", authenticate, requireRole("admin", "superadmin"), async (req, res) => {
  try {
    const {
      accountName, bankName, accountNumber, accountHolder,
      bsb, bankCode, swiftCode, countryCode, defaultCurrency,
      accountEntity, bankAddress,
      isPrimary, status, notes,
    } = req.body;

    // If setting as primary, unset others first
    if (isPrimary === true) {
      await db.update(banking).set({ isPrimary: false });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (accountName !== undefined)     updates.accountName    = accountName;
    if (bankName !== undefined)        updates.bankName       = bankName;
    if (accountNumber !== undefined)   updates.accountNumber  = accountNumber;
    if (accountHolder !== undefined)   updates.accountHolder  = accountHolder;
    if (bsb !== undefined)             updates.bsb            = bsb;
    if (bankCode !== undefined)        updates.bankCode       = bankCode;
    if (swiftCode !== undefined)       updates.swiftCode      = swiftCode;
    if (countryCode !== undefined)     updates.countryCode    = countryCode;
    if (defaultCurrency !== undefined) updates.defaultCurrency = defaultCurrency;
    if (accountEntity !== undefined)   updates.accountEntity  = accountEntity;
    if (bankAddress !== undefined)     updates.bankAddress    = bankAddress;
    if (isPrimary !== undefined)       updates.isPrimary      = isPrimary;
    if (status !== undefined)          updates.status         = status;
    if (notes !== undefined)           updates.notes          = notes;

    const [updated] = await db.update(banking).set(updates).where(eq(banking.id, req.params.id as string)).returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /finance/bank-accounts/:id  (soft delete)
router.delete("/bank-accounts/:id", authenticate, requireRole("admin", "superadmin"), async (req, res) => {
  try {
    const [updated] = await db
      .update(banking)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(eq(banking.id, req.params.id as string))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

