import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import SuperAdminLayout from "./SuperAdminLayout";
import {
  ArrowLeft, Building2, Globe, Phone, Mail, User, Plus, Tag,
  MessageSquare, PhoneCall, CalendarCheck, Presentation,
  Pencil, Trash2, X, Check, ChevronDown
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Contact {
  id: string; prospectId: string; fullName: string; email: string | null;
  phone: string | null; title: string | null; isPrimary: boolean; createdAt: string;
}

interface Activity {
  id: string; prospectId: string; activityType: string; subject: string | null;
  body: string | null; scheduledAt: string | null; completedAt: string | null;
  createdAt: string;
}

interface Prospect {
  id: string; companyName: string; website: string | null; industry: string | null;
  country: string | null; planInterest: string | null; status: string;
  source: string | null; notes: string | null; createdAt: string; updatedAt: string;
  contacts: Contact[];
  activities: Activity[];
}

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new:       { label: "New",       color: "#6366F1", bg: "#EEF2FF" },
  contacted: { label: "Contacted", color: "#0EA5E9", bg: "#E0F7FF" },
  demo:      { label: "Demo",      color: "#F59E0B", bg: "#FFFBEB" },
  trial:     { label: "Trial",     color: "#8B5CF6", bg: "#F5F3FF" },
  converted: { label: "Converted", color: "#10B981", bg: "#ECFDF5" },
  lost:      { label: "Lost",      color: "#EF4444", bg: "#FEF2F2" },
};

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  note:    MessageSquare,
  call:    PhoneCall,
  email:   Mail,
  meeting: CalendarCheck,
  demo:    Presentation,
};

const PLAN_LABELS: Record<string, string> = {
  solo: "Solo", starter: "Starter", growth: "Growth", enterprise: "Enterprise",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.new;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ color: c.color, background: c.bg }}>
      {c.label}
    </span>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const Icon = ACTIVITY_ICONS[type] ?? MessageSquare;
  const colors: Record<string, string> = {
    note: "#6366F1", call: "#10B981", email: "#0EA5E9", meeting: "#F59E0B", demo: "#8B5CF6",
  };
  const color = colors[type] ?? "#6366F1";
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
      style={{ background: color + "1A" }}>
      <Icon size={14} style={{ color }} />
    </div>
  );
}

// ── Add Activity Modal ────────────────────────────────────────────────────────

function AddActivityModal({ prospectId, onClose, onAdded }: {
  prospectId: string; onClose: () => void; onAdded: (a: Activity) => void;
}) {
  const [form, setForm] = useState({ activityType: "note", subject: "", body: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.body.trim() && !form.subject.trim()) { setErr("Add a subject or body"); return; }
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/platform-crm/prospects/${prospectId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      onAdded(await res.json());
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E6E2]">
          <h3 className="text-sm font-semibold text-[#1C1917]">Log Activity</h3>
          <button onClick={onClose} className="text-[#57534E] hover:text-[#1C1917]"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          {err && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded">{err}</p>}
          <div className="flex gap-2">
            {["note","call","email","meeting","demo"].map(t => {
              const Icon = ACTIVITY_ICONS[t] ?? MessageSquare;
              return (
                <button key={t} onClick={() => set("activityType", t)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-colors border"
                  style={{
                    borderColor: form.activityType === t ? "#F5821F" : "#E8E6E2",
                    background: form.activityType === t ? "#FEF0E3" : "white",
                    color: form.activityType === t ? "#C2621A" : "#57534E",
                  }}>
                  <Icon size={13} className="mx-auto mb-0.5" />
                  {t}
                </button>
              );
            })}
          </div>
          <input value={form.subject} onChange={e => set("subject", e.target.value)}
            placeholder="Subject"
            className="w-full border border-[#E8E6E2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5821F]/30" />
          <textarea value={form.body} onChange={e => set("body", e.target.value)}
            placeholder="Details / notes…" rows={4}
            className="w-full border border-[#E8E6E2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5821F]/30 resize-none" />
        </div>
        <div className="px-5 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-[#E8E6E2] text-[#57534E] hover:bg-[#F5F4F2]">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-[#F5821F] text-white font-medium hover:bg-[#E0711A] disabled:opacity-50">
            {saving ? "Saving…" : "Log Activity"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Contact Modal ─────────────────────────────────────────────────────────

function AddContactModal({ prospectId, onClose, onAdded }: {
  prospectId: string; onClose: () => void; onAdded: (c: Contact) => void;
}) {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", title: "", isPrimary: false });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.fullName.trim()) { setErr("Full name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/platform-crm/prospects/${prospectId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      onAdded(await res.json());
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E6E2]">
          <h3 className="text-sm font-semibold text-[#1C1917]">Add Contact</h3>
          <button onClick={onClose} className="text-[#57534E] hover:text-[#1C1917]"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          {err && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded">{err}</p>}
          {[
            { k: "fullName", label: "Full Name *", placeholder: "홍길동" },
            { k: "email",    label: "Email",       placeholder: "contact@company.com" },
            { k: "phone",    label: "Phone",       placeholder: "+61 400 000 000" },
            { k: "title",    label: "Job Title",   placeholder: "CEO" },
          ].map(({ k, label, placeholder }) => (
            <div key={k}>
              <label className="block text-xs font-medium text-[#57534E] mb-1">{label}</label>
              <input value={(form as any)[k]} onChange={e => set(k, e.target.value)}
                placeholder={placeholder}
                className="w-full border border-[#E8E6E2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5821F]/30" />
            </div>
          ))}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.isPrimary} onChange={e => set("isPrimary", e.target.checked)}
              className="rounded" />
            <span className="text-xs text-[#57534E]">Primary contact</span>
          </label>
        </div>
        <div className="px-5 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-[#E8E6E2] text-[#57534E] hover:bg-[#F5F4F2]">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-[#F5821F] text-white font-medium hover:bg-[#E0711A] disabled:opacity-50">
            {saving ? "Saving…" : "Add Contact"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Detail Page ──────────────────────────────────────────────────────────

export default function PlatformCrmDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [loading, setLoading] = useState(true);
  const [showActivity, setShowActivity] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesVal, setNotesVal] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`${BASE}/api/platform-crm/prospects/${id}`)
      .then(r => r.json())
      .then(data => { setProspect(data); setNotesVal(data.notes ?? ""); })
      .catch(() => setLocation("/superadmin/crm"))
      .finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (status: string) => {
    if (!prospect) return;
    const res = await fetch(`${BASE}/api/platform-crm/prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProspect(prev => prev ? { ...prev, status: updated.status } : prev);
    }
    setEditingStatus(false);
  };

  const saveNotes = async () => {
    if (!prospect) return;
    await fetch(`${BASE}/api/platform-crm/prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notesVal }),
    });
    setProspect(prev => prev ? { ...prev, notes: notesVal } : prev);
    setEditingNotes(false);
  };

  const deleteProspect = async () => {
    if (!confirm("Delete this prospect? All contacts and activities will also be deleted.")) return;
    setDeleting(true);
    await fetch(`${BASE}/api/platform-crm/prospects/${id}`, { method: "DELETE" });
    setLocation("/superadmin/crm");
  };

  const deleteActivity = async (actId: string) => {
    await fetch(`${BASE}/api/platform-crm/activities/${actId}`, { method: "DELETE" });
    setProspect(prev => prev ? { ...prev, activities: prev.activities.filter(a => a.id !== actId) } : prev);
  };

  const deleteContact = async (cId: string) => {
    await fetch(`${BASE}/api/platform-crm/contacts/${cId}`, { method: "DELETE" });
    setProspect(prev => prev ? { ...prev, contacts: prev.contacts.filter(c => c.id !== cId) } : prev);
  };

  if (loading) return <SuperAdminLayout><div className="p-8 text-sm text-[#57534E]">Loading…</div></SuperAdminLayout>;
  if (!prospect) return <SuperAdminLayout><div className="p-8 text-sm text-red-600">Prospect not found.</div></SuperAdminLayout>;

  const sc = STATUS_CONFIG[prospect.status] ?? STATUS_CONFIG.new;

  return (
    <SuperAdminLayout>
      <div className="p-6 max-w-5xl mx-auto">

        {/* Back + header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setLocation("/superadmin/crm")}
            className="flex items-center gap-1.5 text-sm text-[#57534E] hover:text-[#1C1917]">
            <ArrowLeft size={15} /> Back
          </button>
          <span className="text-[#D6D3D1]">/</span>
          <span className="text-sm text-[#1C1917] font-medium">{prospect.companyName}</span>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* Left column — prospect info */}
          <div className="col-span-1 space-y-4">

            {/* Company card */}
            <div className="bg-white border border-[#E8E6E2] rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#F5821F]/10 flex items-center justify-center">
                  <Building2 size={18} className="text-[#F5821F]" />
                </div>
                <button onClick={deleteProspect} disabled={deleting}
                  className="text-[#A8A29E] hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
              <h2 className="text-base font-bold text-[#1C1917] mb-1">{prospect.companyName}</h2>

              {/* Status picker */}
              <div className="relative mb-3">
                <button onClick={() => setEditingStatus(v => !v)}
                  className="flex items-center gap-1.5 cursor-pointer">
                  <StatusBadge status={prospect.status} />
                  <ChevronDown size={12} className="text-[#57534E]" />
                </button>
                {editingStatus && (
                  <div className="absolute top-7 left-0 z-20 bg-white border border-[#E8E6E2] rounded-lg shadow-lg p-1.5 space-y-0.5 min-w-[140px]">
                    {Object.entries(STATUS_CONFIG).map(([s, c]) => (
                      <button key={s} onClick={() => updateStatus(s)}
                        className="w-full text-left px-3 py-1.5 rounded-md text-xs font-medium hover:bg-[#F5F4F2] flex items-center gap-2"
                        style={{ color: c.color }}>
                        {prospect.status === s && <Check size={11} />}
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm text-[#57534E]">
                {prospect.website && (
                  <div className="flex items-center gap-2">
                    <Globe size={13} className="text-[#A8A29E]" />
                    <a href={prospect.website.startsWith("http") ? prospect.website : `https://${prospect.website}`}
                      target="_blank" rel="noreferrer" className="truncate hover:underline text-[#F5821F]">
                      {prospect.website}
                    </a>
                  </div>
                )}
                {prospect.country   && <div className="flex items-center gap-2"><span className="text-[#A8A29E] text-xs w-3">🌏</span>{prospect.country}</div>}
                {prospect.industry  && <div className="flex items-center gap-2"><Tag size={13} className="text-[#A8A29E]" />{prospect.industry}</div>}
                {prospect.planInterest && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#A8A29E] text-xs">Plan:</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#FEF0E3] text-[#C2621A]">
                      {PLAN_LABELS[prospect.planInterest] ?? prospect.planInterest}
                    </span>
                  </div>
                )}
                {prospect.source && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#A8A29E] text-xs">Source:</span>
                    <span className="capitalize">{prospect.source.replace(/_/g, " ")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white border border-[#E8E6E2] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-[#57534E] uppercase tracking-wide">Notes</p>
                <button onClick={() => setEditingNotes(v => !v)} className="text-[#A8A29E] hover:text-[#F5821F]">
                  <Pencil size={13} />
                </button>
              </div>
              {editingNotes ? (
                <div>
                  <textarea value={notesVal} onChange={e => setNotesVal(e.target.value)} rows={5}
                    className="w-full text-sm border border-[#E8E6E2] rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#F5821F]/30" />
                  <div className="flex gap-2 mt-2">
                    <button onClick={saveNotes} className="px-3 py-1 text-xs rounded-lg bg-[#F5821F] text-white">Save</button>
                    <button onClick={() => { setNotesVal(prospect.notes ?? ""); setEditingNotes(false); }}
                      className="px-3 py-1 text-xs rounded-lg border border-[#E8E6E2] text-[#57534E]">Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#57534E] whitespace-pre-wrap">
                  {prospect.notes || <span className="text-[#A8A29E] italic">No notes yet…</span>}
                </p>
              )}
            </div>

            {/* Contacts */}
            <div className="bg-white border border-[#E8E6E2] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-[#57534E] uppercase tracking-wide">Contacts</p>
                <button onClick={() => setShowContact(true)}
                  className="text-[#F5821F] hover:text-[#C2621A]"><Plus size={14} /></button>
              </div>
              {prospect.contacts.length === 0 ? (
                <p className="text-xs text-[#A8A29E] italic">No contacts yet</p>
              ) : (
                <div className="space-y-2">
                  {prospect.contacts.map(c => (
                    <div key={c.id} className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[#F5F4F2] flex items-center justify-center shrink-0 mt-0.5">
                          <User size={13} className="text-[#57534E]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-[#1C1917] truncate">{c.fullName}</p>
                            {c.isPrimary && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FEF0E3] text-[#C2621A] font-medium shrink-0">Primary</span>
                            )}
                          </div>
                          {c.title && <p className="text-xs text-[#A8A29E]">{c.title}</p>}
                          {c.email && (
                            <a href={`mailto:${c.email}`} className="text-xs text-[#0EA5E9] hover:underline flex items-center gap-1">
                              <Mail size={10} />{c.email}
                            </a>
                          )}
                          {c.phone && <p className="text-xs text-[#57534E] flex items-center gap-1"><Phone size={10} />{c.phone}</p>}
                        </div>
                      </div>
                      <button onClick={() => deleteContact(c.id)} className="text-[#D6D3D1] hover:text-red-500 shrink-0 mt-1">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column — activity timeline */}
          <div className="col-span-2">
            <div className="bg-white border border-[#E8E6E2] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-[#1C1917]">Activity Timeline</p>
                <button onClick={() => setShowActivity(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[#F5821F] text-white font-medium hover:bg-[#E0711A]">
                  <Plus size={12} /> Log Activity
                </button>
              </div>

              {prospect.activities.length === 0 ? (
                <div className="py-12 text-center">
                  <MessageSquare size={32} className="mx-auto text-[#D6D3D1] mb-3" />
                  <p className="text-sm text-[#A8A29E]">No activities yet — log the first one</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {prospect.activities.map(a => {
                    const colors: Record<string, string> = {
                      note: "#6366F1", call: "#10B981", email: "#0EA5E9", meeting: "#F59E0B", demo: "#8B5CF6",
                    };
                    return (
                      <div key={a.id} className="flex gap-3">
                        <ActivityIcon type={a.activityType} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold capitalize"
                                  style={{ color: colors[a.activityType] ?? "#6366F1" }}>
                                  {a.activityType}
                                </span>
                                {a.subject && <span className="text-sm font-medium text-[#1C1917]">{a.subject}</span>}
                              </div>
                              {a.body && <p className="text-sm text-[#57534E] mt-0.5 whitespace-pre-wrap">{a.body}</p>}
                              <p className="text-xs text-[#A8A29E] mt-1">
                                {new Date(a.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <button onClick={() => deleteActivity(a.id)}
                              className="text-[#D6D3D1] hover:text-red-500 shrink-0">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showActivity && (
        <AddActivityModal
          prospectId={prospect.id}
          onClose={() => setShowActivity(false)}
          onAdded={a => { setProspect(prev => prev ? { ...prev, activities: [a, ...prev.activities] } : prev); setShowActivity(false); }}
        />
      )}
      {showContact && (
        <AddContactModal
          prospectId={prospect.id}
          onClose={() => setShowContact(false)}
          onAdded={c => { setProspect(prev => prev ? { ...prev, contacts: [...prev.contacts, c] } : prev); setShowContact(false); }}
        />
      )}
    </SuperAdminLayout>
  );
}
