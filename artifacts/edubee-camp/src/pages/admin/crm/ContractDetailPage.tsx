import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { SystemInfoSection } from "@/components/shared/SystemInfoSection";
import axios from "axios";
import {
  ArrowLeft, ExternalLink, FileText, CreditCard, GraduationCap,
  Car, Building2, Briefcase, Shield, CheckCircle2, Clock,
  AlertCircle, ChevronRight, Star, TrendingUp, TrendingDown,
  UploadCloud, MessageSquare, Send, Download, Pencil, Plus, X, Wrench, Map, Stamp, Trash2,
} from "lucide-react";
import { format } from "date-fns";
import PaymentStatementModal from "../../../components/finance/PaymentStatementModal";
import { ClientNameDisplay } from "@/components/common/ClientNameDisplay";
import { nameFromAccount } from "@/lib/nameUtils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtDate = (d?: string | null) => (d ? format(new Date(d), "dd MMM yyyy") : "—");
const fmtMoney = (n?: number | null) =>
  n != null ? `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
const fmtNum = (n?: number | null) => (n != null ? n.toLocaleString() : "—");

const AR_BADGE: Record<string, string> = {
  scheduled: "bg-[#F4F3F1] text-[#57534E]",
  invoiced:  "bg-[#FEF0E3] text-[#F5821F]",
  overdue:   "bg-[#FEF2F2] text-[#DC2626]",
  partial:   "bg-[#FEF9C3] text-[#CA8A04]",
  paid:      "bg-[#DCFCE7] text-[#16A34A]",
};
const AP_BADGE: Record<string, string> = {
  pending: "bg-[#F4F3F1] text-[#57534E]",
  ready:   "bg-[#FEF0E3] text-[#F5821F]",
  paid:    "bg-[#DCFCE7] text-[#16A34A]",
  overdue: "bg-[#FEF2F2] text-[#DC2626]",
};
const CONTRACT_STATUS_BADGE: Record<string, string> = {
  active:      "bg-[#DCFCE7] text-[#16A34A]",
  "in progress": "bg-[#FEF0E3] text-[#F5821F]",
  overdue:     "bg-[#FEF2F2] text-[#DC2626]",
  completed:   "bg-[#F4F3F1] text-[#57534E]",
  draft:       "bg-[#F4F3F1] text-[#A8A29E]",
};

function Badge({ s, map }: { s?: string; map: Record<string, string> }) {
  if (!s) return null;
  const cls = map[s.toLowerCase()] ?? "bg-[#F4F3F1] text-[#57534E]";
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null | React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-[#F4F3F1] last:border-0">
      <span className="text-[12px] text-[#A8A29E] font-medium shrink-0 mr-4">{label}</span>
      <span className="text-[13px] text-[#1C1917] text-right">{value ?? "—"}</span>
    </div>
  );
}

// ── Tabs ───────────────────────────────────────────────────────────────────
const TABS = [
  { key: "overview",     label: "Overview"          },
  { key: "services",     label: "Services"          },
  { key: "schedule",     label: "Payment Schedule"  },
  { key: "invoices",     label: "Invoices"          },
  { key: "payments",     label: "Payments"          },
  { key: "transactions", label: "Transactions"      },
  { key: "commission",   label: "Commission / Cost" },
  { key: "documents",    label: "Documents"         },
  { key: "activity",     label: "Activity"          },
] as const;
type TabKey = (typeof TABS)[number]["key"];

// ── Overview Tab ───────────────────────────────────────────────────────────
function OverviewTab({ contract, onEditContract, primaryServiceType, setPrimaryServiceType, onAddService }: {
  contract: any;
  onEditContract: () => void;
  primaryServiceType: string;
  setPrimaryServiceType: (s: string) => void;
  onAddService: (defaultType?: string) => void;
}) {
  const [, navigate] = useLocation();
  const arPct = contract.totalArAmount > 0
    ? Math.round((((contract.totalArAmount - (contract.arOutstanding ?? 0)) / contract.totalArAmount) * 100))
    : 0;
  const readyItems = (contract.contractProducts ?? []).filter((cp: any) => cp.apStatus === "ready");

  return (
    <div className="grid grid-cols-3 gap-5">
      {/* Left: Contract Details */}
      <div className="space-y-4">
        <div className="bg-white border border-[#E8E6E2] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#1C1917]">Contract Details</h3>
            <button onClick={onEditContract}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#F4F3F1] transition-colors text-[#A8A29E] hover:text-[#57534E]">
              <Pencil size={13} />
            </button>
          </div>
          <InfoRow label="Quote Ref" value={
            contract.quote?.id && contract.quote?.quoteRefNumber
              ? (
                <button
                  onClick={() => navigate(`/admin/crm/quotes/${contract.quote.id}`)}
                  className="font-mono text-[#F5821F] hover:text-[#E5721F] hover:underline flex items-center gap-1 text-right"
                >
                  {contract.quote.quoteRefNumber}
                  <ExternalLink size={11} />
                </button>
              )
              : (contract.quote?.quoteRefNumber ?? "—")
          } />
          <InfoRow label="Payment Count"   value={
            contract.contractProducts?.length
              ? `${contract.contractProducts.length} instalment${contract.contractProducts.length > 1 ? "s" : ""}`
              : "—"
          } />
          <InfoRow label="Contract From"   value={fmtDate(contract.fromDate)} />
          <InfoRow label="Contract To"     value={fmtDate(contract.toDate)} />
          {contract.fromDate && contract.toDate && (() => {
            const days = Math.round((new Date(contract.toDate).getTime() - new Date(contract.fromDate).getTime()) / 86400000) + 1;
            return <InfoRow label="Duration" value={
              <span className="font-semibold" style={{ color:"#F5821F" }}>{days === 1 ? "1 day" : `${days} days`}</span>
            } />;
          })()}
          <InfoRow label="Notes"           value={contract.notes} />
        </div>
      </div>

      {/* Center: AR/AP + Alerts */}
      <div className="space-y-4">
        <div className="bg-white border border-[#E8E6E2] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#1C1917] mb-3">AR / AP Progress</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-[#57534E] mb-1">
                <span>AR Collected</span>
                <span className="font-medium" style={{ color:"#F5821F" }}>{fmtMoney(contract.totalArAmount)}</span>
              </div>
              <div className="h-2 rounded-full bg-[#F4F3F1] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(arPct,100)}%`, background:"#F5821F" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-[#57534E] mb-1">
                <span>AP Remitted</span>
                <span className="font-medium" style={{ color:"#DC2626" }}>{fmtMoney(contract.totalApAmount)}</span>
              </div>
              <div className="h-2 rounded-full bg-[#F4F3F1] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(arPct,100)}%`, background:"#DC2626" }} />
              </div>
            </div>
          </div>
        </div>

        {readyItems.length > 0 && (
          <div className="border border-[#F5821F]/30 rounded-xl p-4" style={{ background:"#FFFCF9" }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} style={{ color:"#F5821F" }} />
              <span className="text-sm font-semibold" style={{ color:"#F5821F" }}>Action Required</span>
            </div>
            <p className="text-xs text-[#57534E]">
              {readyItems.length} AP instalment{readyItems.length > 1 ? "s" : ""} are ready to be remitted.
            </p>
          </div>
        )}
      </div>

      {/* Right: Services Panel */}
      <div>
        <ServicesPanel
          contract={contract}
          primaryServiceType={primaryServiceType}
          setPrimaryServiceType={setPrimaryServiceType}
          onAddService={onAddService}
        />
      </div>
    </div>
  );
}

// ── Statement History Section ───────────────────────────────────────────────
function StatementHistorySection({ contractId, onGenerate }: { contractId: string; onGenerate: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["payment-statements", contractId],
    queryFn: () =>
      axios.get(`${BASE}/api/statements/by-contract/${contractId}`).then(r => r.data.data ?? []),
    enabled: !!contractId,
  });
  const rows: any[] = data ?? [];

  const STMT_BADGE: Record<string, string> = {
    issued: "bg-[#F4F3F1] text-[#57534E]",
    sent:   "bg-[#DCFCE7] text-[#16A34A]",
    voided: "bg-[#FEF2F2] text-[#DC2626]",
  };

  return (
    <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-x-auto">
      <div className="px-5 py-3 border-b border-[#E8E6E2] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-[#F5821F]" />
          <h3 className="text-sm font-semibold text-[#1C1917]">Payment Statements ({rows.length})</h3>
        </div>
        <button
          onClick={onGenerate}
          className="h-8 px-3 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 transition-opacity hover:opacity-90"
          style={{ background:"#F5821F" }}>
          <FileText size={12} /> Generate Payment Statement
        </button>
      </div>
      {isLoading ? (
        <div className="px-5 py-6 text-center text-sm text-[#A8A29E]">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <FileText size={24} className="mx-auto mb-2 text-[#E8E6E2]" />
          <p className="text-sm text-[#A8A29E]">No statements issued yet</p>
          <p className="text-[11px] text-[#A8A29E] mt-1">Generate one for visa submissions or parent requests</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E6E2]" style={{ background:"#FAFAF9" }}>
                {["Ref","Date","Scope","Reason","Paid","Outstanding","Status","Issued By","PDF"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s: any) => (
                <tr key={s.id} className="border-b border-[#E8E6E2] hover:bg-[#FAFAF9] transition-colors">
                  <td className="px-4 py-3 font-mono text-[12px] font-semibold" style={{ color:"#F5821F" }}>{s.statementRef}</td>
                  <td className="px-4 py-3 text-[12px] text-[#57534E]">{fmtDate(s.statementDate)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F4F3F1] text-[#57534E]">
                      {s.statementScope}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#57534E]">{s.issueReason ?? "—"}</td>
                  <td className="px-4 py-3 text-[12px] font-semibold text-[#16A34A]">{fmtMoney(s.totalPaidAmount)}</td>
                  <td className="px-4 py-3 text-[12px] font-semibold text-[#DC2626]">{fmtMoney(s.totalOutstanding)}</td>
                  <td className="px-4 py-3"><Badge s={s.status} map={STMT_BADGE} /></td>
                  <td className="px-4 py-3 text-[12px] text-[#57534E]">{s.issuedByName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => window.open(`${BASE}/api/statements/${s.id}/pdf`, "_blank")}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[#E8E6E2] text-[11px] text-[#57534E] hover:bg-[#F4F3F1] transition-colors">
                      <Download size={11} /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Per-row invoice printer ────────────────────────────────────────────────
function printInstalment(cp: any, contract: any, idx: number) {
  const clientName = contract.account?.name ?? contract.studentName ?? "Client";
  const clientEmail = contract.clientEmail ?? contract.account?.email ?? "";
  const refNum = contract.contractRefDisplay ?? "";
  const quoteRef = contract.quote?.quoteRefNumber ?? "";
  const instNo = idx + 1;
  const invRef = `INV-${refNum}-${String(instNo).padStart(2, "0")}`;
  const itemName = cp.name ?? `Instalment ${instNo}`;
  const amount = fmtMoney(cp.arAmount);
  const dueDate = fmtDate(cp.arDueDate);
  const todayDate = format(new Date(), "dd MMM yyyy");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>${invRef}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;color:#333;padding:40px;font-size:13px;max-width:720px;margin:0 auto}
      .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:3px solid #F5821F;margin-bottom:28px}
      .brand{font-size:24px;font-weight:700;color:#F5821F}
      .brand-sub{font-size:12px;color:#aaa;margin-top:3px}
      .inv-label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#aaa;text-align:right}
      .inv-ref{font-size:20px;font-weight:700;color:#1C1917;text-align:right;margin-top:2px}
      .inv-date{font-size:12px;color:#888;text-align:right;margin-top:2px}
      .section{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px}
      .section-label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#aaa;margin-bottom:6px}
      .section-val{font-size:14px;font-weight:600;color:#1C1917}
      .section-sub{font-size:12px;color:#888;margin-top:2px}
      table{width:100%;border-collapse:collapse;margin-bottom:24px}
      th{background:#fdf8f4;padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#888;border-bottom:2px solid #e5e0db}
      td{padding:12px 14px;border-bottom:1px solid #f0ece8;vertical-align:top}
      .total-row{background:#fdf8f4;font-weight:700}
      .total-row td{border-top:2px solid #e5e0db;border-bottom:none;font-size:15px}
      .total-row td:last-child{color:#F5821F;font-size:20px}
      .due-box{display:inline-block;background:#FEF0E3;color:#F5821F;border:1px solid #F5821F;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:700;margin-bottom:24px}
      .status-badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;background:${cp.arStatus === "paid" ? "#DCFCE7;color:#16A34A" : cp.arStatus === "overdue" ? "#FEF2F2;color:#DC2626" : "#F4F3F1;color:#57534E"}}
      .footer{margin-top:32px;font-size:11px;color:#aaa;text-align:center;border-top:1px solid #f0ece8;padding-top:12px}
    </style>
  </head><body>
    <div class="header">
      <div>
        <div class="brand">Edubee Camp</div>
        <div class="brand-sub">Payment Invoice</div>
      </div>
      <div>
        <div class="inv-label">Invoice</div>
        <div class="inv-ref">${invRef}</div>
        <div class="inv-date">Issued: ${todayDate}</div>
        ${quoteRef ? `<div class="inv-date">Quote: ${quoteRef}</div>` : ""}
      </div>
    </div>

    <div class="section">
      <div>
        <div class="section-label">Bill To</div>
        <div class="section-val">${clientName}</div>
        ${clientEmail ? `<div class="section-sub">${clientEmail}</div>` : ""}
      </div>
      <div>
        <div class="section-label">Contract</div>
        <div class="section-val">${refNum}</div>
        <div class="section-sub">Instalment ${instNo} of ${contract.contractProducts?.length ?? "?"}</div>
      </div>
    </div>

    ${dueDate !== "—" ? `<div class="due-box">Payment Due: ${dueDate}</div>` : ""}

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Service</th>
          <th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div style="font-weight:600;color:#1C1917">${itemName}</div>
            ${cp.isInitialPayment ? `<div style="font-size:11px;color:#CA8A04;margin-top:2px">★ Initial Payment</div>` : ""}
          </td>
          <td style="color:#888;font-size:12px">${cp.serviceModuleType ? cp.serviceModuleType.replace(/_/g," ").replace(/\b\w/g,(c: string)=>c.toUpperCase()) : "—"}</td>
          <td style="text-align:right;font-weight:700;font-size:15px">${amount}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="2" style="text-align:right">Total Due</td>
          <td style="text-align:right">${amount}</td>
        </tr>
      </tfoot>
    </table>

    <div style="margin-top:8px">
      <span class="section-label">Status: </span>
      <span class="status-badge">${cp.arStatus ?? "scheduled"}</span>
    </div>

    <div class="footer">
      Thank you for your business · Edubee Camp · Generated ${todayDate}
    </div>
    <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\/script>
  </body></html>`;

  const w = window.open("", "_blank", "width=860,height=700");
  if (w) { w.document.write(html); w.document.close(); }
}

// ── Payment Schedule Tab ───────────────────────────────────────────────────
const AR_STATUS_OPTIONS = ["scheduled","paid","partial","overdue","waived"];
const AP_STATUS_OPTIONS = ["pending","ready","sent","paid","partial"];

type CpDraft = {
  id: string | null;
  name: string;
  isInitialPayment: boolean;
  arDueDate: string;
  arAmount: string;
  arStatus: string;
  apDueDate: string;
  apAmount: string;
  apStatus: string;
};

function ScheduleEditRow({
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
  errMsg,
}: {
  draft: CpDraft;
  onChange: (k: keyof CpDraft, v: any) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  errMsg: string;
}) {
  const inp = "h-8 border border-[#E8E6E2] rounded-lg px-2 text-xs focus:outline-none focus:border-[#F5821F] w-full";
  const sel = inp + " bg-white";
  return (
    <>
      <tr className="border-b border-[#E8E6E2] bg-[#FFFCF9]">
        <td className="px-2 py-2 text-xs text-[#A8A29E]">—</td>
        {/* Label + Initial */}
        <td className="px-2 py-2">
          <div className="flex flex-col gap-1">
            <input className={inp} value={draft.name} onChange={e => onChange("name", e.target.value)} placeholder="Label" />
            <label className="flex items-center gap-1 text-[11px] text-[#A8A29E] cursor-pointer select-none">
              <input type="checkbox" checked={draft.isInitialPayment} onChange={e => onChange("isInitialPayment", e.target.checked)} />
              Initial
            </label>
          </div>
        </td>
        {/* AR */}
        <td className="px-2 py-2"><input type="date" className={inp} value={draft.arDueDate} onChange={e => onChange("arDueDate", e.target.value)} /></td>
        <td className="px-2 py-2"><input type="number" min="0" step="0.01" className={inp} value={draft.arAmount} onChange={e => onChange("arAmount", e.target.value)} placeholder="0.00" /></td>
        <td className="px-2 py-2">
          <select className={sel} value={draft.arStatus} onChange={e => onChange("arStatus", e.target.value)}>
            {AR_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </td>
        {/* AP */}
        <td className="px-2 py-2"><input type="date" className={inp} value={draft.apDueDate} onChange={e => onChange("apDueDate", e.target.value)} /></td>
        <td className="px-2 py-2"><input type="number" min="0" step="0.01" className={inp} value={draft.apAmount} onChange={e => onChange("apAmount", e.target.value)} placeholder="0.00" /></td>
        <td className="px-2 py-2">
          <select className={sel} value={draft.apStatus} onChange={e => onChange("apStatus", e.target.value)}>
            {AP_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </td>
        {/* Actions */}
        <td className="px-2 py-2">
          <div className="flex items-center gap-1">
            <button onClick={onSave} disabled={saving}
              className="h-7 px-3 rounded-lg text-[11px] font-semibold text-white disabled:opacity-50"
              style={{ background:"#F5821F" }}>
              {saving ? "…" : "Save"}
            </button>
            <button onClick={onCancel} className="h-7 px-2 rounded-lg text-[11px] border border-[#E8E6E2] text-[#57534E] hover:bg-[#F4F3F1]">
              ✕
            </button>
          </div>
        </td>
      </tr>
      {errMsg && (
        <tr className="bg-red-50">
          <td colSpan={9} className="px-4 py-1 text-[11px] text-red-600">{errMsg}</td>
        </tr>
      )}
    </>
  );
}

function PaymentScheduleTab({ contract }: { contract: any }) {
  const products: any[] = contract.contractProducts ?? [];
  const totalAr = products.reduce((s: number, p: any) => s + (p.arAmount ?? 0), 0);
  const totalAp = products.reduce((s: number, p: any) => s + (p.apAmount ?? 0), 0);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const qc = useQueryClient();

  const [editingId, setEditingId]   = useState<string | null>(null);
  const [draft,     setDraft]       = useState<CpDraft | null>(null);
  const [saving,    setSaving]      = useState(false);
  const [errMsg,    setErrMsg]      = useState("");
  const [addingNew, setAddingNew]   = useState(false);
  const [newDraft,  setNewDraft]    = useState<CpDraft | null>(null);
  const [deleting,  setDeleting]    = useState<string | null>(null);

  const makeDraft = (cp: any): CpDraft => ({
    id: cp.id,
    name: cp.name ?? "",
    isInitialPayment: cp.isInitialPayment ?? false,
    arDueDate: cp.arDueDate?.slice(0, 10) ?? "",
    arAmount: cp.arAmount != null ? String(cp.arAmount) : "",
    arStatus: cp.arStatus ?? "scheduled",
    apDueDate: cp.apDueDate?.slice(0, 10) ?? "",
    apAmount: cp.apAmount != null ? String(cp.apAmount) : "",
    apStatus: cp.apStatus ?? "pending",
  });

  const startEdit = (cp: any) => {
    setEditingId(cp.id);
    setDraft(makeDraft(cp));
    setErrMsg("");
    setAddingNew(false);
    setNewDraft(null);
  };

  const cancelEdit = () => { setEditingId(null); setDraft(null); setErrMsg(""); };

  const startAdd = () => {
    setAddingNew(true);
    setNewDraft({ id: null, name: "", isInitialPayment: false, arDueDate: "", arAmount: "", arStatus: "scheduled", apDueDate: "", apAmount: "", apStatus: "pending" });
    setEditingId(null);
    setDraft(null);
    setErrMsg("");
  };

  const cancelAdd = () => { setAddingNew(false); setNewDraft(null); setErrMsg(""); };

  const saveEdit = async () => {
    if (!draft) return;
    setSaving(true); setErrMsg("");
    try {
      await axios.patch(`${BASE}/api/crm/contract-products/${draft.id}`, {
        name: draft.name || null,
        isInitialPayment: draft.isInitialPayment,
        arDueDate: draft.arDueDate || null,
        arAmount: draft.arAmount !== "" ? draft.arAmount : null,
        arStatus: draft.arStatus,
        apDueDate: draft.apDueDate || null,
        apAmount: draft.apAmount !== "" ? draft.apAmount : null,
        apStatus: draft.apStatus,
      });
      qc.invalidateQueries({ queryKey: ["crm-contract", contract.id] });
      cancelEdit();
    } catch (e: any) {
      setErrMsg(e?.response?.data?.error ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveNew = async () => {
    if (!newDraft) return;
    setSaving(true); setErrMsg("");
    try {
      await axios.post(`${BASE}/api/crm/contract-products`, {
        contractId: contract.id,
        name: newDraft.name || null,
        isInitialPayment: newDraft.isInitialPayment,
        sortIndex: products.length,
        arDueDate: newDraft.arDueDate || null,
        arAmount: newDraft.arAmount !== "" ? newDraft.arAmount : null,
        arStatus: newDraft.arStatus,
        apDueDate: newDraft.apDueDate || null,
        apAmount: newDraft.apAmount !== "" ? newDraft.apAmount : null,
        apStatus: newDraft.apStatus,
      });
      qc.invalidateQueries({ queryKey: ["crm-contract", contract.id] });
      cancelAdd();
    } catch (e: any) {
      setErrMsg(e?.response?.data?.error ?? "Add failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cpId: string) => {
    if (!window.confirm("이 인스톨먼트를 삭제하시겠습니까?")) return;
    setDeleting(cpId);
    try {
      await axios.delete(`${BASE}/api/crm/contract-products/${cpId}`);
      qc.invalidateQueries({ queryKey: ["crm-contract", contract.id] });
    } catch (e: any) {
      alert(e?.response?.data?.error ?? "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  const changeDraft = (k: keyof CpDraft, v: any) => setDraft(prev => prev ? { ...prev, [k]: v } : prev);
  const changeNew   = (k: keyof CpDraft, v: any) => setNewDraft(prev => prev ? { ...prev, [k]: v } : prev);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-x-auto">
        <div className="px-5 py-3 border-b border-[#E8E6E2] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1C1917]">Payment Schedule ({products.length})</h3>
          {!addingNew && (
            <button onClick={startAdd}
              className="h-8 px-3 rounded-lg border border-[#E8E6E2] text-xs font-medium flex items-center gap-1.5 transition-colors hover:bg-[#FEF0E3] hover:border-[#F5821F] hover:text-[#F5821F]"
              style={{ color:"#57534E" }}>
              <Plus size={12} /> Add Instalment
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E6E2]" style={{ background:"#FAFAF9" }}>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">#</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">Label</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#0369A1]">AR Due Date</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#0369A1]">AR Amount</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#0369A1]">AR Status</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#9A3412]">AP Due Date</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#9A3412]">AP Amount</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#9A3412]">AP Status</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((cp: any, i: number) =>
                editingId === cp.id && draft ? (
                  <ScheduleEditRow key={cp.id}
                    draft={draft}
                    onChange={changeDraft}
                    onSave={saveEdit}
                    onCancel={cancelEdit}
                    saving={saving}
                    errMsg={errMsg}
                  />
                ) : (
                  <tr key={cp.id}
                    className="border-b border-[#E8E6E2] transition-colors group"
                    style={cp.apStatus === "ready" ? { background:"#FFFCF9" } : {}}>
                    <td className="px-4 py-3 text-xs text-[#A8A29E]">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {cp.isInitialPayment && <span className="text-[#CA8A04] text-xs">★</span>}
                        {cp.apStatus === "ready" && <AlertCircle size={12} style={{ color:"#F5821F" }} />}
                        <span className="text-[13px] text-[#1C1917] font-medium">{cp.name ?? `Instalment ${i + 1}`}</span>
                      </div>
                      {cp.serviceModuleType && (
                        <div className="text-[11px] text-[#A8A29E] mt-0.5">{cp.serviceModuleType}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#57534E]">{fmtDate(cp.arDueDate)}</td>
                    <td className="px-4 py-3 text-right text-[13px] font-semibold text-[#1C1917]">{fmtMoney(cp.arAmount)}</td>
                    <td className="px-4 py-3"><Badge s={cp.arStatus} map={AR_BADGE} /></td>
                    <td className="px-4 py-3 text-[12px] text-[#57534E]">{fmtDate(cp.apDueDate)}</td>
                    <td className="px-4 py-3 text-right text-[13px] font-semibold text-[#1C1917]">{fmtMoney(cp.apAmount)}</td>
                    <td className="px-4 py-3"><Badge s={cp.apStatus} map={AP_BADGE} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => printInstalment(cp, contract, i)}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-[#E8E6E2] text-[11px] font-medium text-[#57534E] hover:bg-[#FEF0E3] hover:border-[#F5821F] hover:text-[#F5821F] transition-colors"
                          title="Invoice">
                          <Download size={11} />
                        </button>
                        <button onClick={() => startEdit(cp)}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-[#E8E6E2] text-[11px] text-[#57534E] hover:bg-[#EFF6FF] hover:border-[#3B82F6] hover:text-[#2563EB] transition-colors"
                          title="Edit">
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => handleDelete(cp.id)} disabled={deleting === cp.id}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-[#E8E6E2] text-[11px] text-[#57534E] hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-40"
                          title="Delete">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
              {addingNew && newDraft && (
                <ScheduleEditRow
                  draft={newDraft}
                  onChange={changeNew}
                  onSave={saveNew}
                  onCancel={cancelAdd}
                  saving={saving}
                  errMsg={errMsg}
                />
              )}
            </tbody>
            <tfoot>
              <tr style={{ background:"#FAFAF9" }}>
                <td colSpan={3} className="px-4 py-3 text-right text-xs font-semibold text-[#57534E]">Total AR</td>
                <td className="px-4 py-3 text-right">
                  <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background:"#F5821F" }}>{fmtMoney(totalAr)}</span>
                </td>
                <td colSpan={2} className="px-4 py-3 text-right text-xs font-semibold text-[#57534E]">Total AP</td>
                <td className="px-4 py-3 text-right">
                  <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background:"#9A3412" }}>{fmtMoney(totalAp)}</span>
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Statement History Section */}
      <StatementHistorySection
        contractId={contract.id}
        onGenerate={() => setShowStatementModal(true)}
      />

      {showStatementModal && (
        <PaymentStatementModal
          contractId={contract.id}
          studentName={contract.studentName ?? contract.account?.name ?? "Student"}
          studentEmail={contract.clientEmail ?? contract.account?.email ?? null}
          onClose={() => setShowStatementModal(false)}
          onGenerated={() => {
            qc.invalidateQueries({ queryKey: ["payment-statements", contract.id] });
          }}
        />
      )}
    </div>
  );
}

// ── Invoices Tab ───────────────────────────────────────────────────────────
function InvoicesTab({ contract, onGenerateInvoice }: { contract: any; onGenerateInvoice: () => void }) {
  const { data: taxInvData, isLoading: loadingInv } = useQuery<any[]>({
    queryKey: ["tax-invoices-contract", contract.id],
    queryFn: () =>
      axios.get(`${BASE}/api/tax-invoices?contractId=${contract.id}`).then(r => r.data.data ?? []),
    enabled: !!contract.id,
  });
  const invoices: any[] = taxInvData ?? [];
  const INV_BADGE: Record<string, string> = {
    paid:    "bg-[#DCFCE7] text-[#16A34A]",
    active:  "bg-[#F4F3F1] text-[#57534E]",
    draft:   "bg-[#F4F3F1] text-[#A8A29E]",
    overdue: "bg-[#FEF2F2] text-[#DC2626]",
    sent:    "bg-[#EFF6FF] text-[#1D4ED8]",
  };
  const totalInvoiced = invoices.reduce((s: number, inv: any) => s + parseFloat(inv.totalAmount ?? "0"), 0);
  return (
    <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-x-auto">
      <div className="px-5 py-3 border-b border-[#E8E6E2] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-[#1C1917]">Tax Invoices ({invoices.length})</h3>
          {invoices.length > 0 && (
            <span className="text-xs text-[#A8A29E]">Total: <span className="font-semibold text-[#1C1917]">{fmtMoney(totalInvoiced)}</span></span>
          )}
        </div>
        <button onClick={onGenerateInvoice}
          className="h-8 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors hover:bg-[#FEF0E3] hover:border-[#F5821F] hover:text-[#F5821F]"
          style={{ borderColor:"#E8E6E2", color:"#57534E" }}>
          <Plus size={12} /> Generate Invoice
        </button>
      </div>
      {loadingInv ? (
        <div className="text-center py-10 text-[#A8A29E] text-sm">Loading…</div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-10 text-[#A8A29E]">
          <FileText size={28} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No tax invoices yet</p>
          <button onClick={onGenerateInvoice} className="mt-2 text-xs underline" style={{ color:"#F5821F" }}>Generate first invoice</button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E6E2]" style={{ background:"#FAFAF9" }}>
                {["Invoice Ref","Type","Issued","Due Date","Commission","GST","Total","School","Status","PDF"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="border-b border-[#E8E6E2] hover:bg-[#FAFAF9]">
                  <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color:"#F5821F" }}>{inv.invoiceRef ?? "—"}</td>
                  <td className="px-4 py-3 text-[12px] text-[#57534E] capitalize">{inv.invoiceType ?? "—"}</td>
                  <td className="px-4 py-3 text-[12px] text-[#57534E]">{fmtDate(inv.invoiceDate ?? inv.createdOn)}</td>
                  <td className="px-4 py-3 text-[12px] text-[#57534E]">{fmtDate(inv.dueDate)}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold">{fmtMoney(parseFloat(inv.commissionAmount ?? "0"))}</td>
                  <td className="px-4 py-3 text-[13px] text-[#57534E]">{inv.isGstFree ? <span className="text-[#A8A29E]">GST Free</span> : fmtMoney(parseFloat(inv.gstAmount ?? "0"))}</td>
                  <td className="px-4 py-3 text-[13px] font-bold" style={{ color:"#F5821F" }}>{fmtMoney(parseFloat(inv.totalAmount ?? "0"))}</td>
                  <td className="px-4 py-3 text-[12px] text-[#57534E] max-w-[120px] truncate">{inv.schoolName ?? "—"}</td>
                  <td className="px-4 py-3"><Badge s={inv.status} map={INV_BADGE} /></td>
                  <td className="px-4 py-3">
                    {inv.pdfUrl ? (
                      <a href={`${BASE}/api/tax-invoices/${inv.id}/pdf`} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 h-7 px-2 rounded border border-[#E8E6E2] text-[11px] font-medium text-[#57534E] hover:bg-[#FEF0E3] hover:border-[#F5821F] hover:text-[#F5821F] transition-colors">
                        <Download size={11} /> PDF
                      </a>
                    ) : (
                      <span className="text-[11px] text-[#A8A29E]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Payments Tab ─────────────────────────────────────────────────────────────
const PTYPE_BADGE: Record<string, string> = {
  trust_receipt:     "bg-[#DCFCE7] text-[#16A34A]",
  trust_transfer:    "bg-[#FEF0E3] text-[#F5821F]",
  commission:        "bg-[#EDE9FE] text-[#7C3AED]",
  direct:            "bg-[#F0F9FF] text-[#0369A1]",
  service_fee_camp:  "bg-[#DCFCE7] text-[#16A34A]",
  camp_tour_ap:      "bg-[#FEF9C3] text-[#CA8A04]",
  camp_institute_ap: "bg-[#FEF9C3] text-[#CA8A04]",
};
function ptypeLabel(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
function PaymentsTab({ contractId }: { contractId: string }) {
  const { data: rows = [], isLoading } = useQuery<any[]>({
    queryKey: ["contract-payments", contractId],
    queryFn: () =>
      axios.get(`${BASE}/api/accounting/payments/by-contract/${contractId}`).then(r => r.data),
    enabled: !!contractId,
  });

  // Group lines by payment_header id
  const grouped = rows.reduce<Record<string, { header: any; lines: any[] }>>((acc, row) => {
    if (!acc[row.id]) acc[row.id] = { header: row, lines: [] };
    acc[row.id].lines.push(row);
    return acc;
  }, {});
  const headers = Object.values(grouped);

  const totalReceived = headers
    .filter(h => ["trust_receipt", "service_fee_camp"].includes(h.header.payment_type))
    .reduce((s, h) => s + Number(h.header.total_amount ?? 0), 0);
  const totalPaid = headers
    .filter(h => ["trust_transfer", "camp_tour_ap", "camp_institute_ap"].includes(h.header.payment_type))
    .reduce((s, h) => s + Number(h.header.total_amount ?? 0), 0);

  if (isLoading) {
    return (
      <div className="bg-white border border-[#E8E6E2] rounded-xl p-10 text-center text-[#A8A29E] text-sm">
        Loading payments…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E8E6E2] rounded-xl p-4">
          <p className="text-xs text-[#A8A29E] mb-1">Total Received (AR)</p>
          <p className="text-xl font-bold text-[#16A34A]">{fmtMoney(totalReceived)}</p>
        </div>
        <div className="bg-white border border-[#E8E6E2] rounded-xl p-4">
          <p className="text-xs text-[#A8A29E] mb-1">Total Paid Out (AP)</p>
          <p className="text-xl font-bold text-[#DC2626]">{fmtMoney(totalPaid)}</p>
        </div>
        <div className="bg-white border border-[#E8E6E2] rounded-xl p-4">
          <p className="text-xs text-[#A8A29E] mb-1">Transactions</p>
          <p className="text-xl font-bold text-[#1C1917]">{headers.length}</p>
        </div>
      </div>

      {/* Payment list */}
      <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-x-auto">
        <div className="px-5 py-3 border-b border-[#E8E6E2]">
          <h3 className="text-sm font-semibold text-[#1C1917]">Payment Records ({headers.length})</h3>
        </div>
        {headers.length === 0 ? (
          <div className="text-center py-12 text-[#A8A29E]">
            <CreditCard size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No payments linked to this contract yet.</p>
            <p className="text-xs mt-1">Use the Payments page to record a payment against this contract's products.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8E6E2] bg-[#FAFAF9]">
                  {["Ref", "Date", "Type", "Method", "Counterparty", "Products", "Amount", "Status"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {headers.map(({ header, lines }) => {
                  const counterparty = header.received_from_name ?? header.paid_to_name ?? "—";
                  const productNames = [...new Set(lines.map((l: any) => l.product_name).filter(Boolean))].join(", ") || "—";
                  return (
                    <tr key={header.id} className="border-b border-[#E8E6E2] hover:bg-[#FAFAF9]">
                      <td className="px-4 py-3 font-mono text-xs text-[#57534E]">{header.payment_ref}</td>
                      <td className="px-4 py-3 text-[12px] text-[#57534E]">{fmtDate(header.payment_date)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${PTYPE_BADGE[header.payment_type] ?? "bg-[#F4F3F1] text-[#57534E]"}`}>
                          {ptypeLabel(header.payment_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#57534E]">{header.payment_method ?? "—"}</td>
                      <td className="px-4 py-3 text-[12px] font-medium text-[#1C1917] max-w-[120px] truncate">{counterparty}</td>
                      <td className="px-4 py-3 text-[12px] text-[#57534E] max-w-[140px] truncate">{productNames}</td>
                      <td className="px-4 py-3 text-[13px] font-bold" style={{ color: ["trust_receipt","service_fee_camp"].includes(header.payment_type) ? "#16A34A" : "#DC2626" }}>
                        {fmtMoney(Number(header.total_amount))}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          header.status === "Approved" ? "bg-[#DCFCE7] text-[#16A34A]" :
                          header.status === "Pending"  ? "bg-[#FEF9C3] text-[#CA8A04]" :
                          "bg-[#F4F3F1] text-[#57534E]"}`}>
                          {header.status ?? "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {headers.length > 0 && (
          <div className="px-5 py-3 border-t border-[#E8E6E2] flex gap-6 bg-[#FAFAF9]">
            <div><span className="text-xs text-[#A8A29E]">Total Received </span><span className="text-sm font-bold text-[#16A34A]">{fmtMoney(totalReceived)}</span></div>
            <div><span className="text-xs text-[#A8A29E]">Total Paid Out </span><span className="text-sm font-bold text-[#DC2626]">{fmtMoney(totalPaid)}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Transaction Edit Modal ──────────────────────────────────────────────────
function TxnEditModal({ txn, contractId, onClose }: { txn: any; contractId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    transactionDate: txn.transactionDate?.slice(0, 10) ?? "",
    transactionType: txn.transactionType ?? "Credit",
    creditAmount:    txn.creditAmount != null ? String(txn.creditAmount) : (txn.amount != null ? String(txn.amount) : ""),
    bankReference:   txn.bankReference ?? "",
    description:     txn.description ?? "",
    status:          txn.status ?? "Active",
  });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const inp = "w-full h-9 border border-[#E8E6E2] rounded-lg px-3 text-sm focus:outline-none focus:border-[#F5821F]";
  const sel = inp + " bg-white";

  const handleSave = async () => {
    setSaving(true); setErr("");
    try {
      await axios.put(`${BASE}/api/transactions/${txn.id}`, {
        transactionType:  form.transactionType,
        creditAmount:     form.creditAmount !== "" ? parseFloat(form.creditAmount) : null,
        transactionDate:  form.transactionDate || null,
        bankReference:    form.bankReference || null,
        description:      form.description || null,
        status:           form.status,
      });
      qc.invalidateQueries({ queryKey: ["crm-contract", contractId] });
      onClose();
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E6E2]">
          <h2 className="text-base font-semibold text-[#1C1917]">Edit Transaction</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F3F1] text-[#A8A29E]"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-1.5">Date</label>
              <input type="date" className={inp} value={form.transactionDate} onChange={e => set("transactionDate", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-1.5">Type</label>
              <select className={sel} value={form.transactionType} onChange={e => set("transactionType", e.target.value)}>
                <option value="Credit">Credit</option>
                <option value="Debit">Debit</option>
                <option value="payment_received">Payment Received</option>
                <option value="payment_sent">Payment Sent</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-1.5">Amount (AUD)</label>
              <input type="number" min="0" step="0.01" className={inp} value={form.creditAmount} onChange={e => set("creditAmount", e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-1.5">Status</label>
              <select className={sel} value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive (Voided)</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-1.5">Bank Reference / Txn Ref</label>
            <input type="text" className={inp} value={form.bankReference} onChange={e => set("bankReference", e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-1.5">Description / Note</label>
            <textarea rows={2} className="w-full border border-[#E8E6E2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F5821F] resize-none"
              value={form.description} onChange={e => set("description", e.target.value)} placeholder="Optional" />
          </div>
          {err && <p className="text-xs text-red-600">{err}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E8E6E2]">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-[#E8E6E2] text-sm text-[#57534E] hover:bg-[#F4F3F1]">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="h-9 px-5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
            style={{ background:"#F5821F" }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Transactions Tab ───────────────────────────────────────────────────────
function TransactionsTab({ contract, onRecordPayment }: { contract: any; onRecordPayment: () => void }) {
  const qc = useQueryClient();
  const txns: any[] = contract.transactions ?? [];
  const totalCredit = txns.reduce((s: number, t: any) => s + parseFloat(t.creditAmount ?? t.amount ?? "0"), 0);
  const totalDebit  = txns.filter((t: any) => ["Debit","payment_sent","adjustment"].includes(t.transactionType))
                          .reduce((s: number, t: any) => s + parseFloat(t.creditAmount ?? t.amount ?? "0"), 0);

  const [editingTxn, setEditingTxn] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleVoid = async (txnId: string) => {
    if (!window.confirm("이 트랜잭션을 비활성화(Void)하시겠습니까? 취소할 수 없습니다.")) return;
    setDeletingId(txnId);
    try {
      await axios.delete(`${BASE}/api/transactions/${txnId}`);
      qc.invalidateQueries({ queryKey: ["crm-contract", contract.id] });
    } catch (e: any) {
      alert(e?.response?.data?.error ?? "Void failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-x-auto">
        <div className="px-5 py-3 border-b border-[#E8E6E2] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1C1917]">Transactions ({txns.length})</h3>
          <button onClick={onRecordPayment}
            className="h-8 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors hover:bg-[#FEF0E3] hover:border-[#F5821F] hover:text-[#F5821F]"
            style={{ borderColor:"#E8E6E2", color:"#57534E" }}>
            <Plus size={12} /> Record Payment
          </button>
        </div>
        {txns.length === 0 ? (
          <div className="text-center py-10 text-[#A8A29E]">
            <CreditCard size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No transactions yet</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E8E6E2]" style={{ background:"#FAFAF9" }}>
                    {["Txn Ref","Date","Type","Amount","Status","Note","Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {txns.map((t: any) => {
                    const isInactive = t.status === "Inactive";
                    return (
                      <tr key={t.id}
                        className={`border-b border-[#E8E6E2] transition-colors ${isInactive ? "opacity-40 bg-[#FAFAF9]" : "hover:bg-[#FAFAF9]"}`}>
                        <td className="px-4 py-3 font-mono text-xs text-[#57534E]">{t.bankReference ?? "—"}</td>
                        <td className="px-4 py-3 text-[12px] text-[#57534E]">{fmtDate(t.transactionDate)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            ["Credit","payment_received"].includes(t.transactionType)
                              ? "bg-[#DCFCE7] text-[#16A34A]"
                              : "bg-[#FEF2F2] text-[#DC2626]"
                          }`}>
                            {t.transactionType === "payment_received" ? "Payment In"
                              : t.transactionType === "payment_sent" ? "Payment Out"
                              : t.transactionType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[13px] font-semibold" style={{
                          color: ["Credit","payment_received"].includes(t.transactionType) ? "#16A34A" : "#DC2626"
                        }}>
                          {fmtMoney(parseFloat(t.creditAmount ?? t.amount ?? "0"))}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isInactive ? "bg-[#F4F3F1] text-[#A8A29E]" : "bg-[#DCFCE7] text-[#16A34A]"
                          }`}>{t.status ?? "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#A8A29E] max-w-[140px] truncate" title={t.description ?? ""}>{t.description ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setEditingTxn(t)} disabled={isInactive}
                              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-[#E8E6E2] text-[11px] text-[#57534E] hover:bg-[#EFF6FF] hover:border-[#3B82F6] hover:text-[#2563EB] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Edit">
                              <Pencil size={11} />
                            </button>
                            <button onClick={() => handleVoid(t.id)} disabled={isInactive || deletingId === t.id}
                              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-[#E8E6E2] text-[11px] text-[#57534E] hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Void">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Summary */}
            <div className="px-5 py-3 border-t border-[#E8E6E2] flex gap-6" style={{ background:"#FAFAF9" }}>
              <div><span className="text-xs text-[#A8A29E]">Total In </span><span className="text-sm font-bold text-[#16A34A]">{fmtMoney(totalCredit)}</span></div>
              <div><span className="text-xs text-[#A8A29E]">Total Out </span><span className="text-sm font-bold text-[#DC2626]">{fmtMoney(totalDebit)}</span></div>
              <div><span className="text-xs text-[#A8A29E]">Net </span><span className="text-sm font-bold" style={{ color:"#F5821F" }}>{fmtMoney(totalCredit - totalDebit)}</span></div>
            </div>
          </>
        )}
      </div>
      {editingTxn && (
        <TxnEditModal
          txn={editingTxn}
          contractId={contract.id}
          onClose={() => setEditingTxn(null)}
        />
      )}
    </>
  );
}

// ── Commission Tab ──────────────────────────────────────────────────────────
function CommissionTab({ contract }: { contract: any }) {
  const cs = contract.commissionSummary ?? {};
  const products: any[] = contract.contractProducts ?? [];
  const allLines = products.flatMap((cp: any) =>
    (cp.costLines ?? []).map((cl: any) => ({ ...cl, instalmentName: cp.name ?? "—" }))
  );
  const COST_BADGE: Record<string, string> = {
    sub_agent:   "bg-[#FEF0E3] text-[#F5821F]",
    super_agent: "bg-[#FEF0E3] text-[#F5821F]",
    referral:    "bg-[#EFF6FF] text-[#1D4ED8]",
    incentive:   "bg-[#F4F3F1] text-[#57534E]",
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Sub-Agent",      val: cs.subAgent      },
          { label: "Super-Agent",    val: cs.superAgent     },
          { label: "Referral",       val: cs.referral       },
          { label: "Staff Incentive",val: cs.staffIncentive },
        ].map(c => (
          <div key={c.label} className="bg-white border border-[#E8E6E2] rounded-xl p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">{c.label}</p>
            <p className="text-xl font-bold text-[#1C1917] mt-1">{fmtMoney(c.val)}</p>
          </div>
        ))}
      </div>
      <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-x-auto">
        <div className="px-5 py-3 border-b border-[#E8E6E2]">
          <h3 className="text-sm font-semibold text-[#1C1917]">Cost Lines ({allLines.length})</h3>
        </div>
        {allLines.length === 0 ? (
          <div className="text-center py-8 text-[#A8A29E] text-sm">No cost lines recorded</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E6E2]" style={{ background:"#FAFAF9" }}>
                {["Instalment","Type","Partner / Staff","Method","Rate","Base","Calculated","Status"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allLines.map((cl: any, i: number) => (
                <tr key={i} className="border-b border-[#E8E6E2] hover:bg-[#FAFAF9]">
                  <td className="px-4 py-3 text-[12px] text-[#57534E]">{cl.instalmentName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${COST_BADGE[cl.costType] ?? "bg-[#F4F3F1] text-[#57534E]"}`}>
                      {(cl.costType ?? "").replace(/_/g," ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#1C1917]">{cl.partnerName ?? "—"}</td>
                  <td className="px-4 py-3 text-[12px] text-[#57534E]">{cl.calcType ?? "—"}</td>
                  <td className="px-4 py-3 text-[12px] text-[#57534E]">{cl.calcType === "percentage" ? `${(cl.rate * 100).toFixed(1)}%` : fmtMoney(cl.rate)}</td>
                  <td className="px-4 py-3 text-[13px]">{fmtMoney(cl.baseAmount)}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold" style={{ color:"#F5821F" }}>{fmtMoney(cl.calculatedAmount)}</td>
                  <td className="px-4 py-3"><Badge s={cl.status} map={{ paid:"bg-[#DCFCE7] text-[#16A34A]", pending:"bg-[#F4F3F1] text-[#57534E]" }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Record Payment Modal ──────────────────────────────────────────────────────
const PAYMENT_TYPES = [
  { value: "trust_receipt",     label: "Trust Receipt (Client pays in)"      },
  { value: "trust_transfer",    label: "Trust Transfer (Pay out supplier)"   },
  { value: "commission",        label: "Commission"                           },
  { value: "service_fee_camp",  label: "Service Fee (Camp)"                  },
  { value: "camp_tour_ap",      label: "Tour AP"                             },
  { value: "camp_institute_ap", label: "Institute AP"                        },
  { value: "direct",            label: "Direct"                              },
];
const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash",          label: "Cash"          },
  { value: "cheque",        label: "Cheque"        },
  { value: "card",          label: "Card"          },
];
function RecordPaymentModal({ contract, onClose }: { contract: any; onClose: () => void }) {
  const qc = useQueryClient();
  const products: any[] = contract.contractProducts ?? [];
  const arProducts = products.filter((p: any) => p.arAmount > 0);
  const apProducts = products.filter((p: any) => p.apAmount > 0);
  const today = new Date().toISOString().slice(0, 10);

  const [paymentType,   setPaymentType]   = useState("trust_receipt");
  const [paymentDate,   setPaymentDate]   = useState(today);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [bankReference, setBankReference] = useState("");
  const [notes,         setNotes]         = useState("");
  const [cpId,          setCpId]          = useState(arProducts[0]?.id ?? products[0]?.id ?? "");
  const [amount,        setAmount]        = useState("");

  const isAR = ["trust_receipt", "service_fee_camp"].includes(paymentType);
  const pool  = isAR ? arProducts : apProducts;

  useEffect(() => {
    const p = isAR ? arProducts : apProducts;
    if (p.length > 0) setCpId(p[0].id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentType]);

  useEffect(() => {
    const cp = products.find((p: any) => p.id === cpId);
    if (!cp) return;
    const val = isAR ? cp.arAmount : cp.apAmount;
    if (val) setAmount(String(val));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpId, isAR]);

  const mut = useMutation({
    mutationFn: () => axios.post(`${BASE}/api/accounting/payments`, {
      paymentDate, paymentMethod, paymentType,
      bankReference: bankReference || null,
      notes: notes || null,
      receivedFromName: isAR ? (contract.studentAccount?.name ?? contract.account?.name ?? null) : null,
      receivedFromId:   isAR ? (contract.studentAccount?.id   ?? contract.account?.id   ?? null) : null,
      lines: [{ contractProductId: cpId, amount: parseFloat(amount) || 0, contractId: contract.id }],
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-contract", contract.id] });
      qc.invalidateQueries({ queryKey: ["contract-payments", contract.id] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E6E2]">
          <h2 className="text-base font-semibold text-[#1C1917]">Record Payment</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F3F1] text-[#A8A29E]"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-1.5">Payment Type</label>
            <select value={paymentType} onChange={e => setPaymentType(e.target.value)}
              className="w-full h-9 border border-[#E8E6E2] rounded-lg px-3 text-sm bg-white focus:outline-none focus:border-[#F5821F]">
              {PAYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-1.5">Date</label>
              <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                className="w-full h-9 border border-[#E8E6E2] rounded-lg px-3 text-sm focus:outline-none focus:border-[#F5821F]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-1.5">Method</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                className="w-full h-9 border border-[#E8E6E2] rounded-lg px-3 text-sm bg-white focus:outline-none focus:border-[#F5821F]">
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-1.5">{isAR ? "AR Installment" : "AP Line"}</label>
            <select value={cpId} onChange={e => setCpId(e.target.value)}
              className="w-full h-9 border border-[#E8E6E2] rounded-lg px-3 text-sm bg-white focus:outline-none focus:border-[#F5821F]">
              {pool.length === 0 && <option value="">No products for this type</option>}
              {pool.map((cp: any) => (
                <option key={cp.id} value={cp.id}>
                  {cp.name} — {isAR ? fmtMoney(cp.arAmount) : fmtMoney(cp.apAmount)} ({isAR ? cp.arStatus : cp.apStatus})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-1.5">Amount (AUD)</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full h-9 border border-[#E8E6E2] rounded-lg px-3 text-sm focus:outline-none focus:border-[#F5821F]" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-1.5">Bank Reference / Receipt No.</label>
            <input type="text" value={bankReference} onChange={e => setBankReference(e.target.value)}
              className="w-full h-9 border border-[#E8E6E2] rounded-lg px-3 text-sm focus:outline-none focus:border-[#F5821F]" placeholder="Optional" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-1.5">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full border border-[#E8E6E2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F5821F] resize-none" placeholder="Optional" />
          </div>
          {mut.isError && <p className="text-xs text-red-600">저장 실패. 다시 시도해 주세요.</p>}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E8E6E2]">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-[#E8E6E2] text-sm text-[#57534E] hover:bg-[#F4F3F1]">Cancel</button>
          <button onClick={() => mut.mutate()} disabled={!cpId || !amount || mut.isPending}
            className="h-9 px-5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
            style={{ background: "#F5821F" }}>
            {mut.isPending ? "Saving…" : "Record Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Generate Invoice Modal ────────────────────────────────────────────────────
function GenerateInvoiceModal({ contract, onClose }: { contract: any; onClose: () => void }) {
  const qc = useQueryClient();
  const products: any[] = contract.contractProducts ?? [];

  const [cpId,          setCpId]          = useState(products[0]?.id ?? "");
  const [invoiceType,   setInvoiceType]   = useState<"net"|"gross">("net");
  const [schoolSearch,  setSchoolSearch]  = useState("");
  const [schoolId,      setSchoolId]      = useState("");
  const [schoolName,    setSchoolName]    = useState("");
  const [commissionAmt, setCommissionAmt] = useState("");
  const [isGstFree,     setIsGstFree]     = useState(false);
  const [dueDate,       setDueDate]       = useState("");

  const { data: schoolResults = [] } = useQuery<any[]>({
    queryKey: ["school-acct-search", schoolSearch],
    queryFn: () => axios.get(`${BASE}/api/accounting/payments-lookup/accounts?search=${encodeURIComponent(schoolSearch)}`).then(r => r.data),
    enabled: schoolSearch.length >= 2,
  });

  useEffect(() => {
    const cp = products.find((p: any) => p.id === cpId);
    if (!cp) return;
    if (cp.commissionAmount) setCommissionAmt(String(cp.commissionAmount));
    else if (cp.apAmount)    setCommissionAmt(String(cp.apAmount));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpId]);

  const mut = useMutation({
    mutationFn: () => axios.post(`${BASE}/api/tax-invoices`, {
      contractProductId: cpId,
      schoolAccountId:   schoolId,
      invoiceType,
      commissionAmount:  parseFloat(commissionAmt) || 0,
      isGstFree,
      dueDate: dueDate || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tax-invoices-contract", contract.id] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E6E2]">
          <h2 className="text-base font-semibold text-[#1C1917]">Generate Tax Invoice</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F3F1] text-[#A8A29E]"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-1.5">Contract Product / Installment</label>
            <select value={cpId} onChange={e => setCpId(e.target.value)}
              className="w-full h-9 border border-[#E8E6E2] rounded-lg px-3 text-sm bg-white focus:outline-none focus:border-[#F5821F]">
              {products.length === 0 && <option value="">No products</option>}
              {products.map((cp: any) => (
                <option key={cp.id} value={cp.id}>{cp.name} — AP {fmtMoney(cp.apAmount)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-1.5">Invoice Type</label>
            <div className="flex gap-3">
              {(["net","gross"] as const).map(t => (
                <button key={t} onClick={() => setInvoiceType(t)}
                  className="flex-1 h-9 rounded-lg border text-sm font-medium transition-colors"
                  style={invoiceType === t ? { background:"#FEF0E3", borderColor:"#F5821F", color:"#F5821F" } : { borderColor:"#E8E6E2", color:"#57534E" }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-1.5">School / Agent Account</label>
            {schoolId ? (
              <div className="flex items-center gap-2 h-9 border border-[#F5821F] rounded-lg px-3 bg-[#FEF0E3]">
                <span className="text-sm text-[#F5821F] font-medium flex-1">{schoolName}</span>
                <button onClick={() => { setSchoolId(""); setSchoolName(""); setSchoolSearch(""); }} className="text-[#A8A29E] hover:text-[#F5821F]"><X size={13} /></button>
              </div>
            ) : (
              <>
                <input type="text" value={schoolSearch} onChange={e => setSchoolSearch(e.target.value)}
                  className="w-full h-9 border border-[#E8E6E2] rounded-lg px-3 text-sm focus:outline-none focus:border-[#F5821F]"
                  placeholder="Search by account name (min 2 chars)…" />
                {(schoolResults as any[]).length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-[#E8E6E2] rounded-xl mt-1 shadow-lg z-10 max-h-40 overflow-y-auto">
                    {(schoolResults as any[]).map((a: any) => (
                      <button key={a.id} onClick={() => { setSchoolId(a.id); setSchoolName(a.name); setSchoolSearch(""); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#FEF0E3] text-[#1C1917]">
                        <span className="font-medium">{a.name}</span>
                        <span className="text-[11px] text-[#A8A29E] ml-2">{a.accountType}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-1.5">Commission Amount (AUD)</label>
              <input type="number" min="0" step="0.01" value={commissionAmt} onChange={e => setCommissionAmt(e.target.value)}
                className="w-full h-9 border border-[#E8E6E2] rounded-lg px-3 text-sm focus:outline-none focus:border-[#F5821F]" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-1.5">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full h-9 border border-[#E8E6E2] rounded-lg px-3 text-sm focus:outline-none focus:border-[#F5821F]" />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={isGstFree} onChange={e => setIsGstFree(e.target.checked)} className="w-4 h-4 accent-[#F5821F]" />
            <span className="text-sm text-[#57534E]">GST Free</span>
          </label>
          {mut.isError && <p className="text-xs text-red-600">생성 실패. 다시 시도해 주세요.</p>}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E8E6E2]">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-[#E8E6E2] text-sm text-[#57534E] hover:bg-[#F4F3F1]">Cancel</button>
          <button onClick={() => mut.mutate()} disabled={!cpId || !schoolId || !commissionAmt || mut.isPending}
            className="h-9 px-5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
            style={{ background: "#F5821F" }}>
            {mut.isPending ? "Generating…" : "Generate Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Service Modal ─────────────────────────────────────────────────────────
const SVC_API: Record<string, string> = {
  studyAbroad:   "/api/services/study-abroad",
  pickup:        "/api/services/pickup",
  tour:          "/api/services/tour",
  accommodation: "/api/services/accommodation",
  internship:    "/api/services/internship",
  settlement:    "/api/services/settlement",
  guardian:      "/api/services/guardian",
  other:         "/api/services/other",
  visa:          "/api/services/visa",
};
const SVC_DETAIL_ROUTE: Record<string, string> = {
  studyAbroad:   "/admin/services/study-abroad",
  pickup:        "/admin/services/pickup",
  tour:          "/admin/services/tour",
  accommodation: "/admin/services/accommodation",
  internship:    "/admin/services/internship",
  settlement:    "/admin/services/settlement",
  guardian:      "/admin/services/guardian",
  other:         "/admin/services/other",
  visa:          "/admin/services/visa",
};
const SVC_DEFS_MODAL = [
  { key: "studyAbroad",   label: "Study Abroad",   icon: GraduationCap, desc: "School application, visa & enrolment"  },
  { key: "pickup",        label: "Pickup",          icon: Car,           desc: "Airport or station transfer"            },
  { key: "tour",          label: "Tour",            icon: Map,           desc: "Tour or excursion management"           },
  { key: "accommodation", label: "Accommodation",   icon: Building2,     desc: "Homestay, residence or rental"         },
  { key: "internship",    label: "Internship",      icon: Briefcase,     desc: "Work placement management"             },
  { key: "settlement",    label: "Settlement",      icon: CheckCircle2,  desc: "Arrival & settlement support"          },
  { key: "guardian",      label: "Guardian",        icon: Shield,        desc: "Guardian / welfare management"        },
  { key: "other",         label: "Other Service",   icon: Wrench,        desc: "Custom or miscellaneous service"       },
  { key: "visa",          label: "Visa Service",    icon: Stamp,         desc: "Visa application & processing"         },
];
const APPL_STAGES   = ["counseling","application","visa_applied","visa_granted","enrolled"];
const PICKUP_TYPES  = ["arrival","departure","custom"];
const ACCOM_TYPES   = ["homestay","student_residence","private_rental","hotel","other"];
const OTHER_SVC_TYPES = ["visa","tax","health_insurance","bank","sim_card","translation","other_legal","other"];

function AddServiceModal({ contract, defaultType, onClose }: {
  contract: any;
  defaultType?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [selectedType, setSelectedType] = useState<string>(defaultType ?? "");

  const ownerIdFromContract = contract.studentOwner?.id ?? contract.owner?.id ?? "";

  const initForm = () => ({
    assignedStaffId:  ownerIdFromContract,
    notes:            "",
    applicationStage: "counseling",
    pickupType:       "arrival",
    fromLocation:     "",
    toLocation:       "",
    pickupDatetime:   "",
    tourName:         "",
    tourDate:         "",
    meetingPoint:     "",
    visaType:         "",
    accommodationType:"homestay",
    status:           "pending",
    serviceFee:       "",
    serviceType:      "other",
    title:            "",
    startDate:        contract.fromDate?.split("T")[0] ?? "",
    endDate:          contract.toDate?.split("T")[0]   ?? "",
  });
  const [form, setForm] = useState(initForm);
  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const { data: staffList } = useQuery({
    queryKey: ["users-staff"],
    queryFn:  () => axios.get(`${BASE}/api/users?limit=100`).then(r => r.data?.data ?? []),
  });

  const mut = useMutation({
    mutationFn: async () => {
      const base  = { contractId: contract.id };
      const staff = form.assignedStaffId ? { assignedStaffId: form.assignedStaffId } : {};
      const notes = form.notes ? { notes: form.notes } : {};

      let body: Record<string, any> = {};
      if (selectedType === "studyAbroad") {
        body = { ...base, applicationStage: form.applicationStage, ...staff, ...notes };
      } else if (selectedType === "pickup") {
        body = { ...base, pickupType: form.pickupType,
          fromLocation: form.fromLocation || null, toLocation: form.toLocation || null,
          pickupDatetime: form.pickupDatetime || null, ...notes };
      } else if (selectedType === "tour") {
        body = { ...base, tourName: form.tourName || null,
          tourDate: form.tourDate || null, meetingPoint: form.meetingPoint || null,
          ...(form.serviceFee ? { serviceFee: parseFloat(form.serviceFee) } : {}), ...notes };
      } else if (selectedType === "accommodation") {
        body = { ...base, accommodationType: form.accommodationType, status: form.status, ...staff, ...notes };
      } else if (selectedType === "internship") {
        body = { ...base, status: form.status, ...staff, ...notes };
      } else if (selectedType === "settlement") {
        body = { ...base, ...staff, ...notes };
      } else if (selectedType === "guardian") {
        body = { ...base, status: form.status, ...staff,
          ...(form.serviceFee ? { serviceFee: parseFloat(form.serviceFee) } : {}), ...notes };
      } else if (selectedType === "other") {
        body = { ...base, serviceType: form.serviceType, title: form.title || null,
          startDate: form.startDate || null, endDate: form.endDate || null,
          ...(form.serviceFee ? { serviceFee: parseFloat(form.serviceFee) } : {}), ...staff, ...notes };
      } else if (selectedType === "visa") {
        body = { ...base, visaType: form.visaType || null, ...staff,
          ...(form.serviceFee ? { serviceFee: parseFloat(form.serviceFee) } : {}), ...notes };
      }

      const r = await axios.post(`${BASE}${SVC_API[selectedType]}`, body);
      return r.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm-contract"] });
      onClose();
      if (data?.id) navigate(`${SVC_DETAIL_ROUTE[selectedType]}/${data.id}`);
    },
  });

  const svcDef = SVC_DEFS_MODAL.find(d => d.key === selectedType);
  const SvcIcon = svcDef?.icon ?? Plus;

  const LabelInput = ({ label, field, type = "text", placeholder = "" }: { label: string; field: string; type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wide mb-1">{label}</label>
      <input type={type} value={(form as any)[field]} onChange={e => set(field, e.target.value)}
        placeholder={placeholder}
        className="w-full border border-[#E8E6E2] rounded-lg px-3 py-2 text-sm text-[#1C1917] focus:outline-none focus:border-[#F5821F]" />
    </div>
  );
  const LabelSelect = ({ label, field, options }: { label: string; field: string; options: { value: string; label: string }[] }) => (
    <div>
      <label className="block text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wide mb-1">{label}</label>
      <select value={(form as any)[field]} onChange={e => set(field, e.target.value)}
        className="w-full border border-[#E8E6E2] rounded-lg px-3 py-2 text-sm text-[#1C1917] focus:outline-none focus:border-[#F5821F] bg-white">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
  const toLabel = (s: string) => s.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());

  const contractName = contract.studentAccount?.name ?? contract.account?.name ?? contract.studentName ?? "—";
  const contractNum  = contract.contractNumber ?? "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E6E2]">
          <div className="flex items-center gap-2">
            {selectedType && (
              <button onClick={() => setSelectedType("")} className="w-7 h-7 rounded-lg hover:bg-[#F4F3F1] flex items-center justify-center transition-colors text-[#A8A29E]">
                <ArrowLeft size={15} />
              </button>
            )}
            <h2 className="text-base font-bold text-[#1C1917]">
              {selectedType ? `Create ${svcDef?.label}` : "Add Service"}
            </h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[#F4F3F1] flex items-center justify-center transition-colors text-[#A8A29E]">
            <X size={16} />
          </button>
        </div>

        <div className="p-6">
          {/* Contract context pill */}
          <div className="flex items-center gap-2 mb-5 p-3 rounded-xl" style={{ background: "#FEF0E3" }}>
            <FileText size={14} style={{ color: "#F5821F" }} />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wide">Contract</p>
              <p className="text-sm font-semibold text-[#1C1917] truncate">{contractNum} · {contractName}</p>
            </div>
          </div>

          {/* Step 1: Type selection */}
          {!selectedType && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SVC_DEFS_MODAL.map(({ key, label, icon: Icon, desc }) => (
                <button key={key}
                  onClick={() => { setSelectedType(key); setForm(initForm()); }}
                  className="flex items-start gap-3 p-4 rounded-xl border border-[#E8E6E2] hover:border-[#F5821F] hover:bg-[#FEF0E3] transition-colors text-left group">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ background: "#F4F3F1" }}>
                    <Icon size={16} style={{ color: "#F5821F" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1C1917]">{label}</p>
                    <p className="text-xs text-[#A8A29E] mt-0.5 leading-snug">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Type-specific form */}
          {selectedType && (
            <div className="space-y-4">
              {/* Study Abroad */}
              {selectedType === "studyAbroad" && (
                <LabelSelect label="Application Stage" field="applicationStage"
                  options={APPL_STAGES.map(s => ({ value: s, label: toLabel(s) }))} />
              )}

              {/* Pickup */}
              {selectedType === "pickup" && (<>
                <LabelSelect label="Pickup Type" field="pickupType"
                  options={PICKUP_TYPES.map(s => ({ value: s, label: toLabel(s) }))} />
                <LabelInput label="From Location" field="fromLocation" placeholder="e.g. Sydney Airport T1" />
                <LabelInput label="To Location"   field="toLocation"   placeholder="e.g. Homestay address" />
                <LabelInput label="Date & Time"   field="pickupDatetime" type="datetime-local" />
              </>)}

              {/* Tour */}
              {selectedType === "tour" && (<>
                <LabelInput label="Tour Name"     field="tourName"     placeholder="e.g. Harbour Bridge Climb" />
                <LabelInput label="Tour Date"     field="tourDate"     type="date" />
                <LabelInput label="Meeting Point" field="meetingPoint" placeholder="e.g. Hotel lobby" />
                <LabelInput label="Service Fee ($)" field="serviceFee" type="number" placeholder="0.00" />
              </>)}

              {/* Accommodation */}
              {selectedType === "accommodation" && (
                <LabelSelect label="Accommodation Type" field="accommodationType"
                  options={ACCOM_TYPES.map(s => ({ value: s, label: toLabel(s) }))} />
              )}

              {/* Internship / Settlement / Guardian / Other — status or status-like */}
              {(selectedType === "internship" || selectedType === "guardian") && (
                <LabelSelect label="Status" field="status"
                  options={[
                    { value: "pending",   label: "Pending"   },
                    { value: "active",    label: "Active"    },
                    { value: "completed", label: "Completed" },
                  ]} />
              )}

              {/* Guardian — service fee */}
              {selectedType === "guardian" && (
                <LabelInput label="Service Fee ($)" field="serviceFee" type="number" placeholder="0.00" />
              )}

              {/* Other */}
              {selectedType === "other" && (<>
                <LabelSelect label="Service Type" field="serviceType"
                  options={OTHER_SVC_TYPES.map(s => ({ value: s, label: toLabel(s) }))} />
                <LabelInput label="Title" field="title" placeholder="Short description" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <LabelInput label="Start Date" field="startDate" type="date" />
                  <LabelInput label="End Date"   field="endDate"   type="date" />
                </div>
                <LabelInput label="Service Fee ($)" field="serviceFee" type="number" placeholder="0.00" />
              </>)}

              {/* Assigned Staff — all types */}
              <div>
                <label className="block text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wide mb-1">Assigned Staff</label>
                <select value={form.assignedStaffId} onChange={e => set("assignedStaffId", e.target.value)}
                  className="w-full border border-[#E8E6E2] rounded-lg px-3 py-2 text-sm text-[#1C1917] focus:outline-none focus:border-[#F5821F] bg-white">
                  <option value="">— Unassigned —</option>
                  {(staffList ?? []).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>
              </div>

              {/* Notes — all types */}
              <div>
                <label className="block text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wide mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                  rows={3} placeholder="Optional notes…"
                  className="w-full border border-[#E8E6E2] rounded-lg px-3 py-2 text-sm text-[#1C1917] focus:outline-none focus:border-[#F5821F] resize-none" />
              </div>

              {/* Error */}
              {mut.isError && (
                <p className="text-sm text-red-600">Failed to create service. Please try again.</p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={onClose}
                  className="flex-1 h-10 rounded-xl border border-[#E8E6E2] text-sm font-semibold text-[#57534E] hover:bg-[#F4F3F1] transition-colors">
                  Cancel
                </button>
                <button
                  onClick={() => mut.mutate()}
                  disabled={mut.isPending}
                  className="flex-1 h-10 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  style={{ background: "#F5821F" }}>
                  {mut.isPending ? "Creating…" : <><SvcIcon size={14} /> Create {svcDef?.label}</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Services Panel (shown on Overview right column) ─────────────────────────
const SERVICE_ROUTES: Record<string, string> = {
  studyAbroad:   "/admin/services/study-abroad",
  pickup:        "/admin/services/pickup",
  tour:          "/admin/services/tour",
  accommodation: "/admin/services/accommodation",
  internship:    "/admin/services/internship",
  settlement:    "/admin/services/settlement",
  guardian:      "/admin/services/guardian",
  other:         "/admin/services/other",
  visa:          "/admin/services/visa",
  camp:          "/admin/services/camp-tour",
};

const SVC_STATUS_BADGE: Record<string, string> = {
  confirmed:      "bg-[#DCFCE7] text-[#16A34A]",
  active:         "bg-[#DCFCE7] text-[#16A34A]",
  checked_in:     "bg-[#DCFCE7] text-[#16A34A]",
  scheduled:      "bg-[#FEF0E3] text-[#F5821F]",
  driver_assigned:"bg-[#FEF0E3] text-[#F5821F]",
  profile_review: "bg-[#FEF0E3] text-[#F5821F]",
  pending:        "bg-[#F4F3F1] text-[#57534E]",
};

const ALL_SVC_DEFS = [
  { key: "studyAbroad",   label: "Study Abroad",   icon: GraduationCap },
  { key: "pickup",        label: "Pickup",          icon: Car           },
  { key: "camp",          label: "Camp / Tour",     icon: GraduationCap },
  { key: "tour",          label: "Tour",            icon: Map           },
  { key: "accommodation", label: "Accommodation",   icon: Building2     },
  { key: "internship",    label: "Internship",      icon: Briefcase     },
  { key: "settlement",    label: "Settlement",      icon: CheckCircle2  },
  { key: "guardian",      label: "Guardian",        icon: Shield        },
  { key: "other",         label: "Other Service",   icon: Wrench        },
  { key: "visa",          label: "Visa Service",    icon: Stamp         },
];

function ServicesPanel({ contract, primaryServiceType, setPrimaryServiceType, onAddService }: {
  contract: any;
  primaryServiceType: string;
  setPrimaryServiceType: (s: string) => void;
  onAddService: (defaultType?: string) => void;
}) {
  const [, navigate] = useLocation();
  const svcs = contract.services ?? {};

  const ARRAY_KEYS = ["pickup", "camp", "tour", "accommodation", "other"];
  const withData = ALL_SVC_DEFS.map(d => ({
    ...d,
    data: ARRAY_KEYS.includes(d.key)
      ? (Array.isArray(svcs[d.key]) ? svcs[d.key][0] ?? null : svcs[d.key] ?? null)
      : (svcs[d.key] ?? null),
  }));
  const active = withData.filter(d => !!d.data);

  return (
    <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-x-auto">
      <div className="px-4 py-3 border-b border-[#E8E6E2] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1C1917]">Services
          <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF0E3] text-[#F5821F]">{active.length}</span>
        </h3>
        <button
          onClick={() => onAddService()}
          className="h-7 px-2.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1 transition-opacity hover:opacity-90"
          style={{ background: "#F5821F" }}>
          <Plus size={12} /> Add Service
        </button>
      </div>

      {active.length === 0 ? (
        <div className="text-center py-8 text-[#A8A29E] text-sm">
          <Shield size={24} className="mx-auto mb-2 opacity-30" />
          No services activated
        </div>
      ) : (
        <div className="divide-y divide-[#F4F3F1]">
          {active.map(({ key, label, icon: Icon, data }) => {
            const isPrimary = primaryServiceType === key;
            const route = SERVICE_ROUTES[key];
            return (
              <div key={key}
                className="px-4 py-3 flex items-center gap-3 hover:bg-[#FAFAF9] cursor-pointer group"
                onClick={() => data?.id && navigate(`${route}/${data.id}`)}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: isPrimary ? "#FEF0E3" : "#F4F3F1" }}>
                  <Icon size={14} style={{ color: isPrimary ? "#F5821F" : "#A8A29E" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-[#1C1917]">{label}</span>
                    {isPrimary && <span className="text-[10px] font-bold" style={{ color: "#F5821F" }}>★</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge s={data?.status} map={SVC_STATUS_BADGE} />
                    {!isPrimary && (
                      <button
                        onClick={e => { e.stopPropagation(); setPrimaryServiceType(key); }}
                        className="text-[10px] text-[#A8A29E] hover:text-[#F5821F] hidden group-hover:inline">
                        Set primary
                      </button>
                    )}
                  </div>
                </div>
                <ChevronRight size={14} className="text-[#A8A29E] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Services List Tab ────────────────────────────────────────────────────────
function ServicesGridTab({ contract, primaryServiceType, setPrimaryServiceType, onAddService }: {
  contract: any;
  primaryServiceType: string;
  setPrimaryServiceType: (s: string) => void;
  onAddService: (defaultType?: string) => void;
}) {
  const [, navigate] = useLocation();
  const svcs = contract.services ?? {};

  // Flatten all services into rows (supports multiple of same type, e.g. multiple pickups, tours, camp sessions, accommodations)
  const MULTI_KEYS = ["pickup", "camp", "tour", "accommodation", "other"];
  type SvcRow = { key: string; label: string; Icon: any; data: any };
  const rows: SvcRow[] = [];
  for (const def of ALL_SVC_DEFS) {
    if (MULTI_KEYS.includes(def.key)) {
      const arr: any[] = Array.isArray(svcs[def.key]) ? svcs[def.key] : svcs[def.key] ? [svcs[def.key]] : [];
      arr.forEach(d => rows.push({ key: def.key, label: def.label, Icon: def.icon, data: d }));
    } else {
      const d = svcs[def.key];
      if (d) rows.push({ key: def.key, label: def.label, Icon: def.icon, data: d });
    }
  }

  const getInfo = (key: string, data: any): string => {
    if (!data) return "—";
    if (key === "pickup")        return [data.pickupType, data.from].filter(Boolean).join(" · ") || "—";
    if (key === "accommodation") return [data.type, data.hostName].filter(Boolean).join(" · ") || "—";
    if (key === "studyAbroad")   return [data.programName, data.programType].filter(Boolean).join(" · ") || "—";
    if (key === "internship")    return [data.positionTitle, data.employmentType].filter(Boolean).join(" · ") || "—";
    if (key === "settlement")    return data.serviceDescription ?? "—";
    if (key === "guardian")      return [data.billingCycle].filter(Boolean).join(" · ") || "—";
    if (key === "other")         return [data.serviceType, data.title].filter(Boolean).join(" · ") || "—";
    if (key === "hotel")         return [data.roomType, data.confirmationNo].filter(Boolean).join(" · ") || "—";
    if (key === "tour")          return [data.tourName].filter(Boolean).join(" · ") || "—";
    if (key === "camp")          return [data.tourName, data.tourType].filter(Boolean).join(" · ") || "—";
    return "—";
  };

  const fmtDateShort = (raw: string | null | undefined) => {
    if (!raw) return "—";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "2-digit" });
  };

  const fmtDate = (raw: string | null | undefined) => {
    if (!raw) return "—";
    return new Date(raw).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getServiceDates = (key: string, data: any): { from: string | null; to: string | null; dur: string | null } => {
    if (!data) return { from: null, to: null, dur: null };
    const from = data.fromDate ?? null;
    const to   = data.toDate   ?? null;
    let dur: string | null = null;
    if (from && to) {
      const f = new Date(from), t = new Date(to);
      const days = Math.round((t.getTime() - f.getTime()) / 86400000) + 1;
      dur = days === 1 ? "1 day" : `${days} days`;
    } else if (from || to) {
      dur = "1 day";
    }
    return { from, to, dur };
  };

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[#1C1917]">Services</h2>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF0E3] text-[#F5821F]">{rows.length}</span>
        </div>
        <button
          onClick={() => onAddService()}
          className="h-8 px-3 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 transition-opacity hover:opacity-90"
          style={{ background: "#F5821F" }}>
          <Plus size={13} /> Add Service
        </button>
      </div>

      {/* List */}
      {rows.length === 0 ? (
        <div className="bg-white border border-[#E8E6E2] rounded-xl py-14 text-center">
          <Shield size={28} className="mx-auto mb-2 text-[#D6D3D1]" />
          <p className="text-sm text-[#A8A29E]">No services have been added yet.</p>
          <p className="text-xs text-[#D6D3D1] mt-1">Use the "Add Service" button above to get started.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-x-auto">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_2.2fr_1fr_1fr_72px_1fr_32px] gap-0 border-b border-[#E8E6E2] px-5 py-2.5">
            {["Service", "Details", "From", "To", "Dur", "Status", ""].map((h, i) => (
              <span key={i} className="text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wide">{h}</span>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-[#F4F3F1]">
            {rows.map(({ key, label, Icon, data }, idx) => {
              const isPrimary = primaryServiceType === key && rows.filter(r => r.key === key).length === 1;
              const status    = data?.status ?? null;
              const statusCls = status ? (SVC_STATUS_BADGE[status] ?? "bg-[#F4F3F1] text-[#57534E]") : "bg-[#F4F3F1] text-[#A8A29E]";
              const info      = getInfo(key, data);
              const { from, to, dur } = getServiceDates(key, data);

              return (
                <div key={`${key}-${idx}`}
                  className="grid grid-cols-[2fr_2.2fr_1fr_1fr_72px_1fr_32px] gap-0 px-5 py-3.5 items-center hover:bg-[#FAFAF9] cursor-pointer group transition-colors"
                  onClick={() => data?.id && navigate(`${SERVICE_ROUTES[key]}/${data.id}`)}>

                  {/* Service name */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: isPrimary ? "#FEF0E3" : "#F4F3F1" }}>
                      <Icon size={13} style={{ color: isPrimary ? "#F5821F" : "#78716C" }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium text-[#1C1917] truncate">{label}</span>
                        {isPrimary && <span className="text-[10px] font-bold flex-shrink-0" style={{ color: "#F5821F" }}>★</span>}
                      </div>
                      {!isPrimary && (
                        <button
                          onClick={e => { e.stopPropagation(); setPrimaryServiceType(key); }}
                          className="text-[10px] text-[#A8A29E] hover:text-[#F5821F] hidden group-hover:block leading-tight">
                          Set as primary
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <span className="text-xs text-[#57534E] truncate pr-2">{info}</span>

                  {/* From */}
                  <span className="text-xs text-[#57534E]">{fmtDateShort(from)}</span>

                  {/* To */}
                  <span className="text-xs text-[#57534E]">{fmtDateShort(to)}</span>

                  {/* Dur */}
                  <span className={`text-xs font-medium ${dur ? "text-[#F5821F]" : "text-[#D6D3D1]"}`}>{dur ?? "—"}</span>

                  {/* Status */}
                  <div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusCls}`}>
                      {status ? status.replace(/_/g, " ") : "—"}
                    </span>
                  </div>

                  {/* Arrow */}
                  <ChevronRight size={14} className="text-[#D6D3D1] group-hover:text-[#A8A29E] transition-colors" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Account Type Badge Helper ─────────────────────────────────────────────────
function getAccountTypeBadge(accountType: string | null | undefined) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    Student:      { label: "STUDENT",      bg: "#FEF0E3", color: "#F5821F" },
    School:       { label: "SCHOOL",       bg: "#DCFCE7", color: "#16A34A" },
    Sub_Agency:   { label: "SUB AGENCY",   bg: "#EDE9FE", color: "#7C3AED" },
    Super_Agency: { label: "SUPER AGENCY", bg: "#EDE9FE", color: "#7C3AED" },
    Supplier:     { label: "SUPPLIER",     bg: "#F0F9FF", color: "#0369A1" },
    Staff:        { label: "STAFF",        bg: "#F4F3F1", color: "#57534E" },
    Branch:       { label: "BRANCH",       bg: "#FEF9C3", color: "#CA8A04" },
    Organisation: { label: "ORGANISATION", bg: "#F4F3F1", color: "#57534E" },
    Agent:        { label: "AGENT",        bg: "#EDE9FE", color: "#7C3AED" },
    Provider:     { label: "PROVIDER",     bg: "#F0F9FF", color: "#0369A1" },
    Partner:      { label: "PARTNER",      bg: "#F4F3F1", color: "#57534E" },
  };
  return map[accountType ?? ""] ?? { label: "ACCOUNT", bg: "#F4F3F1", color: "#57534E" };
}

// ── Edit Student Modal ───────────────────────────────────────────────────────
const ACCT_TYPE_FILTERS = [
  { label: "All",          value: "" },
  { label: "Student",      value: "Student" },
  { label: "Organisation", value: "Organisation" },
  { label: "Agent",        value: "Agent" },
  { label: "School",       value: "School" },
  { label: "Other",        value: "__other__" },
];
const OTHER_TYPES = ["Sub_Agency","Super_Agency","Supplier","Staff","Branch","Provider","Partner"];

function EditAccountModal({ contract, onClose }: { contract: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [search, setSearch]       = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selected, setSelected]   = useState<any>(
    contract.studentAccount ?? (contract.account?.id ? contract.account : null)
  );

  const params: Record<string, string> = { limit: "20" };
  if (search) params.search = search;
  if (typeFilter && typeFilter !== "__other__") params.account_type = typeFilter;

  const { data: searchData, isFetching } = useQuery({
    queryKey: ["account-search", search, typeFilter],
    queryFn:  () =>
      axios.get(`${BASE}/api/crm/accounts`, { params }).then(r => r.data?.data ?? []),
    placeholderData: (prev) => prev,
  });

  const results: any[] = (searchData ?? []).filter((acc: any) => {
    if (typeFilter === "__other__") return OTHER_TYPES.includes(acc.accountType ?? "");
    return true;
  });

  const mut = useMutation({
    mutationFn: (accountId: string) =>
      axios.patch(`${BASE}/api/crm/contracts/${contract.id}`, { accountId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-contract", contract.id] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E6E2]">
          <h2 className="text-base font-semibold text-[#1C1917]">Link Account</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#F4F3F1] text-[#A8A29E]">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Current */}
          {selected && (
            <div className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm"
              style={{ background: "#FEF0E3", border: "1.5px solid #F5821F" }}>
              <div>
                <p className="font-semibold text-[#1C1917]">{selected.name}</p>
                {(() => { const b = getAccountTypeBadge(selected.accountType); return (
                  <span className="inline-block mt-1 text-[11px] font-medium rounded-full px-2.5 py-0.5"
                    style={{ background: b.bg, color: b.color }}>{b.label}</span>
                ); })()}
              </div>
              <button onClick={() => setSelected(null)} className="text-[#A8A29E] hover:text-[#57534E]">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Type filter tabs */}
          <div className="flex flex-wrap gap-1.5">
            {ACCT_TYPE_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className="px-2.5 py-1 text-xs rounded-full border transition-colors"
                style={typeFilter === f.value
                  ? { background: "#F5821F", color: "#fff", borderColor: "#F5821F" }
                  : { background: "#fff", color: "#57534E", borderColor: "#E8E6E2" }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search accounts…"
              className="w-full h-10 border rounded-lg px-3 text-sm outline-none transition-all"
              style={{
                borderColor: "#E8E6E2",
                boxShadow: "none",
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = "#F5821F";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(245,130,31,0.15)";
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = "#E8E6E2";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            {isFetching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[#F5821F] border-t-transparent animate-spin" />
            )}
          </div>

          {/* Results */}
          <div className="max-h-56 overflow-y-auto rounded-lg border border-[#E8E6E2] divide-y divide-[#F4F3F1]">
            {results.length === 0 && !isFetching && (
              <p className="text-center text-sm text-[#A8A29E] py-6">No accounts found</p>
            )}
            {results.map((acc: any) => (
              <button key={acc.id}
                onClick={() => setSelected(acc)}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-[#FEF0E3]"
                style={selected?.id === acc.id ? { background: "#FEF0E3" } : {}}>
                <div>
                  <p className="font-medium text-[#1C1917]">{acc.name}</p>
                  {(() => { const b = getAccountTypeBadge(acc.accountType); return (
                    <span className="inline-block mt-1 text-[11px] font-medium rounded-full px-2.5 py-0.5"
                      style={{ background: b.bg, color: b.color }}>{b.label}</span>
                  ); })()}
                </div>
                {selected?.id === acc.id && (
                  <span className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#F5821F" }}>
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose}
            className="h-9 px-4 rounded-lg border border-[#E8E6E2] text-sm text-[#57534E] hover:bg-[#F4F3F1]">
            Cancel
          </button>
          <button
            onClick={() => selected && mut.mutate(selected.id)}
            disabled={!selected || mut.isPending}
            className="h-9 px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ background: "#F5821F" }}>
            {mut.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Contract Modal ─────────────────────────────────────────────────────
function EditContractModal({ contract, onClose }: { contract: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    contractStatus:   contract.contractStatus   ?? "",
    paymentFrequency: contract.paymentFrequency ?? "",
    fromDate:         contract.fromDate   ? contract.fromDate.substring(0, 10)   : "",
    toDate:           contract.toDate     ? contract.toDate.substring(0, 10)     : "",
    contractAmount:   contract.contractAmount != null ? String(contract.contractAmount) : "",
    notes:            contract.notes            ?? "",
  });

  const mut = useMutation({
    mutationFn: (data: typeof form) =>
      axios.patch(`${BASE}/api/crm/contracts/${contract.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-contract", contract.id] });
      onClose();
    },
  });

  const field = (label: string, name: keyof typeof form, type = "text", opts?: { step?: string }) => (
    <div>
      <label className="block text-xs font-semibold text-[#57534E] mb-1">{label}</label>
      <input
        type={type}
        {...opts}
        value={form[name]}
        onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
        className="w-full border border-[#E8E6E2] rounded-lg px-3 py-2 text-sm text-[#1C1917] outline-none focus:border-[#F5821F]"
      />
    </div>
  );

  const sel = (label: string, name: keyof typeof form, options: { v: string; l: string }[]) => (
    <div>
      <label className="block text-xs font-semibold text-[#57534E] mb-1">{label}</label>
      <select
        value={form[name]}
        onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
        className="w-full border border-[#E8E6E2] rounded-lg px-3 py-2 text-sm text-[#1C1917] outline-none focus:border-[#F5821F] bg-white">
        <option value="">— Select —</option>
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E6E2]">
          <h2 className="text-base font-semibold text-[#1C1917]">Edit Contract</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#F4F3F1] text-[#A8A29E]">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sel("Status", "contractStatus", [
              { v: "active",      l: "Active"      },
              { v: "in progress", l: "In Progress"  },
              { v: "overdue",     l: "Overdue"      },
              { v: "completed",   l: "Completed"    },
              { v: "draft",       l: "Draft"        },
            ])}
            {sel("Payment Frequency", "paymentFrequency", [
              { v: "weekly",      l: "Weekly"       },
              { v: "fortnightly", l: "Fortnightly"  },
              { v: "monthly",     l: "Monthly"      },
              { v: "one_off",     l: "One-off"      },
            ])}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("Contract From", "fromDate", "date")}
            {field("Contract To",   "toDate",   "date")}
          </div>
          {field("Contract Amount (AUD)", "contractAmount", "number", { step: "0.01" })}
          <div>
            <label className="block text-xs font-semibold text-[#57534E] mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={3}
              className="w-full border border-[#E8E6E2] rounded-lg px-3 py-2 text-sm text-[#1C1917] outline-none focus:border-[#F5821F] resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5">
          <button onClick={onClose}
            className="h-9 px-4 rounded-lg border border-[#E8E6E2] text-sm text-[#57534E] hover:bg-[#F4F3F1]">
            Cancel
          </button>
          <button
            onClick={() => mut.mutate(form)}
            disabled={mut.isPending}
            className="h-9 px-5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "#F5821F" }}>
            {mut.isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Documents Tab ──────────────────────────────────────────────────────────
const DOC_CATS = [
  { value: "CONTRACT_DOC",  label: "Contract Document" },
  { value: "QUOTATION",     label: "Quotation"         },
  { value: "CORRESPONDENCE",label: "Email / Memo"      },
  { value: "FINANCIAL",     label: "Financial"         },
  { value: "PASSPORT",      label: "Passport"          },
  { value: "VISA_DOC",      label: "Visa Document"     },
  { value: "COE",           label: "COE"               },
  { value: "OFFER_LETTER",  label: "Offer Letter"      },
  { value: "OTHER",         label: "Other"             },
];
function DocumentsTab({ contractId }: { contractId: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory]  = useState("CONTRACT_DOC");
  const [docName,  setDocName]   = useState("");
  const [showForm, setShowForm]  = useState(false);
  const [uploadErr, setUploadErr] = useState("");

  const { data: docsData, isLoading } = useQuery<any>({
    queryKey: ["contract-docs", contractId],
    queryFn: () =>
      axios.get(`${BASE}/api/documents/by-entity?entityType=contract&entityId=${contractId}`)
        .then(r => r.data),
    enabled: !!contractId,
  });
  const docs: any[] = docsData?.documents ?? docsData ?? [];

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("referenceType", "contract");
      fd.append("referenceId", contractId);
      fd.append("documentCategory", category);
      fd.append("documentName", docName || file.name);
      fd.append("status", "active");
      await axios.post(`${BASE}/api/documents`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      qc.invalidateQueries({ queryKey: ["contract-docs", contractId] });
      setShowForm(false);
      setDocName("");
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setUploadErr("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const EXT_BADGE: Record<string, string> = {
    pdf: "bg-[#FEF2F2] text-[#DC2626]",
    doc: "bg-[#EFF6FF] text-[#1D4ED8]", docx: "bg-[#EFF6FF] text-[#1D4ED8]",
    xls: "bg-[#F0FDF4] text-[#16A34A]", xlsx: "bg-[#F0FDF4] text-[#16A34A]",
    jpg: "bg-[#FEF0E3] text-[#F5821F]", jpeg: "bg-[#FEF0E3] text-[#F5821F]", png: "bg-[#FEF0E3] text-[#F5821F]",
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#E8E6E2] rounded-xl">
        <div className="px-5 py-3 border-b border-[#E8E6E2] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1C1917]">Documents ({isLoading ? "…" : docs.length})</h3>
          <button onClick={() => setShowForm(v => !v)}
            className="h-8 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors hover:bg-[#FEF0E3] hover:border-[#F5821F] hover:text-[#F5821F]"
            style={{ borderColor:"#E8E6E2", color:"#57534E" }}>
            <UploadCloud size={13} /> Upload
          </button>
        </div>

        {/* Upload form */}
        {showForm && (
          <div className="p-5 border-b border-[#E8E6E2] bg-[#FAFAF9] space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-1.5">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full h-9 border border-[#E8E6E2] rounded-lg px-3 text-sm bg-white focus:outline-none focus:border-[#F5821F]">
                  {DOC_CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-1.5">Document Name (optional)</label>
                <input type="text" value={docName} onChange={e => setDocName(e.target.value)}
                  className="w-full h-9 border border-[#E8E6E2] rounded-lg px-3 text-sm focus:outline-none focus:border-[#F5821F]"
                  placeholder="Leave blank to use filename" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-1.5">File</label>
              <input ref={fileRef} type="file"
                className="block w-full text-sm text-[#57534E] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-[#E8E6E2] file:text-xs file:font-medium file:bg-white file:text-[#57534E] hover:file:bg-[#FEF0E3] cursor-pointer" />
            </div>
            {uploadErr && <p className="text-xs text-red-600">{uploadErr}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="h-8 px-4 rounded-lg border border-[#E8E6E2] text-xs text-[#57534E] hover:bg-[#F4F3F1]">Cancel</button>
              <button onClick={handleUpload} disabled={uploading}
                className="h-8 px-4 rounded-lg text-xs font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                style={{ background:"#F5821F" }}>
                {uploading ? "Uploading…" : "Upload"}
              </button>
            </div>
          </div>
        )}

        {/* Document list */}
        {isLoading ? (
          <div className="text-center py-10 text-[#A8A29E] text-sm">Loading…</div>
        ) : docs.length === 0 ? (
          <div className="text-center py-10 text-[#A8A29E]">
            <FileText size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No documents uploaded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8E6E2]" style={{ background:"#FAFAF9" }}>
                  {["Name","Category","Type","Size","Uploaded","Download"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.map((doc: any) => (
                  <tr key={doc.id} className="border-b border-[#E8E6E2] hover:bg-[#FAFAF9]">
                    <td className="px-4 py-3 text-[13px] text-[#1C1917] max-w-[180px] truncate font-medium">{doc.documentName ?? doc.originalFilename ?? "—"}</td>
                    <td className="px-4 py-3 text-[12px] text-[#57534E]">{doc.documentCategory ?? doc.categoryNameEn ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${EXT_BADGE[doc.fileExtension] ?? "bg-[#F4F3F1] text-[#57534E]"}`}>
                        {doc.fileExtension ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#A8A29E]">
                      {doc.fileSizeBytes ? `${(doc.fileSizeBytes / 1024).toFixed(0)} KB` : "—"}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#57534E]">{fmtDate(doc.createdAt)}</td>
                    <td className="px-4 py-3">
                      <a href={`${BASE}/api/documents/${doc.id}/download`} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 h-7 px-2 rounded border border-[#E8E6E2] text-[11px] font-medium text-[#57534E] hover:bg-[#FEF0E3] hover:border-[#F5821F] hover:text-[#F5821F] transition-colors">
                        <Download size={11} /> Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Activity Tab ───────────────────────────────────────────────────────────
function ActivityTab({ contractId }: { contractId: string }) {
  const [noteText, setNoteText] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["crm-contract-activity", contractId],
    queryFn: () => axios.get(`${BASE}/api/crm/contracts/${contractId}/activity`).then(r => r.data),
  });

  const items: any[] = data?.data ?? [];
  const filtered = typeFilter === "all" ? items : items.filter(i => i.type === typeFilter);

  const ICON_BG: Record<string, string> = {
    finance: "#FEF0E3", task: "#EFF6FF", service: "#DCFCE7", system: "#F4F3F1", note: "white",
  };
  const TYPE_FILTERS = ["all","finance","task","service","system","note"];

  return (
    <div className="space-y-4">
      {/* Type filter */}
      <div className="flex gap-1.5 flex-wrap">
        {TYPE_FILTERS.map(t => (
          <button key={t}
            onClick={() => setTypeFilter(t)}
            className="px-3 h-7 rounded-lg text-xs font-medium border transition-all capitalize"
            style={typeFilter === t
              ? { background:"#FEF0E3", color:"#F5821F", borderColor:"#F5821F" }
              : { background:"white", color:"#57534E", borderColor:"#E8E6E2" }}>
            {t}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="bg-white border border-[#E8E6E2] rounded-xl p-4 space-y-3">
        {isLoading && <div className="text-center py-8 text-[#A8A29E] text-sm">Loading…</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-8 text-[#A8A29E] text-sm">No activity recorded</div>
        )}
        {filtered.map((item: any, i: number) => (
          <div key={i} className="flex gap-3">
            <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center border border-[#E8E6E2]"
              style={{ background: ICON_BG[item.type] ?? "#F4F3F1" }}>
              <span className="text-[11px]">
                {item.type === "finance" ? "💳" : item.type === "task" ? "✅" : item.type === "service" ? "🎓" : "🤖"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#1C1917]">{item.title}</p>
              {item.detail && <p className="text-[12px] text-[#57534E] mt-0.5">{item.detail}</p>}
              <p className="text-[11px] text-[#A8A29E] mt-1">
                {item.actor_name} · {item.occurred_at ? format(new Date(item.occurred_at), "dd MMM yyyy HH:mm") : "—"}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Note input */}
      <div className="bg-white border border-[#E8E6E2] rounded-xl p-4">
        <p className="text-xs font-semibold text-[#57534E] mb-2">Add Note</p>
        <textarea
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          rows={3}
          placeholder="Write a note…"
          className="w-full border border-[#E8E6E2] rounded-lg p-3 text-sm outline-none focus:border-[#F5821F] resize-none"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={() => { console.log("post note:", noteText); setNoteText(""); }}
            className="h-8 px-4 rounded-lg text-sm font-medium text-white flex items-center gap-1.5"
            style={{ background:"#F5821F" }}>
            <Send size={13} /> Post Note
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Detail Page ───────────────────────────────────────────────────────
export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [editingContract,  setEditingContract]  = useState(false);
  const [editingAccount,   setEditingAccount]   = useState(false);
  const [addingService,    setAddingService]    = useState<string | null>(null);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [generatingInvoice,setGeneratingInvoice]= useState(false);

  const openAddService = (defaultType?: string) =>
    setAddingService(defaultType ?? "");

  const { data: contract, isLoading } = useQuery({
    queryKey: ["crm-contract", id],
    queryFn: () => axios.get(`${BASE}/api/crm/contracts/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const { data: linkedCampApp } = useQuery({
    queryKey: ["camp-app-by-contract", id],
    queryFn: () =>
      axios.get(`${BASE}/api/camp-applications?contractId=${id}&limit=1`)
        .then(r => r.data?.data?.[0] ?? null),
    enabled: !!id,
  });

  const [primaryServiceType, setPrimaryServiceType] = useState<string>("study_abroad");

  useEffect(() => {
    if (contract?.primaryServiceModule) {
      setPrimaryServiceType(contract.primaryServiceModule);
    } else if (contract?.serviceModulesActivated?.[0]) {
      setPrimaryServiceType(contract.serviceModulesActivated[0]);
    }
  }, [contract?.primaryServiceModule, contract?.serviceModulesActivated]);

  const qc = useQueryClient();
  const primaryMut = useMutation({
    mutationFn: (module: string) =>
      axios.patch(`${BASE}/api/crm/contracts/${id}`, { primaryServiceModule: module }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-contract", id] }),
  });

  const handleSetPrimary = (module: string) => {
    setPrimaryServiceType(module);
    primaryMut.mutate(module);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded-lg bg-[#F4F3F1]" />
          <div className="h-28 rounded-xl bg-[#F4F3F1]" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-36 rounded-xl bg-[#F4F3F1]" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-[#1C1917]">Contract not found</p>
          <button onClick={() => navigate("/admin/crm/contracts")}
            className="mt-3 text-sm underline" style={{ color:"#F5821F" }}>Back to Contracts</button>
        </div>
      </div>
    );
  }

  // Determine primary service data for the info card
  const svcs = contract.services ?? {};
  const primData = (() => {
    const t = primaryServiceType;
    if (t === "studyAbroad" || t === "study_abroad") return svcs.studyAbroad;
    if (t === "pickup")        return svcs.pickup?.[0];
    if (t === "accommodation") return svcs.accommodation;
    if (t === "internship")    return svcs.internship;
    if (t === "guardian")      return svcs.guardian;
    if (t === "other")         return svcs.other?.[0];
    if (t === "settlement")    return svcs.settlement;
    if (t === "hotel")         return svcs.hotel;
    if (t === "tour")          return svcs.tour?.[0];
    if (t === "visa")          return svcs.visa;
    if (t === "camp")          return svcs.camp?.[0];
    return null;
  })();

  const calcPrimDates = (data: any) => {
    if (!data) return { from: null, to: null, dur: null };
    const from = data.fromDate ?? null;
    const to   = data.toDate   ?? null;
    let dur: string | null = null;
    if (from && to) {
      const f = new Date(from), t2 = new Date(to);
      const days = Math.round((t2.getTime() - f.getTime()) / 86400000) + 1;
      dur = days === 1 ? "1 day" : `${days} days`;
    } else if (from || to) { dur = "1 day"; }
    return { from, to, dur };
  };
  const primDates = calcPrimDates(primData);

  // Counts for tab badges
  const svcsForCount = contract.services ?? {};
  const countArr = (v: any) => Array.isArray(v) ? v.length : v ? 1 : 0;
  const countOne = (v: any) => v ? 1 : 0;
  const servicesCount =
    countOne(svcsForCount.studyAbroad) +
    countArr(svcsForCount.pickup) +
    countArr(svcsForCount.camp) +
    countArr(svcsForCount.tour) +
    countArr(svcsForCount.accommodation) +
    countOne(svcsForCount.internship) +
    countOne(svcsForCount.guardian) +
    countArr(svcsForCount.other) +
    countOne(svcsForCount.settlement) +
    countOne(svcsForCount.visa);

  const commissionCount = (contract.contractProducts ?? [])
    .flatMap((cp: any) => cp.costLines ?? []).length;

  const counts: Partial<Record<TabKey, number>> = {
    services:     servicesCount,
    schedule:     contract.contractProducts?.length ?? 0,
    invoices:     contract.invoices?.length          ?? 0,
    payments:     contract.paymentsCount             ?? 0,
    transactions: contract.transactions?.length      ?? 0,
    commission:   commissionCount,
    activity:     contract.activityCount             ?? 0,
    documents:    0,
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">

      {/* Top bar */}
      <div className="bg-white border-b border-[#E8E6E2] px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/crm/contracts")}
            className="text-[#57534E] hover:text-[#1C1917] flex items-center gap-1 text-sm">
            <ArrowLeft size={16} /> Back
          </button>
          <span className="text-[#E8E6E2]">|</span>
          <span className="font-mono text-lg font-bold" style={{ color:"#F5821F" }}>
            {contract.contractRefDisplay}
          </span>
          <Badge s={contract.contractStatus} map={CONTRACT_STATUS_BADGE} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditingContract(true)}
            className="h-8 px-3 rounded-lg border border-[#E8E6E2] text-sm text-[#57534E] flex items-center gap-1.5 hover:bg-[#F4F3F1]">
            <Pencil size={13} /> Edit
          </button>
          {contract.quote?.id && (
            <button onClick={() => navigate(`/admin/crm/quotes/${contract.quote.id}`)}
              className="h-8 px-3 rounded-lg border border-[#E8E6E2] text-sm text-[#57534E] flex items-center gap-1.5 hover:bg-[#F4F3F1]">
              <ExternalLink size={13} /> View Quote
            </button>
          )}
          <button onClick={() => setGeneratingInvoice(true)}
            className="h-8 px-3 rounded-lg border border-[#E8E6E2] text-sm text-[#57534E] flex items-center gap-1.5 hover:bg-[#FEF0E3] hover:border-[#F5821F] hover:text-[#F5821F] transition-colors">
            <FileText size={13} /> Generate Invoice
          </button>
          <button onClick={() => setRecordingPayment(true)}
            className="h-8 px-3 rounded-lg border border-[#E8E6E2] text-sm text-[#57534E] flex items-center gap-1.5 hover:bg-[#FEF0E3] hover:border-[#F5821F] hover:text-[#F5821F] transition-colors">
            <CreditCard size={13} /> Record Payment
          </button>
        </div>
      </div>

      {/* Camp Application Badge — only shown when this contract originated from a camp application */}
      {linkedCampApp && (
        <div className="bg-white border-b border-[#F4F3F1] px-6 py-2.5">
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#FEF0E3",
            border: "1px solid rgba(245,130,31,0.3)",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 13,
            color: "#F5821F",
          }}>
            <span>📋</span>
            <span>Camp Application: <strong>{linkedCampApp.applicationRef ?? linkedCampApp.id}</strong></span>
            <button
              onClick={() => navigate(`/admin/camp-applications/${linkedCampApp.id}`)}
              style={{ fontWeight: 600, cursor: "pointer", background: "none", border: "none", color: "#F5821F", padding: 0 }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
            >
              View →
            </button>
          </div>
        </div>
      )}

      <div className="p-6 pb-0">

        {/* 3 Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Student */}
          <div className="bg-white border border-[#E8E6E2] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              {(() => { const b = getAccountTypeBadge(contract.studentAccount?.accountType); return (
                <span className="text-[12px] font-medium rounded-full px-2.5 py-0.5"
                  style={{ background: b.bg, color: b.color }}>{b.label}</span>
              ); })()}
              <div className="flex items-center gap-1">
                <button onClick={() => setEditingAccount(true)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#F4F3F1] transition-colors text-[#A8A29E] hover:text-[#57534E]">
                  <Pencil size={13} />
                </button>
                {(contract.studentAccount?.id ?? contract.account?.id) && (
                  <button onClick={() => navigate(`/admin/crm/accounts/${contract.studentAccount?.id ?? contract.account?.id}`)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#F4F3F1] transition-colors text-[#A8A29E] hover:text-[#F5821F]">
                    <ExternalLink size={13} />
                  </button>
                )}
              </div>
            </div>
            {/* Name — always */}
            <div className="mb-2">
              <span className="block text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wide mb-0.5">Name</span>
              <ClientNameDisplay
                fields={nameFromAccount({
                  firstName:    contract.studentAccount?.firstName  ?? contract.account?.firstName,
                  lastName:     contract.studentAccount?.lastName   ?? contract.account?.lastName,
                  originalName: contract.studentAccount?.originalName ?? contract.account?.originalName,
                  name:         contract.studentAccount?.name       ?? contract.account?.name,
                })}
                size="md"
              />
            </div>
            {/* Type-specific middle rows */}
            {(() => {
              const aType = contract.studentAccount?.accountType ?? contract.account?.accountType;
              if (aType === "Student") {
                return (
                  <>
                    <InfoRow label="Nationality" value={contract.studentContact?.nationality} />
                    <InfoRow label="Email"        value={contract.studentContact?.email ?? contract.studentAccount?.email} />
                    <InfoRow label="Phone"        value={contract.studentContact?.phone ?? contract.studentAccount?.phone} />
                  </>
                );
              }
              if (["Organisation","Branch","Sub_Agency","Super_Agency","Agent"].includes(aType ?? "")) {
                return (
                  <>
                    <InfoRow label="Country" value={contract.studentAccount?.country ?? contract.account?.country} />
                    <InfoRow label="Email"   value={contract.studentAccount?.email ?? contract.account?.email} />
                    <InfoRow label="Phone"   value={contract.studentAccount?.phone ?? contract.account?.phone} />
                  </>
                );
              }
              // Default: School, Supplier, Staff, Provider, Partner, etc.
              return (
                <>
                  <InfoRow label="Email" value={contract.studentAccount?.email ?? contract.account?.email} />
                  <InfoRow label="Phone" value={contract.studentAccount?.phone ?? contract.account?.phone} />
                </>
              );
            })()}
            {/* Owner — always */}
            <InfoRow label="Owner (EC)"  value={contract.studentOwner?.name ?? contract.owner?.name} />
          </div>

          {/* Primary Service */}
          <div className="bg-white rounded-xl p-5" style={{ border:"2px solid #F5821F" }}>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">Primary Service</p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FEF0E3] text-[#F5821F]">
                {primaryServiceType.replace(/_/g," ").replace(/\b\w/g,(c: string)=>c.toUpperCase())}
              </span>
            </div>
            {primData ? (
              <>
                {primDates.from && <InfoRow label="From" value={<span className="font-medium">{fmtDate(primDates.from)}</span>} />}
                {primDates.to   && <InfoRow label="To"   value={<span className="font-medium">{fmtDate(primDates.to)}</span>} />}
                {primDates.dur  && (
                  <InfoRow label="Duration" value={
                    <span className="font-semibold" style={{ color:"#F5821F" }}>{primDates.dur}</span>
                  } />
                )}
                {"programName"   in primData && primData.programName   && <InfoRow label="Program" value={primData.programName} />}
                {"type"          in primData && primData.type          && <InfoRow label="Type"    value={primData.type} />}
                {"hostName"      in primData && primData.hostName      && <InfoRow label="Host"    value={primData.hostName} />}
                {"positionTitle" in primData && primData.positionTitle && <InfoRow label="Position" value={primData.positionTitle} />}
                {"tourName"      in primData && primData.tourName      && <InfoRow label="Tour"    value={primData.tourName} />}
                {"roomType"      in primData && primData.roomType      && <InfoRow label="Room"    value={primData.roomType} />}
                {"title"         in primData && primData.title         && <InfoRow label="Service" value={primData.title} />}
                {"coeNumber"     in primData && primData.coeNumber     && <InfoRow label="COE"     value={primData.coeNumber} />}
                {"visaType"      in primData && primData.visaType      && <InfoRow label="Visa"    value={primData.visaType} />}
              </>
            ) : (
              <p className="text-sm text-[#A8A29E]">No primary service data</p>
            )}
          </div>

          {/* Financial Summary */}
          <div className="bg-white border border-[#E8E6E2] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">Financial Summary</p>
              <button onClick={() => setEditingContract(true)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#F4F3F1] transition-colors text-[#A8A29E] hover:text-[#57534E]">
                <Pencil size={13} />
              </button>
            </div>
            <InfoRow label="Contract Value" value={fmtMoney(contract.contractAmount)} />
            <InfoRow label="Total AR"       value={<span className="font-semibold" style={{ color:"#F5821F" }}>{fmtMoney(contract.totalArAmount)}</span>} />
            <InfoRow label="Total AP"       value={<span className="font-semibold" style={{ color:"#DC2626" }}>{fmtMoney(contract.totalApAmount)}</span>} />
            <InfoRow label="Est. Net Rev."  value={
              <span className="font-bold" style={{ color:"#F5821F" }}>
                {fmtMoney((contract.totalArAmount ?? 0) - (contract.totalApAmount ?? 0))}
              </span>
            } />
          </div>
        </div>
      </div>

      {/* Tab Bar — sticky below top bar, full-width, horizontally scrollable */}
      <div className="sticky top-[65px] z-20 bg-white border-b border-[#E8E6E2] overflow-x-auto mt-5">
        <div className="flex gap-0 px-6">
          {TABS.map(tab => {
            const count = counts[tab.key];
            return (
              <button key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0"
                style={activeTab === tab.key
                  ? { borderColor:"#F5821F", color:"#F5821F" }
                  : { borderColor:"transparent", color:"#57534E" }}>
                {tab.label}
                {count != null && count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={activeTab === tab.key ? { background:"#FEF0E3", color:"#F5821F" } : { background:"#F4F3F1", color:"#A8A29E" }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6 pt-5">
        {activeTab === "overview"     && (
          <>
            <OverviewTab
              contract={contract}
              onEditContract={() => setEditingContract(true)}
              primaryServiceType={primaryServiceType}
              setPrimaryServiceType={handleSetPrimary}
              onAddService={openAddService}
            />
            <SystemInfoSection owner={contract.ownerId ?? null} createdAt={contract.createdAt} updatedAt={contract.updatedAt} />
          </>
        )}
        {activeTab === "services"     && (
          <ServicesGridTab
            contract={contract}
            primaryServiceType={primaryServiceType}
            setPrimaryServiceType={handleSetPrimary}
            onAddService={openAddService}
          />
        )}
        {activeTab === "schedule"     && <PaymentScheduleTab contract={contract} />}
        {activeTab === "invoices"     && <InvoicesTab        contract={contract} onGenerateInvoice={() => setGeneratingInvoice(true)} />}
        {activeTab === "payments"     && <PaymentsTab        contractId={contract.id} />}
        {activeTab === "transactions" && <TransactionsTab    contract={contract} onRecordPayment={() => setRecordingPayment(true)} />}
        {activeTab === "commission"   && <CommissionTab      contract={contract} />}
        {activeTab === "documents"    && <DocumentsTab contractId={String(contract.id)} />}
        {activeTab === "activity"     && <ActivityTab contractId={id!} />}

      </div>

      {addingService !== null && (
        <AddServiceModal
          contract={contract}
          defaultType={addingService || undefined}
          onClose={() => setAddingService(null)}
        />
      )}
      {editingAccount && (
        <EditAccountModal
          contract={contract}
          onClose={() => setEditingAccount(false)}
        />
      )}
      {editingContract && (
        <EditContractModal
          contract={contract}
          onClose={() => setEditingContract(false)}
        />
      )}
      {recordingPayment && (
        <RecordPaymentModal
          contract={contract}
          onClose={() => setRecordingPayment(false)}
        />
      )}
      {generatingInvoice && (
        <GenerateInvoiceModal
          contract={contract}
          onClose={() => setGeneratingInvoice(false)}
        />
      )}
    </div>
  );
}
