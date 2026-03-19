import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { DetailPageLayout, DetailSection, DetailRow, EditableField } from "@/components/shared/DetailPageLayout";
import { useDetailEdit } from "@/hooks/useDetailEdit";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ExternalLink } from "lucide-react";
import { useLocation } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const COUNTRY_FLAG: Record<string, string> = {
  AU: "🇦🇺", PH: "🇵🇭", SG: "🇸🇬", TH: "🇹🇭", KR: "🇰🇷", JP: "🇯🇵", GB: "🇬🇧", US: "🇺🇸",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-amber-100 text-amber-700",
  archived: "bg-red-100 text-red-700",
};

function fmtPrice(val: string | null | undefined, currency: string, decimals = 0) {
  if (!val) return null;
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  return `${currency}${n.toLocaleString("en-AU", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
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

  const groupFlag = rec.groupCountryCode ? (COUNTRY_FLAG[rec.groupCountryCode] ?? "🌐") : "";

  return (
    <DetailPageLayout
      title={rec.name ?? "Package"}
      subtitle={rec.groupNameEn ? `${groupFlag} ${rec.groupNameEn}` : ""}
      badge={
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[rec.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
          {(rec.status ?? "active")}
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
      {/* Package Group info */}
      {rec.groupNameEn && (
        <DetailSection title="Package Group">
          <DetailRow label="Group Name (EN)">
            <div className="flex items-center gap-2">
              <span>{groupFlag} {rec.groupNameEn}</span>
              <button
                onClick={() => setLocation(`${BASE}/admin/package-groups/${rec.packageGroupId}`)}
                className="inline-flex items-center gap-0.5 text-xs text-[#F5821F] hover:underline"
              >
                <ExternalLink className="w-3 h-3" /> View Group
              </button>
            </div>
          </DetailRow>
          {rec.groupNameKo && (
            <DetailRow label="Group Name (KO)">{rec.groupNameKo}</DetailRow>
          )}
          {rec.groupLocation && (
            <DetailRow label="Location">{rec.groupLocation}</DetailRow>
          )}
        </DetailSection>
      )}

      {/* Basic info */}
      <DetailSection title="Package Details">
        <DetailRow label="Package Name">
          <EditableField
            isEditing={isEditing}
            value={getValue("name", rec.name)}
            onChange={v => setField("name", v)}
            display={<span className="font-medium">{rec.name}</span>}
          />
        </DetailRow>
        <DetailRow label="Duration (Days)">
          <EditableField
            isEditing={isEditing}
            value={String(getValue("durationDays", rec.durationDays) ?? "")}
            onChange={v => setField("durationDays", parseInt(v) || v)}
            inputType="number"
            display={<span>{rec.durationDays} days</span>}
          />
        </DetailRow>
        <DetailRow label="Max Participants">
          <EditableField
            isEditing={isEditing}
            value={String(getValue("maxParticipants", rec.maxParticipants) ?? "")}
            onChange={v => setField("maxParticipants", parseInt(v) || null)}
            inputType="number"
            display={<span>{rec.maxParticipants ?? "—"}</span>}
          />
        </DetailRow>
        <DetailRow label="Status">
          {isEditing ? (
            <Select value={getValue("status", rec.status) ?? "active"} onValueChange={v => setField("status", v)}>
              <SelectTrigger className="h-8 w-36 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[rec.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
              {rec.status ?? "active"}
            </span>
          )}
        </DetailRow>
      </DetailSection>

      {/* Pricing */}
      <DetailSection title="Pricing">
        {[
          { label: "🇦🇺 AUD", field: "priceAud", sym: "A$", dec: 2 },
          { label: "🇰🇷 KRW", field: "priceKrw", sym: "₩", dec: 0 },
          { label: "🇯🇵 JPY", field: "priceJpy", sym: "¥", dec: 0 },
          { label: "🇺🇸 USD", field: "priceUsd", sym: "$", dec: 2 },
          { label: "🇹🇭 THB", field: "priceThb", sym: "฿", dec: 0 },
          { label: "🇵🇭 PHP", field: "pricePhp", sym: "₱", dec: 0 },
          { label: "🇸🇬 SGD", field: "priceSgd", sym: "S$", dec: 2 },
          { label: "🇬🇧 GBP", field: "priceGbp", sym: "£", dec: 2 },
        ].map(({ label, field, sym, dec }) => (
          <DetailRow key={field} label={label}>
            <EditableField
              isEditing={isEditing}
              value={String(getValue(field, rec[field as keyof typeof rec]) ?? "")}
              onChange={v => setField(field, v)}
              inputType="number"
              display={
                <span className="font-mono">
                  {fmtPrice(rec[field as keyof typeof rec] as string, sym, dec) ?? (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </span>
              }
            />
          </DetailRow>
        ))}
      </DetailSection>

      {/* Features */}
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

      {/* Metadata */}
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
