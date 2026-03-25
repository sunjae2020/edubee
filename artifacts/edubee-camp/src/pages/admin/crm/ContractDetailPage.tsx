import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import axios from "axios";
import {
  ArrowLeft, ExternalLink, FileText, CreditCard, GraduationCap,
  Car, Building2, Briefcase, Shield, CheckCircle2, Clock,
  AlertCircle, ChevronRight, Star, TrendingUp, TrendingDown,
  UploadCloud, MessageSquare, Send, Download, Pencil, Plus, X, Wrench,
} from "lucide-react";
import { format } from "date-fns";
import PaymentStatementModal from "../../../components/finance/PaymentStatementModal";

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
          <InfoRow label="Quote Ref"       value={contract.quote?.quoteRefNumber ?? "—"} />
          <InfoRow label="Payment Count"   value={
            contract.contractProducts?.length
              ? `${contract.contractProducts.length} instalment${contract.contractProducts.length > 1 ? "s" : ""}`
              : "—"
          } />
          <InfoRow label="Contract From"   value={fmtDate(contract.fromDate)} />
          <InfoRow label="Contract To"     value={fmtDate(contract.toDate)} />
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
function PaymentScheduleTab({ contract }: { contract: any }) {
  const products: any[] = contract.contractProducts ?? [];
  const totalAr = products.reduce((s: number, p: any) => s + (p.arAmount ?? 0), 0);
  const totalAp = products.reduce((s: number, p: any) => s + (p.apAmount ?? 0), 0);
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-x-auto">
        <div className="px-5 py-3 border-b border-[#E8E6E2] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1C1917]">Payment Schedule ({products.length})</h3>
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
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {products.map((cp: any, i: number) => (
                <tr key={cp.id}
                  className="border-b border-[#E8E6E2] transition-colors"
                  style={cp.apStatus === "ready" ? { background:"#FFFCF9" } : {}}>
                  <td className="px-4 py-3 text-xs text-[#A8A29E]">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {cp.isInitialPayment && <span className="text-[#CA8A04] text-xs">★ Initial</span>}
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
                    <button
                      onClick={() => printInstalment(cp, contract, i)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E8E6E2] text-[11px] font-medium text-[#57534E] hover:bg-[#FEF0E3] hover:border-[#F5821F] hover:text-[#F5821F] transition-colors"
                    >
                      <Download size={11} /> Invoice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background:"#FAFAF9" }}>
                <td colSpan={3} className="px-4 py-3 text-right text-xs font-semibold text-[#57534E]">Total</td>
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
        onGenerate={() => setShowModal(true)}
      />

      {/* Modal */}
      {showModal && (
        <PaymentStatementModal
          contractId={contract.id}
          studentName={contract.studentName ?? contract.account?.name ?? "Student"}
          studentEmail={contract.clientEmail ?? contract.account?.email ?? null}
          onClose={() => setShowModal(false)}
          onGenerated={() => {
            queryClient.invalidateQueries({ queryKey: ["payment-statements", contract.id] });
          }}
        />
      )}
    </div>
  );
}

// ── Invoices Tab ───────────────────────────────────────────────────────────
function InvoicesTab({ contract }: { contract: any }) {
  const invoices: any[] = contract.invoices ?? [];
  const INV_BADGE: Record<string, string> = {
    paid:     "bg-[#DCFCE7] text-[#16A34A]",
    active:   "bg-[#F4F3F1] text-[#57534E]",
    draft:    "bg-[#F4F3F1] text-[#A8A29E]",
    overdue:  "bg-[#FEF2F2] text-[#DC2626]",
  };
  return (
    <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-x-auto">
      <div className="px-5 py-3 border-b border-[#E8E6E2] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1C1917]">Invoices ({invoices.length})</h3>
        <button disabled className="h-8 px-3 rounded-lg border border-[#E8E6E2] text-xs text-[#A8A29E] cursor-not-allowed">+ Generate Invoice</button>
      </div>
      {invoices.length === 0 ? (
        <div className="text-center py-10 text-[#A8A29E]">
          <FileText size={28} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No invoices yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E6E2]" style={{ background:"#FAFAF9" }}>
                {["Invoice Ref","Issued","Due Date","Amount","Paid","Balance","Status","PDF"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="border-b border-[#E8E6E2] hover:bg-[#FAFAF9]">
                  <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color:"#F5821F" }}>{inv.invoiceRefNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-[12px] text-[#57534E]">{fmtDate(inv.createdOn)}</td>
                  <td className="px-4 py-3 text-[12px] text-[#57534E]">{fmtDate(inv.dueDate)}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold">{fmtMoney(inv.totalPrice)}</td>
                  <td className="px-4 py-3 text-[13px] text-[#16A34A] font-medium">{fmtMoney(inv.paidAmount)}</td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: inv.balance > 0 ? "#DC2626" : "#57534E" }}>{fmtMoney(inv.balance)}</td>
                  <td className="px-4 py-3"><Badge s={inv.status} map={INV_BADGE} /></td>
                  <td className="px-4 py-3">
                    <button disabled className="h-7 px-2 rounded border border-[#E8E6E2] text-[11px] text-[#A8A29E] cursor-not-allowed">PDF</button>
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

// ── Transactions Tab ───────────────────────────────────────────────────────
function TransactionsTab({ contract }: { contract: any }) {
  const txns: any[] = contract.transactions ?? [];
  const totalCredit = txns.reduce((s: number, t: any) => s + (t.creditAmount ?? 0), 0);
  const totalDebit  = txns.reduce((s: number, t: any) => s + (t.debitAmount ?? 0), 0);

  return (
    <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-x-auto">
      <div className="px-5 py-3 border-b border-[#E8E6E2] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1C1917]">Transactions ({txns.length})</h3>
        <button disabled className="h-8 px-3 rounded-lg border border-[#E8E6E2] text-xs text-[#A8A29E] cursor-not-allowed">+ Record Payment</button>
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
                  {["Txn Ref","Date","Type","Credit","Debit","Status","Note"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txns.map((t: any) => (
                  <tr key={t.id} className="border-b border-[#E8E6E2] hover:bg-[#FAFAF9]">
                    <td className="px-4 py-3 font-mono text-xs text-[#57534E]">{t.bankReference ?? "—"}</td>
                    <td className="px-4 py-3 text-[12px] text-[#57534E]">{fmtDate(t.transactionDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${t.transactionType === "Credit" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEF2F2] text-[#DC2626]"}`}>
                        {t.transactionType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-semibold" style={{ color:"#16A34A" }}>
                      {t.creditAmount > 0 ? fmtMoney(t.creditAmount) : "—"}
                    </td>
                    <td className="px-4 py-3 text-[13px] font-semibold" style={{ color:"#DC2626" }}>
                      {t.debitAmount > 0 ? fmtMoney(t.debitAmount) : "—"}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#57534E]">{t.status ?? "—"}</td>
                    <td className="px-4 py-3 text-[12px] text-[#A8A29E] max-w-[140px] truncate">{t.description ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Summary */}
          <div className="px-5 py-3 border-t border-[#E8E6E2] flex gap-6" style={{ background:"#FAFAF9" }}>
            <div><span className="text-xs text-[#A8A29E]">Total Credits </span><span className="text-sm font-bold text-[#16A34A]">{fmtMoney(totalCredit)}</span></div>
            <div><span className="text-xs text-[#A8A29E]">Total Debits </span><span className="text-sm font-bold text-[#DC2626]">{fmtMoney(totalDebit)}</span></div>
            <div><span className="text-xs text-[#A8A29E]">Net </span><span className="text-sm font-bold" style={{ color:"#F5821F" }}>{fmtMoney(totalCredit - totalDebit)}</span></div>
          </div>
        </>
      )}
    </div>
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

// ── Add Service Modal ─────────────────────────────────────────────────────────
const SVC_API: Record<string, string> = {
  studyAbroad:   "/api/services/study-abroad",
  pickup:        "/api/services/pickup",
  accommodation: "/api/services/accommodation",
  internship:    "/api/services/internship",
  settlement:    "/api/services/settlement",
  guardian:      "/api/services/guardian",
  other:         "/api/services/other",
};
const SVC_DETAIL_ROUTE: Record<string, string> = {
  studyAbroad:   "/admin/services/study-abroad",
  pickup:        "/admin/services/pickup",
  accommodation: "/admin/services/accommodation",
  internship:    "/admin/services/internship",
  settlement:    "/admin/services/settlement",
  guardian:      "/admin/services/guardian",
  other:         "/admin/services/other",
};
const SVC_DEFS_MODAL = [
  { key: "studyAbroad",   label: "Study Abroad",   icon: GraduationCap, desc: "School application, visa & enrolment"  },
  { key: "pickup",        label: "Pickup",          icon: Car,           desc: "Airport or station transfer"            },
  { key: "accommodation", label: "Accommodation",   icon: Building2,     desc: "Homestay, residence or rental"         },
  { key: "internship",    label: "Internship",      icon: Briefcase,     desc: "Work placement management"             },
  { key: "settlement",    label: "Settlement",      icon: CheckCircle2,  desc: "Arrival & settlement support"          },
  { key: "guardian",      label: "Guardian",        icon: Shield,        desc: "Guardian / welfare management"        },
  { key: "other",         label: "Other Service",   icon: Wrench,        desc: "Custom or miscellaneous service"       },
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
  accommodation: "/admin/services/accommodation",
  internship:    "/admin/services/internship",
  settlement:    "/admin/services/settlement",
  guardian:      "/admin/services/guardian",
  other:         "/admin/services/other",
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
  { key: "accommodation", label: "Accommodation",   icon: Building2     },
  { key: "internship",    label: "Internship",      icon: Briefcase     },
  { key: "settlement",    label: "Settlement",      icon: CheckCircle2  },
  { key: "guardian",      label: "Guardian",        icon: Shield        },
  { key: "other",         label: "Other Service",   icon: Wrench        },
];

function ServicesPanel({ contract, primaryServiceType, setPrimaryServiceType, onAddService }: {
  contract: any;
  primaryServiceType: string;
  setPrimaryServiceType: (s: string) => void;
  onAddService: (defaultType?: string) => void;
}) {
  const [, navigate] = useLocation();
  const svcs = contract.services ?? {};

  const withData = ALL_SVC_DEFS.map(d => ({
    ...d,
    data: (d.key === "pickup" || d.key === "other")
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

  // Flatten all services into rows (supports multiple of same type, e.g. multiple pickups, other services)
  type SvcRow = { key: string; label: string; Icon: any; data: any };
  const rows: SvcRow[] = [];
  for (const def of ALL_SVC_DEFS) {
    if (def.key === "pickup" || def.key === "other") {
      const arr: any[] = Array.isArray(svcs[def.key]) ? svcs[def.key] : svcs[def.key] ? [svcs[def.key]] : [];
      arr.forEach(d => rows.push({ key: def.key, label: def.label, Icon: def.icon, data: d }));
    } else {
      const d = svcs[def.key];
      if (d) rows.push({ key: def.key, label: def.label, Icon: def.icon, data: d });
    }
  }

  const getInfo = (key: string, data: any): string => {
    if (!data) return "—";
    if (key === "pickup")        return [data.pickupType, data.airportName, data.pickupDate].filter(Boolean).join(" · ") || "—";
    if (key === "accommodation") return [data.accommodationType, data.hostName].filter(Boolean).join(" · ") || "—";
    if (key === "studyAbroad")   return [data.schoolName, data.courseName].filter(Boolean).join(" · ") || "—";
    if (key === "internship")    return [data.companyName, data.position].filter(Boolean).join(" · ") || "—";
    if (key === "settlement")    return data.settlementDate ?? "—";
    if (key === "guardian")      return [data.guardianName, data.relationship].filter(Boolean).join(" · ") || "—";
    if (key === "other")         return [data.serviceType, data.title].filter(Boolean).join(" · ") || "—";
    return "—";
  };

  const fmtDate = (raw: string | null | undefined) => {
    if (!raw) return "—";
    return new Date(raw).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
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
          <div className="grid grid-cols-[2fr_3fr_1.5fr_1.5fr_32px] gap-0 border-b border-[#E8E6E2] px-5 py-2.5">
            {["Service", "Details", "Status", "Applied", ""].map((h, i) => (
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
              const applied   = fmtDate(data?.createdAt);

              return (
                <div key={`${key}-${idx}`}
                  className="grid grid-cols-[2fr_3fr_1.5fr_1.5fr_32px] gap-0 px-5 py-3.5 items-center hover:bg-[#FAFAF9] cursor-pointer group transition-colors"
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
                  <span className="text-xs text-[#57534E] truncate pr-4">{info}</span>

                  {/* Status */}
                  <div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusCls}`}>
                      {status ? status.replace(/_/g, " ") : "—"}
                    </span>
                  </div>

                  {/* Applied date */}
                  <span className="text-xs text-[#A8A29E]">{applied}</span>

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
function DocumentsTab() {
  return (
    <div className="bg-white border border-[#E8E6E2] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#1C1917]">Documents (0)</h3>
        <button disabled className="h-8 px-3 rounded-lg border border-[#E8E6E2] text-xs text-[#A8A29E] flex items-center gap-1.5 cursor-not-allowed">
          <UploadCloud size={13} /> Upload
        </button>
      </div>
      <div className="text-center py-10 text-[#A8A29E]">
        <FileText size={28} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">No documents uploaded yet</p>
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
  const [editingContract, setEditingContract] = useState(false);
  const [editingAccount,  setEditingAccount]  = useState(false);
  const [addingService,   setAddingService]   = useState<string | null>(null);

  const openAddService = (defaultType?: string) =>
    setAddingService(defaultType ?? "");

  const { data: contract, isLoading } = useQuery({
    queryKey: ["crm-contract", id],
    queryFn: () => axios.get(`${BASE}/api/crm/contracts/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const [primaryServiceType, setPrimaryServiceType] = useState<string>(
    contract?.serviceModulesActivated?.[0] ?? "study_abroad"
  );

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
    if (primaryServiceType === "studyAbroad" || primaryServiceType === "study_abroad") return svcs.studyAbroad;
    if (primaryServiceType === "pickup")        return svcs.pickup?.[0];
    if (primaryServiceType === "accommodation") return svcs.accommodation;
    return null;
  })();

  // Counts for tab badges
  const counts: Partial<Record<TabKey, number>> = {
    schedule:     contract.contractProducts?.length ?? 0,
    invoices:     contract.invoices?.length          ?? 0,
    transactions: contract.transactions?.length      ?? 0,
    documents:    0,
  };
  // payments count fetched separately via query — rendered by PaymentsTab itself

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
          <button disabled className="h-8 px-3 rounded-lg border border-[#E8E6E2] text-sm text-[#A8A29E] flex items-center gap-1.5 cursor-not-allowed">
            <FileText size={13} /> Generate Invoice
          </button>
          <button disabled className="h-8 px-3 rounded-lg border border-[#E8E6E2] text-sm text-[#A8A29E] flex items-center gap-1.5 cursor-not-allowed">
            <CreditCard size={13} /> Record Payment
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">

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
            <InfoRow label="Name" value={contract.studentAccount?.name ?? contract.account?.name} />
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
                {"coeNumber" in primData && primData.coeNumber && <InfoRow label="COE" value={primData.coeNumber} />}
                {"visaType"  in primData && primData.visaType  && <InfoRow label="Visa" value={primData.visaType} />}
                {"type"      in primData && primData.type      && <InfoRow label="Type" value={primData.type} />}
                {"hostName"  in primData && primData.hostName  && <InfoRow label="Host" value={primData.hostName} />}
                {"checkin"   in primData && primData.checkin   && <InfoRow label="Check-in" value={fmtDate(primData.checkin)} />}
                {"checkout"  in primData && primData.checkout  && <InfoRow label="Check-out" value={fmtDate(primData.checkout)} />}
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

        {/* Tab Bar */}
        <div className="flex gap-0 border-b border-[#E8E6E2]">
          {TABS.map(tab => {
            const count = counts[tab.key];
            return (
              <button key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
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

        {/* Tab Content */}
        {activeTab === "overview"     && (
          <OverviewTab
            contract={contract}
            onEditContract={() => setEditingContract(true)}
            primaryServiceType={primaryServiceType}
            setPrimaryServiceType={setPrimaryServiceType}
            onAddService={openAddService}
          />
        )}
        {activeTab === "services"     && (
          <ServicesGridTab
            contract={contract}
            primaryServiceType={primaryServiceType}
            setPrimaryServiceType={setPrimaryServiceType}
            onAddService={openAddService}
          />
        )}
        {activeTab === "schedule"     && <PaymentScheduleTab contract={contract} />}
        {activeTab === "invoices"     && <InvoicesTab        contract={contract} />}
        {activeTab === "payments"     && <PaymentsTab        contractId={contract.id} />}
        {activeTab === "transactions" && <TransactionsTab    contract={contract} />}
        {activeTab === "commission"   && <CommissionTab      contract={contract} />}
        {activeTab === "documents"    && <DocumentsTab />}
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
    </div>
  );
}
