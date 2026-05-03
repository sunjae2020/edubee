import { db } from "@workspace/db";
import { chartOfAccounts } from "@workspace/db/schema";

const COA_ROWS: Array<{ code: string; name: string; accountType: string }> = [
  { code: "1100", name: "Cash & Bank — Operating",        accountType: "asset"     },
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
  { code: "4100", name: "Sub-agent Commission",           accountType: "cogs"      },
  { code: "4200", name: "Super-agent Commission",         accountType: "cogs"      },
  { code: "4300", name: "Referral Fee",                   accountType: "cogs"      },
  { code: "4400", name: "Direct — Pickup Cost",           accountType: "cogs"      },
  { code: "4500", name: "Direct — Accommodation Cost",    accountType: "cogs"      },
  { code: "4600", name: "Direct — Tour Cost",             accountType: "cogs"      },
  { code: "4700", name: "Direct — Other",                 accountType: "cogs"      },
  { code: "5100", name: "Rent",                           accountType: "expense"   },
  { code: "5200", name: "Salary",                         accountType: "expense"   },
  { code: "5300", name: "Incentive",                      accountType: "expense"   },
  { code: "5400", name: "Marketing",                      accountType: "expense"   },
  { code: "5500", name: "Communication",                  accountType: "expense"   },
  { code: "5600", name: "Transport",                      accountType: "expense"   },
  { code: "5700", name: "Office Supplies",                accountType: "expense"   },
  { code: "5800", name: "Bank Charges",                   accountType: "expense"   },
  { code: "5900", name: "Other Expenses",                 accountType: "expense"   },
];

// Seed CoA for a specific tenant. Per-tenant isolation: each org owns its
// own copy. ON CONFLICT (organisation_id, code) DO NOTHING.
export async function seedChartOfAccounts(organisationId: string) {
  try {
    await db
      .insert(chartOfAccounts)
      .values(COA_ROWS.map((r) => ({ ...r, organisationId })))
      .onConflictDoNothing({ target: [chartOfAccounts.organisationId, chartOfAccounts.code] });

    console.log(`[CoA Seed] Chart of accounts seeded for org ${organisationId}`);
  } catch (err) {
    console.error("[CoA Seed] Failed to seed chart of accounts:", err);
  }
}
