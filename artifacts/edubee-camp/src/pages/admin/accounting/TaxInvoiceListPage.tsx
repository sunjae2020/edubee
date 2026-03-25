import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Download, Send, CheckCircle2, Clock, DollarSign, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";

const BASE   = import.meta.env.BASE_URL.replace(/\/$/, "");
const EMPTY: any[] = [];

function fmtAud(val: string | number | null | undefined) {
  if (val == null) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return `A$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(val: string | null | undefined) {
  if (!val) return "—";
  try { return format(new Date(val), "dd MMM yyyy"); } catch { return val; }
}

const TABS = [
  { key: "",      label: "All"   },
  { key: "net",   label: "NET"   },
  { key: "gross", label: "GROSS" },
];
const STATUS_TABS = [
  { key: "",       label: "All"    },
  { key: "draft",  label: "Draft"  },
  { key: "sent",   label: "Sent"   },
  { key: "paid",   label: "Paid"   },
];

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-amber-50 text-amber-700 border border-amber-200",
  sent:  "bg-blue-50  text-blue-700  border border-blue-200",
  paid:  "bg-green-50 text-green-700 border border-green-200",
};

export default function TaxInvoiceListPage() {
  const { toast }  = useToast();
  const qc         = useQueryClient();
  const [typeTab,   setTypeTab]   = useState("");
  const { sortBy, sortDir, onSort } = useSortState();
  const [statusTab, setStatusTab] = useState("");

  const qs = new URLSearchParams();
  if (typeTab)   qs.set("type",   typeTab);
  if (statusTab) qs.set("status", statusTab);

  const { data, isLoading } = useQuery({
    queryKey: ["tax-invoices", typeTab, statusTab],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/tax-invoices?${qs.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load tax invoices");
      return res.json();
    },
    staleTime: 30_000,
  });

  const rows: any[] = data?.data ?? EMPTY;
  const sorted = useSorted(rows, sortBy, sortDir);

  const totals = rows.reduce((acc, r) => {
    acc.total     += parseFloat(r.totalAmount ?? "0");
    acc.commission+= parseFloat(r.commissionAmount ?? "0");
    acc.gst       += parseFloat(r.gstAmount ?? "0");
    acc[r.status]  = (acc[r.status] ?? 0) + 1;
    return acc;
  }, { total: 0, commission: 0, gst: 0, draft: 0, sent: 0, paid: 0 });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${BASE}/api/tax-invoices/${id}/send`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: (_, id) => {
      toast({ title: "Tax Invoice sent", description: "Email sent to school successfully." });
      qc.invalidateQueries({ queryKey: ["tax-invoices"] });
    },
    onError: () => toast({ title: "Send failed", variant: "destructive" }),
  });

  const paidMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${BASE}/api/tax-invoices/${id}/mark-paid`, {
        method: "POST", credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark paid");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Marked as received" });
      qc.invalidateQueries({ queryKey: ["tax-invoices"] });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  function downloadPdf(id: string, ref: string) {
    window.open(`${BASE}/api/tax-invoices/${id}/pdf`, "_blank");
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] p-6">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FileText size={20} className="text-[#F5821F]" />
          <h1 className="text-xl font-bold text-[#1C1917]">Tax Invoices</h1>
        </div>
        <p className="text-sm text-[#78716C]">Commission tax invoices issued to schools for NET and GROSS remittances</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Invoiced", value: fmtAud(totals.total),      icon: DollarSign, color: "text-[#F5821F]" },
          { label: "Commission",     value: fmtAud(totals.commission),  icon: FileText,   color: "text-blue-600"  },
          { label: "GST Collected",  value: fmtAud(totals.gst),         icon: CheckCircle2,color:"text-green-600" },
          { label: "Pending (Draft)",value: `${totals.draft} invoices`,  icon: Clock,      color: "text-amber-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-[#E8E6E2] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className={color} />
              <span className="text-xs text-[#78716C] uppercase tracking-wide font-medium">{label}</span>
            </div>
            <p className="text-lg font-bold text-[#1C1917]">{value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] overflow-x-auto">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#E8E6E2] flex-wrap gap-3">
          {/* Type filter */}
          <div className="flex gap-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTypeTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  typeTab === t.key
                    ? "bg-[#F5821F] text-white"
                    : "text-[#57534E] hover:bg-[#F5F4F2]"
                }`}
              >{t.label}</button>
            ))}
          </div>
          {/* Status filter */}
          <div className="flex gap-1">
            {STATUS_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setStatusTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusTab === t.key
                    ? "bg-[#1C1917] text-white"
                    : "text-[#57534E] hover:bg-[#F5F4F2]"
                }`}
              >{t.label}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E6E2] bg-[#FAFAF9]">
                <>
              <SortableTh key="Invoice Ref" col="invoiceRef" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-left text-xs font-semibold text-[#78716C] uppercase tracking-wide whitespace-nowrap">Invoice Ref</SortableTh>
              <SortableTh key="Date" col="invoiceDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-left text-xs font-semibold text-[#78716C] uppercase tracking-wide whitespace-nowrap">Date</SortableTh>
              <SortableTh key="Type" col="invoiceType" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-left text-xs font-semibold text-[#78716C] uppercase tracking-wide whitespace-nowrap">Type</SortableTh>
              <SortableTh key="School" col="schoolName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-left text-xs font-semibold text-[#78716C] uppercase tracking-wide whitespace-nowrap">School</SortableTh>
              <SortableTh key="Student / Program" col="studentName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-left text-xs font-semibold text-[#78716C] uppercase tracking-wide whitespace-nowrap">Student / Program</SortableTh>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#78716C] uppercase tracking-wide whitespace-nowrap">Commission</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#78716C] uppercase tracking-wide whitespace-nowrap">GST</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#78716C] uppercase tracking-wide whitespace-nowrap">Total</th>
              <SortableTh key="Status" col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-left text-xs font-semibold text-[#78716C] uppercase tracking-wide whitespace-nowrap">Status</SortableTh>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#78716C] uppercase tracking-wide whitespace-nowrap">Actions</th>
            </>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-[#A8A29E]">Loading…</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-[#A8A29E]">No tax invoices found.</td></tr>
              )}
              {sorted.map(row => (
                <tr key={row.id} className="border-b border-[#F5F4F2] hover:bg-[#FAFAF9] transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-[#1C1917] font-semibold whitespace-nowrap">{row.invoiceRef}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-[#57534E]">{fmtDate(row.invoiceDate)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      row.invoiceType === "net"
                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                        : "bg-sky-50 text-sky-700 border border-sky-200"
                    }`}>
                      {row.invoiceType?.toUpperCase() ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#1C1917] max-w-[140px] truncate" title={row.schoolName}>{row.schoolName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="text-[#1C1917] font-medium truncate max-w-[160px]" title={row.studentName}>{row.studentName}</div>
                    <div className="text-xs text-[#A8A29E] truncate max-w-[160px]" title={row.programName}>{row.programName}</div>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap text-[#1C1917]">{fmtAud(row.commissionAmount)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap text-[#57534E]">
                    {row.isGstFree
                      ? <span className="text-xs text-[#A8A29E]">GST-free</span>
                      : fmtAud(row.gstAmount)
                    }
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap font-semibold text-[#F5821F]">{fmtAud(row.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[row.status] ?? ""}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 items-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        title="Download PDF"
                        onClick={() => downloadPdf(row.id, row.invoiceRef)}
                      >
                        <Download size={13} />
                      </Button>
                      {row.status !== "paid" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700"
                          title="Resend Email"
                          disabled={sendMutation.isPending}
                          onClick={() => sendMutation.mutate(row.id)}
                        >
                          <Send size={13} />
                        </Button>
                      )}
                      {row.invoiceType === "gross" && row.status !== "paid" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-green-600 hover:text-green-700 whitespace-nowrap"
                          title="Mark commission received"
                          disabled={paidMutation.isPending}
                          onClick={() => paidMutation.mutate(row.id)}
                        >
                          <CheckCircle2 size={13} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
