import { db, staticDb } from "@workspace/db";
import {
  platformSettings, users, contacts, accounts, account_contacts,
  contracts, contractProducts, airtableSyncMap, transactions,
  packageGroups, packages,
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
): Promise<{ synced: number; skipped: number }> {
  const records = await fetchAllRecords(token, baseId, "Staff");
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
): Promise<{ synced: number; created: number; failed: number }> {
  const records = await fetchAllRecords(token, baseId, "Student");
  let synced = 0, created = 0, failed = 0;

  for (const rec of records) {
    try {
      const f = rec.fields;
      const firstName: string = (f["First Name"] ?? "").trim();
      const lastName: string  = (f["Last Name"]  ?? "").trim();
      const email: string     = (f["Email Address"] ?? "").trim().toLowerCase();
      if (!firstName && !lastName) continue;

      const existingCrmId = await findCrmId(baseId, "Student", rec.id);

      if (existingCrmId) {
        await db.update(accounts).set({
          name: `${firstName} ${lastName}`.trim(),
          email: email || undefined,
          modifiedOn: new Date(),
        }).where(eq(accounts.id, existingCrmId));
        synced++;
      } else {
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

        // Link contact to account — ignore if already exists
        await db.insert(account_contacts).values({
          accountId: account.id,
          contactId: contact.id,
          role: "Primary",
        }).onConflictDoNothing();

        await upsertSyncMap({ airtableBaseId: baseId, airtableTable: "Student", airtableRecordId: rec.id, crmTable: "accounts", crmId: account.id, organisationId });
        created++;
      }
    } catch (err: any) {
      console.error(`[Airtable] syncStudent record ${rec.id} failed:`, err.message);
      failed++;
    }
  }
  return { synced, created, failed };
}

// ── Sync: Partner → contacts + accounts ──────────────────────────────────────
async function syncPartner(
  token: string, baseId: string, organisationId: string, ownerId: string,
): Promise<{ synced: number; created: number; failed: number }> {
  const records = await fetchAllRecords(token, baseId, "Partner");
  let synced = 0, created = 0, failed = 0;

  for (const rec of records) {
    try {
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

        // Link contact to account — ignore if already exists
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
): Promise<{ synced: number; created: number; failed: number }> {
  const records = await fetchAllRecords(token, baseId, "Contract");
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
): Promise<{ synced: number; created: number; failed: number }> {
  const records = await fetchAllRecords(token, baseId, "Contract Products");
  let synced = 0, created = 0, failed = 0;

  const cpStatusMap: Record<string, string> = {
    "Enrolled": "active", "Completed": "completed",
    "Cancelled": "cancelled", "Pending": "pending",
  };

  for (const rec of records) {
    try {
      const f = rec.fields;

      const contractRecIds: string[] = f["Contract Name"] ?? [];
      if (contractRecIds.length === 0) continue;
      const contractId = await findCrmId(baseId, "Contract", contractRecIds[0]);
      if (!contractId) continue;

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
    } catch (err: any) {
      console.error(`[Airtable] syncContractProducts record ${rec.id} failed:`, err.message);
      failed++;
    }
  }
  return { synced, created, failed };
}

// ── Sync: Payments → transactions ────────────────────────────────────────────
async function syncPayments(
  token: string, baseId: string, organisationId: string,
): Promise<{ synced: number; created: number; failed: number }> {
  const records = await fetchAllRecords(token, baseId, "Payments");
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

  const crmToAirtable: Record<string, string> = {
    active: "Active", completed: "Completed",
    cancelled: "Cancelled", draft: "Draft", pending: "Pending",
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

// ── Sync: Package Groups → package_groups ────────────────────────────────────
async function syncPackageGroups(
  token: string, baseId: string, organisationId: string,
): Promise<{ synced: number; created: number; failed: number }> {
  const records = await fetchAllRecords(token, baseId, "Package Groups");
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

      // Resolve linked account names (Institute, Accommodation, Tour Company, Pickup Driver)
      const instituteName  = Array.isArray(f["Institute"])  ? null : null; // linked IDs, store display name via lookup
      const accommodation  = f["Accommodation (from Package Group)"]?.[0] ?? null;
      const tourCompany    = f["Tour Company"]  ? String(f["Tour Company"]).trim() : null;
      const pickupDriver   = f["Pickup Driver"] ? String(f["Pickup Driver"]).trim() : null;

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
): Promise<{ synced: number; created: number; failed: number }> {
  const records = await fetchAllRecords(token, baseId, "Packages");
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

      const upsertData = {
        packageGroupId,
        name:             packageName,
        durationDays:     0, // Airtable stores as text weeks, default 0
        packageOption:    packageOption || null,
        packageCode:      f["Product ID"] ?? null,
        kakaoName:        f["Kakao Name"] ?? null,
        priceAud:         packageFee != null ? String(packageFee) : null,
        agentCommissionFixed: agentComm != null ? String(agentComm) : null,
        netPrice:         netPrice != null ? String(netPrice) : null,
        revenue:          revenue != null ? String(revenue) : null,
        priceKrw:         feeKrw != null ? String(Math.round(Number(feeKrw))) : null,
        agentCommKrw:     commKrw != null ? String(Math.round(Number(commKrw))) : null,
        roomType:         f["Room Type"] ?? null,
        pricePerNight:    f["Per/Night"] != null ? String(f["Per/Night"]) : null,
        checkInDate:      f["Check-In"] ?? null,
        checkOutDate:     f["Check-Out"] ?? null,
        schoolStartDate:  f["School Start Date"] ?? null,
        schoolDuration:   f["School Duration"] ?? null,
        pickupDate:       f["Pickup Date"] ?? null,
        pickupFee:        f["Pickup Fee"] != null ? String(f["Pickup Fee"]) : null,
        dropDate:         f["Drop Date"] ?? null,
        dropFee:          f["Drop Fee"] != null ? String(f["Drop Fee"]) : null,
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
      console.error(`[Airtable] syncPackages record ${rec.id} failed:`, err.message);
      failed++;
    }
  }
  return { synced, created, failed };
}

// ── Sync: Camp MGT → contracts ────────────────────────────────────────────────
async function syncCampContracts(
  token: string, baseId: string, organisationId: string,
): Promise<{ synced: number; created: number; failed: number }> {
  const records = await fetchAllRecords(token, baseId, "Camp MGT");
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
      // All syncs wrapped individually — gracefully skip tables that don't exist in this base
      try { details.staff = await syncStaff(token, base.baseId, organisationId); }
      catch (e: any) { if (!e.message?.includes("403")) throw e; }

      try { details.student = await syncStudent(token, base.baseId, organisationId, ownerId); }
      catch (e: any) { if (!e.message?.includes("403")) throw e; }

      try { details.partner = await syncPartner(token, base.baseId, organisationId, ownerId); }
      catch (e: any) { if (!e.message?.includes("403")) throw e; }

      // Camp CRM: Package Groups → Packages → Contracts (order matters)
      try { details.packageGroups = await syncPackageGroups(token, base.baseId, organisationId); }
      catch (e: any) { if (!e.message?.includes("403")) throw e; }

      try { details.packages = await syncPackages(token, base.baseId, organisationId); }
      catch (e: any) { if (!e.message?.includes("403")) throw e; }

      try { details.campContracts = await syncCampContracts(token, base.baseId, organisationId); }
      catch (e: any) { if (!e.message?.includes("403")) throw e; }

      try { details.contract = await syncContracts(token, base.baseId, organisationId, ownerId); }
      catch (e: any) { if (!e.message?.includes("403")) throw e; }

      try { details.contractProducts = await syncContractProducts(token, base.baseId, organisationId); }
      catch (e: any) { if (!e.message?.includes("403")) throw e; }

      try { details.payments = await syncPayments(token, base.baseId, organisationId); }
      catch (e: any) { if (!e.message?.includes("403")) throw e; }
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
  const rows = await staticDb.select().from(platformSettings)
    .where(eq(platformSettings.key, basesKey)).limit(1);
  const bases: AirtableBase[] = JSON.parse(rows[0]?.value ?? "[]");
  const activeBases = bases.filter(b => b.isActive);
  const results: SyncResult[] = [];

  for (const base of activeBases) {
    const result = await syncAirtableBase(base, organisationId);
    results.push(result);

    // Refresh from DB to avoid stale overwrite
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
  }
  return results;
}
