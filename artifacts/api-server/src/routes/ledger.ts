import { Router } from 'express';
import { eq, sql } from 'drizzle-orm';
import { db } from '@workspace/db';
import { accountLedgerEntries, invoices, transactions, receipts } from '@workspace/db/schema';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getAccountBalance, createLedgerEntry } from '../services/ledgerService.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

// GET balance summary for a user
router.get('/ledger/balance/:userId', authenticate, asyncHandler(async (req: any, res: any) => {
  const { userId } = req.params;
  if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
    if (req.user.id !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
  }
  const balance = await getAccountBalance(userId);
  return res.json({ success: true, data: balance });
}));

// GET full AR status for a contract
router.get('/ledger/ar-status/:contractId', authenticate, asyncHandler(async (req: any, res: any) => {
  const { contractId } = req.params;

  const contractInvoices = await db.select()
    .from(invoices)
    .where(eq(invoices.contractId, contractId));

  const result = await Promise.all(contractInvoices.map(async (inv: any) => {
    const txns = await db.select()
      .from(transactions)
      .where(eq(transactions.invoiceId, inv.id));

    const rcpts = await db.select()
      .from(receipts)
      .where(eq(receipts.invoiceId, inv.id));

    const totalReceived = txns.reduce(
      (s: number, t: any) => s + parseFloat(t.audEquivalent ?? t.amount ?? '0'), 0
    );
    const invoiced    = parseFloat(inv.audEquivalent ?? inv.totalAmount ?? '0');
    const outstanding = Math.max(0, invoiced - totalReceived);

    return {
      invoiceId:     inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceType:   inv.invoiceType,
      totalAmount:   inv.totalAmount,
      currency:      inv.currency,
      audEquivalent: inv.audEquivalent,
      status:        inv.status,
      issuedAt:      inv.issuedAt,
      dueDate:       inv.dueDate,
      paidAt:        inv.paidAt,
      transactions:  txns.map((t: any) => ({
        transactionId:   t.id,
        amount:          t.amount,
        currency:        t.currency,
        audEquivalent:   t.audEquivalent,
        bankReference:   t.bankReference,
        transactionDate: t.transactionDate,
      })),
      receipts: rcpts.map((r: any) => ({
        receiptId:     r.id,
        receiptNumber: r.receiptNumber,
        amount:        r.amount,
        receiptDate:   r.receiptDate,
        status:        r.status,
      })),
      balance: {
        invoiced,
        received:    totalReceived,
        outstanding,
        isFullyPaid: outstanding === 0 && inv.status === 'paid',
      },
    };
  }));

  const totalInvoiced    = result.reduce((s: number, i: any) => s + i.balance.invoiced, 0);
  const totalReceived    = result.reduce((s: number, i: any) => s + i.balance.received, 0);
  const totalOutstanding = result.reduce((s: number, i: any) => s + i.balance.outstanding, 0);

  return res.json({
    success: true,
    data: {
      contractId,
      invoices: result,
      arSummary: {
        totalInvoiced,
        totalReceived,
        totalOutstanding,
        isFullyPaid: totalOutstanding === 0,
      },
    },
  });
}));

// GET ledger entries for an account (paginated)
router.get('/ledger/account/:userId', authenticate, asyncHandler(async (req: any, res: any) => {
  const { userId } = req.params;
  if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
    if (req.user.id !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
  }
  const page   = parseInt((req.query.page as string) ?? '1');
  const limit  = 50;
  const offset = (page - 1) * limit;

  const entries = await db.select()
    .from(accountLedgerEntries)
    .where(eq(accountLedgerEntries.accountId, userId))
    .orderBy(sql`entry_date DESC`)
    .limit(limit)
    .offset(offset);

  return res.json({ success: true, data: entries, page, limit });
}));

// POST manual ledger entry (SA/AD only)
router.post('/ledger/entries', authenticate, requireRole('super_admin', 'admin'), asyncHandler(async (req: any, res: any) => {
  const entry = await createLedgerEntry({ ...req.body, createdBy: req.user.id });
  return res.status(201).json({ success: true, data: entry });
}));

export default router;
