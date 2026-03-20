import { Router } from "express";
import { db } from "@workspace/db";
import { invoices, transactions, exchangeRates, receipts, contracts, applications, users, accountLedgerEntries, settlementMgt } from "@workspace/db/schema";
import { eq, and, count, inArray, sql, SQL } from "drizzle-orm";
import { createLedgerEntry, confirmLedgerEntriesBySource, reverseLedgerEntry } from "../services/ledgerService.js";

async function enrichWithStudentName(rows: any[]): Promise<any[]> {
  const contractIds = [...new Set(rows.map(r => r.contractId).filter(Boolean))] as string[];
  if (contractIds.length === 0) return rows;
  const contractRows = await db
    .select({ contractId: contracts.id, clientId: applications.clientId })
    .from(contracts)
    .leftJoin(applications, eq(contracts.applicationId, applications.id))
    .where(inArray(contracts.id, contractIds));
  const clientIds = [...new Set(contractRows.map(c => c.clientId).filter(Boolean))] as string[];
  const userRows = clientIds.length > 0
    ? await db.select({ id: users.id, fullName: users.fullName }).from(users).where(inArray(users.id, clientIds))
    : [];
  const userMap = new Map(userRows.map(u => [u.id, u.fullName]));
  const contractMap = new Map(contractRows.map(c => [c.contractId, c.clientId ? (userMap.get(c.clientId) ?? null) : null]));
  return rows.map(r => ({ ...r, studentName: contractMap.get(r.contractId) ?? null }));
}
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

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
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, req.params.id)).limit(1);
    if (!invoice) return res.status(404).json({ error: "Not Found" });
    return res.json(invoice);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/invoices/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [invoice] = await db.update(invoices).set({ ...req.body, updatedAt: new Date() })
      .where(eq(invoices.id, req.params.id)).returning();
    if (!invoice) return res.status(404).json({ error: "Not Found" });
    return res.json(invoice);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
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
    const { id } = req.params;
    const deleted = await db.delete(exchangeRates).where(eq(exchangeRates.id, id)).returning();
    if (deleted.length === 0) return res.status(404).json({ error: "Not found" });
    return res.json({ success: true });
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

    // Enrich via invoiceId → invoice.contractId → student name
    const invIds = [...new Set(rawData.map(r => r.invoiceId).filter(Boolean))] as string[];
    const invRows = invIds.length > 0
      ? await db.select({ id: invoices.id, contractId: invoices.contractId }).from(invoices).where(inArray(invoices.id, invIds))
      : [];
    const withContractId = rawData.map(r => ({ ...r, contractId: invRows.find(i => i.id === r.invoiceId)?.contractId ?? null }));
    const data = await enrichWithStudentName(withContractId);

    const total = Number(totalResult.count);
    return res.json({ data, meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
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

      // Step 1: Confirm the transaction credit entry
      if (receipt.transactionId) {
        await confirmLedgerEntriesBySource('transaction', receipt.transactionId);
      }

      // Step 2: Confirm the invoice debit entry
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
    } catch (ledgerErr: any) {
      console.error('Receipt ledger processing failed:', ledgerErr.message);
    }

    return res.status(201).json(receipt);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

