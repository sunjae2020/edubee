import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Pencil, TrendingDown, Plus, FileText, ArrowUpRight, CalendarRange } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "A$", USD: "$", SGD: "S$", PHP: "₱", THB: "฿", KRW: "₩", JPY: "¥", GBP: "£",
};

function DualAmount({ amount, currency, audEquivalent }: { amount?: string | number | null; currency?: string | null; audEquivalent?: string | number | null }) {
  if (!amount) return <span className="text-muted-foreground">—</span>;
  const sym = CURRENCY_SYMBOLS[currency ?? "AUD"] ?? (currency ?? "AUD");
  const num = Number(amount);
  const aud = Number(audEquivalent);
  return (
    <span>
      <span className="font-medium">{sym}{num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      {currency && currency !== "AUD" && aud > 0 && (
        <span className="ml-1.5 text-[11px] text-muted-foreground">≈ A${aud.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      )}
    </span>
  );
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  settled: "bg-green-100 text-green-800 border-green-200",
  disputed: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-700 border-gray-200",
};

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status ?? "pending").toLowerCase();
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${STATUS_COLORS[s] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>{s}</span>;
}

const ROLE_LABELS: Record<string, string> = {
  partner_institute: "Institute", partner_hotel: "Hotel", partner_pickup: "Pickup",
  partner_tour: "Tour", camp_coordinator: "Camp Coordinator", education_agent: "Education Agent",
};

const CONTRACT_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700", active: "bg-green-100 text-green-800",
  signed: "bg-blue-100 text-blue-800", completed: "bg-purple-100 text-purple-800",
  cancelled: "bg-red-100 text-red-800", suspended: "bg-yellow-100 text-yellow-800",
};

interface Rec {
  id: string; contractId?: string | null; providerUserId?: string | null; providerRole?: string | null;
  serviceDescription?: string | null; grossAmount?: string | null; commissionRate?: string | null;
  commissionAmount?: string | null; netAmount?: string | null; currency?: string | null;
  originalCurrency?: string | null; originalNetAmount?: string | null; audEquivalent?: string | null;
  status?: string | null; settlementDate?: string | null; notes?: string | null;
  studentName?: string | null; clientEmail?: string | null;
  contractNumber?: string | null; contractStatus?: string | null;
  contractStartDate?: string | null; contractEndDate?: string | null;
  totalAmount?: string | null;
}

function ContractCard({ rec, onViewContract }: { rec: Rec; onViewContract: () => void }) {
  if (!rec.contractId) return null;
  const cs = (rec.contractStatus ?? "draft").toLowerCase();
  const ccls = CONTRACT_STATUS_COLORS[cs] ?? "bg-gray-100 text-gray-700";
  return (
    <div className="rounded-lg border border-[#F08301]/30 bg-[#F08301]/5 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-[#F08301]" />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Contract</span>
          {rec.contractNumber && <span className="font-mono text-xs font-bold text-[#F08301]">{rec.contractNumber}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${ccls}`}>{cs}</span>
          <button onClick={onViewContract} className="flex items-center gap-0.5 text-[11px] text-[#F08301] hover:underline font-medium">
            View <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Student</span>
          <p className="font-medium text-foreground truncate">{rec.studentName ?? "—"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Client Email</span>
          <p className="font-medium text-foreground truncate">{rec.clientEmail ?? "—"}</p>
        </div>
        {(rec.contractStartDate || rec.contractEndDate) && (
          <div className="flex items-start gap-1 col-span-2">
            <CalendarRange className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-muted-foreground">
              {rec.contractStartDate ? format(new Date(rec.contractStartDate), "MMM d, yyyy") : "—"}
              {" · "}
              {rec.contractEndDate ? format(new Date(rec.contractEndDate), "MMM d, yyyy") : "—"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Settlement() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selected, setSelected] = useState<Rec | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Rec>>({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  const role = user?.role ?? "";
  const isAdmin = ["super_admin", "admin"].includes(role);
  const isCC = role === "camp_coordinator";
  const isPartner = role.startsWith("partner_");
  const canCreate = isAdmin || isCC;

  const { data, isLoading } = useQuery({
    queryKey: ["services-settlement", statusFilter],
    queryFn: () => axios.get(`${BASE}/api/services/settlement${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`).then(r => r.data),
  });
  const rows: Rec[] = data?.data ?? [];

  // Summary stats
  const totalGross = rows.reduce((s, r) => s + Number(r.grossAmount ?? 0), 0);
  const totalNet = rows.reduce((s, r) => s + Number(r.netAmount ?? 0), 0);
  const totalCommission = rows.reduce((s, r) => s + Number(r.commissionAmount ?? 0), 0);
  const pending = rows.filter(r => r.status === "pending").length;

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<Rec>) => axios.put(`${BASE}/api/services/settlement/${selected!.id}`, payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services-settlement"] }); toast({ title: "Settlement updated" }); setEditing(false); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      axios.patch(`${BASE}/api/services/settlement/${id}/status`, { status, settlementDate: new Date().toISOString().slice(0, 10) }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services-settlement"] }); toast({ title: "Status updated" }); setSelected(null); },
  });

  const createMutation = useMutation({
    mutationFn: (payload: Partial<Rec>) => axios.post(`${BASE}/api/services/settlement`, payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services-settlement"] }); toast({ title: "Settlement created" }); setShowCreate(false); setForm({}); },
  });

  function openSheet(r: Rec) { setSelected(r); setForm({ ...r }); setEditing(false); }
  const fld = (k: keyof Rec) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F08301]/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-[#F08301]" /></div>
          <div><h1 className="text-lg font-bold">Settlement</h1><p className="text-xs text-muted-foreground">Provider payouts & commission management</p></div>
        </div>
        {canCreate && (
          <Button size="sm" className="bg-[#F08301] hover:bg-[#d97706] text-white gap-1.5" onClick={() => { setForm({}); setShowCreate(true); }}>
            <Plus className="w-3.5 h-3.5" /> New Settlement
          </Button>
        )}
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Gross", value: `A$${totalGross.toLocaleString("en-AU", { minimumFractionDigits: 2 })}` },
          { label: "Platform Commission", value: `A$${totalCommission.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`, sub: isCC ? "Deducted from revenue" : undefined, color: "text-red-600" },
          { label: "Net to Providers", value: `A$${totalNet.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`, color: "text-green-700" },
          { label: "Pending", value: `${pending} record${pending !== 1 ? "s" : ""}`, color: pending > 0 ? "text-yellow-700" : "" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg border p-3">
            <div className="text-xs text-muted-foreground font-medium mb-1">{k.label}</div>
            <div className={`text-base font-bold ${k.color ?? ""}`}>{k.value}</div>
            {k.sub && <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5"><TrendingDown className="w-3 h-3" />{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {["all","pending","processing","settled","disputed"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize ${statusFilter === s ? "bg-[#F08301] text-white border-[#F08301]" : "border-muted-foreground/30 text-muted-foreground hover:border-[#F08301]/50"}`}>
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">No settlement records found</p></div>
      ) : (
        <div className="rounded-lg border overflow-x-auto bg-white">
          <table className="w-full min-w-[860px] text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contract</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Provider Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gross</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comm %</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Net</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Settlement Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => openSheet(r)}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-[#F08301]">{r.contractNumber ?? r.contractId?.slice(0, 8) ?? "—"}</td>
                  <td className="px-4 py-3"><span className="px-1.5 py-0.5 bg-muted rounded text-xs">{ROLE_LABELS[r.providerRole ?? ""] ?? r.providerRole ?? "—"}</span></td>
                  <td className="px-4 py-3 text-xs max-w-[160px] truncate">{r.serviceDescription ?? "—"}</td>
                  <td className="px-4 py-3 text-right"><DualAmount amount={r.grossAmount} currency={r.originalCurrency ?? r.currency} audEquivalent={r.audEquivalent} /></td>
                  <td className="px-4 py-3 text-right text-sm">{r.commissionRate ? `${r.commissionRate}%` : "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-700"><DualAmount amount={r.netAmount} currency={r.currency} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.settlementDate ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail/Edit Sheet */}
      <Sheet open={!!selected} onOpenChange={o => { if (!o) { setSelected(null); setEditing(false); } }}>
        <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-[#F08301]" /> Settlement Detail</SheetTitle>
            <SheetDescription className="text-xs">{selected?.serviceDescription ?? "Provider payout record"}</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <ContractCard rec={selected} onViewContract={() => { setSelected(null); navigate(`${BASE}/admin/contracts`); }} />
              <div className="flex items-center justify-between">
                <StatusBadge status={selected.status} />
                <div className="flex gap-2">
                  {isAdmin && selected.status === "pending" && (
                    <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => approveMutation.mutate({ id: selected.id, status: "processing" })}>Mark Processing</Button>
                  )}
                  {isAdmin && selected.status === "processing" && (
                    <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => approveMutation.mutate({ id: selected.id, status: "settled" })}>Mark Settled</Button>
                  )}
                  {!editing && isAdmin && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setForm({ ...selected }); setEditing(true); }}>
                      <Pencil className="w-3 h-3" /> Edit
                    </Button>
                  )}
                </div>
              </div>

              {/* Amount breakdown */}
              <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Gross Amount</span><DualAmount amount={selected.grossAmount} currency={selected.originalCurrency ?? selected.currency} audEquivalent={selected.audEquivalent} /></div>
                <div className="flex justify-between text-sm text-red-600"><span>Commission ({selected.commissionRate}%)</span><span>- A${Number(selected.commissionAmount ?? 0).toFixed(2)}</span></div>
                <div className="border-t pt-2 flex justify-between font-bold"><span>Net Amount</span><span className="text-green-700">A${Number(selected.netAmount ?? 0).toFixed(2)}</span></div>
              </div>

              {!editing ? (
                <dl className="space-y-3">
                  {[
                    ["Provider Role", ROLE_LABELS[selected.providerRole ?? ""] ?? selected.providerRole],
                    ["Description", selected.serviceDescription],
                    ["Currency", selected.originalCurrency ?? selected.currency],
                    ["Settlement Date", selected.settlementDate],
                    ["Notes", selected.notes],
                  ].map(([label, val]) => val && (
                    <div key={String(label)}><dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">{label}</dt><dd className="text-sm">{String(val)}</dd></div>
                  ))}
                </dl>
              ) : (
                <div className="space-y-3">
                  <div><Label className="text-xs">Description</Label><Textarea value={form.serviceDescription ?? ""} onChange={e => fld("serviceDescription")(e.target.value)} className="mt-1 text-sm" rows={2} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Gross Amount</Label><Input type="number" value={form.grossAmount ?? ""} onChange={e => fld("grossAmount")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                    <div><Label className="text-xs">Commission Rate (%)</Label><Input type="number" value={form.commissionRate ?? ""} onChange={e => fld("commissionRate")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                  </div>
                  <div><Label className="text-xs">Settlement Date</Label><Input type="date" value={form.settlementDate ?? ""} onChange={e => fld("settlementDate")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                  <div><Label className="text-xs">Notes</Label><Textarea value={form.notes ?? ""} onChange={e => fld("notes")(e.target.value)} className="mt-1 text-sm" rows={2} /></div>
                  <div><Label className="text-xs">Status</Label>
                    <Select value={form.status ?? "pending"} onValueChange={v => fld("status")(v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{["pending","processing","settled","disputed","cancelled"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="flex-1 bg-[#F08301] hover:bg-[#d97706] text-white" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? "Saving…" : "Save Changes"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Settlement Record</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs">Contract ID</Label><Input value={form.contractId ?? ""} onChange={e => fld("contractId")(e.target.value)} className="mt-1 h-8 text-sm" placeholder="Contract UUID" /></div>
            <div><Label className="text-xs">Provider Role</Label>
              <Select value={form.providerRole ?? ""} onValueChange={v => fld("providerRole")(v)}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select role…" /></SelectTrigger>
                <SelectContent>{Object.entries(ROLE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Description</Label><Input value={form.serviceDescription ?? ""} onChange={e => fld("serviceDescription")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">Gross</Label><Input type="number" value={form.grossAmount ?? ""} onChange={e => fld("grossAmount")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
              <div><Label className="text-xs">Comm %</Label><Input type="number" value={form.commissionRate ?? "10"} onChange={e => fld("commissionRate")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
              <div><Label className="text-xs">Currency</Label>
                <Select value={form.currency ?? "AUD"} onValueChange={v => fld("currency")(v)}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["AUD","USD","SGD","PHP","THB","KRW","JPY","GBP"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" className="flex-1 bg-[#F08301] hover:bg-[#d97706] text-white" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "Create"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
