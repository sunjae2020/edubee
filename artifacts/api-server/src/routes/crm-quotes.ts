import { Router } from "express";
import { db } from "@workspace/db";
import {
  quotes, quote_products, contracts, contractProducts,
  pickupMgt, settlementMgt,
  accommodationMgt, internshipMgt, guardianMgt, studyAbroadMgt,
  tourMgt, accounts,
  visaServicesMgt, campTourMgt, otherServicesMgt,
} from "@workspace/db/schema";
import { eq, and, count, sql, SQL } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { sendMail } from "../mailer.js";
const router = Router();

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
const ADMIN_ROLES = ["super_admin", "admin", "camp_coordinator"];

function genQuoteRef() {
  return "QTE-" + Date.now().toString(36).toUpperCase().padStart(8, "0");
}

function genContractNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `CT-${date}-${rand}`;
}

// ─── GET /api/crm/quotes ────────────────────────────────────────────
router.get("/crm/quotes", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { quoteStatus, isTemplate, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset   = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (quoteStatus)               conditions.push(eq(quotes.quoteStatus, quoteStatus));
    if (isTemplate === "true")     conditions.push(eq(quotes.isTemplate, true));
    else if (isTemplate === "false") conditions.push(eq(quotes.isTemplate, false));

    const where = conditions.length ? and(...conditions) : undefined;
    const [totalResult] = await db.select({ count: count() }).from(quotes).where(where);
    const data = await db.select().from(quotes).where(where)
      .limit(limitNum).offset(offset)
      .orderBy(quotes.createdOn);

    const enriched = await Promise.all(data.map(async q => {
      const products = await db.select().from(quote_products).where(eq(quote_products.quoteId, q.id));
      const total = products.reduce((sum, p) => sum + Number(p.total ?? 0), 0);
      return { ...q, products, total };
    }));

    return res.json({
      data: enriched,
      meta: { total: Number(totalResult.count), page: pageNum, limit: limitNum,
              totalPages: Math.ceil(Number(totalResult.count) / limitNum) },
    });
  } catch (err) {
    console.error("[GET /api/crm/quotes]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/crm/quotes/templates ─────────────────────────────────
router.get("/crm/quotes/templates", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const data = await db.select().from(quotes).where(eq(quotes.isTemplate, true));
    return res.json({ data });
  } catch (err) {
    console.error("[GET /api/crm/quotes/templates]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/crm/quotes/:id ────────────────────────────────────────
router.get("/crm/quotes/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, req.params.id));
    if (!quote) return res.status(404).json({ error: "Quote not found" });
    const products = await db.select().from(quote_products)
      .where(eq(quote_products.quoteId, req.params.id))
      .orderBy(quote_products.sortOrder);
    const total = products.reduce((sum, p) => sum + Number(p.total ?? 0), 0);
    return res.json({ ...quote, products, total });
  } catch (err) {
    console.error("[GET /api/crm/quotes/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/crm/quotes ───────────────────────────────────────────
router.post("/crm/quotes", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { leadId, contactId, accountName, customerName, studentAccountId,
            quoteStatus, expiryDate, isTemplate, notes,
            products: lineItems = [] } = req.body;
    const user = (req as any).user;
    const quoteRefNumber = genQuoteRef();

    const [created] = await db.insert(quotes).values({
      quoteRefNumber, leadId, contactId, accountName,
      customerName:      customerName ?? null,
      studentAccountId:  studentAccountId ?? null,
      quoteStatus: quoteStatus ?? "Draft",
      expiryDate: expiryDate ?? null,
      isTemplate: isTemplate ?? false,
      notes,
      createdBy: user?.id ?? null,
    }).returning();

    if (Array.isArray(lineItems) && lineItems.length > 0) {
      await db.insert(quote_products).values(
        lineItems.map((item: any, idx: number) => ({
          quoteId:           created.id,
          productName:       item.productName ?? "Item",
          description:       item.description ?? null,
          qty:               item.qty ?? 1,
          unitPrice:         item.unitPrice ?? "0",
          gstRate:           item.gstRate ?? "0",
          total:             String((Number(item.qty ?? 1) * Number(item.unitPrice ?? 0)) * (1 + Number(item.gstRate ?? 0) / 100)),
          serviceModuleType: item.serviceModuleType ?? null,
          sortOrder:         idx,
        }))
      );
    }

    const products = await db.select().from(quote_products).where(eq(quote_products.quoteId, created.id));
    return res.status(201).json({ ...created, products });
  } catch (err) {
    console.error("[POST /api/crm/quotes]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PUT /api/crm/quotes/:id ────────────────────────────────────────
router.put("/crm/quotes/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [existing] = await db.select().from(quotes).where(eq(quotes.id, req.params.id));
    if (!existing) return res.status(404).json({ error: "Quote not found" });

    const { leadId, contactId, accountName, customerName, studentAccountId,
            quoteStatus, expiryDate, isTemplate, notes,
            products: lineItems } = req.body;

    const [updated] = await db.update(quotes)
      .set({ leadId, contactId, accountName,
             customerName:     customerName ?? existing.customerName,
             studentAccountId: studentAccountId ?? existing.studentAccountId,
             quoteStatus, expiryDate, isTemplate, notes,
             modifiedOn: new Date() })
      .where(eq(quotes.id, req.params.id))
      .returning();

    if (Array.isArray(lineItems)) {
      await db.delete(quote_products).where(eq(quote_products.quoteId, req.params.id));
      if (lineItems.length > 0) {
        await db.insert(quote_products).values(
          lineItems.map((item: any, idx: number) => ({
            quoteId:           req.params.id,
            productName:       item.productName ?? "Item",
            description:       item.description ?? null,
            qty:               item.qty ?? 1,
            unitPrice:         item.unitPrice ?? "0",
            gstRate:           item.gstRate ?? "0",
            total:             String((Number(item.qty ?? 1) * Number(item.unitPrice ?? 0)) * (1 + Number(item.gstRate ?? 0) / 100)),
            serviceModuleType: item.serviceModuleType ?? null,
            sortOrder:         idx,
          }))
        );
      }
    }

    const products = await db.select().from(quote_products).where(eq(quote_products.quoteId, req.params.id));
    return res.json({ ...updated, products });
  } catch (err) {
    console.error("[PUT /api/crm/quotes/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/crm/quotes/:id/convert-to-contract ──────────────────
router.post("/crm/quotes/:id/convert-to-contract", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, req.params.id));
    if (!quote) return res.status(404).json({ error: "Quote not found" });

    // Fetch quote products with resolved service_module_type:
    // priority: qp.service_module_type → p.service_module_type → pt.service_module_type → 'other'
    const rawProducts = await db.execute(sql`
      SELECT
        qp.*,
        COALESCE(
          NULLIF(qp.service_module_type, ''),
          NULLIF(p.service_module_type, ''),
          NULLIF(pt.service_module_type, ''),
          'other'
        ) AS resolved_smt
      FROM quote_products qp
      LEFT JOIN products     p  ON p.id  = qp.product_id
      LEFT JOIN product_types pt ON pt.id = p.product_type_id
      WHERE qp.quote_id = ${req.params.id}::uuid
        AND (qp.status IS NULL OR qp.status != 'Inactive')
    `);
    const products: any[] = (rawProducts.rows ?? (rawProducts as any[]));

    const contractNumber = genContractNumber();

    const totalAmount = products.reduce((sum: number, p: any) => sum + parseFloat(p.total ?? p.price ?? "0"), 0);

    const result = await db.transaction(async (tx) => {
      // 1. Create contract — copy all transferable quote fields
      const [newContract] = await tx.insert(contracts).values({
        contractNumber,
        status: "draft",
        studentName:  quote.customerName ?? quote.accountName ?? null,
        clientEmail:  null,
        notes:        quote.notes ?? null,
        totalAmount:  totalAmount > 0 ? String(totalAmount) : null,
        totalArAmount: totalAmount > 0 ? String(totalAmount) : null,
      }).returning();

      const contractId = newContract.id;

      // 1b. Set quote_id and account_id (not in Drizzle schema → raw SQL)
      await tx.execute(sql`
        UPDATE contracts
        SET quote_id   = ${req.params.id}::uuid,
            account_id = ${quote.studentAccountId ?? null}
        WHERE id = ${contractId}::uuid
      `);

      // Resolve client email and fallback student_name from account
      if (quote.studentAccountId) {
        await tx.execute(sql`
          UPDATE contracts
          SET client_email  = COALESCE(client_email,  (SELECT email FROM accounts WHERE id = ${quote.studentAccountId}::uuid LIMIT 1)),
              student_name  = COALESCE(student_name,  (SELECT name  FROM accounts WHERE id = ${quote.studentAccountId}::uuid LIMIT 1))
          WHERE id = ${contractId}::uuid
        `);
      }

      // 2. Copy quote_products → contract_products (including ar_due_date and ar_amount)
      if (products.length > 0) {
        await tx.insert(contractProducts).values(
          products.map((p: any, i: number) => {
            const unitAmt = parseFloat(String(p.price ?? p.unit_price ?? "0"));
            const qty     = p.quantity ?? p.qty ?? 1;
            const arAmt   = unitAmt * qty;
            const rawDue  = p.due_date ?? p.dueDate ?? null;
            const dueDateStr = rawDue
              ? new Date(rawDue).toISOString().split("T")[0]
              : null;
            return {
              contractId,
              productId:         p.product_id ?? p.productId ?? null,
              name:              p.name ?? p.product_name ?? null,
              quantity:          qty,
              unitPrice:         String(unitAmt),
              totalPrice:        String(arAmt),
              arAmount:          arAmt > 0 ? String(arAmt) : null,
              arDueDate:         dueDateStr,
              isInitialPayment:  p.is_initial_payment ?? p.isInitialPayment ?? false,
              serviceModuleType: p.resolved_smt ?? null,
              sortIndex:         p.sort_index ?? p.sort_order ?? i,
            };
          })
        );
      }

      // 3. Activate service modules (use resolved_smt from the JOIN query)
      const moduleTypes = [...new Set(products.map((p: any) => p.resolved_smt).filter(Boolean))] as string[];
      const activatedModules: string[] = [];

      for (const mod of moduleTypes) {
        switch (mod) {
          case "study_abroad":
            await tx.insert(studyAbroadMgt).values({ contractId, visaGranted: false, orientationCompleted: false, status: "pending" });
            activatedModules.push("study_abroad");
            break;
          case "pickup":
            await tx.insert(pickupMgt).values({ contractId });
            activatedModules.push("pickup");
            break;
          case "accommodation":
            await tx.insert(accommodationMgt).values({ contractId });
            activatedModules.push("accommodation");
            break;
          case "internship":
            await tx.insert(internshipMgt).values({ contractId, resumePrepared: false, coverLetterPrepared: false });
            activatedModules.push("internship");
            break;
          case "settlement":
            await tx.insert(settlementMgt).values({ contractId });
            activatedModules.push("settlement");
            break;
          case "guardian":
            await tx.insert(guardianMgt).values({ contractId, officialGuardianRegistered: false, status: "pending" });
            activatedModules.push("guardian");
            break;
          case "tour":
            await tx.insert(tourMgt).values({ contractId });
            activatedModules.push("tour");
            break;
          case "camp":
            await tx.insert(campTourMgt).values({ contractId });
            activatedModules.push("camp");
            break;
          case "visa":
            await tx.insert(visaServicesMgt).values({ contractId });
            activatedModules.push("visa");
            break;
          case "health_exam":
          case "insurance":
          case "migration":
          case "other":
            await tx.insert(otherServicesMgt).values({ contractId, serviceType: mod });
            activatedModules.push(mod);
            break;
        }
      }

      // 4. Update contract service_modules_activated
      await tx.update(contracts)
        .set({ serviceModulesActivated: activatedModules })
        .where(eq(contracts.id, contractId));

      // 5. Mark quote as Accepted
      await tx.update(quotes)
        .set({ quoteStatus: "Accepted", modifiedOn: new Date() })
        .where(eq(quotes.id, req.params.id));

      return { contractId, contractNumber, activatedModules };
    });

    return res.status(201).json(result);
  } catch (err) {
    console.error("[POST /api/crm/quotes/:id/convert-to-contract]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/crm/quotes/:id/pdf ────────────────────────────────────
router.get("/crm/quotes/:id/pdf", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, req.params.id));
    if (!quote) return res.status(404).json({ error: "Quote not found" });
    const products = await db.select().from(quote_products)
      .where(eq(quote_products.quoteId, req.params.id)).orderBy(quote_products.sortOrder);
    // Return structured data; PDF rendering is client-side
    return res.json({ quote, products });
  } catch (err) {
    console.error("[GET /api/crm/quotes/:id/pdf]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/crm/quotes/:id/send-email ────────────────────────────
router.post("/crm/quotes/:id/send-email", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    if (!to) return res.status(400).json({ error: "Recipient email is required" });

    const [quote] = await db.select().from(quotes).where(eq(quotes.id, req.params.id));
    if (!quote) return res.status(404).json({ error: "Quote not found" });

    const products = await db
      .select()
      .from(quote_products)
      .where(and(eq(quote_products.quoteId, req.params.id), eq(quote_products.status, "Active")))
      .orderBy(quote_products.sortIndex);

    // Fetch client account name if available
    let clientName = quote.customerName ?? "";
    if (quote.studentAccountId) {
      const [acc] = await db.select({ name: accounts.name }).from(accounts).where(eq(accounts.id, quote.studentAccountId));
      if (acc) clientName = acc.name;
    }

    const totalAmount = products.reduce((s, p) => s + Number(p.price ?? 0) * (p.quantity ?? 1), 0);

    const rows = products.map(p => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0ece8;font-size:13px;">${p.name || p.productName || "Item"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0ece8;text-align:center;font-size:13px;">${p.quantity ?? 1}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0ece8;text-align:right;font-size:13px;">$${Number(p.price ?? 0).toLocaleString("en-AU", { minimumFractionDigits: 2 })}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0ece8;text-align:right;font-size:13px;">$${(Number(p.price ?? 0) * (p.quantity ?? 1)).toLocaleString("en-AU", { minimumFractionDigits: 2 })}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#333;max-width:640px;margin:0 auto;padding:20px;">
      <div style="background:#F5821F;color:white;padding:24px 28px;border-radius:8px 8px 0 0;">
        <div style="font-size:11px;opacity:.75;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px;">Edubee Camp</div>
        <h1 style="margin:0;font-size:22px;font-weight:700;">Quote ${quote.quoteRefNumber ?? ""}</h1>
        ${clientName ? `<p style="margin:6px 0 0;opacity:.85;font-size:13px;">Prepared for: ${clientName}</p>` : ""}
      </div>
      <div style="border:1px solid #e5e0db;border-top:none;padding:24px 28px;border-radius:0 0 8px 8px;background:#fff;">
        ${message ? `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;">${message.replace(/\n/g, "<br>")}</p><hr style="border:none;border-top:1px solid #f0ece8;margin:0 0 20px;">` : ""}
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#fdf8f4;">
              <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e0db;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Item</th>
              <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e0db;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Qty</th>
              <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e0db;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Amount</th>
              <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e0db;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Subtotal</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding:14px 12px;text-align:right;font-weight:700;font-size:14px;">Total</td>
              <td style="padding:14px 12px;text-align:right;font-weight:700;font-size:18px;color:#F5821F;">$${totalAmount.toLocaleString("en-AU", { minimumFractionDigits: 2 })}</td>
            </tr>
          </tfoot>
        </table>
        ${quote.expiryDate ? `<p style="margin:16px 0 0;font-size:12px;color:#aaa;">This quote is valid until ${quote.expiryDate}.</p>` : ""}
      </div>
    </body></html>`;

    const result = await sendMail({ to, subject: subject || `Quote ${quote.quoteRefNumber ?? ""}`, html });
    return res.json({ success: true, mocked: !!(result as any).mocked });
  } catch (err) {
    console.error("[POST /api/crm/quotes/:id/send-email]", err);
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
