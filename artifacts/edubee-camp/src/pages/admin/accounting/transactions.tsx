import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { ListPagination } from "@/components/ui/list-pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Plus, Loader2, Search, X } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PAGE_SIZE = 20;

const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "A$", USD: "$", SGD: "S$", PHP: "₱",
  THB: "฿", KRW: "₩", JPY: "¥", GBP: "£",
};

interface Transaction {
  id: string; contractId?: string | null; invoiceId?: string | null;
  transactionType?: string | null; amount?: string | null; creditAmount?: string | null;
  currency?: string | null; description?: string | null; transactionDate?: string | null;
  bankReference?: string | null; accountId?: string | null; contactId?: string | null;
  paymentInfoId?: string | null; costCenterCode?: string | null; status?: string | null;
  createdAt?: string | null;
}

interface LookupItem { id: string; name: string }

interface FormState {
  accountId: string; contactId: string; invoiceId: string;
  paymentInfoId: string; costCenterCode: string;
  transactionType: string; creditAmount: string; description: string;
}
const EMPTY: FormState = {
  accountId: "", contactId: "", invoiceId: "", paymentInfoId: "",
  costCenterCode: "", transactionType: "credit", creditAmount: "", description: "",
};

function fmtAmount(amount?: string | number | null, currency?: string | null) {
  if (!amount) return "—";
  const sym = CURRENCY_SYMBOLS[currency ?? "AUD"] ?? (currency ?? "AUD");
  return `${sym}${Number(amount).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;
}

function SearchSelect({
  label, value, onChange, options, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: LookupItem[]; placeholder: string;
}) {
  const [q, setQ] = useState("");
  const selected = options.find(o => o.id === value);
  const filtered = q
    ? options.filter(o => o.name.toLowerCase().includes(q.toLowerCase())).slice(0, 20)
    : options.slice(0, 20);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">{label}</Label>
      {selected ? (
        <div className="flex items-center justify-between border border-[#E8E6E2] rounded-lg px-3 py-2.5 h-11 bg-white">
          <span className="text-sm text-[#1C1917] truncate">{selected.name}</span>
          <button onClick={() => onChange("")} className="ml-2 text-[#A8A29E] hover:text-[#DC2626] shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E] pointer-events-none" />
          <Input
            placeholder={placeholder}
            value={q}
            onChange={e => setQ(e.target.value)}
            className="pl-9 h-11 border-[#E8E6E2]"
          />
          {q && filtered.length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-[#E8E6E2] rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filtered.map(o => (
                <button
                  key={o.id}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[#FEF0E3] text-[#1C1917]"
                  onClick={() => { onChange(o.id); setQ(""); }}
                >
                  {o.name}
                </button>
              ))}
            </div>
          )}
          {q && filtered.length === 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-[#E8E6E2] rounded-lg shadow-lg px-4 py-3 text-sm text-[#A8A29E]">
              No results
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Transactions() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch]       = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [page, setPage]           = useState(1);
  const [selected, setSelected]   = useState<Transaction | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm]           = useState<FormState>(EMPTY);

  const sf = (k: keyof FormState) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const { data: resp, isLoading } = useQuery({
    queryKey: ["transactions", { search, status: activeStatus, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (activeStatus !== "all") params.set("transactionType", activeStatus);
      return axios.get(`${BASE}/api/transactions?${params}`).then(r => r.data);
    },
  });
  const rows: Transaction[] = resp?.data ?? [];
  const total: number = resp?.meta?.total ?? 0;

  const { data: accounts   = [] } = useQuery<LookupItem[]>({ queryKey: ["tx-lookup-accounts"],    queryFn: () => axios.get(`${BASE}/api/transactions-lookup/accounts`).then(r => r.data),    staleTime: 60000 });
  const { data: contacts   = [] } = useQuery<LookupItem[]>({ queryKey: ["tx-lookup-contacts"],    queryFn: () => axios.get(`${BASE}/api/transactions-lookup/contacts`).then(r => r.data),    staleTime: 60000 });
  const { data: invoices   = [] } = useQuery<LookupItem[]>({ queryKey: ["tx-lookup-invoices"],    queryFn: () => axios.get(`${BASE}/api/transactions-lookup/invoices`).then(r => r.data),    staleTime: 60000 });
  const { data: payInfos   = [] } = useQuery<LookupItem[]>({ queryKey: ["tx-lookup-payinfos"],    queryFn: () => axios.get(`${BASE}/api/transactions-lookup/payment-infos`).then(r => r.data), staleTime: 60000 });
  const { data: costCenters= [] } = useQuery<LookupItem[]>({ queryKey: ["tx-lookup-costcenters"], queryFn: () => axios.get(`${BASE}/api/transactions-lookup/cost-centers`).then(r => r.data),  staleTime: 60000 });

  const createTx = useMutation({
    mutationFn: () => {
      if (!form.transactionType) return Promise.reject("type required");
      return axios.post(`${BASE}/api/transactions`, {
        accountId:      form.accountId      || undefined,
        contactId:      form.contactId      || undefined,
        invoiceId:      form.invoiceId      || undefined,
        paymentInfoId:  form.paymentInfoId  || undefined,
        costCenterCode: form.costCenterCode || undefined,
        transactionType: form.transactionType,
        creditAmount:   form.creditAmount   || undefined,
        description:    form.description    || undefined,
      }).then(r => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setCreateOpen(false);
      setForm(EMPTY);
      toast({ title: "Transaction created successfully" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to create transaction" }),
  });

  return (
    <div className="space-y-4">
      {/* Toolbar + Create button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <ListToolbar
            search={search} onSearch={v => { setSearch(v); setPage(1); }}
            statuses={["credit", "debit"]} filterLabel="Type"
            activeStatus={activeStatus} onStatusChange={s => { setActiveStatus(s); setPage(1); }}
            total={total}
            csvExportTable="transactions"
          />
        </div>
        <Button
          onClick={() => { setForm(EMPTY); setCreateOpen(true); }}
          className="bg-[#F5821F] hover:bg-[#D96A0A] text-white gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> Create Transaction
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Type", "Description", "Amount", "Date", "Ref #", "Status", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(PAGE_SIZE)].map((_, i) => (
                <tr key={i}>{[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}</tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground text-sm">
                  <ArrowDownLeft className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  No transactions found
                </td>
              </tr>
            ) : rows.map(r => (
              <tr key={r.id} className="hover:bg-[#FEF0E3] transition-colors cursor-pointer" onClick={() => setSelected(r)}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {r.transactionType === "credit"
                      ? <ArrowDownLeft className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                      : <ArrowUpRight className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />}
                    <span className={`text-xs font-medium capitalize ${r.transactionType === "credit" ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                      {r.transactionType ?? "—"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{r.description ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`font-medium ${r.transactionType === "credit" ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                    {r.transactionType === "credit" ? "+" : "−"}{fmtAmount(r.creditAmount ?? r.amount, r.currency)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {r.transactionDate ? format(new Date(r.transactionDate), "MMM d, yyyy") : r.createdAt ? format(new Date(r.createdAt), "MMM d, yyyy") : "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.bankReference ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    r.status === "Active" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#F4F3F1] text-[#57534E]"
                  }`}>{r.status ?? "Active"}</span>
                </td>
                <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ListPagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

      {/* ── Create Transaction Modal ─────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={o => { if (!o) setCreateOpen(false); }}>
        <DialogContent className="max-w-lg rounded-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#1557BF]">Create Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <SearchSelect label="Account"     value={form.accountId}      onChange={sf("accountId")}      options={accounts}    placeholder="Search accounts…" />
            <SearchSelect label="Contact"     value={form.contactId}      onChange={sf("contactId")}      options={contacts}    placeholder="Search contacts…" />
            <SearchSelect label="Invoice"     value={form.invoiceId}      onChange={sf("invoiceId")}      options={invoices}    placeholder="Search invoices…" />
            <SearchSelect label="PaymentInfo" value={form.paymentInfoId}  onChange={sf("paymentInfoId")}  options={payInfos}    placeholder="Search payment info…" />
            <SearchSelect label="Cost Center" value={form.costCenterCode} onChange={sf("costCenterCode")} options={costCenters} placeholder="Search cost centers…" />

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Credit Amount</Label>
              <Select value={form.transactionType} onValueChange={sf("transactionType")}>
                <SelectTrigger className="h-11 border-[#E8E6E2]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="debit">Debit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Input
                type="number" min={0} step={0.01}
                placeholder="Credit Amount"
                value={form.creditAmount}
                onChange={e => setForm(f => ({ ...f, creditAmount: e.target.value }))}
                className="h-11 border-[#E8E6E2] focus:border-[#1557BF]"
              />
            </div>

            <div className="space-y-1.5">
              <Textarea
                placeholder="Description"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                className="border-[#E8E6E2] focus:border-[#1557BF] resize-none text-sm"
              />
            </div>

            <Button
              onClick={() => createTx.mutate()}
              disabled={createTx.isPending}
              className="w-full h-12 bg-[#1557BF] hover:bg-[#0E3D8A] text-white font-semibold text-base gap-2"
            >
              {createTx.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Transaction
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Detail Sheet ─────────────────────────────────────────────────────── */}
      <Sheet open={!!selected} onOpenChange={o => { if (!o) setSelected(null); }}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto bg-background">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selected?.transactionType === "credit"
                ? <ArrowDownLeft className="w-4 h-4 text-[#22C55E]" />
                : <ArrowUpRight className="w-4 h-4 text-[#DC2626]" />}
              Transaction Detail
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <div className={`text-2xl font-bold ${selected.transactionType === "credit" ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                {selected.transactionType === "credit" ? "+" : "−"}{fmtAmount(selected.creditAmount ?? selected.amount, selected.currency)}
              </div>
              <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="capitalize font-medium">{selected.transactionType ?? "—"}</span></div>
                {selected.description && <div className="flex justify-between"><span className="text-muted-foreground">Description</span><span>{selected.description}</span></div>}
                {selected.costCenterCode && <div className="flex justify-between"><span className="text-muted-foreground">Cost Center</span><span className="font-mono text-xs">{selected.costCenterCode}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{selected.transactionDate ? format(new Date(selected.transactionDate), "MMM d, yyyy") : selected.createdAt ? format(new Date(selected.createdAt), "MMM d, yyyy") : "—"}</span></div>
                {selected.bankReference && <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-mono text-xs">{selected.bankReference}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${selected.status === "Active" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#F4F3F1] text-[#57534E]"}`}>{selected.status ?? "Active"}</span>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
