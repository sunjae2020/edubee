import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, MoreVertical, CheckCircle2, Pencil, Trash2, Download,
  TrendingUp, TrendingDown, DollarSign, Zap, StickyNote, Loader2, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date-format";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Design tokens ─────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-[#FEF9C3] text-[#CA8A04]",
  invoiced:  "bg-[#EFF6FF] text-[#2563EB]",
  partial:   "bg-[--e-orange-lt] text-[--e-orange]",
  paid:      "bg-[#DCFCE7] text-[#16A34A]",
  overdue:   "bg-[#FEF2F2] text-[#DC2626]",
  cancelled: "bg-[#F4F3F1] text-[#57534E]",
};

const CC_BADGE: Record<string, string> = {
  "RC-CAMP":       "bg-[--e-orange-lt] text-[--e-orange]",
  "RC-DIRECT":     "bg-[--e-orange-lt] text-[--e-orange]",
  "CC-AGENT":      "bg-[#FEF2F2] text-[#DC2626]",
  "CC-INSTITUTE":  "bg-[#F4F3F1] text-[#57534E]",
  "CC-HOTEL":      "bg-[#F4F3F1] text-[#57534E]",
  "CC-PICKUP":     "bg-[#F4F3F1] text-[#57534E]",
  "CC-TOUR":       "bg-[#F4F3F1] text-[#57534E]",
  "CC-SETTLEMENT": "bg-[#F4F3F1] text-[#57534E]",
  "CC-MISC":       "bg-[#F4F3F1] text-[#57534E]",
};

const CC_BAR_COLOR: Record<string, string> = {
  "RC-CAMP": "bg-[--e-orange]", "RC-DIRECT": "bg-[--e-orange]",
  "CC-AGENT": "bg-[#DC2626]",
  default: "bg-[#A8A29E]",
};

const RECEIVABLE_CATEGORIES = [
  { value: "client_invoice", label: "Client Invoice", cc: "RC-CAMP" },
  { value: "agent_invoice",  label: "Agent Invoice",  cc: "RC-CAMP" },
];

const PAYABLE_CATEGORIES = [
  { value: "cc_agent",      label: "Agent Commission", cc: "CC-AGENT"      },
  { value: "cc_institute",  label: "Institute Fee",    cc: "CC-INSTITUTE"  },
  { value: "cc_hotel",      label: "Hotel Fee",        cc: "CC-HOTEL"      },
  { value: "cc_pickup",     label: "Pickup Fee",       cc: "CC-PICKUP"     },
  { value: "cc_tour",       label: "Tour Fee",         cc: "CC-TOUR"       },
  { value: "cc_settlement", label: "Settlement",       cc: "CC-SETTLEMENT" },
  { value: "cc_misc",       label: "Miscellaneous",    cc: "CC-MISC"       },
];

const CC_LABELS: Record<string, string> = {
  "RC-CAMP": "Camp Revenue", "RC-DIRECT": "Direct Revenue",
  "CC-AGENT": "Agent Commission", "CC-INSTITUTE": "Institute",
  "CC-HOTEL": "Hotel", "CC-PICKUP": "Pickup/Transfer",
  "CC-TOUR": "Tours", "CC-SETTLEMENT": "Settlement", "CC-MISC": "Misc",
};

const PAYMENT_METHODS = ["Bank Transfer", "Cash", "Card", "Other"];

function fmtAud(val: number | string | null | undefined, ccy = "AUD") {
  if (val == null || val === "") return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return `A$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Summary Card ──────────────────────────────────────────────────────────
function SummaryCard({ label, amount, icon, amountClass = "text-[#1C1917]" }: {
  label: string; amount: number; icon: React.ReactNode; amountClass?: string;
}) {
  return (
    <div className="bg-[#FAFAF9] border border-[#E8E6E2] rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-xs text-[#57534E] font-medium">
        {icon}{label}
      </div>
      <div className={cn("text-2xl font-bold font-mono tracking-tight mt-1", amountClass)}>
        {fmtAud(amount)}
      </div>
    </div>
  );
}

// ── Status / CC badges ────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize whitespace-nowrap", STATUS_BADGE[status] ?? "bg-gray-100 text-gray-600")}>
      {status}
    </span>
  );
}

function CCBadge({ cc }: { cc: string | null | undefined }) {
  if (!cc) return null;
  return (
    <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap", CC_BADGE[cc] ?? "bg-gray-100 text-gray-600")}>
      {cc}
    </span>
  );
}

// ── Action Menu ───────────────────────────────────────────────────────────
function ActionMenu({ item, onConfirm, onEdit, onDelete }: {
  item: any;
  onConfirm: (item: any) => void;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const downloadReceiptPdf = () => {
    const token = localStorage.getItem("edubee_token");
    const url = `${BASE}/api/finance/receipts/${item.receiptId}/pdf`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objUrl;
        a.download = `${item.receiptNumber ?? "receipt"}.pdf`;
        a.click();
        URL.revokeObjectURL(objUrl);
      })
      .catch(() => {});
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1 rounded hover:bg-[#E8E6E2] transition-colors text-[#57534E]"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-7 z-20 bg-white border border-[#E8E6E2] rounded-xl shadow-lg w-48 py-1 text-sm">
            {item.status !== "paid" && item.status !== "cancelled" && (
              <button onClick={() => { setOpen(false); onConfirm(item); }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[--e-orange-lt] text-[#1C1917]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" /> Confirm Payment
              </button>
            )}
            {item.status === "paid" && item.receiptId && item.itemType === "receivable" && (
              <button onClick={() => { setOpen(false); downloadReceiptPdf(); }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[--e-orange-lt] text-[#1C1917]">
                <Download className="w-3.5 h-3.5 text-[--e-orange]" /> Download Receipt
              </button>
            )}
            <button onClick={() => { setOpen(false); onEdit(item); }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[--e-orange-lt] text-[#1C1917]">
              <Pencil className="w-3.5 h-3.5 text-[#57534E]" /> Edit
            </button>
            <div className="h-px bg-[#E8E6E2] my-1" />
            <button onClick={() => { setOpen(false); onDelete(item); }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#FEF2F2] text-[#DC2626]">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Finance Row ───────────────────────────────────────────────────────────
function FinanceRow({ item, onConfirm, onEdit, onDelete, currency = "AUD" }: {
  item: any; onConfirm: (i: any) => void; onEdit: (i: any) => void; onDelete: (i: any) => void; currency?: string;
}) {
  const est = parseFloat(item.estimatedAmount ?? "0");
  const showCommNote = item.itemCategory === "agent_invoice" && item.commissionRate;

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAF9] border-b border-[#E8E6E2] last:border-0 group">
      <StatusBadge status={item.status ?? "pending"} />
      <CCBadge cc={item.costCenter} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[#1C1917] truncate">{item.label}</div>
        {showCommNote && (
          <div className="text-[11px] text-[#57534E]">
            Net of {item.commissionRate}% commission
          </div>
        )}
        {item.notes && (
          <div className="text-[11px] text-[#57534E] truncate">{item.notes}</div>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-semibold font-mono text-[#1C1917]">{fmtAud(est, currency)}</div>
        {item.actualAmount && item.actualAmount !== item.estimatedAmount && (
          <div className="text-[11px] text-[#16A34A] font-mono">Paid: {fmtAud(item.actualAmount, currency)}</div>
        )}
      </div>
      <div className="text-xs text-[#57534E] w-24 text-right shrink-0">
        {formatDate(item.dueDate)}
      </div>
      <ActionMenu item={item} onConfirm={onConfirm} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, onAdd }: { title: string; subtitle?: string; onAdd?: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E6E2] bg-[#FAFAF9]">
      <div>
        <div className="text-sm font-semibold text-[#1C1917]">{title}</div>
        {subtitle && <div className="text-xs text-[#57534E]">{subtitle}</div>}
      </div>
      {onAdd && (
        <Button size="sm" variant="outline" onClick={onAdd}
          className="h-7 gap-1 text-xs border-[--e-orange] text-[--e-orange] hover:bg-[--e-orange-lt]">
          <Plus className="w-3 h-3" /> Add Item
        </Button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  CONFIRM PAYMENT MODAL
// ══════════════════════════════════════════════════════════════════════════
function ConfirmPaymentModal({ item, contractCurrency, open, onClose, onConfirm, saving }: {
  item: any; contractCurrency?: string; open: boolean; onClose: () => void;
  onConfirm: (p: any) => void; saving: boolean;
}) {
  const [form, setForm] = useState({
    actualAmount: item?.estimatedAmount ?? "",
    paidDate: new Date().toISOString().split("T")[0],
    referenceNo: "",
    paymentMethod: "Bank Transfer",
    notes: "",
  });
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }));
  const isReceivable = item?.itemType === "receivable";
  const entryType = isReceivable ? "CREDIT" : "DEBIT";

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            Confirm Payment — <span className="text-[--e-orange]">{item?.label}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Actual Amount ({contractCurrency ?? "AUD"}) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#57534E]">A$</span>
              <Input type="number" step="0.01" value={form.actualAmount}
                onChange={e => f("actualAmount")(e.target.value)}
                className="h-9 pl-8 font-mono text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Payment Date *</Label>
            <Input type="date" value={form.paidDate} onChange={e => f("paidDate")(e.target.value)} className="h-9 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reference / Receipt No.</Label>
              <Input placeholder="REF-001" value={form.referenceNo} onChange={e => f("referenceNo")(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Payment Method</Label>
              <Select value={form.paymentMethod} onValueChange={f("paymentMethod")}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={e => f("notes")(e.target.value)}
              className="text-sm resize-none" placeholder="Optional notes…" />
          </div>

          {/* Ledger Preview */}
          <div className="rounded-xl border border-[#E8E6E2] p-3 bg-[#FAFAF9]">
            <div className="text-xs font-semibold text-[#57534E] mb-2 uppercase tracking-wide">Ledger Preview</div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={cn("text-xs font-bold px-2 py-0.5 rounded",
                  isReceivable ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEF2F2] text-[#DC2626]")}>
                  {entryType}
                </span>
                <CCBadge cc={item?.costCenter} />
              </div>
              <div className={cn("font-mono font-semibold",
                isReceivable ? "text-[#16A34A]" : "text-[#DC2626]")}>
                {isReceivable ? "+" : "−"}{fmtAud(parseFloat(form.actualAmount || "0"))}
              </div>
            </div>
            <div className="text-xs text-[#57534E] mt-1">{form.paidDate}</div>
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm"
              className="bg-[--e-orange] hover:bg-[#d97706] text-white min-w-[150px] gap-1.5"
              onClick={() => onConfirm(form)}
              disabled={saving || !form.actualAmount || !form.paidDate}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5" />Confirm Payment</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  ADD / EDIT ITEM MODAL
// ══════════════════════════════════════════════════════════════════════════
const EMPTY_ITEM_FORM = {
  itemType: "receivable",
  itemCategory: "",
  costCenter: "",
  label: "",
  estimatedAmount: "",
  dueDate: "",
  notes: "",
};

function ItemModal({ mode, initial, open, onClose, onSave, saving }: {
  mode: "add" | "edit"; initial?: any; open: boolean; onClose: () => void;
  onSave: (data: any) => void; saving: boolean;
}) {
  const [form, setForm] = useState({
    itemType: initial?.itemType ?? "receivable",
    itemCategory: initial?.itemCategory ?? "",
    costCenter: initial?.costCenter ?? "",
    label: initial?.label ?? "",
    estimatedAmount: initial?.estimatedAmount ?? "",
    dueDate: initial?.dueDate ?? "",
    notes: initial?.notes ?? "",
  });
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  const catOptions = form.itemType === "receivable" ? RECEIVABLE_CATEGORIES : PAYABLE_CATEGORIES;
  const selectedCat = catOptions.find(c => c.value === form.itemCategory);

  const handleCatChange = (v: string) => {
    const cat = catOptions.find(c => c.value === v);
    setForm(p => ({ ...p, itemCategory: v, costCenter: cat?.cc ?? "" }));
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            {mode === "add"
              ? <><Plus className="w-4 h-4 text-[--e-orange]" /> Add Finance Item</>
              : <><Pencil className="w-4 h-4 text-[--e-orange]" /> Edit Finance Item</>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          {/* Type (radio) */}
          {mode === "add" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Type *</Label>
              <div className="flex gap-2">
                {["receivable", "payable"].map(t => (
                  <button key={t} onClick={() => { f("itemType")(t); setForm(p => ({ ...p, itemType: t, itemCategory: "", costCenter: "" })); }}
                    className={cn("flex-1 py-2 text-sm font-medium rounded-lg border transition-colors capitalize",
                      form.itemType === t
                        ? "bg-[--e-orange-lt] border-[--e-orange] text-[--e-orange]"
                        : "border-[#E8E6E2] text-[#57534E] hover:bg-[#FAFAF9]")}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Category *</Label>
            <Select value={form.itemCategory} onValueChange={handleCatChange}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select category…" /></SelectTrigger>
              <SelectContent>
                {catOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Cost Center (read-only) */}
          {form.costCenter && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#FAFAF9] rounded-lg border border-[#E8E6E2] text-xs text-[#57534E]">
              <span className="font-medium">Cost Center:</span>
              <CCBadge cc={form.costCenter} />
            </div>
          )}

          {/* Label */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Label *</Label>
            <Input placeholder={selectedCat?.label ?? "Item label"}
              value={form.label} onChange={e => f("label")(e.target.value)} className="h-9 text-sm" />
          </div>

          {/* Amount + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Amount (AUD) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#57534E]">A$</span>
                <Input type="number" step="0.01" placeholder="0.00"
                  value={form.estimatedAmount} onChange={e => f("estimatedAmount")(e.target.value)}
                  className="h-9 pl-8 font-mono text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={e => f("dueDate")(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={e => f("notes")(e.target.value)}
              className="text-sm resize-none" placeholder="Optional notes…" />
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm"
              className="bg-[--e-orange] hover:bg-[#d97706] text-white min-w-[100px]"
              onClick={() => onSave(form)}
              disabled={saving || !form.label || !form.estimatedAmount || !form.itemCategory}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "add" ? "Add Item" : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  DELETE CONFIRM
// ══════════════════════════════════════════════════════════════════════════
function DeleteConfirmDialog({ item, open, onClose, onConfirm, saving }: {
  item: any; open: boolean; onClose: () => void; onConfirm: () => void; saving: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-[#DC2626]" /> Delete Finance Item
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[#57534E] mt-1">
          Are you sure you want to delete <strong>"{item?.label}"</strong>?
          This action performs a soft-delete and can be reversed by an admin.
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="bg-[#DC2626] hover:bg-red-700 text-white"
            onClick={onConfirm} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  MAIN: ContractFinanceTab
// ══════════════════════════════════════════════════════════════════════════
export function ContractFinanceTab({ contractId, currency = "AUD" }: {
  contractId: string; currency?: string;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();

  // Modal state
  const [confirmItem, setConfirmItem]   = useState<any>(null);
  const [editItem, setEditItem]         = useState<any>(null);
  const [deleteItem, setDeleteItem]     = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType]           = useState<"receivable" | "payable">("receivable");

  // ── Queries ──────────────────────────────────────────────────────────
  const { data: financeData, isLoading: financeLoading } = useQuery({
    queryKey: ["contract-finance", contractId],
    queryFn: () => axios.get(`${BASE}/api/contracts/${contractId}/finance`).then(r => r.data),
    staleTime: 30_000,
  });

  const { data: ledgerData, isLoading: ledgerLoading } = useQuery({
    queryKey: ["contract-finance-ledger", contractId],
    queryFn: () => axios.get(`${BASE}/api/contracts/${contractId}/finance/ledger`).then(r => r.data),
    staleTime: 30_000,
  });

  const receivable: any[] = financeData?.receivable ?? [];
  const payable: any[]    = financeData?.payable ?? [];
  const summary           = financeData?.summary ?? {};
  const ledgerEntries: any[] = ledgerData?.data ?? [];

  const noItems = receivable.length === 0 && payable.length === 0 && !financeLoading;

  // ── Mutations ─────────────────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["contract-finance", contractId] });
    qc.invalidateQueries({ queryKey: ["contract-finance-ledger", contractId] });
  };

  const generateMutation = useMutation({
    mutationFn: () => axios.post(`${BASE}/api/contracts/${contractId}/finance/generate`).then(r => r.data),
    onSuccess: (d) => {
      invalidate();
      toast({ title: d.created > 0 ? `${d.created} finance items generated` : "Already generated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to generate finance items" }),
  });

  const addItemMutation = useMutation({
    mutationFn: (payload: any) =>
      axios.post(`${BASE}/api/contracts/${contractId}/finance/items`, payload).then(r => r.data),
    onSuccess: () => { invalidate(); setShowAddModal(false); toast({ title: "Finance item added" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to add item" }),
  });

  const editItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      axios.put(`${BASE}/api/finance/items/${id}`, data).then(r => r.data),
    onSuccess: () => { invalidate(); setEditItem(null); toast({ title: "Item updated" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to update item" }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/finance/items/${id}`).then(r => r.data),
    onSuccess: () => { invalidate(); setDeleteItem(null); toast({ title: "Item deleted" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to delete item" }),
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      axios.post(`${BASE}/api/finance/items/${id}/confirm-payment`, payload).then(r => r.data),
    onSuccess: (data) => {
      invalidate();
      setConfirmItem(null);
      const rcptNum = data?.receipt?.receiptNumber;
      toast({ title: "Payment confirmed" + (rcptNum ? ` — ${rcptNum}` : ""), description: rcptNum ? "Receipt generated automatically." : undefined });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to confirm payment" }),
  });

  // ── Export CSV ────────────────────────────────────────────────────────
  const exportCsv = () => {
    if (ledgerEntries.length === 0) return;
    const header = ["Date", "Type", "Cost Center", "Description", "Amount", "Currency", "Status"];
    const rows = ledgerEntries.map((e: any) => [
      e.transactionDate,
      e.entryType,
      e.costCenter ?? "",
      e.description ?? "",
      e.entryType === "credit" ? `+${e.amount}` : `-${e.amount}`,
      e.currency ?? "AUD",
      e.status ?? "",
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledger-${contractId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleAddItem = (type: "receivable" | "payable") => {
    setAddType(type);
    setShowAddModal(true);
  };

  const handleSaveAdd = (form: any) => {
    if (!form.label || !form.estimatedAmount || !form.itemCategory) return;
    addItemMutation.mutate({
      itemType: form.itemType,
      itemCategory: form.itemCategory,
      costCenter: form.costCenter,
      label: form.label,
      estimatedAmount: form.estimatedAmount,
      dueDate: form.dueDate || null,
      notes: form.notes || null,
    });
  };

  const handleSaveEdit = (form: any) => {
    if (!editItem) return;
    editItemMutation.mutate({
      id: editItem.id,
      data: {
        label: form.label,
        estimatedAmount: form.estimatedAmount,
        dueDate: form.dueDate || null,
        notes: form.notes || null,
        costCenter: form.costCenter,
      },
    });
  };

  const handleConfirmPayment = (form: any) => {
    if (!confirmItem) return;
    confirmPaymentMutation.mutate({
      id: confirmItem.id,
      payload: {
        actualAmount: parseFloat(form.actualAmount),
        paidDate: form.paidDate,
        referenceNo: form.referenceNo || undefined,
        paymentMethod: form.paymentMethod || undefined,
        notes: form.notes || undefined,
      },
    });
  };

  // ── Cost Center Breakdown data ─────────────────────────────────────────
  const breakdown: Array<{ center: string; label: string; amount: number }> =
    summary.costCenterBreakdown ?? [];
  const totalBreakdown = breakdown.reduce((a: number, b: any) => a + b.amount, 0);

  // ── Net balance from ledger ───────────────────────────────────────────
  const netBalance = ledgerEntries.reduce((acc: number, e: any) => {
    const amt = parseFloat(e.amount ?? "0");
    return e.entryType === "credit" ? acc + amt : acc - amt;
  }, 0);

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Generate prompt if no items ─────────────────────────────── */}
      {noItems && (
        <div className="text-center py-10 border border-dashed border-[#E8E6E2] rounded-xl">
          <DollarSign className="w-10 h-10 mx-auto mb-2 text-[#E8E6E2]" />
          <p className="text-sm text-[#57534E] mb-3">No finance items yet.</p>
          <Button size="sm"
            className="bg-[--e-orange] hover:bg-[#d97706] text-white gap-1.5"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}>
            {generateMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><Zap className="w-3.5 h-3.5" />Auto-Generate Finance Items</>}
          </Button>
          <p className="text-xs text-[#57534E] mt-2 opacity-70">Based on linked package products and agent commission settings</p>
        </div>
      )}

      {financeLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
        </div>
      )}

      {!financeLoading && !noItems && (
        <>
          {/* ── [1] P&L Summary ──────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard label="Total Revenue" amount={summary.totalFee ?? 0}
              icon={<TrendingUp className="w-3.5 h-3.5" />} />
            <SummaryCard label="Agent Commission" amount={summary.agentCommission ?? 0}
              icon={<TrendingDown className="w-3.5 h-3.5 text-[#DC2626]" />}
              amountClass="text-[#DC2626]" />
            <SummaryCard label="Net Camp Revenue" amount={summary.netCampRevenue ?? 0}
              icon={<DollarSign className="w-3.5 h-3.5 text-[--e-orange]" />}
              amountClass="text-[--e-orange]" />
            <SummaryCard
              label="Gross Profit"
              amount={summary.grossProfit ?? 0}
              icon={<TrendingUp className="w-3.5 h-3.5" />}
              amountClass={(summary.grossProfit ?? 0) >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}
            />
          </div>

          {/* Regenerate button (small) */}
          <div className="flex justify-end">
            <button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}
              className="flex items-center gap-1.5 text-xs text-[#57534E] hover:text-[--e-orange] transition-colors">
              <RefreshCw className={cn("w-3 h-3", generateMutation.isPending && "animate-spin")} />
              Re-generate items
            </button>
          </div>

          {/* ── [2] Receivable ───────────────────────────────────────── */}
          <div className="border border-[#E8E6E2] rounded-xl overflow-hidden">
            <SectionHeader
              title="Receivable"
              subtitle={`${receivable.length} items · Pending: ${fmtAud(summary.receivablePending)} · Paid: ${fmtAud(summary.receivablePaid)}`}
              onAdd={() => handleAddItem("receivable")}
            />
            {receivable.length === 0 ? (
              <div className="px-4 py-8 text-sm text-center text-[#57534E]">No receivable items</div>
            ) : (
              receivable.map(item => (
                <FinanceRow key={item.id} item={item} currency={currency}
                  onConfirm={setConfirmItem} onEdit={setEditItem} onDelete={setDeleteItem} />
              ))
            )}
          </div>

          {/* ── [3] Payable ──────────────────────────────────────────── */}
          <div className="border border-[#E8E6E2] rounded-xl overflow-hidden">
            <SectionHeader
              title="Payable"
              subtitle={`${payable.length} items · Pending: ${fmtAud(summary.payablePending)} · Paid: ${fmtAud(summary.payablePaid)}`}
              onAdd={() => handleAddItem("payable")}
            />
            {payable.length === 0 ? (
              <div className="px-4 py-8 text-sm text-center text-[#57534E]">No payable items</div>
            ) : (
              payable.map(item => (
                <FinanceRow key={item.id} item={item} currency={currency}
                  onConfirm={setConfirmItem} onEdit={setEditItem} onDelete={setDeleteItem} />
              ))
            )}
          </div>

          {/* ── [4] Cost Center Breakdown ─────────────────────────────── */}
          {breakdown.length > 0 && (
            <div className="border border-[#E8E6E2] rounded-xl p-4">
              <div className="text-sm font-semibold text-[#1C1917] mb-3">Cost Center Breakdown</div>
              <div className="space-y-2.5">
                {breakdown
                  .sort((a: any, b: any) => b.amount - a.amount)
                  .map((row: any) => {
                    const pct = totalBreakdown > 0 ? (row.amount / totalBreakdown) * 100 : 0;
                    const barClass = row.center.startsWith("RC-")
                      ? "bg-[--e-orange]"
                      : row.center === "CC-AGENT"
                        ? "bg-[#DC2626]"
                        : "bg-[#A8A29E]";
                    return (
                      <div key={row.center} className="flex items-center gap-3">
                        <div className="w-28 shrink-0 flex items-center gap-1.5">
                          <CCBadge cc={row.center} />
                        </div>
                        <div className="flex-1 h-5 bg-[#E8E6E2] rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", barClass)}
                            style={{ width: `${pct.toFixed(1)}%` }} />
                        </div>
                        <div className="w-32 text-right shrink-0">
                          <span className="text-xs font-mono font-semibold text-[#1C1917]">{fmtAud(row.amount)}</span>
                          <span className="text-xs text-[#57534E] ml-1">({pct.toFixed(0)}%)</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ── [5] User Ledger ──────────────────────────────────────── */}
          <div className="border border-[#E8E6E2] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E6E2] bg-[#FAFAF9]">
              <div className="text-sm font-semibold text-[#1C1917]">Ledger</div>
              {ledgerEntries.length > 0 && (
                <button onClick={exportCsv}
                  className="flex items-center gap-1.5 text-xs text-[#57534E] hover:text-[--e-orange] transition-colors">
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              )}
            </div>

            {ledgerLoading ? (
              <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : ledgerEntries.length === 0 ? (
              <div className="px-4 py-8 text-sm text-center text-[#57534E]">No ledger entries yet. Confirm a payment to create entries.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E8E6E2] bg-[#FAFAF9]">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-[#57534E]">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-[#57534E]">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-[#57534E]">Cost Center</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-[#57534E]">Description</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-[#57534E]">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.map((e: any) => (
                      <tr key={e.id} className="border-b border-[#E8E6E2] last:border-0 hover:bg-[#FAFAF9]">
                        <td className="px-4 py-2.5 text-xs text-[#57534E] whitespace-nowrap">
                          {formatDate(e.transactionDate)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={cn("text-xs font-bold px-2 py-0.5 rounded",
                            e.entryType === "credit" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEF2F2] text-[#DC2626]")}>
                            {e.entryType?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <CCBadge cc={e.costCenter} />
                        </td>
                        <td className="px-4 py-2.5 text-xs text-[#57534E] max-w-xs truncate">{e.description ?? "—"}</td>
                        <td className={cn("px-4 py-2.5 text-right font-mono text-sm font-semibold whitespace-nowrap",
                          e.entryType === "credit" ? "text-[#16A34A]" : "text-[#DC2626]")}>
                          {e.entryType === "credit" ? "+" : "−"}{fmtAud(e.amount, e.currency)}
                        </td>
                      </tr>
                    ))}
                    {/* Net Balance row */}
                    <tr className="border-t-2 border-[#E8E6E2] bg-[#FAFAF9]">
                      <td colSpan={4} className="px-4 py-2.5 text-xs font-bold text-[#1C1917]">Net Balance</td>
                      <td className={cn("px-4 py-2.5 text-right font-mono text-sm font-bold",
                        netBalance >= 0 ? "text-[--e-orange]" : "text-[#DC2626]")}>
                        {netBalance >= 0 ? "+" : "−"}{fmtAud(Math.abs(netBalance))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {confirmItem && (
        <ConfirmPaymentModal
          item={confirmItem}
          contractCurrency={currency}
          open={!!confirmItem}
          onClose={() => setConfirmItem(null)}
          onConfirm={handleConfirmPayment}
          saving={confirmPaymentMutation.isPending}
        />
      )}

      {showAddModal && (
        <ItemModal
          mode="add"
          initial={{ itemType: addType }}
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveAdd}
          saving={addItemMutation.isPending}
        />
      )}

      {editItem && (
        <ItemModal
          mode="edit"
          initial={editItem}
          open={!!editItem}
          onClose={() => setEditItem(null)}
          onSave={handleSaveEdit}
          saving={editItemMutation.isPending}
        />
      )}

      {deleteItem && (
        <DeleteConfirmDialog
          item={deleteItem}
          open={!!deleteItem}
          onClose={() => setDeleteItem(null)}
          onConfirm={() => deleteItemMutation.mutate(deleteItem.id)}
          saving={deleteItemMutation.isPending}
        />
      )}
    </div>
  );
}
