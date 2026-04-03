import { useState, useEffect } from "react";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { buildFullName } from "@/lib/nameUtils";
import { Plus, Search, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";
import { TableFooter } from "@/components/ui/table-footer";
import { useLookup } from "@/hooks/use-lookup";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PAGE_SIZE = 20;

const INDIVIDUAL_TYPES = ["Student", "Client"];


const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Student:      { bg: "#FEF0E3", text: "#F5821F" },
  Client:       { bg: "#FCE7F3", text: "#BE185D" },
  Company:      { bg: "#E0F2FE", text: "#0369A1" },
  Agent:        { bg: "#F4F3F1", text: "#57534E" },
  Institute:    { bg: "#DCFCE7", text: "#16A34A" },
  Partner:      { bg: "#EDE9FE", text: "#7C3AED" },
  Organization: { bg: "#FEF9C3", text: "#CA8A04" },
};

interface Account {
  id: string;
  name: string;
  accountType?: string | null;
  phoneNumber?: string | null;
  status: string;
  ownerId: string;
  primaryContactFirstName?: string | null;
  primaryContactLastName?: string | null;
  primaryContactOriginalName?: string | null;
  profileImageUrl?: string | null;
  createdOn?: string | null;
  modifiedOn?: string | null;
}

const fmtDate = (d?: string | null) => formatDate(d);

function TypeBadge({ type }: { type?: string | null }) {
  const t = type ?? "—";
  const colors = TYPE_COLORS[t] ?? { bg: "#F4F3F1", text: "#57534E" };
  if (!type) return <span className="text-stone-400 text-xs">—</span>;
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: colors.bg, color: colors.text }}>
      {t}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = status.toLowerCase() === "active";
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
      active ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#F4F3F1] text-[#57534E]"
    }`}>
      {status}
    </span>
  );
}

export default function AccountsPage() {
  const [, navigate] = useLocation();
  const accountTypes = useLookup("account_type");
  const { sortBy, sortDir, onSort } = useSortState("createdOn", "desc");
  const [search, setSearch]             = useState("");
  const [filterType, setFilterType]     = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage]                 = useState(1);
  const [pageSize, setPageSize]         = useState(PAGE_SIZE);

  useEffect(() => { setPage(1); }, [sortBy, sortDir]);

  const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
  if (search)                 params.set("search",       search);
  if (filterType !== "all")   params.set("account_type", filterType);
  if (filterStatus !== "all") params.set("status",       filterStatus);
  params.set("sortBy",  sortBy);
  params.set("sortDir", sortDir);

  const { data, isLoading } = useQuery({
    queryKey: ["crm-accounts", search, filterType, filterStatus, page, pageSize, sortBy, sortDir],
    queryFn:  () => axios.get(`${BASE}/api/crm/accounts?${params}`).then(r => r.data),
  });

  const rows: Account[] = data?.data  ?? [];
  const sorted = useSorted(rows, sortBy, sortDir);
  const total: number   = data?.total ?? 0;

  const COLS = 6;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-[#1C1917]">Accounts</h1>
          <p className="text-sm text-muted-foreground">{total} account{total !== 1 ? "s" : ""}</p>
        </div>
        <Button
          size="sm"
          className="bg-[#F5821F] hover:bg-[#D96A0A] text-white gap-1.5 h-8"
          onClick={() => navigate("/admin/crm/accounts/new")}
        >
          <Plus className="w-3.5 h-3.5" /> New Account
        </Button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <Input
            placeholder="Search accounts…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 h-9 text-sm border-[#E8E6E2] focus-visible:border-[#F5821F] focus-visible:ring-[#F5821F]/20"
          />
        </div>
        <Select value={filterType} onValueChange={v => { setFilterType(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-40 text-sm border-[#E8E6E2]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {accountTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-32 text-sm border-[#E8E6E2]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ── */}
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <SortableTh col="name" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</SortableTh>
              <SortableTh col="accountType" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</SortableTh>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Original Name</th>
              <SortableTh col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</SortableTh>
              <SortableTh col="createdOn" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Created</SortableTh>
              <SortableTh col="modifiedOn" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Modified</SortableTh>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b">
                  {[...Array(COLS)].map((_, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-4" /></td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={COLS} className="px-4 py-16 text-center">
                  <Building2 className="w-8 h-8 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground font-medium">No accounts found</p>
                  <Button size="sm" className="mt-3 bg-[#F5821F] hover:bg-[#D96A0A] text-white gap-1.5"
                    onClick={() => navigate("/admin/crm/accounts/new")}>
                    <Plus className="w-3.5 h-3.5" /> New Account
                  </Button>
                </td>
              </tr>
            ) : (
              sorted.map(row => {
                const isIndividual = INDIVIDUAL_TYPES.includes(row.accountType ?? "");
                const displayName = isIndividual
                  ? buildFullName({ firstName: row.primaryContactFirstName, lastName: row.primaryContactLastName }, row.name)
                  : row.name;
                const originalName = row.primaryContactOriginalName || "—";
                const typeColors = TYPE_COLORS[row.accountType ?? ""] ?? { bg: "#F4F3F1", text: "#57534E" };
                const isIndividual2 = INDIVIDUAL_TYPES.includes(row.accountType ?? "");
                const listInitials = isIndividual2
                  ? [(row.primaryContactFirstName ?? "").charAt(0), (row.primaryContactLastName ?? "").charAt(0)].filter(Boolean).join("").toUpperCase() || (displayName || "?").slice(0, 2).toUpperCase()
                  : (displayName || "?").slice(0, 2).toUpperCase();
                const listImgSrc = row.profileImageUrl
                  ? `${BASE}/api/storage/objects/${row.profileImageUrl.replace(/^\/objects\//, "")}`
                  : null;
                return (
                  <tr key={row.id}
                    className="border-b last:border-0 hover:bg-[#FEF0E3] transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/crm/accounts/${row.id}`)}>
                    <td className="px-4 py-3 font-medium text-[#1C1917]">
                      <div className="flex items-center gap-2.5">
                        {listImgSrc ? (
                          <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border" style={{ borderColor: typeColors.bg }}>
                            <img src={listImgSrc} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: typeColors.bg, color: typeColors.text }}>
                            {listInitials}
                          </div>
                        )}
                        {displayName}
                      </div>
                    </td>
                    <td className="px-4 py-3"><TypeBadge type={row.accountType} /></td>
                    <td className="px-4 py-3 text-sm text-[#57534E]">{originalName}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{fmtDate(row.createdOn)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{fmtDate(row.modifiedOn)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <TableFooter page={page} pageSize={pageSize} total={total} label="accounts" onPageChange={setPage} onPageSizeChange={v => { setPageSize(v); setPage(1); }} />
      </div>
    </div>
  );
}
