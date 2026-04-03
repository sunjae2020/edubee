import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/date-format";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const PLAN_STYLE: Record<string, { bg: string; color: string }> = {
  starter:      { bg: "#F4F3F1", color: "#57534E" },
  professional: { bg: "#FEF0E3", color: "#C2410C" },
  enterprise:   { bg: "#F5F3FF", color: "#6D28D9" },
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Active:    { bg: "#F0FDF4", color: "#15803D" },
  Suspended: { bg: "#FFF1F2", color: "#9F1239" },
  Cancelled: { bg: "#F4F3F1", color: "#57534E" },
  trial:     { bg: "#FFFBEB", color: "#92400E" },
};

function Badge({ label, style }: { label: string; style: { bg: string; color: string } }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize"
      style={style}
    >
      {label}
    </span>
  );
}

export default function TenantList() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);
  const [debSearch, setDeb]   = useState("");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["superadmin-tenants", debSearch, page],
    queryFn: () =>
      axios.get(`${BASE}/api/superadmin/tenants`, { params: { search: debSearch, page, pageSize: 20 } }).then(r => r.data),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      axios.put(`${BASE}/api/superadmin/tenants/${id}`, { status }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["superadmin-tenants"] });
      toast({ title: "Tenant status updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update tenant", variant: "destructive" }),
  });

  const changePlan = useMutation({
    mutationFn: ({ id, planType }: { id: string; planType: string }) =>
      axios.put(`${BASE}/api/superadmin/tenants/${id}`, { planType }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["superadmin-tenants"] });
      toast({ title: "Plan updated" });
    },
  });

  const tenants   = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  const handleSearch = (v: string) => { setSearch(v); setTimeout(() => { setDeb(v); setPage(1); }, 300); };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1C1917]">Tenants</h1>
          <p className="text-sm text-[#57534E]">All registered organisations ({data?.pagination?.total ?? 0})</p>
        </div>
        <div className="relative w-64">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
          <input
            className="w-full h-9 pl-8 pr-3 border border-[#E8E6E2] rounded-lg text-sm focus:outline-none focus:border-[#F5821F] bg-white"
            placeholder="Search tenants…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E8E6E2] overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 size={24} className="animate-spin text-[#F5821F]" /></div>
        ) : tenants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-[#A8A29E]">
            <Building2 size={32} strokeWidth={1} />
            <p className="text-sm mt-2">No tenants found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E6E2] bg-[#FAFAF9]">
                {["Company", "Subdomain", "Plan", "Status", "Users", "Joined", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map((t: any) => {
                const planStyle   = PLAN_STYLE[t.plan_type ?? "starter"] ?? PLAN_STYLE.starter;
                const statusStyle = STATUS_STYLE[t.status ?? "Active"] ?? STATUS_STYLE.Active;
                const isActive    = t.status === "Active";

                return (
                  <tr key={t.id} className="border-b border-[#F4F3F1] hover:bg-[#FAFAF9]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1C1917]">{t.name}</p>
                      {t.owner_email && <p className="text-xs text-[#A8A29E]">{t.owner_email}</p>}
                    </td>
                    <td className="px-4 py-3 text-[#57534E] font-mono text-xs">
                      {t.subdomain ? `${t.subdomain}.edubee.com` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none"
                        style={planStyle}
                        value={t.plan_type ?? "starter"}
                        onChange={e => changePlan.mutate({ id: t.id, planType: e.target.value })}
                      >
                        {["starter", "professional", "enterprise"].map(p => (
                          <option key={p} value={p} className="bg-white text-[#1C1917]">{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={t.plan_status === "trial" ? "Trial" : (t.status ?? "Active")} style={t.plan_status === "trial" ? STATUS_STYLE.trial : statusStyle} />
                    </td>
                    <td className="px-4 py-3 text-[#57534E]">{t.user_count ?? 0}</td>
                    <td className="px-4 py-3 text-[#57534E] text-xs">{formatDate(t.created_on)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus.mutate({ id: t.id, status: isActive ? "Suspended" : "Active" })}
                        disabled={toggleStatus.isPending}
                        className="text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors disabled:opacity-40"
                        style={isActive
                          ? { borderColor: "#FECACA", color: "#DC2626", background: "#FFF1F2" }
                          : { borderColor: "#BBF7D0", color: "#15803D", background: "#F0FDF4" }}
                      >
                        {isActive ? "Suspend" : "Activate"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-[#57534E]">
          <p>Page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 px-3 rounded-lg border border-[#E8E6E2] disabled:opacity-40 flex items-center gap-1"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-8 px-3 rounded-lg border border-[#E8E6E2] disabled:opacity-40 flex items-center gap-1"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
