import { Router } from "express";
import { db, staticDb } from "@workspace/db";
import {
  accounts,
  contacts,
  quotes,
  quote_products,
  agentCommissionConfigs,
  taxInvoices,
  contracts,
  contractProducts,
  leads,
  documents,
  communityPosts,
  communityComments,
  campPhotoFolders,
  campPhotos,
  applications,
  organisations,
} from "@workspace/db/schema";
import { eq, and, inArray, desc, sql, count, sum, isNull, asc } from "drizzle-orm";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authenticatePortal } from "../middleware/authenticatePortal.js";

const router = Router();

// ── GET /api/portal/me ─────────────────────────────────────────────────────
router.get("/portal/me", authenticatePortal, async (req, res) => {
  try {
    const [account] = await staticDb
      .select()
      .from(accounts)
      .where(eq(accounts.id, req.portalUser!.accountId))
      .limit(1);
    if (!account) return res.status(404).json({ error: "Account not found" });
    const { portalPasswordHash, portalTempPassword, ...safe } = account;
    return res.json({ data: safe });
  } catch (err) {
    console.error("[portal/me]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/portal/dashboard/summary ─────────────────────────────────────
router.get("/portal/dashboard/summary", authenticatePortal, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;

    // All quotes for this agent
    const agentQuotes = await db
      .select()
      .from(quotes)
      .where(eq(quotes.agentAccountId, accountId));

    // Unique student account IDs
    const studentIds = [
      ...new Set(
        agentQuotes.map((q) => q.studentAccountId).filter(Boolean) as string[]
      ),
    ];

    // Quote products for commission amounts
    const qIds = agentQuotes.map((q) => q.id);
    const products = qIds.length
      ? await db.select().from(quote_products).where(inArray(quote_products.quoteId, qIds))
      : [];

    const totalQuoteValue = products.reduce(
      (sum, p) => sum + Number(p.total ?? p.price ?? 0),
      0
    );

    const activeQuotes = agentQuotes.filter(
      (q) => !["Cancelled", "Rejected", "Expired"].includes(q.quoteStatus)
    );
    const acceptedQuotes = agentQuotes.filter((q) => q.quoteStatus === "Accepted");

    // Commission configs for this agent
    const commissionConfigs = await db
      .select()
      .from(agentCommissionConfigs)
      .where(eq(agentCommissionConfigs.partnerId, accountId));

    // Tax invoices (commissions payable)
    const taxInv = await db
      .select({
        id: taxInvoices.id,
        commissionAmount: taxInvoices.commissionAmount,
        status: taxInvoices.status,
      })
      .from(taxInvoices)
      .where(eq(taxInvoices.studentAccountId, accountId));
    const totalCommission = taxInv.reduce(
      (sum, t) => sum + Number(t.commissionAmount ?? 0),
      0
    );
    const pendingCommission = taxInv
      .filter((t) => t.status === "draft" || t.status === "sent")
      .reduce((sum, t) => sum + Number(t.commissionAmount ?? 0), 0);
    const paidCommission = taxInv
      .filter((t) => t.status === "paid")
      .reduce((sum, t) => sum + Number(t.commissionAmount ?? 0), 0);

    return res.json({
      data: {
        totalStudents: studentIds.length,
        totalQuotes: agentQuotes.length,
        activeQuotes: activeQuotes.length,
        acceptedQuotes: acceptedQuotes.length,
        totalQuoteValue,
        totalCommission,
        pendingCommission,
        paidCommission,
        commissionConfigCount: commissionConfigs.length,
      },
    });
  } catch (err) {
    console.error("[portal/dashboard/summary]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/portal/students ───────────────────────────────────────────────
// Returns student accounts linked via quotes where agentAccountId = me
router.get("/portal/students", authenticatePortal, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;

    // Get quotes where agent = me, that have a studentAccountId
    const agentQuotes = await db
      .select({
        studentAccountId: quotes.studentAccountId,
        quoteStatus: quotes.quoteStatus,
        quoteRefNumber: quotes.quoteRefNumber,
        createdOn: quotes.createdOn,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.agentAccountId, accountId),
          sql`${quotes.studentAccountId} IS NOT NULL`
        )
      );

    const studentIds = [
      ...new Set(agentQuotes.map((q) => q.studentAccountId!)),
    ];

    if (!studentIds.length) return res.json({ data: [] });

    const studentAccounts = await db
      .select({
        id: accounts.id,
        name: accounts.name,
        email: accounts.email,
        phoneNumber: accounts.phoneNumber,
        country: accounts.country,
        status: accounts.status,
        accountType: accounts.accountType,
        profileImageUrl: accounts.profileImageUrl,
        firstName: accounts.firstName,
        lastName: accounts.lastName,
        createdOn: accounts.createdOn,
      })
      .from(accounts)
      .where(inArray(accounts.id, studentIds));

    // Attach quote summary per student
    const result = studentAccounts.map((a) => {
      const qs = agentQuotes.filter((q) => q.studentAccountId === a.id);
      return {
        ...a,
        quoteCount: qs.length,
        latestQuoteStatus: qs[0]?.quoteStatus ?? null,
        latestQuoteRef: qs[0]?.quoteRefNumber ?? null,
      };
    });

    return res.json({ data: result });
  } catch (err) {
    console.error("[portal/students]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/portal/students/:id ──────────────────────────────────────────
router.get("/portal/students/:id", authenticatePortal, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;
    const studentId = req.params.id as string;

    // Verify this student is linked to the agent
    const [linked] = await db
      .select({ id: quotes.id })
      .from(quotes)
      .where(
        and(
          eq(quotes.agentAccountId, accountId),
          eq(quotes.studentAccountId, studentId)
        )
      )
      .limit(1);

    if (!linked) {
      return res.status(403).json({ error: "Forbidden", message: "Student not linked to your account" });
    }

    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, studentId))
      .limit(1);

    if (!account) return res.status(404).json({ error: "Student not found" });

    // Get all quotes for this student from this agent
    const studentQuotes = await db
      .select()
      .from(quotes)
      .where(
        and(
          eq(quotes.agentAccountId, accountId),
          eq(quotes.studentAccountId, studentId)
        )
      )
      .orderBy(desc(quotes.createdOn));

    const { portalPasswordHash, portalTempPassword, ...safe } = account;
    return res.json({ data: { account: safe, quotes: studentQuotes } });
  } catch (err) {
    console.error("[portal/students/:id]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/portal/leads — Agent's leads list ────────────────────────────
router.get("/portal/leads", authenticatePortal, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;
    const rows = await db
      .select({
        id:              leads.id,
        leadRefNumber:   leads.leadRefNumber,
        status:          leads.status,
        fullName:        leads.fullName,
        firstName:       leads.firstName,
        lastName:        leads.lastName,
        email:           leads.email,
        phone:           leads.phone,
        nationality:     leads.nationality,
        source:          leads.source,
        inquiryType:     leads.inquiryType,
        budget:          leads.budget,
        expectedStartDate: leads.expectedStartDate,
        notes:           leads.notes,
        createdAt:       leads.createdAt,
        updatedAt:       leads.updatedAt,
      })
      .from(leads)
      .where(eq(leads.accountId, accountId))
      .orderBy(desc(leads.createdAt));

    return res.json({ data: rows });
  } catch (err) {
    console.error("[portal/leads]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/portal/leads/:id — Agent lead detail ─────────────────────────
router.get("/portal/leads/:id", authenticatePortal, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;
    const leadId = req.params.id as string;

    const [lead] = await db
      .select({
        id:               leads.id,
        leadRefNumber:    leads.leadRefNumber,
        status:           leads.status,
        fullName:         leads.fullName,
        firstName:        leads.firstName,
        lastName:         leads.lastName,
        email:            leads.email,
        phone:            leads.phone,
        nationality:      leads.nationality,
        source:           leads.source,
        inquiryType:      leads.inquiryType,
        budget:           leads.budget,
        expectedStartDate: leads.expectedStartDate,
        notes:            leads.notes,
        isActive:         leads.isActive,
        createdAt:        leads.createdAt,
        updatedAt:        leads.updatedAt,
      })
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.accountId, accountId)));

    if (!lead) return res.status(404).json({ error: "Lead not found" });

    // Find linked quotes for this agent (most recent 10)
    const linkedQuotes = await db
      .select({
        id:             quotes.id,
        quoteRefNumber: quotes.quoteRefNumber,
        quoteStatus:    quotes.quoteStatus,
        createdOn:      quotes.createdOn,
        expiryDate:     quotes.expiryDate,
        accountName:    quotes.accountName,
        totalAmount: sql<string>`(
          SELECT COALESCE(SUM(qp.total), 0)
          FROM quote_products qp
          WHERE qp.quote_id = ${quotes.id} AND qp.status = 'Active'
        )`,
      })
      .from(quotes)
      .where(eq(quotes.agentAccountId, accountId))
      .orderBy(desc(quotes.createdOn))
      .limit(10);

    return res.json({ ...lead, linkedQuotes });
  } catch (err) {
    console.error("[portal/leads/:id]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/portal/commissions ───────────────────────────────────────────
router.get("/portal/commissions", authenticatePortal, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;

    // Tax invoices where school = provider and student is ours
    // First get student ids for this agent
    const agentQuotes = await db
      .select({ studentAccountId: quotes.studentAccountId })
      .from(quotes)
      .where(
        and(
          eq(quotes.agentAccountId, accountId),
          sql`${quotes.studentAccountId} IS NOT NULL`
        )
      );

    const studentIds = [
      ...new Set(agentQuotes.map((q) => q.studentAccountId!)),
    ];

    const commissions =
      studentIds.length > 0
        ? await db
            .select({
              id: taxInvoices.id,
              invoiceRef: taxInvoices.invoiceRef,
              invoiceDate: taxInvoices.invoiceDate,
              invoiceType: taxInvoices.invoiceType,
              schoolAccountId: taxInvoices.schoolAccountId,
              studentAccountId: taxInvoices.studentAccountId,
              programName: taxInvoices.programName,
              studentName: taxInvoices.studentName,
              courseStartDate: taxInvoices.courseStartDate,
              courseEndDate: taxInvoices.courseEndDate,
              commissionAmount: taxInvoices.commissionAmount,
              gstAmount: taxInvoices.gstAmount,
              totalAmount: taxInvoices.totalAmount,
              isGstFree: taxInvoices.isGstFree,
              status: taxInvoices.status,
              dueDate: taxInvoices.dueDate,
              paidAt: taxInvoices.paidAt,
              createdOn: taxInvoices.createdOn,
            })
            .from(taxInvoices)
            .where(inArray(taxInvoices.studentAccountId, studentIds))
            .orderBy(desc(taxInvoices.createdOn))
        : [];

    // Also get agentCommissionConfigs
    const configs = await db
      .select()
      .from(agentCommissionConfigs)
      .where(eq(agentCommissionConfigs.partnerId, accountId));

    const total = commissions.reduce((s, c) => s + Number(c.commissionAmount ?? 0), 0);
    const pending = commissions
      .filter((c) => ["draft", "sent"].includes(c.status))
      .reduce((s, c) => s + Number(c.commissionAmount ?? 0), 0);
    const paid = commissions
      .filter((c) => c.status === "paid")
      .reduce((s, c) => s + Number(c.commissionAmount ?? 0), 0);

    return res.json({
      data: commissions,
      summary: { total, pending, paid },
      configs,
    });
  } catch (err) {
    console.error("[portal/commissions]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/portal/quotes ─────────────────────────────────────────────────
router.get("/portal/quotes", authenticatePortal, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;
    const data = await db
      .select()
      .from(quotes)
      .where(eq(quotes.agentAccountId, accountId))
      .orderBy(desc(quotes.createdOn));
    return res.json({ data });
  } catch (err) {
    console.error("[portal/quotes]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── PUT /api/portal/profile ────────────────────────────────────────────────
router.put("/portal/profile", authenticatePortal, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;
    const { firstName, lastName, phoneNumber, address, country, website } = req.body;

    await staticDb
      .update(accounts)
      .set({
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
        phoneNumber: phoneNumber ?? undefined,
        address: address ?? undefined,
        country: country ?? undefined,
        website: website ?? undefined,
        modifiedOn: new Date(),
      })
      .where(eq(accounts.id, accountId));

    const [updated] = await staticDb
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    const { portalPasswordHash, portalTempPassword, ...safe } = updated;
    return res.json({ data: safe });
  } catch (err) {
    console.error("[portal/profile]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── POST /api/portal/change-password ──────────────────────────────────────
router.post("/portal/change-password", authenticatePortal, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "currentPassword and newPassword required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const [account] = await staticDb
      .select({ portalPasswordHash: accounts.portalPasswordHash, portalTempPassword: accounts.portalTempPassword })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (!account?.portalPasswordHash) {
      return res.status(400).json({ error: "No password set. Contact your administrator." });
    }

    // Allow temp password or regular bcrypt hash
    const isTempMatch = account.portalTempPassword === currentPassword;
    const isBcryptMatch = account.portalPasswordHash.startsWith("$2")
      ? await bcrypt.compare(currentPassword, account.portalPasswordHash)
      : false;

    if (!isTempMatch && !isBcryptMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await staticDb
      .update(accounts)
      .set({ portalPasswordHash: hash, portalTempPassword: null, portalMustChangePw: false, modifiedOn: new Date() } as any)
      .where(eq(accounts.id, accountId));

    return res.json({ success: true });
  } catch (err) {
    console.error("[portal/change-password]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 2 — PARTNER PORTAL (institute / hotel / pickup / tour)
// ═══════════════════════════════════════════════════════════════════════════

const PARTNER_ROLES = ["institute", "hotel", "pickup", "tour"];

function requirePartnerRole(req: any, res: any, next: any) {
  const role = req.portalUser?.portalRole;
  if (!PARTNER_ROLES.includes(role)) {
    return res.status(403).json({ error: "Forbidden", message: "Partner role required" });
  }
  next();
}

// ── GET /api/portal/partner/summary ───────────────────────────────────────
router.get("/portal/partner/summary", authenticatePortal, requirePartnerRole, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;

    // Contract products where this partner is the provider
    const myProducts = await db
      .select({
        id: contractProducts.id,
        status: contractProducts.status,
        arAmount: contractProducts.arAmount,
        apAmount: contractProducts.apAmount,
        arStatus: contractProducts.arStatus,
        apStatus: contractProducts.apStatus,
        serviceModuleType: contractProducts.serviceModuleType,
        contractId: contractProducts.contractId,
        name: contractProducts.name,
      })
      .from(contractProducts)
      .where(eq(contractProducts.providerAccountId, accountId));

    const totalBookings = myProducts.length;
    const activeBookings = myProducts.filter(p => !["cancelled", "rejected"].includes(p.status ?? "")).length;
    const totalRevenue = myProducts.reduce((s, p) => s + Number(p.apAmount ?? 0), 0);
    const pendingRevenue = myProducts.filter(p => p.apStatus === "pending" || p.apStatus === "scheduled").reduce((s, p) => s + Number(p.apAmount ?? 0), 0);
    const paidRevenue = myProducts.filter(p => p.apStatus === "paid").reduce((s, p) => s + Number(p.apAmount ?? 0), 0);

    return res.json({
      data: { totalBookings, activeBookings, totalRevenue, pendingRevenue, paidRevenue },
    });
  } catch (err) {
    console.error("[portal/partner/summary]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/portal/partner/bookings ──────────────────────────────────────
router.get("/portal/partner/bookings", authenticatePortal, requirePartnerRole, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;

    const myProducts = await db
      .select({
        id: contractProducts.id,
        contractId: contractProducts.contractId,
        name: contractProducts.name,
        serviceModuleType: contractProducts.serviceModuleType,
        quantity: contractProducts.quantity,
        unitPrice: contractProducts.unitPrice,
        totalPrice: contractProducts.totalPrice,
        apAmount: contractProducts.apAmount,
        arAmount: contractProducts.arAmount,
        status: contractProducts.status,
        apStatus: contractProducts.apStatus,
        arStatus: contractProducts.arStatus,
        arDueDate: contractProducts.arDueDate,
        apDueDate: contractProducts.apDueDate,
        createdAt: contractProducts.createdAt,
        // Contract info via join
        contractNumber: contracts.contractNumber,
        studentName: contracts.studentName,
        clientEmail: contracts.clientEmail,
        courseStartDate: contracts.courseStartDate,
        courseEndDate: contracts.courseEndDate,
        contractStatus: contracts.status,
        agentName: contracts.agentName,
        packageName: contracts.packageName,
      })
      .from(contractProducts)
      .leftJoin(contracts, eq(contractProducts.contractId, contracts.id))
      .where(eq(contractProducts.providerAccountId, accountId))
      .orderBy(desc(contractProducts.createdAt));

    return res.json({ data: myProducts });
  } catch (err) {
    console.error("[portal/partner/bookings]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 3 — STUDENT PORTAL
// ═══════════════════════════════════════════════════════════════════════════

function requireStudentRole(req: any, res: any, next: any) {
  if (req.portalUser?.portalRole !== "student") {
    return res.status(403).json({ error: "Forbidden", message: "Student role required" });
  }
  next();
}

// ── GET /api/portal/student/summary ───────────────────────────────────────
router.get("/portal/student/summary", authenticatePortal, requireStudentRole, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;

    const myQuotes = await db
      .select({ id: quotes.id, quoteStatus: quotes.quoteStatus, createdOn: quotes.createdOn })
      .from(quotes)
      .where(eq(quotes.studentAccountId, accountId));

    const myContracts = await db
      .select({
        id: contracts.id,
        status: contracts.status,
        totalAmount: contracts.totalAmount,
        paidAmount: contracts.paidAmount,
        balanceAmount: contracts.balanceAmount,
        courseStartDate: contracts.courseStartDate,
        courseEndDate: contracts.courseEndDate,
        packageName: contracts.packageName,
      })
      .from(contracts)
      .where(eq(contracts.accountId, accountId));

    const activeContracts = myContracts.filter(c => !["cancelled", "expired"].includes(c.status ?? ""));
    const totalPaid = myContracts.reduce((s, c) => s + Number(c.paidAmount ?? 0), 0);
    const totalBalance = myContracts.reduce((s, c) => s + Number(c.balanceAmount ?? 0), 0);

    return res.json({
      data: {
        totalQuotes: myQuotes.length,
        activeQuotes: myQuotes.filter(q => !["Cancelled", "Rejected", "Expired"].includes(q.quoteStatus)).length,
        acceptedQuotes: myQuotes.filter(q => q.quoteStatus === "Accepted").length,
        totalPrograms: myContracts.length,
        activePrograms: activeContracts.length,
        totalPaid,
        totalBalance,
      },
    });
  } catch (err) {
    console.error("[portal/student/summary]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/portal/student/quotes ────────────────────────────────────────
router.get("/portal/student/quotes", authenticatePortal, requireStudentRole, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;
    const data = await db
      .select({
        id: quotes.id,
        quoteRefNumber: quotes.quoteRefNumber,
        quoteStatus: quotes.quoteStatus,
        customerName: quotes.accountName,
        agentName: sql<string>`(SELECT name FROM public.accounts WHERE id = ${quotes.agentAccountId})`,
        expiryDate: quotes.expiryDate,
        createdOn: quotes.createdOn,
        leadId: quotes.leadId,
        leadRefNumber: leads.leadRefNumber,
        leadStatus: leads.status,
        leadFullName: leads.fullName,
        leadNotes: leads.notes,
      })
      .from(quotes)
      .leftJoin(leads, eq(quotes.leadId, leads.id))
      .where(eq(quotes.studentAccountId, accountId))
      .orderBy(desc(quotes.createdOn));

    // For each quote, also get product summary
    const qIds = data.map(q => q.id);
    const products = qIds.length
      ? await db
          .select({
            quoteId: quote_products.quoteId,
            productName: quote_products.productName,
            total: quote_products.total,
          })
          .from(quote_products)
          .where(inArray(quote_products.quoteId, qIds))
      : [];

    const result = data.map(q => {
      const qProds = products.filter(p => p.quoteId === q.id);
      const totalValue = qProds.reduce((s, p) => s + Number(p.total ?? 0), 0);
      return { ...q, productCount: qProds.length, totalValue };
    });

    return res.json({ data: result });
  } catch (err) {
    console.error("[portal/student/quotes]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/portal/student/programs ──────────────────────────────────────
router.get("/portal/student/programs", authenticatePortal, requireStudentRole, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;
    const data = await db
      .select({
        id: contracts.id,
        contractNumber: contracts.contractNumber,
        status: contracts.status,
        totalAmount: contracts.totalAmount,
        paidAmount: contracts.paidAmount,
        balanceAmount: contracts.balanceAmount,
        courseStartDate: contracts.courseStartDate,
        courseEndDate: contracts.courseEndDate,
        packageName: contracts.packageName,
        packageGroupName: contracts.packageGroupName,
        agentName: contracts.agentName,
        studentName: contracts.studentName,
        signedAt: contracts.signedAt,
        createdAt: contracts.createdAt,
      })
      .from(contracts)
      .where(eq(contracts.accountId, accountId))
      .orderBy(desc(contracts.createdAt));
    return res.json({ data });
  } catch (err) {
    console.error("[portal/student/programs]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/portal/student/consultations/:quoteId — Consultation detail ──
router.get("/portal/student/consultations/:quoteId", authenticatePortal, requireStudentRole, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;
    const quoteId   = req.params.quoteId as string;

    const [row] = await db
      .select({
        id:             quotes.id,
        quoteRefNumber: quotes.quoteRefNumber,
        quoteStatus:    quotes.quoteStatus,
        customerName:   quotes.accountName,
        expiryDate:     quotes.expiryDate,
        notes:          quotes.notes,
        createdOn:      quotes.createdOn,
        modifiedOn:     quotes.modifiedOn,
        agentAccountId: quotes.agentAccountId,
        leadId:         quotes.leadId,
        leadRefNumber:  leads.leadRefNumber,
        leadStatus:     leads.status,
        leadFullName:   leads.fullName,
        leadEmail:      leads.email,
        leadPhone:      leads.phone,
        leadNationality:leads.nationality,
        leadSource:     leads.source,
        leadInquiryType:leads.inquiryType,
        leadNotes:      leads.notes,
        leadCreatedAt:  leads.createdAt,
      })
      .from(quotes)
      .leftJoin(leads, eq(quotes.leadId, leads.id))
      .where(and(eq(quotes.id, quoteId), eq(quotes.studentAccountId, accountId)))
      .limit(1);

    if (!row) return res.status(404).json({ error: "Consultation not found" });

    const products = await db
      .select({
        id:               quote_products.id,
        productName:      quote_products.productName,
        name:             quote_products.name,
        description:      quote_products.description,
        qty:              quote_products.qty,
        unitPrice:        quote_products.unitPrice,
        total:            quote_products.total,
        serviceModuleType:quote_products.serviceModuleType,
        sortOrder:        quote_products.sortOrder,
      })
      .from(quote_products)
      .where(eq(quote_products.quoteId, quoteId))
      .orderBy(sql`${quote_products.sortOrder} asc`);

    let agent = null;
    if (row.agentAccountId) {
      const [a] = await db
        .select({ id: accounts.id, name: accounts.name, email: accounts.email, phoneNumber: accounts.phoneNumber })
        .from(accounts)
        .where(eq(accounts.id, row.agentAccountId))
        .limit(1);
      agent = a ?? null;
    }

    return res.json({ data: { consultation: row, products, agent } });
  } catch (err) {
    console.error("[portal/student/consultations/:quoteId]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/portal/student/programs/:id — Contract detail ────────────────
router.get("/portal/student/programs/:id", authenticatePortal, requireStudentRole, async (req, res) => {
  try {
    const accountId   = req.portalUser!.accountId;
    const contractId  = req.params.id as string;

    const [contract] = await db
      .select({
        id:              contracts.id,
        contractNumber:  contracts.contractNumber,
        status:          contracts.status,
        totalAmount:     contracts.totalAmount,
        paidAmount:      contracts.paidAmount,
        balanceAmount:   contracts.balanceAmount,
        courseStartDate: contracts.courseStartDate,
        courseEndDate:   contracts.courseEndDate,
        packageName:     contracts.packageName,
        packageGroupName:contracts.packageGroupName,
        agentName:       contracts.agentName,
        studentName:     contracts.studentName,
        clientEmail:     contracts.clientEmail,
        clientCountry:   contracts.clientCountry,
        notes:           contracts.notes,
        signedAt:        contracts.signedAt,
        createdAt:       contracts.createdAt,
      })
      .from(contracts)
      .where(and(eq(contracts.id, contractId), eq(contracts.accountId, accountId)))
      .limit(1);

    if (!contract) return res.status(404).json({ error: "Contract not found" });

    const products = await db
      .select({
        id:              contractProducts.id,
        name:            contractProducts.name,
        serviceModuleType:contractProducts.serviceModuleType,
        quantity:        contractProducts.quantity,
        unitPrice:       contractProducts.unitPrice,
        totalPrice:      contractProducts.totalPrice,
        status:          contractProducts.status,
        arAmount:        contractProducts.arAmount,
        arStatus:        contractProducts.arStatus,
        arDueDate:       contractProducts.arDueDate,
        sortIndex:       contractProducts.sortIndex,
      })
      .from(contractProducts)
      .where(eq(contractProducts.contractId, contractId))
      .orderBy(sql`${contractProducts.sortIndex} asc`);

    return res.json({ data: { contract, products } });
  } catch (err) {
    console.error("[portal/student/programs/:id]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/portal/student/documents — Student documents list ────────────
router.get("/portal/student/documents", authenticatePortal, requireStudentRole, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;

    // Get student's contracts
    const studentContracts = await db
      .select({ id: contracts.id, contractNumber: contracts.contractNumber, packageName: contracts.packageName, status: contracts.status, courseStartDate: contracts.courseStartDate, courseEndDate: contracts.courseEndDate, agentName: contracts.agentName, signedAt: contracts.signedAt })
      .from(contracts)
      .where(eq(contracts.accountId, accountId))
      .orderBy(desc(contracts.createdAt));

    const contractIds = studentContracts.map(c => c.id);

    // Get actual uploaded documents linked to these contracts
    const uploadedDocs = contractIds.length
      ? await db
          .select({
            id: documents.id,
            documentName: documents.documentName,
            originalFilename: documents.originalFilename,
            filePath: documents.filePath,
            fileType: documents.fileType,
            fileExtension: documents.fileExtension,
            documentCategory: documents.documentCategory,
            status: documents.status,
            expiryDate: documents.expiryDate,
            createdAt: documents.createdAt,
            referenceId: documents.referenceId,
          })
          .from(documents)
          .where(and(
            inArray(documents.referenceId, contractIds),
            isNull(documents.deletedAt),
          ))
          .orderBy(desc(documents.createdAt))
      : [];

    // Build response — uploaded docs first, then contracts as "documents"
    const uploadedItems = uploadedDocs.map(d => {
      const contract = studentContracts.find(c => c.id === d.referenceId);
      const isUrl = d.filePath.startsWith("http");
      return {
        id: d.id,
        type: "document" as const,
        name: d.documentName,
        originalFilename: d.originalFilename,
        fileType: d.fileType,
        fileExtension: d.fileExtension,
        documentCategory: d.documentCategory,
        status: d.status,
        expiryDate: d.expiryDate,
        createdAt: d.createdAt,
        contractNumber: contract?.contractNumber ?? null,
        packageName: contract?.packageName ?? null,
        agentName: contract?.agentName ?? null,
        viewUrl: isUrl ? d.filePath : `/api/portal/documents/${d.id}/view`,
        downloadUrl: isUrl ? d.filePath : `/api/portal/documents/${d.id}/download`,
      };
    });

    const contractItems = studentContracts.map(c => ({
      id: c.id,
      type: "contract" as const,
      name: c.packageName ?? "Enrolment Contract",
      originalFilename: null,
      fileType: null,
      fileExtension: null,
      documentCategory: "CONTRACT_DOC",
      status: c.status,
      expiryDate: null,
      createdAt: null,
      contractNumber: c.contractNumber,
      packageName: c.packageName,
      agentName: c.agentName,
      courseStartDate: c.courseStartDate,
      courseEndDate: c.courseEndDate,
      signedAt: c.signedAt,
      viewUrl: null,
      serviceId: c.id,
    }));

    return res.json({ data: [...uploadedItems, ...contractItems] });
  } catch (err) {
    console.error("[portal/student/documents]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/portal/documents/:id/view — Portal document view ─────────────
// Supports ?token=JWT for browser window.open() usage
router.get("/portal/documents/:id/view", async (req, res) => {
  try {
    // Support token from query param (for browser window.open) or header
    const queryToken = req.query.token as string | undefined;
    if (queryToken && !req.headers.authorization) {
      req.headers.authorization = `Bearer ${queryToken}`;
    }

    // Manually verify portal token
    const jwt = await import("jsonwebtoken");
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
    const decoded = jwt.default.verify(authHeader.split(" ")[1], process.env.JWT_SECRET!) as any;
    if (!decoded?.accountId) return res.status(401).json({ error: "Unauthorized" });
    const accountId = decoded.accountId as string;
    const docId = req.params.id as string;

    const [doc] = await db
      .select({ id: documents.id, filePath: documents.filePath, fileType: documents.fileType, documentName: documents.documentName, originalFilename: documents.originalFilename, referenceId: documents.referenceId })
      .from(documents)
      .where(and(eq(documents.id, docId), isNull(documents.deletedAt)))
      .limit(1);

    if (!doc) return res.status(404).json({ error: "Document not found" });

    // Validate student owns a contract linked to this document
    const [contract] = await db
      .select({ id: contracts.id })
      .from(contracts)
      .where(and(eq(contracts.id, doc.referenceId), eq(contracts.accountId, accountId)))
      .limit(1);

    if (!contract) return res.status(403).json({ error: "Forbidden" });

    // If it's a URL, redirect
    if (doc.filePath.startsWith("http")) {
      return res.redirect(doc.filePath);
    }

    // Serve from disk
    const absPath = path.resolve(doc.filePath);
    if (!fs.existsSync(absPath)) return res.status(404).json({ error: "File not found on server" });

    const ct = doc.fileType ?? "application/octet-stream";
    res.setHeader("Content-Type", ct);
    res.setHeader("Content-Disposition", `inline; filename="${doc.originalFilename ?? doc.documentName}"`);
    return res.sendFile(absPath);
  } catch (err) {
    console.error("[portal/documents/:id/view]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/portal/documents/:id/download — Portal document download ─────
router.get("/portal/documents/:id/download", async (req, res) => {
  try {
    const queryToken = req.query.token as string | undefined;
    if (queryToken && !req.headers.authorization) {
      req.headers.authorization = `Bearer ${queryToken}`;
    }
    const jwt = await import("jsonwebtoken");
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
    const decoded = jwt.default.verify(authHeader.split(" ")[1], process.env.JWT_SECRET!) as any;
    if (!decoded?.accountId) return res.status(401).json({ error: "Unauthorized" });
    const accountId = decoded.accountId as string;
    const docId = req.params.id as string;

    const [doc] = await db
      .select({ id: documents.id, filePath: documents.filePath, fileType: documents.fileType, documentName: documents.documentName, originalFilename: documents.originalFilename, referenceId: documents.referenceId })
      .from(documents)
      .where(and(eq(documents.id, docId), isNull(documents.deletedAt)))
      .limit(1);

    if (!doc) return res.status(404).json({ error: "Document not found" });

    const [contract] = await db
      .select({ id: contracts.id })
      .from(contracts)
      .where(and(eq(contracts.id, doc.referenceId), eq(contracts.accountId, accountId)))
      .limit(1);

    if (!contract) return res.status(403).json({ error: "Forbidden" });

    if (doc.filePath.startsWith("http")) return res.redirect(doc.filePath);

    const absPath = path.resolve(doc.filePath);
    if (!fs.existsSync(absPath)) return res.status(404).json({ error: "File not found on server" });

    return res.download(absPath, doc.originalFilename ?? doc.documentName);
  } catch (err) {
    console.error("[portal/documents/:id/download]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// AGENT EXTENDED ROUTES — services & contracts for agent's students
// ═══════════════════════════════════════════════════════════════════════════

// ── GET /api/portal/agent/services ────────────────────────────────────────
router.get("/portal/agent/services", authenticatePortal, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;

    const agentQuotes = await db
      .select({ studentAccountId: quotes.studentAccountId })
      .from(quotes)
      .where(and(eq(quotes.agentAccountId, accountId), sql`${quotes.studentAccountId} IS NOT NULL`));

    const studentIds = [...new Set(agentQuotes.map(q => q.studentAccountId!))];
    if (!studentIds.length) return res.json({ data: [] });

    const studentContracts = await db
      .select({ id: contracts.id })
      .from(contracts)
      .where(inArray(contracts.accountId, studentIds));

    const contractIds = studentContracts.map(c => c.id);
    if (!contractIds.length) return res.json({ data: [] });

    const data = await db
      .select({
        id: contractProducts.id,
        contractId: contractProducts.contractId,
        name: contractProducts.name,
        serviceModuleType: contractProducts.serviceModuleType,
        quantity: contractProducts.quantity,
        unitPrice: contractProducts.unitPrice,
        totalPrice: contractProducts.totalPrice,
        apAmount: contractProducts.apAmount,
        arAmount: contractProducts.arAmount,
        status: contractProducts.status,
        apStatus: contractProducts.apStatus,
        arStatus: contractProducts.arStatus,
        apDueDate: contractProducts.apDueDate,
        arDueDate: contractProducts.arDueDate,
        createdAt: contractProducts.createdAt,
        contractNumber: contracts.contractNumber,
        studentName: contracts.studentName,
        courseStartDate: contracts.courseStartDate,
        courseEndDate: contracts.courseEndDate,
        contractStatus: contracts.status,
        packageName: contracts.packageName,
      })
      .from(contractProducts)
      .leftJoin(contracts, eq(contractProducts.contractId, contracts.id))
      .where(inArray(contractProducts.contractId, contractIds))
      .orderBy(desc(contractProducts.createdAt));

    return res.json({ data });
  } catch (err) {
    console.error("[portal/agent/services]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/portal/quotes/:id — Agent quote detail (full) ─────────────────
router.get("/portal/quotes/:id", authenticatePortal, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;
    const quoteId   = req.params.id as string;

    const [quote] = await db
      .select()
      .from(quotes)
      .where(and(eq(quotes.id, quoteId), eq(quotes.agentAccountId, accountId)))
      .limit(1);

    if (!quote) return res.status(404).json({ error: "Quote not found" });

    const products = await db
      .select()
      .from(quote_products)
      .where(eq(quote_products.quoteId, quoteId))
      .orderBy(sql`${quote_products.sortOrder} asc`);

    // Linked contract (if any)
    const [contract] = await db
      .select({
        id:           contracts.id,
        contractNumber: contracts.contractNumber,
        status:       contracts.status,
        totalAmount:  contracts.totalAmount,
        paidAmount:   contracts.paidAmount,
        balanceAmount:contracts.balanceAmount,
        courseStartDate: contracts.courseStartDate,
        courseEndDate:   contracts.courseEndDate,
        packageName:  contracts.packageName,
        studentName:  contracts.studentName,
        clientEmail:  contracts.clientEmail,
        clientCountry:contracts.clientCountry,
        agentName:    contracts.agentName,
        signedAt:     contracts.signedAt,
        adminNote:    contracts.adminNote,
        partnerNote:  contracts.partnerNote,
        notes:        contracts.notes,
      })
      .from(contracts)
      .where(eq(contracts.quoteId, quoteId))
      .limit(1);

    // Student account info
    let student = null;
    if (quote.studentAccountId) {
      const [s] = await db
        .select({ id: accounts.id, name: accounts.name, email: accounts.email, country: accounts.country, phoneNumber: accounts.phoneNumber })
        .from(accounts)
        .where(eq(accounts.id, quote.studentAccountId))
        .limit(1);
      student = s ?? null;
    }

    return res.json({ data: { quote, products, contract: contract ?? null, student } });
  } catch (err) {
    console.error("[portal/quotes/:id]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/portal/student/quotes/:id — Student quote detail (limited) ────
router.get("/portal/student/quotes/:id", authenticatePortal, requireStudentRole, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;
    const quoteId   = req.params.id as string;

    const [quote] = await db
      .select({
        id:             quotes.id,
        quoteRefNumber: quotes.quoteRefNumber,
        quoteStatus:    quotes.quoteStatus,
        accountName:    quotes.accountName,
        customerName:   quotes.customerName,
        expiryDate:     quotes.expiryDate,
        notes:          quotes.notes,
        createdOn:      quotes.createdOn,
        modifiedOn:     quotes.modifiedOn,
        agentAccountId: quotes.agentAccountId,
      })
      .from(quotes)
      .where(and(eq(quotes.id, quoteId), eq(quotes.studentAccountId, accountId)))
      .limit(1);

    if (!quote) return res.status(404).json({ error: "Quote not found" });

    const products = await db
      .select({
        id:                 quote_products.id,
        productName:        quote_products.productName,
        name:               quote_products.name,
        description:        quote_products.description,
        qty:                quote_products.qty,
        unitPrice:          quote_products.unitPrice,
        total:              quote_products.total,
        serviceModuleType:  quote_products.serviceModuleType,
        sortOrder:          quote_products.sortOrder,
      })
      .from(quote_products)
      .where(eq(quote_products.quoteId, quoteId))
      .orderBy(sql`${quote_products.sortOrder} asc`);

    // Agent info
    let agent = null;
    if (quote.agentAccountId) {
      const [a] = await db
        .select({ id: accounts.id, name: accounts.name, email: accounts.email, phoneNumber: accounts.phoneNumber })
        .from(accounts)
        .where(eq(accounts.id, quote.agentAccountId))
        .limit(1);
      agent = a ?? null;
    }

    return res.json({ data: { quote, products, agent } });
  } catch (err) {
    console.error("[portal/student/quotes/:id]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/portal/partner/bookings/:id — Partner booking detail ───────────
router.get("/portal/partner/bookings/:id", authenticatePortal, requirePartnerRole, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;
    const productId = req.params.id as string;

    const [product] = await db
      .select({
        id:               contractProducts.id,
        contractId:       contractProducts.contractId,
        name:             contractProducts.name,
        serviceModuleType:contractProducts.serviceModuleType,
        quantity:         contractProducts.quantity,
        unitPrice:        contractProducts.unitPrice,
        totalPrice:       contractProducts.totalPrice,
        apAmount:         contractProducts.apAmount,
        apStatus:         contractProducts.apStatus,
        apDueDate:        contractProducts.apDueDate,
        status:           contractProducts.status,
        createdAt:        contractProducts.createdAt,
        // Contract info
        contractNumber:   contracts.contractNumber,
        contractStatus:   contracts.status,
        studentName:      contracts.studentName,
        clientEmail:      contracts.clientEmail,
        clientCountry:    contracts.clientCountry,
        agentName:        contracts.agentName,
        packageName:      contracts.packageName,
        courseStartDate:  contracts.courseStartDate,
        courseEndDate:    contracts.courseEndDate,
        partnerNote:      contracts.partnerNote,
        notes:            contracts.notes,
        paidAmount:       contracts.paidAmount,
        balanceAmount:    contracts.balanceAmount,
      })
      .from(contractProducts)
      .leftJoin(contracts, eq(contractProducts.contractId, contracts.id))
      .where(and(eq(contractProducts.id, productId), eq(contractProducts.providerAccountId, accountId)))
      .limit(1);

    if (!product) return res.status(404).json({ error: "Booking not found" });

    // Other services in the same contract for context
    const siblings = await db
      .select({
        id:               contractProducts.id,
        name:             contractProducts.name,
        serviceModuleType:contractProducts.serviceModuleType,
        apAmount:         contractProducts.apAmount,
        apStatus:         contractProducts.apStatus,
        status:           contractProducts.status,
      })
      .from(contractProducts)
      .where(and(
        eq(contractProducts.contractId, product.contractId!),
        eq(contractProducts.providerAccountId, accountId),
        sql`${contractProducts.id} != ${productId}`,
      ));

    return res.json({ data: { ...product, siblingServices: siblings } });
  } catch (err) {
    console.error("[portal/partner/bookings/:id]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/portal/partner/contracts ─────────────────────────────────────
router.get("/portal/partner/contracts", authenticatePortal, requirePartnerRole, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;

    const rows = await db
      .selectDistinct({
        id: contracts.id,
        contractNumber: contracts.contractNumber,
        status: contracts.status,
        studentName: contracts.studentName,
        clientEmail: contracts.clientEmail,
        clientCountry: contracts.clientCountry,
        agentName: contracts.agentName,
        packageName: contracts.packageName,
        courseStartDate: contracts.courseStartDate,
        courseEndDate: contracts.courseEndDate,
        signedAt: contracts.signedAt,
        createdAt: contracts.createdAt,
        totalAmount: contracts.totalAmount,
        paidAmount: contracts.paidAmount,
        balanceAmount: contracts.balanceAmount,
      })
      .from(contractProducts)
      .leftJoin(contracts, eq(contractProducts.contractId, contracts.id))
      .where(eq(contractProducts.providerAccountId, accountId))
      .orderBy(desc(contracts.createdAt));

    return res.json({ data: rows });
  } catch (err) {
    console.error("[portal/partner/contracts]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/portal/agent/contracts ───────────────────────────────────────
router.get("/portal/agent/contracts", authenticatePortal, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;

    const agentQuotes = await db
      .select({ studentAccountId: quotes.studentAccountId })
      .from(quotes)
      .where(and(eq(quotes.agentAccountId, accountId), sql`${quotes.studentAccountId} IS NOT NULL`));

    const studentIds = [...new Set(agentQuotes.map(q => q.studentAccountId!))];
    if (!studentIds.length) return res.json({ data: [] });

    const data = await db
      .select({
        id: contracts.id,
        contractNumber: contracts.contractNumber,
        status: contracts.status,
        totalAmount: contracts.totalAmount,
        paidAmount: contracts.paidAmount,
        balanceAmount: contracts.balanceAmount,
        courseStartDate: contracts.courseStartDate,
        courseEndDate: contracts.courseEndDate,
        packageName: contracts.packageName,
        packageGroupName: contracts.packageGroupName,
        studentName: contracts.studentName,
        clientEmail: contracts.clientEmail,
        agentName: contracts.agentName,
        signedAt: contracts.signedAt,
        createdAt: contracts.createdAt,
      })
      .from(contracts)
      .where(inArray(contracts.accountId, studentIds))
      .orderBy(desc(contracts.createdAt));

    return res.json({ data });
  } catch (err) {
    console.error("[portal/agent/contracts]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// COMMUNITY — All portal roles
// ═══════════════════════════════════════════════════════════════════════════

// ── GET /api/portal/community ──────────────────────────────────────────────
// ?type=all|announcement|notice|question  (default: all)
router.get("/portal/community", authenticatePortal, async (req, res) => {
  try {
    const typeFilter = (req.query.type as string) || "all";

    const condition = typeFilter !== "all" ? eq(communityPosts.type, typeFilter) : sql`TRUE`;
    const rows = await staticDb
      .select()
      .from(communityPosts)
      .where(condition)
      .orderBy(desc(communityPosts.isPinned), desc(communityPosts.createdAt));

    return res.json({ data: rows });
  } catch (err) {
    console.error("[portal/community GET]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── POST /api/portal/community ─────────────────────────────────────────────
router.post("/portal/community", authenticatePortal, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;
    const { title, content, type = "question", visibility = "public" } = req.body;

    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ error: "title and content are required" });
    }

    const [account] = await staticDb
      .select({ name: accounts.name, portalRole: accounts.portalRole })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    const authorName = account?.name ?? "Portal User";
    const authorRole = account?.portalRole ?? "agent";

    const [post] = await staticDb
      .insert(communityPosts)
      .values({
        title: title.trim(),
        content: content.trim(),
        type,
        visibility,
        audience: "all",
        authorAccountId: accountId,
        authorRole,
        authorName,
        isPinned: false,
        isResolved: false,
        commentCount: 0,
      })
      .returning();

    return res.status(201).json({ data: post });
  } catch (err) {
    console.error("[portal/community POST]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

const _UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── GET /api/portal/community/:id ──────────────────────────────────────────
router.get("/portal/community/:id", authenticatePortal, async (req, res) => {
  try {
    if (!_UUID_RE.test(req.params.id as string)) return res.status(400).json({ error: "Invalid ID" });
    const [post] = await staticDb
      .select()
      .from(communityPosts)
      .where(eq(communityPosts.id, req.params.id as string))
      .limit(1);

    if (!post) return res.status(404).json({ error: "Post not found" });

    const comments = await staticDb
      .select()
      .from(communityComments)
      .where(eq(communityComments.postId, req.params.id as string))
      .orderBy(communityComments.createdAt);

    return res.json({ data: post, comments });
  } catch (err) {
    console.error("[portal/community/:id GET]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── DELETE /api/portal/community/:id ───────────────────────────────────────
router.delete("/portal/community/:id", authenticatePortal, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;
    const postId = req.params.id as string;
    if (!_UUID_RE.test(postId)) return res.status(400).json({ error: "Invalid ID" });

    const [post] = await staticDb
      .select({ id: communityPosts.id, authorAccountId: communityPosts.authorAccountId })
      .from(communityPosts)
      .where(eq(communityPosts.id, postId))
      .limit(1);

    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.authorAccountId !== accountId) {
      return res.status(403).json({ error: "Forbidden — you can only delete your own posts" });
    }

    await staticDb.delete(communityPosts).where(eq(communityPosts.id, postId));
    return res.json({ success: true });
  } catch (err) {
    console.error("[portal/community/:id DELETE]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── POST /api/portal/community/:id/comments ────────────────────────────────
router.post("/portal/community/:id/comments", authenticatePortal, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;
    const postId = req.params.id as string;
    if (!_UUID_RE.test(postId)) return res.status(400).json({ error: "Invalid ID" });
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: "content is required" });
    }

    const [post] = await staticDb
      .select({ id: communityPosts.id })
      .from(communityPosts)
      .where(eq(communityPosts.id, postId))
      .limit(1);

    if (!post) return res.status(404).json({ error: "Post not found" });

    const [account] = await staticDb
      .select({ name: accounts.name, portalRole: accounts.portalRole })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    const authorName = account?.name ?? "Portal User";
    const authorRole = account?.portalRole ?? "agent";

    const [comment] = await staticDb
      .insert(communityComments)
      .values({
        postId,
        content: content.trim(),
        authorAccountId: accountId,
        authorRole,
        authorName,
        isAdminReply: false,
      })
      .returning();

    // Increment comment count
    await staticDb
      .update(communityPosts)
      .set({ commentCount: sql`${communityPosts.commentCount} + 1`, updatedAt: new Date() })
      .where(eq(communityPosts.id, postId));

    return res.status(201).json({ data: comment });
  } catch (err) {
    console.error("[portal/community/:id/comments POST]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── STUDENT CAMP PHOTOS ─────────────────────────────────────────────────────

const PHOTO_DIR_PORTAL = process.env.UPLOAD_DIR
  ? path.join(process.env.UPLOAD_DIR, "camp-photos")
  : path.join(process.cwd(), "uploads", "camp-photos");

// Serve photo file for portal users — accepts Bearer header OR ?token= query param (for <img src>)
router.get("/portal/student/camp-photos/file/:filename", (req: any, res: any, next: any) => {
  const PORTAL_JWT_SECRET = process.env.JWT_SECRET!;
  let token: string | undefined;
  const authHeader = req.headers.authorization as string | undefined;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (typeof req.query.token as string === "string") {
    token = req.query.token as string;
  }
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (jwt as any).default ? (jwt as any).default.verify(token, PORTAL_JWT_SECRET) : (jwt as any).verify(token, PORTAL_JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}, (req: any, res: any) => {
  const filename = path.basename(req.params.filename as string);
  const filePath = path.join(PHOTO_DIR_PORTAL, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
  return res.sendFile(path.resolve(filePath));
});

// Get participant-visible folders for the student's contracted package groups
router.get("/portal/student/camp-photos/folders", authenticatePortal, requireStudentRole, async (req, res) => {
  try {
    const accountId = req.portalUser!.accountId;

    // Find this student's active contracts → applications → packageGroupIds
    const contractRows = await db
      .select({ applicationId: contracts.applicationId })
      .from(contracts)
      .where(eq(contracts.accountId, accountId));

    const appIds = contractRows.map(r => r.applicationId).filter(Boolean) as string[];
    if (appIds.length === 0) return res.json({ data: [] });

    const appRows = await db
      .select({ packageGroupId: applications.packageGroupId })
      .from(applications)
      .where(inArray(applications.id, appIds));

    const pgIds = [...new Set(appRows.map(r => r.packageGroupId).filter(Boolean) as string[])];
    if (pgIds.length === 0) return res.json({ data: [] });

    // Get participant-visible folders for these package groups
    const folders = await db
      .select()
      .from(campPhotoFolders)
      .where(and(
        inArray(campPhotoFolders.packageGroupId, pgIds),
        eq(campPhotoFolders.visibility, "participants")
      ))
      .orderBy(asc(campPhotoFolders.packageGroupId), asc(campPhotoFolders.sortOrder), asc(campPhotoFolders.createdAt));

    return res.json({ data: folders });
  } catch (err) {
    console.error("[portal/student/camp-photos/folders]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get photos in a specific folder (verify it belongs to the student's package group)
router.get("/portal/student/camp-photos", authenticatePortal, requireStudentRole, async (req, res) => {
  try {
    const { folderId } = req.query as Record<string, string>;
    if (!folderId) return res.status(400).json({ error: "folderId required" });

    const accountId = req.portalUser!.accountId;

    // Verify this folder belongs to a package group the student is contracted for
    const [folder] = await db
      .select()
      .from(campPhotoFolders)
      .where(and(eq(campPhotoFolders.id, folderId), eq(campPhotoFolders.visibility, "participants")))
      .limit(1);

    if (!folder) return res.status(404).json({ error: "Folder not found" });

    // Check student has a contract for this package group
    const contractRows = await db
      .select({ applicationId: contracts.applicationId })
      .from(contracts)
      .where(eq(contracts.accountId, accountId));

    const appIds = contractRows.map(r => r.applicationId).filter(Boolean) as string[];
    if (appIds.length === 0) return res.status(403).json({ error: "Forbidden" });

    const appRows = await db
      .select({ packageGroupId: applications.packageGroupId })
      .from(applications)
      .where(inArray(applications.id, appIds));

    const pgIds = appRows.map(r => r.packageGroupId).filter(Boolean) as string[];
    if (!pgIds.includes(folder.packageGroupId)) return res.status(403).json({ error: "Forbidden" });

    const photos = await db
      .select()
      .from(campPhotos)
      .where(eq(campPhotos.folderId, folderId))
      .orderBy(asc(campPhotos.sortOrder), asc(campPhotos.createdAt));

    return res.json({ data: photos });
  } catch (err) {
    console.error("[portal/student/camp-photos]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/portal/public/tenants — Public tenant list (no auth required) ──
// Used for tenant selection in portal login screen during development/testing.
router.get("/portal/public/tenants", async (_req, res) => {
  try {
    const rows = await staticDb
      .select({
        id: organisations.id,
        name: organisations.name,
        subdomain: (organisations as any).subdomain,
      })
      .from(organisations)
      .where(eq((organisations as any).status, "Active"))
      .orderBy(asc(organisations.name));
    return res.json({ data: rows });
  } catch (err) {
    console.error("[portal/public/tenants]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

