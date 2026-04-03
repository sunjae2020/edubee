/**
 * onboardingService.ts
 *
 * Phase 1 Multi-Tenant Onboarding Service
 *
 * Phase 1 Note: Core tables (tax_rates, product_groups, product_types,
 * chart_of_accounts, teams, cost_centers, payment_infos) are currently global
 * (no organisation_id column). This service ensures global master data exists
 * and marks the organisation as onboarded.
 * Phase 2 will add organisation_id FKs to all core tables and migrate this to
 * per-tenant isolation.
 */

import { db } from "@workspace/db";
import {
  organisations,
  taxRates,
  productGroups,
  productTypes,
  teams,
  chartOfAccounts,
  costCenters,
  paymentInfos,
} from "@workspace/db/schema";
import { eq, count, sql } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SeedStatusItem = {
  count: number;
  required: number;
  ok: boolean;
};

export type SeedStatus = {
  organisationId: string;
  onboardedAt: Date | null;
  seedStatus: {
    taxRates:        SeedStatusItem;
    productGroups:   SeedStatusItem;
    productTypes:    SeedStatusItem;
    chartOfAccounts: SeedStatusItem;
    teams:           SeedStatusItem;
    costCenters:     SeedStatusItem;
    paymentInfos:    SeedStatusItem;
  };
  allComplete: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Tax Rates (3종 — GST 10%, Exempt, Zero-rated)
// UNIQUE on name → onConflictDoNothing is safe
// ─────────────────────────────────────────────────────────────────────────────

const TAX_RATE_SEEDS = [
  { name: "GST 10%",        rate: "0.1000", description: "Goods & Services Tax 10%", status: "Active" },
  { name: "GST Exempt",     rate: "0.0000", description: "GST Exempt supply",        status: "Active" },
  { name: "GST Zero-rated", rate: "0.0000", description: "GST Zero-rated supply",    status: "Active" },
];

async function seedTaxRates(tx: any): Promise<void> {
  await tx.insert(taxRates).values(TAX_RATE_SEEDS).onConflictDoNothing();
}

// ─────────────────────────────────────────────────────────────────────────────
// Product Groups (7종)
// UNIQUE on name → onConflictDoNothing is safe; returns name→id map
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCT_GROUP_SEEDS = [
  { name: "Language Course",   description: "어학 과정",          status: "Active" },
  { name: "Academic Program",  description: "학위 및 학업 과정",   status: "Active" },
  { name: "Vocational (VET)",  description: "직업 교육 훈련",      status: "Active" },
  { name: "Short Course",      description: "단기 연수 과정",      status: "Active" },
  { name: "Camp Program",      description: "캠프 프로그램",       status: "Active" },
  { name: "Placement Service", description: "배치 및 지원 서비스", status: "Active" },
  { name: "Support Service",   description: "생활 지원 서비스",    status: "Active" },
];

async function seedProductGroups(tx: any): Promise<Record<string, string>> {
  await tx.insert(productGroups).values(PRODUCT_GROUP_SEEDS).onConflictDoNothing();

  const rows = await tx
    .select({ id: productGroups.id, name: productGroups.name })
    .from(productGroups)
    .where(
      sql`${productGroups.name} IN (${PRODUCT_GROUP_SEEDS.map(s => `'${s.name}'`).join(",")})`,
    );

  return Object.fromEntries(rows.map((r: { id: string; name: string }) => [r.name, r.id]));
}

// ─────────────────────────────────────────────────────────────────────────────
// Product Types (14종 — serviceModuleType 매핑 포함)
// No UNIQUE on name → keep select-then-insert guard
// ─────────────────────────────────────────────────────────────────────────────

function buildProductTypeSeeds(pgIds: Record<string, string>) {
  return [
    { name: "General English",             productGroupId: pgIds["Language Course"],   serviceModuleType: "study_abroad"  },
    { name: "IELTS / Cambridge Prep",       productGroupId: pgIds["Language Course"],   serviceModuleType: "study_abroad"  },
    { name: "Undergraduate Degree",         productGroupId: pgIds["Academic Program"],  serviceModuleType: "study_abroad"  },
    { name: "Postgraduate Degree",          productGroupId: pgIds["Academic Program"],  serviceModuleType: "study_abroad"  },
    { name: "Foundation / Pathway",         productGroupId: pgIds["Academic Program"],  serviceModuleType: "study_abroad"  },
    { name: "Certificate / Diploma (VET)",  productGroupId: pgIds["Vocational (VET)"],  serviceModuleType: "study_abroad"  },
    { name: "Advanced Diploma",             productGroupId: pgIds["Vocational (VET)"],  serviceModuleType: "study_abroad"  },
    { name: "Short-term Study",             productGroupId: pgIds["Short Course"],      serviceModuleType: "study_abroad"  },
    { name: "Camp Program",                 productGroupId: pgIds["Camp Program"],      serviceModuleType: "camp"          },
    { name: "Airport Pickup",               productGroupId: pgIds["Placement Service"], serviceModuleType: "pickup"        },
    { name: "Accommodation (Homestay)",     productGroupId: pgIds["Placement Service"], serviceModuleType: "accommodation" },
    { name: "Internship / Work Experience", productGroupId: pgIds["Placement Service"], serviceModuleType: "internship"    },
    { name: "Settlement Service",           productGroupId: pgIds["Support Service"],   serviceModuleType: "settlement"    },
    { name: "Guardian Service",             productGroupId: pgIds["Support Service"],   serviceModuleType: "guardian"      },
  ].map(s => ({ ...s, status: "Active" }));
}

async function seedProductTypes(tx: any, pgIds: Record<string, string>): Promise<void> {
  const seeds = buildProductTypeSeeds(pgIds);
  for (const seed of seeds) {
    const exists = await tx
      .select({ id: productTypes.id })
      .from(productTypes)
      .where(sql`LOWER(${productTypes.name}) = LOWER(${seed.name})`)
      .limit(1);
    if (!exists.length) {
      await tx.insert(productTypes).values(seed);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart of Accounts (global — seeded once, verified here)
// Note: coa-seed.ts already runs this on startup. We verify it here.
// ─────────────────────────────────────────────────────────────────────────────

const COA_REQUIRED_COUNT = 18;

async function seedChartOfAccountsIfNeeded(tx: any): Promise<number> {
  const [{ cnt }] = await tx.select({ cnt: count() }).from(chartOfAccounts);
  if (Number(cnt) >= COA_REQUIRED_COUNT) return Number(cnt);

  const required = [
    { code: "1100", name: "Cash & Bank — Operating",       accountType: "asset"     },
    { code: "1200", name: "Trust Account",                  accountType: "asset"     },
    { code: "1300", name: "AR — Commission Receivable",     accountType: "asset"     },
    { code: "1400", name: "AR — Service Fee Receivable",    accountType: "asset"     },
    { code: "2100", name: "AP — Student Tuition Payable",   accountType: "liability" },
    { code: "2200", name: "AP — Visa Fee Payable",          accountType: "liability" },
    { code: "2300", name: "AP — Accommodation Payable",     accountType: "liability" },
    { code: "2400", name: "AP — Pickup Payable",            accountType: "liability" },
    { code: "2500", name: "AP — Other Service Payable",     accountType: "liability" },
    { code: "3100", name: "Commission — Tuition",           accountType: "revenue"   },
    { code: "3200", name: "Commission — Accommodation",     accountType: "revenue"   },
    { code: "3300", name: "Commission — Other",             accountType: "revenue"   },
    { code: "3400", name: "Service Fee — Study Abroad",     accountType: "revenue"   },
    { code: "3500", name: "Service Fee — Camp",             accountType: "revenue"   },
    { code: "3600", name: "Service Fee — Visa",             accountType: "revenue"   },
    { code: "3700", name: "Service Fee — Settlement",       accountType: "revenue"   },
    { code: "3800", name: "Service Fee — Internship",       accountType: "revenue"   },
    { code: "3900", name: "Service Fee — Other",            accountType: "revenue"   },
  ];
  await tx.insert(chartOfAccounts).values(required).onConflictDoNothing();

  const [{ cnt: after }] = await tx.select({ cnt: count() }).from(chartOfAccounts);
  return Number(after);
}

// ─────────────────────────────────────────────────────────────────────────────
// Teams — Default "Admin Team" (global for Phase 1)
// No UNIQUE on name → keep select-then-insert guard
// ─────────────────────────────────────────────────────────────────────────────

async function seedDefaultTeam(tx: any): Promise<void> {
  const exists = await tx
    .select({ id: teams.id })
    .from(teams)
    .where(sql`LOWER(${teams.name}) = 'admin team'`)
    .limit(1);
  if (!exists.length) {
    await tx.insert(teams).values({
      name: "Admin Team",
      description: "Default admin team — auto-created on onboarding",
      type: "internal",
      status: "active",
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cost Centers (4종 — General, Operations, Marketing, Finance)
// UNIQUE on code & name → onConflictDoNothing is safe
// ─────────────────────────────────────────────────────────────────────────────

const COST_CENTER_SEEDS = [
  { code: "GEN", name: "General",    description: "General operations",    status: "active" },
  { code: "OPS", name: "Operations", description: "Operations & Admin",    status: "active" },
  { code: "MKT", name: "Marketing",  description: "Marketing & Sales",     status: "active" },
  { code: "FIN", name: "Finance",    description: "Finance & Accounting",  status: "active" },
];

async function seedCostCenters(tx: any): Promise<void> {
  await tx.insert(costCenters).values(COST_CENTER_SEEDS).onConflictDoNothing();
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment Infos (3종 — Bank Transfer, Credit Card, Cash)
// UNIQUE on name → onConflictDoNothing is safe
// ─────────────────────────────────────────────────────────────────────────────

const PAYMENT_INFO_SEEDS = [
  { name: "Bank Transfer (AUD)", paymentMethod: "bank_transfer", currency: "AUD", isDefault: true,  status: "active", description: "Direct bank transfer in Australian Dollars" },
  { name: "Credit Card",         paymentMethod: "credit_card",   currency: "AUD", isDefault: false, status: "active", description: "Visa / Mastercard credit card payment"      },
  { name: "Cash",                paymentMethod: "cash",          currency: "AUD", isDefault: false, status: "active", description: "Cash payment"                               },
];

async function seedPaymentInfos(tx: any): Promise<void> {
  await tx.insert(paymentInfos).values(PAYMENT_INFO_SEEDS).onConflictDoNothing();
}

// ─────────────────────────────────────────────────────────────────────────────
// Main onboardTenant function
// ─────────────────────────────────────────────────────────────────────────────

export async function onboardTenant(organisationId: string): Promise<void> {
  console.log(`[Onboarding] Starting onboarding for tenant: ${organisationId}`);

  await db.transaction(async (tx) => {
    // ① Tax Rates
    await seedTaxRates(tx);
    console.log(`[Onboarding] Tax Rates: seeded (onConflictDoNothing)`);

    // ② Product Groups (returns name→id map for use in Product Types)
    const pgIds = await seedProductGroups(tx);
    console.log(`[Onboarding] Product Groups: ensured ${Object.keys(pgIds).length} groups`);

    // ③ Product Types (depends on pgIds)
    await seedProductTypes(tx, pgIds);
    console.log(`[Onboarding] Product Types: seeded`);

    // ④ Chart of Accounts (global, runs coa-seed equivalent)
    const coaCount = await seedChartOfAccountsIfNeeded(tx);
    console.log(`[Onboarding] Chart of Accounts: ${coaCount} total records`);

    // ⑤ Default Team
    await seedDefaultTeam(tx);
    console.log(`[Onboarding] Teams: default team ensured`);

    // ⑥ Cost Centers
    await seedCostCenters(tx);
    console.log(`[Onboarding] Cost Centers: seeded (onConflictDoNothing)`);

    // ⑦ Payment Infos
    await seedPaymentInfos(tx);
    console.log(`[Onboarding] Payment Infos: seeded (onConflictDoNothing)`);

    // Mark organisation as onboarded
    await tx
      .update(organisations)
      .set({ onboardedAt: new Date() })
      .where(eq(organisations.id, organisationId));

    console.log(`[Onboarding] ✅ Tenant ${organisationId} onboarded successfully`);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// getSeedStatus — for /api/superadmin/tenants/:id/seed-status
// ─────────────────────────────────────────────────────────────────────────────

export async function getSeedStatus(organisationId: string): Promise<SeedStatus> {
  const [org] = await db
    .select({ onboardedAt: organisations.onboardedAt })
    .from(organisations)
    .where(eq(organisations.id, organisationId))
    .limit(1);

  const [taxCount]     = await db.select({ cnt: count() }).from(taxRates);
  const [pgCount]      = await db.select({ cnt: count() }).from(productGroups);
  const [ptCount]      = await db.select({ cnt: count() }).from(productTypes);
  const [coaCount]     = await db.select({ cnt: count() }).from(chartOfAccounts);
  const [teamCount]    = await db.select({ cnt: count() }).from(teams);
  const [ccCount]      = await db.select({ cnt: count() }).from(costCenters);
  const [piCount]      = await db.select({ cnt: count() }).from(paymentInfos);

  const status = {
    taxRates:        { count: Number(taxCount.cnt),  required: 3,  ok: Number(taxCount.cnt)  >= 3  },
    productGroups:   { count: Number(pgCount.cnt),   required: 7,  ok: Number(pgCount.cnt)   >= 7  },
    productTypes:    { count: Number(ptCount.cnt),   required: 14, ok: Number(ptCount.cnt)   >= 14 },
    chartOfAccounts: { count: Number(coaCount.cnt),  required: 18, ok: Number(coaCount.cnt)  >= 18 },
    teams:           { count: Number(teamCount.cnt), required: 1,  ok: Number(teamCount.cnt) >= 1  },
    costCenters:     { count: Number(ccCount.cnt),   required: 4,  ok: Number(ccCount.cnt)   >= 4  },
    paymentInfos:    { count: Number(piCount.cnt),   required: 3,  ok: Number(piCount.cnt)   >= 3  },
  };

  return {
    organisationId,
    onboardedAt: org?.onboardedAt ?? null,
    seedStatus: status,
    allComplete: Object.values(status).every(s => s.ok),
  };
}
