import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Lock, Save } from "lucide-react";

const ROLES = [
  { key: "super_admin", label: "Super Admin", locked: true },
  { key: "admin", label: "Admin" },
  { key: "camp_coordinator", label: "Camp Coord." },
  { key: "education_agent", label: "Education Agent" },
  { key: "partner_institute", label: "Institute" },
  { key: "partner_hotel", label: "Hotel" },
  { key: "partner_pickup", label: "Pickup" },
  { key: "partner_tour", label: "Tour" },
  { key: "parent_client", label: "Parent/Client" },
];

const PAGES = [
  { slug: "dashboard", label: "Dashboard", group: "Core" },
  { slug: "leads", label: "Leads", group: "Core" },
  { slug: "applications", label: "Applications", group: "Core" },
  { slug: "contracts", label: "Contracts", group: "Core" },
  { slug: "package-groups", label: "Package Groups", group: "Core" },
  { slug: "users", label: "Users", group: "Core" },
  { slug: "services/institute", label: "Institute Mgmt", group: "Services" },
  { slug: "services/hotel", label: "Hotel Mgmt", group: "Services" },
  { slug: "services/pickup", label: "Pickup Mgmt", group: "Services" },
  { slug: "services/tour", label: "Tour Mgmt", group: "Services" },
  { slug: "services/interviews", label: "Interviews", group: "Services" },
  { slug: "services/settlement", label: "Settlement", group: "Services" },
  { slug: "accounting/client-invoices", label: "Client Invoices", group: "Accounting" },
  { slug: "accounting/agent-invoices", label: "Agent Invoices", group: "Accounting" },
  { slug: "accounting/partner-invoices", label: "Partner Invoices", group: "Accounting" },
  { slug: "accounting/receipts", label: "Receipts", group: "Accounting" },
  { slug: "accounting/transactions", label: "Transactions", group: "Accounting" },
  { slug: "accounting/exchange-rates", label: "Exchange Rates", group: "Accounting" },
  { slug: "my-accounting/settlements", label: "My Settlements", group: "My Accounting" },
  { slug: "my-accounting/invoices", label: "My Invoices", group: "My Accounting" },
  { slug: "my-accounting/revenue", label: "My Revenue", group: "My Accounting" },
  { slug: "reports", label: "Program Reports", group: "Other" },
  { slug: "my-programs", label: "My Programs", group: "Other" },
  { slug: "settings/general", label: "General Settings", group: "Settings" },
  { slug: "settings/page-access", label: "Page Access", group: "Settings" },
  { slug: "settings/field-permissions", label: "Field Permissions", group: "Settings" },
  { slug: "settings/doc-permissions", label: "Doc Permissions", group: "Settings" },
  { slug: "settings/impersonation-logs", label: "Impersonation Logs", group: "Settings" },
];

// Default access matrix
const defaultMatrix: Record<string, Record<string, boolean>> = {};
PAGES.forEach(p => {
  defaultMatrix[p.slug] = {
    super_admin: true,
    admin: !p.slug.startsWith("settings"),
    camp_coordinator: ["dashboard","applications","contracts","package-groups","services/institute","services/hotel","services/pickup","services/tour","services/interviews","services/settlement","my-accounting/settlements","my-accounting/invoices","my-accounting/revenue","reports"].includes(p.slug),
    education_agent: ["dashboard","applications","my-accounting/settlements","my-accounting/invoices","my-accounting/revenue","reports","my-programs"].includes(p.slug),
    partner_institute: ["dashboard","services/institute","my-accounting/settlements","my-accounting/invoices","my-accounting/revenue"].includes(p.slug),
    partner_hotel: ["dashboard","services/hotel","my-accounting/settlements","my-accounting/invoices","my-accounting/revenue"].includes(p.slug),
    partner_pickup: ["dashboard","services/pickup","my-accounting/settlements","my-accounting/invoices","my-accounting/revenue"].includes(p.slug),
    partner_tour: ["dashboard","services/tour","my-accounting/settlements","my-accounting/invoices","my-accounting/revenue"].includes(p.slug),
    parent_client: ["dashboard","my-programs","reports"].includes(p.slug),
  };
});

const GROUPS = Array.from(new Set(PAGES.map(p => p.group)));

export default function PageAccess() {
  const { toast } = useToast();
  const [matrix, setMatrix] = useState(defaultMatrix);

  function toggle(slug: string, role: string) {
    if (role === "super_admin") return; // locked
    setMatrix(m => ({ ...m, [slug]: { ...m[slug], [role]: !m[slug][role] } }));
  }

  function handleSave() {
    toast({ title: "Page access settings saved" });
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F08301]/10 flex items-center justify-center"><Lock className="w-5 h-5 text-[#F08301]" /></div>
          <div><h1 className="text-lg font-bold">Page Access</h1><p className="text-xs text-muted-foreground">Control which roles can access each admin page</p></div>
        </div>
        <Button size="sm" className="bg-[#F08301] hover:bg-[#d97706] text-white gap-1.5 sticky bottom-4" onClick={handleSave}>
          <Save className="w-3.5 h-3.5" /> Save All
        </Button>
      </div>

      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-4"><Lock className="w-3 h-3" /> Super Admin column is locked — always has full access</div>

      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide sticky left-0 bg-muted/30 min-w-[180px]">Page</th>
              {ROLES.map(r => (
                <th key={r.key} className="px-3 py-3 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide min-w-[70px]">
                  <div>{r.label}</div>
                  {r.locked && <Lock className="w-3 h-3 mx-auto mt-0.5 text-[#F08301]" />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GROUPS.map(group => (
              <>
                <tr key={`group-${group}`} className="bg-muted/20">
                  <td colSpan={ROLES.length + 1} className="px-4 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{group}</td>
                </tr>
                {PAGES.filter(p => p.group === group).map(p => (
                  <tr key={p.slug} className="border-t hover:bg-muted/10">
                    <td className="px-4 py-2 text-xs sticky left-0 bg-white">{p.label}</td>
                    {ROLES.map(r => (
                      <td key={r.key} className="px-3 py-2 text-center">
                        <button
                          onClick={() => toggle(p.slug, r.key)}
                          disabled={r.locked}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-all ${
                            r.locked
                              ? "bg-[#F08301] border-[#F08301] cursor-not-allowed"
                              : matrix[p.slug]?.[r.key]
                              ? "bg-[#F08301] border-[#F08301] hover:bg-[#d97706]"
                              : "border-muted-foreground/30 hover:border-[#F08301]/50"
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
              </>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end sticky bottom-4">
        <Button className="bg-[#F08301] hover:bg-[#d97706] text-white gap-1.5 shadow-lg" onClick={handleSave}>
          <Save className="w-4 h-4" /> Save All Changes
        </Button>
      </div>
    </div>
  );
}
