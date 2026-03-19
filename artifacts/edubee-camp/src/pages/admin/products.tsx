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
import { ListToolbar } from "@/components/ui/list-toolbar";
import { ListPagination } from "@/components/ui/list-pagination";
import { useToast } from "@/hooks/use-toast";
import { Package, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PAGE_SIZE = 20;

interface Product {
  id: string;
  productName: string;
  productType: string;
  description?: string | null;
  cost?: string | null;
  currency?: string | null;
  status?: string | null;
  convertedCost?: Record<string, number | null>;
  createdAt?: string;
}

const PRODUCT_TYPES = ["accommodation", "program", "activity", "transport", "meal", "insurance", "visa", "other"];
const STATUSES = ["active", "inactive", "archived"];
const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  archived: "bg-red-100 text-red-700",
};

const emptyForm = { productName: "", productType: "program", description: "", cost: "", currency: "AUD", status: "active" };

export default function Products() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);

  const queryKey = ["products", { search, typeFilter, page }];
  const { data: resp, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (typeFilter !== "all") params.set("productType", typeFilter);
      return axios.get(`${BASE}/api/products?${params}`).then(r => r.data);
    },
  });

  const products: Product[] = resp?.data ?? [];
  const total: number = resp?.meta?.total ?? 0;

  const createProduct = useMutation({
    mutationFn: (data: any) => axios.post(`${BASE}/api/products`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product created" });
      setShowDialog(false);
      setForm(emptyForm);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to create product" }),
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      axios.put(`${BASE}/api/products/${id}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product updated" });
      setShowDialog(false);
      setEditing(null);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update product" }),
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/products/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product deleted" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to delete product" }),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowDialog(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ productName: p.productName, productType: p.productType, description: p.description ?? "", cost: p.cost ?? "", currency: p.currency ?? "AUD", status: p.status ?? "active" });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    const payload = { ...form, cost: form.cost || null };
    if (editing) updateProduct.mutate({ id: editing.id, data: payload });
    else createProduct.mutate(payload);
  };

  const fmtCost = (cost: string | null | undefined, ccy = "AUD") => {
    if (!cost) return "—";
    return `${ccy} ${Number(cost).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search}
        onSearch={v => { setSearch(v); setPage(1); }}
        total={total}
        addLabel="New Product"
        onAdd={openCreate}
        csvExportTable="products"
      >
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 text-xs w-40">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {PRODUCT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </ListToolbar>

      {/* Group products by type when "all" is selected */}
      {(() => {
        const COLS = 6;
        const TYPE_ICONS: Record<string, string> = {
          accommodation: "🏠", program: "📚", activity: "🏄", transport: "🚌",
          meal: "🍽️", insurance: "🛡️", visa: "🛂", other: "📦",
        };

        const renderRow = (p: Product) => (
          <tr
            key={p.id}
            className="border-b last:border-0 hover:bg-[#FEF0E3] transition-colors cursor-pointer"
            onClick={() => setLocation(`${BASE}/admin/products/${p.id}`)}
          >
            <td className="px-4 py-3">
              <div className="font-medium text-foreground">{p.productName}</div>
              {p.description && <div className="text-xs text-muted-foreground truncate max-w-[240px]">{p.description}</div>}
            </td>
            {typeFilter === "all" && (
              <td className="px-4 py-3">
                <span className="px-2 py-0.5 bg-muted rounded text-xs capitalize">{p.productType}</span>
              </td>
            )}
            <td className="px-4 py-3 text-right font-mono text-sm font-semibold">
              {fmtCost(p.cost, p.currency ?? "AUD")}
            </td>
            <td className="px-4 py-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status ?? "active"] ?? "bg-gray-100 text-gray-600"}`}>
                {p.status ?? "active"}
              </span>
            </td>
            <td className="px-4 py-3 text-muted-foreground text-xs">
              {p.createdAt ? format(new Date(p.createdAt), "MMM d, yyyy") : "—"}
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(p)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => {
                  if (confirm(`Delete "${p.productName}"?`)) deleteProduct.mutate(p.id);
                }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </td>
          </tr>
        );

        // Group by type when "all" is selected
        const grouped = typeFilter === "all"
          ? PRODUCT_TYPES
              .map(t => ({ type: t, items: products.filter(p => p.productType === t) }))
              .filter(g => g.items.length > 0)
          : null;

        return (
          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Product</th>
                  {typeFilter === "all" && (
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                  )}
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cost</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Created</th>
                  <th className="px-4 py-2.5 w-20" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b">
                      {[...Array(COLS)].map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4" /></td>
                      ))}
                    </tr>
                  ))
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={COLS} className="px-4 py-16 text-center text-muted-foreground text-sm">
                      <Package className="w-8 h-8 mx-auto mb-3 opacity-30" />
                      No products found
                    </td>
                  </tr>
                ) : grouped ? (
                  // Grouped view with type dividers
                  grouped.map(({ type, items }) => (
                    <Fragment key={type}>
                      <tr className="bg-muted/20 border-b border-border">
                        <td colSpan={COLS} className="px-4 py-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">{TYPE_ICONS[type] ?? "📦"}</span>
                            <span className="text-xs font-semibold text-foreground capitalize">{type}</span>
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                              {items.length}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {items.map(p => renderRow(p))}
                    </Fragment>
                  ))
                ) : (
                  // Filtered single-type view
                  products.map(p => renderRow(p))
                )}
              </tbody>
            </table>
          </div>
        );
      })()}

      <ListPagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

      <Dialog open={showDialog} onOpenChange={o => { if (!o) { setShowDialog(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "New Product"}</DialogTitle>
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
                    {["AUD", "USD", "KRW", "JPY", "THB", "PHP", "SGD", "GBP"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                onClick={handleSubmit}
                disabled={createProduct.isPending || updateProduct.isPending || !form.productName}>
                {createProduct.isPending || updateProduct.isPending ? "Saving…" : editing ? "Update" : "Create"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
