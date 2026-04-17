import { Router } from "express";
import { db, runWithTenantSchema } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();
const MASTER_TENANT = process.env.PLATFORM_SUBDOMAIN ?? "myagency";

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
  const isCC = (req.user as any)?.role === "camp_coordinator";

  const handler = async () => {
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
    // CC users: skip tenant org filter (contracts are in master org; CC filter below handles scoping)
    if (req.tenant && !isCC) conds.push(sql`c.organisation_id = ${req.tenant.id}::uuid`);
    if (search)           conds.push(sql`(c.contract_number ILIKE ${"%" + search + "%"} OR c.student_name ILIKE ${"%" + search + "%"})`);
    if (status)           conds.push(sql`c.status = ${status}`);
    if (dateFrom)         conds.push(sql`c.start_date >= ${dateFrom}::date`);
    if (dateTo)           conds.push(sql`c.start_date <= ${dateTo}::date`);
    if (ownerId)          conds.push(sql`c.owner_id = ${ownerId}::uuid`);
    if (paymentFrequency) conds.push(sql`c.payment_frequency = ${paymentFrequency}`);
    if (arStatus)         conds.push(sql`EXISTS (SELECT 1 FROM contract_products cp2 WHERE cp2.contract_id = c.id AND cp2.ar_status = ${arStatus})`);
    if (apStatus)         conds.push(sql`EXISTS (SELECT 1 FROM contract_products cp3 WHERE cp3.contract_id = c.id AND cp3.ap_status = ${apStatus})`);

    // Camp coordinators: only see contracts linked to their package groups
    // Priority: org impersonation (req.tenant) → user's own org → user's id
    if (isCC) {
      const ccOrgId = req.tenant?.id ?? (req.user as any).organisationId ?? (req.user as any).id;
      conds.push(sql`EXISTS (
        SELECT 1
        FROM camp_applications ca_cc
        INNER JOIN package_groups pg_cc ON pg_cc.id = ca_cc.package_group_id
        WHERE ca_cc.id = COALESCE(
          c.camp_application_id,
          (SELECT q2.camp_application_id FROM quotes q2 WHERE q2.id = c.quote_id)
        )
        AND (
          pg_cc.camp_provider_id = ${ccOrgId}::uuid
          OR pg_cc.coordinator_id = ${ccOrgId}::uuid
        )
      )`);
    }

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
          a.first_name          AS account_first_name,
          a.last_name           AS account_last_name,
          a.original_name       AS account_original_name,
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
          ac.id AS ac_id, ac.status AS ac_status,
          c.created_at AS created_at,
          c.updated_at AS updated_at
        FROM contracts c
        LEFT JOIN accounts a         ON a.id = c.account_id
        LEFT JOIN users   u         ON u.id = c.owner_id
        LEFT JOIN quotes  q         ON q.id = c.quote_id
        LEFT JOIN LATERAL (SELECT id, status FROM study_abroad_mgt  WHERE contract_id = c.id LIMIT 1) sa ON true
        LEFT JOIN LATERAL (SELECT id, status FROM pickup_mgt        WHERE contract_id = c.id LIMIT 1) pk ON true
        LEFT JOIN LATERAL (SELECT id, status FROM accommodation_mgt WHERE contract_id = c.id LIMIT 1) ac ON true
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

    const rawRows = r(rowsRes);
    // Deduplicate by contract id — safety net against JOIN fanout
    const seenIds = new Set<string>();
    const rows = rawRows.filter((row: any) => {
      if (seenIds.has(row.id)) return false;
      seenIds.add(row.id);
      return true;
    });
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
          id:           row.account_id,
          name:         row.account_name ?? row.student_name,
          firstName:    row.account_first_name   ?? null,
          lastName:     row.account_last_name    ?? null,
          originalName: row.account_original_name ?? null,
          nationality:  row.nationality,
        },
        quote: row.quote_id ? { id: row.quote_id, quoteRefNumber: row.quote_ref_number } : null,
        owner: row.owner_id ? { id: row.owner_id, name: row.owner_name } : null,
        primaryService,
        arSummary: { totalAr: arTotal, collectedAr: arCollected, statusList: row.ar_status_list ?? [] },
        apSummary: { totalAp: apTotal, remittedAp: apRemitted, statusList: row.ap_status_list ?? [] },
        collectionRate: arTotal > 0 ? Math.round((arCollected / arTotal) * 100) : 0,
        createdAt:      row.created_at ?? null,
        updatedAt:      row.updated_at ?? null,
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
  };

  if (isCC) {
    await runWithTenantSchema(MASTER_TENANT, handler);
  } else {
    await handler();
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

    const [cRes, cpRes, invRes, txnRes, saRes, pkRes, acRes, inRes, gdRes, otRes, clRes, trRes, stRes, vsRes, ctRes, phCountRes, actCountRes] = await Promise.all([
      db.execute(sql`
        SELECT c.*,
               a.id           AS account_id_val,
               a.name         AS account_name,
               a.first_name   AS account_first_name,
               a.last_name    AS account_last_name,
               a.original_name AS account_original_name,
               a.account_type AS account_type_val,
               a.email        AS account_email,
               a.phone_number AS account_phone,
               u.id           AS owner_user_id,
               u.full_name    AS owner_name,
               q.quote_ref_number,
               COALESCE(c.camp_application_id, q.camp_application_id) AS effective_camp_app_id,
               ca.application_ref  AS camp_app_ref,
               ca.applicant_name   AS camp_app_name,
               COALESCE(ct1.id,          ct2.id)                       AS contact_id,
               COALESCE(ct1.nationality, ct2.nationality)               AS contact_nationality,
               COALESCE(ct1.email,       ct2.email, c.client_email)     AS contact_email,
               COALESCE(ct1.mobile,      ct2.mobile)                    AS contact_phone
        FROM contracts c
        LEFT JOIN accounts       a   ON a.id   = c.account_id
        LEFT JOIN contacts       ct1 ON ct1.id = a.primary_contact_id
        LEFT JOIN contacts       ct2 ON ct2.id = c.customer_contact_id
        LEFT JOIN users          u   ON u.id   = a.owner_id
        LEFT JOIN quotes         q   ON q.id   = c.quote_id
        LEFT JOIN camp_applications ca ON ca.id = COALESCE(c.camp_application_id, q.camp_application_id)
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
      db.execute(sql`SELECT * FROM study_abroad_mgt WHERE contract_id = ${id}::uuid ORDER BY created_at`),
      db.execute(sql`SELECT * FROM pickup_mgt WHERE contract_id = ${id}::uuid`),
      db.execute(sql`SELECT * FROM accommodation_mgt WHERE contract_id = ${id}::uuid ORDER BY created_at`),
      db.execute(sql`SELECT id, status, position_title, hourly_rate, employment_type, start_date, end_date, english_level, employment_type FROM internship_mgt WHERE contract_id = ${id}::uuid LIMIT 1`),
      db.execute(sql`SELECT id, status, service_fee, billing_cycle, service_start_date, service_end_date, emergency_contact FROM guardian_mgt WHERE contract_id = ${id}::uuid LIMIT 1`),
      db.execute(sql`SELECT id, status, service_type, title, start_date, end_date, service_fee, ap_cost FROM other_services_mgt WHERE contract_id = ${id}::uuid ORDER BY created_at`),
      db.execute(sql`
        SELECT pcl.*, acc.name AS partner_name
        FROM product_cost_lines pcl
        LEFT JOIN accounts acc ON acc.id = pcl.partner_id
        WHERE pcl.contract_product_id IN (
          SELECT id FROM contract_products WHERE contract_id = ${id}::uuid
        )
        ORDER BY pcl.created_on
      `),
      db.execute(sql`SELECT * FROM tour_mgt WHERE contract_id = ${id}::uuid ORDER BY created_at`),
      db.execute(sql`SELECT * FROM settlement_mgt WHERE contract_id = ${id}::uuid LIMIT 1`),
      db.execute(sql`SELECT * FROM visa_services_mgt WHERE contract_id = ${id}::uuid LIMIT 1`),
      db.execute(sql`SELECT * FROM camp_tour_mgt WHERE contract_id = ${id}::uuid ORDER BY created_at`),
      db.execute(sql`
        SELECT COUNT(DISTINCT ph.id)::int AS cnt
        FROM payment_lines pl
        JOIN payment_headers ph ON ph.id = pl.payment_header_id
        JOIN contract_products cp ON cp.id = pl.contract_product_id
        WHERE cp.contract_id = ${id}::uuid AND ph.status != 'Void'
      `),
      db.execute(sql`
        SELECT (
          (SELECT COUNT(*) FROM transactions     WHERE contract_id = ${id}::uuid) +
          (SELECT COUNT(*) FROM study_abroad_mgt WHERE contract_id = ${id}::uuid) +
          (SELECT COUNT(*) FROM pickup_mgt       WHERE contract_id = ${id}::uuid) +
          (SELECT COUNT(*) FROM accommodation_mgt WHERE contract_id = ${id}::uuid) +
          (SELECT COUNT(*) FROM tour_mgt         WHERE contract_id = ${id}::uuid) +
          (SELECT COUNT(*) FROM settlement_mgt   WHERE contract_id = ${id}::uuid) +
          (SELECT COUNT(*) FROM guardian_mgt     WHERE contract_id = ${id}::uuid) +
          (SELECT COUNT(*) FROM internship_mgt   WHERE contract_id = ${id}::uuid) +
          (SELECT COUNT(*) FROM camp_tour_mgt    WHERE contract_id = ${id}::uuid) +
          (SELECT COUNT(*) FROM other_services_mgt WHERE contract_id = ${id}::uuid)
        )::int AS cnt
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
      paymentInfoId: t.payment_info_id ?? null,
    }));

    const saArr = r(saRes);
    const pkArr = r(pkRes);
    const acArr = r(acRes);
    const inArr = r(inRes); const intern = inArr[0] ?? null;
    const gdArr = r(gdRes); const gd = gdArr[0] ?? null;
    const otArr = r(otRes);
    const trArr = r(trRes);
    const stArr = r(stRes); const st = stArr[0] ?? null;
    const vsArr = r(vsRes); const vs = vsArr[0] ?? null;
    const ctArr = r(ctRes);

    return res.json({
      id: c.id,
      contractRefDisplay:      c.contract_number,
      contractNumber:          c.contract_number,
      contractStatus:          c.status,
      fromDate:                c.start_date,
      toDate:                  c.end_date,
      contractAmount:          parseFloat(c.total_amount ?? "0"),
      paymentFrequency:        c.payment_frequency,
      totalArAmount:           parseFloat(c.total_ar_amount ?? "0"),
      totalApAmount:           parseFloat(c.total_ap_amount ?? "0"),
      serviceModulesActivated: c.service_modules_activated ?? [],
      primaryServiceModule:    c.primary_service_module ?? null,
      notes:                   c.notes,
      adminNote:               c.admin_note ?? null,
      partnerNote:             c.partner_note ?? null,
      kakaoName:               c.kakao_name ?? null,
      googleFolderTitle:       c.google_folder_title ?? null,
      agentName:               c.agent_name ?? null,
      agentInitial:            c.agent_initial ?? null,
      currency:                c.currency ?? "AUD",
      paidAmount:              parseFloat(c.paid_amount ?? "0"),
      balanceAmount:           parseFloat(c.balance_amount ?? "0"),
      isActive:                c.is_active ?? true,
      createdAt:               c.created_at ?? null,
      updatedAt:               c.updated_at ?? null,
      ownerId:                 c.owner_id ?? null,
      ownerName:               c.owner_name ?? null,
      account: {
        id:           c.account_id_val ?? c.account_id,
        name:         c.account_name ?? c.student_name,
        firstName:    c.account_first_name   ?? null,
        lastName:     c.account_last_name    ?? null,
        originalName: c.account_original_name ?? null,
        nationality:  c.contact_nationality ?? c.client_country,
        email:        c.contact_email ?? null,
        phone:        c.contact_phone ?? null,
      },
      studentAccount: c.account_id_val ? {
        id:           c.account_id_val,
        name:         c.account_name,
        firstName:    c.account_first_name   ?? null,
        lastName:     c.account_last_name    ?? null,
        originalName: c.account_original_name ?? null,
        accountType:  c.account_type_val,
        email:        c.account_email ?? null,
        phone:        c.account_phone ?? null,
      } : null,
      studentContact: c.contact_id ? {
        id:          c.contact_id,
        nationality: c.contact_nationality ?? null,
        email:       c.contact_email ?? null,
        phone:       c.contact_phone ?? null,
      } : null,
      studentOwner: c.owner_user_id ? {
        id:   c.owner_user_id,
        name: c.owner_name,
      } : null,
      studentName: c.student_name,
      clientEmail: c.contact_email ?? c.client_email ?? null,
      quote:           c.quote_id  ? { id: c.quote_id,  quoteRefNumber: c.quote_ref_number } : null,
      campApplication: c.effective_camp_app_id ? {
        id:             c.effective_camp_app_id,
        applicationRef: c.camp_app_ref  ?? null,
        applicantName:  c.camp_app_name ?? null,
      } : null,
      owner:   c.owner_id  ? { id: c.owner_id,  name: c.owner_name }               : null,
      contractProducts,
      invoices,
      transactions,
      commissionSummary,
      services: {
        studyAbroad: saArr.length ? saArr.map((sa: any) => ({
          id: sa.id, status: sa.status, visaType: sa.visa_type,
          departureDate: sa.departure_date, coeNumber: sa.coe_number,
          targetSchools: sa.target_schools,
          programName: sa.program_name, programType: sa.program_type,
          weeklyHours: sa.weekly_hours,
          fromDate: sa.program_start_date, toDate: sa.program_end_date,
          applicationStage: sa.application_stage,
          studentFirstName: sa.student_first_name, studentLastName: sa.student_last_name,
        })) : null,
        pickup: pkArr.length ? pkArr.map((p: any) => ({
          id: p.id, status: p.status, pickupType: p.pickup_type,
          from: p.from_location, to: p.to_location,
          datetime: p.pickup_datetime,
          fromDate: p.pickup_datetime ? p.pickup_datetime.toString().replace("T"," ").substring(0,10) : null,
          toDate:   p.pickup_datetime ? p.pickup_datetime.toString().replace("T"," ").substring(0,10) : null,
          driverName: p.driver_name, driverContact: p.driver_contact,
          vehicleInfo: p.vehicle_info,
        })) : null,
        accommodation: acArr.length ? acArr.map((ac: any) => ({
          id: ac.id, status: ac.status, type: ac.accommodation_type,
          checkin: ac.checkin_date, checkout: ac.checkout_date,
          fromDate: ac.checkin_date, toDate: ac.checkout_date,
          hostName: ac.host_name, hostAddress: ac.host_address,
          hostContact: ac.host_contact,
          roomType: ac.room_type, weeklyRate: ac.weekly_rate,
          mealIncluded: ac.meal_included, distanceToSchool: ac.distance_to_school,
        })) : null,
        internship: intern ? {
          id: intern.id, status: intern.status,
          positionTitle: intern.position_title,
          hourlyRate: intern.hourly_rate, employmentType: intern.employment_type,
          englishLevel: intern.english_level,
          fromDate: intern.start_date, toDate: intern.end_date,
        } : null,
        guardian: gd ? {
          id: gd.id, status: gd.status,
          serviceFee: gd.service_fee, billingCycle: gd.billing_cycle,
          fromDate: gd.service_start_date, toDate: gd.service_end_date,
          emergencyContact: gd.emergency_contact,
        } : null,
        other: otArr.length ? otArr.map((o: any) => ({
          id: o.id, status: o.status, serviceType: o.service_type,
          title: o.title, startDate: o.start_date, endDate: o.end_date,
          fromDate: o.start_date, toDate: o.end_date,
          serviceFee: o.service_fee,
        })) : null,
        settlement: st ? {
          id: st.id, status: st.status,
          serviceDescription: st.service_description, grossAmount: st.gross_amount,
          fromDate: st.arrival_date, toDate: st.arrival_date,
          arrivalDate: st.arrival_date, settlementDate: st.settlement_date,
        } : null,
        tour: trArr.length ? trArr.map((t: any) => ({
          id: t.id, status: t.status, tourName: t.tour_name, tourDate: t.tour_date,
          fromDate: t.tour_date, toDate: t.tour_date,
          startTime: t.start_time, endTime: t.end_time,
          meetingPoint: t.meeting_point, guideInfo: t.guide_info,
        })) : null,
        visa: vs ? {
          id: vs.id, status: vs.status, visaType: vs.visa_type, country: vs.country,
          applicationDate: vs.application_date, decisionDate: vs.decision_date,
          fromDate: vs.start_date, toDate: vs.end_date,
        } : null,
        camp: ctArr.length ? ctArr.map((ct: any) => ({
          id: ct.id, status: ct.status, tourName: ct.tour_name,
          tourDate: ct.tour_date, tourType: ct.tour_type,
          fromDate: ct.tour_date, toDate: ct.tour_date,
          bookingReference: ct.booking_reference, pickupLocation: ct.pickup_location,
          durationHours: ct.tour_duration_hours,
        })) : null,
      },
      documents: [],
      paymentsCount:  parseInt(r(phCountRes)[0]?.cnt ?? "0", 10),
      activityCount:  parseInt(r(actCountRes)[0]?.cnt ?? "0", 10),
    });
  } catch (err) {
    console.error("GET /crm/contracts/:id error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── PATCH /crm/contracts/:id ──────────────────────────────────────────────
router.patch("/crm/contracts/:id", authenticate, async (req, res) => {
  try {
    const { contractStatus, fromDate, toDate, paymentFrequency, notes, contractAmount, clientCountry, ownerId, accountId, primaryServiceModule } = req.body;
    const parts: ReturnType<typeof sql>[] = [];
    if (contractStatus       !== undefined) parts.push(sql`status                  = ${contractStatus}`);
    if (fromDate             !== undefined) parts.push(sql`start_date              = ${fromDate || null}`);
    if (toDate               !== undefined) parts.push(sql`end_date                = ${toDate || null}`);
    if (paymentFrequency     !== undefined) parts.push(sql`payment_frequency       = ${paymentFrequency}`);
    if (notes                !== undefined) parts.push(sql`notes                   = ${notes || null}`);
    if (contractAmount       !== undefined) parts.push(sql`total_amount            = ${Number(contractAmount)}`);
    if (clientCountry        !== undefined) parts.push(sql`client_country          = ${clientCountry || null}`);
    if (ownerId              !== undefined) parts.push(sql`owner_id                = ${ownerId || null}`);
    if (primaryServiceModule !== undefined) parts.push(sql`primary_service_module  = ${primaryServiceModule || null}`);
    if (accountId            !== undefined) {
      parts.push(sql`account_id = ${accountId || null}`);
      // Auto-regenerate contract name when account changes
      if (accountId) {
        const r = (x: any) => x.rows ?? (x as any[]);
        const rows = await db.execute(sql`SELECT name FROM accounts WHERE id = ${accountId}::uuid LIMIT 1`);
        const accRow = r(rows)[0] as { name?: string } | undefined;
        if (accRow?.name) {
          const dateStr = new Date().toISOString().split("T")[0];
          parts.push(sql`contract_number = ${"CT-" + accRow.name + "-" + dateStr}`);
        }
      }
    }
    if (parts.length === 0) return res.status(400).json({ error: "No fields provided" });
    const setSql = sql.join(parts, sql.raw(", "));
    await db.execute(sql`UPDATE contracts SET ${setSql} WHERE id = ${req.params.id}`);
    return res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /crm/contracts/:id error:", err);
    return res.status(500).json({ error: "Update failed" });
  }
});

// ─── POST /crm/contract-products  (add instalment) ──────────────────────────
router.post("/crm/contract-products", authenticate, async (req, res) => {
  try {
    const {
      contractId, name, sortIndex, isInitialPayment,
      arDueDate, arAmount, arStatus,
      apDueDate, apAmount, apStatus,
      serviceModuleType,
    } = req.body;
    if (!contractId) return res.status(400).json({ error: "contractId required" });
    const r = (x: any) => x.rows ?? (x as any[]);
    const rows = await db.execute(sql`
      INSERT INTO contract_products
        (contract_id, name, sort_index, is_initial_payment,
         ar_due_date, ar_amount, ar_status,
         ap_due_date, ap_amount, ap_status,
         service_module_type)
      VALUES
        (${contractId}::uuid, ${name ?? null}, ${sortIndex ?? 0}, ${isInitialPayment ?? false},
         ${arDueDate || null}, ${arAmount != null ? Number(arAmount) : null}, ${arStatus ?? "scheduled"},
         ${apDueDate || null}, ${apAmount != null ? Number(apAmount) : null}, ${apStatus ?? "pending"},
         ${serviceModuleType ?? null})
      RETURNING id
    `);
    return res.json({ ok: true, id: r(rows)[0]?.id });
  } catch (err) {
    console.error("POST /crm/contract-products error:", err);
    return res.status(500).json({ error: "Insert failed" });
  }
});

// ─── PATCH /crm/contract-products/:id  (update instalment) ──────────────────
router.patch("/crm/contract-products/:id", authenticate, async (req, res) => {
  try {
    const {
      name, sortIndex, isInitialPayment,
      arDueDate, arAmount, arStatus,
      apDueDate, apAmount, apStatus,
      serviceModuleType,
    } = req.body;
    const parts: ReturnType<typeof sql>[] = [];
    if (name              !== undefined) parts.push(sql`name                 = ${name ?? null}`);
    if (sortIndex         !== undefined) parts.push(sql`sort_index           = ${Number(sortIndex)}`);
    if (isInitialPayment  !== undefined) parts.push(sql`is_initial_payment   = ${Boolean(isInitialPayment)}`);
    if (arDueDate         !== undefined) parts.push(sql`ar_due_date          = ${arDueDate || null}`);
    if (arAmount          !== undefined) parts.push(sql`ar_amount            = ${arAmount !== "" ? Number(arAmount) : null}`);
    if (arStatus          !== undefined) parts.push(sql`ar_status            = ${arStatus}`);
    if (apDueDate         !== undefined) parts.push(sql`ap_due_date          = ${apDueDate || null}`);
    if (apAmount          !== undefined) parts.push(sql`ap_amount            = ${apAmount !== "" ? Number(apAmount) : null}`);
    if (apStatus          !== undefined) parts.push(sql`ap_status            = ${apStatus}`);
    if (serviceModuleType !== undefined) parts.push(sql`service_module_type  = ${serviceModuleType ?? null}`);
    if (parts.length === 0) return res.status(400).json({ error: "No fields provided" });
    const setSql = sql.join(parts, sql.raw(", "));
    await db.execute(sql`UPDATE contract_products SET ${setSql} WHERE id = ${req.params.id}::uuid`);
    return res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /crm/contract-products/:id error:", err);
    return res.status(500).json({ error: "Update failed" });
  }
});

// ─── POST /crm/contracts/:id/generate-schedule  (bulk generate schedule) ────
router.post("/crm/contracts/:id/generate-schedule", authenticate, async (req, res) => {
  try {
    const { clearExisting, items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: "items array required" });

    const r = (x: any) => x.rows ?? (x as any[]);

    if (clearExisting) {
      // Only delete rows that have no linked payment_lines
      await db.execute(sql`
        DELETE FROM contract_products
        WHERE contract_id = ${req.params.id}::uuid
          AND id NOT IN (
            SELECT DISTINCT contract_product_id FROM payment_lines
            WHERE contract_product_id IS NOT NULL
          )
      `);
    }

    let created = 0;
    for (const item of items) {
      await db.execute(sql`
        INSERT INTO contract_products
          (contract_id, name, sort_index, is_initial_payment,
           ar_due_date, ar_amount, ar_status,
           ap_due_date, ap_amount, ap_status,
           service_module_type)
        VALUES
          (${req.params.id}::uuid,
           ${item.name ?? null},
           ${item.sortIndex ?? created},
           ${item.isInitialPayment ?? false},
           ${item.arDueDate || null},
           ${item.arAmount != null && item.arAmount !== "" ? Number(item.arAmount) : null},
           ${item.arStatus ?? "scheduled"},
           ${item.apDueDate || null},
           ${item.apAmount != null && item.apAmount !== "" ? Number(item.apAmount) : null},
           ${item.apStatus ?? "pending"},
           ${item.serviceModuleType ?? null})
      `);
      created++;
    }

    return res.json({ ok: true, created });
  } catch (err: any) {
    console.error("POST /crm/contracts/:id/generate-schedule error:", err);
    return res.status(500).json({ error: err?.message ?? "Generate failed", detail: err?.detail ?? null });
  }
});

// ─── DELETE /api/crm/contracts/bulk  (super_admin 임시/영구 삭제) ────────────
router.delete("/crm/contracts/bulk", authenticate, async (req, res) => {
  if ((req.user as any)?.role !== "super_admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    const { ids, soft } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array required" });
    }
    const idList = ids.map((id: string) => `'${id.replace(/'/g, "''")}'`).join(",");
    if (soft) {
      await db.execute(sql.raw(`UPDATE contracts SET status = 'cancelled' WHERE id IN (${idList})`));
      return res.json({ success: true, updated: ids.length });
    }
    await db.execute(sql.raw(`DELETE FROM contracts WHERE id IN (${idList})`));
    return res.json({ success: true, deleted: ids.length });
  } catch (err: any) {
    console.error("[DELETE /api/crm/contracts/bulk]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── DELETE /crm/contract-products/:id  (remove instalment) ─────────────────
router.delete("/crm/contract-products/:id", authenticate, async (req, res) => {
  try {
    const r = (x: any) => x.rows ?? (x as any[]);
    // Guard: do not delete if payment lines already reference this product
    const linked = await db.execute(sql`
      SELECT COUNT(*) AS cnt FROM payment_lines WHERE contract_product_id = ${req.params.id}::uuid
    `);
    const cnt = Number(r(linked)[0]?.cnt ?? 0);
    if (cnt > 0) {
      return res.status(409).json({ error: `Cannot delete: ${cnt} payment line(s) already linked to this instalment.` });
    }
    await db.execute(sql`DELETE FROM contract_products WHERE id = ${req.params.id}::uuid`);
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /crm/contract-products/:id error:", err);
    return res.status(500).json({ error: "Delete failed" });
  }
});

export default router;
