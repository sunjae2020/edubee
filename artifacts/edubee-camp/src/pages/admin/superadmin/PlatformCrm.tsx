import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import SuperAdminLayout from "./SuperAdminLayout";
import {
  Plus, Search, Building2, Globe, Tag, ChevronRight,
  Phone, Mail, Trash2, X, Check
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Prospect {
  id: string;
  companyName: string;
  website: string | null;
  industry: string | null;
  country: string | null;
  planInterest: string | null;
  status: string;
  source: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new:       { label: "New",       color: "#6366F1", bg: "#EEF2FF" },
  contacted: { label: "Contacted", color: "#0EA5E9", bg: "#E0F7FF" },
  demo:      { label: "Demo",      color: "#F59E0B", bg: "#FFFBEB" },
  trial:     { label: "Trial",     color: "#8B5CF6", bg: "#F5F3FF" },
  converted: { label: "Converted", color: "#10B981", bg: "#ECFDF5" },
  lost:      { label: "Lost",      color: "#EF4444", bg: "#FEF2F2" },
};

const PLAN_LABELS: Record<string, string> = {
  solo: "Solo", starter: "Starter", growth: "Growth", enterprise: "Enterprise",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── New Prospect Modal ────────────────────────────────────────────────────────

function NewProspectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: Prospect) => void }) {
  const [form, setForm] = useState({
    companyName: "", website: "", industry: "", country: "",
    planInterest: "", source: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.companyName.trim()) { setErr("Company name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/platform-crm/prospects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      onCreated(created);
    } catch (e: any) {
      setErr(e.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E6E2]">
          <h2 className="text-base font-semibold text-[#1C1917]">Add Prospect</h2>
          <button onClick={onClose} className="text-[#57534E] hover:text-[#1C1917]"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {err && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{err}</p>}

          <div>
            <label className="block text-xs font-medium text-[#57534E] mb-1">Company Name *</label>
            <input value={form.companyName} onChange={e => set("companyName", e.target.value)}
              className="w-full border border-[#E8E6E2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--e-orange]/30" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">Website</label>
              <input value={form.website} onChange={e => set("website", e.target.value)}
                className="w-full border border-[#E8E6E2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--e-orange]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">Country</label>
              <input value={form.country} onChange={e => set("country", e.target.value)}
                className="w-full border border-[#E8E6E2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--e-orange]/30" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">Industry</label>
              <input value={form.industry} onChange={e => set("industry", e.target.value)}
                className="w-full border border-[#E8E6E2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--e-orange]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">Plan Interest</label>
              <select value={form.planInterest} onChange={e => set("planInterest", e.target.value)}
                className="w-full border border-[#E8E6E2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--e-orange]/30 bg-white">
                <option value="">— Select —</option>
                {Object.entries(PLAN_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#57534E] mb-1">Source</label>
            <select value={form.source} onChange={e => set("source", e.target.value)}
              className="w-full border border-[#E8E6E2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--e-orange]/30 bg-white">
              <option value="">— Select —</option>
              {["Website","Referral","Event","Cold Outreach","Social Media","Other"].map(s => (
                <option key={s} value={s.toLowerCase().replace(/ /g, "_")}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#57534E] mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
              className="w-full border border-[#E8E6E2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--e-orange]/30 resize-none" />
          </div>
        </div>
        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-[#E8E6E2] text-[#57534E] hover:bg-[#F5F4F2]">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-[--e-orange] text-white font-medium hover:bg-[#E0711A] disabled:opacity-50">
            {saving ? "Saving…" : "Add Prospect"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main List Page ────────────────────────────────────────────────────────────

export default function PlatformCrm() {
  const [, setLocation] = useLocation();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/api/platform-crm/prospects`)
      .then(r => r.json())
      .then(data => setProspects(Array.isArray(data) ? data : []))
      .catch(() => setProspects([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = prospects.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.companyName.toLowerCase().includes(q) ||
      (p.country ?? "").toLowerCase().includes(q) ||
      (p.industry ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = Object.keys(STATUS_CONFIG).reduce((acc, s) => ({
    ...acc, [s]: prospects.filter(p => p.status === s).length
  }), {} as Record<string, number>);

  return (
    <SuperAdminLayout>
      <div className="p-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#1C1917]">SaaS CRM</h1>
            <p className="text-sm text-[#57534E] mt-0.5">Prospect companies for Edubee platform subscriptions</p>
          </div>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[--e-orange] text-white text-sm font-medium rounded-lg hover:bg-[#E0711A] transition-colors">
            <Plus size={15} />
            Add Prospect
          </button>
        </div>

        {/* Pipeline stats */}
        <div className="grid grid-cols-6 gap-3 mb-6">
          {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
            <button key={s} onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
              className="p-3 rounded-xl border transition-all text-left"
              style={{
                borderColor: statusFilter === s ? cfg.color : "#E8E6E2",
                background: statusFilter === s ? cfg.bg : "white",
              }}>
              <p className="text-xl font-bold" style={{ color: cfg.color }}>{stats[s] ?? 0}</p>
              <p className="text-xs text-[#57534E] mt-0.5">{cfg.label}</p>
            </button>
          ))}
        </div>

        {/* Search + filter */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search company, country, industry…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#E8E6E2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[--e-orange]/30" />
          </div>
          {statusFilter !== "all" && (
            <button onClick={() => setStatusFilter("all")}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-[#E8E6E2] rounded-lg text-[#57534E] hover:bg-[#F5F4F2]">
              <X size={13} /> Clear filter
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-[#57534E]">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Building2 size={36} className="mx-auto text-[#D6D3D1] mb-3" />
              <p className="text-sm text-[#57534E]">
                {search || statusFilter !== "all" ? "No prospects match your filter" : "No prospects yet — add your first one"}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8E6E2] bg-[#FAFAF9]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#57534E] uppercase tracking-wide">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#57534E] uppercase tracking-wide">Country</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#57534E] uppercase tracking-wide">Industry</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#57534E] uppercase tracking-wide">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#57534E] uppercase tracking-wide">Source</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#57534E] uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#57534E] uppercase tracking-wide">Added</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F4F2]">
                {filtered.map(p => {
                  const sc = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.new;
                  return (
                    <tr key={p.id}
                      className="hover:bg-[#FAFAF9] cursor-pointer transition-colors"
                      onClick={() => setLocation(`/superadmin/crm/${p.id}`)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[--e-orange]/10 flex items-center justify-center shrink-0">
                            <Building2 size={13} className="text-[--e-orange]" />
                          </div>
                          <span className="font-medium text-[#1C1917]">{p.companyName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#57534E]">{p.country ?? "—"}</td>
                      <td className="px-4 py-3 text-[#57534E]">{p.industry ?? "—"}</td>
                      <td className="px-4 py-3">
                        {p.planInterest ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[--e-orange-lt] text-[#C2621A]">
                            {PLAN_LABELS[p.planInterest] ?? p.planInterest}
                          </span>
                        ) : <span className="text-[#A8A29E]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-[#57534E] capitalize">{p.source?.replace(/_/g, " ") ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ color: sc.color, background: sc.bg }}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#A8A29E] text-xs whitespace-nowrap">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-[#A8A29E]">
                        <ChevronRight size={15} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-xs text-[#A8A29E] mt-3">{filtered.length} prospect{filtered.length !== 1 ? "s" : ""} shown</p>
      </div>

      {showNew && (
        <NewProspectModal
          onClose={() => setShowNew(false)}
          onCreated={p => { setProspects(prev => [p, ...prev]); setShowNew(false); setLocation(`/superadmin/crm/${p.id}`); }}
        />
      )}
    </SuperAdminLayout>
  );
}
