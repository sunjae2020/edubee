import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { DetailPageLayout, DetailSection, DetailRow, EditableField } from "@/components/shared/DetailPageLayout";
import { useDetailEdit } from "@/hooks/useDetailEdit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, Trash2, Package, RefreshCw, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CURRENCIES = [
  { ccy: "AUD", label: "AUD (Australia)", flag: "🇦🇺", field: "priceAud" },
  { ccy: "SGD", label: "SGD (Singapore)", flag: "🇸🇬", field: "priceSgd" },
  { ccy: "PHP", label: "PHP (Philippines)", flag: "🇵🇭", field: "pricePhp" },
  { ccy: "THB", label: "THB (Thailand)", flag: "🇹🇭", field: "priceThb" },
  { ccy: "KRW", label: "KRW (South Korea)", flag: "🇰🇷", field: "priceKrw" },
  { ccy: "JPY", label: "JPY (Japan)", flag: "🇯🇵", field: "priceJpy" },
  { ccy: "GBP", label: "GBP (UK)", flag: "🇬🇧", field: "priceGbp" },
  { ccy: "USD", label: "USD (USA)", flag: "🇺🇸", field: "priceUsd" },
];

const TABS = [
  { key: "general", label: "General" },
  { key: "packages", label: "Packages" },
  { key: "spots", label: "Enrollment Spots" },
  { key: "interview", label: "Interview" },
];

interface Pkg {
  id: string; packageGroupId: string; name: string; durationDays: number;
  maxParticipants?: number | null; status?: string;
  priceAud?: string | null; priceUsd?: string | null; priceKrw?: string | null;
  priceJpy?: string | null; priceThb?: string | null; pricePhp?: string | null;
  priceSgd?: string | null; priceGbp?: string | null;
}

const emptyPkg = { name: "", durationDays: "", maxParticipants: "", priceAud: "", priceUsd: "", priceKrw: "", priceJpy: "", priceThb: "", pricePhp: "", priceSgd: "", priceGbp: "" };

// Exchange rate multipliers (AUD base)
const RATES: Record<string, number> = { KRW: 952.38, THB: 22.99, JPY: 102.04, USD: 0.633, PHP: 35.71, SGD: 0.847, GBP: 0.495 };

export default function PackageGroupDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("general");
  const [showPkgDialog, setShowPkgDialog] = useState(false);
  const [editingPkg, setEditingPkg] = useState<Pkg | null>(null);
  const [pkgForm, setPkgForm] = useState(emptyPkg);
  const [autoConvert, setAutoConvert] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["package-group-detail", id],
    queryFn: () => axios.get(`${BASE}/api/package-groups/${id}`).then(r => r.data),
  });
  const { data: pkgsResp } = useQuery({
    queryKey: ["packages-by-group", id],
    queryFn: () => axios.get(`${BASE}/api/packages?packageGroupId=${id}&limit=100`).then(r => r.data),
    enabled: activeTab === "packages",
  });
  const { data: spotsResp } = useQuery({
    queryKey: ["spots-by-group", id],
    queryFn: () => axios.get(`${BASE}/api/enrollment-spots?packageGroupId=${id}&limit=100`).then(r => r.data),
    enabled: activeTab === "spots",
  });
  const { data: interviewResp } = useQuery({
    queryKey: ["interview-settings", id],
    queryFn: () => axios.get(`${BASE}/api/interview-settings?packageGroupId=${id}`).then(r => r.data),
    enabled: activeTab === "interview",
  });
  const { data: ratesResp } = useQuery({
    queryKey: ["exchange-rates-latest"],
    queryFn: () => axios.get(`${BASE}/api/exchange-rates`).then(r => r.data),
    enabled: activeTab === "packages",
  });

  const group = data?.data ?? data;
  const pkgs: Pkg[] = pkgsResp?.data ?? [];
  const spots = spotsResp?.data ?? [];
  const interviewSetting = interviewResp?.data?.[0] ?? interviewResp?.[0];

  // Build live rate map from DB
  const allRates: any[] = ratesResp?.data ?? [];
  const liveRates: Record<string, { rate: number; date: string }> = {};
  for (const r of allRates) {
    if (r.fromCurrency === "AUD") {
      const k = r.toCurrency.toUpperCase();
      if (!liveRates[k]) liveRates[k] = { rate: parseFloat(r.rate), date: r.effectiveDate };
    }
  }
  const getRateFor = (ccy: string) => liveRates[ccy]?.rate ?? RATES[ccy] ?? 1;
  const rateDate = Object.values(liveRates)[0]?.date ?? "—";

  const updateGroup = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      axios.put(`${BASE}/api/package-groups/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["package-group-detail", id] });
      qc.invalidateQueries({ queryKey: ["package-groups"] });
      toast({ title: "Package group updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update" }),
  });

  const createPkg = useMutation({
    mutationFn: (p: any) => axios.post(`${BASE}/api/packages`, p).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["packages-by-group", id] }); setShowPkgDialog(false); toast({ title: "Package created" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to create package" }),
  });
  const updatePkg = useMutation({
    mutationFn: ({ pkgId, data }: { pkgId: string; data: any }) =>
      axios.put(`${BASE}/api/packages/${pkgId}`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["packages-by-group", id] }); setShowPkgDialog(false); toast({ title: "Package updated" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to update" }),
  });

  const { isEditing, isSaving, formData, startEdit, cancelEdit, setField, saveEdit, getValue } = useDetailEdit({
    initialData: group ?? {},
    onSave: async (data) => { await updateGroup.mutateAsync(data); },
  });

  const canEdit = ["super_admin", "admin", "camp_coordinator"].includes(user?.role ?? "");

  const handlePkgAudChange = (v: string) => {
    setPkgForm(f => {
      const aud = parseFloat(v) || 0;
      if (!autoConvert) return { ...f, priceAud: v };
      return {
        ...f, priceAud: v,
        priceKrw: aud ? Math.round(aud * getRateFor("KRW") / 100) * 100 + "" : "",
        priceThb: aud ? Math.round(aud * getRateFor("THB") / 100) * 100 + "" : "",
        priceJpy: aud ? Math.round(aud * getRateFor("JPY") / 100) * 100 + "" : "",
        priceUsd: aud ? (aud * getRateFor("USD")).toFixed(2) : "",
        pricePhp: aud ? Math.round(aud * getRateFor("PHP") / 100) * 100 + "" : "",
        priceSgd: aud ? (aud * getRateFor("SGD")).toFixed(2) : "",
        priceGbp: aud ? (aud * getRateFor("GBP")).toFixed(2) : "",
      };
    });
  };

  const openPkgDialog = (pkg?: Pkg) => {
    setEditingPkg(pkg ?? null);
    setPkgForm(pkg ? { name: pkg.name, durationDays: String(pkg.durationDays), maxParticipants: String(pkg.maxParticipants ?? ""), priceAud: pkg.priceAud ?? "", priceUsd: pkg.priceUsd ?? "", priceKrw: pkg.priceKrw ?? "", priceJpy: pkg.priceJpy ?? "", priceThb: pkg.priceThb ?? "", pricePhp: pkg.pricePhp ?? "", priceSgd: pkg.priceSgd ?? "", priceGbp: pkg.priceGbp ?? "" } : emptyPkg);
    setShowPkgDialog(true);
  };

  const submitPkg = () => {
    const payload = {
      packageGroupId: id, name: pkgForm.name,
      durationDays: parseInt(pkgForm.durationDays) || 1,
      maxParticipants: pkgForm.maxParticipants ? parseInt(pkgForm.maxParticipants) : null,
      priceAud: pkgForm.priceAud || null, priceUsd: pkgForm.priceUsd || null,
      priceKrw: pkgForm.priceKrw || null, priceJpy: pkgForm.priceJpy || null,
      priceThb: pkgForm.priceThb || null, pricePhp: pkgForm.pricePhp || null,
      priceSgd: pkgForm.priceSgd || null, priceGbp: pkgForm.priceGbp || null,
    };
    if (editingPkg) updatePkg.mutate({ pkgId: editingPkg.id, data: payload });
    else createPkg.mutate(payload);
  };

  if (isLoading) return <div className="p-6 space-y-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (!group) return <div className="p-6 text-muted-foreground">Package group not found.</div>;

  const statusColor: Record<string, string> = { active: "bg-green-100 text-green-700", inactive: "bg-gray-100 text-gray-600", archived: "bg-red-100 text-red-600" };

  return (
    <>
      <DetailPageLayout
        title={group.nameEn ?? "Package Group"}
        subtitle={`${group.location ?? ""}${group.countryCode ? ` · ${group.countryCode}` : ""}`}
        badge={<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[group.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>{group.status ?? "—"}</span>}
        backPath="/admin/package-groups"
        backLabel="Package Groups"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(t) => { setActiveTab(t); if (isEditing) cancelEdit(); }}
        canEdit={canEdit && activeTab === "general"}
        isEditing={isEditing}
        isSaving={isSaving}
        onEdit={startEdit}
        onSave={saveEdit}
        onCancel={cancelEdit}
      >
        {/* General Tab */}
        {activeTab === "general" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DetailSection title="Basic Info">
              <EditableField label="Name (EN)" isEditing={isEditing} value={group.nameEn}
                editValue={getValue("nameEn")} onEdit={v => setField("nameEn", v)} />
              <EditableField label="Name (KO)" isEditing={isEditing} value={group.nameKo}
                editValue={getValue("nameKo")} onEdit={v => setField("nameKo", v)} />
              <EditableField label="Name (JA)" isEditing={isEditing} value={group.nameJa}
                editValue={getValue("nameJa")} onEdit={v => setField("nameJa", v)} />
              <EditableField label="Name (TH)" isEditing={isEditing} value={group.nameTh}
                editValue={getValue("nameTh")} onEdit={v => setField("nameTh", v)} />
              <EditableField label="Location" isEditing={isEditing} value={group.location}
                editValue={getValue("location")} onEdit={v => setField("location", v)} />
              <EditableField label="Country Code" isEditing={isEditing} value={group.countryCode}
                editValue={getValue("countryCode")} onEdit={v => setField("countryCode", v)} />
            </DetailSection>
            <DetailSection title="Settings">
              <EditableField label="Status" isEditing={isEditing} value={group.status}
                editChildren={
                  <Select value={getValue("status")} onValueChange={v => setField("status", v)}>
                    <SelectTrigger className="h-8 text-sm border-[#F5821F]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["active", "inactive", "archived"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                } />
              <EditableField label="Sort Order" isEditing={isEditing} value={group.sortOrder}
                editValue={getValue("sortOrder")} onEdit={v => setField("sortOrder", v)} type="number" />
              {isEditing ? (
                <DetailRow label="Landing Page Order">
                  <Select
                    value={getValue("landingOrder") != null ? String(getValue("landingOrder")) : "none"}
                    onValueChange={v => setField("landingOrder", v === "none" ? null : parseInt(v))}
                  >
                    <SelectTrigger className="h-8 text-sm border-[#F5821F]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Not shown on landing page —</SelectItem>
                      {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                        <SelectItem key={n} value={String(n)}>#{n} — Position {n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </DetailRow>
              ) : (
                <DetailRow label="Landing Page Order">
                  {group.landingOrder != null ? (
                    <span className="flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#F5821F] text-white text-[10px] font-bold">{group.landingOrder}</span>
                      <span className="text-sm">Shown on landing (#{group.landingOrder})</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60">Not shown on landing page</span>
                  )}
                </DetailRow>
              )}
              <DetailRow label="Thumbnail URL" value={group.thumbnailUrl} />
              {isEditing && (
                <EditableField label="Thumbnail URL" isEditing={isEditing} value={group.thumbnailUrl}
                  editValue={getValue("thumbnailUrl")} onEdit={v => setField("thumbnailUrl", v)} />
              )}
              <DetailRow label="Created" value={group.createdAt ? format(new Date(group.createdAt), "PPP") : "—"} />
              <DetailRow label="Updated" value={group.updatedAt ? format(new Date(group.updatedAt), "PPP") : "—"} />
            </DetailSection>
            <DetailSection title="Description (EN)" className="lg:col-span-2">
              {isEditing ? (
                <textarea value={getValue("descriptionEn") ?? ""} onChange={e => setField("descriptionEn", e.target.value)}
                  className="w-full border border-[#F5821F] rounded-md px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:ring-1 focus:ring-[#F5821F]" />
              ) : (
                <p className="text-sm text-foreground whitespace-pre-wrap">{group.descriptionEn || <span className="text-muted-foreground/60">—</span>}</p>
              )}
            </DetailSection>
          </div>
        )}

        {/* Packages Tab */}
        {activeTab === "packages" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  환율 기준일: <strong>{rateDate}</strong>
                  {Object.keys(liveRates).length > 0 && <span className="ml-1 text-xs text-green-600">(DB 최신)</span>}
                </span>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                  <a href={`${BASE}/admin/accounting/exchange-rates`}>
                    <RefreshCw className="h-3 w-3" /> 환율 업데이트
                  </a>
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Switch id="auto-convert" checked={autoConvert} onCheckedChange={setAutoConvert} />
                  <label htmlFor="auto-convert" className="text-xs text-muted-foreground cursor-pointer">AUD 기준 자동 환산</label>
                </div>
                {canEdit && (
                  <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1" onClick={() => openPkgDialog()}>
                    <Plus className="h-3.5 w-3.5" /> Add Package
                  </Button>
                )}
              </div>
            </div>

            <div className="bg-card rounded-xl border overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-left">Package</th>
                    <th className="px-4 py-2.5 text-right">Days</th>
                    <th className="px-4 py-2.5 text-right">Max</th>
                    {CURRENCIES.map(c => <th key={c.ccy} className="px-3 py-2.5 text-right">{c.flag} {c.ccy}</th>)}
                    <th className="px-4 py-2.5 text-center">Status</th>
                    {canEdit && <th className="px-4 py-2.5" />}
                  </tr>
                </thead>
                <tbody>
                  {pkgs.length === 0 ? (
                    <tr><td colSpan={12} className="px-4 py-8 text-center text-muted-foreground text-xs">No packages yet</td></tr>
                  ) : pkgs.map(p => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-[#FEF0E3]/50">
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-right">{p.durationDays}d</td>
                      <td className="px-4 py-3 text-right">{p.maxParticipants ?? "—"}</td>
                      {CURRENCIES.map(c => (
                        <td key={c.ccy} className="px-3 py-3 text-right font-mono text-xs">
                          {(p as any)[c.field] ? Number((p as any)[c.field]).toLocaleString() : "—"}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${p.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{p.status ?? "active"}</span>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => openPkgDialog(p)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Enrollment Spots Tab */}
        {activeTab === "spots" && (
          <div className="bg-card rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-left">Grade Label</th>
                  <th className="px-4 py-2.5 text-right">Total Spots</th>
                  <th className="px-4 py-2.5 text-right">Reserved</th>
                  <th className="px-4 py-2.5 text-right">Available</th>
                  <th className="px-4 py-2.5 text-left">Age Range</th>
                  <th className="px-4 py-2.5 text-left">Program</th>
                </tr>
              </thead>
              <tbody>
                {spots.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-xs">No enrollment spots</td></tr>
                ) : spots.map((s: any) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-[#FEF0E3]">
                    <td className="px-4 py-3 font-medium">{s.gradeLabel}</td>
                    <td className="px-4 py-3 text-right">{s.totalSpots}</td>
                    <td className="px-4 py-3 text-right text-orange-600">{s.reservedSpots ?? 0}</td>
                    <td className="px-4 py-3 text-right text-green-600">{(s.totalSpots ?? 0) - (s.reservedSpots ?? 0)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.ageMin ?? "—"}–{s.ageMax ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{s.programLabel ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Interview Tab */}
        {activeTab === "interview" && (
          <DetailSection title="Interview Settings">
            {!interviewSetting ? (
              <p className="text-sm text-muted-foreground">No interview settings configured.</p>
            ) : (
              <>
                <DetailRow label="Required" value={interviewSetting.isRequired ? "Yes" : "No"} />
                <DetailRow label="Format" value={interviewSetting.interviewFormat} />
                <DetailRow label="Duration (min)" value={interviewSetting.durationMinutes} />
                <DetailRow label="Max Reschedules" value={interviewSetting.maxReschedules} />
                <DetailRow label="Instructions" value={interviewSetting.instructions} />
              </>
            )}
          </DetailSection>
        )}
      </DetailPageLayout>

      {/* Package Dialog */}
      <Dialog open={showPkgDialog} onOpenChange={setShowPkgDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPkg ? "Edit Package" : "Add Package"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3"><Label className="text-xs">Package Name</Label>
                <Input value={pkgForm.name} onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))} className="mt-1 h-8 text-sm" /></div>
              <div><Label className="text-xs">Duration (days)</Label>
                <Input type="number" value={pkgForm.durationDays} onChange={e => setPkgForm(f => ({ ...f, durationDays: e.target.value }))} className="mt-1 h-8 text-sm" /></div>
              <div><Label className="text-xs">Max Participants</Label>
                <Input type="number" value={pkgForm.maxParticipants} onChange={e => setPkgForm(f => ({ ...f, maxParticipants: e.target.value }))} className="mt-1 h-8 text-sm" /></div>
              <div />
            </div>
            <div className="flex items-center gap-2 py-1">
              <Switch id="ac-pkg" checked={autoConvert} onCheckedChange={setAutoConvert} />
              <label htmlFor="ac-pkg" className="text-xs text-muted-foreground cursor-pointer">AUD 기준 자동 환산</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {CURRENCIES.map(c => (
                <div key={c.ccy}>
                  <Label className="text-xs">{c.flag} {c.label}</Label>
                  <Input type="number" value={(pkgForm as any)[c.field]} onChange={e => {
                    if (c.field === "priceAud") handlePkgAudChange(e.target.value);
                    else setPkgForm(f => ({ ...f, [c.field]: e.target.value }));
                  }} className={`mt-1 h-8 text-sm font-mono ${autoConvert && c.field !== "priceAud" ? "bg-muted/50 text-muted-foreground" : ""}`} readOnly={autoConvert && c.field !== "priceAud"} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" className="flex-1 bg-[#F5821F] hover:bg-[#d97706] text-white"
                onClick={submitPkg} disabled={createPkg.isPending || updatePkg.isPending || !pkgForm.name}>
                {createPkg.isPending || updatePkg.isPending ? "Saving…" : editingPkg ? "Update" : "Create"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowPkgDialog(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
