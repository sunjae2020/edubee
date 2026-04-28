import { useState, useRef, useEffect } from "react";
import { formatDate } from "@/lib/date-format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { TableFooter } from "@/components/ui/table-footer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Plus, Loader2, Search, X, User, Building2, Mail, Phone, Globe, CheckCircle2, BookOpen } from "lucide-react";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";

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
  createdAt?: string | null; journalEntryId?: string | null;
}

const STATUS_TABS = [
  { key: "all",     label: "All" },
  { key: "pending", label: "Pending Review" },
  { key: "posted",  label: "Posted" },
  { key: "Active",  label: "Active" },
] as const;

interface LookupItem { id: string; name: string }

interface AccountLookup {
  id: string;
  name: string;
  accountType?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  primaryContactId?: string | null;
  primaryContactName?: string | null;
}

interface FormState {
  accountId: string; contactId: string; invoiceId: string;
  paymentInfoId: string; costCenterCode: string;
  transactionType: string; creditAmount: string; description: string;
  transactionDate: string; bankReference: string;
}
const EMPTY: FormState = {
  accountId: "", contactId: "", invoiceId: "", paymentInfoId: "",
  costCenterCode: "", transactionType: "credit", creditAmount: "",
  description: "", transactionDate: "", bankReference: "",
};

function fmtAmount(amount?: string | number | null, currency?: string | null) {
  if (!amount) return "—";
  const sym = CURRENCY_SYMBOLS[currency ?? "AUD"] ?? (currency ?? "AUD");
  return `${sym}${Number(amount).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;
}

// ── Account Type Badge ────────────────────────────────────────────────────────
function AccountTypeBadge({ type }: { type?: string | null }) {
  if (!type) return null;
  const styles: Record<string, string> = {
    Student: "bg-blue-50 text-blue-700",
    Agent:   "bg-purple-50 text-purple-700",
    Partner: "bg-green-50 text-green-700",
    default: "bg-[#F4F3F1] text-[#57534E]",
  };
  const cls = styles[type] ?? styles.default;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {type}
    </span>
  );
}

// ── Account initials avatar ───────────────────────────────────────────────────
function AccountAvatar({ name, type, size = "sm" }: { name: string; type?: string | null; size?: "sm" | "md" }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const bg = type === "Student" ? "bg-blue-100 text-blue-700"
    : type === "Agent" ? "bg-purple-100 text-purple-700"
    : "bg-[#F4F3F1] text-[#78716C]";
  const sz = size === "md" ? "w-9 h-9 text-sm" : "w-7 h-7 text-xs";
  return (
    <div className={`${sz} rounded-full ${bg} flex items-center justify-center font-semibold shrink-0`}>
      {initials}
    </div>
  );
}

// ── Selected Account Info Card ────────────────────────────────────────────────
function AccountCard({ account, onClear }: { account: AccountLookup; onClear: () => void }) {
  return (
    <div className="relative border border-[#E8E6E2] rounded-xl p-3 bg-[#FAFAF9]">
      <button
        onClick={onClear}
        className="absolute top-2.5 right-2.5 text-[#A8A29E] hover:text-[#DC2626] transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <AccountAvatar name={account.name} type={account.accountType} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[#1C1917] leading-tight">{account.name}</span>
            <AccountTypeBadge type={account.accountType} />
          </div>
          <div className="mt-1.5 space-y-0.5">
            {account.email && (
              <div className="flex items-center gap-1.5 text-xs text-[#78716C]">
                <Mail className="w-3 h-3 shrink-0" />{account.email}
              </div>
            )}
            {account.phone && (
              <div className="flex items-center gap-1.5 text-xs text-[#78716C]">
                <Phone className="w-3 h-3 shrink-0" />{account.phone}
              </div>
            )}
            {account.country && (
              <div className="flex items-center gap-1.5 text-xs text-[#78716C]">
                <Globe className="w-3 h-3 shrink-0" />{account.country}
              </div>
            )}
          </div>
          {account.primaryContactName && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-[#57534E]">
              <User className="w-3 h-3 shrink-0 text-[#A8A29E]" />
              <span className="text-[#A8A29E]">Contact:</span>
              <span className="font-medium">{account.primaryContactName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Account Search Select ─────────────────────────────────────────────────────
function AccountSelect({
  value, onChange, accounts, onAccountSelected,
}: {
  value: string;
  onChange: (v: string) => void;
  accounts: AccountLookup[];
  onAccountSelected?: (a: AccountLookup) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = accounts.find(a => a.id === value);

  const filtered = accounts
    .filter(a =>
      !q ||
      a.name.toLowerCase().includes(q.toLowerCase()) ||
      (a.email ?? "").toLowerCase().includes(q.toLowerCase())
    )
    .slice(0, 30);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (selected) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Account *</Label>
        <AccountCard account={selected} onClear={() => { onChange(""); setQ(""); }} />
      </div>
    );
  }

  return (
    <div className="space-y-1.5" ref={ref}>
      <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Account *</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E] pointer-events-none" />
        <Input
          placeholder="Search by name or email…"
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="pl-9 h-10 border-[#E8E6E2] focus:border-(--e-orange)"
        />
        {open && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-[#E8E6E2] rounded-xl shadow-lg max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-[#A8A29E]">No accounts found</div>
            ) : (
              filtered.map(a => (
                <button
                  key={a.id}
                  type="button"
                  className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-(--e-orange-lt) border-b border-[#F4F3F1] last:border-0 transition-colors"
                  onClick={() => {
                    onChange(a.id);
                    setQ("");
                    setOpen(false);
                    onAccountSelected?.(a);
                  }}
                >
                  <AccountAvatar name={a.name} type={a.accountType} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#1C1917] truncate">{a.name}</span>
                      <AccountTypeBadge type={a.accountType} />
                    </div>
                    {a.email && (
                      <div className="text-xs text-[#A8A29E] truncate">{a.email}</div>
                    )}
                  </div>
                  {a.country && (
                    <span className="text-xs text-[#A8A29E] shrink-0">{a.country}</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {!q && accounts.length > 0 && (
        <p className="text-xs text-[#A8A29E]">
          {accounts.length} accounts · type to filter
        </p>
      )}
    </div>
  );
}

// ── Generic SearchSelect (for non-account fields) ────────────────────────────
function SearchSelect({
  label, value, onChange, options, placeholder, optional = true,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: LookupItem[]; placeholder: string; optional?: boolean;
}) {
  const [q, setQ] = useState("");
  const selected = options.find(o => o.id === value);
  const filtered = q
    ? options.filter(o => o.name.toLowerCase().includes(q.toLowerCase())).slice(0, 20)
    : options.slice(0, 20);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">
        {label}{optional && <span className="ml-1 text-[#A8A29E] normal-case font-normal">(optional)</span>}
      </Label>
      {selected ? (
        <div className="flex items-center justify-between border border-[#E8E6E2] rounded-lg px-3 py-2.5 h-10 bg-[#FAFAF9]">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
            <span className="text-sm text-[#1C1917] truncate">{selected.name}</span>
          </div>
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
            className="pl-9 h-10 border-[#E8E6E2] focus:border-(--e-orange)"
          />
          {q && filtered.length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-[#E8E6E2] rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filtered.map(o => (
                <button
                  key={o.id}
                  type="button"
                  className="w-full text-left px-4 py-2 text-sm hover:bg-(--e-orange-lt) text-[#1C1917] border-b border-[#F4F3F1] last:border-0"
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

// ── Contact auto-suggest banner ───────────────────────────────────────────────
function ContactSuggest({ name, onAccept, onDismiss }: { name: string; onAccept: () => void; onDismiss: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 text-xs">
      <div className="flex items-center gap-1.5 text-blue-700">
        <User className="w-3.5 h-3.5 shrink-0" />
        <span>Auto-suggest: <strong>{name}</strong></span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={onAccept} className="text-blue-700 font-semibold hover:text-blue-900">Use</button>
        <button onClick={onDismiss} className="text-blue-400 hover:text-blue-600">✕</button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Transactions() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch]         = useState("");
  const { sortBy, sortDir, onSort } = useSortState();
  const [activeStatus, setActiveStatus] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage]             = useState(1);
  const [pageSize, setPageSize]     = useState(PAGE_SIZE);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm]             = useState<FormState>(EMPTY);
  const [contactSuggest, setContactSuggest] = useState<{ id: string; name: string } | null>(null);

  const sf = (k: keyof FormState) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const { data: resp, isLoading } = useQuery({
    queryKey: ["transactions", { search, status: activeStatus, statusFilter, page, pageSize }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (search) params.set("search", search);
      if (activeStatus !== "all") params.set("transactionType", activeStatus);
      if (statusFilter !== "all") params.set("status", statusFilter);
      return axios.get(`${BASE}/api/transactions?${params}`).then(r => r.data);
    },
  });

  const postTx = useMutation({
    mutationFn: (id: string) => axios.post(`${BASE}/api/transactions/${id}/post`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast({ title: "Journal entry created successfully" });
    },
    onError: (err: any) => toast({
      variant: "destructive",
      title: "Failed to post",
      description: err?.response?.data?.error ?? "An error occurred",
    }),
  });
  const rows: Transaction[] = resp?.data ?? [];
  const sorted = useSorted(rows, sortBy, sortDir);
  const total: number = resp?.meta?.total ?? 0;

  const { data: accounts = [] } = useQuery<AccountLookup[]>({
    queryKey: ["tx-lookup-accounts"],
    queryFn: () => axios.get(`${BASE}/api/transactions-lookup/accounts`).then(r => r.data),
    staleTime: 60000,
  });
  const { data: contacts    = [] } = useQuery<LookupItem[]>({ queryKey: ["tx-lookup-contacts"],    queryFn: () => axios.get(`${BASE}/api/transactions-lookup/contacts`).then(r => r.data),    staleTime: 60000 });
  const { data: invoices    = [] } = useQuery<LookupItem[]>({ queryKey: ["tx-lookup-invoices"],    queryFn: () => axios.get(`${BASE}/api/transactions-lookup/invoices`).then(r => r.data),    staleTime: 60000 });
  const { data: payInfos    = [] } = useQuery<LookupItem[]>({ queryKey: ["tx-lookup-payinfos"],    queryFn: () => axios.get(`${BASE}/api/transactions-lookup/payment-infos`).then(r => r.data), staleTime: 60000 });
  const { data: costCenters = [] } = useQuery<LookupItem[]>({ queryKey: ["tx-lookup-costcenters"], queryFn: () => axios.get(`${BASE}/api/transactions-lookup/cost-centers`).then(r => r.data),  staleTime: 60000 });

  function handleAccountSelected(a: AccountLookup) {
    // Suggest the primary contact if available and not yet set
    if (a.primaryContactId && a.primaryContactName && !form.contactId) {
      setContactSuggest({ id: a.primaryContactId, name: a.primaryContactName });
    }
  }

  function acceptContactSuggest() {
    if (contactSuggest) {
      setForm(f => ({ ...f, contactId: contactSuggest.id }));
    }
    setContactSuggest(null);
  }

  const createTx = useMutation({
    mutationFn: () => {
      if (!form.transactionType) return Promise.reject("type required");
      return axios.post(`${BASE}/api/transactions`, {
        accountId:       form.accountId       || undefined,
        contactId:       form.contactId       || undefined,
        invoiceId:       form.invoiceId       || undefined,
        paymentInfoId:   form.paymentInfoId   || undefined,
        costCenterCode:  form.costCenterCode  || undefined,
        transactionType: form.transactionType,
        creditAmount:    form.creditAmount     || undefined,
        description:     form.description     || undefined,
        transactionDate: form.transactionDate  || undefined,
        bankReference:   form.bankReference    || undefined,
      }).then(r => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setCreateOpen(false);
      setForm(EMPTY);
      setContactSuggest(null);
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
          onClick={() => { setForm(EMPTY); setContactSuggest(null); setCreateOpen(true); }}
          className="bg-(--e-orange) hover:bg-(--e-orange-hover) text-white gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> Create Transaction
        </Button>
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_TABS.map(s => (
          <button
            key={s.key}
            onClick={() => { setStatusFilter(s.key); setPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              statusFilter === s.key
                ? "border-(--e-orange) bg-(--e-orange-lt) text-(--e-orange)"
                : "border-stone-200 text-stone-500 hover:border-stone-400"
            }`}
          >
            {s.key === "pending" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 align-middle" />}
            {s.key === "posted"  && <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5 align-middle" />}
            {s.label}
          </button>
        ))}
        <span className="text-xs text-stone-400 ml-1">Finance bookkeeping status</span>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <SortableTh col="transactionType" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</SortableTh>
              <SortableTh col="description" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</SortableTh>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
              <SortableTh col="transactionDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</SortableTh>
              <SortableTh col="refNumber" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ref #</SortableTh>
              <SortableTh col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</SortableTh>
              <th className="w-20 px-4 py-3" />
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
            ) : sorted.map(r => (
              <tr key={r.id} className="hover:bg-(--e-orange-lt) transition-colors cursor-pointer" onClick={() => navigate(`/admin/accounting/transactions/${r.id}`)}>
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
                  {r.transactionDate ? formatDate(r.transactionDate) : formatDate(r.createdAt)}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.bankReference ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                    r.status === "pending" ? "bg-amber-50 text-amber-600 border-amber-200" :
                    r.status === "posted"  ? "bg-blue-50 text-blue-600 border-blue-200" :
                    r.status === "Active"  ? "bg-[#DCFCE7] text-[#16A34A] border-transparent" :
                                             "bg-[#F4F3F1] text-[#57534E] border-transparent"
                  }`}>{r.status ?? "pending"}</span>
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  {r.status === "pending" ? (
                    <Button
                      size="sm" variant="outline"
                      className="h-7 px-2 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 gap-1"
                      onClick={() => postTx.mutate(r.id)}
                      disabled={postTx.isPending}
                      title="Post to Journal"
                    >
                      {postTx.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><BookOpen className="w-3 h-3" /> Post</>}
                    </Button>
                  ) : r.status === "posted" ? (
                    <span className="flex items-center gap-1 text-xs text-blue-500">
                      <BookOpen className="w-3.5 h-3.5" /> Posted
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TableFooter page={page} pageSize={pageSize} total={total} label="transactions" onPageChange={setPage} onPageSizeChange={v => { setPageSize(v); setPage(1); }} />

      {/* ── Create Transaction Modal ─────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={o => { if (!o) { setCreateOpen(false); setContactSuggest(null); } }}>
        <DialogContent className="max-w-lg rounded-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#1C1917]">Create Transaction</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Account — primary search, rich display */}
            <AccountSelect
              value={form.accountId}
              onChange={sf("accountId")}
              accounts={accounts}
              onAccountSelected={handleAccountSelected}
            />

            {/* Contact suggest banner */}
            {contactSuggest && !form.contactId && (
              <ContactSuggest
                name={contactSuggest.name}
                onAccept={acceptContactSuggest}
                onDismiss={() => setContactSuggest(null)}
              />
            )}

            {/* Contact (shown when account selected or explicitly opened) */}
            {(form.accountId || form.contactId) && (
              <SearchSelect
                label="Contact"
                value={form.contactId}
                onChange={sf("contactId")}
                options={contacts}
                placeholder="Search contacts…"
              />
            )}

            {/* Type + Amount side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Type *</Label>
                <Select value={form.transactionType} onValueChange={sf("transactionType")}>
                  <SelectTrigger className="h-10 border-[#E8E6E2] focus:border-(--e-orange)">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">
                      <div className="flex items-center gap-2">
                        <ArrowDownLeft className="w-3.5 h-3.5 text-[#22C55E]" />
                        Credit (IN)
                      </div>
                    </SelectItem>
                    <SelectItem value="debit">
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#DC2626]" />
                        Debit (OUT)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Amount *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#A8A29E] font-medium">A$</span>
                  <Input
                    type="number" min={0} step={0.01}
                    placeholder="0.00"
                    value={form.creditAmount}
                    onChange={e => setForm(f => ({ ...f, creditAmount: e.target.value }))}
                    className="h-10 pl-9 border-[#E8E6E2] focus:border-(--e-orange)"
                  />
                </div>
              </div>
            </div>

            {/* Date + Reference side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">
                  Date <span className="text-[#A8A29E] normal-case font-normal">(optional)</span>
                </Label>
                <Input
                  type="date"
                  value={form.transactionDate}
                  onChange={e => setForm(f => ({ ...f, transactionDate: e.target.value }))}
                  className="h-10 border-[#E8E6E2] focus:border-(--e-orange)"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">
                  Reference # <span className="text-[#A8A29E] normal-case font-normal">(optional)</span>
                </Label>
                <Input
                  placeholder="Bank ref / receipt #"
                  value={form.bankReference}
                  onChange={e => setForm(f => ({ ...f, bankReference: e.target.value }))}
                  className="h-10 border-[#E8E6E2] focus:border-(--e-orange)"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">
                Description <span className="text-[#A8A29E] normal-case font-normal">(optional)</span>
              </Label>
              <Textarea
                placeholder="Enter description…"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className="border-[#E8E6E2] focus:border-(--e-orange) resize-none text-sm"
              />
            </div>

            {/* Advanced: Invoice / PaymentInfo / Cost Center (collapsed until needed) */}
            <details className="group">
              <summary className="cursor-pointer text-xs text-[#A8A29E] hover:text-[#57534E] flex items-center gap-1.5 select-none py-1">
                <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                Advanced fields (Invoice, Payment Info, Cost Center)
              </summary>
              <div className="space-y-3 mt-3 pl-1">
                <SearchSelect label="Invoice"     value={form.invoiceId}      onChange={sf("invoiceId")}      options={invoices}    placeholder="Search invoices…" />
                <SearchSelect label="Payment Info" value={form.paymentInfoId} onChange={sf("paymentInfoId")}  options={payInfos}    placeholder="Search payment info…" />
                <SearchSelect label="Cost Center" value={form.costCenterCode} onChange={sf("costCenterCode")} options={costCenters} placeholder="Search cost centers…" />
              </div>
            </details>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E8E6E2]">
              <Button variant="outline" onClick={() => { setCreateOpen(false); setContactSuggest(null); }} className="border-[#E8E6E2]">
                Cancel
              </Button>
              <Button
                onClick={() => createTx.mutate()}
                disabled={createTx.isPending || !form.transactionType}
                className="bg-(--e-orange) hover:bg-(--e-orange-hover) text-white gap-1.5"
              >
                {createTx.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Transaction
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
