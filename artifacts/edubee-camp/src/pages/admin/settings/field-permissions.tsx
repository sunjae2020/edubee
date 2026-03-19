import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Eye, Pencil, Save } from "lucide-react";

const ROLES = ["super_admin", "admin", "camp_coordinator", "education_agent", "partner_institute", "partner_hotel", "parent_client"];
const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin", admin: "Admin", camp_coordinator: "Camp Coord.", education_agent: "Edu Agent",
  partner_institute: "Institute", partner_hotel: "Hotel", parent_client: "Parent",
};

const TABLES: Record<string, string[]> = {
  Applications: ["applicationNumber", "status", "priority", "agentId", "campProviderId", "notes", "submittedAt", "reviewedAt"],
  Contracts: ["contractNumber", "totalAmount", "currency", "status", "startDate", "endDate", "campProviderId", "notes"],
  "Institute Mgmt": ["programDetails", "startDate", "endDate", "totalHours", "englishLevelStart", "englishLevelEnd", "teacherComments", "progressNotes"],
  "Hotel Mgmt": ["roomType", "checkinDate", "checkoutDate", "confirmationNo", "guestNotes"],
  "Settlement": ["grossAmount", "commissionRate", "commissionAmount", "netAmount", "settlementDate", "notes"],
};

type Permission = "view" | "edit" | "none";

export default function FieldPermissions() {
  const { toast } = useToast();
  const [table, setTable] = useState("Applications");
  const [perms, setPerms] = useState<Record<string, Record<string, Permission>>>(() => {
    const initial: Record<string, Record<string, Permission>> = {};
    Object.entries(TABLES).forEach(([t, fields]) => {
      initial[t] = {};
      fields.forEach(f => {
        initial[t][f] = {};
        ROLES.forEach(r => {
          initial[t][f][r] = r === "super_admin" || r === "admin" ? "edit" : r === "parent_client" ? "view" : "view";
        });
      });
    });
    return initial;
  });

  function setFieldPerm(field: string, role: string, value: Permission) {
    if (role === "super_admin") return;
    setPerms(p => ({ ...p, [table]: { ...p[table], [field]: { ...p[table][field], [role]: value } } }));
  }

  const fields = TABLES[table] ?? [];
  const tablePerm = perms[table] ?? {};

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-[#F5821F]/10 flex items-center justify-center"><Eye className="w-5 h-5 text-[#F5821F]" /></div>
        <div><h1 className="text-lg font-bold">Field Permissions</h1><p className="text-xs text-muted-foreground">Control view/edit access per field, per role</p></div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Select value={table} onValueChange={setTable}>
          <SelectTrigger className="h-8 text-sm w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.keys(TABLES).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{fields.length} fields</span>
      </div>

      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase min-w-[160px]">Field</th>
              {ROLES.map(r => (
                <th key={r} className="px-3 py-3 text-center text-[11px] font-semibold text-muted-foreground uppercase min-w-[90px]">{ROLE_LABELS[r]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map(field => (
              <tr key={field} className="border-t hover:bg-[#FEF0E3]">
                <td className="px-4 py-2 font-mono text-xs">{field}</td>
                {ROLES.map(r => (
                  <td key={r} className="px-2 py-1.5 text-center">
                    {r === "super_admin" ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#F5821F]"><Pencil className="w-3 h-3" /> Edit</span>
                    ) : (
                      <Select value={tablePerm[field]?.[r] ?? "view"} onValueChange={(v: Permission) => setFieldPerm(field, r, v)}>
                        <SelectTrigger className="h-6 text-[10px] w-16 px-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="edit"><span className="flex items-center gap-1"><Pencil className="w-3 h-3" /> Edit</span></SelectItem>
                          <SelectItem value="view"><span className="flex items-center gap-1"><Eye className="w-3 h-3" /> View</span></SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <Button className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5" onClick={() => toast({ title: "Field permissions saved" })}>
          <Save className="w-4 h-4" /> Save Permissions
        </Button>
      </div>
    </div>
  );
}
