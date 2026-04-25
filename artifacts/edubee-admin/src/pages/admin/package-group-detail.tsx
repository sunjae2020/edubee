import { useState } from "react";
import { CampPhotosTab } from "./CampPhotosTab";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SystemInfoSection } from "@/components/shared/SystemInfoSection";
import axios from "axios";
import { UserRound, Mail, Phone, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { DetailPageLayout, DetailSection, DetailRow, EditableField } from "@/components/shared/DetailPageLayout";
import { PackageGroupImageGallery } from "@/components/shared/PackageGroupImageGallery";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useDetailEdit } from "@/hooks/useDetailEdit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, RefreshCw, X, Loader2, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Reusable partner field (account link + manual text override) ──────────────
function PartnerField({
  label, isEditing,
  accountId, accountName,
  manualName, displayManualName,
  accountsList,
  onAccountChange, onManualChange,
}: {
  label: string; isEditing: boolean;
  accountId?: string | null; accountName?: string | null;
  manualName?: string | null; displayManualName?: string | null;
  accountsList: any[];
  onAccountChange: (v: string) => void;
  onManualChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {isEditing ? (
        <>
          <Select value={accountId ?? "none"} onValueChange={onAccountChange}>
            <SelectTrigger className="h-8 text-sm border-(--e-orange)">
              <SelectValue placeholder="— Link account —" />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto">
              <SelectItem value="none">— No account linked —</SelectItem>
              {accountsList.map((a: any) => (
                <SelectItem key={a.id} value={a.id}>{a.name}{a.city ? ` · ${a.city}` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input value={manualName ?? ""} onChange={e => onManualChange(e.target.value)}
            placeholder="Or enter name manually"
            className="h-8 text-sm border-dashed border-muted-foreground/40 focus-visible:ring-(--e-orange)" />
        </>
      ) : (
        <div className="space-y-0.5">
          {accountName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
              <Building2 className="w-3 h-3" /> {accountName}
            </span>
          )}
          {displayManualName && <span className="text-sm block">{displayManualName}</span>}
          {!accountName && !displayManualName && <span className="text-sm text-muted-foreground/60">—</span>}
        </div>
      )}
    </div>
  );
}

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
  { key: "general",      label: "General" },
  { key: "packages",     label: "Packages" },
  { key: "spots",        label: "Enrollment Spots" },
  { key: "interview",    label: "Interview" },
  { key: "camp-photos",  label: "Camp Photos" },
  { key: "coordinator",  label: "Coordinator" },
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
  const [location, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const isCC = user?.role === "camp_coordinator";
  const isDelegated = new URLSearchParams(location.split("?")[1] ?? "").get("delegated") === "1"
    || isCC;
  const [activeTab, setActiveTab] = useState("general");
  const [showPkgDialog, setShowPkgDialog] = useState(false);
  const [editingPkg, setEditingPkg] = useState<Pkg | null>(null);
  const [pkgForm, setPkgForm] = useState(emptyPkg);
  const [autoConvert, setAutoConvert] = useState(false);

  // Enrollment Spots state
  const EMPTY_SPOT = { enrollName: "", gradeLabel: "", gradeOrder: "0", totalSpots: "", manualReserved: "0", status: "available", startDate: "", endDate: "", dobRangeStart: "", dobRangeEnd: "", note: "" };
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
    queryFn: () => axios.get(`${BASE}/api/products?status=active&limit=200`).then(r => { const d = r.data?.data ?? r.data; return Array.isArray(d) ? d : []; }),
    enabled: showPkgAddProduct,
  });
  const allActiveProducts: any[] = Array.isArray(allActiveProductsData) ? allActiveProductsData : ((allActiveProductsData as any)?.data ?? []);

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

  const cloneGroup = useMutation({
    mutationFn: () =>
      axios.post(`${BASE}/api/package-groups/${id}/clone`).then(r => r.data),
    onSuccess: (cloned) => {
      qc.invalidateQueries({ queryKey: ["package-groups"] });
      toast({ title: "Package group cloned", description: `"${cloned.nameEn}" created` });
      setLocation(`/admin/package-groups/${cloned.id}`);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to clone package group" }),
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
      enrollName: s.enrollName ?? "",
      gradeLabel: s.gradeLabel ?? "",
      gradeOrder: String(s.gradeOrder ?? 0),
      totalSpots: String(s.totalSpots ?? ""),
      manualReserved: String(s.manualReserved ?? 0),
      status: s.status ?? "available",
      startDate: s.startDate ? s.startDate.slice(0, 10) : "",
      endDate: s.endDate ? s.endDate.slice(0, 10) : "",
      dobRangeStart: s.dobRangeStart ? s.dobRangeStart.slice(0, 10) : "",
      dobRangeEnd: s.dobRangeEnd ? s.dobRangeEnd.slice(0, 10) : "",
      note: s.note ?? "",
    });
    setShowSpotDialog(true);
  };
  const handleSpotSave = () => {
    const payload = {
      packageGroupId: id,
      enrollName: spotForm.enrollName || null,
      gradeLabel: spotForm.gradeLabel,
      gradeOrder: Number(spotForm.gradeOrder || 0),
      totalSpots: Number(spotForm.totalSpots),
      manualReserved: Number(spotForm.manualReserved || 0),
      status: spotForm.status,
      startDate: spotForm.startDate || null,
      endDate: spotForm.endDate || null,
      dobRangeStart: spotForm.dobRangeStart || null,
      dobRangeEnd: spotForm.dobRangeEnd || null,
      note: spotForm.note || null,
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

  // Coordinator organisations list — only fetched when editing
  const { data: coordinators = [] } = useQuery<{ id: string; name: string; subdomain?: string | null; email?: string | null; websiteUrl?: string | null; status?: string | null }[]>({
    queryKey: ["camp-coordinator-orgs"],
    queryFn: () => axios.get(`${BASE}/api/crm/coordinators`).then(r => r.data),
    enabled: isEditing,
    staleTime: 300000,
  });

  // ── Coordinator Delegation (Cross-Tenant) ──────────────────────────────
  const [showCoordModal, setShowCoordModal] = useState(false);
  const [coordSearch, setCoordSearch] = useState("");
  const [selectedCoordOrgId, setSelectedCoordOrgId] = useState<string | null>(null);
  const [coordPermissions, setCoordPermissions] = useState({
    view: true, edit: true, soft_delete: true, manage_finance: false,
  });
  const [coordNotes, setCoordNotes] = useState("");
  const [showRevokeConfirm, setShowRevokeConfirm] = useState<string | null>(null);

  const { data: delegationsResp, refetch: refetchDelegations } = useQuery({
    queryKey: ["coordinator-delegations", id],
    queryFn: () => axios.get(`${BASE}/api/package-groups/${id}/coordinators`).then(r => r.data),
    enabled: activeTab === "coordinator",
  });
  const delegations: any[] = delegationsResp?.data ?? [];

  const { data: orgSearchResp } = useQuery({
    queryKey: ["org-search", coordSearch],
    queryFn: () => axios.get(`${BASE}/api/organisations/search?q=${encodeURIComponent(coordSearch)}`).then(r => r.data),
    enabled: showCoordModal,
    staleTime: 30000,
  });
  const orgSearchResults: any[] = orgSearchResp?.data ?? [];

  const COORD_PRESETS = [
    { label: "운영 전담", perms: { view: true, edit: true, soft_delete: true, manage_finance: false } },
    { label: "운영 + 재무 읽기", perms: { view: true, edit: true, soft_delete: true, manage_finance: false } },
    { label: "운영 + 재무 관리", perms: { view: true, edit: true, soft_delete: true, manage_finance: true } },
  ];

  const assignCoordinator = useMutation({
    mutationFn: () => axios.post(`${BASE}/api/package-groups/${id}/coordinators`, {
      coordinatorOrgId: selectedCoordOrgId,
      permissions: coordPermissions,
      notes: coordNotes || null,
    }),
    onSuccess: () => {
      refetchDelegations();
      setShowCoordModal(false);
      setSelectedCoordOrgId(null);
      setCoordSearch("");
      setCoordNotes("");
      setCoordPermissions({ view: true, edit: true, soft_delete: true, manage_finance: false });
      toast({ title: "Coordinator assigned", description: "Delegation is pending acceptance." });
    },
    onError: (err: any) => toast({ variant: "destructive", title: err?.response?.data?.message ?? "Failed to assign coordinator" }),
  });

  const revokeCoordinator = useMutation({
    mutationFn: (coordinatorId: string) =>
      axios.put(`${BASE}/api/package-groups/${id}/coordinators/${coordinatorId}/revoke`),
    onSuccess: () => {
      refetchDelegations();
      setShowRevokeConfirm(null);
      toast({ title: "Delegation revoked", description: "30-day grace period started." });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to revoke delegation" }),
  });

  // Accounts lookup — for partner account linking
  const { data: accountsLookupData } = useQuery({
    queryKey: ["accounts-lookup"],
    queryFn: () => axios.get(`${BASE}/api/packages/products-lookup/accounts`).then(r => r.data),
    staleTime: 120_000,
  });
  const accountsList: any[] = Array.isArray(accountsLookupData) ? accountsLookupData : [];

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
        backPath={isDelegated ? "/admin/delegated-packages" : "/admin/package-groups"}
        backLabel={isDelegated ? "Delegated Packages" : "Package Groups"}
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(t) => { setActiveTab(t); if (isEditing) cancelEdit(); }}
        canEdit={canEdit && activeTab === "general"}
        isEditing={isEditing}
        isSaving={isSaving}
        onEdit={startEdit}
        onSave={saveEdit}
        onCancel={cancelEdit}
        headerExtra={
          !isEditing && canEdit ? (
            <Button
              size="sm"
              onClick={() => cloneGroup.mutate()}
              disabled={cloneGroup.isPending}
              className="gap-1.5 bg-(--e-orange) hover:bg-[#d97706] text-white"
            >
              {cloneGroup.isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Copy className="h-3.5 w-3.5" />
              }
              Clone
            </Button>
          ) : undefined
        }
      >
        {/* General Tab */}
        {activeTab === "general" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DetailSection title="Basic Info">
              <EditableField label="Name (EN)" isEditing={isEditing} value={group.nameEn}
                editValue={getValue("nameEn")} onEdit={v => setField("nameEn", v)} />

              <EditableField label="Location (City)" isEditing={isEditing} value={group.location}
                editValue={getValue("location")} onEdit={v => setField("location", v)} />
              <EditableField label="Country Code" isEditing={isEditing} value={group.countryCode}
                editValue={getValue("countryCode")} onEdit={v => setField("countryCode", v)} />

              {/* Year */}
              <DetailRow label="Year">
                {isEditing ? (
                  <input
                    type="number"
                    min={2020}
                    max={2035}
                    value={getValue("year") ?? ""}
                    onChange={e => setField("year", e.target.value === "" ? null : parseInt(e.target.value))}
                    placeholder="e.g. 2026"
                    className="h-8 px-2 text-sm border border-(--e-orange) rounded-md focus:outline-none focus:ring-1 focus:ring-(--e-orange) w-full"
                  />
                ) : (
                  <span className="text-sm">{group.year ?? <span className="text-muted-foreground/60">—</span>}</span>
                )}
              </DetailRow>

              {/* Month */}
              <DetailRow label="Month">
                {isEditing ? (
                  <Select
                    value={getValue("month") ?? "none"}
                    onValueChange={v => setField("month", v === "none" ? null : v)}
                  >
                    <SelectTrigger className="h-8 text-sm border-(--e-orange)"><SelectValue placeholder="— Select month —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {["January","February","March","April","May","June","July","August","September","October","November","December"].map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-sm">{group.month ?? <span className="text-muted-foreground/60">—</span>}</span>
                )}
              </DetailRow>

              <EditableField label="Package Code" isEditing={isEditing} value={group.packageCode}
                editValue={getValue("packageCode")} onEdit={v => setField("packageCode", v)}
                placeholder="e.g. MEL26JulSC" />

              {/* Type — Product Type dropdown */}
              <DetailRow label="Type">
                {isEditing ? (
                  <Select
                    value={getValue("typeId") ?? "none"}
                    onValueChange={v => setField("typeId", v === "none" ? null : v)}
                  >
                    <SelectTrigger className="h-8 text-sm border-(--e-orange)">
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
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--e-orange-lt) text-(--e-orange) text-xs font-medium border border-(--e-orange-a20)">{group.typeName}</span>
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
                    className="h-8 px-2 text-sm border border-(--e-orange) rounded-md focus:outline-none focus:ring-1 focus:ring-(--e-orange) w-full"
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
                    className="h-8 px-2 text-sm border border-(--e-orange) rounded-md focus:outline-none focus:ring-1 focus:ring-(--e-orange) w-full"
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
                    className="h-8 px-2 text-sm border border-(--e-orange) rounded-md focus:outline-none focus:ring-1 focus:ring-(--e-orange) w-full"
                  />
                ) : (
                  <span className="text-sm">{group.startDate ? formatDate(group.startDate) : <span className="text-muted-foreground/60">—</span>}</span>
                )}
              </DetailRow>
              <DetailRow label="End Date">
                {isEditing ? (
                  <input
                    type="date"
                    value={getValue("endDate") ? new Date(getValue("endDate")).toISOString().slice(0, 10) : ""}
                    onChange={e => setField("endDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
                    className="h-8 px-2 text-sm border border-(--e-orange) rounded-md focus:outline-none focus:ring-1 focus:ring-(--e-orange) w-full"
                  />
                ) : (
                  <span className="text-sm">{group.endDate ? formatDate(group.endDate) : <span className="text-muted-foreground/60">—</span>}</span>
                )}
              </DetailRow>
            </DetailSection>
            <DetailSection title="Settings">
              <EditableField label="Status" isEditing={isEditing} value={group.status}
                editChildren={
                  <Select value={getValue("status")} onValueChange={v => setField("status", v)}>
                    <SelectTrigger className="h-8 text-sm border-(--e-orange)"><SelectValue /></SelectTrigger>
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
                    <SelectTrigger className="h-8 text-sm border-(--e-orange)"><SelectValue /></SelectTrigger>
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
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-(--e-orange) text-white text-[10px] font-bold">{group.landingOrder}</span>
                      <span className="text-sm">Shown on landing (#{group.landingOrder})</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60">Not shown on landing page</span>
                  )}
                </DetailRow>
              )}
              <DetailRow label="Program Images">
                <PackageGroupImageGallery
                  packageGroupId={group.id}
                  canEdit={canEdit}
                />
              </DetailRow>
              <DetailRow label="Created" value={group.createdAt ? formatDate(group.createdAt) : "—"} />
              <DetailRow label="Updated" value={group.updatedAt ? formatDate(group.updatedAt) : "—"} />
            </DetailSection>
            <DetailSection title="Description (EN)" className="lg:col-span-2">
              {isEditing ? (
                <RichTextEditor
                  value={getValue("descriptionEn") ?? ""}
                  onChange={(html) => setField("descriptionEn", html)}
                  placeholder="Write a detailed description for customers…"
                  minHeight={220}
                />
              ) : group.descriptionEn ? (
                group.descriptionEn.trimStart().startsWith("<") ? (
                  <div
                    className="tiptap prose prose-sm max-w-none text-sm text-foreground"
                    dangerouslySetInnerHTML={{ __html: group.descriptionEn }}
                  />
                ) : (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{group.descriptionEn}</p>
                )
              ) : (
                <span className="text-muted-foreground/60 text-sm">—</span>
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
                    className="h-8 text-sm border-(--e-orange) focus-visible:ring-(--e-orange)"
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
                  className="w-full border border-(--e-orange) rounded-md px-3 py-2 text-sm resize-none h-28 focus:outline-none focus:ring-1 focus:ring-(--e-orange)" />
              ) : group.inclusionsEn ? (
                <ul className="space-y-1">
                  {group.inclusionsEn.split("\n").filter(Boolean).map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-(--e-orange) mt-0.5">✓</span> {item.trim()}
                    </li>
                  ))}
                </ul>
              ) : <span className="text-muted-foreground/60 text-sm">—</span>}
            </DetailSection>

            <DetailSection title="Exclusions" className="lg:col-span-2">
              {isEditing ? (
                <textarea value={getValue("exclusionsEn") ?? ""} onChange={e => setField("exclusionsEn", e.target.value)}
                  placeholder={"One item per line\nPersonal expenses\nOptional excursions\nTravel insurance"}
                  className="w-full border border-(--e-orange) rounded-md px-3 py-2 text-sm resize-none h-28 focus:outline-none focus:ring-1 focus:ring-(--e-orange)" />
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

            {/* Program Partners */}
            <DetailSection title="Program Partners" className="lg:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Institute */}
                <PartnerField
                  label="Institute"
                  isEditing={isEditing}
                  accountId={getValue("instituteId")}
                  accountName={group.instituteAccountName}
                  manualName={getValue("instituteName")}
                  displayManualName={group.instituteName}
                  accountsList={accountsList}
                  onAccountChange={v => setField("instituteId", v === "none" ? null : v)}
                  onManualChange={v => setField("instituteName", v)}
                />

                {/* Accommodation */}
                <PartnerField
                  label="Accommodation"
                  isEditing={isEditing}
                  accountId={getValue("accommodationId")}
                  accountName={group.accommodationAccountName}
                  manualName={getValue("accommodation")}
                  displayManualName={group.accommodation}
                  accountsList={accountsList}
                  onAccountChange={v => setField("accommodationId", v === "none" ? null : v)}
                  onManualChange={v => setField("accommodation", v)}
                />

                {/* Tour Company */}
                <PartnerField
                  label="Tour Company"
                  isEditing={isEditing}
                  accountId={getValue("tourCompanyId")}
                  accountName={group.tourCompanyAccountName}
                  manualName={getValue("tourCompany")}
                  displayManualName={group.tourCompany}
                  accountsList={accountsList}
                  onAccountChange={v => setField("tourCompanyId", v === "none" ? null : v)}
                  onManualChange={v => setField("tourCompany", v)}
                />

                {/* Pickup Driver */}
                <PartnerField
                  label="Pickup Driver"
                  isEditing={isEditing}
                  accountId={getValue("pickupDriverId")}
                  accountName={group.pickupDriverAccountName}
                  manualName={getValue("pickupDriver")}
                  displayManualName={group.pickupDriver}
                  accountsList={accountsList}
                  onAccountChange={v => setField("pickupDriverId", v === "none" ? null : v)}
                  onManualChange={v => setField("pickupDriver", v)}
                />

              </div>
            </DetailSection>

            {/* Resources & Links */}
            <DetailSection title="Resources & Links" className="lg:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Package PPT (Canva)</p>
                  {isEditing ? (
                    <Input value={getValue("packagePptUrl") ?? ""} onChange={e => setField("packagePptUrl", e.target.value)}
                      placeholder="https://www.canva.com/..."
                      className="h-8 text-sm border-(--e-orange) focus-visible:ring-(--e-orange)" />
                  ) : group.packagePptUrl ? (
                    <a href={group.packagePptUrl} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-(--e-orange) underline underline-offset-2 break-all hover:opacity-80">
                      {group.packagePptUrl.length > 60 ? group.packagePptUrl.slice(0, 60) + "…" : group.packagePptUrl}
                    </a>
                  ) : <span className="text-sm text-muted-foreground/60">—</span>}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Google Drive</p>
                  {isEditing ? (
                    <Input value={getValue("googleDriveUrl") ?? ""} onChange={e => setField("googleDriveUrl", e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="h-8 text-sm border-(--e-orange) focus-visible:ring-(--e-orange)" />
                  ) : group.googleDriveUrl ? (
                    <a href={group.googleDriveUrl} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-(--e-orange) underline underline-offset-2 break-all hover:opacity-80">
                      {group.googleDriveUrl.length > 60 ? group.googleDriveUrl.slice(0, 60) + "…" : group.googleDriveUrl}
                    </a>
                  ) : <span className="text-sm text-muted-foreground/60">—</span>}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Local Manual</p>
                  {isEditing ? (
                    <Input value={getValue("localManual") ?? ""} onChange={e => setField("localManual", e.target.value)}
                      placeholder="Link or text"
                      className="h-8 text-sm border-(--e-orange) focus-visible:ring-(--e-orange)" />
                  ) : (
                    <span className="text-sm">{group.localManual || <span className="text-muted-foreground/60">—</span>}</span>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Departure OT</p>
                  {isEditing ? (
                    <Input value={getValue("departureOt") ?? ""} onChange={e => setField("departureOt", e.target.value)}
                      placeholder="Departure overtime info"
                      className="h-8 text-sm border-(--e-orange) focus-visible:ring-(--e-orange)" />
                  ) : (
                    <span className="text-sm">{group.departureOt || <span className="text-muted-foreground/60">—</span>}</span>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">Required Documents</p>
                {isEditing ? (
                  <textarea value={getValue("requiredDocuments") ?? ""} onChange={e => setField("requiredDocuments", e.target.value)}
                    placeholder="List required documents, one per line"
                    className="w-full border border-(--e-orange) rounded-md px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-(--e-orange)" />
                ) : group.requiredDocuments ? (
                  <p className="text-sm whitespace-pre-wrap">{group.requiredDocuments}</p>
                ) : <span className="text-sm text-muted-foreground/60">—</span>}
              </div>
            </DetailSection>

            {/* Coordinator Section */}
            <DetailSection title="Camp Coordinator" className="lg:col-span-2">
              {isEditing ? (
                <div className="space-y-2">
                  <Select
                    value={getValue("coordinatorId") || "none"}
                    onValueChange={v => setField("coordinatorId", v === "none" ? null : v)}
                  >
                    <SelectTrigger className="h-9 text-sm border-(--e-orange)">
                      <SelectValue placeholder="— Select coordinator organisation —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— No coordinator assigned —</SelectItem>
                      {coordinators.map(org => (
                        <SelectItem key={org.id} value={org.id}>
                          <span className="flex items-center gap-2">
                            <Building2 className="w-3 h-3 shrink-0 text-(--e-text-3)" />
                            <span>{org.name}</span>
                            {org.subdomain && (
                              <span className="text-xs text-muted-foreground">{org.subdomain}.edubee.co</span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : group.coordinator ? (
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-(--e-orange)/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-(--e-orange)" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{(group.coordinator as any).name}</p>
                    {(group.coordinator as any).subdomain && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(group.coordinator as any).subdomain}.edubee.co
                      </p>
                    )}
                    {(group.coordinator as any).email && (
                      <a href={`mailto:${(group.coordinator as any).email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-0.5">
                        <Mail className="w-3 h-3" /> {(group.coordinator as any).email}
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground/60 italic">No coordinator assigned to this program.</p>
              )}
            </DetailSection>
            <div className="lg:col-span-2">
              <SystemInfoSection owner={null} createdAt={group.createdAt} updatedAt={group.updatedAt} />
            </div>
          </div>
        )}

        {/* Packages Tab */}
        {activeTab === "packages" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  Exchange rate as of: <strong>{rateDate}</strong>
                  {Object.keys(liveRates).length > 0 && <span className="ml-1 text-xs text-green-600">(Up to date)</span>}
                </span>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                  <a href={`/admin/accounting/exchange-rates`}>
                    <RefreshCw className="h-3 w-3" /> Update Rates
                  </a>
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Switch id="auto-convert" checked={autoConvert} onCheckedChange={setAutoConvert} />
                  <label htmlFor="auto-convert" className="text-xs text-muted-foreground cursor-pointer">Auto-convert from AUD</label>
                </div>
                {canEdit && (
                  <Button size="sm" className="bg-(--e-orange) hover:bg-[#d97706] text-white gap-1" onClick={() => openPkgDialog()}>
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
                    <th className="px-4 py-2.5 text-right">Adults</th>
                    <th className="px-4 py-2.5 text-right">Students</th>
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
                    <tr key={p.id} className="border-b last:border-0 hover:bg-(--e-orange-lt)/50">
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
                <Button size="sm" onClick={openAddSpot} className="bg-(--e-orange) hover:bg-[#d97706] text-white gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add Enrollment Spot
                </Button>
              </div>
            )}

            {/* Table */}
            <div className="bg-card rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-xs text-muted-foreground font-semibold">
                    <th className="px-4 py-2.5 text-left">Enroll Name / Grade</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                    <th className="px-4 py-2.5 text-right text-orange-600">Enroll No.</th>
                    <th className="px-4 py-2.5 text-right text-green-700">Available</th>
                    <th className="px-4 py-2.5 text-left">Program Dates</th>
                    <th className="px-4 py-2.5 text-left">DOB Range</th>
                    <th className="px-4 py-2.5 text-left">Institute MGT</th>
                    <th className="px-4 py-2.5 text-left">Note</th>
                    {canEdit && <th className="px-4 py-2.5 w-20" />}
                  </tr>
                </thead>
                <tbody>
                  {spots.length === 0 ? (
                    <tr>
                      <td colSpan={canEdit ? 11 : 10} className="px-4 py-12 text-center">
                        <div className="text-muted-foreground/40 text-3xl mb-2">🎫</div>
                        <p className="text-muted-foreground text-sm">No enrollment spots yet</p>
                        {canEdit && (
                          <button onClick={openAddSpot} className="mt-2 text-xs text-(--e-orange) underline">
                            + Add first spot
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : spots.map((s: any) => {
                    const enrollCount = s.enrollCount ?? 0;
                    const available = (s.totalSpots ?? 0) - enrollCount;
                    const statusColors: Record<string, string> = {
                      available: "bg-green-100 text-green-700",
                      waitlist: "bg-amber-100 text-amber-700",
                      closed: "bg-red-100 text-red-700",
                    };
                    const fmtDate = (d?: string | null) => formatDate(d);
                    return (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-(--e-orange-lt)/50">
                        {/* Enroll Name / Grade */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[13px]">
                            {s.enrollName ?? s.gradeLabel}
                          </div>
                          {s.enrollName && (
                            <div className="text-[11px] text-muted-foreground">{s.gradeLabel}</div>
                          )}
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusColors[s.status ?? "available"] ?? "bg-gray-100 text-gray-600"}`}>
                            {s.status ?? "available"}
                          </span>
                        </td>
                        {/* Total */}
                        <td className="px-4 py-3 text-right font-mono font-semibold">{s.totalSpots}</td>
                        {/* Enroll No. */}
                        <td className="px-4 py-3 text-right font-mono font-semibold text-orange-600">{enrollCount}</td>
                        {/* Available */}
                        <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: available > 0 ? "#16a34a" : "#dc2626" }}>
                          {Math.max(0, available)}
                        </td>
                        {/* Program Dates */}
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          <div>{fmtDate(s.startDate)}</div>
                          {s.endDate && <div className="text-muted-foreground/60">→ {fmtDate(s.endDate)}</div>}
                        </td>
                        {/* DOB Range */}
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {s.dobRangeStart || s.dobRangeEnd ? (
                            <div>
                              <div>{fmtDate(s.dobRangeStart)}</div>
                              {s.dobRangeEnd && <div className="text-muted-foreground/60">→ {fmtDate(s.dobRangeEnd)}</div>}
                            </div>
                          ) : "—"}
                        </td>
                        {/* Institute MGT */}
                        <td className="px-4 py-3 max-w-[180px]">
                          {s.instituteMgt ? (
                            <div className="space-y-0.5">
                              {s.instituteMgt.split(", ").map((entry: string, i: number) => (
                                <div key={i} className="text-[11px] text-muted-foreground truncate" title={entry}>{entry}</div>
                              ))}
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        {/* Note */}
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[130px]">
                          <span className="truncate block" title={s.note ?? ""}>{s.note ?? "—"}</span>
                        </td>
                        {canEdit && (
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                onClick={() => openEditSpot(s)}
                                className="p-1.5 rounded hover:bg-(--e-orange)/10 text-muted-foreground hover:text-(--e-orange) transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              {!isCC && (
                                <button
                                  onClick={() => setDeletingSpotId(s.id)}
                                  className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                                  title="Delete"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
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
                <span className="font-mono"><span className="text-muted-foreground text-xs mr-1">Enrolled:</span><strong className="text-orange-600">{spots.reduce((a: number, s: any) => a + (s.enrollCount ?? 0), 0)}</strong></span>
                <span className="font-mono"><span className="text-muted-foreground text-xs mr-1">Available:</span><strong className="text-green-600">{spots.reduce((a: number, s: any) => a + Math.max(0, (s.totalSpots ?? 0) - (s.enrollCount ?? 0)), 0)}</strong></span>
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

        {/* Camp Photos Tab */}
        {activeTab === "camp-photos" && id && (
          <DetailSection title="Camp Photos">
            <CampPhotosTab packageGroupId={id} canEdit={canEdit} />
          </DetailSection>
        )}

        {/* ── Coordinator Delegation Tab ───────────────────────────────── */}
        {activeTab === "coordinator" && (
          <DetailSection title="Camp Coordinator Delegation">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  다른 테넌트(유학원)에게 이 Package Group 의 운영권을 위임합니다.
                </p>
                {canEdit && (
                  <Button
                    size="sm"
                    onClick={() => setShowCoordModal(true)}
                    className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Assign Coordinator
                  </Button>
                )}
              </div>

              {/* Delegation List */}
              {delegations.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground border rounded-lg bg-muted/30">
                  No coordinator delegation assigned yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {delegations.map((d: any) => {
                    const statusColors: Record<string, string> = {
                      Active: "bg-green-100 text-green-700 border-green-200",
                      Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
                      Revoked: "bg-red-100 text-red-700 border-red-200",
                      Expired: "bg-gray-100 text-gray-600 border-gray-200",
                      Rejected: "bg-orange-100 text-orange-700 border-orange-200",
                    };
                    return (
                      <div key={d.id} className="border rounded-lg p-4 space-y-3 bg-card">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{d.coordinatorOrgName ?? "—"}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[d.status] ?? "bg-gray-100 text-gray-600"}`}>
                                {d.status}
                              </span>
                            </div>
                            {d.coordinatorOrgSubdomain && (
                              <span className="text-xs text-muted-foreground">{d.coordinatorOrgSubdomain}.edubee.co</span>
                            )}
                          </div>
                          {d.status === "Active" && canEdit && !isCC && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50 shrink-0"
                              onClick={() => setShowRevokeConfirm(d.id)}
                            >
                              Revoke
                            </Button>
                          )}
                        </div>

                        {/* Permissions */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { key: "view", label: "View" },
                            { key: "edit", label: "Edit" },
                            { key: "soft_delete", label: "Soft Delete" },
                            { key: "manage_finance", label: "Finance Mgmt" },
                          ].map(({ key, label }) => (
                            <div key={key} className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border
                              ${(d.permissions as any)?.[key]
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-gray-50 text-gray-400 border-gray-200"}`}>
                              <span className="w-3 h-3 text-[10px] leading-3">
                                {(d.permissions as any)?.[key] ? "✓" : "✗"}
                              </span>
                              {label}
                            </div>
                          ))}
                        </div>

                        {/* Dates */}
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>Granted: {d.grantedAt ? format(new Date(d.grantedAt), "yyyy-MM-dd") : "—"}</span>
                          {d.acceptedAt && <span>Accepted: {format(new Date(d.acceptedAt), "yyyy-MM-dd")}</span>}
                          {d.revokedAt && <span className="text-red-500">Revoked: {format(new Date(d.revokedAt), "yyyy-MM-dd")}</span>}
                        </div>

                        {d.notes && (
                          <p className="text-xs text-muted-foreground border-t pt-2">{d.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </DetailSection>
        )}
      </DetailPageLayout>

      {/* ── Assign Coordinator Modal ─────────────────────────────────────── */}
      <Dialog open={showCoordModal} onOpenChange={o => { if (!o) { setShowCoordModal(false); setSelectedCoordOrgId(null); setCoordSearch(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Camp Coordinator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            {/* Warning */}
            <div className="flex gap-2 p-3 rounded-lg bg-orange-50 border border-orange-200 text-sm text-orange-800">
              <span className="shrink-0">⚠️</span>
              <span>이 조치는 해당 테넌트에게 이 Package Group 의 운영 권한을 부여합니다. 신중히 진행하세요.</span>
            </div>

            {/* Organisation Search */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Coordinator Organisation</label>
              <input
                type="text"
                placeholder="Search by name, subdomain, or email..."
                value={coordSearch}
                onChange={e => { setCoordSearch(e.target.value); setSelectedCoordOrgId(null); }}
                className="w-full h-9 px-3 text-sm border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-[#F5821F]"
              />
              {orgSearchResults.length > 0 && !selectedCoordOrgId && (
                <div className="border rounded-md divide-y max-h-40 overflow-y-auto bg-background shadow-sm">
                  {orgSearchResults.map((org: any) => (
                    <button
                      key={org.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
                      onClick={() => { setSelectedCoordOrgId(org.id); setCoordSearch(org.name); }}
                    >
                      <span className="font-medium">{org.name}</span>
                      {org.subdomain && <span className="text-muted-foreground ml-2 text-xs">{org.subdomain}.edubee.co</span>}
                    </button>
                  ))}
                </div>
              )}
              {selectedCoordOrgId && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-sm">
                  <Building2 className="w-4 h-4 text-[#F5821F]" />
                  <span className="font-medium">{coordSearch}</span>
                  <button className="ml-auto text-muted-foreground hover:text-foreground" onClick={() => { setSelectedCoordOrgId(null); setCoordSearch(""); }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Permission Presets */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Permission Preset</label>
              <div className="flex flex-wrap gap-2">
                {COORD_PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => setCoordPermissions(p.perms)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                      ${JSON.stringify(coordPermissions) === JSON.stringify(p.perms)
                        ? "bg-[#F5821F] text-white border-[#F5821F]"
                        : "bg-background text-muted-foreground border-input hover:border-[#F5821F]"}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {/* Permission Checkboxes */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {([
                  { key: "view", label: "View" },
                  { key: "edit", label: "Edit" },
                  { key: "soft_delete", label: "Soft Delete" },
                  { key: "manage_finance", label: "Finance Mgmt" },
                ] as { key: keyof typeof coordPermissions; label: string }[]).map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={coordPermissions[key]}
                      onChange={e => setCoordPermissions(p => ({ ...p, [key]: e.target.checked }))}
                      className="rounded border-input accent-[#F5821F]"
                      disabled={key === "view"}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes (optional)</label>
              <textarea
                value={coordNotes}
                onChange={e => setCoordNotes(e.target.value)}
                placeholder="Delegation notes..."
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F5821F] resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1 border-t">
              <Button size="sm" variant="outline" onClick={() => { setShowCoordModal(false); setSelectedCoordOrgId(null); setCoordSearch(""); }}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!selectedCoordOrgId || assignCoordinator.isPending}
                onClick={() => assignCoordinator.mutate()}
                className="bg-[#F5821F] hover:bg-[#d97706] text-white min-w-[120px]"
              >
                {assignCoordinator.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Assign Coordinator"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Revoke Confirmation ──────────────────────────────────────────── */}
      <Dialog open={!!showRevokeConfirm} onOpenChange={o => { if (!o) setShowRevokeConfirm(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Revoke Coordinator Access?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            위임을 철회합니다. Coordinator 는 30일 동안 읽기 전용으로 접근 가능하며 이후 접근이 완전히 차단됩니다.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setShowRevokeConfirm(null)}>Cancel</Button>
            <Button
              size="sm"
              disabled={revokeCoordinator.isPending}
              onClick={() => showRevokeConfirm && revokeCoordinator.mutate(showRevokeConfirm)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {revokeCoordinator.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Revoke"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Package Dialog */}
      <Dialog open={showPkgDialog} onOpenChange={o => { if (!o) { setShowPkgDialog(false); setShowPkgAddProduct(false); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPkg ? "Edit Package" : "Add Package"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            {/* Basic Info */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Basic Information</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="col-span-2"><Label className="text-xs">Package Name</Label>
                  <Input value={pkgForm.name} onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))} className="mt-1 h-8 text-sm" /></div>
                <div><Label className="text-xs">Duration (Days)</Label>
                  <Input type="number" value={pkgForm.durationDays} onChange={e => setPkgForm(f => ({ ...f, durationDays: e.target.value }))} className="mt-1 h-8 text-sm" /></div>
                <div><Label className="text-xs">Max Participants</Label>
                  <Input type="number" value={pkgForm.maxParticipants} onChange={e => setPkgForm(f => ({ ...f, maxParticipants: e.target.value }))} className="mt-1 h-8 text-sm" /></div>
                <div><Label className="text-xs">Max Adults</Label>
                  <Input type="number" value={pkgForm.maxAdults} onChange={e => setPkgForm(f => ({ ...f, maxAdults: e.target.value }))} className="mt-1 h-8 text-sm" placeholder="—" /></div>
                <div><Label className="text-xs">Max Students</Label>
                  <Input type="number" value={pkgForm.maxStudents} onChange={e => setPkgForm(f => ({ ...f, maxStudents: e.target.value }))} className="mt-1 h-8 text-sm" placeholder="—" /></div>
              </div>
            </div>

            {/* Pricing */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pricing</p>
                <div className="flex items-center gap-2">
                  <Switch id="ac-pkg" checked={autoConvert} onCheckedChange={setAutoConvert} />
                  <label htmlFor="ac-pkg" className="text-xs text-muted-foreground cursor-pointer">Auto-convert from AUD</label>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add-on Products</p>
                  <Button size="sm" variant="outline" className="h-6 text-xs gap-1 border-(--e-orange) text-(--e-orange) hover:bg-(--e-orange-lt)"
                    onClick={() => { setPkgProdTypeFilter("all"); setSelectedPkgProdId(null); setPkgAddQty(1); setPkgAddUnitPrice(""); setPkgAddIsOptional(false); setPkgAddError(null); setShowPkgAddProduct(true); }}>
                    <Plus className="h-3 w-3" /> Add Product
                  </Button>
                </div>
                {pkgProductsLoading ? (
                  <div className="h-10 bg-muted/30 rounded animate-pulse" />
                ) : pkgLinkedProducts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">No products linked</p>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/30 border-b text-muted-foreground">
                          <th className="px-3 py-2 text-left">Product</th>
                          <th className="px-3 py-2 text-left">Type</th>
                          <th className="px-3 py-2 text-center">Inclusion</th>
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
                                {row.isOptional ? "Optional" : "Included"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">{row.quantity ?? 1}</td>
                            <td className="px-3 py-2 text-right font-mono">
                              {row.unitPrice ? `${row.currency ?? "AUD"} ${Number(row.unitPrice).toLocaleString()}` : row.cost ? `${row.currency ?? "AUD"} ${Number(row.cost).toLocaleString()}` : "—"}
                            </td>
                            {!isCC && (
                              <td className="px-3 py-2">
                                <button className="text-muted-foreground hover:text-red-500 transition-colors"
                                  onClick={() => { if (window.confirm("Remove product?")) unlinkPkgProduct.mutate(row.productId); }}>
                                  <X className="w-3 h-3" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Add product to package inline picker */}
                {showPkgAddProduct && (
                  <div className="mt-2 border border-(--e-orange-a20) rounded-lg p-3 bg-(--e-orange-lt)/30 space-y-2">
                    <div className="flex gap-1.5 flex-wrap">
                      {["all", "institute", "hotel", "pickup", "tour", "settlement"].map(t => (
                        <button key={t} onClick={() => { setPkgProdTypeFilter(t); setSelectedPkgProdId(null); }}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${pkgProdTypeFilter === t ? "bg-(--e-orange-lt) text-(--e-orange) border-(--e-orange-a20)" : "border-border text-muted-foreground hover:bg-muted"}`}>
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
                          <Label className="text-[11px]">Inclusion</Label>
                          <Select value={pkgAddIsOptional ? "optional" : "included"} onValueChange={v => setPkgAddIsOptional(v === "optional")}>
                            <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="included">Included</SelectItem>
                              <SelectItem value="optional">Optional</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                    {pkgAddError && <p className="text-xs text-red-500">{pkgAddError}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs bg-(--e-orange) hover:bg-[#d97706] text-white"
                        disabled={!selectedPkgProdId || linkPkgProduct.isPending}
                        onClick={() => linkPkgProduct.mutate({ productId: selectedPkgProdId, isOptional: pkgAddIsOptional, quantity: pkgAddQty, unitPrice: pkgAddUnitPrice || null })}>
                        {linkPkgProduct.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Add
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowPkgAddProduct(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1 border-t">
              <Button size="sm" className="flex-1 bg-(--e-orange) hover:bg-[#d97706] text-white"
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
            {/* Enroll Name */}
            <div className="space-y-1">
              <Label className="text-xs">Enroll Name</Label>
              <Input
                value={spotForm.enrollName}
                onChange={e => setSpotForm(f => ({ ...f, enrollName: e.target.value }))}
                placeholder="e.g. 2025 Spring Elementary Camp"
                className="h-8 text-sm"
              />
            </div>

            {/* Grade Label & Order */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            {/* Note */}
            <div className="space-y-1">
              <Label className="text-xs">Note</Label>
              <textarea
                value={spotForm.note}
                onChange={e => setSpotForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Additional notes or instructions..."
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1 border-t">
              <Button size="sm" variant="outline" onClick={() => setShowSpotDialog(false)}>Cancel</Button>
              <Button
                size="sm"
                onClick={handleSpotSave}
                disabled={!spotForm.gradeLabel || !spotForm.totalSpots || createSpot.isPending || updateSpot.isPending}
                className="bg-(--e-orange) hover:bg-[#d97706] text-white min-w-[80px]"
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
