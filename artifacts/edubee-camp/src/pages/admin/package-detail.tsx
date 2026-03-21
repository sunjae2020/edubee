import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { DetailPageLayout, DetailSection, DetailRow, EditableField } from "@/components/shared/DetailPageLayout";
import { useDetailEdit } from "@/hooks/useDetailEdit";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ExternalLink, MapPin, Globe, Users, GraduationCap, Building2, CheckCircle2, Clock, FileText } from "lucide-react";
import { useLocation } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const COUNTRY_FLAG: Record<string, string> = {
  AU: "🇦🇺", PH: "🇵🇭", SG: "🇸🇬", TH: "🇹🇭", KR: "🇰🇷", JP: "🇯🇵", GB: "🇬🇧", US: "🇺🇸",
};

// Currency config — full list; will be filtered by DB exchange rates
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

// Country code → primary currency code
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  PH: "PHP", TH: "THB", SG: "SGD", JP: "JPY", KR: "KRW", GB: "GBP", US: "USD", AU: "AUD",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-amber-100 text-amber-700",
  archived: "bg-red-100 text-red-700",
  draft: "bg-gray-100 text-gray-600",
};

const CONTRACT_STATUS_COLORS: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-600",
  pending:   "bg-amber-100 text-amber-700",
  active:    "bg-blue-100 text-blue-700",
  signed:    "bg-green-100 text-green-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

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

  const { data, isLoading } = useQuery({
    queryKey: ["package-detail", id],
    queryFn: () => axios.get(`${BASE}/api/packages/${id}`).then(r => r.data),
  });

  // Public exchange rates — determines which currency fields to show
  const { data: ratesData } = useQuery({
    queryKey: ["public-exchange-rates"],
    queryFn: () => axios.get(`${BASE}/api/public/exchange-rates`).then(r => r.data),
    staleTime: 3_600_000,
  });

  // Contracts linked to this package (via applications.packageId)
  const { data: contractsData } = useQuery({
    queryKey: ["package-contracts", id],
    queryFn: () => axios.get(`${BASE}/api/contracts`, { params: { packageId: id, limit: 100 } }).then(r => r.data),
    enabled: !!id,
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

  // Filter currencies to only those in Exchange Rates DB
  const dbRates: Record<string, unknown> = ratesData?.rates ?? {};
  const activeCurrencies = ALL_CURRENCIES.filter(c => c.ccy === "AUD" || !!dbRates[c.ccy]);

  // Determine primary currency for this package (based on Package Group's country)
  const primaryCcy = rec.groupCountryCode ? (COUNTRY_TO_CURRENCY[rec.groupCountryCode] ?? "AUD") : "AUD";

  // Sort so primary currency is always first
  const sortedCurrencies = [
    ...activeCurrencies.filter(c => c.ccy === primaryCcy),
    ...activeCurrencies.filter(c => c.ccy !== primaryCcy),
  ];

  return (
    <DetailPageLayout
      title={rec.name ?? "Package"}
      subtitle={rec.groupNameEn ? `${groupFlag} ${rec.groupNameEn}` : ""}
      badge={
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[groupStatus] ?? "bg-gray-100 text-gray-600"}`}>
          {groupStatus}
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
    >

      {/* ── Package Group Info (read-only lookup card) ───────────────── */}
      <div className="rounded-xl border bg-gradient-to-br from-[#F5821F]/5 to-orange-50/50 p-4 mb-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-[#F5821F] uppercase tracking-wide">Package Group Info</p>
          <button
            onClick={() => setLocation(`${BASE}/admin/package-groups/${rec.packageGroupId}`)}
            className="inline-flex items-center gap-1 text-xs text-[#F5821F] hover:underline font-medium"
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
      </DetailSection>

      {/* ── Pricing ─────────────────────────────────────────────────────── */}
      <DetailSection title="Pricing">
        {sortedCurrencies.length === 0 ? (
          <div className="px-4 py-3 text-sm text-muted-foreground">
            No exchange rates configured. Add rates in{" "}
            <a href={`${BASE}/admin/accounting/exchange-rates`} className="text-[#F5821F] underline">Exchange Rates</a>.
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
                      <span className="px-1.5 py-0.5 bg-[#F5821F] text-white rounded text-[10px] font-bold uppercase">
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
                  className={isPrimary && isEditing ? "border-[#F5821F] ring-1 ring-[#F5821F]/30" : ""}
                  display={
                    <span className={`font-mono ${isPrimary ? "font-bold text-[#F5821F]" : ""}`}>
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
                        <span key={i} className="bg-[#FEF0E3] text-[#F5821F] text-xs px-2 py-0.5 rounded-full font-medium">
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

      {/* ── Contracts ────────────────────────────────────────────────────── */}
      {(() => {
        const contractList = contractsData?.data ?? [];
        const total = contractsData?.meta?.total ?? 0;
        return (
          <DetailSection
            title={
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#F5821F]" />
                Contracts
                <span className="ml-1 px-2 py-0.5 rounded-full bg-[#F5821F] text-white text-xs font-bold">
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
                        className={`border-b last:border-0 hover:bg-[#FEF0E3] cursor-pointer transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                        onClick={() => setLocation(`${BASE}/admin/contracts/${c.id}`)}
                      >
                        <td className="px-3 py-2 font-mono text-xs font-medium text-[#F5821F]">
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
                          {c.startDate ? format(new Date(c.startDate as string), "dd MMM yyyy") : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {c.endDate ? format(new Date(c.endDate as string), "dd MMM yyyy") : "—"}
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

      {/* ── Metadata ─────────────────────────────────────────────────────── */}
      <DetailSection title="Metadata">
        <DetailRow label="Package ID">
          <span className="font-mono text-xs text-muted-foreground">{rec.id}</span>
        </DetailRow>
        <DetailRow label="Created">
          {rec.createdAt ? format(new Date(rec.createdAt), "PPP p") : "—"}
        </DetailRow>
        <DetailRow label="Updated">
          {rec.updatedAt ? format(new Date(rec.updatedAt), "PPP p") : "—"}
        </DetailRow>
      </DetailSection>
    </DetailPageLayout>
  );
}
