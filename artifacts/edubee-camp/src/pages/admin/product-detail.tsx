import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { DetailPageLayout, DetailSection, DetailRow, EditableField } from "@/components/shared/DetailPageLayout";
import { useDetailEdit } from "@/hooks/useDetailEdit";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ExternalLink } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const PRODUCT_TYPES = ["institute", "hotel", "pickup", "tour", "settlement", "program"];
const CURRENCIES = ["AUD", "USD", "KRW", "JPY", "THB", "PHP", "SGD", "GBP"];
const UNITS = ["per person", "per night", "per day", "per session", "per trip", "per group", "per week", "per transfer", "per meal", "flat fee"];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  archived: "bg-red-100 text-red-700",
};

const TYPE_BADGE: Record<string, string> = {
  institute:  "bg-blue-50 text-blue-700",
  hotel:      "bg-purple-50 text-purple-700",
  pickup:     "bg-orange-50 text-orange-700",
  tour:       "bg-green-50 text-green-700",
  settlement: "bg-neutral-100 text-neutral-600",
  program:    "bg-sky-50 text-sky-700",
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "A$", USD: "$", KRW: "₩", JPY: "¥", THB: "฿", PHP: "₱", SGD: "S$", GBP: "£",
};

const CURRENCY_FLAGS: Record<string, string> = {
  AUD: "🇦🇺", USD: "🇺🇸", KRW: "🇰🇷", JPY: "🇯🇵", THB: "🇹🇭", PHP: "🇵🇭", SGD: "🇸🇬", GBP: "🇬🇧",
};

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["product-detail", id],
    queryFn: () => axios.get(`${BASE}/api/products/${id}`).then(r => r.data),
  });

  const rec = data;

  const { data: providerData } = useQuery({
    queryKey: ["user-detail", rec?.providerAccountId],
    queryFn: () => axios.get(`${BASE}/api/users/${rec.providerAccountId}`).then(r => r.data?.data ?? r.data),
    enabled: !!rec?.providerAccountId,
  });

  const { data: linkedGroupsData } = useQuery({
    queryKey: ["product-linked-groups", id],
    queryFn: () => axios.get(`${BASE}/api/products/${id}/linked-groups`).then(r => r.data),
    enabled: !!id,
  });
  const linkedGroups: any[] = linkedGroupsData ?? [];

  const canEdit = ["super_admin", "admin"].includes(user?.role ?? "");

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      axios.put(`${BASE}/api/products/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-detail", id] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product updated" });
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
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}
      </div>
    );
  }
  if (!rec) return <div className="p-6 text-muted-foreground">Product not found.</div>;

  const sym = CURRENCY_SYMBOLS[rec.currency ?? "AUD"] ?? "A$";
  const costNum = rec.cost ? Number(rec.cost) : null;
  const costFormatted = costNum != null
    ? `${sym}${costNum.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${rec.unit ? ` / ${rec.unit}` : ""}`
    : "—";

  const provider = providerData;
  const providerInitials = provider
    ? (provider.fullName ?? provider.email ?? "?").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "";

  return (
    <DetailPageLayout
      title={rec.productName ?? "Product"}
      subtitle={rec.productType ? rec.productType.charAt(0).toUpperCase() + rec.productType.slice(1) : ""}
      badge={
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[rec.status ?? "active"] ?? "bg-gray-100 text-gray-600"}`}>
          {rec.status ?? "active"}
        </span>
      }
      backPath="/admin/products"
      backLabel="Products"
      canEdit={canEdit}
      isEditing={isEditing}
      isSaving={isSaving}
      onEdit={startEdit}
      onCancel={cancelEdit}
      onSave={saveEdit}
    >
      {/* Provider */}
      {(provider || rec?.providerAccountId) && (
        <DetailSection title="Provider">
          {provider ? (
            <div className="flex items-center gap-3">
              <Avatar className="w-9 h-9 shrink-0">
                <AvatarFallback className="bg-[#FEF0E3] text-[#F5821F] text-xs font-bold">{providerInitials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{provider.fullName ?? provider.email}</p>
                <p className="text-xs text-muted-foreground truncate">{provider.email} · {provider.role}</p>
              </div>
              <button
                onClick={() => navigate(`${BASE}/admin/users/${rec.providerAccountId}`)}
                className="text-muted-foreground hover:text-[#F5821F] transition-colors shrink-0"
                title="Go to user detail"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <DetailRow label="Provider ID">
              <span className="font-mono text-xs text-muted-foreground">{rec.providerAccountId}</span>
            </DetailRow>
          )}
          {isEditing && canEdit && (
            <DetailRow label="Change Provider">
              <span className="text-xs text-muted-foreground">User search not available inline. Edit from Products page.</span>
            </DetailRow>
          )}
        </DetailSection>
      )}

      {/* Product Details */}
      <DetailSection title="Product Details">
        <DetailRow label="Product Name">
          <EditableField
            isEditing={isEditing}
            value={getValue("productName", rec.productName) ?? ""}
            onChange={v => setField("productName", v)}
            display={<span className="font-medium">{rec.productName}</span>}
          />
        </DetailRow>

        <DetailRow label="Product Type">
          {isEditing ? (
            <Select
              value={getValue("productType", rec.productType) ?? "program"}
              onValueChange={v => setField("productType", v)}
            >
              <SelectTrigger className="h-8 w-44 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_TYPES.map(t => (
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[rec.productType] ?? "bg-gray-100 text-gray-600"}`}>
              {rec.productType}
            </span>
          )}
        </DetailRow>

        <DetailRow label="Description">
          <EditableField
            isEditing={isEditing}
            value={getValue("description", rec.description) ?? ""}
            onChange={v => setField("description", v)}
            display={
              rec.description
                ? <span className="text-sm whitespace-pre-wrap">{rec.description}</span>
                : <span className="text-muted-foreground/50">—</span>
            }
            multiline
            placeholder="Product description…"
          />
        </DetailRow>

        <DetailRow label="Status">
          {isEditing ? (
            <Select
              value={getValue("status", rec.status) ?? "active"}
              onValueChange={v => setField("status", v)}
            >
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
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[rec.status ?? "active"] ?? "bg-gray-100 text-gray-600"}`}>
              {rec.status ?? "active"}
            </span>
          )}
        </DetailRow>
      </DetailSection>

      {/* Pricing */}
      <DetailSection title="Pricing">
        <DetailRow label="Cost">
          <EditableField
            isEditing={isEditing}
            value={String(getValue("cost", rec.cost) ?? "")}
            onChange={v => setField("cost", v || null)}
            inputType="number"
            display={<span className="font-mono font-semibold">{costFormatted}</span>}
            placeholder="0.00"
          />
        </DetailRow>

        <DetailRow label="Currency">
          {isEditing ? (
            <Select
              value={getValue("currency", rec.currency) ?? "AUD"}
              onValueChange={v => setField("currency", v)}
            >
              <SelectTrigger className="h-8 w-28 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c} value={c}>
                    {CURRENCY_FLAGS[c]} {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-sm font-medium">
              {CURRENCY_FLAGS[rec.currency ?? "AUD"]} {rec.currency ?? "AUD"}
            </span>
          )}
        </DetailRow>

        <DetailRow label="Unit">
          {isEditing ? (
            <Select
              value={getValue("unit", rec.unit) ?? ""}
              onValueChange={v => setField("unit", v === "none" ? null : v)}
            >
              <SelectTrigger className="h-8 w-40 text-sm">
                <SelectValue placeholder="Select unit…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— No unit —</SelectItem>
                {UNITS.map(u => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-sm text-muted-foreground">
              {rec.unit ? `/ ${rec.unit}` : <span className="opacity-50">—</span>}
            </span>
          )}
        </DetailRow>
      </DetailSection>

      {/* Linked Package Groups */}
      {linkedGroups.length > 0 && (
        <DetailSection title="Linked Package Groups">
          <div className="flex flex-wrap gap-2 pt-1">
            {linkedGroups.map((g: any) => (
              <button
                key={g.linkId}
                onClick={() => navigate(`${BASE}/admin/package-groups/${g.packageGroupId}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#FEF0E3] text-[#F5821F] border border-[#F5821F33] hover:bg-[#f5821f1a] transition-colors"
              >
                {g.nameEn}
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </button>
            ))}
          </div>
        </DetailSection>
      )}

      {/* Metadata */}
      <DetailSection title="Metadata">
        <DetailRow label="Product ID">
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
