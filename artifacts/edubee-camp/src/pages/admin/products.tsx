import { useState, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ListPagination } from "@/components/ui/list-pagination";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Package, Pencil, Trash2, RefreshCw, Plus } from "lucide-react";
import ProductDrawer from "@/components/shared/ProductDrawer";
import ProductAdvancedSearch, { type ProductSearchFilters } from "@/components/shared/ProductAdvancedSearch";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PAGE_SIZE = 20;

interface Product {
  id: string;
  productName: string;
  productType: string;
  description?: string | null;
  cost?: string | null;
  currency?: string | null;
  price?: string | null;
  productGrade?: string | null;
  productPriority?: number | null;
  status?: string | null;
  providerId?: string | null;
  providerName?: string | null;
  convertedCost?: Record<string, number | null>;
  createdAt?: string;
}

const PRODUCT_TYPES = ["institute", "hotel", "pickup", "tour", "settlement", "program"];
const DISPLAY_CURRENCIES = ["AUD", "KRW", "JPY", "THB", "USD", "SGD", "GBP", "EUR", "PHP"];
const CCY_FLAGS: Record<string, string> = {
  AUD: "🇦🇺", KRW: "🇰🇷", JPY: "🇯🇵", THB: "🇹🇭",
  USD: "🇺🇸", SGD: "🇸🇬", GBP: "🇬🇧", EUR: "🇪🇺", PHP: "🇵🇭",
};
const STATUSES = ["active", "inactive", "archived"];
const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  archived: "bg-red-100 text-red-700",
};

const emptyForm = {
  productName: "", productType: "institute", description: "",
  cost: "", currency: "AUD", status: "active",
};

const emptyFilters: ProductSearchFilters = {
  searchCategory: "", searchText: "", productGroup: "",
  productType: "", productPriority: "", productGrade: "", status: "",
  country: "", location: "",
};

// ── LinkedGroupsCell ─────────────────────────────────────────────────────────
function LinkedGroupsCell({ productId }: { productId: string }) {
  const { data = [], isLoading } = useQuery<{ nameEn: string }[]>({
    queryKey: ["product-linked-groups", productId],
    queryFn: () => axios.get(`${BASE}/api/products/${productId}/linked-groups`).then(r => r.data),
    staleTime: 30_000,
  });

  if (isLoading) return <span className="text-muted-foreground text-xs">…</span>;
  if (!data.length) return <span className="text-muted-foreground">—</span>;

  const label = `${data.length} group${data.length !== 1 ? "s" : ""}`;
  const names = data.map(g => `• ${g.nameEn}`).join("\n");

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#FEF0E3] text-[#F5821F] border border-[#F5821F33] cursor-default">
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="whitespace-pre-line max-w-[200px]">
          {names}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Products() {
  const [, setLocation] = useLocation();
  const { sortBy, sortDir, onSort } = useSortState();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const canEdit = ["super_admin", "admin"].includes(user?.role ?? "");

  const [filters, setFilters] = useState<ProductSearchFilters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [displayCurrency, setDisplayCurrency] = useState("AUD");

  // ProductDrawer
  const [drawerProductId, setDrawerProductId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const openDrawer  = (id: string) => { setDrawerProductId(id); setDrawerOpen(true); };
  const closeDrawer = () => { setDrawerOpen(false); setDrawerProductId(null); };

  // ── Lookup queries for dropdowns ─────────────────────────────────────────
  const { data: productGroupOpts = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["lookup-product-groups"],
    queryFn: () => axios.get(`${BASE}/api/product-groups`).then(r =>
      (r.data as { id: string; name: string }[]).map(g => ({ id: g.id, name: g.name }))
    ),
    staleTime: 60_000,
  });
  const { data: productTypeOpts = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["lookup-product-types"],
    queryFn: () => axios.get(`${BASE}/api/products-lookup/product-types`).then(r => r.data),
    staleTime: 60_000,
  });
  const { data: accountsLookup = [] } = useQuery<{ id: string; name: string; country?: string | null; city?: string | null; location?: string | null }[]>({
    queryKey: ["lookup-accounts"],
    queryFn: () => axios.get(`${BASE}/api/products-lookup/accounts`).then(r => r.data),
    staleTime: 120_000,
  });

  const countryOpts = Array.from(
    new Map(accountsLookup.filter(a => a.country).map(a => [a.country!, a.country!]))
  ).sort().map(([v]) => ({ value: v, label: v }));

  const locationOpts: { value: string; label: string }[] = Array.from(
    new Set(
      accountsLookup
        .flatMap(a => (a.location ?? "").split(",").map(s => s.trim()).filter(Boolean))
    )
  ).sort().map(v => ({ value: v, label: v }));

  // ── Products query ────────────────────────────────────────────────────────
  const queryKey = ["products", { filters, page }];
  const { data: resp, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (filters.searchText)     params.set("search",          filters.searchText);
      if (filters.searchCategory) params.set("searchCategory",  filters.searchCategory);
      if (filters.productGroup)   params.set("productGroup",    filters.productGroup);
      if (filters.productType)    params.set("productTypeId",   filters.productType);
      if (filters.productPriority) params.set("productPriority", filters.productPriority);
      if (filters.productGrade)   params.set("productGrade",    filters.productGrade);
      if (filters.status)         params.set("status",          filters.status);
      if (filters.country)        params.set("country",         filters.country);
      if (filters.location)       params.set("location",        filters.location);
      return axios.get(`${BASE}/api/products?${params}`).then(r => r.data);
    },
  });

  const products: Product[] = resp?.data ?? [];
  const sorted = useSorted(products, sortBy, sortDir);
  const total: number       = resp?.meta?.total ?? 0;

  const handleSearch = (f: ProductSearchFilters) => {
    setFilters(f);
    setPage(1);
  };

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createProduct = useMutation({
    mutationFn: (data: any) => axios.post(`${BASE}/api/products`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product created" });
      setShowCreateDialog(false);
      setForm(emptyForm);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to create product" }),
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/products/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product archived" });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error ?? "Failed to archive product";
      toast({ variant: "destructive", title: msg });
    },
  });

  const handleDelete = (p: Product) => {
    if (confirm(`Archive "${p.productName}"?`)) deleteProduct.mutate(p.id);
  };

  const fmtPrice = (p: Product) => {
    if (!p.price) return "—";
    return `${p.currency ?? "AUD"} ${Number(p.price).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const COLS = 8;

  return (
    <div className="space-y-4">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-[#1C1917]">Products</h1>
          <p className="text-sm text-muted-foreground">{total} product{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Currency selector */}
          <div className="flex items-center gap-1 border rounded-lg h-8 px-2 bg-muted/30">
            <RefreshCw className="w-3 h-3 text-muted-foreground shrink-0" />
            <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
              <SelectTrigger className="h-7 text-xs w-24 border-0 bg-transparent p-0 shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISPLAY_CURRENCIES.map(c => (
                  <SelectItem key={c} value={c}>{CCY_FLAGS[c]} {c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* New Product */}
          {canEdit && (
            <Button size="sm" className="bg-[#F5821F] hover:bg-[#D96A0A] text-white gap-1.5 h-8"
              onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-3.5 h-3.5" /> New Product
            </Button>
          )}
        </div>
      </div>

      {/* ── Advanced Search ── */}
      <ProductAdvancedSearch
        onSearch={handleSearch}
        options={{
          productGroups: productGroupOpts.map(g => ({ value: g.id, label: g.name })),
          productTypes:  productTypeOpts.map(t => ({ value: t.id, label: t.name })),
          countries: countryOpts,
          locations: locationOpts,
        }}
      />

      {/* ── Table ── */}
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <SortableTh col="providerName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Provider</SortableTh>
              <SortableTh col="productName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Product Name</SortableTh>
              <SortableTh col="productType" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</SortableTh>
              <SortableTh col="currency" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Currency</SortableTh>
              <SortableTh col="price" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Price</SortableTh>
              <SortableTh col="productGrade" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Grade</SortableTh>
              <SortableTh col="productPriority" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Priority</SortableTh>
              <th className="px-4 py-2.5 w-20" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b">
                  {[...Array(COLS)].map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4" /></td>)}
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={COLS} className="px-4 py-16 text-center text-muted-foreground text-sm">
                  <Package className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  No products found
                </td>
              </tr>
            ) : (
              sorted.map(p => (
                <tr key={p.id}
                  className="border-b last:border-0 hover:bg-[#FEF0E3] transition-colors cursor-pointer"
                  onClick={() => setLocation(`${BASE}/admin/products/${p.id}`)}>
                  <td className="px-4 py-3 text-sm text-[#57534E]">
                    {p.providerName ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{p.productName}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#57534E] capitalize">
                    {p.productType ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-[#57534E]">
                    {p.currency ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono font-semibold text-[#1C1917]">
                    {fmtPrice(p)}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#57534E]">
                    {p.productGrade ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-[#57534E]">
                    {p.productPriority != null ? (
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#F4F3F1] text-xs font-semibold text-[#1C1917]">
                        {p.productPriority}
                      </span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openDrawer(p.id)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      {canEdit && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => handleDelete(p)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ListPagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

      {/* ProductDrawer */}
      <ProductDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        productId={drawerProductId}
        canEdit={canEdit}
        onSaved={() => qc.invalidateQueries({ queryKey: ["products"] })}
      />

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={o => { if (!o) { setShowCreateDialog(false); setForm(emptyForm); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <div>
              <Label className="text-xs">Product Name *</Label>
              <Input value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} className="mt-1 h-8 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type *</Label>
                <Select value={form.productType} onValueChange={v => setForm(f => ({ ...f, productType: v }))}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRODUCT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Cost</Label>
                <Input type="number" step="0.01" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} className="mt-1 h-8 text-sm font-mono" placeholder="0.00" />
              </div>
              <div>
                <Label className="text-xs">Currency</Label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["AUD","USD","KRW","JPY","THB","PHP","SGD","GBP"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1 text-sm resize-none h-16" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="flex-1 bg-[#F5821F] hover:bg-[#d97706] text-white"
                onClick={() => createProduct.mutate({ ...form, cost: form.cost || null })}
                disabled={createProduct.isPending || !form.productName}>
                {createProduct.isPending ? "Creating…" : "Create"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
