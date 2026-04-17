import { useState, useEffect } from "react";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { useAuth } from "@/hooks/use-auth";
import { useBulkSelect } from "@/hooks/use-bulk-select";
import { BulkActionBar } from "@/components/common/BulkActionBar";
import { Plus, FileText, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";
import { useToast } from "@/hooks/use-toast";
import { ClientNameCell } from "@/components/common/ClientNameCell";
import { nameFromAccount } from "@/lib/nameUtils";
import { TableFooter } from "@/components/ui/table-footer";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_STYLES: Record<string, string> = {
  Draft:    "bg-[#F4F3F1] text-[#57534E]",
  Sent:     "bg-(--e-orange-lt) text-(--e-orange)",
  Accepted: "bg-[#DCFCE7] text-[#16A34A]",
  Declined: "bg-[#FEF2F2] text-[#DC2626]",
  Expired:  "bg-[#F4F3F1] text-[#A8A29E]",
};

interface QuoteRow {
  id: string;
  quoteRefNumber?: string | null;
  accountName?: string | null;
  originalName?: string | null;
  accountFirstName?: string | null;
  accountLastName?: string | null;
  accountOriginalName?: string | null;
  accountEmail?: string | null;
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

const fmtDate = (d?: string | null) => formatDate(d);

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
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const createMutation = useMutation({
    mutationFn: () =>
      axios.post(`${BASE}/api/crm/quotes`, { quoteStatus: "Draft" }).then(r => r.data),
    onSuccess: (created) => navigate(`/admin/crm/quotes/${created.id}`),
  });

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, sortBy, sortDir]);

  const { data: resp, isLoading } = useQuery({
    queryKey: ["crm-quotes", tab, page, pageSize, debouncedSearch, statusFilter, sortBy, sortDir],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (tab === "templates") p.set("isTemplate", "true");
      else p.set("isTemplate", "false");
      if (debouncedSearch.trim()) p.set("search", debouncedSearch.trim());
      if (statusFilter !== "all") p.set("quoteStatus", statusFilter);
      // Pass sort to server — server supports createdOn / modifiedOn
      const serverSortCol = sortBy === "modifiedOn" ? "modifiedOn" : "createdOn";
      p.set("sortBy", serverSortCol);
      p.set("sortDir", sortDir);
      return axios.get(`${BASE}/api/crm/quotes?${p}`).then(r => r.data);
    },
  });

  const rows: QuoteRow[] = resp?.data ?? [];
  const sorted = useSorted(rows, sortBy, sortDir);
  const total = resp?.meta?.total ?? 0;

  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isSA = user?.role === "super_admin";
  const { selectedIds, toggleSelect, toggleAll, clearSelection, isAllSelected } = useBulkSelect();
  const sortedIds = sorted.map(r => r.id);

  const softDelMutation = useMutation({
    mutationFn: (ids: string[]) => axios.delete(`${BASE}/api/crm/quotes/bulk`, { data: { ids, soft: true } }).then(r => r.data),
    onSuccess: (_d, ids) => { qc.invalidateQueries({ queryKey: ["crm-quotes"] }); clearSelection(); toast({ title: `${ids.length} moved to trash` }); },
    onError: () => toast({ title: "삭제 실패", variant: "destructive" }),
  });
  const hardDelMutation = useMutation({
    mutationFn: (ids: string[]) => axios.delete(`${BASE}/api/crm/quotes/bulk`, { data: { ids } }).then(r => r.data),
    onSuccess: (_d, ids) => { qc.invalidateQueries({ queryKey: ["crm-quotes"] }); clearSelection(); toast({ title: `${ids.length} permanently deleted` }); },
    onError: () => toast({ title: "삭제 실패", variant: "destructive" }),
  });
  const bulkLoading = softDelMutation.isPending || hardDelMutation.isPending;

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
          style={{ background: "var(--e-orange)" }}
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
              tab === key ? "border-(--e-orange) text-(--e-orange)" : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <FileText size={14} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by ref, name…"
            className="pl-8 pr-8 h-9 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-40 text-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Sent">Sent</SelectItem>
            <SelectItem value="Accepted">Accepted</SelectItem>
            <SelectItem value="Declined">Declined</SelectItem>
            <SelectItem value="Expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isSA && selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          isLoading={bulkLoading}
          onSoftDelete={() => softDelMutation.mutate(Array.from(selectedIds))}
          onHardDelete={() => hardDelMutation.mutate(Array.from(selectedIds))}
        />
      )}

      <div className="rounded-xl border border-stone-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              {isSA && (
                <th className="px-3 py-3 w-10">
                  <input type="checkbox" checked={isAllSelected(sortedIds)} onChange={() => toggleAll(sortedIds)} className="rounded border-stone-300" />
                </th>
              )}
              <SortableTh col="quoteRef" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Quote Ref</SortableTh>
              <SortableTh col="customerName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Client</SortableTh>
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
              <tr><td colSpan={isSA ? 9 : 8} className="text-center py-12 text-stone-400 text-sm">Loading…</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={isSA ? 9 : 8} className="text-center py-12 text-stone-400 text-sm">No quotes found</td></tr>
            )}
            {sorted.map(q => (
              <tr key={q.id} className="hover:bg-(--e-orange-lt) cursor-pointer transition-colors">
                {isSA && (
                  <td className="px-3 py-3 w-10" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(q.id)} onChange={() => toggleSelect(q.id)} className="rounded border-stone-300" />
                  </td>
                )}
                <td className="px-4 py-3 font-mono text-xs text-stone-500">{q.quoteRefNumber ?? "—"}</td>
                <td className="px-4 py-3">
                  <button onClick={() => navigate(`/admin/crm/quotes/${q.id}`)} className="text-left w-full">
                    <ClientNameCell
                      fields={nameFromAccount({
                        firstName: q.accountFirstName,
                        lastName:  q.accountLastName,
                        originalName: q.originalName ?? q.accountOriginalName,
                        name: q.accountName,
                      })}
                      accountId={q.studentAccountId}
                      subLabel={q.accountEmail ?? undefined}
                    />
                  </button>
                </td>
                <td className="px-4 py-3 text-stone-600">{q.products?.length ?? 0}</td>
                <td className="px-4 py-3 font-medium text-stone-800">
                  {q.total != null ? `A$${Number(q.total).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—"}
                </td>
                <td className="px-4 py-3"><StatusBadge status={q.quoteStatus} /></td>
                <td className="px-4 py-3 text-stone-600">
                  {formatDate(q.expiryDate)}
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
