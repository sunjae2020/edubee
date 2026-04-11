import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Building2, ChevronLeft, ChevronRight, Plus, X, Pencil, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/date-format";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const PLAN_STYLE: Record<string, { bg: string; color: string }> = {
  solo:       { bg: "#F4F3F1", color: "#57534E"  },
  starter:    { bg: "var(--e-orange-lt)", color: "#C2410C"  },
  growth:     { bg: "#ECFDF5", color: "#065F46"  },
  enterprise: { bg: "#F5F3FF", color: "#6D28D9"  },
};

const PLANS = [
  { value: "solo",       label: "Solo"       },
  { value: "starter",    label: "Starter"    },
  { value: "growth",     label: "Growth"     },
  { value: "enterprise", label: "Enterprise" },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Active:    { bg: "#F0FDF4", color: "#15803D" },
  Suspended: { bg: "#FFF1F2", color: "#9F1239" },
  Cancelled: { bg: "#F4F3F1", color: "#57534E" },
  trial:     { bg: "#FFFBEB", color: "#92400E" },
};

const inp = `w-full h-10 px-3 border-[1.5px] border-[#E8E6E2] rounded-lg text-sm text-[#1C1917] bg-white placeholder-[#A8A29E] focus:outline-none focus:border-(--e-orange) focus:shadow-[0_0_0_3px_var(--e-orange-ring)] transition-all`;

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

const EMPTY_FORM = { name: "", subdomain: "", ownerEmail: "", planType: "starter", planStatus: "trial" };

function AddTenantPanel({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof EMPTY_FORM, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Company name is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await axios.post(`${BASE}/api/superadmin/tenants`, {
        name:       form.name.trim(),
        subdomain:  form.subdomain.trim() || undefined,
        ownerEmail: form.ownerEmail.trim() || undefined,
        planType:   form.planType,
        planStatus: form.planStatus,
      });
      toast({ title: "Tenant created" });
      onSaved();
    } catch (e: any) {
      toast({ title: "Error", description: e?.response?.data?.error ?? "Failed to create tenant", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-xl mb-2"
      style={{ background: "#FFFFFF", border: "2px solid var(--e-orange)", padding: "24px 28px", boxShadow: "0 4px 16px var(--e-orange-shadow-10)" }}
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-[#1C1917]" style={{ fontSize: 16 }}>Add New Tenant</h2>
        <button onClick={onClose} className="text-[#A8A29E] hover:text-[#1C1917] transition-colors"><X size={18} /></button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#57534E] uppercase tracking-wide">Company Name <span className="text-(--e-orange)">*</span></label>
          <input className={inp} placeholder="e.g. Acme Education Pty Ltd" value={form.name} onChange={e => set("name", e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#57534E] uppercase tracking-wide">Subdomain</label>
          <div className="relative">
            <input
              className={inp}
              placeholder="acme"
              value={form.subdomain}
              onChange={e => set("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#A8A29E]">.edubee.co</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#57534E] uppercase tracking-wide">Owner Email</label>
          <input className={inp} type="email" placeholder="admin@acme.com" value={form.ownerEmail} onChange={e => set("ownerEmail", e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#57534E] uppercase tracking-wide">Plan</label>
          <select className={inp} value={form.planType} onChange={e => set("planType", e.target.value)}>
            {PLANS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#57534E] uppercase tracking-wide">Plan Status</label>
          <select className={inp} value={form.planStatus} onChange={e => set("planStatus", e.target.value)}>
            <option value="trial">Trial (30 days)</option>
            <option value="active">Active</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-6 pt-5" style={{ borderTop: "1px solid #F4F3F1" }}>
        <button
          onClick={onClose}
          className="h-9 px-4 rounded-lg text-sm font-medium"
          style={{ border: "1px solid #E8E6E2", color: "#57534E" }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-9 px-5 rounded-lg text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-50 transition-all"
          style={{ background: "var(--e-orange)" }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "var(--e-orange-hover)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--e-orange)"; }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Create Tenant
        </button>
      </div>
    </div>
  );
}

export default function TenantList() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);
  const [debSearch, setDeb]   = useState("");
  const [showAdd, setShowAdd] = useState(false);

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
      window.dispatchEvent(new CustomEvent("edubee:plan-changed"));
    },
  });

  const tenants    = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  const handleSearch = (v: string) => { setSearch(v); setTimeout(() => { setDeb(v); setPage(1); }, 300); };
  const handleSaved  = () => { setShowAdd(false); qc.invalidateQueries({ queryKey: ["superadmin-tenants"] }); };

  return (
    <div className="p-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1C1917]">Tenants</h1>
          <p className="text-sm text-[#57534E]">All registered organisations ({data?.pagination?.total ?? 0})</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-60">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
            <input
              className="w-full h-9 pl-8 pr-3 border border-[#E8E6E2] rounded-lg text-sm focus:outline-none focus:border-(--e-orange) bg-white"
              placeholder="Search tenants…"
              value={search}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>
          {!showAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className="h-9 px-4 rounded-lg text-sm font-semibold text-white flex items-center gap-2 transition-all hover:-translate-y-px"
              style={{ background: "var(--e-orange)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--e-orange-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "var(--e-orange)")}
            >
              <Plus size={14} strokeWidth={2} /> Add Tenant
            </button>
          )}
        </div>
      </div>

      {/* Add Tenant Form */}
      {showAdd && (
        <AddTenantPanel onClose={() => setShowAdd(false)} onSaved={handleSaved} />
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 size={24} className="animate-spin text-(--e-orange)" /></div>
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
                const planStyle   = PLAN_STYLE[t.plan_type ?? "starter"] ?? PLAN_STYLE.solo;
                const statusStyle  = STATUS_STYLE[t.status ?? "Active"] ?? STATUS_STYLE.Active;
                const isActive     = t.status === "Active";
                const isCancelled  = t.status === "Cancelled";

                return (
                  <tr
                    key={t.id}
                    className="border-b border-[#F4F3F1] group cursor-pointer transition-colors"
                    style={{ background: "transparent" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--e-orange-lt)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    onClick={() => navigate(`/superadmin/tenants/${t.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1C1917] group-hover:text-[#C2410C] transition-colors">{t.name}</p>
                      {t.owner_email && <p className="text-xs text-[#A8A29E]">{t.owner_email}</p>}
                    </td>
                    <td className="px-4 py-3 text-[#57534E] font-mono text-xs">
                      {t.subdomain ? `${t.subdomain}.edubee.co` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                        style={planStyle}
                      >
                        {PLANS.find(p => p.value === (t.plan_type ?? "solo"))?.label ?? t.plan_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={t.plan_status === "trial" ? "Trial" : (t.status ?? "Active")} style={t.plan_status === "trial" ? STATUS_STYLE.trial : statusStyle} />
                    </td>
                    <td className="px-4 py-3 text-[#57534E]">{t.user_count ?? 0}</td>
                    <td className="px-4 py-3 text-[#57534E] text-xs">{formatDate(t.created_on)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/superadmin/tenants/${t.id}`)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg border border-[#E8E6E2] text-[#57534E] hover:border-(--e-orange) hover:text-(--e-orange) transition-colors"
                          title="Edit tenant"
                        >
                          <Pencil size={12} />
                        </button>
                        {isCancelled ? (
                          <button
                            onClick={() => toggleStatus.mutate({ id: t.id, status: "Active" })}
                            disabled={toggleStatus.isPending}
                            className="text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors disabled:opacity-40"
                            style={{ borderColor: "#BBF7D0", color: "#15803D", background: "#F0FDF4" }}
                          >
                            Restore
                          </button>
                        ) : (
                          <>
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
                            <button
                              onClick={() => {
                                if (window.confirm(`Cancel "${t.name}"? This will mark the tenant as Cancelled (can be restored later).`)) {
                                  toggleStatus.mutate({ id: t.id, status: "Cancelled" });
                                }
                              }}
                              disabled={toggleStatus.isPending}
                              className="h-7 w-7 flex items-center justify-center rounded-lg border border-[#E8E6E2] text-[#A8A29E] hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-40"
                              title="Cancel tenant (soft delete)"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
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
