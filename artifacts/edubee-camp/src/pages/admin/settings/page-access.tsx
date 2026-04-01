import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Lock, Save, Menu } from "lucide-react";
import MenuAllocationTab from "@/components/shared/MenuAllocationTab";

const ROLES = [
  { key: "super_admin",    label: "Super Admin",  locked: true },
  { key: "admin",          label: "Admin"                      },
  { key: "finance",        label: "Finance"                    },
  { key: "admission",      label: "Admission"                  },
  { key: "team_manager",   label: "Team Manager"               },
  { key: "consultant",     label: "Consultant"                 },
  { key: "camp_coordinator", label: "Camp Coord."              },
];

const PAGES = [
  // ── Dashboard ──────────────────────────────────────────────────────────
  { slug: "dashboard",              label: "Dashboard",           group: "Dashboard"  },
  // ── CRM ───────────────────────────────────────────────────────────────
  { slug: "crm/contacts",           label: "Contacts",            group: "CRM"        },
  { slug: "crm/accounts",           label: "Accounts",            group: "CRM"        },
  { slug: "crm/leads",              label: "Leads",               group: "CRM"        },
  { slug: "crm/quotes",             label: "Quotes",              group: "CRM"        },
  { slug: "crm/contracts",          label: "Contracts",           group: "CRM"        },
  { slug: "services/tasks",         label: "Tasks & CS",          group: "CRM"        },
  // ── Sales ─────────────────────────────────────────────────────────────
  { slug: "applications",           label: "Applications",        group: "Sales"      },
  { slug: "documents",              label: "Documents",           group: "Sales"      },
  // ── Camp ──────────────────────────────────────────────────────────────
  { slug: "package-groups",         label: "Package Groups",      group: "Camp"       },
  { slug: "packages",               label: "Packages",            group: "Camp"       },
  { slug: "enrollment-spots",       label: "Enrollment Spots",    group: "Camp"       },
  { slug: "camp-applications",      label: "Camp Application",    group: "Camp"       },
  { slug: "camp-contracts",         label: "Camp Contract",       group: "Camp"       },
  { slug: "services/institute",     label: "Institute / Study",   group: "Camp"       },
  { slug: "services/hotel",         label: "Hotel",               group: "Camp"       },
  { slug: "services/pickup",        label: "Pickup / Transfer",   group: "Camp"       },
  { slug: "services/tour",          label: "Tour",                group: "Camp"       },
  { slug: "services/interviews",    label: "Interviews",          group: "Camp"       },
  // ── Services ──────────────────────────────────────────────────────────
  { slug: "services/study-abroad",  label: "Study Abroad",        group: "Services"   },
  { slug: "services/accommodation", label: "Accommodation",       group: "Services"   },
  { slug: "services/internship",    label: "Internship",          group: "Services"   },
  { slug: "services/guardian",      label: "Guardian",            group: "Services"   },
  { slug: "services/settlement",    label: "Settlement",          group: "Services"   },
  { slug: "services/other",         label: "Other Services",      group: "Services"   },
  // ── Products ──────────────────────────────────────────────────────────
  { slug: "product-groups",         label: "Products Group",      group: "Products"   },
  { slug: "product-types",          label: "Products Type",       group: "Products"   },
  { slug: "products",               label: "Products",            group: "Products"   },
  { slug: "promotions",             label: "Promotion",           group: "Products"   },
  { slug: "commissions",            label: "Commission",          group: "Products"   },
  // ── Finance ───────────────────────────────────────────────────────────
  { slug: "accounting/invoices",        label: "Invoices",            group: "Finance"    },
  { slug: "accounting/receipts",        label: "Receipts",            group: "Finance"    },
  { slug: "accounting/payments",        label: "Payments",            group: "Finance"    },
  { slug: "accounting/transactions",    label: "Transactions",        group: "Finance"    },
  { slug: "accounting/ar-ap",           label: "AR / AP Tracker",     group: "Finance"    },
  { slug: "accounting/journal",         label: "Journal Entries",     group: "Finance"    },
  { slug: "accounting/tax-invoices",    label: "Tax Invoices",        group: "Finance"    },
  { slug: "accounting/coa",             label: "Chart of Accounts",   group: "Finance"    },
  { slug: "accounting/exchange-rates",  label: "Exchange Rates",      group: "Finance"    },
  { slug: "my-accounting/settlements",  label: "My Settlements",      group: "Finance"    },
  { slug: "my-accounting/invoices",     label: "My Invoices",         group: "Finance"    },
  { slug: "my-accounting/revenue",      label: "My Revenue",          group: "Finance"    },
  // ── Reports ───────────────────────────────────────────────────────────
  { slug: "reports",                label: "Program Reports",     group: "Reports"    },
  // ── AI Assistant ──────────────────────────────────────────────────────
  { slug: "chatbot",                label: "AI Chatbot",          group: "AI"         },
  // ── Admin ─────────────────────────────────────────────────────────────
  { slug: "users",                  label: "Users",               group: "Admin"      },
  { slug: "my-programs",            label: "My Programs",         group: "Admin"      },
  // ── Settings ──────────────────────────────────────────────────────────
  { slug: "settings/general",            label: "General",             group: "Settings"   },
  { slug: "settings/page-access",        label: "Page Access",         group: "Settings"   },
  { slug: "settings/field-permissions",  label: "Field Permissions",   group: "Settings"   },
  { slug: "settings/doc-permissions",    label: "Doc Permissions",     group: "Settings"   },
  { slug: "settings/impersonation-logs", label: "Impersonation Logs",  group: "Settings"   },
  { slug: "settings/data-manager",       label: "Data Manager",        group: "Settings"   },
];

const CC_PAGES = [
  "dashboard","crm/contacts","crm/accounts","crm/leads","crm/quotes","crm/contracts","services/tasks",
  "applications","documents",
  "package-groups","packages","enrollment-spots","camp-applications","camp-contracts",
  "services/institute","services/hotel","services/pickup","services/tour","services/interviews",
  "services/study-abroad","services/accommodation","services/internship","services/guardian","services/settlement","services/other",
  "my-accounting/settlements","my-accounting/invoices","my-accounting/revenue",
  "reports",
];

const EA_PAGES = [
  "dashboard","services/tasks","applications",
  "my-accounting/settlements","my-accounting/invoices","my-accounting/revenue","reports",
];

const MY_ACCOUNTING = ["my-accounting/settlements","my-accounting/invoices","my-accounting/revenue"];

const FINANCE_PAGES = [...Object.keys({}).filter(()=>false), "dashboard","accounting/invoices","accounting/receipts","accounting/payments","accounting/transactions","accounting/ar-ap","accounting/journal","accounting/coa","accounting/exchange-rates","product-groups","product-types","products","promotions","commissions","package-groups","packages","reports","crm/contacts","crm/accounts","crm/leads","crm/quotes","crm/contracts","applications","services/tasks"];
const ADMISSION_PAGES = [...CC_PAGES, "crm/contacts","crm/accounts","crm/leads","crm/quotes","crm/contracts","applications","documents"];
const TEAM_MGR_PAGES = [...ADMISSION_PAGES, "kpi/staff","kpi/team"];
const CONSULTANT_PAGES = ["dashboard","crm/contacts","crm/accounts","crm/leads","crm/quotes","crm/contracts","services/tasks","applications",...MY_ACCOUNTING,"reports"];

const defaultMatrix: Record<string, Record<string, boolean>> = {};
PAGES.forEach(p => {
  defaultMatrix[p.slug] = {
    super_admin:     true,
    admin:           !p.slug.startsWith("settings"),
    finance:         FINANCE_PAGES.includes(p.slug),
    admission:       ADMISSION_PAGES.includes(p.slug),
    team_manager:    TEAM_MGR_PAGES.includes(p.slug),
    consultant:      CONSULTANT_PAGES.includes(p.slug),
    camp_coordinator: CC_PAGES.includes(p.slug),
  };
});

const GROUPS = Array.from(new Set(PAGES.map(p => p.group)));

type Tab = "access" | "allocation";

export default function PageAccess() {
  const { toast } = useToast();
  const [matrix, setMatrix] = useState(defaultMatrix);
  const [activeTab, setActiveTab] = useState<Tab>("access");

  function toggle(slug: string, role: string) {
    if (role === "super_admin") return;
    setMatrix(m => ({ ...m, [slug]: { ...m[slug], [role]: !m[slug][role] } }));
  }

  function handleSave() {
    toast({ title: "Page access settings saved" });
  }

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer",
    background: "none", border: "none",
    color: active ? "#F5821F" : "#57534E",
    borderBottom: active ? "2px solid #F5821F" : "2px solid transparent",
    marginBottom: -1, display: "flex", alignItems: "center", gap: 6,
    transition: "color .15s",
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F5821F]/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-[#F5821F]" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Page Access</h1>
            <p className="text-xs text-muted-foreground">Control which roles can access each admin page</p>
          </div>
        </div>
        {activeTab === "access" && (
          <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5" onClick={handleSave}>
            <Save className="w-3.5 h-3.5" /> Save All
          </Button>
        )}
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid #E8E6E2", marginBottom: 24 }}>
        <button style={tabBtnStyle(activeTab === "access")} onClick={() => setActiveTab("access")}>
          <Lock size={14} /> Access Control
        </button>
        <button style={tabBtnStyle(activeTab === "allocation")} onClick={() => setActiveTab("allocation")}>
          <Menu size={14} /> Menu Allocation
        </button>
      </div>

      {activeTab === "access" && (
        <>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-4">
            <Lock className="w-3 h-3" /> Super Admin column is locked — always has full access
          </div>

          <div className="rounded-xl border bg-white overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 820 }}>
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide sticky left-0 bg-muted/30" style={{ minWidth: 180 }}>Page</th>
                  {ROLES.map(r => (
                    <th key={r.key} className="px-2 py-3 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide" style={{ minWidth: 72 }}>
                      <div className="leading-tight">{r.label}</div>
                      {r.locked && <Lock className="w-3 h-3 mx-auto mt-0.5 text-[#F5821F]" />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GROUPS.map(group => (
                  <React.Fragment key={group}>
                    <tr className="bg-muted/20">
                      <td colSpan={ROLES.length + 1} className="px-4 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{group}</td>
                    </tr>
                    {PAGES.filter(p => p.group === group).map(p => (
                      <tr key={p.slug} className="border-t hover:bg-[#FEF0E3]">
                        <td className="px-4 py-2 text-xs sticky left-0 bg-white font-medium text-stone-700">{p.label}</td>
                        {ROLES.map(r => (
                          <td key={r.key} className="px-2 py-2 text-center">
                            <button
                              onClick={() => toggle(p.slug, r.key)}
                              disabled={r.locked}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-all ${
                                r.locked
                                  ? "bg-[#F5821F] border-[#F5821F] cursor-not-allowed"
                                  : matrix[p.slug]?.[r.key]
                                  ? "bg-[#F5821F] border-[#F5821F] hover:bg-[#d97706]"
                                  : "border-muted-foreground/30 hover:border-[#F5821F]/50"
                              }`}
                            >
                              {(r.locked || matrix[p.slug]?.[r.key]) && (
                                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end sticky bottom-4">
            <Button className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5 shadow-lg" onClick={handleSave}>
              <Save className="w-4 h-4" /> Save All Changes
            </Button>
          </div>
        </>
      )}

      {activeTab === "allocation" && <MenuAllocationTab />}
    </div>
  );
}
