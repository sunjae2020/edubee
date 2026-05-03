import { db, staticDb, runWithTenantSchema } from "@workspace/db";
import {
  platformSettings, users, contacts, accounts, account_contacts,
  contracts, contractProducts, airtableSyncMap, transactions,
  packageGroups, packages, enrollmentSpots, interviewSchedules,
  organisations,
} from "@workspace/db/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import { decryptField } from "../lib/crypto.js";

// ── Airtable Base config stored in platform_settings ─────────────────────────
interface AirtableBase {
  id: string;
  name: string;
  baseId: string;
  syncDirection: "inbound" | "outbound" | "both";
  syncSchedule: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  lastSyncStatus: "success" | "error" | null;
  lastSyncMessage: string | null;
}

// ── Airtable API helpers ──────────────────────────────────────────────────────
async function getToken(organisationId: string): Promise<string> {
  const key = `airtable.token.${organisationId}`;
  const rows = await staticDb.select().from(platformSettings)
    .where(eq(platformSettings.key, key)).limit(1);
  const enc = rows[0]?.value ?? null;
  const token = decryptField(enc);
  if (!token) throw new Error(`Airtable token not configured for org ${organisationId}`);
  return token;
}

async function fetchAirtable(token: string, path: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000); // 30s timeout
  try {
    const res = await fetch(`https://api.airtable.com/v0${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Airtable API ${path} → ${res.status}: ${await res.text()}`);
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function writeAirtable(
  token: string, method: "POST" | "PATCH",
  baseId: string, table: string, recordId: string | null, fields: Record<string, any>,
): Promise<string> {
  const url = recordId
    ? `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${recordId}`
    : `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) throw new Error(`Airtable write ${table} → ${res.status}: ${await res.text()}`);
  const data: any = await res.json();
  return data.id as string;
}

async function fetchAllRecords(
  token: string, baseId: string, table: string,
  modifiedSince?: Date,
): Promise<any[]> {
  const records: any[] = [];
  let offset: string | undefined;
  do {
    const params = new URLSearchParams();
    if (offset) params.set("offset", offset);
    if (modifiedSince) {
      // 5-min buffer so records modified right at the boundary are never missed
      const cutoff = new Date(modifiedSince.getTime() - 5 * 60 * 1000);
      params.set("filterByFormula", `IS_AFTER(LAST_MODIFIED_TIME(), "${cutoff.toISOString()}")`);
    }
    const qs = params.toString() ? `?${params.toString()}` : "";
    const data = await fetchAirtable(token, `/${baseId}/${encodeURIComponent(table)}${qs}`);
    records.push(...(data.records ?? []));
    offset = data.offset;
  } while (offset);
  return records;
}

// ── Sync map helpers ──────────────────────────────────────────────────────────
async function findCrmId(
  airtableBaseId: string, airtableTable: string, airtableRecordId: string,
): Promise<string | null> {
  const rows = await staticDb.select({ crmId: airtableSyncMap.crmId })
    .from(airtableSyncMap)
    .where(and(
      eq(airtableSyncMap.airtableBaseId, airtableBaseId),
      eq(airtableSyncMap.airtableTable, airtableTable),
      eq(airtableSyncMap.airtableRecordId, airtableRecordId),
    )).limit(1);
  return rows[0]?.crmId ?? null;
}

// Reverse lookup: CRM ID → Airtable record ID
async function findAirtableId(
  airtableBaseId: string, airtableTable: string, crmId: string,
): Promise<string | null> {
  const rows = await staticDb.select({ recId: airtableSyncMap.airtableRecordId })
    .from(airtableSyncMap)
    .where(and(
      eq(airtableSyncMap.airtableBaseId, airtableBaseId),
      eq(airtableSyncMap.airtableTable, airtableTable),
      eq(airtableSyncMap.crmId, crmId),
    )).limit(1);
  return rows[0]?.recId ?? null;
}

async function upsertSyncMap(entry: {
  airtableBaseId: string; airtableTable: string; airtableRecordId: string;
  crmTable: string; crmId: string; organisationId?: string;
}) {
  await staticDb.insert(airtableSyncMap).values({
    ...entry,
    syncDirection: "inbound",
    lastSyncedAt: new Date(),
  }).onConflictDoUpdate({
    target: [airtableSyncMap.airtableBaseId, airtableSyncMap.airtableTable, airtableSyncMap.airtableRecordId],
    set: { crmId: entry.crmId, lastSyncedAt: new Date() },
  });
}

// ── Get org & default owner ───────────────────────────────────────────────────
async function getDefaultOwner(organisationId: string): Promise<string> {
  const rows = await db.execute(sql`
    SELECT id FROM public.users
    WHERE organisation_id = ${organisationId}
      AND status = 'active'
    ORDER BY
      CASE role
        WHEN 'super_admin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'manager' THEN 3
        ELSE 4
      END,
      created_at ASC
    LIMIT 1
  `);
  const id = (rows.rows[0] as any)?.id;
  if (!id) throw new Error("No active user found for organisation");
  return id;
}

// ── Sync: Staff → users ───────────────────────────────────────────────────────
async function syncStaff(
  token: string, baseId: string, organisationId: string,
  modifiedSince?: Date,
): Promise<{ synced: number; skipped: number }> {
  const records = await fetchAllRecords(token, baseId, "Staff", modifiedSince);
  let synced = 0, skipped = 0;

  for (const rec of records) {
    const f = rec.fields;
    const email: string | undefined = f["Email"]?.trim().toLowerCase();
    if (!email) { skipped++; continue; }

    // Find existing user by email in this org (public schema — platform table)
    const existing = await staticDb.select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), eq(users.organisationId, organisationId)))
      .limit(1);

    if (existing.length > 0) {
      // Update name/phone if changed
      await staticDb.update(users).set({
        firstName:  f["First Name"] ?? undefined,
        lastName:   f["Last Name"] ?? undefined,
        phone:      f["Contact No"] ?? undefined,
        updatedAt:  new Date(),
      }).where(eq(users.id, existing[0].id));
      await upsertSyncMap({ airtableBaseId: baseId, airtableTable: "Staff", airtableRecordId: rec.id, crmTable: "users", crmId: existing[0].id, organisationId });
      synced++;
    } else {
      skipped++; // Don't auto-create users — security risk
    }
  }
  return { synced, skipped };
}

// ── Sync: Student → contacts + accounts ──────────────────────────────────────
async function syncStudent(
  token: string, baseId: string, organisationId: string, ownerId: string,
  modifiedSince?: Date,
): Promise<{ synced: number; created: number; failed: number }> {
  const records = await fetchAllRecords(token, baseId, "Student", modifiedSince);
  let synced = 0, created = 0, failed = 0;

  for (const rec of records) {
    try {
      const f = rec.fields;
      const firstName: string = (f["First Name"] ?? "").trim();
      const lastName: string  = (f["Last Name"]  ?? "").trim();
      const email: string     = (f["Email Address"] ?? "").trim().toLowerCase();
      if (!firstName && !lastName) continue;

      const existingCrmId = await findCrmId(baseId, "Student", rec.id);

      let needsInsert = false;
      if (existingCrmId) {
        const updated = await db.update(accounts).set({
          name: `${firstName} ${lastName}`.trim(),
          email: email || undefined,
          modifiedOn: new Date(),
        }).where(eq(accounts.id, existingCrmId)).returning({ id: accounts.id });
        if (updated.length > 0) { synced++; } else { needsInsert = true; }
      } else {
        needsInsert = true;
      }
      if (needsInsert) {
        const [contact] = await db.insert(contacts).values({
          firstName, lastName,
          fullName:    `${firstName} ${lastName}`.trim(),
          email:       email || undefined,
          mobile:      f["Phone Number"] ?? undefined,
          nationality: f["Nationality"] ?? undefined,
          dob:         f["Date of Birth"] ?? undefined,
          accountType: "Student",
          status:      "Active",
          organisationId,
        }).returning({ id: contacts.id });

        const [account] = await db.insert(accounts).values({
          name:             `${firstName} ${lastName}`.trim(),
          accountType:      "Student",
          email:            email || undefined,
          primaryContactId: contact.id,
          ownerId,
          status:           "Active",
          organisationId,
        }).returning({ id: accounts.id });

        await db.insert(account_contacts).values({
          accountId: account.id,
          contactId: contact.id,
          role: "Primary",
        }).onConflictDoNothing();

        await upsertSyncMap({ airtableBaseId: baseId, airtableTable: "Student", airtableRecordId: rec.id, crmTable: "accounts", crmId: account.id, organisationId });
        created++;
      }
    } catch (err: any) {
      console.error(`[Airtable] syncStudent record ${rec.id} failed:`, err.message, err.cause?.message ?? "");
      failed++;
    }
  }
  return { synced, created, failed };
}

// ── Sync: Partner → contacts + accounts ──────────────────────────────────────
async function syncPartner(
  token: string, baseId: string, organisationId: string, ownerId: string,
  modifiedSince?: Date,
): Promise<{ synced: number; created: number; failed: number }> {
  const records = await fetchAllRecords(token, baseId, "Partner", modifiedSince);
  let synced = 0, created = 0, failed = 0;

  for (const rec of records) {
    try {
      const f = rec.fields;
      const partnerName: string = (f["Partner Name"] ?? "").trim();
      if (!partnerName) continue;

      const existingCrmId = await findCrmId(baseId, "Partner", rec.id);

      let needsInsertPartner = false;
      if (existingCrmId) {
        const updated = await db.update(accounts).set({
          name:       partnerName,
          email:      f["Company Email"] ?? undefined,
          phoneNumber: f["Contact Number"] ?? undefined,
          website:    f["Website"] ?? undefined,
          address:    f["Address"] ?? undefined,
          country:    f["Country"] ?? undefined,
          modifiedOn: new Date(),
        }).where(eq(accounts.id, existingCrmId)).returning({ id: accounts.id });
        if (updated.length > 0) { synced++; } else { needsInsertPartner = true; }
      } else {
        needsInsertPartner = true;
      }
      if (needsInsertPartner) {
        const cpName: string = (f["Contact Person"] ?? "").trim();
        const cpParts = cpName.split(" ");
        const cpFirst = cpParts[0] ?? partnerName;
        const cpLast  = cpParts.slice(1).join(" ") || "";
        const cpEmail = (f["Contact Person Email"] ?? "").trim().toLowerCase();
        const cpMobile = f["Contact Person Mobile Number"] ?? undefined;

        const [contact] = await db.insert(contacts).values({
          firstName:   cpFirst,
          lastName:    cpLast,
          fullName:    cpName || partnerName,
          email:       cpEmail || f["Company Email"] || undefined,
          mobile:      cpMobile,
          accountType: "Agent",
          status:      "Active",
          organisationId,
        }).returning({ id: contacts.id });

        const [account] = await db.insert(accounts).values({
          name:             partnerName,
          accountType:      "Agent",
          email:            f["Company Email"] ?? undefined,
          phoneNumber:      f["Contact Number"] ?? undefined,
          website:          f["Website"] ?? undefined,
          address:          f["Address"] ?? undefined,
          country:          f["Country"] ?? undefined,
          primaryContactId: contact.id,
          isProductProvider: true,
          ownerId,
          status:           "Active",
          organisationId,
        }).returning({ id: accounts.id });

        await db.insert(account_contacts).values({
          accountId: account.id,
          contactId: contact.id,
          role: "Primary",
        }).onConflictDoNothing();

        await upsertSyncMap({ airtableBaseId: baseId, airtableTable: "Partner", airtableRecordId: rec.id, crmTable: "accounts", crmId: account.id, organisationId });
        created++;
      }
    } catch (err: any) {
      console.error(`[Airtable] syncPartner record ${rec.id} failed:`, err.message);
      failed++;
    }
  }
  return { synced, created, failed };
}

// ── Sync: Contract → contracts ────────────────────────────────────────────────
async function syncContracts(
  token: string, baseId: string, organisationId: string, ownerId: string,
  modifiedSince?: Date,
): Promise<{ synced: number; created: number; failed: number }> {
  const records = await fetchAllRecords(token, baseId, "Contract", modifiedSince);
  let synced = 0, created = 0, failed = 0;

  const statusMap: Record<string, string> = {
    "Active": "active", "Completed": "completed",
    "Cancelled": "cancelled", "Draft": "draft",
    "Pending": "pending",
  };

  for (const rec of records) {
    try {
      const f = rec.fields;

      const studentRecIds: string[] = f["Student ID"] ?? [];
      let studentAccountId: string | null = null;
      if (studentRecIds.length > 0) {
        studentAccountId = await findCrmId(baseId, "Student", studentRecIds[0]);
      }

      const staffRecIds: string[] = f["Staff"] ?? [];
      let resolvedOwnerId = ownerId;
      if (staffRecIds.length > 0) {
        const staffCrmId = await findCrmId(baseId, "Staff", staffRecIds[0]);
        if (staffCrmId) resolvedOwnerId = staffCrmId;
      }

      const firstNames: string[] = f["First Name"] ?? [];
      const lastNames: string[]  = f["Last Name"]  ?? [];
      const studentName = [firstNames[0], lastNames[0]].filter(Boolean).join(" ") || null;
      const crmStatus = statusMap[f["Contract Status"]] ?? "draft";
      const existingCrmId = await findCrmId(baseId, "Contract", rec.id);

      const contractValues = {
        status:          crmStatus,
        startDate:       f["Contract Start Date"] ?? undefined,
        endDate:         f["Contract End Date"] ?? undefined,
        courseStartDate: f["Contract Start Date"] ?? undefined,
        courseEndDate:   f["Contract End Date"] ?? undefined,
        studentName:     studentName ?? undefined,
        accountId:       studentAccountId ?? undefined,
      };
      let needsInsertContract = false;
      if (existingCrmId) {
        const updated = await db.update(contracts).set({ ...contractValues, updatedAt: new Date() })
          .where(eq(contracts.id, existingCrmId)).returning({ id: contracts.id });
        if (updated.length > 0) { synced++; } else { needsInsertContract = true; }
      } else {
        needsInsertContract = true;
      }
      if (needsInsertContract) {
        const [contract] = await db.insert(contracts).values({
          ...contractValues,
          currency: "AUD",
          organisationId,
        }).returning({ id: contracts.id });
        await upsertSyncMap({ airtableBaseId: baseId, airtableTable: "Contract", airtableRecordId: rec.id, crmTable: "contracts", crmId: contract.id, organisationId });
        created++;
      }
    } catch (err: any) {
      console.error(`[Airtable] syncContracts record ${rec.id} failed:`, err.message);
      failed++;
    }
  }
  return { synced, created, failed };
}

// ── Sync: Contract Products → contract_products ───────────────────────────────
async function syncContractProducts(
  token: string, baseId: string, organisationId: string,
  modifiedSince?: Date,
): Promise<{ synced: number; created: number; failed: number }> {
  const records = await fetchAllRecords(token, baseId, "Contract Products", modifiedSince);
  let synced = 0, created = 0, failed = 0;

  const cpStatusMap: Record<string, string> = {
    "Enrolled": "active", "Completed": "completed",
    "Cancelled": "cancelled", "Pending": "pending",
  };

  for (const rec of records) {
    try {
      const f = rec.fields;

      const contractRecIds: string[] = f["Contract Name"] ?? [];
      if (contractRecIds.length === 0) {
        console.warn(`[Airtable] CP ${rec.id} skipped: no Contract Name linked`);
        continue;
      }
      const contractId = await findCrmId(baseId, "Contract", contractRecIds[0]);
      if (!contractId) {
        console.warn(`[Airtable] CP ${rec.id} skipped: contract ${contractRecIds[0]} not in sync_map`);
        continue;
      }

      const providerRecIds: string[] = f["Provider"] ?? [];
      let providerAccountId: string | null = null;
      if (providerRecIds.length > 0) {
        providerAccountId = await findCrmId(baseId, "Partner", providerRecIds[0]);
      }

      const strField = (v: any): string | null => (typeof v === "string" ? v.trim() : null);
      const productName: string = strField(f["Course(Product) Name"]) ?? strField(f["CP Name"]) ?? "";
      const unitPrice   = typeof f["Standard Fee"] === "number" ? f["Standard Fee"] : (f["Standard Fee"] ?? null);
      const totalPrice  = typeof f["Payable"] === "number" ? f["Payable"] : (f["Payable"] ?? null);
      const commAmount  = typeof f["Comm Amount"] === "number" ? f["Comm Amount"] : (f["Comm Amount"] ?? null);
      const gstAmount   = typeof f["GST Amount"] === "number" ? f["GST Amount"] : (f["GST Amount"] ?? null);
      const grossAmount = typeof f["Total Amount"] === "number" ? f["Total Amount"] : (f["Total Amount"] ?? null);
      const arDueDate   = strField(f["Due Date(Service Start)"]);
      const apDueDate   = strField(f["Payment Date"]);
      const crmStatus   = cpStatusMap[f["Status"]] ?? "pending";
      const existingCrmId = await findCrmId(baseId, "Contract Products", rec.id);

      const cpValues = {
        name:             productName || "Unnamed Product",
        unitPrice:        unitPrice != null ? String(unitPrice) : null,
        totalPrice:       totalPrice != null ? String(totalPrice) : null,
        commissionAmount: commAmount != null ? String(commAmount) : null,
        gstAmount:        gstAmount != null ? String(gstAmount) : null,
        grossAmount:      grossAmount != null ? String(grossAmount) : null,
        arDueDate:        arDueDate ?? undefined,
        apDueDate:        apDueDate ?? undefined,
        status:           crmStatus,
        providerAccountId: providerAccountId ?? undefined,
      };
      let needsInsertCp = false;
      if (existingCrmId) {
        const updated = await db.update(contractProducts).set(cpValues)
          .where(eq(contractProducts.id, existingCrmId)).returning({ id: contractProducts.id });
        if (updated.length > 0) { synced++; } else { needsInsertCp = true; }
      } else {
        needsInsertCp = true;
      }
      if (needsInsertCp) {
        const [cp] = await db.insert(contractProducts).values({
          ...cpValues,
          contractId,
          organisationId,
          arAmount:  totalPrice != null ? String(totalPrice) : null,
          apAmount:  commAmount != null ? String(commAmount) : null,
          arStatus:  "scheduled",
          apStatus:  "pending",
          sortIndex: 0,
        }).returning({ id: contractProducts.id });
        await upsertSyncMap({ airtableBaseId: baseId, airtableTable: "Contract Products", airtableRecordId: rec.id, crmTable: "contract_products", crmId: cp.id, organisationId });
        created++;
      }
    } catch (err: any) {
      console.error(`[Airtable] syncContractProducts record ${rec.id} failed:`, err.message);
      failed++;
    }
  }
  return { synced, created, failed };
}

// ── Post-sync: backfill agentName / packageName on contracts from contract_products ──
async function backfillContractDenormFields(organisationId: string): Promise<{ updated: number }> {
  const result = await db.execute(sql`
    UPDATE contracts c
    SET package_name = sub.package_name,
        agent_name   = COALESCE(sub.agent_name, c.agent_name),
        updated_at   = NOW()
    FROM (
      SELECT DISTINCT ON (cp.contract_id)
        cp.contract_id,
        cp.name       AS package_name,
        a.name        AS agent_name
      FROM contract_products cp
      LEFT JOIN accounts a ON a.id = cp.provider_account_id
      WHERE cp.organisation_id = ${organisationId}
        AND cp.name IS NOT NULL
      ORDER BY cp.contract_id, cp.created_at
    ) sub
    WHERE c.id = sub.contract_id
      AND c.organisation_id = ${organisationId}
  `);
  return { updated: result.rowCount ?? 0 };
}

// ── Sync: Payments → transactions ────────────────────────────────────────────
async function syncPayments(
  token: string, baseId: string, organisationId: string,
  modifiedSince?: Date,
): Promise<{ synced: number; created: number; failed: number }> {
  const records = await fetchAllRecords(token, baseId, "Payments", modifiedSince);
  let synced = 0, created = 0, failed = 0;

  const paymentMethodMap: Record<string, string> = {
    "Bank Transfer": "bank_transfer", "Cash": "cash",
    "Credit Card": "credit_card", "Cheque": "cheque",
    "Online": "online", "Other": "other",
  };
  const statusMap: Record<string, string> = {
    "Completed": "Active", "Pending": "pending",
    "Cancelled": "cancelled", "Failed": "failed",
  };

  for (const rec of records) {
    try {
      const f = rec.fields;
      const paymentDate: string | null = f["Payment Date"] ?? null;
      const amountPaid: number | null  = f["Amount Paid"] ?? null;
      if (!paymentDate && !amountPaid) continue;

      let resolvedContractId: string | null = null;
      const contractRef: string | undefined = f["Contract Reference"]?.trim();
      if (contractRef) {
        const contractRow = await db.execute(sql`
          SELECT id FROM contracts
          WHERE (contract_number = ${contractRef} OR student_name ILIKE ${"%" + contractRef + "%"})
            AND organisation_id = ${organisationId}
          LIMIT 1
        `);
        resolvedContractId = (contractRow.rows[0] as any)?.id ?? null;
      }

      const existingCrmId = await findCrmId(baseId, "Payments", rec.id);

      const currency = f["Currency"] ?? "AUD";
      const method   = paymentMethodMap[f["Payment Method"]] ?? f["Payment Method"] ?? null;
      const status   = statusMap[f["Payment Status"]] ?? "Active";
      const amount   = amountPaid != null ? String(amountPaid) : null;

      if (existingCrmId) {
        await db.update(transactions).set({
          transactionDate: paymentDate ?? undefined,
          amount:          amount ?? undefined,
          currency,
          description:     method ? `Payment via ${method}` : undefined,
          status,
        }).where(eq(transactions.id, existingCrmId));
        synced++;
      } else {
        const [tx] = await db.insert(transactions).values({
          transactionType:  "receipt",
          contractId:       resolvedContractId ?? undefined,
          transactionDate:  paymentDate ?? undefined,
          amount:           amount ?? undefined,
          currency,
          description:      method ? `Payment via ${method}` : "Airtable payment",
          status,
          organisationId,
        }).returning({ id: transactions.id });

        await upsertSyncMap({
          airtableBaseId: baseId, airtableTable: "Payments",
          airtableRecordId: rec.id, crmTable: "transactions",
          crmId: tx.id, organisationId,
        });
        created++;
      }
    } catch (err: any) {
      console.error(`[Airtable] syncPayments record ${rec.id} failed:`, err.message);
      failed++;
    }
  }
  return { synced, created, failed };
}

// ── Outbound: contracts → Airtable "Contract" ─────────────────────────────────
async function syncContractsOutbound(
  token: string, baseId: string, organisationId: string,
): Promise<{ pushed: number; created: number }> {
  // Fetch contracts updated in last 24 h (or all if never synced)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db.select().from(contracts)
    .where(and(
      eq(contracts.organisationId, organisationId),
      eq(contracts.isActive, true),
      gte(contracts.updatedAt, cutoff),
    ));

  // Airtable Contract Status only allows: "TBA", "Active", "Deactive"
  const crmToAirtable: Record<string, string> = {
    active: "Active", completed: "Deactive",
    cancelled: "Deactive", draft: "TBA", pending: "TBA", on_hold: "TBA",
  };

  let pushed = 0, created = 0;

  for (const contract of rows) {
    // Skip contracts that were inbound-synced from Airtable (any table) — they belong to Airtable already
    const inboundEntry = await staticDb.select({ id: airtableSyncMap.id })
      .from(airtableSyncMap)
      .where(and(
        eq(airtableSyncMap.airtableBaseId, baseId),
        eq(airtableSyncMap.crmTable, "contracts"),
        eq(airtableSyncMap.crmId, contract.id),
        eq(airtableSyncMap.syncDirection, "inbound"),
      )).limit(1);
    if (inboundEntry.length > 0) continue;

    // Resolve Airtable student record ID
    let studentAirtableId: string | null = null;
    if (contract.accountId) {
      studentAirtableId = await findAirtableId(baseId, "Student", contract.accountId);
    }

    const fields: Record<string, any> = {
      "Contract Status": crmToAirtable[contract.status ?? "draft"] ?? "TBA",
      "Contract Start Date": contract.startDate ?? undefined,
      "Contract End Date":   contract.endDate ?? undefined,
    };
    if (studentAirtableId) fields["Student ID"] = [studentAirtableId];

    const existingAirtableId = await findAirtableId(baseId, "Contract", contract.id);

    if (existingAirtableId) {
      try {
        await writeAirtable(token, "PATCH", baseId, "Contract", existingAirtableId, fields);
        pushed++;
      } catch (e: any) {
        if (e.message?.includes("→ 422")) {
          // Stale sync map entry — Airtable record was deleted; remove and recreate
          await staticDb.delete(airtableSyncMap).where(and(
            eq(airtableSyncMap.airtableBaseId, baseId),
            eq(airtableSyncMap.airtableTable, "Contract"),
            eq(airtableSyncMap.airtableRecordId, existingAirtableId),
          ));
          const newId = await writeAirtable(token, "POST", baseId, "Contract", null, fields);
          await upsertSyncMap({ airtableBaseId: baseId, airtableTable: "Contract", airtableRecordId: newId, crmTable: "contracts", crmId: contract.id, organisationId });
          created++;
        } else { throw e; }
      }
    } else {
      const newId = await writeAirtable(token, "POST", baseId, "Contract", null, fields);
      await upsertSyncMap({
        airtableBaseId: baseId, airtableTable: "Contract",
        airtableRecordId: newId, crmTable: "contracts", crmId: contract.id, organisationId,
      });
      created++;
    }
  }
  return { pushed, created };
}

// ── Outbound: contract_products → Airtable "Contract Products" ────────────────
async function syncContractProductsOutbound(
  token: string, baseId: string, organisationId: string,
): Promise<{ pushed: number; created: number }> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db.select().from(contractProducts)
    .where(and(
      eq(contractProducts.organisationId, organisationId),
      gte(contractProducts.createdAt, cutoff),
    ));

  const statusMap: Record<string, string> = {
    active: "Enrolled", completed: "Completed",
    cancelled: "Cancelled", pending: "Pending",
  };

  let pushed = 0, created = 0;

  for (const cp of rows) {
    if (!cp.contractId) continue;

    const contractAirtableId = await findAirtableId(baseId, "Contract", cp.contractId);
    if (!contractAirtableId) continue;

    let providerAirtableId: string | null = null;
    if (cp.providerAccountId) {
      providerAirtableId = await findAirtableId(baseId, "Partner", cp.providerAccountId);
    }

    const fields: Record<string, any> = {
      "Contract Name":        [contractAirtableId],
      "Course(Product) Name": cp.name ?? "",
      "Status":               statusMap[cp.status ?? "pending"] ?? "Pending",
      "Standard Fee":         cp.unitPrice ? Number(cp.unitPrice) : undefined,
      "Payable":              cp.totalPrice ? Number(cp.totalPrice) : undefined,
      "Comm Amount":          cp.commissionAmount ? Number(cp.commissionAmount) : undefined,
      "GST Amount":           cp.gstAmount ? Number(cp.gstAmount) : undefined,
      "Total Amount":         cp.grossAmount ? Number(cp.grossAmount) : undefined,
      "Due Date(Service Start)": cp.arDueDate ?? undefined,
      "Payment Date":            cp.apDueDate ?? undefined,
    };
    if (providerAirtableId) fields["Provider"] = [providerAirtableId];

    // Remove undefined values
    Object.keys(fields).forEach(k => fields[k] === undefined && delete fields[k]);

    const existingId = await findAirtableId(baseId, "Contract Products", cp.id);

    if (existingId) {
      try {
        await writeAirtable(token, "PATCH", baseId, "Contract Products", existingId, fields);
        pushed++;
      } catch (e: any) {
        if (e.message?.includes("→ 422")) {
          await staticDb.delete(airtableSyncMap).where(and(
            eq(airtableSyncMap.airtableBaseId, baseId),
            eq(airtableSyncMap.airtableTable, "Contract Products"),
            eq(airtableSyncMap.airtableRecordId, existingId),
          ));
          const newId = await writeAirtable(token, "POST", baseId, "Contract Products", null, fields);
          await upsertSyncMap({ airtableBaseId: baseId, airtableTable: "Contract Products", airtableRecordId: newId, crmTable: "contract_products", crmId: cp.id, organisationId });
          created++;
        } else { throw e; }
      }
    } else {
      const newId = await writeAirtable(token, "POST", baseId, "Contract Products", null, fields);
      await upsertSyncMap({
        airtableBaseId: baseId, airtableTable: "Contract Products",
        airtableRecordId: newId, crmTable: "contract_products", crmId: cp.id, organisationId,
      });
      created++;
    }
  }
  return { pushed, created };
}

// ── Sync: Package Groups → package_groups ────────────────────────────────────
async function syncPackageGroups(
  token: string, baseId: string, organisationId: string,
  modifiedSince?: Date,
): Promise<{ synced: number; created: number; failed: number }> {
  const records = await fetchAllRecords(token, baseId, "Package Groups", modifiedSince);
  let synced = 0, created = 0, failed = 0;

  const statusMap: Record<string, string> = {
    "Active": "active", "Expired": "archived", "Draft": "draft",
    "Archived": "archived", "Inactive": "inactive",
  };
  const countryMap: Record<string, string> = {
    "Australia": "AU", "Thailand": "TH", "New Zealand": "NZ",
    "United Kingdom": "GB", "USA": "US", "Japan": "JP",
    "South Korea": "KR", "Singapore": "SG",
  };

  for (const rec of records) {
    try {
      const f = rec.fields;
      const name: string = (f["Package Group Name"] ?? "").trim();
      if (!name) continue;

      const statusRaw: string = f["Status"] ?? "";
      const status = statusMap[statusRaw] ?? "draft";
      const country = countryMap[f["Country"]] ?? f["Country"] ?? null;

      // Resolve a Program Partner field that may be a linked record (Partner table)
      // OR a lookup array OR a plain text. Returns { accountId, manualName }.
      const resolvePartner = async (raw: any): Promise<{ accountId: string | null; manualName: string | null }> => {
        if (raw == null || raw === "") return { accountId: null, manualName: null };
        if (Array.isArray(raw)) {
          const first = raw[0];
          if (typeof first === "string" && /^rec[A-Za-z0-9]{14,}$/.test(first)) {
            const accountId = await findCrmId(baseId, "Partner", first);
            return { accountId, manualName: null };
          }
          return { accountId: null, manualName: first != null ? String(first).trim() || null : null };
        }
        return { accountId: null, manualName: String(raw).trim() || null };
      };

      const institute     = await resolvePartner(f["Institute"]);
      const accommodation = (f["Accommodation (from Package Group)"] != null)
        ? { accountId: null, manualName: (Array.isArray(f["Accommodation (from Package Group)"]) ? f["Accommodation (from Package Group)"][0] : f["Accommodation (from Package Group)"]) ?? null }
        : await resolvePartner(f["Accommodation"]);
      const tourCompany   = await resolvePartner(f["Tour Company"]);
      const pickupDriver  = await resolvePartner(f["Pickup Driver"]);

      const upsertData = {
        nameEn:            name,
        status,
        year:              f["Year"] ?? null,
        month:             f["Month"] ?? null,
        countryCode:       country,
        location:          f["City"] ?? null,
        descriptionEn:     f["Description"] ?? null,
        requiredDocuments: f["Required Documents"] ?? null,
        durationText:      [f["Period"], f["Duration"]].filter(Boolean).join(" | ") || null,
        packagePptUrl:     f["Package PPT"] ?? null,
        googleDriveUrl:    f["Google Drive"] ?? null,
        packageCode:       f["Package ID"] ?? null,
        localManual:       f["Local Manual"] ?? null,
        departureOt:       f["Departure OT"] ?? null,
        instituteId:       institute.accountId,
        instituteName:     institute.manualName,
        accommodationId:   accommodation.accountId,
        accommodation:     accommodation.manualName,
        tourCompanyId:     tourCompany.accountId,
        tourCompany:       tourCompany.manualName,
        pickupDriverId:    pickupDriver.accountId,
        pickupDriver:      pickupDriver.manualName,
        organisationId,
        updatedAt:         new Date(),
      };

      const existingCrmId = await findCrmId(baseId, "Package Groups", rec.id);

      if (existingCrmId) {
        await db.update(packageGroups).set(upsertData).where(eq(packageGroups.id, existingCrmId));
        synced++;
      } else {
        const [pg] = await db.insert(packageGroups)
          .values({ ...upsertData, createdAt: new Date() })
          .returning({ id: packageGroups.id });
        await upsertSyncMap({
          airtableBaseId: baseId, airtableTable: "Package Groups",
          airtableRecordId: rec.id, crmTable: "package_groups", crmId: pg.id, organisationId,
        });
        created++;
      }
    } catch (err: any) {
      console.error(`[Airtable] syncPackageGroups record ${rec.id} failed:`, err.message);
      failed++;
    }
  }
  return { synced, created, failed };
}

// ── Sync: Packages → packages ─────────────────────────────────────────────────
async function syncPackages(
  token: string, baseId: string, organisationId: string,
  modifiedSince?: Date,
): Promise<{ synced: number; created: number; failed: number }> {
  const records = await fetchAllRecords(token, baseId, "Packages", modifiedSince);
  let synced = 0, created = 0, failed = 0;

  for (const rec of records) {
    try {
      const f = rec.fields;

      // Resolve package group
      const pgRecIds: string[] = f["Package Group"] ?? [];
      let packageGroupId: string | null = null;
      if (pgRecIds.length > 0) {
        packageGroupId = await findCrmId(baseId, "Package Groups", pgRecIds[0]);
      }
      if (!packageGroupId) { failed++; continue; }

      // Package name — derive from option + group name
      const packageOption: string = (f["Package Option"] ?? "").trim();
      const packageName: string = (f["Package Name"] ?? packageOption).trim() || "Unnamed Package";

      // Fees — Airtable uses "AUS $" for AUD
      const packageFee  = f["Package Fee"]  ?? null;
      const agentComm   = f["Agent Comm"]   ?? null;
      const netPrice    = f["Net Price"]    ?? null;
      const revenue     = f["Revenue"]      ?? null;
      const feeKrw      = f["Product Fee_KOR"] ?? null;
      const commKrw     = f["Agent Comm_KOR"]  ?? null;
      const toNum = (v: any) => (v != null && v !== "" ? String(v) : null);

      const upsertData = {
        packageGroupId,
        name:             packageName,
        durationDays:     0, // Airtable stores as text weeks, default 0
        packageOption:    packageOption || null,
        packageCode:      f["Product ID"] ?? null,
        kakaoName:        f["Kakao Name"] ?? null,
        priceAud:         toNum(packageFee),
        agentCommissionFixed: toNum(agentComm),
        netPrice:         toNum(netPrice),
        revenue:          toNum(revenue),
        priceKrw:         feeKrw != null && feeKrw !== "" ? String(Math.round(Number(feeKrw))) : null,
        agentCommKrw:     commKrw != null && commKrw !== "" ? String(Math.round(Number(commKrw))) : null,
        roomType:         f["Room Type"] ?? null,
        pricePerNight:    toNum(f["Per/Night"]),
        checkInDate:      f["Check-In"] ?? null,
        checkOutDate:     f["Check-Out"] ?? null,
        schoolStartDate:  f["School Start Date"] ?? null,
        schoolDuration:   f["School Duration"] ?? null,
        pickupDate:       f["Pickup Date"] ?? null,
        pickupFee:        toNum(f["Pickup Fee"]),
        dropDate:         f["Drop Date"] ?? null,
        dropFee:          toNum(f["Drop Fee"]),
        status:           "active",
        updatedAt:        new Date(),
      };

      const existingCrmId = await findCrmId(baseId, "Packages", rec.id);

      if (existingCrmId) {
        await db.update(packages).set(upsertData).where(eq(packages.id, existingCrmId));
        synced++;
      } else {
        const [pkg] = await db.insert(packages)
          .values({ ...upsertData, createdAt: new Date() })
          .returning({ id: packages.id });
        await upsertSyncMap({
          airtableBaseId: baseId, airtableTable: "Packages",
          airtableRecordId: rec.id, crmTable: "packages", crmId: pkg.id, organisationId,
        });
        created++;
      }
    } catch (err: any) {
      console.error(`[Airtable] syncPackages record ${rec.id} failed:`, err.message, err.cause?.message ?? "");
      failed++;
    }
  }
  return { synced, created, failed };
}

// ── Sync: Camp MGT → contracts ────────────────────────────────────────────────
async function syncCampContracts(
  token: string, baseId: string, organisationId: string,
  modifiedSince?: Date,
): Promise<{ synced: number; created: number; failed: number }> {
  const records = await fetchAllRecords(token, baseId, "Camp MGT", modifiedSince);
  let synced = 0, created = 0, failed = 0;

  const statusMap: Record<string, string> = {
    "Active": "active", "Completed": "completed",
    "Cancelled": "cancelled", "Draft": "draft",
    "Pending": "pending", "Expired": "completed",
  };
  const currencyMap: Record<string, string> = {
    "AUD $": "AUD", "AUS $": "AUD", "USD $": "USD",
    "KRW ₩": "KRW", "THB ฿": "THB",
    "AUD": "AUD", "USD": "USD",
  };

  for (const rec of records) {
    try {
      const f = rec.fields;

      const statusRaw: string = f["CampMGT Status"] ?? "";
      const status = statusMap[statusRaw] ?? "draft";
      const currencyRaw: string = f["Currency"] ?? "AUD $";
      const currency = currencyMap[currencyRaw] ?? "AUD";

      const firstName: string = (f["First Name"] ?? "").trim();
      const lastName:  string = (f["Last Name"]  ?? "").trim();
      const studentName = [firstName, lastName].filter(Boolean).join(" ") || null;

      // Resolve package group name from lookup
      const pgLookup: string[] = f["Package Group (from Package)"] ?? [];
      const packageGroupName = pgLookup[0] ?? null;

      // Resolve package via linked Package record
      const packageRecIds: string[] = f["Package"] ?? [];
      let resolvedPackageName: string | null = null;
      if (packageRecIds.length > 0) {
        const pkgId = packageRecIds[0];
        const idLookup: string[] = f["Package ID (from Package)"] ?? [];
        resolvedPackageName = idLookup[0] ?? null;
      }

      const totalFee   = f["Total Fee"]   ?? null;
      const paid       = f["Paid"]        ?? null;
      const balance    = typeof f["Balance"] === "number" ? f["Balance"] : null;
      const agentComm  = f["Agent Comm"]  ?? null;
      const agentName  = Array.isArray(f["Agent Name"])
        ? null  // linked record — name not available here without additional fetch
        : (f["Agent Name"] ?? null);

      const upsertData = {
        status,
        currency,
        totalAmount:      totalFee  != null ? String(totalFee)  : null,
        paidAmount:       paid      != null ? String(paid)      : null,
        balanceAmount:    balance   != null ? String(balance)   : null,
        studentName:      studentName ?? null,
        packageGroupName: packageGroupName ?? null,
        adminNote:        f["Admin Note"] ?? null,
        partnerNote:      f["Partner Note"] ?? null,
        googleFolderTitle: f["Google Drive"] ? String(f["Google Drive"]) : null,
        organisationId,
        updatedAt:        new Date(),
      };

      const existingCrmId = await findCrmId(baseId, "Camp MGT", rec.id);

      if (existingCrmId) {
        await db.update(contracts).set(upsertData).where(eq(contracts.id, existingCrmId));
        synced++;
      } else {
        const [contract] = await db.insert(contracts)
          .values({ ...upsertData, createdAt: new Date() })
          .returning({ id: contracts.id });
        await upsertSyncMap({
          airtableBaseId: baseId, airtableTable: "Camp MGT",
          airtableRecordId: rec.id, crmTable: "contracts", crmId: contract.id, organisationId,
        });
        created++;
      }
    } catch (err: any) {
      console.error(`[Airtable] syncCampContracts record ${rec.id} failed:`, err.message);
      failed++;
    }
  }
  return { synced, created, failed };
}

// ── Sync: Enrollment Spots → enrollment_spots ─────────────────────────────────
async function syncEnrollmentSpots(
  token: string, baseId: string, organisationId: string,
  modifiedSince?: Date,
): Promise<{ synced: number; created: number; failed: number }> {
  const records = await fetchAllRecords(token, baseId, "Enrollment Spots", modifiedSince);
  let synced = 0, created = 0, failed = 0;

  for (const rec of records) {
    try {
      const f = rec.fields;

      const pgRecIds: string[] = f["Package Group"] ?? [];
      if (pgRecIds.length === 0) { failed++; continue; }
      const packageGroupId = await findCrmId(baseId, "Package Groups", pgRecIds[0]);
      if (!packageGroupId) { failed++; continue; }

      const gradeLabel: string = (f["Year Level"] ?? "").trim() || "Unknown";
      const totalSpots: number = f["Total Spots"] ?? 0;
      const enrolledCount: number = f["Enroll No."] ?? 0;
      const enrollName: string  = (f["Enroll Name"] ?? "").trim() || null!;
      const dobRange: string    = f["DOB Range"] ?? "";
      const note: string        = f["Note"] ?? null!;

      const upsertData = {
        packageGroupId,
        enrollName:    enrollName || null,
        gradeLabel,
        gradeOrder:    0,
        totalSpots,
        reservedSpots: enrolledCount,
        note:          [dobRange ? `DOB: ${dobRange}` : null, note].filter(Boolean).join(" | ") || null,
        status:        totalSpots - enrolledCount <= 0 ? "full" : "available",
        updatedAt:     new Date(),
      };

      const existingCrmId = await findCrmId(baseId, "Enrollment Spots", rec.id);

      if (existingCrmId) {
        await db.update(enrollmentSpots).set(upsertData).where(eq(enrollmentSpots.id, existingCrmId));
        synced++;
      } else {
        const [spot] = await db.insert(enrollmentSpots)
          .values({ ...upsertData, createdAt: new Date() })
          .returning({ id: enrollmentSpots.id });
        await upsertSyncMap({
          airtableBaseId: baseId, airtableTable: "Enrollment Spots",
          airtableRecordId: rec.id, crmTable: "enrollment_spots", crmId: spot.id, organisationId,
        });
        created++;
      }
    } catch (err: any) {
      console.error(`[Airtable] syncEnrollmentSpots record ${rec.id} failed:`, err.message);
      failed++;
    }
  }
  return { synced, created, failed };
}

// ── Sync: Interview MGT → interview_schedules ─────────────────────────────────
async function syncInterviewMgt(
  token: string, baseId: string, organisationId: string,
  modifiedSince?: Date,
): Promise<{ synced: number; created: number; failed: number }> {
  const records = await fetchAllRecords(token, baseId, "Interview MGT", modifiedSince);
  let synced = 0, created = 0, failed = 0;

  const statusMap: Record<string, string> = {
    "Pending":  "pending",
    "Passed":   "completed",
    "Failed":   "cancelled",
    "Cancelled": "cancelled",
    "Scheduled": "scheduled",
  };
  const formatMap: Record<string, string> = {
    "Teams": "online", "Zoom": "online", "Online": "online",
    "In Person": "in_person", "Phone": "phone",
  };
  const tzMap: Record<string, string> = {
    "Melbourne": "Australia/Melbourne",
    "Sydney": "Australia/Sydney",
    "Seoul": "Asia/Seoul",
    "Bangkok": "Asia/Bangkok",
    "Tokyo": "Asia/Tokyo",
  };

  for (const rec of records) {
    try {
      const f = rec.fields;

      const interviewDate: string | null = f["Interview Date"] ?? null;
      const interviewTime: string = f["Interview Time"] ?? "00:00";
      const statusRaw: string = f["Interview State"] ?? "";
      const status = statusMap[statusRaw] ?? "pending";
      const format = formatMap[f["App"] ?? f["Interview Type"] ?? ""] ?? "online";
      const timezone = tzMap[f["Time Zone"]] ?? "Australia/Melbourne";

      // Build datetime from date + time strings
      let scheduledDatetime: Date;
      if (interviewDate) {
        const timeClean = interviewTime.replace(/AM|PM/i, "").trim();
        const isPM = /PM/i.test(interviewTime);
        const [hStr, mStr] = timeClean.split(":");
        let h = parseInt(hStr ?? "0", 10);
        const m = parseInt(mStr ?? "0", 10);
        if (isPM && h !== 12) h += 12;
        if (!isPM && h === 12) h = 0;
        scheduledDatetime = new Date(`${interviewDate}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
      } else {
        scheduledDatetime = new Date();
      }

      // Resolve package group via Institute MGT → Package Group (best effort)
      const instRecIds: string[] = f["Link to Institute MGT"] ?? [];
      let packageGroupId: string | null = null;
      // We don't have a direct sync map for Institute MGT, so skip packageGroupId resolution

      const upsertData = {
        scheduledDatetime,
        timezone,
        format,
        status,
        result:           statusRaw === "Passed" ? "pass" : statusRaw === "Failed" ? "fail" : null,
        meetingLink:      f["Interview Link"] ?? null,
        interviewerNotes: f["Interview Summary"] ?? f["Note"] ?? null,
        updatedAt:        new Date(),
      };

      const existingCrmId = await findCrmId(baseId, "Interview MGT", rec.id);

      if (existingCrmId) {
        await db.update(interviewSchedules).set(upsertData).where(eq(interviewSchedules.id, existingCrmId));
        synced++;
      } else {
        const [interview] = await db.insert(interviewSchedules)
          .values({ ...upsertData, createdAt: new Date() })
          .returning({ id: interviewSchedules.id });
        await upsertSyncMap({
          airtableBaseId: baseId, airtableTable: "Interview MGT",
          airtableRecordId: rec.id, crmTable: "interview_schedules", crmId: interview.id, organisationId,
        });
        created++;
      }
    } catch (err: any) {
      console.error(`[Airtable] syncInterviewMgt record ${rec.id} failed:`, err.message);
      failed++;
    }
  }
  return { synced, created, failed };
}

// ── Main sync function ────────────────────────────────────────────────────────
export interface SyncResult {
  baseId: string;
  baseName: string;
  success: boolean;
  error?: string;
  elapsed: number;
  details: Record<string, { synced?: number; created?: number; skipped?: number; pushed?: number; updated?: number }>;
}

export async function syncAirtableBase(base: AirtableBase, organisationId: string): Promise<SyncResult> {
  const start = Date.now();
  const details: SyncResult["details"] = {};

  // Incremental sync: only fetch records modified since last successful sync.
  // Fall back to full sync on first run or when last sync was > 7 days ago (weekly refresh).
  const lastSync = base.lastSyncedAt ? new Date(base.lastSyncedAt) : null;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const modifiedSince = lastSync && lastSync > sevenDaysAgo ? lastSync : undefined;

  console.log(
    modifiedSince
      ? `[Airtable] Incremental sync for ${base.name}: changes since ${modifiedSince.toISOString()}`
      : `[Airtable] Full sync for ${base.name} (first sync or weekly refresh)`
  );

  // Persist sync status to DB so the result survives process restarts
  const persistStatus = async (result: SyncResult) => {
    try {
      const basesKey = `airtable.bases.${organisationId}`;
      const fresh = await staticDb.select().from(platformSettings)
        .where(eq(platformSettings.key, basesKey)).limit(1);
      const all: AirtableBase[] = JSON.parse(fresh[0]?.value ?? "[]");
      const idx = all.findIndex(b => b.id === base.id);
      if (idx !== -1) {
        all[idx].lastSyncedAt    = new Date().toISOString();
        all[idx].lastSyncStatus  = result.success ? "success" : "error";
        all[idx].lastSyncMessage = result.success
          ? `Synced: ${JSON.stringify(result.details)}`
          : result.error ?? "Unknown error";
        await staticDb.insert(platformSettings)
          .values({ key: basesKey, value: JSON.stringify(all), updatedAt: new Date() })
          .onConflictDoUpdate({ target: platformSettings.key, set: { value: JSON.stringify(all), updatedAt: new Date() } });
      }
    } catch (e: any) {
      console.error("[Airtable] persistStatus failed:", e.message);
    }
  };

  try {
    const token = await getToken(organisationId);
    const ownerId = await getDefaultOwner(organisationId);

    // Look up tenant slug so DB operations use the correct schema (not public fallback)
    const orgRow = await staticDb.select({ subdomain: organisations.subdomain })
      .from(organisations).where(eq(organisations.id, organisationId)).limit(1);
    const tenantSlug = orgRow[0]?.subdomain;
    if (!tenantSlug) throw new Error(`No tenant slug found for org ${organisationId}`);

    if (base.syncDirection === "inbound" || base.syncDirection === "both") {
      await runWithTenantSchema(tenantSlug, async () => {
        // All syncs wrapped individually — gracefully skip tables that don't exist in this base
        try { details.staff = await syncStaff(token, base.baseId, organisationId, modifiedSince); }
        catch (e: any) { if (!e.message?.includes("403")) throw e; }

        try { details.student = await syncStudent(token, base.baseId, organisationId, ownerId, modifiedSince); }
        catch (e: any) { if (!e.message?.includes("403")) throw e; }

        try { details.partner = await syncPartner(token, base.baseId, organisationId, ownerId, modifiedSince); }
        catch (e: any) { if (!e.message?.includes("403")) throw e; }

        // Camp CRM: Package Groups → Packages → Contracts (order matters)
        try { details.packageGroups = await syncPackageGroups(token, base.baseId, organisationId, modifiedSince); }
        catch (e: any) { if (!e.message?.includes("403")) throw e; }

        try { details.packages = await syncPackages(token, base.baseId, organisationId, modifiedSince); }
        catch (e: any) { if (!e.message?.includes("403")) throw e; }

        try { details.campContracts = await syncCampContracts(token, base.baseId, organisationId, modifiedSince); }
        catch (e: any) { if (!e.message?.includes("403")) throw e; }

        // Enrollment Spots depend on Package Groups being synced first
        try { details.enrollmentSpots = await syncEnrollmentSpots(token, base.baseId, organisationId, modifiedSince); }
        catch (e: any) { if (!e.message?.includes("403")) throw e; }

        try { details.interviewMgt = await syncInterviewMgt(token, base.baseId, organisationId, modifiedSince); }
        catch (e: any) { if (!e.message?.includes("403")) throw e; }

        try { details.contract = await syncContracts(token, base.baseId, organisationId, ownerId, modifiedSince); }
        catch (e: any) { if (!e.message?.includes("403")) throw e; }

        try { details.contractProducts = await syncContractProducts(token, base.baseId, organisationId, modifiedSince); }
        catch (e: any) { if (!e.message?.includes("403")) throw e; }

        // Backfill denormalized agentName / packageName on contracts
        try { details.contractBackfill = await backfillContractDenormFields(organisationId); }
        catch (e: any) { console.error("[Airtable] backfillContractDenormFields failed:", e.message); }

        try { details.payments = await syncPayments(token, base.baseId, organisationId, modifiedSince); }
        catch (e: any) { if (!e.message?.includes("403")) throw e; }
      });
    }

    if (base.syncDirection === "outbound" || base.syncDirection === "both") {
      await runWithTenantSchema(tenantSlug, async () => {
        try { details.contractOut = await syncContractsOutbound(token, base.baseId, organisationId); }
        catch (e: any) { if (!e.message?.includes("403")) throw e; }

        try { details.contractProductsOut = await syncContractProductsOutbound(token, base.baseId, organisationId); }
        catch (e: any) { if (!e.message?.includes("403")) throw e; }
      });
    }

    const result: SyncResult = { baseId: base.id, baseName: base.name, success: true, elapsed: Date.now() - start, details };
    console.log(`[Airtable] Sync complete for ${base.name}: ${JSON.stringify(details)}`);
    await persistStatus(result);
    return result;
  } catch (err: any) {
    const causeMsg = err.cause?.message ?? err.cause ?? "";
    const fullError = causeMsg ? `${err.message} | cause: ${causeMsg}` : err.message;
    console.error(`[Airtable] Sync failed for ${base.name}:`, err.message, causeMsg ? `\n  cause: ${causeMsg}` : "");
    const result: SyncResult = { baseId: base.id, baseName: base.name, success: false, error: fullError, elapsed: Date.now() - start, details };
    await persistStatus(result);
    return result;
  }
}

// ── Sync all active bases for an organisation ─────────────────────────────────
export async function syncAllBases(organisationId: string): Promise<SyncResult[]> {
  const basesKey = `airtable.bases.${organisationId}`;
  const rows = await staticDb.select().from(platformSettings)
    .where(eq(platformSettings.key, basesKey)).limit(1);
  const bases: AirtableBase[] = JSON.parse(rows[0]?.value ?? "[]");
  const activeBases = bases.filter(b => b.isActive);
  const results: SyncResult[] = [];

  for (const base of activeBases) {
    const result = await syncAirtableBase(base, organisationId);
    results.push(result);
    // Status is persisted inside syncAirtableBase
  }
  return results;
}
