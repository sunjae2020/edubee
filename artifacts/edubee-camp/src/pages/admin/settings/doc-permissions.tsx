import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, Eye, Download, Save, Upload, Info, Loader2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const ROLES = [
  "super_admin", "admin", "camp_coordinator", "education_agent",
  "partner_institute", "partner_hotel", "partner_pickup", "partner_tour", "parent_client",
];
const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin", admin: "Admin", camp_coordinator: "Camp Coord.",
  education_agent: "Edu Agent", partner_institute: "Institute", partner_hotel: "Hotel",
  partner_pickup: "Pickup", partner_tour: "Tour", parent_client: "Parent",
};

const GROUPS = ["personal", "school", "financial", "travel", "contract", "internal", "other"];
const GROUP_LABELS: Record<string, string> = {
  personal: "Personal Documents", school: "School & Program", financial: "Financial Documents",
  travel: "Travel Documents", contract: "Contract Documents", internal: "Internal Documents",
  other: "Additional (Other)",
};

type PermRow = { id: string; categoryGroup: string; role: string; canView: boolean; canDownload: boolean; canUploadExtra: boolean };
type CatRow = { id: string; categoryCode: string; categoryNameEn: string; categoryGroup: string; allowExtraUpload: boolean };

export default function DocPermissions() {
  const { toast } = useToast();

  const { data: apiData, isLoading } = useQuery({
    queryKey: ["doc-default-permissions"],
    queryFn: () => axios.get(`${BASE}/api/documents/default-permissions`).then(r => r.data),
  });

  const [perms, setPerms] = useState<PermRow[]>([]);
  const [cats, setCats] = useState<CatRow[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (apiData) {
      setPerms(apiData.data ?? []);
      setCats(apiData.categories ?? []);
    }
  }, [apiData]);

  const saveMut = useMutation({
    mutationFn: () =>
      axios.put(`${BASE}/api/documents/default-permissions`, {
        permissions: perms,
        categorySettings: cats,
      }),
    onSuccess: () => {
      toast({ title: "Document permissions saved" });
      setIsDirty(false);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to save permissions" }),
  });

  function togglePerm(group: string, role: string, field: "canView" | "canDownload" | "canUploadExtra") {
    if (role === "super_admin") return;
    setPerms(prev => prev.map(p =>
      p.categoryGroup === group && p.role === role ? { ...p, [field]: !p[field] } : p
    ));
    setIsDirty(true);
  }

  function toggleCatExtra(catId: string) {
    setCats(prev => prev.map(c => c.id === catId ? { ...c, allowExtraUpload: !c.allowExtraUpload } : c));
    setIsDirty(true);
  }

  function getPerm(group: string, role: string): PermRow | undefined {
    return perms.find(p => p.categoryGroup === group && p.role === role);
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading permissions…
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F5821F]/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-[#F5821F]" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Document Permissions</h1>
            <p className="text-xs text-muted-foreground">Set View, Download & Upload Extra access per category group per role</p>
          </div>
        </div>
        <Button
          size="sm"
          className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5"
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending || !isDirty}
        >
          {saveMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save All
        </Button>
      </div>

      {/* Info banner */}
      <div className="bg-[#FEF9C3] border border-[#CA8A04]/20 rounded-lg px-3 py-2 text-xs text-[#CA8A04] flex items-center gap-2">
        <Info className="w-3.5 h-3.5 shrink-0" />
        <span><strong>V</strong> = View &nbsp;·&nbsp; <strong>D</strong> = Download &nbsp;·&nbsp; <strong>UX</strong> = Upload Extra (allows uploading documents not in the defined category list for that group)</span>
      </div>

      {/* Permissions matrix */}
      {GROUPS.map(group => (
        <div key={group} className="rounded-xl border bg-white overflow-x-auto">
          <div className="px-4 py-2 bg-muted/30 border-b">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{GROUP_LABELS[group]}</span>
          </div>
          <table className="w-full text-sm" style={{ minWidth: 860 }}>
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase min-w-[120px]">Group</th>
                {ROLES.map(r => (
                  <th key={r} className="px-2 py-2 text-center min-w-[72px]">
                    <div className="text-[10px] font-semibold text-muted-foreground">{ROLE_LABELS[r]}</div>
                    <div className="flex justify-center gap-0.5 mt-1">
                      <span className="text-[8px] text-muted-foreground font-mono bg-muted/60 rounded px-0.5">V</span>
                      <span className="text-[8px] text-muted-foreground font-mono bg-muted/60 rounded px-0.5">D</span>
                      <span className="text-[8px] text-muted-foreground font-mono bg-amber-100 text-amber-700 rounded px-0.5">UX</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-[#FEF0E3]">
                <td className="px-4 py-2 text-xs font-medium">{GROUP_LABELS[group]}</td>
                {ROLES.map(r => {
                  const p = getPerm(group, r);
                  const isLocked = r === "super_admin";
                  return (
                    <td key={r} className="px-2 py-1.5 text-center">
                      <div className="flex justify-center gap-0.5">
                        {/* View */}
                        <button
                          title="View"
                          onClick={() => togglePerm(group, r, "canView")}
                          disabled={isLocked}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                            isLocked ? "bg-[#16A34A] border-[#16A34A]"
                            : (p?.canView) ? "bg-[#16A34A] border-[#16A34A] hover:bg-[#15803D]"
                            : "border-[#E8E6E2] hover:border-[#16A34A]"
                          }`}
                        >
                          {(isLocked || p?.canView) && <Eye className="w-2.5 h-2.5 text-white" />}
                        </button>
                        {/* Download */}
                        <button
                          title="Download"
                          onClick={() => togglePerm(group, r, "canDownload")}
                          disabled={isLocked}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                            isLocked ? "bg-[#F5821F] border-[#F5821F]"
                            : (p?.canDownload) ? "bg-[#F5821F] border-[#F5821F] hover:bg-[#D96A0A]"
                            : "border-[#E8E6E2] hover:border-[#F5821F]"
                          }`}
                        >
                          {(isLocked || p?.canDownload) && <Download className="w-2.5 h-2.5 text-white" />}
                        </button>
                        {/* Upload Extra */}
                        <button
                          title="Upload Extra — allow uploading documents outside the defined category list"
                          onClick={() => togglePerm(group, r, "canUploadExtra")}
                          disabled={isLocked}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                            isLocked ? "bg-amber-500 border-amber-500"
                            : (p?.canUploadExtra) ? "bg-amber-500 border-amber-500 hover:bg-amber-600"
                            : "border-[#E8E6E2] hover:border-amber-400"
                          }`}
                        >
                          {(isLocked || p?.canUploadExtra) && <Upload className="w-2.5 h-2.5 text-white" />}
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      {/* Per-Category Extra Upload Toggle */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
          <Upload className="w-4 h-4 text-amber-600" />
          <div>
            <span className="text-sm font-bold text-amber-800">Per-Category Extra Upload Toggle</span>
            <p className="text-[11px] text-amber-600 mt-0.5">Disable "Allow Extra Upload" on sensitive categories so only defined documents can be uploaded for that category type.</p>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/10">
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Category Code</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Name</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Group</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground uppercase">Allow Extra Upload</th>
            </tr>
          </thead>
          <tbody>
            {cats.map(cat => (
              <tr key={cat.id} className="border-t hover:bg-[#FEF0E3]">
                <td className="px-4 py-2 text-xs font-mono text-muted-foreground">{cat.categoryCode}</td>
                <td className="px-4 py-2 text-sm">{cat.categoryNameEn}</td>
                <td className="px-4 py-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{cat.categoryGroup}</span>
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => toggleCatExtra(cat.id)}
                    title={cat.allowExtraUpload ? "Click to disable extra upload for this category" : "Click to enable extra upload for this category"}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                      cat.allowExtraUpload ? "bg-amber-500" : "bg-gray-200"
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      cat.allowExtraUpload ? "translate-x-4" : "translate-x-1"
                    }`} />
                  </button>
                </td>
              </tr>
            ))}
            {cats.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">No categories found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
