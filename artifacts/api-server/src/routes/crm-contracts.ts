import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// ─── GET /crm/contracts/filter-options ────────────────────────────────────
// MUST be before /:id
router.get("/crm/contracts/filter-options", authenticate, async (_req, res) => {
  try {
    const owners = await db.execute(sql`
      SELECT DISTINCT u.id, u.full_name AS name
      FROM users u
      INNER JOIN contracts c ON c.owner_id = u.id
      WHERE u.full_name IS NOT NULL
      ORDER BY u.full_name
    `);
    const schools = await db.execute(sql`
      SELECT DISTINCT a.id, a.name
      FROM accounts a
      INNER JOIN products p ON p.provider_id = a.id
      INNER JOIN contract_products cp ON cp.product_id = p.id
      WHERE a.name IS NOT NULL
      ORDER BY a.name
    `);
    const nats = await db.execute(sql`
      SELECT DISTINCT client_country AS nationality
      FROM contracts
      WHERE client_country IS NOT NULL AND client_country <> ''
      ORDER BY client_country
    `);

    const r = (x: any) => x.rows ?? (x as any[]);
    return res.json({
      owners:        r(owners),
      schools:       r(schools),
      nationalities: r(nats).map((n: any) => n.nationality),
    });
  } catch (err) {
    console.error("filter-options error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── GET /crm/contracts ────────────────────────────────────────────────────
router.get("/crm/contracts", authenticate, async (req, res) => {
  try {
    const {
      search          = "",
      status          = "",
      dateFrom        = "",
      dateTo          = "",
      ownerId         = "",
      paymentFrequency = "",
      arStatus        = "",
      apStatus        = "",
      page            = "1",
      pageSize        = "10",
    } = req.query as Record<string, string>;

    const pageNum     = Math.max(1, parseInt(page));
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize)));
    const offsetNum   = (pageNum - 1) * pageSizeNum;

    // Build dynamic WHERE fragments
    const conds: ReturnType<typeof sql>[] = [sql`1=1`];
    if (search)           conds.push(sql`(c.contract_number ILIKE ${"%" + search + "%"} OR c.student_name ILIKE ${"%" + search + "%"})`);
    if (status)           conds.push(sql`c.status = ${status}`);
    if (dateFrom)         conds.push(sql`c.start_date >= ${dateFrom}::date`);
    if (dateTo)           conds.push(sql`c.start_date <= ${dateTo}::date`);
    if (ownerId)          conds.push(sql`c.owner_id = ${ownerId}::uuid`);
    if (paymentFrequency) conds.push(sql`c.payment_frequency = ${paymentFrequency}`);
    if (arStatus)         conds.push(sql`EXISTS (SELECT 1 FROM contract_products cp2 WHERE cp2.contract_id = c.id AND cp2.ar_status = ${arStatus})`);
    if (apStatus)         conds.push(sql`EXISTS (SELECT 1 FROM contract_products cp3 WHERE cp3.contract_id = c.id AND cp3.ap_status = ${apStatus})`);

    const where = sql.join(conds, sql` AND `);

    const r = (x: any) => x.rows ?? (x as any[]);

    const [countRes, rowsRes, summaryRes] = await Promise.all([
      db.execute(sql`
        SELECT COUNT(*) AS total
        FROM contracts c
        LEFT JOIN accounts a ON a.id = c.account_id
        WHERE ${where}
      `),
      db.execute(sql`
        SELECT
          c.id,
          c.contract_number,
          c.status              AS contract_status,
          c.start_date          AS from_date,
          c.end_date            AS to_date,
          c.total_amount        AS contract_amount,
          c.payment_frequency,
          c.total_ar_amount,
          c.total_ap_amount,
          c.student_name,
          c.client_country      AS nationality,
          c.account_id,
          c.owner_id,
          c.quote_id,
          a.name                AS account_name,
          u.full_name           AS owner_name,
          q.quote_ref_number,
          COALESCE((SELECT SUM(cp.ar_amount) FROM contract_products cp WHERE cp.contract_id = c.id), 0) AS ar_total,
          COALESCE((SELECT SUM(cp.ar_amount) FROM contract_products cp WHERE cp.contract_id = c.id AND cp.ar_status = 'paid'), 0) AS ar_collected,
          COALESCE((SELECT SUM(cp.ap_amount) FROM contract_products cp WHERE cp.contract_id = c.id), 0) AS ap_total,
          COALESCE((SELECT SUM(cp.ap_amount) FROM contract_products cp WHERE cp.contract_id = c.id AND cp.ap_status IN ('paid','sent')), 0) AS ap_remitted,
          ARRAY(SELECT DISTINCT cp.ar_status FROM contract_products cp WHERE cp.contract_id = c.id AND cp.ar_status IS NOT NULL) AS ar_status_list,
          ARRAY(SELECT DISTINCT cp.ap_status FROM contract_products cp WHERE cp.contract_id = c.id AND cp.ap_status IS NOT NULL) AS ap_status_list,
          sa.id AS sa_id, sa.status AS sa_status,
          pk.id AS pk_id, pk.status AS pk_status,
          ac.id AS ac_id, ac.status AS ac_status
        FROM contracts c
        LEFT JOIN accounts a         ON a.id = c.account_id
        LEFT JOIN users   u         ON u.id = c.owner_id
        LEFT JOIN quotes  q         ON q.id = c.quote_id
        LEFT JOIN study_abroad_mgt  sa ON sa.contract_id = c.id
        LEFT JOIN pickup_mgt        pk ON pk.contract_id = c.id
        LEFT JOIN accommodation_mgt ac ON ac.contract_id = c.id
        WHERE ${where}
        ORDER BY c.created_at DESC
        LIMIT ${pageSizeNum} OFFSET ${offsetNum}
      `),
      db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE c.status = 'active') AS active_count,
          COALESCE(SUM(COALESCE(c.total_ar_amount,0) - COALESCE((SELECT SUM(cp.ar_amount) FROM contract_products cp WHERE cp.contract_id = c.id AND cp.ar_status = 'paid'),0)), 0) AS ar_outstanding,
          COALESCE(SUM(COALESCE(c.total_ap_amount,0) - COALESCE((SELECT SUM(cp.ap_amount) FROM contract_products cp WHERE cp.contract_id = c.id AND cp.ap_status IN ('paid','sent')),0)), 0) AS ap_payable
        FROM contracts c
        LEFT JOIN accounts a ON a.id = c.account_id
        WHERE ${where}
      `),
    ]);

    const rows    = r(rowsRes);
    const total   = parseInt(r(countRes)[0]?.total ?? "0");
    const summary = r(summaryRes)[0] ?? {};

    const data = rows.map((row: any) => {
      const arTotal     = parseFloat(row.ar_total     ?? "0");
      const arCollected = parseFloat(row.ar_collected ?? "0");
      const apTotal     = parseFloat(row.ap_total     ?? "0");
      const apRemitted  = parseFloat(row.ap_remitted  ?? "0");

      let primaryService = null;
      if (row.sa_id)      primaryService = { type: "study_abroad",   status: row.sa_status };
      else if (row.pk_id) primaryService = { type: "pickup",         status: row.pk_status };
      else if (row.ac_id) primaryService = { type: "accommodation",  status: row.ac_status };

      return {
        id:                 row.id,
        contractRefDisplay: row.contract_number,
        contractStatus:     row.contract_status,
        fromDate:           row.from_date,
        toDate:             row.to_date,
        contractAmount:     parseFloat(row.contract_amount ?? "0"),
        paymentFrequency:   row.payment_frequency,
        account: {
          id:          row.account_id,
          name:        row.account_name ?? row.student_name,
          nationality: row.nationality,
        },
        quote: row.quote_id ? { id: row.quote_id, quoteRefNumber: row.quote_ref_number } : null,
        owner: row.owner_id ? { id: row.owner_id, name: row.owner_name } : null,
        primaryService,
        arSummary: { totalAr: arTotal, collectedAr: arCollected, statusList: row.ar_status_list ?? [] },
        apSummary: { totalAp: apTotal, remittedAp: apRemitted, statusList: row.ap_status_list ?? [] },
        collectionRate: arTotal > 0 ? Math.round((arCollected / arTotal) * 100) : 0,
      };
    });

    return res.json({
      data,
      pagination: {
        total,
        page:       pageNum,
        pageSize:   pageSizeNum,
        totalPages: Math.ceil(total / pageSizeNum),
      },
      summary: {
        activeCount:        parseInt(summary.active_count ?? "0"),
        arOutstanding:      parseFloat(summary.ar_outstanding ?? "0"),
        apPayable:          parseFloat(summary.ap_payable ?? "0"),
        commissionEstimate: Math.round(parseFloat(summary.ar_outstanding ?? "0") * 0.15 * 100) / 100,
      },
    });
  } catch (err) {
    console.error("GET /crm/contracts error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── GET /crm/contracts/:id/activity ──────────────────────────────────────
router.get("/crm/contracts/:id/activity", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const r = (x: any) => x.rows ?? (x as any[]);

    const [txns, svcs] = await Promise.all([
      db.execute(sql`
        SELECT
          t.id,
          'finance' AS type,
          CASE WHEN COALESCE(t.credit_amount,0) > 0 THEN 'ar_payment' ELSE 'ap_payment' END AS sub_type,
          'credit-card' AS icon,
          CONCAT('Payment recorded — $', COALESCE(t.credit_amount, t.amount, 0)::numeric(12,2)) AS title,
          t.description AS detail,
          'System (Auto)' AS actor_name,
          'system' AS actor_role,
          t.created_at AS occurred_at,
          'transactions' AS source_table,
          t.id AS source_id
        FROM transactions t
        WHERE t.contract_id = ${id}::uuid
      `),
      db.execute(sql`
        SELECT sa.id, 'service' AS type, 'study_abroad' AS sub_type, 'graduation-cap' AS icon,
          CONCAT('Study Abroad — ', sa.status) AS title, sa.notes AS detail,
          'System' AS actor_name, 'system' AS actor_role, sa.updated_at AS occurred_at,
          'study_abroad_mgt' AS source_table, sa.id AS source_id
        FROM study_abroad_mgt sa WHERE sa.contract_id = ${id}::uuid
        UNION ALL
        SELECT pk.id, 'service', 'pickup', 'car',
          CONCAT('Pickup — ', pk.status), pk.driver_notes,
          'System', 'system', pk.updated_at, 'pickup_mgt', pk.id
        FROM pickup_mgt pk WHERE pk.contract_id = ${id}::uuid
        UNION ALL
        SELECT ac.id, 'service', 'accommodation', 'building-2',
          CONCAT('Accommodation — ', ac.status), ac.notes,
          'System', 'system', ac.updated_at, 'accommodation_mgt', ac.id
        FROM accommodation_mgt ac WHERE ac.contract_id = ${id}::uuid
      `),
    ]);

    const all = [...r(txns), ...r(svcs)]
      .sort((a, b) => new Date(b.occurred_at ?? 0).getTime() - new Date(a.occurred_at ?? 0).getTime());

    return res.json({ data: all });
  } catch (err) {
    console.error("GET /crm/contracts/:id/activity error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── GET /crm/contracts/:id ───────────────────────────────────────────────
router.get("/crm/contracts/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const r = (x: any) => x.rows ?? (x as any[]);

    const [cRes, cpRes, invRes, txnRes, saRes, pkRes, acRes, clRes] = await Promise.all([
      db.execute(sql`
        SELECT c.*, a.name AS account_name, u.full_name AS owner_name, q.quote_ref_number
        FROM contracts c
        LEFT JOIN accounts a ON a.id = c.account_id
        LEFT JOIN users   u ON u.id = c.owner_id
        LEFT JOIN quotes  q ON q.id = c.quote_id
        WHERE c.id = ${id}::uuid
      `),
      db.execute(sql`
        SELECT cp.*
        FROM contract_products cp
        WHERE cp.contract_id = ${id}::uuid
        ORDER BY COALESCE(cp.sort_index, 0), cp.created_at
      `),
      db.execute(sql`SELECT * FROM invoices WHERE contract_id = ${id}::uuid ORDER BY issued_at DESC`),
      db.execute(sql`
        SELECT t.*, u.full_name AS created_by_name
        FROM transactions t
        LEFT JOIN users u ON u.id = t.created_by
        WHERE t.contract_id = ${id}::uuid
        ORDER BY t.transaction_date DESC
      `),
      db.execute(sql`SELECT * FROM study_abroad_mgt WHERE contract_id = ${id}::uuid LIMIT 1`),
      db.execute(sql`SELECT * FROM pickup_mgt WHERE contract_id = ${id}::uuid`),
      db.execute(sql`SELECT * FROM accommodation_mgt WHERE contract_id = ${id}::uuid LIMIT 1`),
      db.execute(sql`
        SELECT pcl.*, acc.name AS partner_name
        FROM product_cost_lines pcl
        LEFT JOIN accounts acc ON acc.id = pcl.partner_id
        WHERE pcl.contract_product_id IN (
          SELECT id FROM contract_products WHERE contract_id = ${id}::uuid
        )
        ORDER BY pcl.created_on
      `),
    ]);

    const contractArr = r(cRes);
    if (!contractArr.length) return res.status(404).json({ error: "Contract not found" });
    const c = contractArr[0];

    const clRows = r(clRes);
    const commissionSummary = { subAgent: 0, superAgent: 0, referral: 0, staffIncentive: 0 };
    const clByProduct: Record<string, any[]> = {};
    for (const cl of clRows) {
      const amt = parseFloat(cl.calculated_amount ?? "0");
      if (cl.cost_type === "sub_agent")   commissionSummary.subAgent      += amt;
      if (cl.cost_type === "super_agent") commissionSummary.superAgent     += amt;
      if (cl.cost_type === "referral")    commissionSummary.referral       += amt;
      if (cl.cost_type === "incentive")   commissionSummary.staffIncentive += amt;
      const key = cl.contract_product_id;
      if (!clByProduct[key]) clByProduct[key] = [];
      clByProduct[key].push({
        id: cl.id, costType: cl.cost_type, partnerName: cl.partner_name,
        calcType: cl.calc_type, rate: parseFloat(cl.rate ?? "0"),
        baseAmount: parseFloat(cl.base_amount ?? "0"),
        calculatedAmount: parseFloat(cl.calculated_amount ?? "0"),
        status: cl.status,
      });
    }

    const contractProducts = r(cpRes).map((cp: any) => ({
      id: cp.id, name: cp.name, sortIndex: cp.sort_index,
      isInitialPayment: cp.is_initial_payment,
      arDueDate: cp.ar_due_date, arAmount: parseFloat(cp.ar_amount ?? "0"), arStatus: cp.ar_status,
      apDueDate: cp.ap_due_date, apAmount: parseFloat(cp.ap_amount ?? "0"), apStatus: cp.ap_status,
      serviceModuleType: cp.service_module_type,
      costLines: clByProduct[cp.id] ?? [],
    }));

    const invoices = r(invRes).map((inv: any) => ({
      id: inv.id, invoiceRefNumber: inv.invoice_number,
      createdOn: inv.issued_at, dueDate: inv.due_date,
      totalPrice: parseFloat(inv.total_amount ?? "0"),
      paidAmount: parseFloat(inv.paid_amount ?? "0"),
      balance:    parseFloat(inv.total_amount ?? "0") - parseFloat(inv.paid_amount ?? "0"),
      status:     inv.status,
    }));

    const transactions = r(txnRes).map((t: any) => ({
      id: t.id, transactionDate: t.transaction_date,
      transactionType: parseFloat(t.credit_amount ?? "0") > 0 ? "Credit" : "Debit",
      creditAmount: parseFloat(t.credit_amount ?? "0"),
      debitAmount:  Math.max(0, parseFloat(t.amount ?? "0") - parseFloat(t.credit_amount ?? "0")),
      status: t.status, description: t.description, bankReference: t.bank_reference,
    }));

    const saArr = r(saRes); const sa = saArr[0] ?? null;
    const pkArr = r(pkRes);
    const acArr = r(acRes); const ac = acArr[0] ?? null;

    return res.json({
      id: c.id,
      contractRefDisplay:      c.contract_number,
      contractStatus:          c.status,
      fromDate:                c.start_date,
      toDate:                  c.end_date,
      contractAmount:          parseFloat(c.total_amount ?? "0"),
      paymentFrequency:        c.payment_frequency,
      totalArAmount:           parseFloat(c.total_ar_amount ?? "0"),
      totalApAmount:           parseFloat(c.total_ap_amount ?? "0"),
      serviceModulesActivated: c.service_modules_activated ?? [],
      notes:                   c.notes,
      account: { id: c.account_id, name: c.account_name ?? c.student_name, nationality: c.client_country },
      quote:   c.quote_id  ? { id: c.quote_id,  quoteRefNumber: c.quote_ref_number } : null,
      owner:   c.owner_id  ? { id: c.owner_id,  name: c.owner_name }               : null,
      contractProducts,
      invoices,
      transactions,
      commissionSummary,
      services: {
        studyAbroad:   sa ? { id: sa.id, status: sa.status, visaType: sa.visa_type, departureDate: sa.departure_date, coeNumber: sa.coe_number, targetSchools: sa.target_schools } : null,
        pickup:        pkArr.length ? pkArr.map((p: any) => ({ id: p.id, status: p.status, pickupType: p.pickup_type, from: p.from_location, to: p.to_location, datetime: p.pickup_datetime })) : null,
        accommodation: ac ? { id: ac.id, status: ac.status, type: ac.accommodation_type, checkin: ac.checkin_date, checkout: ac.checkout_date, hostName: ac.host_name, hostAddress: ac.host_address } : null,
        internship: null, settlement: null, guardian: null,
      },
      documents: [],
    });
  } catch (err) {
    console.error("GET /crm/contracts/:id error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
