import { db } from "@workspace/db";
import {
  paymentStatements,
  paymentHeaders,
  paymentLines,
  contractProducts,
  contracts,
  organisations,
  accounts,
} from "@workspace/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { users } from "@workspace/db/schema";
import { renderStatementPdf, type StatementPdfData, type PaymentHistoryLine, type OutstandingLine } from "./paymentStatementPdfService.js";
import { sendMail } from "../mailer.js";
import path from "path";
import fs from "fs";

// ── Statement reference generator ────────────────────────────────────────
export async function buildStatementRef(): Promise<string> {
  const result = await db.execute(sql`SELECT COUNT(*)::int AS n FROM payment_statements`);
  const n = Number((result.rows[0] as any)?.n ?? 0);
  const seq = String(n + 1).padStart(6, "0");
  return `PHS-${seq}`;
}

// ── PDF storage ───────────────────────────────────────────────────────────
function pdfPath(ref: string): string {
  const dir = path.join(process.cwd(), "generated_pdfs");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${ref}.pdf`);
}

// ── Core: fetch payment history (paid items) ─────────────────────────────
export async function getPaymentHistory(contractId: string): Promise<PaymentHistoryLine[]> {
  const rows = await db.execute(sql`
    SELECT
      ph.payment_date,
      pl.split_type,
      pl.description,
      pl.amount,
      ph.payment_ref   AS receipt_ref,
      cp.name          AS product_name
    FROM payment_headers ph
    JOIN payment_lines    pl  ON pl.payment_header_id   = ph.id
    JOIN contract_products cp ON pl.contract_product_id = cp.id
    JOIN contracts         c  ON cp.contract_id          = c.id
    WHERE c.id = ${contractId}
      AND cp.ar_status = 'paid'
      AND ph.status    = 'Active'
    ORDER BY ph.payment_date ASC, ph.created_on ASC
  `);
  return (rows.rows as any[]).map(r => ({
    paymentDate:  r.payment_date,
    splitType:    r.split_type,
    description:  r.description,
    receiptRef:   r.receipt_ref ?? "—",
    amount:       r.amount,
    productName:  r.product_name,
  }));
}

// ── Core: fetch outstanding items ─────────────────────────────────────────
export async function getOutstandingBalance(contractId: string): Promise<OutstandingLine[]> {
  const rows = await db
    .select({
      arDueDate:   contractProducts.arDueDate,
      productName: contractProducts.name,
      arAmount:    contractProducts.arAmount,
      arStatus:    contractProducts.arStatus,
    })
    .from(contractProducts)
    .where(
      eq(contractProducts.contractId, contractId)
      // Use raw SQL for the IN check since drizzle inArray with string literals needs explicit cast
    );
  return (rows as any[])
    .filter(r => ["scheduled","invoiced","overdue"].includes(r.arStatus ?? ""))
    .sort((a, b) => {
      if (!a.arDueDate) return 1;
      if (!b.arDueDate) return -1;
      return a.arDueDate.localeCompare(b.arDueDate);
    })
    .map(r => ({
      arDueDate:   r.arDueDate,
      productName: r.productName,
      arAmount:    r.arAmount ?? "0",
      arStatus:    r.arStatus ?? "scheduled",
    }));
}

// ── Main generator ────────────────────────────────────────────────────────
export interface GenerateStatementParams {
  scope:            "contract" | "student";
  contractId?:      string;
  studentAccountId?: string;
  issueReason?:     string;
  notes?:           string;
  sendEmail?:       boolean;
  emailTo?:         string;
  issuedBy:         string;
}

export async function generateStatement(params: GenerateStatementParams): Promise<{
  id: string;
  statementRef: string;
  pdfPath: string;
  pdfBuffer: Buffer;
}> {
  const {
    scope, contractId, studentAccountId, issueReason, notes,
    sendEmail, emailTo, issuedBy,
  } = params;

  if (scope === "contract" && !contractId) throw new Error("contractId required for contract scope");
  if (scope === "student" && !studentAccountId && !contractId) throw new Error("studentAccountId or contractId required for student scope");

  const resolvedContractId = contractId!;

  // 1. Load contract
  const [ctr] = await db
    .select({
      id:             contracts.id,
      contractNumber: contracts.contractNumber,
      studentName:    contracts.studentName,
      clientEmail:    contracts.clientEmail,
      courseStartDate:contracts.courseStartDate,
      courseEndDate:  contracts.courseEndDate,
      totalArAmount:  contracts.totalArAmount,
      packageGroupName: contracts.packageGroupName,
    })
    .from(contracts)
    .where(eq(contracts.id, resolvedContractId))
    .limit(1);
  if (!ctr) throw new Error(`Contract not found: ${resolvedContractId}`);

  // 2. Load agency org
  const [org] = await db.select().from(organisations).limit(1);

  // 3. Load issuing staff
  const [staff] = await db
    .select({ fullName: users.fullName, email: users.email })
    .from(users)
    .where(eq(users.id, issuedBy))
    .limit(1);

  // 4. Try to find school name from contract_products → accounts
  let schoolName: string | null = null;
  try {
    const schoolRow = await db.execute(sql`
      SELECT DISTINCT a.name
      FROM accounts a
      JOIN products p ON p.provider_id = a.id
      JOIN contract_products cp ON cp.product_id = p.id
      WHERE cp.contract_id = ${resolvedContractId}
      LIMIT 1
    `);
    schoolName = (schoolRow.rows[0] as any)?.name ?? null;
  } catch { /* non-critical */ }

  // 5. Fetch payment history + outstanding
  const paidLines       = await getPaymentHistory(resolvedContractId);
  const outstandingLines = await getOutstandingBalance(resolvedContractId);

  // 6. Compute totals
  const totalPaid = paidLines.reduce((s, l) => s + parseFloat(l.amount ?? "0"), 0);
  const totalOut  = outstandingLines.reduce((s, l) => s + parseFloat(l.arAmount ?? "0"), 0);
  const totalCtr  = parseFloat(ctr.totalArAmount ?? "0");

  // 7. Build statement ref + date
  const today        = new Date().toISOString().slice(0, 10);
  const statementRef = await buildStatementRef();

  // 8. Build PDF data
  const pdfData: StatementPdfData = {
    statementRef,
    statementDate:       today,
    statementScope:      scope,
    issueReason:         issueReason ?? null,
    issuedByName:        staff?.fullName ?? "Staff",
    agencyName:          org?.name ?? "Edubee Camp",
    agencyAbn:           org?.abn ?? null,
    agencyAbnName:       org?.abnName ?? null,
    agencyAddress:       org?.address ?? null,
    agencyPhone:         org?.phone ?? null,
    agencyEmail:         org?.email ?? null,
    studentName:         ctr.studentName ?? "Student",
    studentEmail:        ctr.clientEmail ?? null,
    studentPhone:        null,
    contractNumber:      ctr.contractNumber ?? null,
    schoolName,
    programName:         ctr.packageGroupName ?? null,
    courseStartDate:     ctr.courseStartDate ?? null,
    courseEndDate:       ctr.courseEndDate ?? null,
    totalContractAmount: String(totalCtr.toFixed(2)),
    totalPaid:           String(totalPaid.toFixed(2)),
    totalOutstanding:    String(totalOut.toFixed(2)),
    paidLines,
    outstandingLines,
  };

  // 9. Render PDF
  const pdfBuffer  = await renderStatementPdf(pdfData);
  const storedPath = pdfPath(statementRef);
  fs.writeFileSync(storedPath, pdfBuffer);

  // 10. Insert DB record
  const [stmt] = await db
    .insert(paymentStatements)
    .values({
      statementRef,
      statementDate:       today,
      statementScope:      scope,
      contractId:          contractId ?? null,
      studentAccountId:    studentAccountId ?? null,
      totalPaidAmount:     String(totalPaid.toFixed(2)),
      totalOutstanding:    String(totalOut.toFixed(2)),
      totalContractAmount: String(totalCtr.toFixed(2)),
      lineItemCount:       paidLines.length,
      pdfUrl:              storedPath,
      issuedBy,
      issueReason:         issueReason ?? null,
      notes:               notes ?? null,
      status:              "issued",
    })
    .returning();

  // 11. Optional email delivery
  if (sendEmail && emailTo) {
    sendStatementEmail(stmt.id, emailTo, pdfBuffer, statementRef, ctr.studentName ?? "Student")
      .catch(err => console.error("[STATEMENT EMAIL FAILED]", String(err)));
  }

  return { id: stmt.id, statementRef, pdfPath: storedPath, pdfBuffer };
}

// ── Email sender ──────────────────────────────────────────────────────────
export async function sendStatementEmail(
  statementId: string,
  toEmail:     string,
  pdfBuffer:   Buffer | null,
  ref:         string,
  studentName: string
): Promise<void> {
  try {
    if (!pdfBuffer) {
      const [stmt] = await db.select({ pdfUrl: paymentStatements.pdfUrl })
        .from(paymentStatements).where(eq(paymentStatements.id, statementId)).limit(1);
      if (stmt?.pdfUrl && fs.existsSync(stmt.pdfUrl)) {
        pdfBuffer = fs.readFileSync(stmt.pdfUrl);
      }
    }
    await sendMail({
      to: toEmail,
      subject: `Payment History Statement ${ref} — Edubee Camp`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;color:#1C1917;">
          <div style="background:#F5821F;padding:24px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:22px;">Edubee Camp</h1>
            <p style="color:rgba(255,255,255,.9);margin:4px 0 0;font-size:13px;">Educational Camp Marketplace</p>
          </div>
          <div style="padding:28px 32px;">
            <h2 style="margin:0 0 8px;color:#1C1917;">Payment History Statement</h2>
            <p style="color:#57534E;margin:0 0 20px;">Dear ${studentName},</p>
            <p style="margin:0 0 20px;">Please find attached your Payment History Statement (<strong>${ref}</strong>).<br>
            This is an official document summarising all payments made to Edubee Camp.</p>
          </div>
          <div style="background:#F4F3F1;padding:16px 32px;text-align:center;">
            <p style="color:#A8A29E;font-size:12px;margin:0;">Edubee.Co · info@edubee.co</p>
          </div>
        </div>
      `,
      attachments: pdfBuffer ? [{
        filename: `${ref}.pdf`,
        content:  pdfBuffer,
        contentType: "application/pdf",
      }] : [],
    } as any);

    await db.update(paymentStatements)
      .set({ sentAt: new Date(), sentToEmail: toEmail, status: "sent" })
      .where(eq(paymentStatements.id, statementId));
  } catch (err) {
    console.error("[STATEMENT EMAIL FAILED — non-blocking]", String(err));
  }
}
