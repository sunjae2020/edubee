import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const PRODUCT_TYPES = ["institute", "hotel", "pickup", "tour", "settlement", "program"];
const CURRENCIES = ["AUD", "USD", "KRW", "JPY", "THB", "PHP", "SGD", "GBP"];

const TYPE_BADGE: Record<string, string> = {
  institute:  "bg-blue-50 text-blue-700",
  hotel:      "bg-purple-50 text-purple-700",
  pickup:     "bg-orange-50 text-orange-700",
  tour:       "bg-green-50 text-green-700",
  settlement: "bg-neutral-100 text-neutral-600",
  program:    "bg-sky-50 text-sky-700",
};

const STATUS_BADGE: Record<string, string> = {
  active:   "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  archived: "bg-red-100 text-red-700",
};

const COUNTRY_FLAGS: Record<string, string> = {
  AU: "🇦🇺", SG: "🇸🇬", PH: "🇵🇭", TH: "🇹🇭",
  KR: "🇰🇷", JP: "🇯🇵", GB: "🇬🇧", US: "🇺🇸",
  NZ: "🇳🇿", IE: "🇮🇪", CA: "🇨🇦",
};

export interface ProductDrawerProps {
  open: boolean;
  onClose: () => void;
  productId?: string | null;
  lockedProviderId?: string | null;
  canEdit?: boolean;
  onSaved?: () => void;
}

export default function ProductDrawer({
  open, onClose, productId, lockedProviderId, canEdit = true, onSaved,
}: ProductDrawerProps) {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const isCreate = !productId;
  const [editing, setEditing] = useState(isCreate);
  const [form, setForm] = useState({
    productName: "", productType: "institute", description: "",
    cost: "", currency: "AUD", unit: "", status: "active",
  });

  const { data: rec, isLoading } = useQuery({
    queryKey: ["product-detail", productId],
    queryFn: () => axios.get(`${BASE}/api/products/${productId}`).then(r => r.data),
    enabled: !!productId && open,
  });

  const { data: providerData } = useQuery({
    queryKey: ["user-detail", rec?.providerAccountId ?? lockedProviderId],
    queryFn: () => axios.get(`${BASE}/api/users/${rec?.providerAccountId ?? lockedProviderId}`).then(r => r.data?.data ?? r.data),
    enabled: open && !!(rec?.providerAccountId ?? lockedProviderId),
  });

  useEffect(() => {
    if (rec && !isCreate) {
      setForm({
        productName: rec.productName ?? "",
        productType: rec.productType ?? "institute",
        description: rec.description ?? "",
        cost: rec.cost ?? "",
        currency: rec.currency ?? "AUD",
        unit: rec.unit ?? "",
        status: rec.status ?? "active",
      });
      setEditing(false);
    }
    if (isCreate) {
      setForm({ productName: "", productType: "institute", description: "", cost: "", currency: "AUD", unit: "", status: "active" });
      setEditing(true);
    }
  }, [rec, isCreate, open]);

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      isCreate
        ? axios.post(`${BASE}/api/products`, data).then(r => r.data)
        : axios.put(`${BASE}/api/products/${productId}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product-detail", productId] });
      toast({ title: isCreate ? "Product created" : "Product updated" });
      setEditing(false);
      onSaved?.();
      if (isCreate) onClose();
    },
    onError: () => toast({ variant: "destructive", title: "Failed to save product" }),
  });

  const handleSave = () => {
    const payload: any = {
      ...form,
      cost: form.cost || null,
      description: form.description || null,
      unit: form.unit || null,
    };
    if (isCreate && lockedProviderId) payload.providerAccountId = lockedProviderId;
    saveMutation.mutate(payload);
  };

  const provider = providerData;
  const providerInitials = provider
    ? (provider.fullName ?? provider.email ?? "?").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "";

  const descLen = form.description?.length ?? 0;

  return (
    <Sheet open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto bg-background flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {isLoading && !isCreate ? (
                <Skeleton className="h-6 w-48" />
              ) : (
                <SheetTitle className="text-base font-semibold leading-tight truncate">
                  {isCreate ? "New Product" : (rec?.productName ?? "Product")}
                </SheetTitle>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {(isCreate ? form.productType : rec?.productType) && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[isCreate ? form.productType : rec?.productType] ?? "bg-gray-100 text-gray-600"}`}>
                    {isCreate ? form.productType : rec?.productType}
                  </span>
                )}
                {!isCreate && rec?.status && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[rec.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {rec.status}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 mt-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* PROVIDER */}
          {(provider || lockedProviderId) && (
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider mb-3">Provider</p>
              {provider ? (
                <div
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity group"
                  onClick={() => setLocation(`${BASE}/admin/users/${provider.id}`)}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-[--e-orange]/10 text-[--e-orange] text-xs font-bold">{providerInitials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-[--e-orange] transition-colors truncate">
                      {provider.fullName ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{provider.email}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-1"><Skeleton className="h-3.5 w-32" /><Skeleton className="h-3 w-24" /></div>
                </div>
              )}
            </div>
          )}

          {/* DESCRIPTION */}
          <div>
            <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider mb-3">Description</p>
            {editing ? (
              <div>
                <Textarea
                  rows={4}
                  maxLength={1000}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe this product…"
                  className="text-sm resize-none"
                />
                <p className="text-xs text-muted-foreground text-right mt-1">{descLen} / 1000</p>
              </div>
            ) : (
              rec?.description
                ? <p className="text-sm" style={{ whiteSpace: "pre-wrap" }}>{rec.description}</p>
                : <p className="text-sm text-neutral-400">No description</p>
            )}
          </div>

          {/* PRICING */}
          <div>
            <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider mb-3">Pricing</p>
            {editing ? (
              <div className="space-y-3">
                {isCreate && (
                  <div>
                    <Label className="text-xs">Product Name *</Label>
                    <Input
                      value={form.productName}
                      onChange={e => setForm(f => ({ ...f, productName: e.target.value }))}
                      className="mt-1 h-8 text-sm"
                      placeholder="Product name"
                    />
                  </div>
                )}
                {isCreate && (
                  <div>
                    <Label className="text-xs">Type *</Label>
                    <Select value={form.productType} onValueChange={v => setForm(f => ({ ...f, productType: v }))}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{PRODUCT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Currency</Label>
                    <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Cost</Label>
                    <Input
                      type="number" step="0.01" min="0"
                      value={form.cost}
                      onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                      className="mt-1 h-8 text-sm font-mono"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Unit</Label>
                  <Select value={form.unit || "none"} onValueChange={v => setForm(f => ({ ...f, unit: v === "none" ? "" : v }))}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— No unit —</SelectItem>
                      {["per person","per night","per day","per session","per trip","per group","per week","per transfer","per meal","flat fee"].map(u => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-xs text-muted-foreground">Cost</span>
                  <span className="text-sm font-mono font-semibold">
                    {rec?.cost
                      ? `${rec.currency ?? "AUD"} ${Number(rec.cost).toLocaleString("en-AU", { minimumFractionDigits: 2 })}${rec?.unit ? ` / ${rec.unit}` : ""}`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-xs text-muted-foreground">Unit</span>
                  <span className="text-sm text-muted-foreground">{rec?.unit ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[rec?.status ?? "active"] ?? ""}`}>
                    {rec?.status ?? "—"}
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        {canEdit && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2 shrink-0 bg-background">
            {editing && !isCreate ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                <Button
                  size="sm"
                  className="bg-[--e-orange] hover:bg-[--e-orange-hover] text-white"
                  onClick={handleSave}
                  disabled={saveMutation.isPending || !form.productName}
                >
                  {saveMutation.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </>
            ) : isCreate ? (
              <>
                <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                <Button
                  size="sm"
                  className="bg-[--e-orange] hover:bg-[--e-orange-hover] text-white"
                  onClick={handleSave}
                  disabled={saveMutation.isPending || !form.productName}
                >
                  {saveMutation.isPending ? "Creating…" : "Create Product"}
                </Button>
              </>
            ) : (
              <Button size="sm" className="bg-[--e-orange] hover:bg-[--e-orange-hover] text-white" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
