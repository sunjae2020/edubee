import { formatDate } from "@/lib/date-format";
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SystemInfoSection } from "@/components/shared/SystemInfoSection";
import axios from "axios";
import {
  ArrowLeft, CheckCircle2, Circle, Clock, AlertCircle, Calendar, User,
  FileText, Edit3, Check, X, ChevronDown, ChevronUp, Plus, Trash2,
  Copy, Settings, DollarSign,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { NotePanel } from "@/components/shared/NotePanel";
import { ContractPaymentsPanel } from "@/components/finance/ContractPaymentsPanel";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function fmtDate(d?: string | null) {
  return formatDate(d);
}
function fmtMoney(n?: string | number | null) {
  if (n == null || n === "") return "—";
  return `A$${Number(n).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;
}

interface ChecklistItem {
  key: string;
  label: string;
  description?: string;
  required?: boolean;
  status: "pending" | "done" | "n/a";
  completedAt?: string | null;
  completedBy?: string | null;
  itemNotes?: string | null;
}

interface SettlementRec {
  id: string;
  contractId?: string | null;
  contractNumber?: string | null;
  clientName?: string | null;
  studentName?: string | null;
  clientEmail?: string | null;
  arrivalDate?: string | null;
  overallStatus?: string | null;
  assignedConsultantId?: string | null;
  consultantName?: string | null;
  providerAccountId?: string | null;
  providerAccountName?: string | null;
  grossAmount?: string | null;
  notes?: string | null;
  checklist?: ChecklistItem[] | null;
  checklistTemplateId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface Template {
  id: string;
  name: string;
  description?: string | null;
  items: Omit<ChecklistItem, "status" | "completedAt" | "completedBy" | "itemNotes">[];
  isDefault: boolean;
}

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  pending:     { bg: "#F4F3F1", text: "#57534E"  },
  in_progress: { bg: "#FEF0E3", text: "#F5821F"  },
  completed:   { bg: "#DCFCE7", text: "#16A34A"  },
};

const ITEM_STATUS_CFG = {
  pending: { icon: Circle,       color: "#A8A29E", bg: "transparent", label: "Pending" },
  done:    { icon: CheckCircle2, color: "#16A34A", bg: "#DCFCE7",    label: "Done"    },
  "n/a":   { icon: X,           color: "#A8A29E", bg: "#F4F3F1",    label: "N/A"     },
} as const;

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#E8E6E2] rounded-xl p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E] mb-3">{label}</p>
      {children}
    </div>
  );
}
function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-[#F4F3F1] last:border-0">
      <span className="text-[12px] text-[#A8A29E] shrink-0 mr-4">{label}</span>
      <span className="text-[13px] text-[#1C1917] text-right">{value ?? "—"}</span>
    </div>
  );
}

// ── Checklist Item Component ────────────────────────────────────────────────
function ChecklistRow({
  item, idx, isAdmin, onUpdate, onDelete,
}: {
  item: ChecklistItem; idx: number; isAdmin: boolean;
  onUpdate: (key: string, updates: Partial<ChecklistItem>) => void;
  onDelete: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [noteVal, setNoteVal] = useState(item.itemNotes ?? "");
  const noteChanged = noteVal !== (item.itemNotes ?? "");

  const cfg = ITEM_STATUS_CFG[item.status] ?? ITEM_STATUS_CFG.pending;
  const Icon = cfg.icon;

  const cycleStatus = () => {
    if (!isAdmin) return;
    const order: ChecklistItem["status"][] = ["pending", "done", "n/a"];
    const next = order[(order.indexOf(item.status) + 1) % order.length];
    onUpdate(item.key, {
      status: next,
      completedAt: next === "done" ? new Date().toISOString() : null,
    });
  };

  return (
    <div className="border border-[#E8E6E2] rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-[11px] font-bold text-[#A8A29E] w-5 text-center">{idx + 1}</span>
        <button
          onClick={cycleStatus}
          disabled={!isAdmin}
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all"
          style={{ background: cfg.bg, cursor: isAdmin ? "pointer" : "default" }}
          title={`Click to cycle status — current: ${cfg.label}`}>
          <Icon size={16} style={{ color: cfg.color }} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-[13px] font-semibold ${item.status === "done" ? "text-[#16A34A] line-through decoration-[#16A34A]/50" : "text-[#1C1917]"}`}>
              {item.label}
            </p>
            {item.required && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FEF0E3] text-[#F5821F] font-semibold">Required</span>
            )}
          </div>
          {item.description && (
            <p className="text-[11px] text-[#A8A29E] mt-0.5">{item.description}</p>
          )}
          {item.status === "done" && item.completedAt && (
            <p className="text-[11px] text-[#16A34A] mt-0.5">
              ✓ Completed {fmtDate(item.completedAt)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: cfg.bg || "#F4F3F1", color: cfg.color }}>
            {cfg.label}
          </span>
          <button onClick={() => setExpanded(v => !v)}
            className="p-1 rounded hover:bg-[#F4F3F1] transition-colors text-[#A8A29E]">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {isAdmin && (
            <button onClick={() => onDelete(item.key)}
              className="p-1 rounded hover:bg-[#FEF2F2] transition-colors text-[#A8A29E] hover:text-[#DC2626]">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-[#F4F3F1] space-y-2">
          <div className="flex items-start gap-2">
            <p className="text-[11px] font-semibold text-[#57534E] mt-1 shrink-0">Notes:</p>
            <div className="flex-1 space-y-1.5">
              <textarea rows={2} value={noteVal}
                onChange={e => setNoteVal(e.target.value)}
                disabled={!isAdmin}
                className="w-full px-2 py-1.5 rounded-lg border border-[#E8E6E2] text-xs resize-none focus:outline-none focus:border-[#F5821F] disabled:bg-[#F9F9F8] disabled:text-[#A8A29E]"
                placeholder="Add notes…" />
              {isAdmin && noteChanged && (
                <div className="flex gap-1.5">
                  <button onClick={() => { onUpdate(item.key, { itemNotes: noteVal }); }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-white text-[10px] font-semibold" style={{ background: "#16A34A" }}>
                    <Check size={10} /> Save
                  </button>
                  <button onClick={() => setNoteVal(item.itemNotes ?? "")}
                    className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#E8E6E2] text-[#57534E] text-[10px]">
                    <X size={10} /> Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Checklist Section ───────────────────────────────────────────────────────
function ChecklistSection({ rec, isAdmin }: { rec: SettlementRec; isAdmin: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [showTemplates, setShowTemplates] = useState(false);
  const [addLabel, setAddLabel] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addRequired, setAddRequired] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const items: ChecklistItem[] = (rec.checklist as ChecklistItem[]) ?? [];
  const doneCount = items.filter(i => i.status === "done").length;
  const progress = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

  const { data: templates } = useQuery({
    queryKey: ["settlement-templates"],
    queryFn: () => axios.get(`${BASE}/api/services/settlement-templates`).then(r => r.data.data ?? []),
  });

  const patchChecklist = async (key: string, updates: Partial<ChecklistItem>) => {
    await axios.patch(`${BASE}/api/services/settlement/${rec.id}/checklist`, { key, updates });
    qc.invalidateQueries({ queryKey: ["settlement-detail", rec.id] });
  };

  const deleteItem = async (key: string) => {
    const newItems = items.filter(i => i.key !== key);
    await axios.put(`${BASE}/api/services/settlement/${rec.id}`, { checklist: newItems });
    qc.invalidateQueries({ queryKey: ["settlement-detail", rec.id] });
  };

  const addItem = async () => {
    if (!addLabel.trim()) return;
    const newItem: ChecklistItem = {
      key: `custom_${Date.now()}`,
      label: addLabel.trim(),
      description: addDesc.trim() || undefined,
      required: addRequired,
      status: "pending",
      completedAt: null,
      itemNotes: null,
    };
    await axios.put(`${BASE}/api/services/settlement/${rec.id}`, { checklist: [...items, newItem] });
    qc.invalidateQueries({ queryKey: ["settlement-detail", rec.id] });
    setAddLabel(""); setAddDesc(""); setAddRequired(false); setShowAdd(false);
    toast({ title: "Item added" });
  };

  const applyTemplate = async (tmpl: Template) => {
    const newItems: ChecklistItem[] = tmpl.items.map(i => ({
      ...i,
      status: "pending" as const,
      completedAt: null,
      completedBy: null,
      itemNotes: null,
    }));
    await axios.put(`${BASE}/api/services/settlement/${rec.id}`, {
      checklist: newItems,
      checklistTemplateId: tmpl.id,
    });
    qc.invalidateQueries({ queryKey: ["settlement-detail", rec.id] });
    setShowTemplates(false);
    toast({ title: `Template "${tmpl.name}" applied` });
  };

  return (
    <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E8E6E2]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} style={{ color:"#F5821F" }} />
            <h3 className="text-sm font-bold text-[#1C1917]">Settlement Checklist</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F4F3F1] text-[#57534E] font-semibold">
              {doneCount} / {items.length}
            </span>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <button onClick={() => setShowTemplates(v => !v)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E8E6E2] text-[11px] text-[#57534E] hover:bg-[#F4F3F1]">
                <Copy size={11} /> Templates
              </button>
              <button onClick={() => setShowAdd(v => !v)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white"
                style={{ background:"#F5821F" }}>
                <Plus size={11} /> Add Item
              </button>
            </div>
          )}
        </div>
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-[#F4F3F1] overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: progress === 100 ? "#16A34A" : "#F5821F" }} />
          </div>
          <span className="text-[12px] font-bold text-[#1C1917]">{progress}%</span>
        </div>
      </div>

      {/* Template picker */}
      {showTemplates && (
        <div className="px-5 py-4 border-b border-[#E8E6E2] bg-[#FAFAF9]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E] mb-2">Apply Template</p>
          {(!templates || templates.length === 0) ? (
            <p className="text-xs text-[#A8A29E]">No templates available</p>
          ) : (
            <div className="space-y-2">
              {(templates as Template[]).map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-[#E8E6E2] bg-white">
                  <div>
                    <p className="text-sm font-semibold text-[#1C1917] flex items-center gap-1.5">
                      {t.name}
                      {t.isDefault && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FEF0E3] text-[#F5821F]">Default</span>}
                    </p>
                    {t.description && <p className="text-[11px] text-[#A8A29E] mt-0.5">{t.description}</p>}
                    <p className="text-[11px] text-[#57534E] mt-1">{t.items.length} items</p>
                  </div>
                  <button onClick={() => applyTemplate(t)}
                    className="h-8 px-3 rounded-lg text-xs font-semibold text-white"
                    style={{ background:"#F5821F" }}>
                    Apply
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add custom item */}
      {showAdd && (
        <div className="px-5 py-4 border-b border-[#E8E6E2] bg-[#FAFAF9] space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">Add Custom Item</p>
          <input type="text" placeholder="Item label *" value={addLabel}
            onChange={e => setAddLabel(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-[#E8E6E2] text-sm focus:outline-none focus:border-[#F5821F]" />
          <input type="text" placeholder="Description (optional)" value={addDesc}
            onChange={e => setAddDesc(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-[#E8E6E2] text-sm focus:outline-none focus:border-[#F5821F]" />
          <label className="flex items-center gap-2 text-sm text-[#57534E] cursor-pointer">
            <input type="checkbox" checked={addRequired} onChange={e => setAddRequired(e.target.checked)} className="accent-[#F5821F]" />
            Mark as required
          </label>
          <div className="flex gap-2">
            <button onClick={addItem} disabled={!addLabel.trim()}
              className="h-8 px-4 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
              style={{ background:"#F5821F" }}>
              Add
            </button>
            <button onClick={() => { setShowAdd(false); setAddLabel(""); setAddDesc(""); }}
              className="h-8 px-4 rounded-lg border border-[#E8E6E2] text-xs text-[#57534E] hover:bg-[#F4F3F1]">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="p-4 space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 size={24} className="mx-auto mb-2 text-[#E8E6E2]" />
            <p className="text-sm text-[#A8A29E]">No checklist items yet</p>
            {isAdmin && (
              <p className="text-[11px] text-[#A8A29E] mt-1">Apply a template or add items manually above</p>
            )}
          </div>
        ) : (
          items.map((item, idx) => (
            <ChecklistRow
              key={item.key}
              item={item}
              idx={idx}
              isAdmin={isAdmin}
              onUpdate={patchChecklist}
              onDelete={deleteItem}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Main Detail Page ────────────────────────────────────────────────────────
export default function SettlementMgtDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "checklist" | "notes" | "payments">("overview");
  const [editField, setEditField] = useState<string | null>(null);
  const [editVal, setEditVal] = useState<string>("");

  const isAdmin = ["super_admin","admin","admission","team_manager","camp_coordinator"].includes(user?.role ?? "");

  const { data: rec, isLoading, isError, error, refetch } = useQuery<SettlementRec>({
    queryKey: ["settlement-detail", id],
    queryFn: () => axios.get(`${BASE}/api/services/settlement/${id}`).then(r => r.data),
    enabled: !!id,
    retry: 1,
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Record<string, any>) =>
      axios.put(`${BASE}/api/services/settlement/${id}`, patch).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settlement-detail", id] });
      qc.invalidateQueries({ queryKey: ["services-settlement"] });
      toast({ title: "Saved" });
      setEditField(null);
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const startEdit = (field: string, val: string) => { setEditField(field); setEditVal(val); };
  const cancelEdit = () => { setEditField(null); setEditVal(""); };
  const saveEdit = (field: string) => updateMutation.mutate({ [field]: editVal });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-[#F4F3F1] animate-pulse" />)}
      </div>
    );
  }
  if (isError || !rec) {
    const status = (error as any)?.response?.status;
    const isForbidden = status === 403;
    const isNotFound  = status === 404 || !id;
    const msg = isForbidden
      ? "You don't have permission to view this settlement."
      : isNotFound
        ? "Settlement record not found."
        : "Failed to load settlement. Please try again.";
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle size={32} className="text-[#E8E6E2]" />
        <p className="text-[#57534E]">{msg}</p>
        <div className="flex items-center gap-3">
          {!isForbidden && !isNotFound && (
            <button onClick={() => refetch()}
              className="text-sm underline" style={{ color:"#F5821F" }}>Try Again</button>
          )}
          <button onClick={() => navigate("/admin/services/settlement")}
            className="text-sm underline" style={{ color:"#F5821F" }}>Back to Settlement</button>
        </div>
      </div>
    );
  }

  const items: ChecklistItem[] = (rec.checklist as ChecklistItem[]) ?? [];
  const doneCount = items.filter(i => i.status === "done").length;
  const overallStatusStyle = STATUS_STYLE[rec.overallStatus ?? "pending"] ?? STATUS_STYLE.pending;

  const TABS = [
    { key: "overview",  label: "Overview"  },
    { key: "checklist", label: `Checklist (${doneCount}/${items.length})` },
    { key: "payments",  label: "Payments"  },
    { key: "notes",     label: "Notes"     },
  ] as const;

  return (
    <div className="p-6 space-y-5">
      {/* Back */}
      <button onClick={() => navigate("/admin/services/settlement")}
        className="flex items-center gap-1.5 text-sm text-[#57534E] hover:text-[#1C1917]">
        <ArrowLeft size={15} /> Back to Settlement
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">{rec.clientName ?? rec.studentName ?? "—"}</h1>
          <p className="text-sm text-[#A8A29E] mt-0.5">
            {rec.contractNumber ? `Contract ${rec.contractNumber}` : ""}
            {rec.arrivalDate ? ` · Arrival ${fmtDate(rec.arrivalDate)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ background: overallStatusStyle.bg, color: overallStatusStyle.text }}>
            {rec.overallStatus?.replace(/_/g, " ")?.replace(/\b\w/g, c => c.toUpperCase()) ?? "Pending"}
          </span>
          {isAdmin && (
            <select
              value={rec.overallStatus ?? "pending"}
              onChange={e => updateMutation.mutate({ overallStatus: e.target.value })}
              className="h-8 px-2 rounded-lg border border-[#E8E6E2] text-xs text-[#57534E] focus:outline-none focus:border-[#F5821F]">
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#E8E6E2]">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
            style={activeTab === t.key
              ? { borderColor:"#F5821F", color:"#F5821F" }
              : { borderColor:"transparent", color:"#57534E" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Client / Contract */}
          <InfoCard label="Client & Contract">
            <InfoRow label="Client" value={rec.clientName ?? rec.studentName} />
            <InfoRow label="Contract" value={
              rec.contractId ? (
                <button onClick={() => navigate(`/admin/crm/contracts/${rec.contractId}`)}
                  className="text-[#F5821F] font-mono font-semibold hover:underline flex items-center gap-1">
                  {rec.contractNumber} <FileText size={11} />
                </button>
              ) : "—"
            } />
            <InfoRow label="Email" value={rec.clientEmail} />
          </InfoCard>

          {/* Arrival Settlement Info */}
          <InfoCard label="Settlement Info">
            <InfoRow label="Arrival Date" value={
              editField === "arrivalDate" ? (
                <div className="flex gap-1">
                  <input type="date" value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    className="h-7 px-2 rounded border border-[#F5821F] text-xs focus:outline-none" />
                  <button onClick={() => saveEdit("arrivalDate")} className="p-1 rounded bg-[#16A34A] text-white"><Check size={11} /></button>
                  <button onClick={cancelEdit} className="p-1 rounded border border-[#E8E6E2]"><X size={11} /></button>
                </div>
              ) : (
                <span className="flex items-center gap-1">
                  {fmtDate(rec.arrivalDate)}
                  {isAdmin && <button onClick={() => startEdit("arrivalDate", rec.arrivalDate ?? "")} className="p-0.5 text-[#A8A29E] hover:text-[#F5821F]"><Edit3 size={11} /></button>}
                </span>
              )
            } />
            <InfoRow label="Consultant" value={rec.consultantName ?? "—"} />
            <InfoRow label="Service Fee" value={fmtMoney(rec.grossAmount)} />
          </InfoCard>

          {/* Checklist progress */}
          <InfoCard label="Checklist Progress">
            <div className="py-2">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#57534E]">{doneCount} of {items.length} items done</span>
                <span className="font-bold text-[#1C1917]">
                  {items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0}%
                </span>
              </div>
              <div className="h-3 rounded-full bg-[#F4F3F1] overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${items.length > 0 ? (doneCount / items.length) * 100 : 0}%`,
                    background: doneCount === items.length && items.length > 0 ? "#16A34A" : "#F5821F",
                  }} />
              </div>
              <div className="flex gap-3 mt-3">
                {(["pending","done","n/a"] as const).map(s => {
                  const cnt = items.filter(i => i.status === s).length;
                  const cfg = ITEM_STATUS_CFG[s];
                  if (cnt === 0) return null;
                  return (
                    <span key={s} className="text-[11px]" style={{ color: cfg.color }}>
                      {cnt} {cfg.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </InfoCard>

          {/* Notes field */}
          <InfoCard label="General Notes">
            {editField === "notes" ? (
              <div className="space-y-2">
                <textarea rows={3} value={editVal} onChange={e => setEditVal(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#F5821F] text-sm resize-none focus:outline-none" />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit("notes")}
                    className="h-7 px-3 rounded-lg text-xs font-semibold text-white" style={{ background:"#16A34A" }}>Save</button>
                  <button onClick={cancelEdit}
                    className="h-7 px-3 rounded-lg border border-[#E8E6E2] text-xs text-[#57534E]">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <p className="flex-1 text-sm text-[#57534E] whitespace-pre-wrap">
                  {rec.notes || <span className="text-[#A8A29E] italic">No notes</span>}
                </p>
                {isAdmin && (
                  <button onClick={() => startEdit("notes", rec.notes ?? "")}
                    className="shrink-0 p-1 rounded hover:bg-[#F4F3F1] text-[#A8A29E]">
                    <Edit3 size={13} />
                  </button>
                )}
              </div>
            )}
          </InfoCard>
          <div className="sm:col-span-2">
            <SystemInfoSection owner={rec.clientId ?? null} createdAt={rec.createdAt} updatedAt={rec.updatedAt} />
          </div>
        </div>
      )}

      {/* Checklist Tab */}
      {activeTab === "checklist" && rec && (
        <ChecklistSection rec={rec} isAdmin={isAdmin} />
      )}

      {/* Payments Tab */}
      {activeTab === "payments" && (
        <ContractPaymentsPanel
          contractId={rec.contractId}
          contractNumber={rec.contractNumber}
        />
      )}

      {/* Notes Tab */}
      {activeTab === "notes" && id && (
        <div className="bg-white border border-[#E8E6E2] rounded-xl p-5">
          <h3 className="text-sm font-bold text-[#1C1917] mb-4">Activity Notes</h3>
          <NotePanel
            entityType="settlement_mgt"
            entityId={id}
            allowedNoteTypes={["internal"]}
            defaultVisibility="internal"
          />
        </div>
      )}
    </div>
  );
}
