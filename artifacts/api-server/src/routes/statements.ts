import { Router } from "express";
import { db } from "@workspace/db";
import { paymentStatements, contracts, users } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  generateStatement,
  sendStatementEmail,
} from "../services/paymentStatementService.js";
import fs from "fs";

const router = Router();
const STAFF = ["super_admin", "admin", "camp_coordinator"] as const;
const ADMIN = ["super_admin", "admin"] as const;

// ── POST /api/statements/generate ─────────────────────────────────────────
router.post(
  "/statements/generate",
  authenticate,
  requireRole(...STAFF),
  async (req, res) => {
    try {
      const {
        scope = "contract",
        contractId,
        studentAccountId,
        issueReason,
        notes,
        sendEmail,
        emailTo,
      } = req.body as Record<string, any>;

      if (!contractId && scope === "contract") {
        return res.status(400).json({ error: "contractId is required for contract scope" });
      }

      const issuedBy = (req as any).user?.id;
      if (!issuedBy) return res.status(401).json({ error: "Unauthorized" });

      const result = await generateStatement({
        scope,
        contractId,
        studentAccountId,
        issueReason,
        notes,
        sendEmail: !!sendEmail,
        emailTo:   emailTo ?? undefined,
        issuedBy,
      });

      return res.status(201).json({
        id:           result.id,
        statementRef: result.statementRef,
        pdfUrl:       `/api/statements/${result.id}/pdf`,
      });
    } catch (err) {
      console.error("[POST /api/statements/generate]", err);
      return res.status(500).json({ error: String(err) });
    }
  }
);

// ── GET /api/statements/by-contract/:contractId ────────────────────────────
router.get(
  "/statements/by-contract/:contractId",
  authenticate,
  requireRole(...STAFF),
  async (req, res) => {
    try {
      const rows = await db
        .select({
          id:           paymentStatements.id,
          statementRef: paymentStatements.statementRef,
          statementDate:paymentStatements.statementDate,
          statementScope:paymentStatements.statementScope,
          totalPaidAmount:     paymentStatements.totalPaidAmount,
          totalOutstanding:    paymentStatements.totalOutstanding,
          totalContractAmount: paymentStatements.totalContractAmount,
          lineItemCount:paymentStatements.lineItemCount,
          issueReason:  paymentStatements.issueReason,
          sentToEmail:  paymentStatements.sentToEmail,
          sentAt:       paymentStatements.sentAt,
          status:       paymentStatements.status,
          createdOn:    paymentStatements.createdOn,
          issuedByName: users.fullName,
        })
        .from(paymentStatements)
        .leftJoin(users, eq(users.id, paymentStatements.issuedBy))
        .where(eq(paymentStatements.contractId, req.params.contractId))
        .orderBy(desc(paymentStatements.createdOn));
      return res.json({ data: rows });
    } catch (err) {
      console.error("[GET /api/statements/by-contract]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── GET /api/statements/:id/pdf ────────────────────────────────────────────
router.get(
  "/statements/:id/pdf",
  authenticate,
  requireRole(...STAFF),
  async (req, res) => {
    try {
      const [stmt] = await db
        .select({ statementRef: paymentStatements.statementRef, pdfUrl: paymentStatements.pdfUrl })
        .from(paymentStatements)
        .where(eq(paymentStatements.id, req.params.id))
        .limit(1);

      if (!stmt) return res.status(404).json({ error: "Statement not found" });
      if (!stmt.pdfUrl || !fs.existsSync(stmt.pdfUrl)) {
        return res.status(404).json({ error: "PDF not found" });
      }

      const buffer = fs.readFileSync(stmt.pdfUrl);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${stmt.statementRef}.pdf"`);
      return res.send(buffer);
    } catch (err) {
      console.error("[GET /api/statements/:id/pdf]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── POST /api/statements/:id/send ─────────────────────────────────────────
router.post(
  "/statements/:id/send",
  authenticate,
  requireRole(...ADMIN),
  async (req, res) => {
    try {
      const [stmt] = await db
        .select({
          id:          paymentStatements.id,
          statementRef:paymentStatements.statementRef,
          contractId:  paymentStatements.contractId,
          sentToEmail: paymentStatements.sentToEmail,
        })
        .from(paymentStatements)
        .where(eq(paymentStatements.id, req.params.id))
        .limit(1);

      if (!stmt) return res.status(404).json({ error: "Statement not found" });

      // Resolve email: body override → stored email → contract client email
      let toEmail: string | null = req.body.email ?? stmt.sentToEmail ?? null;
      if (!toEmail && stmt.contractId) {
        const [ctr] = await db
          .select({ clientEmail: contracts.clientEmail, studentName: contracts.studentName })
          .from(contracts)
          .where(eq(contracts.id, stmt.contractId))
          .limit(1);
        toEmail = ctr?.clientEmail ?? null;
      }

      if (!toEmail) return res.status(400).json({ error: "No email address available" });

      await sendStatementEmail(stmt.id, toEmail, null, stmt.statementRef, "Student");
      return res.json({ success: true, sentTo: toEmail });
    } catch (err) {
      console.error("[POST /api/statements/:id/send]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
