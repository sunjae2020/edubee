import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { UserRound, Mail, Phone, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { DetailPageLayout, DetailSection, DetailRow, EditableField } from "@/components/shared/DetailPageLayout";
import { ThumbnailUploader } from "@/components/shared/ThumbnailUploader";
import { useDetailEdit } from "@/hooks/useDetailEdit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, RefreshCw, X, Loader2 } from "lucide-react";
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
  maxParticipants?: number | null; maxAdults?: number | null; maxStudents?: number | null;
  status?: string;
  priceAud?: string | null; priceUsd?: string | null; priceKrw?: string | null;
  priceJpy?: string | null; priceThb?: string | null; pricePhp?: string | null;
  priceSgd?: string | null; priceGbp?: string | null;
}

const emptyPkg = { name: "", durationDays: "", maxParticipants: "", maxAdults: "", maxStudents: "", priceAud: "", priceUsd: "", priceKrw: "", priceJpy: "", priceThb: "", pricePhp: "", priceSgd: "", priceGbp: "" };

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

  // Enrollment Spots state
  const EMPTY_SPOT = { gradeLabel: "", gradeOrder: "0", totalSpots: "", manualReserved: "0", status: "available", startDate: "", endDate: "", dobRangeStart: "", dobRangeEnd: "" };
  const [showSpotDialog, setShowSpotDialog] = useState(false);
  const [editingSpot, setEditingSpot] = useState<any>(null);
  const [spotForm, setSpotForm] = useState<Record<string, string>>(EMPTY_SPOT);
  const [deletingSpotId, setDeletingSpotId] = useState<string | null>(null);

  // Per-package product state
  const [showPkgAddProduct, setShowPkgAddProduct] = useState(false);
  const [pkgProdTypeFilter, setPkgProdTypeFilter] = useState("all");
  const [selectedPkgProdId, setSelectedPkgProdId] = useState<string | null>(null);
  const [pkgAddQty, setPkgAddQty] = useState(1);
  const [pkgAddUnitPrice, setPkgAddUnitPrice] = useState("");
  const [pkgAddIsOptional, setPkgAddIsOptional] = useState(false);
  const [pkgAddError, setPkgAddError] = useState<string | null>(null);

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

  const { data: allActiveProductsData } = useQuery({
    queryKey: ["all-active-products"],
    queryFn: () => axios.get(`${BASE}/api/products?status=active&limit=200`).then(r => r.data?.data ?? r.data),
    enabled: showPkgAddProduct,
  });
  const allActiveProducts: any[] = Array.isArray(allActiveProductsData) ? allActiveProductsData : (allActiveProductsData?.data ?? []);

  // Per-package products
  const { data: pkgProductsData, isLoading: pkgProductsLoading } = useQuery({
    queryKey: ["pkg-linked-products", editingPkg?.id],
    queryFn: () => axios.get(`${BASE}/api/packages/${editingPkg!.id}/products`).then(r => r.data),
    enabled: !!editingPkg?.id && showPkgDialog,
  });
  const pkgLinkedProducts: any[] = pkgProductsData ?? [];

  const linkPkgProduct = useMutation({
    mutationFn: (payload: any) => axios.post(`${BASE}/api/packages/${editingPkg!.id}/products`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pkg-linked-products", editingPkg?.id] });
      setShowPkgAddProduct(false); setSelectedPkgProdId(null); setPkgAddQty(1); setPkgAddUnitPrice(""); setPkgAddIsOptional(false); setPkgAddError(null);
      toast({ title: "Product added to package" });
    },
    onError: (err: any) => setPkgAddError(err?.response?.data?.error ?? "Failed to add product"),
  });

  const unlinkPkgProduct = useMutation({
    mutationFn: (productId: string) => axios.delete(`${BASE}/api/packages/${editingPkg!.id}/products/${productId}`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pkg-linked-products", editingPkg?.id] }); toast({ title: "Product removed" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to remove product" }),
  });

  const group = data?.data ?? data;
  const pkgs: Pkg[] = pkgsResp?.data ?? [];
  const spots = spotsResp?.data ?? [];
  const interviewSetting = interviewResp?.data?.[0] ?? interviewResp?.[0];

  // Build live rate map from DB — keep latest rate per currency (allRates ordered ASC, so last write wins)
  const allRates: any[] = ratesResp?.data ?? [];
  const liveRates: Record<string, { rate: number; date: string }> = {};
  for (const r of allRates) {
    if (r.fromCurrency === "AUD") {
      const k = r.toCurrency.toUpperCase();
      // Always overwrite so last entry (latest effectiveDate, ASC order) wins
      liveRates[k] = { rate: parseFloat(r.rate), date: r.effectiveDate };
    }
  }
  const getRateFor = (ccy: string) => liveRates[ccy]?.rate ?? RATES[ccy] ?? 1;
  const rateDate = Object.values(liveRates)[0]?.date ?? "—";

  // Only show currency columns/fields for currencies that have a DB exchange rate
  const activeCurrencies = CURRENCIES.filter(c => c.ccy === "AUD" || !!liveRates[c.ccy]);

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

  const createSpot = useMutation({
    mutationFn: (payload: any) => axios.post(`${BASE}/api/enrollment-spots`, payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["spots-by-group", id] }); setShowSpotDialog(false); toast({ title: "Enrollment spot created" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to create spot" }),
  });
  const updateSpot = useMutation({
    mutationFn: ({ spotId, data }: { spotId: string; data: any }) =>
      axios.put(`${BASE}/api/enrollment-spots/${spotId}`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["spots-by-group", id] }); setShowSpotDialog(false); toast({ title: "Enrollment spot updated" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to update spot" }),
  });
  const deleteSpot = useMutation({
    mutationFn: (spotId: string) => axios.delete(`${BASE}/api/enrollment-spots/${spotId}`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["spots-by-group", id] }); setDeletingSpotId(null); toast({ title: "Enrollment spot deleted" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to delete spot" }),
  });

  const openAddSpot = () => { setEditingSpot(null); setSpotForm(EMPTY_SPOT); setShowSpotDialog(true); };
  const openEditSpot = (s: any) => {
    setEditingSpot(s);
    setSpotForm({
      gradeLabel: s.gradeLabel ?? "",
      gradeOrder: String(s.gradeOrder ?? 0),
      totalSpots: String(s.totalSpots ?? ""),
      manualReserved: String(s.manualReserved ?? 0),
      status: s.status ?? "available",
      startDate: s.startDate ? s.startDate.slice(0, 10) : "",
      endDate: s.endDate ? s.endDate.slice(0, 10) : "",
      dobRangeStart: s.dobRangeStart ? s.dobRangeStart.slice(0, 10) : "",
      dobRangeEnd: s.dobRangeEnd ? s.dobRangeEnd.slice(0, 10) : "",
    });
    setShowSpotDialog(true);
  };
  const handleSpotSave = () => {
    const payload = {
      packageGroupId: id,
      gradeLabel: spotForm.gradeLabel,
      gradeOrder: Number(spotForm.gradeOrder || 0),
      totalSpots: Number(spotForm.totalSpots),
      manualReserved: Number(spotForm.manualReserved || 0),
      status: spotForm.status,
      startDate: spotForm.startDate || null,
      endDate: spotForm.endDate || null,
      dobRangeStart: spotForm.dobRangeStart || null,
      dobRangeEnd: spotForm.dobRangeEnd || null,
    };
    if (editingSpot) {
      updateSpot.mutate({ spotId: editingSpot.id, data: payload });
    } else {
      createSpot.mutate(payload);
    }
  };

  const { isEditing, isSaving, formData, startEdit, cancelEdit, setField, saveEdit, getValue } = useDetailEdit({
    initialData: group ?? {},
    onSave: async (data) => { await updateGroup.mutateAsync(data); },
  });

  // Coordinator list — only fetched when editing (isEditing is now defined above)
  const { data: coordinatorsData } = useQuery({
    queryKey: ["users-coordinators"],
    queryFn: () => axios.get(`${BASE}/api/users?role=camp_coordinator&limit=100`).then(r => r.data),
    enabled: isEditing,
  });
  const coordinators: any[] = coordinatorsData?.data ?? [];

  // Product types — always fetched for display, cached
  // NOTE: /api/product-types returns a plain array (not { data: [...] })
  const { data: productTypesData } = useQuery({
    queryKey: ["product-types-active"],
    queryFn: () => axios.get(`${BASE}/api/product-types?status=Active`).then(r => r.data),
    staleTime: 120_000,
  });
  const productTypesList: any[] = Array.isArray(productTypesData) ? productTypesData : [];

  const canEdit = ["super_admin", "admin", "camp_coordinator"].includes(user?.role ?? "");

  const DECIMAL_CCYS = new Set(["USD", "SGD", "GBP", "EUR", "NZD"]);
  const handlePkgAudChange = (v: string) => {
    setPkgForm(f => {
      const aud = parseFloat(v) || 0;
      if (!autoConvert) return { ...f, priceAud: v };
      const updates: Record<string, string> = { priceAud: v };
      activeCurrencies.forEach(c => {
        if (c.ccy === "AUD") return;
        const rate = getRateFor(c.ccy);
        updates[c.field] = aud
          ? DECIMAL_CCYS.has(c.ccy)
            ? (aud * rate).toFixed(2)
            : Math.round(aud * rate / 100) * 100 + ""
          : "";
      });
      return { ...f, ...updates };
    });
  };

  const openPkgDialog = (pkg?: Pkg) => {
    setEditingPkg(pkg ?? null);
    setPkgForm(pkg ? {
      name: pkg.name, durationDays: String(pkg.durationDays),
      maxParticipants: String(pkg.maxParticipants ?? ""),
      maxAdults: String(pkg.maxAdults ?? ""),
      maxStudents: String(pkg.maxStudents ?? ""),
      priceAud: pkg.priceAud ?? "", priceUsd: pkg.priceUsd ?? "", priceKrw: pkg.priceKrw ?? "",
      priceJpy: pkg.priceJpy ?? "", priceThb: pkg.priceThb ?? "", pricePhp: pkg.pricePhp ?? "",
      priceSgd: pkg.priceSgd ?? "", priceGbp: pkg.priceGbp ?? "",
    } : emptyPkg);
    setShowPkgDialog(true);
  };

  const submitPkg = () => {
    const payload = {
      packageGroupId: id, name: pkgForm.name,
      durationDays: parseInt(pkgForm.durationDays) || 1,
      maxParticipants: pkgForm.maxParticipants ? parseInt(pkgForm.maxParticipants) : null,
      maxAdults: pkgForm.maxAdults ? parseInt(pkgForm.maxAdults) : null,
      maxStudents: pkgForm.maxStudents ? parseInt(pkgForm.maxStudents) : null,
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

              {/* Type — Product Type dropdown */}
              <DetailRow label="Type">
                {isEditing ? (
                  <Select
                    value={getValue("typeId") ?? "none"}
                    onValueChange={v => setField("typeId", v === "none" ? null : v)}
                  >
                    <SelectTrigger className="h-8 text-sm border-[#F5821F]">
                      <SelectValue placeholder="— Select type —" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      <SelectItem value="none">— None —</SelectItem>
                      {productTypesList.map((pt: any) => (
                        <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-sm">
                    {group.typeName
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FEF0E3] text-[#F5821F] text-xs font-medium border border-[#F5821F33]">{group.typeName}</span>
                      : <span className="text-muted-foreground/60">—</span>
                    }
                  </span>
                )}
              </DetailRow>

              {/* Min Age / Max Age — English only */}
              <DetailRow label="Min Age">
                {isEditing ? (
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={getValue("minAge") ?? ""}
                    onChange={e => setField("minAge", e.target.value === "" ? null : parseInt(e.target.value))}
                    placeholder="e.g. 7"
                    className="h-8 px-2 text-sm border border-[#F5821F] rounded-md focus:outline-none focus:ring-1 focus:ring-[#F5821F] w-full"
                  />
                ) : (
                  <span className="text-sm">
                    {group.minAge != null
                      ? <span className="font-semibold text-blue-600">{group.minAge} yrs</span>
                      : <span className="text-muted-foreground/60">—</span>}
                  </span>
                )}
              </DetailRow>

              <DetailRow label="Max Age">
                {isEditing ? (
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={getValue("maxAge") ?? ""}
                    onChange={e => setField("maxAge", e.target.value === "" ? null : parseInt(e.target.value))}
                    placeholder="e.g. 17"
                    className="h-8 px-2 text-sm border border-[#F5821F] rounded-md focus:outline-none focus:ring-1 focus:ring-[#F5821F] w-full"
                  />
                ) : (
                  <span className="text-sm">
                    {group.maxAge != null
                      ? <span className="font-semibold text-blue-600">{group.maxAge} yrs</span>
                      : <span className="text-muted-foreground/60">—</span>}
                  </span>
                )}
              </DetailRow>

              <DetailRow label="Start Date">
                {isEditing ? (
                  <input
                    type="date"
                    value={getValue("startDate") ? new Date(getValue("startDate")).toISOString().slice(0, 10) : ""}
                    onChange={e => setField("startDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
                    className="h-8 px-2 text-sm border border-[#F5821F] rounded-md focus:outline-none focus:ring-1 focus:ring-[#F5821F] w-full"
                  />
                ) : (
                  <span className="text-sm">{group.startDate ? format(new Date(group.startDate), "PPP") : <span className="text-muted-foreground/60">—</span>}</span>
                )}
              </DetailRow>
              <DetailRow label="End Date">
                {isEditing ? (
                  <input
                    type="date"
                    value={getValue("endDate") ? new Date(getValue("endDate")).toISOString().slice(0, 10) : ""}
                    onChange={e => setField("endDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
                    className="h-8 px-2 text-sm border border-[#F5821F] rounded-md focus:outline-none focus:ring-1 focus:ring-[#F5821F] w-full"
                  />
                ) : (
                  <span className="text-sm">{group.endDate ? format(new Date(group.endDate), "PPP") : <span className="text-muted-foreground/60">—</span>}</span>
                )}
              </DetailRow>
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
              <DetailRow label="Thumbnail">
                {canEdit ? (
                  <ThumbnailUploader
                    currentUrl={group.thumbnailUrl}
                    onUploaded={async (objectPath) => {
                      await updateGroup.mutateAsync({ ...group, thumbnailUrl: objectPath || null });
                    }}
                  />
                ) : group.thumbnailUrl ? (
                  <img
                    src={group.thumbnailUrl.startsWith("/objects/") ? `${BASE}/api/storage${group.thumbnailUrl}` : group.thumbnailUrl}
                    alt="Thumbnail"
                    className="w-full max-w-xs rounded-lg object-cover border"
                    style={{ aspectRatio: "16/9" }}
                  />
                ) : (
                  <span className="text-muted-foreground/60 text-sm">—</span>
                )}
              </DetailRow>
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

            {/* Duration, Inclusions, Exclusions */}
            <DetailSection title="Duration" className="lg:col-span-2">
              <DetailRow label="Duration">
                {isEditing ? (
                  <Input
                    value={getValue("durationText") ?? ""}
                    onChange={e => setField("durationText", e.target.value)}
                    placeholder="e.g. 14 nights 15 days"
                    className="h-8 text-sm border-[#F5821F] focus-visible:ring-[#F5821F]"
                  />
                ) : (
                  <span className="text-sm">{group.durationText || <span className="text-muted-foreground/60">—</span>}</span>
                )}
              </DetailRow>
            </DetailSection>

            <DetailSection title="Inclusions" className="lg:col-span-2">
              {isEditing ? (
                <textarea value={getValue("inclusionsEn") ?? ""} onChange={e => setField("inclusionsEn", e.target.value)}
                  placeholder={"One item per line\nInternational flights\nAirport transfers\nAccommodation"}
                  className="w-full border border-[#F5821F] rounded-md px-3 py-2 text-sm resize-none h-28 focus:outline-none focus:ring-1 focus:ring-[#F5821F]" />
              ) : group.inclusionsEn ? (
                <ul className="space-y-1">
                  {group.inclusionsEn.split("\n").filter(Boolean).map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-[#F5821F] mt-0.5">✓</span> {item.trim()}
                    </li>
                  ))}
                </ul>
              ) : <span className="text-muted-foreground/60 text-sm">—</span>}
            </DetailSection>

            <DetailSection title="Exclusions" className="lg:col-span-2">
              {isEditing ? (
                <textarea value={getValue("exclusionsEn") ?? ""} onChange={e => setField("exclusionsEn", e.target.value)}
                  placeholder={"One item per line\nPersonal expenses\nOptional excursions\nTravel insurance"}
                  className="w-full border border-[#F5821F] rounded-md px-3 py-2 text-sm resize-none h-28 focus:outline-none focus:ring-1 focus:ring-[#F5821F]" />
              ) : group.exclusionsEn ? (
                <ul className="space-y-1">
                  {group.exclusionsEn.split("\n").filter(Boolean).map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-red-400 mt-0.5">✗</span> {item.trim()}
                    </li>
                  ))}
                </ul>
              ) : <span className="text-muted-foreground/60 text-sm">—</span>}
            </DetailSection>

            {/* Coordinator Section */}
            <DetailSection title="Camp Coordinator" className="lg:col-span-2">
              {isEditing ? (
                <div className="space-y-2">
                  <Select
                    value={getValue("campProviderId") || "none"}
                    onValueChange={v => setField("campProviderId", v === "none" ? null : v)}
                  >
                    <SelectTrigger className="h-9 text-sm border-[#F5821F]">
                      <SelectValue placeholder="— Select coordinator —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— No coordinator assigned —</SelectItem>
                      {coordinators.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.fullName} · {c.email}
                          {c.companyName ? ` · ${c.companyName}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : group.coordinator ? (
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#F5821F]/10 flex items-center justify-center shrink-0">
                      <UserRound className="w-5 h-5 text-[#F5821F]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{group.coordinator.fullName}</p>
                      {group.coordinator.companyName && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" /> {group.coordinator.companyName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {group.coordinator.email && (
                      <a href={`mailto:${group.coordinator.email}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                        <Mail className="w-3.5 h-3.5" /> {group.coordinator.email}
                      </a>
                    )}
                    {group.coordinator.phone && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> {group.coordinator.phone}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground/60 italic">No coordinator assigned to this program.</p>
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
                    <th className="px-4 py-2.5 text-right">어른</th>
                    <th className="px-4 py-2.5 text-right">학생</th>
                    <th className="px-4 py-2.5 text-right">Max</th>
                    {activeCurrencies.map(c => <th key={c.ccy} className="px-3 py-2.5 text-right">{c.flag} {c.ccy}</th>)}
                    <th className="px-4 py-2.5 text-center">Status</th>
                    {canEdit && <th className="px-4 py-2.5" />}
                  </tr>
                </thead>
                <tbody>
                  {pkgs.length === 0 ? (
                    <tr><td colSpan={14} className="px-4 py-8 text-center text-muted-foreground text-xs">No packages yet</td></tr>
                  ) : pkgs.map(p => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-[#FEF0E3]/50">
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-right text-blue-600">{p.maxAdults ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-green-600">{p.maxStudents ?? "—"}</td>
                      <td className="px-4 py-3 text-right">{p.maxParticipants ?? "—"}</td>
                      {activeCurrencies.map(c => (
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
          <div className="space-y-3">
            {/* Toolbar */}
            {canEdit && (
              <div className="flex justify-end">
                <Button size="sm" onClick={openAddSpot} className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add Enrollment Spot
                </Button>
              </div>
            )}

            {/* Table */}
            <div className="bg-card rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-xs text-muted-foreground font-semibold">
                    <th className="px-4 py-2.5 text-left">Grade / Label</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                    <th className="px-4 py-2.5 text-right">Reserved</th>
                    <th className="px-4 py-2.5 text-right">Manual Hold</th>
                    <th className="px-4 py-2.5 text-right text-green-700">Available</th>
                    <th className="px-4 py-2.5 text-left">Program Dates</th>
                    <th className="px-4 py-2.5 text-left">DOB Range</th>
                    {canEdit && <th className="px-4 py-2.5 w-20" />}
                  </tr>
                </thead>
                <tbody>
                  {spots.length === 0 ? (
                    <tr>
                      <td colSpan={canEdit ? 9 : 8} className="px-4 py-12 text-center">
                        <div className="text-muted-foreground/40 text-3xl mb-2">🎫</div>
                        <p className="text-muted-foreground text-sm">No enrollment spots yet</p>
                        {canEdit && (
                          <button onClick={openAddSpot} className="mt-2 text-xs text-[#F5821F] underline">
                            + Add first spot
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : spots.map((s: any) => {
                    const available = (s.totalSpots ?? 0) - (s.reservedSpots ?? 0) - (s.manualReserved ?? 0);
                    const statusColors: Record<string, string> = {
                      available: "bg-green-100 text-green-700",
                      waitlist: "bg-amber-100 text-amber-700",
                      closed: "bg-red-100 text-red-700",
                    };
                    const fmtDate = (d: string | null) => d ? format(new Date(d), "MMM d, yyyy") : "—";
                    return (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-[#FEF0E3]/50">
                        <td className="px-4 py-3">
                          <div className="font-semibold">{s.gradeLabel}</div>
                          {s.gradeOrder != null && (
                            <div className="text-[11px] text-muted-foreground">Order: {s.gradeOrder}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusColors[s.status ?? "available"] ?? "bg-gray-100 text-gray-600"}`}>
                            {s.status ?? "available"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">{s.totalSpots}</td>
                        <td className="px-4 py-3 text-right font-mono text-orange-600">{s.reservedSpots ?? 0}</td>
                        <td className="px-4 py-3 text-right font-mono text-blue-600">{s.manualReserved ?? 0}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-green-600">{Math.max(0, available)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          <div>{fmtDate(s.startDate)}</div>
                          {s.endDate && <div className="text-muted-foreground/60">→ {fmtDate(s.endDate)}</div>}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {s.dobRangeStart || s.dobRangeEnd ? (
                            <div>
                              <div>{fmtDate(s.dobRangeStart)}</div>
                              {s.dobRangeEnd && <div className="text-muted-foreground/60">→ {fmtDate(s.dobRangeEnd)}</div>}
                            </div>
                          ) : "—"}
                        </td>
                        {canEdit && (
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                onClick={() => openEditSpot(s)}
                                className="p-1.5 rounded hover:bg-[#F5821F]/10 text-muted-foreground hover:text-[#F5821F] transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingSpotId(s.id)}
                                className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                                title="Delete"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary bar */}
            {spots.length > 0 && (
              <div className="flex items-center gap-6 px-4 py-2.5 bg-muted/30 rounded-lg border text-sm">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Total</span>
                <span className="font-mono"><span className="text-muted-foreground text-xs mr-1">Spots:</span><strong>{spots.reduce((a: number, s: any) => a + (s.totalSpots ?? 0), 0)}</strong></span>
                <span className="font-mono"><span className="text-muted-foreground text-xs mr-1">Reserved:</span><strong className="text-orange-600">{spots.reduce((a: number, s: any) => a + (s.reservedSpots ?? 0), 0)}</strong></span>
                <span className="font-mono"><span className="text-muted-foreground text-xs mr-1">Manual:</span><strong className="text-blue-600">{spots.reduce((a: number, s: any) => a + (s.manualReserved ?? 0), 0)}</strong></span>
                <span className="font-mono"><span className="text-muted-foreground text-xs mr-1">Available:</span><strong className="text-green-600">{spots.reduce((a: number, s: any) => a + Math.max(0, (s.totalSpots ?? 0) - (s.reservedSpots ?? 0) - (s.manualReserved ?? 0)), 0)}</strong></span>
              </div>
            )}
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
      <Dialog open={showPkgDialog} onOpenChange={o => { if (!o) { setShowPkgDialog(false); setShowPkgAddProduct(false); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPkg ? "Edit Package" : "Add Package"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            {/* Basic Info */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">기본 정보</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label className="text-xs">Package Name</Label>
                  <Input value={pkgForm.name} onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))} className="mt-1 h-8 text-sm" /></div>
                <div><Label className="text-xs">기간 (Duration Days)</Label>
                  <Input type="number" value={pkgForm.durationDays} onChange={e => setPkgForm(f => ({ ...f, durationDays: e.target.value }))} className="mt-1 h-8 text-sm" /></div>
                <div><Label className="text-xs">전체 인원 (Max Participants)</Label>
                  <Input type="number" value={pkgForm.maxParticipants} onChange={e => setPkgForm(f => ({ ...f, maxParticipants: e.target.value }))} className="mt-1 h-8 text-sm" /></div>
                <div><Label className="text-xs">어른 인원 (Max Adults)</Label>
                  <Input type="number" value={pkgForm.maxAdults} onChange={e => setPkgForm(f => ({ ...f, maxAdults: e.target.value }))} className="mt-1 h-8 text-sm" placeholder="—" /></div>
                <div><Label className="text-xs">학생 인원 (Max Students)</Label>
                  <Input type="number" value={pkgForm.maxStudents} onChange={e => setPkgForm(f => ({ ...f, maxStudents: e.target.value }))} className="mt-1 h-8 text-sm" placeholder="—" /></div>
              </div>
            </div>

            {/* Pricing */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">가격 (Pricing)</p>
                <div className="flex items-center gap-2">
                  <Switch id="ac-pkg" checked={autoConvert} onCheckedChange={setAutoConvert} />
                  <label htmlFor="ac-pkg" className="text-xs text-muted-foreground cursor-pointer">AUD 기준 자동 환산</label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {activeCurrencies.map(c => (
                  <div key={c.ccy}>
                    <Label className="text-xs">{c.flag} {c.label}</Label>
                    <Input type="number" value={(pkgForm as any)[c.field]} onChange={e => {
                      if (c.field === "priceAud") handlePkgAudChange(e.target.value);
                      else setPkgForm(f => ({ ...f, [c.field]: e.target.value }));
                    }} className={`mt-1 h-8 text-sm font-mono ${autoConvert && c.field !== "priceAud" ? "bg-muted/50 text-muted-foreground" : ""}`} readOnly={autoConvert && c.field !== "priceAud"} />
                  </div>
                ))}
              </div>
            </div>

            {/* Per-package Products (only when editing existing package) */}
            {editingPkg && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">추가 상품 (Add-on Products)</p>
                  <Button size="sm" variant="outline" className="h-6 text-xs gap-1 border-[#F5821F] text-[#F5821F] hover:bg-[#FEF0E3]"
                    onClick={() => { setPkgProdTypeFilter("all"); setSelectedPkgProdId(null); setPkgAddQty(1); setPkgAddUnitPrice(""); setPkgAddIsOptional(false); setPkgAddError(null); setShowPkgAddProduct(true); }}>
                    <Plus className="h-3 w-3" /> 상품 추가
                  </Button>
                </div>
                {pkgProductsLoading ? (
                  <div className="h-10 bg-muted/30 rounded animate-pulse" />
                ) : pkgLinkedProducts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">연결된 상품 없음</p>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/30 border-b text-muted-foreground">
                          <th className="px-3 py-2 text-left">Product</th>
                          <th className="px-3 py-2 text-left">Type</th>
                          <th className="px-3 py-2 text-center">구분</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2 text-right">Price</th>
                          <th className="px-3 py-2 w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {pkgLinkedProducts.map((row: any) => (
                          <tr key={row.linkId} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="px-3 py-2 font-medium">{row.productName}</td>
                            <td className="px-3 py-2 text-muted-foreground capitalize">{row.productType}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${row.isOptional ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-700"}`}>
                                {row.isOptional ? "선택" : "포함"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">{row.quantity ?? 1}</td>
                            <td className="px-3 py-2 text-right font-mono">
                              {row.unitPrice ? `${row.currency ?? "AUD"} ${Number(row.unitPrice).toLocaleString()}` : row.cost ? `${row.currency ?? "AUD"} ${Number(row.cost).toLocaleString()}` : "—"}
                            </td>
                            <td className="px-3 py-2">
                              <button className="text-muted-foreground hover:text-red-500 transition-colors"
                                onClick={() => { if (window.confirm("Remove product?")) unlinkPkgProduct.mutate(row.productId); }}>
                                <X className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Add product to package inline picker */}
                {showPkgAddProduct && (
                  <div className="mt-2 border border-[#F5821F33] rounded-lg p-3 bg-[#FEF0E3]/30 space-y-2">
                    <div className="flex gap-1.5 flex-wrap">
                      {["all", "institute", "hotel", "pickup", "tour", "settlement"].map(t => (
                        <button key={t} onClick={() => { setPkgProdTypeFilter(t); setSelectedPkgProdId(null); }}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${pkgProdTypeFilter === t ? "bg-[#FEF0E3] text-[#F5821F] border-[#F5821F33]" : "border-border text-muted-foreground hover:bg-muted"}`}>
                          {t === "all" ? "All" : t}
                        </button>
                      ))}
                    </div>
                    <div className="max-h-36 overflow-y-auto border border-border rounded-md divide-y bg-white">
                      {allActiveProducts
                        .filter((p: any) => pkgProdTypeFilter === "all" || p.productType === pkgProdTypeFilter)
                        .filter((p: any) => !pkgLinkedProducts.some((l: any) => l.productId === p.id))
                        .map((p: any) => (
                          <label key={p.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/40">
                            <input type="radio" name="pkg-sel-prod" value={p.id}
                              checked={selectedPkgProdId === p.id}
                              onChange={() => { setSelectedPkgProdId(p.id); setPkgAddUnitPrice(p.cost ?? ""); }}
                              className="shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-medium truncate block">{p.productName}</span>
                              <span className="text-[11px] text-muted-foreground">{p.currency} {p.cost ? Number(p.cost).toLocaleString() : "—"}</span>
                            </div>
                          </label>
                        ))}
                    </div>
                    {selectedPkgProdId && (
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-[11px]">Qty</Label>
                          <Input type="number" min={1} value={pkgAddQty} onChange={e => setPkgAddQty(Number(e.target.value))} className="mt-0.5 h-7 text-xs" />
                        </div>
                        <div>
                          <Label className="text-[11px]">Unit Price</Label>
                          <Input type="number" step="0.01" value={pkgAddUnitPrice} onChange={e => setPkgAddUnitPrice(e.target.value)} className="mt-0.5 h-7 text-xs font-mono" />
                        </div>
                        <div>
                          <Label className="text-[11px]">구분</Label>
                          <Select value={pkgAddIsOptional ? "optional" : "included"} onValueChange={v => setPkgAddIsOptional(v === "optional")}>
                            <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="included">포함</SelectItem>
                              <SelectItem value="optional">선택</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                    {pkgAddError && <p className="text-xs text-red-500">{pkgAddError}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs bg-[#F5821F] hover:bg-[#d97706] text-white"
                        disabled={!selectedPkgProdId || linkPkgProduct.isPending}
                        onClick={() => linkPkgProduct.mutate({ productId: selectedPkgProdId, isOptional: pkgAddIsOptional, quantity: pkgAddQty, unitPrice: pkgAddUnitPrice || null })}>
                        {linkPkgProduct.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} 추가
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowPkgAddProduct(false)}>취소</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1 border-t">
              <Button size="sm" className="flex-1 bg-[#F5821F] hover:bg-[#d97706] text-white"
                onClick={submitPkg} disabled={createPkg.isPending || updatePkg.isPending || !pkgForm.name}>
                {createPkg.isPending || updatePkg.isPending ? "Saving…" : editingPkg ? "Update" : "Create"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowPkgDialog(false); setShowPkgAddProduct(false); }}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enrollment Spot Add/Edit Dialog */}
      <Dialog open={showSpotDialog} onOpenChange={o => { if (!o) setShowSpotDialog(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSpot ? "Edit Enrollment Spot" : "Add Enrollment Spot"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Grade Label & Order */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Grade / Label <span className="text-red-500">*</span></Label>
                <Input
                  value={spotForm.gradeLabel}
                  onChange={e => setSpotForm(f => ({ ...f, gradeLabel: e.target.value }))}
                  placeholder="e.g. Grade 4–6, Elementary"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sort Order</Label>
                <Input
                  type="number" min="0"
                  value={spotForm.gradeOrder}
                  onChange={e => setSpotForm(f => ({ ...f, gradeOrder: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Spots */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Total Spots <span className="text-red-500">*</span></Label>
                <Input
                  type="number" min="0"
                  value={spotForm.totalSpots}
                  onChange={e => setSpotForm(f => ({ ...f, totalSpots: e.target.value }))}
                  className="h-8 text-sm"
                  placeholder="30"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Manual Hold</Label>
                <Input
                  type="number" min="0"
                  value={spotForm.manualReserved}
                  onChange={e => setSpotForm(f => ({ ...f, manualReserved: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={spotForm.status} onValueChange={v => setSpotForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="waitlist">Waitlist</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Program Dates */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Program Dates</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    value={spotForm.startDate}
                    onChange={e => setSpotForm(f => ({ ...f, startDate: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    value={spotForm.endDate}
                    onChange={e => setSpotForm(f => ({ ...f, endDate: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* DOB Range */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date of Birth Range (Eligibility)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">DOB From (oldest)</Label>
                  <Input
                    type="date"
                    value={spotForm.dobRangeStart}
                    onChange={e => setSpotForm(f => ({ ...f, dobRangeStart: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">DOB To (youngest)</Label>
                  <Input
                    type="date"
                    value={spotForm.dobRangeEnd}
                    onChange={e => setSpotForm(f => ({ ...f, dobRangeEnd: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1 border-t">
              <Button size="sm" variant="outline" onClick={() => setShowSpotDialog(false)}>Cancel</Button>
              <Button
                size="sm"
                onClick={handleSpotSave}
                disabled={!spotForm.gradeLabel || !spotForm.totalSpots || createSpot.isPending || updateSpot.isPending}
                className="bg-[#F5821F] hover:bg-[#d97706] text-white min-w-[80px]"
              >
                {(createSpot.isPending || updateSpot.isPending) ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : editingSpot ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Spot Confirmation */}
      <Dialog open={!!deletingSpotId} onOpenChange={o => { if (!o) setDeletingSpotId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Enrollment Spot?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone. All spot data will be permanently removed.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setDeletingSpotId(null)}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => deletingSpotId && deleteSpot.mutate(deletingSpotId)}
              disabled={deleteSpot.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteSpot.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
