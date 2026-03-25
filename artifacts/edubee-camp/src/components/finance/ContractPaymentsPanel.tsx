import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { CreditCard, ExternalLink, ArrowRight } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const fmtMoney = (n: any) =>
  n != null ? `$${Number(n).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
const fmtDate = (d: any) => (d ? new Date(d).toLocaleDateString("en-AU") : "—");

const PTYPE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  trust_receipt:     { bg: "#DCFCE7", text: "#16A34A", label: "Received" },
  trust_transfer:    { bg: "#FEF0E3", text: "#F5821F", label: "Transfer" },
  commission:        { bg: "#EDE9FE", text: "#7C3AED", label: "Commission" },
  direct:            { bg: "#F0F9FF", text: "#0369A1", label: "Direct" },
  service_fee_camp:  { bg: "#DCFCE7", text: "#16A34A", label: "Service Fee" },
  camp_tour_ap:      { bg: "#FEF9C3", text: "#CA8A04", label: "Tour AP" },
  camp_institute_ap: { bg: "#FEF9C3", text: "#CA8A04", label: "Institute AP" },
};

interface Props {
  contractId: string | null | undefined;
  contractNumber?: string | null;
  compact?: boolean;
}

export function ContractPaymentsPanel({ contractId, contractNumber, compact = false }: Props) {
  const [, navigate] = useLocation();

  const { data: rows = [], isLoading } = useQuery<any[]>({
    queryKey: ["contract-payments", contractId],
    queryFn: () =>
      axios.get(`${BASE}/api/accounting/payments/by-contract/${contractId}`).then(r => r.data),
    enabled: !!contractId,
  });

  if (!contractId) {
    return (
      <div className="text-center py-8 text-stone-400">
        <CreditCard size={24} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">No contract linked to this service record.</p>
      </div>
    );
  }

  // Group lines by payment header
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
      <div className="py-8 text-center text-stone-400 text-sm">Loading payments…</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Link to contract */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-stone-400">
          Showing payments linked to contract{contractNumber ? ` ${contractNumber}` : ""}
        </p>
        <button
          onClick={() => navigate(`/admin/crm/contracts/${contractId}`)}
          className="flex items-center gap-1 text-xs font-medium hover:opacity-80"
          style={{ color: "#F5821F" }}
        >
          <ExternalLink size={12} /> Open Contract
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-stone-200 rounded-xl p-3">
          <p className="text-xs text-stone-400 mb-0.5">Received (AR)</p>
          <p className="text-lg font-bold text-[#16A34A]">{fmtMoney(totalReceived)}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-3">
          <p className="text-xs text-stone-400 mb-0.5">Paid Out (AP)</p>
          <p className="text-lg font-bold text-[#DC2626]">{fmtMoney(totalPaid)}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-3">
          <p className="text-xs text-stone-400 mb-0.5">Payments</p>
          <p className="text-lg font-bold text-stone-700">{headers.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        {headers.length === 0 ? (
          <div className="text-center py-8 text-stone-400">
            <CreditCard size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No payments recorded against this contract yet.</p>
            <button
              onClick={() => navigate(`/admin/crm/contracts/${contractId}`)}
              className="mt-3 flex items-center gap-1 text-xs font-medium mx-auto hover:opacity-80"
              style={{ color: "#F5821F" }}
            >
              Go to Contract <ArrowRight size={11} />
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="text-left px-4 py-2.5 text-stone-400 font-medium">Ref</th>
                  <th className="text-left px-4 py-2.5 text-stone-400 font-medium">Date</th>
                  <th className="text-left px-4 py-2.5 text-stone-400 font-medium">Type</th>
                  <th className="text-left px-4 py-2.5 text-stone-400 font-medium">Counterparty</th>
                  {!compact && <th className="text-left px-4 py-2.5 text-stone-400 font-medium">Products</th>}
                  <th className="text-left px-4 py-2.5 text-stone-400 font-medium">Amount</th>
                  <th className="text-left px-4 py-2.5 text-stone-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {headers.map(({ header, lines }) => {
                  const badge = PTYPE_BADGE[header.payment_type] ?? { bg: "#F4F3F1", text: "#57534E", label: header.payment_type };
                  const counterparty = header.received_from_name ?? header.paid_to_name ?? "—";
                  const productNames = [...new Set(lines.map((l: any) => l.product_name).filter(Boolean))].join(", ") || "—";
                  const isReceipt = ["trust_receipt", "service_fee_camp"].includes(header.payment_type);
                  return (
                    <tr key={header.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="px-4 py-2.5 font-mono text-stone-500">{header.payment_ref}</td>
                      <td className="px-4 py-2.5 text-stone-500">{fmtDate(header.payment_date)}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex px-1.5 py-0.5 rounded-full text-[11px] font-medium" style={{ background: badge.bg, color: badge.text }}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-stone-700 max-w-[100px] truncate">{counterparty}</td>
                      {!compact && <td className="px-4 py-2.5 text-stone-500 max-w-[120px] truncate">{productNames}</td>}
                      <td className="px-4 py-2.5 font-bold" style={{ color: isReceipt ? "#16A34A" : "#DC2626" }}>
                        {fmtMoney(Number(header.total_amount))}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[11px] font-medium ${
                          header.status === "Approved" ? "bg-[#DCFCE7] text-[#16A34A]" :
                          header.status === "Pending"  ? "bg-[#FEF9C3] text-[#CA8A04]" :
                          "bg-stone-100 text-stone-500"}`}>
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
          <div className="px-4 py-2.5 border-t border-stone-100 bg-stone-50 flex justify-between items-center">
            <div className="flex gap-4 text-xs">
              <span className="text-stone-400">Received: <strong className="text-[#16A34A]">{fmtMoney(totalReceived)}</strong></span>
              <span className="text-stone-400">Paid Out: <strong className="text-[#DC2626]">{fmtMoney(totalPaid)}</strong></span>
            </div>
            <button
              onClick={() => navigate(`/admin/crm/contracts/${contractId}`)}
              className="flex items-center gap-1 text-xs font-medium hover:opacity-80"
              style={{ color: "#F5821F" }}
            >
              Full History in Contract <ArrowRight size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
