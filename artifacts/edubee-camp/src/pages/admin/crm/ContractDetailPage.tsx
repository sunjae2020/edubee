import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import axios from "axios";
import {
  ArrowLeft, ExternalLink, FileText, CreditCard, GraduationCap,
  Car, Building2, Briefcase, Shield, CheckCircle2, Clock,
  AlertCircle, ChevronRight, Star, TrendingUp, TrendingDown,
  UploadCloud, MessageSquare, Send, Download, Pencil, Plus, X,
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
  { key: "schedule",     label: "Payment Schedule"  },
  { key: "invoices",     label: "Invoices"          },
  { key: "transactions", label: "Transactions"      },
  { key: "commission",   label: "Commission / Cost" },
  { key: "documents",    label: "Documents"         },
  { key: "activity",     label: "Activity"          },
] as const;
type TabKey = (typeof TABS)[number]["key"];

// ── Overview Tab ───────────────────────────────────────────────────────────
function OverviewTab({ contract, onEditContract, primaryServiceType, setPrimaryServiceType }: {
  contract: any;
  onEditContract: () => void;
  primaryServiceType: string;
  setPrimaryServiceType: (s: string) => void;
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
          <InfoRow label="Quote Ref"         value={contract.quote?.quoteRefNumber} />
          <InfoRow label="Payment Frequency" value={contract.paymentFrequency?.replace("_"," ").replace(/\b\w/g,(c: string)=>c.toUpperCase())} />
          <InfoRow label="Contract From"     value={fmtDate(contract.fromDate)} />
          <InfoRow label="Contract To"       value={fmtDate(contract.toDate)} />
          <InfoRow label="Notes"             value={contract.notes} />
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
    <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-hidden">
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

// ── Payment Schedule Tab ───────────────────────────────────────────────────
function PaymentScheduleTab({ contract }: { contract: any }) {
  const products: any[] = contract.contractProducts ?? [];
  const totalAr = products.reduce((s: number, p: any) => s + (p.arAmount ?? 0), 0);
  const totalAp = products.reduce((s: number, p: any) => s + (p.apAmount ?? 0), 0);
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E8E6E2] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1C1917]">Payment Schedule ({products.length})</h3>
          <button disabled className="h-8 px-3 rounded-lg border border-[#E8E6E2] text-xs text-[#A8A29E] cursor-not-allowed">+ Add Instalment</button>
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
                <td></td>
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
    <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-hidden">
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

// ── Transactions Tab ───────────────────────────────────────────────────────
function TransactionsTab({ contract }: { contract: any }) {
  const txns: any[] = contract.transactions ?? [];
  const totalCredit = txns.reduce((s: number, t: any) => s + (t.creditAmount ?? 0), 0);
  const totalDebit  = txns.reduce((s: number, t: any) => s + (t.debitAmount ?? 0), 0);

  return (
    <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-hidden">
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
      <div className="grid grid-cols-4 gap-4">
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
      <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-hidden">
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

// ── Services Panel (shown on Overview right column) ─────────────────────────
const SERVICE_ROUTES: Record<string, string> = {
  studyAbroad:   "/admin/services/study-abroad",
  pickup:        "/admin/services/pickup",
  accommodation: "/admin/services/accommodation",
  internship:    "/admin/services/internship",
  settlement:    "/admin/services/settlement",
  guardian:      "/admin/services/guardian",
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
  { key: "studyAbroad",   label: "Study Abroad",  icon: GraduationCap },
  { key: "pickup",        label: "Pickup",         icon: Car           },
  { key: "accommodation", label: "Accommodation",  icon: Building2     },
  { key: "internship",    label: "Internship",     icon: Briefcase     },
  { key: "settlement",    label: "Settlement",     icon: CheckCircle2  },
  { key: "guardian",      label: "Guardian",       icon: Shield        },
];

function ServicesPanel({ contract, primaryServiceType, setPrimaryServiceType }: {
  contract: any;
  primaryServiceType: string;
  setPrimaryServiceType: (s: string) => void;
}) {
  const [, navigate] = useLocation();
  const [showAdd, setShowAdd] = useState(false);
  const svcs = contract.services ?? {};

  const withData = ALL_SVC_DEFS.map(d => ({
    ...d,
    data: d.key === "pickup" ? (svcs.pickup?.[0] ?? null) : (svcs[d.key] ?? null),
  }));
  const active   = withData.filter(d => !!d.data);
  const inactive = withData.filter(d => !d.data);

  return (
    <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E8E6E2] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1C1917]">Services
          <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF0E3] text-[#F5821F]">{active.length}</span>
        </h3>
        <div className="relative">
          <button
            onClick={() => setShowAdd(v => !v)}
            className="h-7 px-2.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1 transition-opacity hover:opacity-90"
            style={{ background: "#F5821F" }}>
            <Plus size={12} /> Add Service
          </button>
          {showAdd && inactive.length > 0 && (
            <div className="absolute right-0 top-8 bg-white border border-[#E8E6E2] rounded-lg shadow-lg py-1 z-20 w-48">
              {inactive.map(({ key, label, icon: Icon }) => (
                <button key={key}
                  onClick={() => { setShowAdd(false); navigate(`${SERVICE_ROUTES[key]}?contractId=${contract.id}`); }}
                  className="w-full text-left px-4 py-2 text-sm text-[#1C1917] hover:bg-[#FAFAF9] flex items-center gap-2">
                  <Icon size={13} style={{ color: "#F5821F" }} /> {label}
                </button>
              ))}
            </div>
          )}
          {showAdd && inactive.length === 0 && (
            <div className="absolute right-0 top-8 bg-white border border-[#E8E6E2] rounded-lg shadow-lg p-3 z-20 w-44">
              <p className="text-xs text-[#A8A29E]">All services are activated.</p>
            </div>
          )}
        </div>
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
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-3 gap-4">
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
        <div className="grid grid-cols-3 gap-4">
          {/* Student */}
          <div className="bg-white border border-[#E8E6E2] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">Student</p>
              {contract.account?.id && (
                <button onClick={() => navigate(`/admin/crm/accounts/${contract.account.id}`)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#F4F3F1] transition-colors text-[#A8A29E] hover:text-[#57534E]">
                  <ExternalLink size={13} />
                </button>
              )}
            </div>
            <InfoRow label="Name"        value={contract.account?.name} />
            <InfoRow label="Nationality" value={contract.account?.nationality} />
            <InfoRow label="Owner (EC)"  value={contract.owner?.name} />
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
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E] mb-3">Financial Summary</p>
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
          />
        )}
        {activeTab === "schedule"     && <PaymentScheduleTab contract={contract} />}
        {activeTab === "invoices"     && <InvoicesTab        contract={contract} />}
        {activeTab === "transactions" && <TransactionsTab    contract={contract} />}
        {activeTab === "commission"   && <CommissionTab      contract={contract} />}
        {activeTab === "documents"    && <DocumentsTab />}
        {activeTab === "activity"     && <ActivityTab contractId={id!} />}

      </div>

      {editingContract && (
        <EditContractModal
          contract={contract}
          onClose={() => setEditingContract(false)}
        />
      )}
    </div>
  );
}
