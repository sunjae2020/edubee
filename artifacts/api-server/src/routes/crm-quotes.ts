import { Router } from "express";
import { db } from "@workspace/db";
import {
  quotes, quote_products, contracts, contractProducts,
  pickupMgt, settlementMgt,
  accommodationMgt, internshipMgt, guardianMgt, studyAbroadMgt,
} from "@workspace/db/schema";
import { eq, and, count, SQL } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
const router = Router();

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
const ADMIN_ROLES = ["super_admin", "admin", "camp_coordinator"];

function genQuoteRef() {
  return "QTE-" + Date.now().toString(36).toUpperCase().padStart(8, "0");
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
    const { leadId, contactId, accountName, quoteStatus, expiryDate, isTemplate, notes,
            products: lineItems = [] } = req.body;
    const user = (req as any).user;
    const quoteRefNumber = genQuoteRef();

    const [created] = await db.insert(quotes).values({
      quoteRefNumber, leadId, contactId, accountName,
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

    const { leadId, contactId, accountName, quoteStatus, expiryDate, isTemplate, notes,
            products: lineItems } = req.body;

    const [updated] = await db.update(quotes)
      .set({ leadId, contactId, accountName, quoteStatus, expiryDate, isTemplate, notes,
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

    const products = await db.select().from(quote_products)
      .where(eq(quote_products.quoteId, req.params.id));

    const today   = fmtDate(new Date());
    const accName = quote.accountName ?? "Client";
    const contractNumber = `CT-${accName}-${today}`;

    const result = await db.transaction(async (tx) => {
      // 1. Create contract
      const [newContract] = await tx.insert(contracts).values({
        contractNumber,
        status: "draft",
        studentName: quote.accountName ?? null,
      }).returning();

      const contractId = newContract.id;

      // 2. Copy quote_products → contract_products
      if (products.length > 0) {
        await tx.insert(contractProducts).values(
          products.map(p => ({
            contractId,
            quantity:          p.qty,
            unitPrice:         p.unitPrice,
            totalPrice:        p.total,
            serviceModuleType: p.serviceModuleType ?? null,
          }))
        );
      }

      // 3. Activate service modules
      const moduleTypes = [...new Set(products.map(p => p.serviceModuleType).filter(Boolean))] as string[];
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

export default router;
