import { useState } from "react";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { DetailPageLayout, DetailSection, DetailRow, EditableField } from "@/components/shared/DetailPageLayout";
import { SystemInfoSection } from "@/components/shared/SystemInfoSection";
import { NotePanel } from "@/components/shared/NotePanel";
import { useDetailEdit } from "@/hooks/useDetailEdit";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ExternalLink, MapPin, Globe, Users, GraduationCap, Building2, CheckCircle2, Clock, FileText, Plus, X, Loader2, Package, Copy, SlidersHorizontal, ChevronDown, ChevronUp, Search } from "lucide-react";
import { useLocation } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const COUNTRY_FLAG: Record<string, string> = {
  AU: "🇦🇺", PH: "🇵🇭", SG: "🇸🇬", TH: "🇹🇭", KR: "🇰🇷", JP: "🇯🇵", GB: "🇬🇧", US: "🇺🇸",
};

const ALL_CURRENCIES = [
  { ccy: "AUD", flag: "🇦🇺", sym: "A$", dec: 2, field: "priceAud" },
  { ccy: "USD", flag: "🇺🇸", sym: "$",  dec: 2, field: "priceUsd" },
  { ccy: "KRW", flag: "🇰🇷", sym: "₩",  dec: 0, field: "priceKrw" },
  { ccy: "JPY", flag: "🇯🇵", sym: "¥",  dec: 0, field: "priceJpy" },
  { ccy: "THB", flag: "🇹🇭", sym: "฿",  dec: 0, field: "priceThb" },
  { ccy: "PHP", flag: "🇵🇭", sym: "₱",  dec: 0, field: "pricePhp" },
  { ccy: "SGD", flag: "🇸🇬", sym: "S$", dec: 2, field: "priceSgd" },
  { ccy: "GBP", flag: "🇬🇧", sym: "£",  dec: 2, field: "priceGbp" },
];

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  PH: "PHP", TH: "THB", SG: "SGD", JP: "JPY", KR: "KRW", GB: "GBP", US: "USD", AU: "AUD",
};

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-green-100 text-green-700",
  inactive: "bg-amber-100 text-amber-700",
  archived: "bg-red-100 text-red-700",
  draft:    "bg-gray-100 text-gray-600",
  expired:  "bg-slate-100 text-slate-500",
  pending:  "bg-blue-100 text-blue-600",
};

const CONTRACT_STATUS_COLORS: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-600",
  pending:   "bg-amber-100 text-amber-700",
  active:    "bg-blue-100 text-blue-700",
  signed:    "bg-green-100 text-green-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const PROD_TYPES = ["all", "institute", "hotel", "pickup", "tour", "settlement"];

function fmtPrice(val: string | null | undefined, sym: string, dec: number) {
  if (!val) return null;
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  return `${sym}${n.toLocaleString("en-AU", { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
}

export default function PackageDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  // ── Status change state ───────────────────────────────────────────
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  // ── Product section state ─────────────────────────────────────────
  const [showAddProd, setShowAddProd] = useState(false);
  const [prodTypeFilter, setProdTypeFilter] = useState("all");
  const [prodSearch, setProdSearch] = useState("");
  const [selectedProdId, setSelectedProdId] = useState<string | null>(null);
  const [addQty, setAddQty] = useState(1);
  const [addUnitPrice, setAddUnitPrice] = useState("");
  const [addIsOptional, setAddIsOptional] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  // advanced search state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advCountry, setAdvCountry]   = useState("all");
  const [advLocation, setAdvLocation] = useState("all");
  const [advSortBy, setAdvSortBy]     = useState("name");
  // inline editing state per row
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState(1);
  const [editUnitPrice, setEditUnitPrice] = useState("");
  const [editIsOptional, setEditIsOptional] = useState(false);

  // ── Package data ──────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["package-detail", id],
    queryFn: () => axios.get(`${BASE}/api/packages/${id}`).then(r => r.data),
  });

  const { data: ratesData } = useQuery({
    queryKey: ["public-exchange-rates"],
    queryFn: () => axios.get(`${BASE}/api/public/exchange-rates`).then(r => r.data),
    staleTime: 3_600_000,
  });

  const { data: contractsData } = useQuery({
    queryKey: ["package-contracts", id],
    queryFn: () => axios.get(`${BASE}/api/contracts`, { params: { packageId: id, limit: 100 } }).then(r => r.data),
    enabled: !!id,
  });

  // ── Products queries ──────────────────────────────────────────────
  const { data: linkedProdsData, isLoading: linkedProdsLoading } = useQuery({
    queryKey: ["pkg-products", id],
    queryFn: () => axios.get(`${BASE}/api/packages/${id}/products`).then(r => r.data),
    enabled: !!id,
  });
  const linkedProds: any[] = Array.isArray(linkedProdsData) ? linkedProdsData : (linkedProdsData?.data ?? []);

  const { data: allActiveProdsData } = useQuery({
    queryKey: ["products-active"],
    queryFn: () => axios.get(`${BASE}/api/products`, { params: { status: "active", limit: 200 } }).then(r => r.data),
    enabled: showAddProd,
    staleTime: 60_000,
  });
  const allActiveProds: any[] = Array.isArray(allActiveProdsData) ? allActiveProdsData : (allActiveProdsData?.data ?? []);

  // ── Products mutations ────────────────────────────────────────────
  const addProd = useMutation({
    mutationFn: (payload: { productId: string; quantity: number; unitPrice: string; isOptional: boolean }) =>
      axios.post(`${BASE}/api/packages/${id}/products`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pkg-products", id] });
      setShowAddProd(false);
      setSelectedProdId(null);
      setAddQty(1);
      setAddUnitPrice("");
      setAddIsOptional(false);
      setAddError(null);
      toast({ title: "Product added" });
    },
    onError: (e: any) => setAddError(e?.response?.data?.error ?? "Failed to add product"),
  });

  const updateProd = useMutation({
    mutationFn: ({ productId, payload }: { productId: string; payload: any }) =>
      axios.patch(`${BASE}/api/packages/${id}/products/${productId}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pkg-products", id] });
      setEditingProdId(null);
      toast({ title: "Product updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update product" }),
  });

  const removeProd = useMutation({
    mutationFn: (productId: string) =>
      axios.delete(`${BASE}/api/packages/${id}/products/${productId}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pkg-products", id] });
      toast({ title: "Product removed" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to remove product" }),
  });

  const rec = data;
  const canEdit = ["super_admin", "admin", "camp_coordinator"].includes(user?.role ?? "");

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      axios.put(`${BASE}/api/packages/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["package-detail", id] });
      qc.invalidateQueries({ queryKey: ["packages-list"] });
      toast({ title: "Package updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update" }),
  });

  const changeStatusMutation = useMutation({
    mutationFn: (status: string) =>
      axios.put(`${BASE}/api/packages/${id}`, { status }).then(r => r.data),
    onSuccess: (_data, status) => {
      qc.invalidateQueries({ queryKey: ["package-detail", id] });
      qc.invalidateQueries({ queryKey: ["packages-list"] });
      setPendingStatus(null);
      toast({ title: "Status updated", description: `Package is now "${status}"` });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update status" }),
  });

  const cloneMutation = useMutation({
    mutationFn: async () => {
      if (!rec) throw new Error("No data");
      // 1. Create new package (copy of current, with "Copy of" prefix)
      const newPkg = await axios.post(`${BASE}/api/packages`, {
        packageGroupId: rec.packageGroupId,
        name: `Copy of ${rec.name}`,
        durationDays: rec.durationDays ?? 1,
        maxAdults: rec.adults ?? null,
        maxStudents: rec.children ?? null,
        priceAud: rec.priceAud ?? null,
        priceUsd: rec.priceUsd ?? null,
        priceKrw: rec.priceKrw ?? null,
        priceJpy: rec.priceJpy ?? null,
        priceThb: rec.priceThb ?? null,
        pricePhp: rec.pricePhp ?? null,
        priceSgd: rec.priceSgd ?? null,
        priceGbp: rec.priceGbp ?? null,
        features: rec.features ?? null,
      }).then(r => r.data);
      // 2. Copy all linked products to the new package
      const prods: any[] = await axios.get(`${BASE}/api/packages/${id}/products`).then(r => r.data);
      await Promise.all(
        (Array.isArray(prods) ? prods : prods?.data ?? []).map((p: any) =>
          axios.post(`${BASE}/api/packages/${newPkg.id}/products`, {
            productId: p.productId,
            quantity: p.quantity ?? 1,
            unitPrice: p.unitPrice ?? p.cost ?? null,
            isOptional: p.isOptional ?? false,
          })
        )
      );
      return newPkg;
    },
    onSuccess: (newPkg) => {
      qc.invalidateQueries({ queryKey: ["packages-list"] });
      toast({ title: "Package cloned", description: `"${newPkg.name}" created successfully.` });
      setLocation(`/admin/packages/${newPkg.id}`);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to clone package" }),
  });

  const { isEditing, isSaving, startEdit, cancelEdit, setField, saveEdit, getValue } = useDetailEdit({
    initialData: rec ?? {},
    onSave: async (data) => { await updateMutation.mutateAsync(data); },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
      </div>
    );
  }
  if (!rec) return <div className="p-6 text-muted-foreground">Package not found.</div>;

  const groupFlag = rec.groupCountryCode ? (COUNTRY_FLAG[rec.groupCountryCode] ?? "🌐") : "🌐";
  const groupStatus = rec.groupStatus ?? "active";

  const dbRates: Record<string, unknown> = ratesData?.rates ?? {};
  const activeCurrencies = ALL_CURRENCIES.filter(c => c.ccy === "AUD" || !!dbRates[c.ccy]);

  const primaryCcy = rec.groupCountryCode ? (COUNTRY_TO_CURRENCY[rec.groupCountryCode] ?? "AUD") : "AUD";
  const sortedCurrencies = [
    ...activeCurrencies.filter(c => c.ccy === primaryCcy),
    ...activeCurrencies.filter(c => c.ccy !== primaryCcy),
  ];

  // Build a toAud map: { [CCY]: rate_to_convert_1_CCY_to_AUD }
  const toAudRates: Record<string, number> = { AUD: 1 };
  for (const [ccy, info] of Object.entries(dbRates as Record<string, any>)) {
    if (info?.rate && typeof info.rate === "number") {
      toAudRates[ccy] = info.rate;
    }
  }

  // Convert a product line total to primaryCcy via AUD
  function convertToPrimary(amount: number, fromCcy: string): number {
    const audRate  = toAudRates[fromCcy] ?? null;
    const primRate = toAudRates[primaryCcy] ?? 1;
    if (audRate === null) return NaN; // unknown currency — skip
    const audAmount = amount * audRate;
    return audAmount / primRate;
  }

  const hasRates = Object.keys(toAudRates).length > 1;

  // Products total (included only) — converted to primaryCcy
  const includedLines = linkedProds.filter((r: any) => !r.isOptional);
  const allSameCcy = includedLines.every((r: any) => (r.currency ?? "AUD") === (includedLines[0]?.currency ?? "AUD"));
  const needsConversion = !allSameCcy;
  const includedTotal = includedLines.reduce((sum: number, r: any) => {
    const price = parseFloat(r.unitPrice ?? r.cost ?? "0") || 0;
    const qty   = r.quantity ?? 1;
    const lineCcy = r.currency ?? "AUD";
    const converted = convertToPrimary(price * qty, lineCcy);
    return isNaN(converted) ? sum : sum + converted;
  }, 0);

  // ── Advanced search computed values ────────────────────────────────
  const availableCountries = Array.from(
    new Set(allActiveProds.map((p: any) => p.providerCountry).filter(Boolean))
  ).sort() as string[];

  const availableLocations = Array.from(
    new Set(
      allActiveProds.flatMap((p: any) =>
        (p.providerLocation ?? "").split(",").map((s: string) => s.trim()).filter(Boolean)
      )
    )
  ).sort() as string[];

  const filteredProds = allActiveProds
    .filter((p: any) => prodTypeFilter === "all" || p.productType === prodTypeFilter)
    .filter((p: any) => !linkedProds.some((l: any) => l.productId === p.id))
    .filter((p: any) => !prodSearch || p.productName?.toLowerCase().includes(prodSearch.toLowerCase()))
    .filter((p: any) => advCountry === "all" || p.providerCountry === advCountry)
    .filter((p: any) => advLocation === "all" || (p.providerLocation ?? "").toLowerCase().includes(advLocation.toLowerCase()))
    .sort((a: any, b: any) => {
      if (advSortBy === "price_asc")  return (parseFloat(a.cost ?? "0") || 0) - (parseFloat(b.cost ?? "0") || 0);
      if (advSortBy === "price_desc") return (parseFloat(b.cost ?? "0") || 0) - (parseFloat(a.cost ?? "0") || 0);
      return (a.productName ?? "").localeCompare(b.productName ?? "");
    });

  const hasAdvancedFilters = advCountry !== "all" || advLocation !== "all" || advSortBy !== "name";

  return (
    <DetailPageLayout
      title={rec.name ?? "Package"}
      subtitle={rec.groupNameEn ? `${groupFlag} ${rec.groupNameEn}` : ""}
      badge={
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[rec.status ?? "active"] ?? "bg-gray-100 text-gray-600"}`}>
          {rec.status ?? "active"}
        </span>
      }
      backPath="/admin/packages"
      backLabel="Packages"
      canEdit={canEdit}
      isEditing={isEditing}
      isSaving={isSaving}
      onEdit={startEdit}
      onCancel={cancelEdit}
      onSave={saveEdit}
      headerExtra={
        canEdit && !isEditing ? (
          <Button
            size="sm"
            className="gap-1.5 bg-(--e-orange) hover:bg-[#d97706] text-white border-0"
            disabled={cloneMutation.isPending}
            onClick={() => cloneMutation.mutate()}
          >
            {cloneMutation.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Copy className="w-3.5 h-3.5" />
            }
            Clone
          </Button>
        ) : undefined
      }
    >

      {/* ── Package Group Info (read-only lookup card) ───────────────── */}
      <div className="rounded-xl border bg-gradient-to-br from-(--e-orange)/5 to-orange-50/50 p-4 mb-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-(--e-orange) uppercase tracking-wide">Package Group Info</p>
          <button
            onClick={() => setLocation(`/admin/package-groups/${rec.packageGroupId}`)}
            className="inline-flex items-center gap-1 text-xs text-(--e-orange) hover:underline font-medium"
          >
            <ExternalLink className="w-3 h-3" /> View Package Group →
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="flex items-start gap-2">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Group Name</div>
              <div className="font-semibold">{rec.groupNameEn ?? "—"}</div>
              {rec.groupNameKo && <div className="text-xs text-muted-foreground">{rec.groupNameKo}</div>}
            </div>
          </div>

          {rec.coordinatorName && (
            <div className="flex items-start gap-2">
              <Users className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Camp Provider</div>
                <div className="font-medium">{rec.coordinatorName}</div>
                {rec.coordinatorEmail && <div className="text-xs text-muted-foreground">{rec.coordinatorEmail}</div>}
              </div>
            </div>
          )}

          {rec.groupLocation && (
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Location</div>
                <div className="font-medium">{rec.groupLocation}</div>
              </div>
            </div>
          )}

          {rec.groupCountryCode && (
            <div className="flex items-start gap-2">
              <Globe className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Country</div>
                <div className="font-medium">{groupFlag} {rec.groupCountryCode}</div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2">
            <div className="w-3.5 h-3.5 mt-0.5 shrink-0 flex items-center justify-center">
              {groupStatus === "active"
                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                : <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Group Status</div>
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${STATUS_COLORS[groupStatus] ?? "bg-gray-100 text-gray-600"}`}>
                {groupStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Package Details (editable) ────────────────────────────────── */}
      <DetailSection title="Package Details">
        <DetailRow label="Package Name">
          <EditableField
            isEditing={isEditing}
            value={getValue("name", rec.name)}
            onChange={v => setField("name", v)}
            display={<span className="font-medium">{rec.name}</span>}
          />
        </DetailRow>

        <DetailRow label={
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3 text-blue-500" /> Adults
          </span>
        }>
          <EditableField
            isEditing={isEditing}
            value={String(getValue("adults", rec.adults) ?? "")}
            onChange={v => setField("adults", v ? parseInt(v) : null)}
            inputType="number"
            display={
              rec.adults != null
                ? <span className="text-blue-600 font-semibold">{rec.adults} 명</span>
                : <span className="text-muted-foreground/50">—</span>
            }
          />
        </DetailRow>

        <DetailRow label={
          <span className="flex items-center gap-1">
            <GraduationCap className="w-3 h-3 text-green-500" /> Children
          </span>
        }>
          <EditableField
            isEditing={isEditing}
            value={String(getValue("children", rec.children) ?? "")}
            onChange={v => setField("children", v ? parseInt(v) : null)}
            inputType="number"
            display={
              rec.children != null
                ? <span className="text-green-600 font-semibold">{rec.children} 명</span>
                : <span className="text-muted-foreground/50">—</span>
            }
          />
        </DetailRow>

        {/* Status — always editable without entering full edit mode */}
        <DetailRow label="Status">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[rec.status ?? "active"] ?? "bg-gray-100 text-gray-600"}`}>
              {rec.status ?? "active"}
            </span>
            {canEdit && (
              <>
                <Select
                  value={pendingStatus ?? (rec.status ?? "active")}
                  onValueChange={v => setPendingStatus(v === (rec.status ?? "active") ? null : v)}
                >
                  <SelectTrigger className="h-7 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["active", "expired", "pending", "draft", "inactive", "archived"] as const).map(s => (
                      <SelectItem key={s} value={s}>
                        <span className={`capitalize font-medium ${STATUS_COLORS[s]?.replace("bg-", "text-").replace(/ text-\S+/, "") ?? ""}`}>
                          {s}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {pendingStatus && pendingStatus !== (rec.status ?? "active") && (
                  <Button
                    size="sm"
                    className="h-7 px-3 text-xs bg-(--e-orange) hover:bg-[#d97706] text-white"
                    disabled={changeStatusMutation.isPending}
                    onClick={() => changeStatusMutation.mutate(pendingStatus)}
                  >
                    {changeStatusMutation.isPending
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : "Apply"
                    }
                  </Button>
                )}
              </>
            )}
          </div>
        </DetailRow>
      </DetailSection>

      {/* ── Pricing ─────────────────────────────────────────────────────── */}
      <DetailSection title="Pricing">
        {sortedCurrencies.length === 0 ? (
          <div className="px-4 py-3 text-sm text-muted-foreground">
            No exchange rates configured. Add rates in{" "}
            <a href={`/admin/accounting/exchange-rates`} className="text-(--e-orange) underline">Exchange Rates</a>.
          </div>
        ) : (
          sortedCurrencies.map(({ ccy, flag, sym, dec, field }) => {
            const isPrimary = ccy === primaryCcy;
            return (
              <DetailRow
                key={field}
                label={
                  <span className={`flex items-center gap-1.5 ${isPrimary ? "font-bold text-foreground" : ""}`}>
                    {flag} {ccy}
                    {isPrimary && (
                      <span className="px-1.5 py-0.5 bg-(--e-orange) text-white rounded text-[10px] font-bold uppercase">
                        PRIMARY
                      </span>
                    )}
                  </span>
                }
              >
                <EditableField
                  isEditing={isEditing}
                  value={String(getValue(field, rec[field as keyof typeof rec]) ?? "")}
                  onChange={v => setField(field, v)}
                  inputType="number"
                  className={isPrimary && isEditing ? "border-(--e-orange) ring-1 ring-(--e-orange)/30" : ""}
                  display={
                    <span className={`font-mono ${isPrimary ? "font-bold text-(--e-orange)" : ""}`}>
                      {fmtPrice(rec[field as keyof typeof rec] as string, sym, dec) ?? (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </span>
                  }
                />
              </DetailRow>
            );
          })
        )}
      </DetailSection>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      {(() => {
        const rawFeatures = rec.features;
        const featuresArr: string[] = Array.isArray(rawFeatures)
          ? rawFeatures
          : typeof rawFeatures === "string" && rawFeatures
          ? rawFeatures.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];
        const editVal = getValue("features", featuresArr);
        const editArr: string[] = Array.isArray(editVal)
          ? editVal
          : typeof editVal === "string" && editVal
          ? (editVal as string).split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];
        return (
          <DetailSection title="Features">
            <DetailRow label="Features">
              <EditableField
                isEditing={isEditing}
                value={editArr.join(", ")}
                onChange={v => setField("features", v.split(",").map((s: string) => s.trim()).filter(Boolean))}
                display={
                  featuresArr.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {featuresArr.map((f: string, i: number) => (
                        <span key={i} className="bg-(--e-orange-lt) text-(--e-orange) text-xs px-2 py-0.5 rounded-full font-medium">
                          {f}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )
                }
                placeholder="e.g. Airport pickup, Meals, Wi-Fi"
              />
            </DetailRow>
          </DetailSection>
        );
      })()}

      {/* ── Products ─────────────────────────────────────────────────────── */}
      <DetailSection
        title={
          <span className="flex items-center gap-2">
            <Package className="w-4 h-4 text-(--e-orange)" />
            Products
            <span className="ml-1 px-2 py-0.5 rounded-full bg-(--e-orange) text-white text-xs font-bold">
              {linkedProds.length}
            </span>
          </span>
        }
      >
        <div className="px-4 py-3 space-y-3">

          {/* Add Product Button */}
          {canEdit && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {linkedProds.length > 0
                  ? `${linkedProds.filter((r: any) => !r.isOptional).length} included · ${linkedProds.filter((r: any) => r.isOptional).length} optional`
                  : "No products linked yet"}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 border-(--e-orange) text-(--e-orange) hover:bg-(--e-orange-lt)"
                onClick={() => {
                  setProdTypeFilter("all");
                  setProdSearch("");
                  setSelectedProdId(null);
                  setAddQty(1);
                  setAddUnitPrice("");
                  setAddIsOptional(false);
                  setAddError(null);
                  setShowAdvanced(false);
                  setAdvCountry("all");
                  setAdvLocation("all");
                  setAdvSortBy("name");
                  setShowAddProd(v => !v);
                }}
              >
                <Plus className="h-3 w-3" /> Add Product
              </Button>
            </div>
          )}

          {/* Add Product Picker */}
          {showAddProd && (
            <div className="border border-(--e-orange-a20) rounded-lg p-3 bg-(--e-orange-lt)/30 space-y-2">
              {/* Type filter tabs */}
              <div className="flex gap-1.5 flex-wrap">
                {PROD_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => { setProdTypeFilter(t); setSelectedProdId(null); }}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                      prodTypeFilter === t
                        ? "bg-(--e-orange-lt) text-(--e-orange) border-(--e-orange-a20)"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {t === "all" ? "All" : t}
                  </button>
                ))}
              </div>

              {/* Search row: text input + advanced toggle */}
              <div className="flex gap-1.5 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search product name..."
                    value={prodSearch}
                    onChange={e => { setProdSearch(e.target.value); setSelectedProdId(null); }}
                    className="h-7 text-xs pl-6"
                  />
                </div>
                <button
                  onClick={() => setShowAdvanced(v => !v)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors shrink-0 ${
                    showAdvanced || hasAdvancedFilters
                      ? "bg-(--e-orange-lt) text-(--e-orange) border-(--e-orange-a40)"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  Advanced
                  {hasAdvancedFilters && (
                    <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-(--e-orange) inline-block" />
                  )}
                  {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Advanced search panel */}
              {showAdvanced && (
                <div className="border border-(--e-orange-a13) rounded-md p-3 bg-white/60 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Country */}
                    <div>
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Country</Label>
                      <Select value={advCountry} onValueChange={v => { setAdvCountry(v); setSelectedProdId(null); }}>
                        <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Countries</SelectItem>
                          {availableCountries.map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Location */}
                    <div>
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Location</Label>
                      <Select value={advLocation} onValueChange={v => { setAdvLocation(v); setSelectedProdId(null); }}>
                        <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Locations</SelectItem>
                          {availableLocations.map(l => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                    {/* Sort */}
                    <div>
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Sort by</Label>
                      <Select value={advSortBy} onValueChange={v => setAdvSortBy(v)}>
                        <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">Name A → Z</SelectItem>
                          <SelectItem value="price_asc">Price low → high</SelectItem>
                          <SelectItem value="price_desc">Price high → low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {hasAdvancedFilters && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            setAdvCountry("all");
                            setAdvLocation("all");
                            setAdvSortBy("name");
                            setSelectedProdId(null);
                          }}
                          className="text-[10px] text-muted-foreground hover:text-destructive underline"
                        >
                          Reset
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Result count */}
                  <p className="text-[10px] text-muted-foreground">
                    {filteredProds.length} product{filteredProds.length !== 1 ? "s" : ""} match
                    {filteredProds.length !== 1 ? "" : "es"}
                  </p>
                </div>
              )}

              {/* Product list */}
              <div className="max-h-44 overflow-y-auto border border-border rounded-md divide-y bg-white">
                {filteredProds.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No products available</p>
                ) : (
                  filteredProds.map((p: any) => (
                      <label key={p.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/40">
                        <input
                          type="radio"
                          name="add-prod-sel"
                          value={p.id}
                          checked={selectedProdId === p.id}
                          onChange={() => { setSelectedProdId(p.id); setAddUnitPrice(p.cost ?? ""); }}
                          className="shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium truncate block">{p.productName}</span>
                          <span className="text-[11px] text-muted-foreground capitalize">
                            {p.productType} · {p.currency} {p.cost ? Number(p.cost).toLocaleString() : "—"}
                          </span>
                        </div>
                      </label>
                    ))
                )}
              </div>

              {/* Qty / Price / Optional */}
              {selectedProdId && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[11px]">Qty</Label>
                    <Input
                      type="number" min={1}
                      value={addQty}
                      onChange={e => setAddQty(Number(e.target.value))}
                      className="mt-0.5 h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Unit Price</Label>
                    <Input
                      type="number" step="0.01"
                      value={addUnitPrice}
                      onChange={e => setAddUnitPrice(e.target.value)}
                      className="mt-0.5 h-7 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Inclusion</Label>
                    <Select value={addIsOptional ? "optional" : "included"} onValueChange={v => setAddIsOptional(v === "optional")}>
                      <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="included">Included</SelectItem>
                        <SelectItem value="optional">Optional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {addError && <p className="text-xs text-red-500">{addError}</p>}

              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAddProd(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs bg-(--e-orange) hover:bg-[#d97706] text-white"
                  disabled={!selectedProdId || addProd.isPending}
                  onClick={() => {
                    if (!selectedProdId) return;
                    addProd.mutate({ productId: selectedProdId, quantity: addQty, unitPrice: addUnitPrice, isOptional: addIsOptional });
                  }}
                >
                  {addProd.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
                </Button>
              </div>
            </div>
          )}

          {/* Products table */}
          {linkedProdsLoading ? (
            <div className="h-12 bg-muted/30 rounded animate-pulse" />
          ) : linkedProds.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-2">No products linked to this package.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Product Name</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Inclusion</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unit Price</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Qty</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                    {canEdit && <th className="w-16 px-3 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {linkedProds.map((row: any) => {
                    const isEditRow = editingProdId === row.productId;
                    const unitP = parseFloat(row.unitPrice ?? row.cost ?? "0") || 0;
                    const qty   = row.quantity ?? 1;
                    const total = unitP * qty;
                    const currency = row.currency ?? "AUD";
                    return (
                      <tr key={row.linkId} className="border-b last:border-0 hover:bg-(--e-orange-lt)/40 transition-colors">
                        <td className="px-3 py-2 font-medium text-sm">{row.productName}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground capitalize">{row.productType}</td>
                        <td className="px-3 py-2 text-center">
                          {isEditRow ? (
                            <Select value={editIsOptional ? "optional" : "included"} onValueChange={v => setEditIsOptional(v === "optional")}>
                              <SelectTrigger className="h-6 text-xs w-24 mx-auto"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="included">Included</SelectItem>
                                <SelectItem value="optional">Optional</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${row.isOptional ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-700"}`}>
                              {row.isOptional ? "Optional" : "Included"}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-sm">
                          {isEditRow ? (
                            <Input
                              type="number" step="0.01"
                              value={editUnitPrice}
                              onChange={e => setEditUnitPrice(e.target.value)}
                              className="h-6 text-xs w-24 text-right ml-auto font-mono"
                            />
                          ) : (
                            <span>{currency} {unitP.toLocaleString("en-AU", { minimumFractionDigits: 2 })}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {isEditRow ? (
                            <Input
                              type="number" min={1}
                              value={editQty}
                              onChange={e => setEditQty(Number(e.target.value))}
                              className="h-6 text-xs w-16 text-right ml-auto"
                            />
                          ) : (
                            <span className="font-mono">{qty}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-sm font-semibold">
                          {isEditRow
                            ? (() => {
                                const ep = parseFloat(editUnitPrice) || 0;
                                return `${currency} ${(ep * editQty).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;
                              })()
                            : `${currency} ${total.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`
                          }
                        </td>
                        {canEdit && (
                          <td className="px-3 py-2">
                            {isEditRow ? (
                              <div className="flex gap-1 justify-end">
                                <Button
                                  size="sm" variant="ghost"
                                  className="h-6 px-2 text-xs text-muted-foreground"
                                  onClick={() => setEditingProdId(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-6 px-2 text-xs bg-(--e-orange) hover:bg-[#d97706] text-white"
                                  disabled={updateProd.isPending}
                                  onClick={() => updateProd.mutate({
                                    productId: row.productId,
                                    payload: { quantity: editQty, unitPrice: editUnitPrice, isOptional: editIsOptional },
                                  })}
                                >
                                  {updateProd.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-1 justify-end">
                                <button
                                  className="text-muted-foreground hover:text-(--e-orange) transition-colors p-1"
                                  title="Edit"
                                  onClick={() => {
                                    setEditingProdId(row.productId);
                                    setEditQty(row.quantity ?? 1);
                                    setEditUnitPrice(row.unitPrice ?? row.cost ?? "");
                                    setEditIsOptional(row.isOptional ?? false);
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                </button>
                                <button
                                  className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                  title="Remove"
                                  disabled={removeProd.isPending}
                                  onClick={() => {
                                    if (window.confirm(`Remove "${row.productName}" from this package?`)) {
                                      removeProd.mutate(row.productId);
                                    }
                                  }}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                {/* Totals footer */}
                {includedLines.length > 0 && (
                  <tfoot>
                    <tr className="border-t bg-muted/20">
                      <td colSpan={5} className="px-3 py-2 text-right">
                        <div className="text-xs text-muted-foreground font-medium">Included Total</div>
                        {needsConversion && hasRates && (
                          <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                            converted to {primaryCcy}
                          </div>
                        )}
                        {needsConversion && !hasRates && (
                          <div className="text-[10px] text-amber-500 mt-0.5">
                            mixed currencies — add exchange rates for accurate total
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-sm font-bold text-(--e-orange)">
                        {primaryCcy} {includedTotal.toLocaleString("en-AU", { minimumFractionDigits: 2 })}
                      </td>
                      {canEdit && <td />}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </DetailSection>

      {/* ── Contracts ────────────────────────────────────────────────────── */}
      {(() => {
        const contractList = contractsData?.data ?? [];
        const total = contractsData?.meta?.total ?? 0;
        return (
          <DetailSection
            title={
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-(--e-orange)" />
                Contracts
                <span className="ml-1 px-2 py-0.5 rounded-full bg-(--e-orange) text-white text-xs font-bold">
                  {total}
                </span>
              </span>
            }
          >
            {contractList.length === 0 ? (
              <div className="px-4 py-4 text-sm text-muted-foreground text-center">
                No contracts linked to this package yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contract #</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Student</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Paid</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Start</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">End</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractList.map((c: Record<string, unknown>, i: number) => (
                      <tr
                        key={c.id as string}
                        className={`border-b last:border-0 hover:bg-(--e-orange-lt) cursor-pointer transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                        onClick={() => setLocation(`/admin/crm/contracts/${c.id}`)}
                      >
                        <td className="px-3 py-2 font-mono text-xs font-medium text-(--e-orange)">
                          {c.contractNumber as string ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-sm">
                          {(c.studentName as string) ?? (c.clientEmail as string) ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CONTRACT_STATUS_COLORS[c.status as string] ?? "bg-gray-100 text-gray-600"}`}>
                            {c.status as string ?? "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-sm">
                          {c.totalAmount != null
                            ? `${c.currency ?? "AUD"} ${parseFloat(c.totalAmount as string).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-sm text-green-600">
                          {c.paidAmount != null && parseFloat(c.paidAmount as string) > 0
                            ? `${parseFloat(c.paidAmount as string).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {c.startDate ? formatDate(c.startDate as string) : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {c.endDate ? formatDate(c.endDate as string) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DetailSection>
        );
      })()}

      {/* ── Notes ─────────────────────────────────────────────────────── */}
      <DetailSection title="Notes">
        <div className="px-4 py-3">
          <NotePanel entityType="package" entityId={rec.id} />
        </div>
      </DetailSection>

      <SystemInfoSection owner={null} createdAt={rec.createdAt} updatedAt={rec.updatedAt} />
    </DetailPageLayout>
  );
}
