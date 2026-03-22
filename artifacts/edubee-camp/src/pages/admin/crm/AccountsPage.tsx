import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import {
  Plus, Search, Building2, Eye, Trash2, MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PAGE_SIZE = 20;

const ACCOUNT_TYPES = ["Student", "School", "Agent", "Provider", "Organisation"];
const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Student:      { bg: "#FEF0E3", text: "#F5821F" },
  School:       { bg: "#DCFCE7", text: "#16A34A" },
  Agent:        { bg: "#E0F2FE", text: "#0369A1" },
  Provider:     { bg: "#F3E8FF", text: "#7C3AED" },
  Organisation: { bg: "#F4F3F1", text: "#57534E" },
};

interface Account {
  id: string;
  name: string;
  accountType?: string | null;
  accountCategory?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  status: string;
  ownerId: string;
  primaryContactFirstName?: string | null;
  primaryContactLastName?: string | null;
  createdOn?: string | null;
}

function TypeBadge({ type }: { type?: string | null }) {
  const t = type ?? "Other";
  const colors = TYPE_COLORS[t] ?? { bg: "#F4F3F1", text: "#57534E" };
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: colors.bg, color: colors.text }}
    >
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
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch]           = useState("");
  const [filterType, setFilterType]   = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage]               = useState(1);

  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (search)                    params.set("search", search);
  if (filterType !== "all")      params.set("account_type", filterType);
  if (filterStatus !== "all")    params.set("status", filterStatus);

  const { data, isLoading } = useQuery({
    queryKey: ["crm-accounts", search, filterType, filterStatus, page],
    queryFn:  () => axios.get(`${BASE}/api/crm/accounts?${params}`).then(r => r.data),
  });

  const rows: Account[]  = data?.data  ?? [];
  const total: number    = data?.total ?? 0;
  const totalPages       = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const deleteMut = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/crm/accounts/${id}`),
    onSuccess: () => {
      toast({ title: "Account deactivated" });
      qc.invalidateQueries({ queryKey: ["crm-accounts"] });
    },
    onError: () => toast({ title: "Failed to deactivate", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Accounts</h1>
          <p className="text-sm text-stone-500 mt-0.5">{total} account{total !== 1 ? "s" : ""}</p>
        </div>
        <Button
          onClick={() => navigate("/admin/crm/accounts/new")}
          className="flex items-center gap-1.5 text-sm"
          style={{ background: "#F5821F", color: "#fff" }}
        >
          <Plus size={15} strokeWidth={2} />
          New Account
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input
            placeholder="Search accounts…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 h-9 text-sm border-[#E8E6E2] focus:border-[#F5821F]"
          />
        </div>
        <Select value={filterType} onValueChange={v => { setFilterType(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-40 text-sm border-[#E8E6E2]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-36 text-sm border-[#E8E6E2]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-stone-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-stone-400">
            <Building2 size={36} strokeWidth={1.5} />
            <p className="font-medium">No accounts yet</p>
            <Button
              size="sm"
              onClick={() => navigate("/admin/crm/accounts/new")}
              style={{ background: "#F5821F", color: "#fff" }}
            >
              <Plus size={14} className="mr-1" /> New Account
            </Button>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8E6E2]" style={{ background: "#FAFAF9" }}>
                  {["Name", "Type", "Category", "Primary Contact", "Email", "Phone", "Status", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-stone-500 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F3F1]">
                {rows.map(row => {
                  const contactName = [row.primaryContactFirstName, row.primaryContactLastName]
                    .filter(Boolean).join(" ") || "—";
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-[#FAFAF9] cursor-pointer transition-colors"
                      onClick={() => navigate(`/admin/crm/accounts/${row.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-stone-800">{row.name}</td>
                      <td className="px-4 py-3"><TypeBadge type={row.accountType} /></td>
                      <td className="px-4 py-3 text-stone-600">{row.accountCategory ?? "—"}</td>
                      <td className="px-4 py-3 text-stone-600">{contactName}</td>
                      <td className="px-4 py-3 text-stone-600">{row.email ?? "—"}</td>
                      <td className="px-4 py-3 text-stone-600">{row.phoneNumber ?? "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/admin/crm/accounts/${row.id}`)}
                            className="p-1.5 rounded hover:bg-[#F4F3F1] text-stone-400 hover:text-stone-700 transition-colors"
                          >
                            <Eye size={14} />
                          </button>
                          {row.status === "Active" && (
                            <button
                              onClick={() => {
                                if (confirm(`Deactivate "${row.name}"?`)) deleteMut.mutate(row.id);
                              }}
                              className="p-1.5 rounded hover:bg-red-50 text-stone-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E8E6E2]">
                <span className="text-xs text-stone-500">
                  Page {page} of {totalPages} · {total} total
                </span>
                <div className="flex gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 text-xs rounded border border-[#E8E6E2] disabled:opacity-40 hover:bg-[#F4F3F1] transition-colors"
                  >Prev</button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 text-xs rounded border border-[#E8E6E2] disabled:opacity-40 hover:bg-[#F4F3F1] transition-colors"
                  >Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
