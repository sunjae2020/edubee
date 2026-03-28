import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";
import { ClientNameCell } from "@/components/common/ClientNameCell";
import { nameFromAccount } from "@/lib/nameUtils";
import { TableFooter } from "@/components/ui/table-footer";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_STYLES: Record<string, string> = {
  Draft:    "bg-[#F4F3F1] text-[#57534E]",
  Sent:     "bg-[#FEF0E3] text-[#F5821F]",
  Accepted: "bg-[#DCFCE7] text-[#16A34A]",
  Declined: "bg-[#FEF2F2] text-[#DC2626]",
  Expired:  "bg-[#F4F3F1] text-[#A8A29E]",
};

interface QuoteRow {
  id: string;
  quoteRefNumber?: string | null;
  accountName?: string | null;
  accountFirstName?: string | null;
  accountLastName?: string | null;
  accountOriginalName?: string | null;
  studentAccountId?: string | null;
  contactId?: string | null;
  quoteStatus: string;
  expiryDate?: string | null;
  isTemplate: boolean;
  products?: Array<{ id: string }>;
  total?: number;
  createdOn: string;
  modifiedOn?: string | null;
}

const fmtDate = (d?: string | null) => d ? format(new Date(d), "dd MMM yyyy") : "—";

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.Draft}`}>
      {status}
    </span>
  );
}

export default function QuotesPage() {
  const [, navigate] = useLocation();
  const { sortBy, sortDir, onSort } = useSortState("createdOn", "desc");
  const [tab, setTab] = useState<"quotes" | "templates">("quotes");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const createMutation = useMutation({
    mutationFn: () =>
      axios.post(`${BASE}/api/crm/quotes`, { quoteStatus: "Draft" }).then(r => r.data),
    onSuccess: (created) => navigate(`/admin/crm/quotes/${created.id}`),
  });

  const { data: resp, isLoading } = useQuery({
    queryKey: ["crm-quotes", tab, page, pageSize],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (tab === "templates") p.set("isTemplate", "true");
      else p.set("isTemplate", "false");
      return axios.get(`${BASE}/api/crm/quotes?${p}`).then(r => r.data);
    },
  });

  const rows: QuoteRow[] = resp?.data ?? [];
  const sorted = useSorted(rows, sortBy, sortDir);
  const total = resp?.meta?.total ?? 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-800">Quotes</h1>
          <p className="text-sm text-stone-500 mt-1">Create and manage client quotations</p>
        </div>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="flex items-center gap-2 text-white rounded-lg"
          style={{ background: "#F5821F" }}
        >
          <Plus size={16} /> {createMutation.isPending ? "Creating…" : "New Quote"}
        </Button>
      </div>

      <div className="flex gap-1 border-b border-stone-200">
        {([["quotes", "All Quotes"], ["templates", "Templates"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setPage(1); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? "border-[#F5821F] text-[#F5821F]" : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <FileText size={14} />
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-stone-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <SortableTh col="quoteRef" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Quote Ref</SortableTh>
              <SortableTh col="customerName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Customer</SortableTh>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Items</th>
              <SortableTh col="totalAmount" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Total (AUD)</SortableTh>
              <SortableTh col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</SortableTh>
              <SortableTh col="expiryDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Expiry</SortableTh>
              <SortableTh col="createdOn" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide whitespace-nowrap">Created</SortableTh>
              <SortableTh col="modifiedOn" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide whitespace-nowrap">Modified</SortableTh>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading && (
              <tr><td colSpan={8} className="text-center py-12 text-stone-400 text-sm">Loading…</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-stone-400 text-sm">No quotes found</td></tr>
            )}
            {sorted.map(q => (
              <tr key={q.id} className="hover:bg-[#FEF0E3] cursor-pointer transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-stone-500">{q.quoteRefNumber ?? "—"}</td>
                <td className="px-4 py-3">
                  <button onClick={() => navigate(`/admin/crm/quotes/${q.id}`)} className="text-left w-full">
                    <ClientNameCell
                      fields={nameFromAccount({
                        firstName: q.accountFirstName,
                        lastName:  q.accountLastName,
                        originalName: q.accountOriginalName,
                        name: q.accountName,
                      })}
                      accountId={q.studentAccountId}
                      subLabel={q.quoteRefNumber ?? undefined}
                    />
                  </button>
                </td>
                <td className="px-4 py-3 text-stone-600">{q.products?.length ?? 0}</td>
                <td className="px-4 py-3 font-medium text-stone-800">
                  {q.total != null ? `A$${Number(q.total).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—"}
                </td>
                <td className="px-4 py-3"><StatusBadge status={q.quoteStatus} /></td>
                <td className="px-4 py-3 text-stone-600">
                  {q.expiryDate ? format(new Date(q.expiryDate), "MMM d, yyyy") : "—"}
                </td>
                <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap">{fmtDate(q.createdOn)}</td>
                <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap">{fmtDate(q.modifiedOn)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TableFooter
        page={page}
        pageSize={pageSize}
        total={total}
        label="quotes"
        onPageChange={setPage}
        onPageSizeChange={v => { setPageSize(v); setPage(1); }}
      />
    </div>
  );
}
