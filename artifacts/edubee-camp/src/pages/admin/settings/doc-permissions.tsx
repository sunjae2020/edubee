import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, Eye, Download, Save } from "lucide-react";

const ROLES = ["super_admin", "admin", "camp_coordinator", "education_agent", "partner_institute", "partner_hotel", "parent_client"];
const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin", admin: "Admin", camp_coordinator: "Camp Coord.", education_agent: "Edu Agent",
  partner_institute: "Institute", partner_hotel: "Hotel", parent_client: "Parent",
};

const DOC_CATEGORIES = [
  { group: "Student Documents", categories: ["Passport", "Student Visa", "Health Insurance", "Vaccination Records", "Medical Form"] },
  { group: "Program Documents", categories: ["Enrollment Letter", "Program Schedule", "Academic Report", "Certificate of Completion"] },
  { group: "Financial Documents", categories: ["Invoice (Client)", "Invoice (Agent)", "Receipt", "Settlement Statement"] },
  { group: "Operations", categories: ["Hotel Booking Confirmation", "Pickup Schedule", "Tour Itinerary", "Institute Letter"] },
  { group: "Internal", categories: ["Contract PDF", "Impersonation Logs Export", "Audit Report"] },
];

type DocPerm = { view: boolean; download: boolean };

const defaultPerms: Record<string, Record<string, DocPerm>> = {};
DOC_CATEGORIES.forEach(g => g.categories.forEach(cat => {
  defaultPerms[cat] = {};
  ROLES.forEach(r => {
    const isAdmin = ["super_admin", "admin"].includes(r);
    const isInternal = g.group === "Internal";
    defaultPerms[cat][r] = {
      view: isAdmin || (!isInternal && ["camp_coordinator","education_agent","parent_client"].includes(r)) || (r.startsWith("partner_") && g.group === "Operations"),
      download: isAdmin || (!isInternal && ["camp_coordinator","education_agent"].includes(r)) || (r === "parent_client" && g.group !== "Financial Documents"),
    };
  });
}));

export default function DocPermissions() {
  const { toast } = useToast();
  const [perms, setPerms] = useState(defaultPerms);

  function toggle(cat: string, role: string, type: "view" | "download") {
    if (role === "super_admin") return;
    setPerms(p => ({ ...p, [cat]: { ...p[cat], [role]: { ...p[cat][role], [type]: !p[cat][role][type] } } }));
  }

  function handleSave() {
    toast({ title: "Document permissions saved" });
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F08301]/10 flex items-center justify-center"><FileText className="w-5 h-5 text-[#F08301]" /></div>
          <div><h1 className="text-lg font-bold">Document Permissions</h1><p className="text-xs text-muted-foreground">Set View & Download access per document category per role</p></div>
        </div>
        <Button size="sm" className="bg-[#F08301] hover:bg-[#d97706] text-white gap-1.5" onClick={handleSave}>
          <Save className="w-3.5 h-3.5" /> Save All
        </Button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 flex items-center gap-2 mb-4">
        <span className="font-semibold">Note:</span> Changes apply to new uploads. Check "Apply to Existing" during save to retroactively apply.
        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 ml-auto border-amber-400 text-amber-700 hover:bg-amber-100" onClick={() => toast({ title: "Permissions applied to all existing documents" })}>Apply to Existing</Button>
      </div>

      {DOC_CATEGORIES.map(group => (
        <div key={group.group} className="rounded-xl border bg-white overflow-x-auto">
          <div className="px-4 py-2 bg-muted/30 border-b">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{group.group}</span>
          </div>
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase min-w-[180px]">Category</th>
                {ROLES.map(r => (
                  <th key={r} className="px-2 py-2 text-center min-w-[80px]">
                    <div className="text-[10px] font-semibold text-muted-foreground">{ROLE_LABELS[r]}</div>
                    <div className="flex justify-center gap-1 mt-1">
                      <span className="text-[9px] text-muted-foreground">V</span>
                      <span className="text-[9px] text-muted-foreground">D</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {group.categories.map(cat => (
                <tr key={cat} className="border-t hover:bg-muted/10">
                  <td className="px-4 py-2 text-xs">{cat}</td>
                  {ROLES.map(r => {
                    const perm = perms[cat]?.[r] ?? { view: false, download: false };
                    const isLocked = r === "super_admin";
                    return (
                      <td key={r} className="px-2 py-1.5 text-center">
                        <div className="flex justify-center gap-1">
                          <button title="View" onClick={() => toggle(cat, r, "view")} disabled={isLocked}
                            className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isLocked ? "bg-green-500 border-green-500" : perm.view ? "bg-green-500 border-green-500 hover:bg-green-600" : "border-muted-foreground/30 hover:border-green-400"}`}>
                            {(isLocked || perm.view) && <Eye className="w-2.5 h-2.5 text-white" />}
                          </button>
                          <button title="Download" onClick={() => toggle(cat, r, "download")} disabled={isLocked}
                            className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isLocked ? "bg-blue-500 border-blue-500" : perm.download ? "bg-blue-500 border-blue-500 hover:bg-blue-600" : "border-muted-foreground/30 hover:border-blue-400"}`}>
                            {(isLocked || perm.download) && <Download className="w-2.5 h-2.5 text-white" />}
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
