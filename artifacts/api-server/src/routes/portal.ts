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
} from "@workspace/db/schema";
import { eq, and, inArray, desc, sql, count, sum } from "drizzle-orm";
import bcrypt from "bcryptjs";
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
    const studentId = req.params.id;

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
    const leadId = req.params.id;

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
      })
      .from(quotes)
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
    const quoteId   = req.params.id;

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
    const quoteId   = req.params.id;

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
    const productId = req.params.id;

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

export default router;

