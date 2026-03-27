import { useState, useRef, useEffect, Fragment } from "react";
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
import { Package, RefreshCw, Plus, Search, X, Building2 } from "lucide-react";
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
  country?: string | null;
  city?: string | null;
  location?: string | null;
  convertedCost?: Record<string, number | null>;
  createdAt?: string;
  updatedAt?: string;
}

interface AccountOption { id: string; name: string }

const PRODUCT_TYPES = ["institute", "hotel", "pickup", "tour", "settlement", "program"];
const DISPLAY_CURRENCIES = ["AUD", "KRW", "JPY", "THB", "USD", "SGD", "GBP", "EUR", "PHP"];
const CCY_FLAGS: Record<string, string> = {
  AUD: "🇦🇺", KRW: "🇰🇷", JPY: "🇯🇵", THB: "🇹🇭",
  USD: "🇺🇸", SGD: "🇸🇬", GBP: "🇬🇧", EUR: "🇪🇺", PHP: "🇵🇭",
};
const STATUSES = ["active", "inactive", "archived"];

const emptyForm = {
  productName: "", productType: "institute", description: "",
  cost: "", currency: "AUD", status: "active",
  price: "", productGrade: "", productPriority: "",
  country: "", city: "", location: "",
  providerId: "", providerName: "",
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

// ── ProviderCombobox ─────────────────────────────────────────────────────────
function ProviderCombobox({
  accounts,
  value, label,
  onChange,
  onCreateNew,
}: {
  accounts: AccountOption[];
  value: string; label: string;
  onChange: (id: string, name: string) => void;
  onCreateNew: (name: string) => void;
}) {
  const [query, setQuery] = useState(label);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(label); }, [label]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query.trim()
    ? accounts.filter(a => a.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : accounts.slice(0, 8);

  const showCreate = query.trim() && !accounts.some(a => a.name.toLowerCase() === query.toLowerCase());

  return (
    <div ref={ref} className="relative">
      <div className="relative mt-1">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange("", ""); }}
          onFocus={() => setOpen(true)}
          className="h-8 text-sm pl-7 pr-7"
          placeholder="Search or type new provider…"
        />
        {value && (
          <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => { onChange("", ""); setQuery(""); }}>
            <X size={12} />
          </button>
        )}
      </div>
      {open && (filtered.length > 0 || showCreate) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-[#E8E6E2] rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(a => (
            <button key={a.id}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[#FEF0E3] transition-colors flex items-center gap-2"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange(a.id, a.name); setQuery(a.name); setOpen(false); }}>
              <Building2 size={12} className="text-[#F5821F] shrink-0" />
              {a.name}
            </button>
          ))}
          {showCreate && (
            <button
              className="w-full text-left px-3 py-2 text-sm text-[#F5821F] hover:bg-[#FEF0E3] transition-colors flex items-center gap-2 border-t border-[#F4F3F1]"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onCreateNew(query.trim()); setOpen(false); }}>
              <Plus size={12} className="shrink-0" />
              Create "{query.trim()}" as new Provider
            </button>
          )}
        </div>
      )}
    </div>
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
  const { data: accountsLookup = [], refetch: refetchAccounts } = useQuery<AccountOption[]>({
    queryKey: ["lookup-accounts"],
    queryFn: () => axios.get(`${BASE}/api/products-lookup/accounts`).then(r => r.data),
    staleTime: 120_000,
  });

  const countryOpts = Array.from(
    new Map(accountsLookup.filter((a: any) => a.country).map((a: any) => [a.country!, a.country!]))
  ).sort().map(([v]) => ({ value: v, label: v }));

  const locationOpts: { value: string; label: string }[] = Array.from(
    new Set(
      accountsLookup
        .flatMap((a: any) => ((a.location ?? "") as string).split(",").map((s: string) => s.trim()).filter(Boolean))
    )
  ).sort().map((v: any) => ({ value: v, label: v }));

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

  const createAccount = useMutation({
    mutationFn: (name: string) =>
      axios.post(`${BASE}/api/crm/accounts`, { name, accountType: "Provider" }).then(r => r.data),
    onSuccess: (acct) => {
      refetchAccounts();
      setForm(f => ({ ...f, providerId: acct.id, providerName: acct.name }));
      toast({ title: `Provider "${acct.name}" created` });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to create provider" }),
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

  function handleCreate() {
    createProduct.mutate({
      productName:     form.productName,
      productType:     form.productType,
      description:     form.description || null,
      cost:            form.cost || null,
      currency:        form.currency,
      status:          form.status,
      price:           form.price || null,
      productGrade:    form.productGrade || null,
      productPriority: form.productPriority ? parseInt(form.productPriority) : null,
      country:         form.country || null,
      city:            form.city || null,
      location:        form.location || null,
      providerId:      form.providerId || null,
    });
  }

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
              <SortableTh col="price" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Price</SortableTh>
              <SortableTh col="productGrade" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Grade</SortableTh>
              <SortableTh col="productPriority" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Priority</SortableTh>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Location</th>
              <SortableTh col="createdAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Created</SortableTh>
              <SortableTh col="updatedAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Modified</SortableTh>
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
                  <td className="px-4 py-3 text-sm text-[#57534E] max-w-[160px]">
                    {p.location
                      ? <span className="truncate block">{p.location}</span>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#57534E] whitespace-nowrap">
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#57534E] whitespace-nowrap">
                    {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }) : <span className="text-muted-foreground">—</span>}
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

      {/* ── Create Dialog ── */}
      <Dialog open={showCreateDialog} onOpenChange={o => { if (!o) { setShowCreateDialog(false); setForm(emptyForm); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">

            {/* Product Name */}
            <div>
              <Label className="text-xs">Product Name *</Label>
              <Input value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} className="mt-1 h-8 text-sm" />
            </div>

            {/* Type + Status */}
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

            {/* Provider */}
            <div>
              <Label className="text-xs">Provider (Account)</Label>
              <ProviderCombobox
                accounts={accountsLookup}
                value={form.providerId}
                label={form.providerName}
                onChange={(id, name) => setForm(f => ({ ...f, providerId: id, providerName: name }))}
                onCreateNew={name => createAccount.mutate(name)}
              />
              {form.providerName && (
                <p className="text-xs text-[#57534E] mt-1 flex items-center gap-1">
                  <Building2 size={11} className="text-[#F5821F]" /> {form.providerName}
                </p>
              )}
            </div>

            {/* Cost + Currency + Price */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Cost</Label>
                <Input type="number" step="0.01" value={form.cost}
                  onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                  className="mt-1 h-8 text-sm font-mono" placeholder="0.00" />
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
              <div>
                <Label className="text-xs">Price</Label>
                <Input type="number" step="0.01" value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  className="mt-1 h-8 text-sm font-mono" placeholder="0.00" />
              </div>
            </div>

            {/* Grade + Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Grade</Label>
                <Input value={form.productGrade}
                  onChange={e => setForm(f => ({ ...f, productGrade: e.target.value }))}
                  className="mt-1 h-8 text-sm" placeholder="e.g. A, B, Premium" />
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Input type="number" min="1" max="999" value={form.productPriority}
                  onChange={e => setForm(f => ({ ...f, productPriority: e.target.value }))}
                  className="mt-1 h-8 text-sm font-mono" placeholder="1" />
              </div>
            </div>

            {/* Country + City */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Country</Label>
                <Input value={form.country}
                  onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                  className="mt-1 h-8 text-sm" placeholder="e.g. Australia" />
              </div>
              <div>
                <Label className="text-xs">City</Label>
                <Input value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  className="mt-1 h-8 text-sm" placeholder="e.g. Sydney" />
              </div>
            </div>

            {/* Location (multi, comma-separated) */}
            <div>
              <Label className="text-xs">Location <span className="text-muted-foreground font-normal">(comma-separated)</span></Label>
              <Input value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="mt-1 h-8 text-sm" placeholder="e.g. City Centre, Airport, Suburb" />
              {form.location && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {form.location.split(",").map(s => s.trim()).filter(Boolean).map((loc, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-[#F4F3F1] text-[#57534E]">{loc}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="mt-1 text-sm resize-none h-16" />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="flex-1 bg-[#F5821F] hover:bg-[#d97706] text-white"
                onClick={handleCreate}
                disabled={createProduct.isPending || !form.productName}>
                {createProduct.isPending ? "Creating…" : "Create Product"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
