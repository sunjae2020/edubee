import { Router } from "express";
import { db, staticDb } from "@workspace/db";
import { contracts, contractSigningRequests, organisations } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { randomBytes } from "crypto";
import { generateLoaPdf } from "../services/loaPdfService.js";
import { getResendConfig } from "../mailer.js";
import { Resend } from "resend";
import * as fs from "fs";
import * as path from "path";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin", "camp_coordinator"];

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

// ── POST /api/contract-signing/:contractId/request ────────────────────────────
// Admin: create a new signing request and send email(s) to signer(s)
router.post("/:contractId/request", authenticate, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const { contractId } = req.params;
    const { signers, expiryDays = 14, contractData } = req.body as {
      signers: Array<{ role: string; name: string; email: string; required: boolean }>;
      expiryDays?: number;
      contractData?: Record<string, unknown>;
    };

    if (!signers || signers.length === 0) {
      return res.status(400).json({ error: "At least one signer is required" });
    }

    const [contract] = await db.select().from(contracts).where(eq(contracts.id, contractId)).limit(1);
    if (!contract) return res.status(404).json({ error: "Contract not found" });

    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const snapshot = contractData ?? {
      contractNumber: contract.contractNumber,
      studentName:    contract.studentName,
      clientEmail:    contract.clientEmail,
      packageGroupName: contract.packageGroupName,
      packageName:    contract.packageName,
      totalAmount:    contract.totalAmount,
      currency:       contract.currency,
      startDate:      contract.startDate,
      endDate:        contract.endDate,
      signedAt:       contract.signedAt,
    };

    const [req_] = await staticDb.insert(contractSigningRequests).values({
      contractId,
      organisationId: contract.organisationId ?? undefined,
      token,
      status:       "pending",
      expiresAt,
      signers,
      contractData: snapshot,
      signatures:   [],
      requestedBy:  (req as any).user?.id,
    }).returning();

    // Determine signing page base URL
    const appBase = process.env.CAMP_BASE_URL ?? process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}/camp`
      : "https://edubee.co/camp";
    const signingUrl = `${appBase}/sign/${token}`;

    // Send email(s) via Resend
    try {
      let apiKey    = process.env.RESEND_API_KEY ?? "";
      let fromEmail = process.env.RESEND_FROM ?? "noreply@edubee.co";
      try {
        const cfg = await getResendConfig();
        if (cfg["resend.apiKey"]) apiKey    = cfg["resend.apiKey"];
        if (cfg["resend.from"])   fromEmail = cfg["resend.from"];
      } catch { /* ignore */ }

      if (apiKey) {
        const resend = new Resend(apiKey);
        const uniqueEmails = [...new Set(signers.map(s => s.email).filter(Boolean))];
        for (const email of uniqueEmails) {
          await resend.emails.send({
            from: `Edubee <${fromEmail}>`,
            to:   email,
            subject: `Action Required: Please Sign — ${contract.contractNumber ?? "Contract"}`,
            html: `
              <div style="font-family:sans-serif;max-width:560px;margin:auto">
                <h2 style="color:#1C1917">Electronic Signature Request</h2>
                <p>Dear ${signers.find(s => s.email === email)?.name ?? "Applicant"},</p>
                <p>You have been asked to electronically sign the following agreement:</p>
                <p style="background:#F4F3F1;padding:12px 16px;border-radius:8px;font-weight:600">
                  ${contract.packageGroupName ?? contract.contractNumber ?? "Letter of Offer and Acceptance"}
                </p>
                <p>Please click the button below to review and sign:</p>
                <a href="${signingUrl}" style="display:inline-block;background:#F5821F;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">
                  Review & Sign
                </a>
                <p style="color:#888;font-size:12px;margin-top:24px">
                  This link expires on ${expiresAt.toLocaleDateString("en-AU", { year:"numeric",month:"long",day:"numeric" })}.<br>
                  If you have questions, contact us at info@edubee.co.au
                </p>
              </div>
            `,
          });
        }
      }
    } catch (emailErr) {
      console.warn("[ContractSign] Email send failed:", emailErr);
    }

    res.json({ id: req_.id, token, signingUrl, expiresAt });
  } catch (err) {
    console.error("[ContractSign] create request error:", err);
    res.status(500).json({ error: "Failed to create signing request" });
  }
});

// ── GET /api/contract-signing/status/:contractId ──────────────────────────────
// Admin: get latest signing request status for a contract
router.get("/status/:contractId", authenticate, async (req, res) => {
  try {
    const rows = await staticDb.select().from(contractSigningRequests)
      .where(eq(contractSigningRequests.contractId, req.params.contractId))
      .orderBy(contractSigningRequests.createdAt);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch signing status" });
  }
});

// ── GET /api/contract-signing/public/:token ────────────────────────────────────
// PUBLIC (no auth): get signing request data for the signing page
router.get("/public/:token", async (req, res) => {
  try {
    const [row] = await staticDb.select().from(contractSigningRequests)
      .where(eq(contractSigningRequests.token, req.params.token)).limit(1);
    if (!row) return res.status(404).json({ error: "Signing request not found" });

    if (row.status === "signed")    return res.status(410).json({ error: "already_signed",  message: "This document has already been signed." });
    if (row.status === "expired")   return res.status(410).json({ error: "expired",          message: "This signing link has expired." });
    if (row.status === "cancelled") return res.status(410).json({ error: "cancelled",        message: "This signing request has been cancelled." });
    if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
      await staticDb.update(contractSigningRequests).set({ status: "expired" }).where(eq(contractSigningRequests.id, row.id));
      return res.status(410).json({ error: "expired", message: "This signing link has expired." });
    }

    res.json({
      id:           row.id,
      status:       row.status,
      signers:      row.signers,
      contractData: row.contractData,
      expiresAt:    row.expiresAt,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch signing data" });
  }
});

// ── POST /api/contract-signing/public/:token/sign ─────────────────────────────
// PUBLIC (no auth): submit signatures
router.post("/public/:token/sign", async (req, res) => {
  try {
    const [row] = await staticDb.select().from(contractSigningRequests)
      .where(eq(contractSigningRequests.token, req.params.token)).limit(1);
    if (!row) return res.status(404).json({ error: "Signing request not found" });
    if (row.status !== "pending") return res.status(410).json({ error: "This request is no longer active." });
    if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
      await staticDb.update(contractSigningRequests).set({ status: "expired" }).where(eq(contractSigningRequests.id, row.id));
      return res.status(410).json({ error: "Signing link has expired." });
    }

    const { signatures } = req.body as { signatures: Array<{ role: string; name: string; signatureImage: string; signedAt: string }> };
    if (!signatures || signatures.length === 0) {
      return res.status(400).json({ error: "No signatures provided" });
    }

    const requiredSigners = ((row.signers as any[]) ?? []).filter(s => s.required);
    for (const req_ of requiredSigners) {
      const found = signatures.find(s => s.role === req_.role);
      if (!found || !found.signatureImage) {
        return res.status(400).json({ error: `Signature required for: ${req_.name}` });
      }
    }

    // Generate PDF
    const pdfBuffer = await generateLoaPdf({
      contractData: row.contractData as any,
      signers:      row.signers      as any,
      signatures,
    });

    const uploadsDir = path.join(process.cwd(), "uploads", "signed-contracts");
    fs.mkdirSync(uploadsDir, { recursive: true });
    const pdfFilename = `loa_${row.id}_${Date.now()}.pdf`;
    const pdfPath = path.join(uploadsDir, pdfFilename);
    fs.writeFileSync(pdfPath, pdfBuffer);

    const now = new Date();
    await staticDb.update(contractSigningRequests).set({
      status:         "signed",
      signatures,
      pdfPath,
      pdfGeneratedAt: now,
      signedAt:       now,
      updatedAt:      now,
    }).where(eq(contractSigningRequests.id, row.id));

    // Update contract signedAt
    if (row.contractId) {
      await db.update(contracts).set({ signedAt: now.toISOString().split("T")[0] })
        .where(eq(contracts.id, row.contractId));
    }

    res.json({ success: true, message: "Document signed successfully." });
  } catch (err) {
    console.error("[ContractSign] sign error:", err);
    res.status(500).json({ error: "Failed to process signatures" });
  }
});

// ── GET /api/contract-signing/pdf/:id ─────────────────────────────────────────
// Admin: download signed PDF
router.get("/pdf/:id", authenticate, async (req, res) => {
  try {
    const [row] = await staticDb.select().from(contractSigningRequests)
      .where(eq(contractSigningRequests.id, req.params.id)).limit(1);
    if (!row || !row.pdfPath || !fs.existsSync(row.pdfPath)) {
      return res.status(404).json({ error: "PDF not found" });
    }
    const buffer = fs.readFileSync(row.pdfPath);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="LOA_${row.contractId?.slice(0, 8)}_signed.pdf"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: "Failed to download PDF" });
  }
});

// ── DELETE /api/contract-signing/:id/cancel ───────────────────────────────────
router.delete("/:id/cancel", authenticate, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    await staticDb.update(contractSigningRequests)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(contractSigningRequests.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to cancel request" });
  }
});

export default router;
