import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, ChevronLeft, Save, X, Search, Pencil } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CURRENCIES    = ["AUD","NZD","USD","GBP","EUR","CAD","KRW","JPY","THB","PHP","SGD"];
const INSTALLMENTS  = ["None","Weekly","Quarterly","Half Yearly","Annually"];
const PAYMENT_TERMS = ["Once","Multiple Times","Monthly"];
const STATUSES      = ["active","inactive","archived"];

interface LookupItem { id: string; name: string }

// ── Inline SearchSelect ────────────────────────────────────────────────────
function SearchSelect({
  label, value, onChange, options, placeholder, disabled = false,
}: {
  label?: string; value: string; onChange: (v: string) => void;
  options: LookupItem[]; placeholder: string; disabled?: boolean;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.id === value);
  const filtered = q
    ? options.filter(o => o.name.toLowerCase().includes(q.toLowerCase())).slice(0, 30)
    : options.slice(0, 30);

  useEffect(() => { if (!open) setQ(""); }, [open]);

  return (
    <div className="space-y-1">
      {label && <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">{label}</Label>}
      {selected ? (
        <div className={`flex items-center justify-between border border-[#E8E6E2] rounded-lg px-3 py-2 h-9 bg-white ${disabled ? "opacity-60" : ""}`}>
          <span className="text-sm text-[#1C1917] truncate">{selected.name}</span>
          {!disabled && (
            <button type="button" onClick={() => onChange("")} className="ml-2 text-[#A8A29E] hover:text-[#DC2626] shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A8A29E] pointer-events-none" />
          <input
            disabled={disabled}
            placeholder={placeholder}
            value={q}
            onChange={e => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            className="w-full pl-8 pr-3 h-9 text-sm border border-[#E8E6E2] rounded-lg focus:outline-none focus:border-[#F5821F] disabled:opacity-60 disabled:cursor-not-allowed"
          />
          {open && filtered.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-[#E8E6E2] rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filtered.map(o => (
                <button key={o.id} type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[#FEF0E3] text-[#1C1917]"
                  onMouseDown={() => { onChange(o.id); setOpen(false); setQ(""); }}>
                  {o.name}
                </button>
              ))}
            </div>
          )}
          {open && q && filtered.length === 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-[#E8E6E2] rounded-lg shadow-lg px-3 py-2 text-sm text-[#A8A29E]">No results</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Radio Yes/No ────────────────────────────────────────────────────────────
function RadioYesNo({ label, value, onChange, disabled }: {
  label: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">{label}</Label>
      <div className="flex gap-4">
        {[{ v: true, l: "Yes" }, { v: false, l: "No" }].map(({ v, l }) => (
          <label key={String(v)} className={`flex items-center gap-1.5 cursor-pointer ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
            <input type="radio" disabled={disabled} checked={value === v}
              onChange={() => onChange(v)}
              className="accent-[#F5821F]" />
            <span className="text-sm text-[#1C1917]">{l}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E8E6E2] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#F4F3F1] bg-[#FAFAF9]">
        <h3 className="text-xs font-semibold text-[#57534E] uppercase tracking-widest">{title}</h3>
      </div>
      <div className="px-5 py-4 grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}
function FullRow({ children }: { children: React.ReactNode }) {
  return <div className="md:col-span-2">{children}</div>;
}

function TextField({ label, value, onChange, disabled, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void;
  disabled?: boolean; placeholder?: string; type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">{label}</Label>
      <Input type={type} disabled={disabled} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} className="h-9 border-[#E8E6E2] focus:border-[#F5821F] disabled:opacity-60 text-sm" />
    </div>
  );
}

function SelectField({ label, value, onChange, options, disabled }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">{label}</Label>
      <Select disabled={disabled} value={value || "__none__"} onValueChange={v => onChange(v === "__none__" ? "" : v)}>
        <SelectTrigger className="h-9 border-[#E8E6E2] focus:border-[#F5821F] text-sm">
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">— None —</SelectItem>
          {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const canEdit = ["super_admin", "admin"].includes(user?.role ?? "");

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const sf = (k: string) => (v: any) => setForm(f => ({ ...f, [k]: v }));

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: rec, isLoading } = useQuery({
    queryKey: ["product-detail", id],
    queryFn: () => axios.get(`${BASE}/api/products/${id}`).then(r => r.data),
  });

  const { data: linkedGroupsData = [] } = useQuery({
    queryKey: ["product-linked-groups", id],
    queryFn: () => axios.get(`${BASE}/api/products/${id}/linked-groups`).then(r => r.data),
    enabled: !!id,
  });

  const { data: productTypeOpts = [] } = useQuery<LookupItem[]>({
    queryKey: ["lookup-product-types"],
    queryFn: () => axios.get(`${BASE}/api/products-lookup/product-types`).then(r => r.data),
    staleTime: 60000,
  });
  const { data: accountOpts = [] } = useQuery<LookupItem[]>({
    queryKey: ["lookup-accounts"],
    queryFn: () => axios.get(`${BASE}/api/products-lookup/accounts`).then(r => r.data),
    staleTime: 60000,
  });
  const { data: commissionOpts = [] } = useQuery<LookupItem[]>({
    queryKey: ["lookup-commissions"],
    queryFn: () => axios.get(`${BASE}/api/products-lookup/commissions`).then(r => r.data),
    staleTime: 60000,
  });
  const { data: promotionOpts = [] } = useQuery<LookupItem[]>({
    queryKey: ["lookup-promotions"],
    queryFn: () => axios.get(`${BASE}/api/products-lookup/promotions`).then(r => r.data),
    staleTime: 60000,
  });
  const { data: taxRateOpts = [] } = useQuery<LookupItem[]>({
    queryKey: ["lookup-tax-rates"],
    queryFn: () => axios.get(`${BASE}/api/products-lookup/tax-rates`).then(r => r.data),
    staleTime: 60000,
  });

  // ── Init form when data loads ─────────────────────────────────────────────
  useEffect(() => {
    if (rec) setForm(rec);
  }, [rec]);

  // ── Auto-fill name from product type ─────────────────────────────────────
  useEffect(() => {
    if (!form.manualInput && form.productTypeId) {
      const pt = productTypeOpts.find(o => o.id === form.productTypeId);
      if (pt) setForm(f => ({ ...f, productName: pt.name }));
    }
  }, [form.productTypeId, form.manualInput]);

  // ── Save mutation ──────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => {
      const { id: _id, createdAt: _ca, updatedAt: _ua, convertedCost: _cc, ...body } = form;
      return axios.put(`${BASE}/api/products/${id}`, body).then(r => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-detail", id] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setIsEditing(false);
      toast({ title: "Product saved" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to save product" }),
  });

  const startEdit = () => { setForm(rec ?? {}); setIsEditing(true); };
  const cancelEdit = () => { setForm(rec ?? {}); setIsEditing(false); };

  const disabled = !isEditing;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-4xl mx-auto">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }
  if (!rec) return <div className="p-6 text-[#57534E]">Product not found.</div>;

  const g = (k: string, fallback: any = "") => (isEditing ? (form[k] ?? fallback) : (rec[k] ?? fallback));
  const gb = (k: string, fallback = false): boolean => Boolean(isEditing ? (form[k] ?? fallback) : (rec[k] ?? fallback));

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-10">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-[#57534E]">
          <button onClick={() => navigate(`${BASE}/admin/products`)}
            className="flex items-center gap-1 hover:text-[#F5821F] transition-colors">
            <ChevronLeft className="w-4 h-4" /> Products
          </button>
          <span>/</span>
          <span className="text-[#1C1917] font-medium truncate max-w-[240px]">{rec.productName}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={cancelEdit} className="gap-1.5 border-[#E8E6E2]">
                <X className="w-3.5 h-3.5" /> Cancel
              </Button>
              <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
                className="bg-[#F5821F] hover:bg-[#D96A0A] text-white gap-1.5">
                <Save className="w-3.5 h-3.5" />
                {saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </>
          ) : canEdit ? (
            <Button size="sm" onClick={startEdit} className="bg-[#F5821F] hover:bg-[#D96A0A] text-white gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
          ) : null}
        </div>
      </div>

      {/* ── General ── */}
      <Section title="General">
        <FullRow>
          <TextField label="Product Name *" value={g("productName")} onChange={sf("productName")}
            disabled={disabled} placeholder="Enter product name" />
        </FullRow>
      </Section>

      {/* ── Summary ── */}
      <Section title="Summary">
        <TextField label="From Date" type="date" value={g("fromDate")} onChange={sf("fromDate")} disabled={disabled} />
        <TextField label="To Date"   type="date" value={g("toDate")}   onChange={sf("toDate")}   disabled={disabled} />
        <TextField label="Duration (weeks)" type="number" value={String(g("durationWeeks") ?? "")} onChange={v => sf("durationWeeks")(v ? Number(v) : null)} disabled={disabled} placeholder="0" />
      </Section>

      {/* ── Categories ── */}
      <Section title="Categories">
        <SearchSelect label="Product Type" value={g("productTypeId")} onChange={sf("productTypeId")}
          options={productTypeOpts} placeholder="Search product types…" disabled={disabled} />
        <SearchSelect label="Product Provider (Account)" value={g("category2Id")} onChange={sf("category2Id")}
          options={accountOpts} placeholder="Search accounts…" disabled={disabled} />
      </Section>

      {/* ── Main ── */}
      <Section title="Main">
        <FullRow>
          <TextField label="Item Description" value={g("itemDescription")} onChange={sf("itemDescription")} disabled={disabled} placeholder="Item description…" />
        </FullRow>
        <TextField label="Price" type="number" value={String(g("price") ?? "")} onChange={sf("price")} disabled={disabled} placeholder="0.00" />
        <SelectField label="Currency" value={g("currency") || "AUD"} onChange={sf("currency")} disabled={disabled}
          options={CURRENCIES.map(c => ({ value: c, label: c }))} />
        <FullRow>
          <RadioYesNo label="GST Included" value={gb("isGstIncluded")} onChange={sf("isGstIncluded")} disabled={disabled} />
        </FullRow>
        <SelectField label="Installment Plan" value={g("installmentPlan")} onChange={sf("installmentPlan")} disabled={disabled}
          options={INSTALLMENTS.map(v => ({ value: v, label: v }))} />
        <SelectField label="Default Payment Term" value={g("defaultPaymentTerm")} onChange={sf("defaultPaymentTerm")} disabled={disabled}
          options={PAYMENT_TERMS.map(v => ({ value: v, label: v }))} />
        <TextField label="Number of Payments" type="number" value={String(g("numberOfPayments") ?? "")} onChange={v => sf("numberOfPayments")(v ? Number(v) : null)} disabled={disabled} placeholder="0" />
        <TextField label="Minimum Payment" type="number" value={String(g("minimumPayment") ?? "")} onChange={sf("minimumPayment")} disabled={disabled} placeholder="0.00" />
        <SelectField label="Product Priority" value={String(g("productPriority") ?? "")} onChange={v => sf("productPriority")(v ? Number(v) : null)} disabled={disabled}
          options={[10,9,8,7,6,5].map(n => ({ value: String(n), label: String(n) }))} />
        <SelectField label="Product Grade" value={g("productGrade")} onChange={sf("productGrade")} disabled={disabled}
          options={["A","B","C","D"].map(v => ({ value: v, label: v }))} />
        <FullRow>
          <RadioYesNo label="Recommend" value={gb("isRecommend")} onChange={sf("isRecommend")} disabled={disabled} />
        </FullRow>
      </Section>

      {/* ── Promotion ── */}
      <Section title="Promotion">
        <SearchSelect label="Product Source (Provider)" value={g("providerId")} onChange={sf("providerId")}
          options={accountOpts} placeholder="Search accounts…" disabled={disabled} />
        <SearchSelect label="Commission" value={g("commissionId")} onChange={sf("commissionId")}
          options={commissionOpts} placeholder="Search commissions…" disabled={disabled} />
        <FullRow>
          <SearchSelect label="Promotion" value={g("promotionId")} onChange={sf("promotionId")}
            options={promotionOpts} placeholder="Search promotions…" disabled={disabled} />
        </FullRow>
      </Section>

      {/* ── Setup ── */}
      <Section title="Setup">
        <RadioYesNo label="Display on Quote" value={gb("displayOnQuote", true)} onChange={sf("displayOnQuote")} disabled={disabled} />
        <RadioYesNo label="Display on Invoice" value={gb("displayOnInvoice", true)} onChange={sf("displayOnInvoice")} disabled={disabled} />
        <FullRow>
          <SearchSelect label="Tax Rate" value={g("taxRateId")} onChange={sf("taxRateId")}
            options={taxRateOpts} placeholder="Search tax rates…" disabled={disabled} />
        </FullRow>
      </Section>

      {/* ── Description & Notes ── */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#F4F3F1] bg-[#FAFAF9]">
          <h3 className="text-xs font-semibold text-[#57534E] uppercase tracking-widest">Description &amp; Notes</h3>
        </div>
        <div className="px-5 py-4 space-y-1">
          <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Description</Label>
          <Textarea disabled={disabled} rows={4} value={g("description")} onChange={e => sf("description")(e.target.value)}
            placeholder="Enter product description…"
            className="border-[#E8E6E2] focus:border-[#F5821F] resize-none text-sm disabled:opacity-60" />
        </div>
      </div>

      {/* ── Linked Package Groups ── */}
      {linkedGroupsData.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E8E6E2] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#F4F3F1] bg-[#FAFAF9]">
            <h3 className="text-xs font-semibold text-[#57534E] uppercase tracking-widest">Linked Package Groups</h3>
          </div>
          <div className="px-5 py-4 flex flex-wrap gap-2">
            {linkedGroupsData.map((g: any) => (
              <button key={g.linkId} onClick={() => navigate(`${BASE}/admin/package-groups/${g.packageGroupId}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#FEF0E3] text-[#F5821F] border border-[#F5821F33] hover:bg-[#f5821f1a] transition-colors">
                {g.nameEn} <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Admin ── */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#F4F3F1] bg-[#FAFAF9]">
          <h3 className="text-xs font-semibold text-[#57534E] uppercase tracking-widest">Admin</h3>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Created On</Label>
            <p className="text-sm text-[#1C1917]">{rec.createdAt ? format(new Date(rec.createdAt), "PPP p") : "—"}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Modified On</Label>
            <p className="text-sm text-[#1C1917]">{rec.modifiedOn ? format(new Date(rec.modifiedOn), "PPP p") : rec.updatedAt ? format(new Date(rec.updatedAt), "PPP p") : "—"}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Status</Label>
            {isEditing ? (
              <Select value={form.status || "active"} onValueChange={sf("status")}>
                <SelectTrigger className="h-9 w-40 border-[#E8E6E2] text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                rec.status === "active" ? "bg-[#DCFCE7] text-[#16A34A]" :
                rec.status === "archived" ? "bg-[#FEE2E2] text-[#DC2626]" :
                "bg-[#F4F3F1] text-[#57534E]"
              }`}>{rec.status ?? "active"}</span>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Product ID</Label>
            <p className="text-xs font-mono text-[#A8A29E]">{rec.id}</p>
          </div>
        </div>
      </div>

      {/* ── Bottom Buttons ── */}
      {isEditing && (
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
            className="bg-[#F5821F] hover:bg-[#D96A0A] text-white gap-1.5">
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Saving…" : "Submit"}
          </Button>
          <Button variant="outline" onClick={cancelEdit} className="border-[#E8E6E2] gap-1.5">
            <X className="w-4 h-4" /> Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
