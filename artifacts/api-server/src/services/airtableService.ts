import { db } from "@workspace/db";
import {
  platformSettings, users, contacts, accounts, account_contacts,
  contracts, contractProducts, airtableSyncMap, transactions,
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
  const rows = await db.select().from(platformSettings)
    .where(eq(platformSettings.key, key)).limit(1);
  const enc = rows[0]?.value ?? null;
  const token = decryptField(enc);
  if (!token) throw new Error(`Airtable token not configured for org ${organisationId}`);
  return token;
}

async function fetchAirtable(token: string, path: string): Promise<any> {
  const res = await fetch(`https://api.airtable.com/v0${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Airtable API ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function writeAirtable(
  token: string, method: "POST" | "PATCH",
  baseId: string, table: string, recordId: string | null, fields: Record<string, any>,
): Promise<string> {
  const url = recordId
    ? `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${recordId}`
    : `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Airtable write ${table} → ${res.status}: ${await res.text()}`);
  const data: any = await res.json();
  return data.id as string;
}

async function fetchAllRecords(token: string, baseId: string, table: string): Promise<any[]> {
  const records: any[] = [];
  let offset: string | undefined;
  do {
    const qs = offset ? `?offset=${offset}` : "";
    const data = await fetchAirtable(token, `/v0/${baseId}/${encodeURIComponent(table)}${qs}`);
    records.push(...(data.records ?? []));
    offset = data.offset;
  } while (offset);
  return records;
}

// ── Sync map helpers ──────────────────────────────────────────────────────────
async function findCrmId(
  airtableBaseId: string, airtableTable: string, airtableRecordId: string,
): Promise<string | null> {
  const rows = await db.select({ crmId: airtableSyncMap.crmId })
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
  const rows = await db.select({ recId: airtableSyncMap.airtableRecordId })
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
  await db.insert(airtableSyncMap).values({
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
    SELECT id FROM users
    WHERE organisation_id = ${organisationId}
      AND role IN ('super_admin', 'admin')
      AND status = 'active'
    ORDER BY created_at ASC LIMIT 1
  `);
  const id = (rows.rows[0] as any)?.id;
  if (!id) throw new Error("No admin user found for organisation");
  return id;
}

// ── Sync: Staff → users ───────────────────────────────────────────────────────
async function syncStaff(
  token: string, baseId: string, organisationId: string,
): Promise<{ synced: number; skipped: number }> {
  const records = await fetchAllRecords(token, baseId, "Staff");
  let synced = 0, skipped = 0;

  for (const rec of records) {
    const f = rec.fields;
    const email: string | undefined = f["Email"]?.trim().toLowerCase();
    if (!email) { skipped++; continue; }

    // Find existing user by email in this org
    const existing = await db.select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), eq(users.organisationId, organisationId)))
      .limit(1);

    if (existing.length > 0) {
      // Update name/phone if changed
      await db.update(users).set({
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
): Promise<{ synced: number; created: number }> {
  const records = await fetchAllRecords(token, baseId, "Student");
  let synced = 0, created = 0;

  for (const rec of records) {
    const f = rec.fields;
    const firstName: string = (f["First Name"] ?? "").trim();
    const lastName: string  = (f["Last Name"]  ?? "").trim();
    const email: string     = (f["Email Address"] ?? "").trim().toLowerCase();
    if (!firstName && !lastName) continue;

    const existingCrmId = await findCrmId(baseId, "Student", rec.id);

    if (existingCrmId) {
      // Update existing account
      await db.update(accounts).set({
        name: `${firstName} ${lastName}`.trim(),
        email: email || undefined,
        modifiedOn: new Date(),
      }).where(eq(accounts.id, existingCrmId));
      synced++;
    } else {
      // Create contact first
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

      // Create account
      const [account] = await db.insert(accounts).values({
        name:             `${firstName} ${lastName}`.trim(),
        accountType:      "Student",
        email:            email || undefined,
        primaryContactId: contact.id,
        ownerId,
        status:           "Active",
        organisationId,
      }).returning({ id: accounts.id });

      // Link contact to account
      await db.insert(account_contacts).values({
        accountId: account.id,
        contactId: contact.id,
        role: "Primary",
      });

      await upsertSyncMap({ airtableBaseId: baseId, airtableTable: "Student", airtableRecordId: rec.id, crmTable: "accounts", crmId: account.id, organisationId });
      created++;
    }
  }
  return { synced, created };
}

// ── Sync: Partner → contacts + accounts ──────────────────────────────────────
async function syncPartner(
  token: string, baseId: string, organisationId: string, ownerId: string,
): Promise<{ synced: number; created: number }> {
  const records = await fetchAllRecords(token, baseId, "Partner");
  let synced = 0, created = 0;

  for (const rec of records) {
    const f = rec.fields;
    const partnerName: string = (f["Partner Name"] ?? "").trim();
    if (!partnerName) continue;

    const existingCrmId = await findCrmId(baseId, "Partner", rec.id);

    if (existingCrmId) {
      await db.update(accounts).set({
        name:       partnerName,
        email:      f["Company Email"] ?? undefined,
        phoneNumber: f["Contact Number"] ?? undefined,
        website:    f["Website"] ?? undefined,
        address:    f["Address"] ?? undefined,
        country:    f["Country"] ?? undefined,
        modifiedOn: new Date(),
      }).where(eq(accounts.id, existingCrmId));
      synced++;
    } else {
      // Contact person info
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
      });

      await upsertSyncMap({ airtableBaseId: baseId, airtableTable: "Partner", airtableRecordId: rec.id, crmTable: "accounts", crmId: account.id, organisationId });
      created++;
    }
  }
  return { synced, created };
}

// ── Sync: Contract → contracts ────────────────────────────────────────────────
async function syncContracts(
  token: string, baseId: string, organisationId: string, ownerId: string,
): Promise<{ synced: number; created: number }> {
  const records = await fetchAllRecords(token, baseId, "Contract");
  let synced = 0, created = 0;

  // Airtable status → CRM status mapping
  const statusMap: Record<string, string> = {
    "Active": "active", "Completed": "completed",
    "Cancelled": "cancelled", "Draft": "draft",
    "Pending": "pending",
  };

  for (const rec of records) {
    const f = rec.fields;

    // Resolve student account from linked record
    const studentRecIds: string[] = f["Student ID"] ?? [];
    let studentAccountId: string | null = null;
    if (studentRecIds.length > 0) {
      studentAccountId = await findCrmId(baseId, "Student", studentRecIds[0]);
    }

    // Resolve staff user from linked record
    const staffRecIds: string[] = f["Staff"] ?? [];
    let resolvedOwnerId = ownerId;
    if (staffRecIds.length > 0) {
      const staffCrmId = await findCrmId(baseId, "Staff", staffRecIds[0]);
      if (staffCrmId) resolvedOwnerId = staffCrmId;
    }

    // Student name from lookup fields
    const firstNames: string[] = f["First Name"] ?? [];
    const lastNames: string[]  = f["Last Name"]  ?? [];
    const studentName = [firstNames[0], lastNames[0]].filter(Boolean).join(" ") || null;

    const crmStatus = statusMap[f["Contract Status"]] ?? "draft";

    const existingCrmId = await findCrmId(baseId, "Contract", rec.id);

    if (existingCrmId) {
      await db.update(contracts).set({
        status:          crmStatus,
        startDate:       f["Contract Start Date"] ?? undefined,
        endDate:         f["Contract End Date"] ?? undefined,
        courseStartDate: f["Contract Start Date"] ?? undefined,
        courseEndDate:   f["Contract End Date"] ?? undefined,
        studentName:     studentName ?? undefined,
        accountId:       studentAccountId ?? undefined,
        updatedAt:       new Date(),
      }).where(eq(contracts.id, existingCrmId));
      synced++;
    } else {
      const [contract] = await db.insert(contracts).values({
        status:          crmStatus,
        startDate:       f["Contract Start Date"] ?? undefined,
        endDate:         f["Contract End Date"] ?? undefined,
        courseStartDate: f["Contract Start Date"] ?? undefined,
        courseEndDate:   f["Contract End Date"] ?? undefined,
        studentName:     studentName ?? undefined,
        accountId:       studentAccountId ?? undefined,
        currency:        "AUD",
        organisationId,
      }).returning({ id: contracts.id });

      await upsertSyncMap({ airtableBaseId: baseId, airtableTable: "Contract", airtableRecordId: rec.id, crmTable: "contracts", crmId: contract.id, organisationId });
      created++;
    }
  }
  return { synced, created };
}

// ── Sync: Contract Products → contract_products ───────────────────────────────
async function syncContractProducts(
  token: string, baseId: string, organisationId: string,
): Promise<{ synced: number; created: number }> {
  const records = await fetchAllRecords(token, baseId, "Contract Products");
  let synced = 0, created = 0;

  const cpStatusMap: Record<string, string> = {
    "Enrolled": "active", "Completed": "completed",
    "Cancelled": "cancelled", "Pending": "pending",
  };

  for (const rec of records) {
    const f = rec.fields;

    // Resolve contract
    const contractRecIds: string[] = f["Contract Name"] ?? [];
    if (contractRecIds.length === 0) continue;
    const contractId = await findCrmId(baseId, "Contract", contractRecIds[0]);
    if (!contractId) continue; // contract not synced yet

    // Resolve provider (partner)
    const providerRecIds: string[] = f["Provider"] ?? [];
    let providerAccountId: string | null = null;
    if (providerRecIds.length > 0) {
      providerAccountId = await findCrmId(baseId, "Partner", providerRecIds[0]);
    }

    const productName: string = (f["Course(Product) Name"] ?? f["CP Name"] ?? "").trim();
    const unitPrice   = f["Standard Fee"] ?? null;
    const totalPrice  = f["Payable"] ?? null;
    const commAmount  = f["Comm Amount"] ?? null;
    const gstAmount   = f["GST Amount"] ?? null;
    const grossAmount = f["Total Amount"] ?? null;
    const arDueDate   = f["Due Date(Service Start)"] ?? null;
    const apDueDate   = f["Payment Date"] ?? null;
    const crmStatus   = cpStatusMap[f["Status"]] ?? "pending";
    const currency    = f["Currency"] ?? "AUD";
    const existingCrmId = await findCrmId(baseId, "Contract Products", rec.id);

    if (existingCrmId) {
      await db.update(contractProducts).set({
        name:             productName || undefined,
        unitPrice:        unitPrice != null ? String(unitPrice) : undefined,
        totalPrice:       totalPrice != null ? String(totalPrice) : undefined,
        commissionAmount: commAmount != null ? String(commAmount) : undefined,
        gstAmount:        gstAmount != null ? String(gstAmount) : undefined,
        grossAmount:      grossAmount != null ? String(grossAmount) : undefined,
        arDueDate:        arDueDate ?? undefined,
        apDueDate:        apDueDate ?? undefined,
        status:           crmStatus,
        providerAccountId: providerAccountId ?? undefined,
      }).where(eq(contractProducts.id, existingCrmId));
      synced++;
    } else {
      const [cp] = await db.insert(contractProducts).values({
        contractId,
        organisationId,
        name:             productName || "Unnamed Product",
        unitPrice:        unitPrice != null ? String(unitPrice) : null,
        totalPrice:       totalPrice != null ? String(totalPrice) : null,
        arAmount:         totalPrice != null ? String(totalPrice) : null,
        apAmount:         commAmount != null ? String(commAmount) : null,
        commissionAmount: commAmount != null ? String(commAmount) : null,
        gstAmount:        gstAmount != null ? String(gstAmount) : null,
        grossAmount:      grossAmount != null ? String(grossAmount) : null,
        arDueDate:        arDueDate ?? undefined,
        apDueDate:        apDueDate ?? undefined,
        status:           crmStatus,
        arStatus:         "scheduled",
        apStatus:         "pending",
        providerAccountId: providerAccountId ?? undefined,
        sortIndex:        0,
      }).returning({ id: contractProducts.id });

      await upsertSyncMap({ airtableBaseId: baseId, airtableTable: "Contract Products", airtableRecordId: rec.id, crmTable: "contract_products", crmId: cp.id, organisationId });
      created++;
    }
  }
  return { synced, created };
}

// ── Sync: Payments → transactions ────────────────────────────────────────────
async function syncPayments(
  token: string, baseId: string, organisationId: string,
): Promise<{ synced: number; created: number }> {
  const records = await fetchAllRecords(token, baseId, "Payments");
  let synced = 0, created = 0;

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
    const f = rec.fields;
    const paymentDate: string | null = f["Payment Date"] ?? null;
    const amountPaid: number | null  = f["Amount Paid"] ?? null;
    if (!paymentDate && !amountPaid) continue;

    // Resolve contract via Payment ID → Contract Reference string match
    // (Airtable Payments table links to contract by text reference, not linked record)
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
  }
  return { synced, created };
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

  const crmToAirtable: Record<string, string> = {
    active: "Active", completed: "Completed",
    cancelled: "Cancelled", draft: "Draft", pending: "Pending",
  };

  let pushed = 0, created = 0;

  for (const contract of rows) {
    // Resolve Airtable student record ID
    let studentAirtableId: string | null = null;
    if (contract.accountId) {
      studentAirtableId = await findAirtableId(baseId, "Student", contract.accountId);
    }

    const fields: Record<string, any> = {
      "Contract Status": crmToAirtable[contract.status ?? "draft"] ?? "Draft",
      "Contract Start Date": contract.startDate ?? undefined,
      "Contract End Date":   contract.endDate ?? undefined,
    };
    if (studentAirtableId) fields["Student ID"] = [studentAirtableId];

    const existingAirtableId = await findAirtableId(baseId, "Contract", contract.id);

    if (existingAirtableId) {
      await writeAirtable(token, "PATCH", baseId, "Contract", existingAirtableId, fields);
      pushed++;
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
      await writeAirtable(token, "PATCH", baseId, "Contract Products", existingId, fields);
      pushed++;
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

// ── Main sync function ────────────────────────────────────────────────────────
export interface SyncResult {
  baseId: string;
  baseName: string;
  success: boolean;
  error?: string;
  elapsed: number;
  details: Record<string, { synced?: number; created?: number; skipped?: number; pushed?: number }>;
}

export async function syncAirtableBase(base: AirtableBase, organisationId: string): Promise<SyncResult> {
  const start = Date.now();
  const details: SyncResult["details"] = {};

  try {
    const token = await getToken(organisationId);
    const ownerId = await getDefaultOwner(organisationId);

    if (base.syncDirection === "inbound" || base.syncDirection === "both") {
      details.staff            = await syncStaff(token, base.baseId, organisationId);
      details.student          = await syncStudent(token, base.baseId, organisationId, ownerId);
      details.partner          = await syncPartner(token, base.baseId, organisationId, ownerId);
      details.contract         = await syncContracts(token, base.baseId, organisationId, ownerId);
      details.contractProducts = await syncContractProducts(token, base.baseId, organisationId);
      details.payments         = await syncPayments(token, base.baseId, organisationId);
    }

    if (base.syncDirection === "outbound" || base.syncDirection === "both") {
      details.contractOut         = await syncContractsOutbound(token, base.baseId, organisationId);
      details.contractProductsOut = await syncContractProductsOutbound(token, base.baseId, organisationId);
    }

    console.log(`[Airtable] Sync complete for ${base.name}: ${JSON.stringify(details)}`);
    return { baseId: base.id, baseName: base.name, success: true, elapsed: Date.now() - start, details };
  } catch (err: any) {
    console.error(`[Airtable] Sync failed for ${base.name}:`, err);
    return { baseId: base.id, baseName: base.name, success: false, error: err.message, elapsed: Date.now() - start, details };
  }
}

// ── Sync all active bases for an organisation ─────────────────────────────────
export async function syncAllBases(organisationId: string): Promise<SyncResult[]> {
  const basesKey = `airtable.bases.${organisationId}`;
  const rows = await db.select().from(platformSettings)
    .where(eq(platformSettings.key, basesKey)).limit(1);
  const bases: AirtableBase[] = JSON.parse(rows[0]?.value ?? "[]");
  const activeBases = bases.filter(b => b.isActive);
  const results: SyncResult[] = [];

  for (const base of activeBases) {
    const result = await syncAirtableBase(base, organisationId);
    results.push(result);

    // Refresh from DB to avoid stale overwrite
    const fresh = await db.select().from(platformSettings)
      .where(eq(platformSettings.key, basesKey)).limit(1);
    const all: AirtableBase[] = JSON.parse(fresh[0]?.value ?? "[]");
    const idx = all.findIndex(b => b.id === base.id);
    if (idx !== -1) {
      all[idx].lastSyncedAt    = new Date().toISOString();
      all[idx].lastSyncStatus  = result.success ? "success" : "error";
      all[idx].lastSyncMessage = result.success
        ? `Synced: ${JSON.stringify(result.details)}`
        : result.error ?? "Unknown error";
      await db.insert(platformSettings)
        .values({ key: basesKey, value: JSON.stringify(all), updatedAt: new Date() })
        .onConflictDoUpdate({ target: platformSettings.key, set: { value: JSON.stringify(all), updatedAt: new Date() } });
    }
  }
  return results;
}
