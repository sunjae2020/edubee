import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Mail, Zap, MessageSquare, Chrome, Building2,
  CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Loader2, Save, Cable, Database, Plus, Trash2,
  Edit2, RefreshCw, Eye, EyeOff, HardDrive, ExternalLink, FolderOpen,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Design tokens ─────────────────────────────────────────────────────────────
const card = "bg-white border border-[#E8E6E2] rounded-xl overflow-hidden";
const inp  = [
  "w-full h-9 px-3 border border-[#E8E6E2] rounded-lg text-sm text-[#1C1917]",
  "bg-white placeholder-[#D4D0CB]",
  "focus:outline-none focus:border-(--e-orange) focus:shadow-[0_0_0_3px_var(--e-orange-ring)]",
  "transition",
].join(" ");
const label = "text-[11px] font-medium text-[#57534E] uppercase tracking-wide";

function StatusBadge({ connected, comingSoon }: { connected?: boolean; comingSoon?: boolean }) {
  if (comingSoon) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F4F3F1] text-[#A8A29E] border border-[#E8E6E2] uppercase tracking-wide">
      Coming Soon
    </span>
  );
  return connected ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
      <CheckCircle2 size={11} /> Connected
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F4F3F1] text-[#A8A29E] border border-[#E8E6E2]">
      <XCircle size={11} /> Not configured
    </span>
  );
}

// ── Accordion card wrapper ─────────────────────────────────────────────────────
function IntegrationCard({
  icon: Icon, iconBg, iconColor, name, description,
  badge, children, defaultOpen = false,
}: {
  icon: any; iconBg: string; iconColor: string;
  name: string; description: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={card}>
      <button
        className="w-full p-5 flex items-center gap-3 text-left"
        onClick={() => children && setOpen(o => !o)}
      >
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon size={18} className={iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-[#1C1917]">{name}</h3>
            {badge}
          </div>
          <p className="text-xs text-[#A8A29E] mt-0.5">{description}</p>
        </div>
        {children && (
          open
            ? <ChevronUp size={16} className="text-[#A8A29E] shrink-0" />
            : <ChevronDown size={16} className="text-[#A8A29E] shrink-0" />
        )}
      </button>
      {open && children && (
        <div className="border-t border-[#E8E6E2] p-5 bg-[#FAFAF9]">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Airtable types ────────────────────────────────────────────────────────────
interface AirtableBase {
  id: string;
  name: string;
  baseId: string;
  syncDirection: "inbound" | "outbound" | "both";
  syncSchedule: "manual" | "every6h";
  isActive: boolean;
  lastSyncedAt: string | null;
  lastSyncStatus: "success" | "error" | null;
  lastSyncMessage: string | null;
}

const DIRECTION_LABELS: Record<string, string> = {
  inbound: "Airtable → CRM",
  outbound: "CRM → Airtable",
  both: "Bidirectional",
};
const SCHEDULE_LABELS: Record<string, string> = {
  manual: "Manual only",
  every6h: "Every 6 hours (4x daily)",
};

const STAT_TABLES = [
  { key: "Staff",             label: "Staff" },
  { key: "Student",           label: "Students" },
  { key: "Partner",           label: "Partners" },
  { key: "Contract",          label: "Contracts" },
  { key: "Contract Products", label: "Products" },
  { key: "Payments",          label: "Payments" },
];

// ── Airtable Base Card ────────────────────────────────────────────────────────
function AirtableBaseCard({
  base, onEdit, onDelete, onSync, syncing,
}: {
  base: AirtableBase;
  onEdit: (b: AirtableBase) => void;
  onDelete: (id: string) => void;
  onSync: (id: string) => void;
  syncing: boolean;
}) {
  const { data: stats } = useQuery<Record<string, number>>({
    queryKey: ["airtable-stats", base.baseId],
    queryFn: () => axios.get(`${BASE}/api/airtable/stats/${base.baseId}`).then(r => r.data),
    staleTime: 30_000,
  });

  const hasStats = stats && Object.keys(stats).length > 0;

  return (
    <div className="border border-[#E8E6E2] rounded-xl p-4 bg-white space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${base.isActive ? "bg-green-500" : "bg-[#D4D0CB]"}`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1C1917] truncate">{base.name}</p>
            <p className="text-xs text-[#A8A29E] font-mono truncate">{base.baseId}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onSync(base.id)}
            disabled={syncing}
            title="Manual Sync"
            className="p-1.5 rounded-lg hover:bg-[#F4F3F1] text-[#A8A29E] hover:text-[#1C1917] transition disabled:opacity-40"
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => onEdit(base)}
            title="Edit"
            className="p-1.5 rounded-lg hover:bg-[#F4F3F1] text-[#A8A29E] hover:text-[#1C1917] transition"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => onDelete(base.id)}
            title="Delete"
            className="p-1.5 rounded-lg hover:bg-red-50 text-[#A8A29E] hover:text-red-500 transition"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-0.5 rounded-full bg-[#F4F3F1] text-[#57534E]">
          {DIRECTION_LABELS[base.syncDirection]}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-[#F4F3F1] text-[#57534E]">
          {SCHEDULE_LABELS[base.syncSchedule]}
        </span>
      </div>

      {/* ── Synced record counts ── */}
      <div className="grid grid-cols-3 gap-x-4 gap-y-2 pt-1 border-t border-[#F4F3F1]">
        {STAT_TABLES.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-[11px] text-[#A8A29E]">{label}</span>
            <span className="text-[11px] font-semibold text-[#1C1917]">
              {hasStats ? (stats[key] ?? 0).toLocaleString() : "—"}
            </span>
          </div>
        ))}
      </div>

      {base.lastSyncedAt && (
        <div className="flex items-center gap-1.5 text-xs pt-0.5">
          {base.lastSyncStatus === "success" ? (
            <CheckCircle2 size={11} className="text-green-500 shrink-0" />
          ) : (
            <XCircle size={11} className="text-red-500 shrink-0" />
          )}
          <span className="text-[#A8A29E]">
            Last synced: {new Date(base.lastSyncedAt).toLocaleString("en-AU")}
          </span>
          {base.lastSyncStatus === "error" && base.lastSyncMessage && (
            <span className="text-red-500 truncate">{base.lastSyncMessage}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Airtable Base Modal ───────────────────────────────────────────────────────
function BaseModal({
  initial, onSave, onClose, saving,
}: {
  initial: Partial<AirtableBase> | null;
  onSave: (data: Partial<AirtableBase>) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Partial<AirtableBase>>({
    name: initial?.name ?? "",
    baseId: initial?.baseId ?? "",
    syncDirection: initial?.syncDirection ?? "both",
    syncSchedule: initial?.syncSchedule ?? "every6h",
    isActive: initial?.isActive ?? true,
  });
  const set = (k: keyof AirtableBase, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
        <h3 className="text-base font-semibold text-[#1C1917]">
          {initial?.id ? "Edit Base" : "Add Base"}
        </h3>

        <div className="space-y-3">
          <div>
            <label className={label}>Name (alias)</label>
            <input
              className={inp}
              value={form.name ?? ""}
              onChange={e => set("name", e.target.value)}
              placeholder="e.g. TS Students & Institute"
            />
          </div>
          <div>
            <label className={label}>Base ID</label>
            <input
              className={inp}
              value={form.baseId ?? ""}
              onChange={e => set("baseId", e.target.value)}
              placeholder="appXXXXXXXXXXXXXX"
            />
            <p className="text-xs text-[#A8A29E] mt-1">Find in your Airtable URL: airtable.com/<strong>appXXX</strong>/...</p>
          </div>
          <div>
            <label className={label}>Sync Direction</label>
            <select
              className={inp}
              value={form.syncDirection}
              onChange={e => set("syncDirection", e.target.value as AirtableBase["syncDirection"])}
            >
              <option value="inbound">Airtable → CRM (Inbound)</option>
              <option value="outbound">CRM → Airtable (Outbound)</option>
              <option value="both">Bidirectional</option>
            </select>
          </div>
          <div>
            <label className={label}>Auto Sync Schedule</label>
            <select
              className={inp}
              value={form.syncSchedule}
              onChange={e => set("syncSchedule", e.target.value as AirtableBase["syncSchedule"])}
            >
              <option value="manual">Manual only</option>
              <option value="every6h">Every 6 hours (4x daily)</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive ?? true}
              onChange={e => set("isActive", e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            <span className="text-sm text-[#1C1917]">Active</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-[#57534E] hover:bg-[#F4F3F1] transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.name || !form.baseId}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-60"
            style={{ background: "var(--e-orange)" }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Airtable Section ──────────────────────────────────────────────────────────
function AirtableSection() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showToken, setShowToken] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [modalBase, setModalBase] = useState<Partial<AirtableBase> | null | false>(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{
    hasToken: boolean;
    tokenMasked: string | null;
    bases: AirtableBase[];
  }>({
    queryKey: ["airtable-config"],
    queryFn: () => axios.get(`${BASE}/api/airtable/config`).then(r => r.data),
  });

  const saveToken = useMutation({
    mutationFn: (token: string) => axios.put(`${BASE}/api/airtable/token`, { token }).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Airtable token saved" });
      setTokenInput("");
      qc.invalidateQueries({ queryKey: ["airtable-config"] });
    },
    onError: (e: any) => {
      toast({ title: "Save failed", description: e?.response?.data?.error ?? "An error occurred", variant: "destructive" });
    },
  });

  const removeToken = useMutation({
    mutationFn: () => axios.delete(`${BASE}/api/airtable/token`).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Airtable disconnected" });
      qc.invalidateQueries({ queryKey: ["airtable-config"] });
    },
  });

  const addBase = useMutation({
    mutationFn: (payload: Partial<AirtableBase>) =>
      axios.post(`${BASE}/api/airtable/bases`, payload).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Base added" });
      setModalBase(false);
      qc.invalidateQueries({ queryKey: ["airtable-config"] });
    },
    onError: (e: any) => {
      toast({ title: "Failed to add", description: e?.response?.data?.error, variant: "destructive" });
    },
  });

  const editBase = useMutation({
    mutationFn: ({ id, ...payload }: Partial<AirtableBase> & { id: string }) =>
      axios.put(`${BASE}/api/airtable/bases/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Base updated" });
      setModalBase(false);
      qc.invalidateQueries({ queryKey: ["airtable-config"] });
    },
    onError: (e: any) => {
      toast({ title: "Failed to update", description: e?.response?.data?.error, variant: "destructive" });
    },
  });

  const deleteBase = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/airtable/bases/${id}`).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Base deleted" });
      qc.invalidateQueries({ queryKey: ["airtable-config"] });
    },
  });

  const syncBase = async (id: string) => {
    setSyncingId(id);
    try {
      await axios.post(`${BASE}/api/airtable/sync/${id}`);
      toast({ title: "Sync complete" });
      qc.invalidateQueries({ queryKey: ["airtable-config"] });
    } catch (e: any) {
      toast({ title: "Sync failed", description: e?.response?.data?.error, variant: "destructive" });
    } finally {
      setSyncingId(null);
    }
  };

  const handleSaveBase = (form: Partial<AirtableBase>) => {
    if (modalBase && (modalBase as AirtableBase).id) {
      editBase.mutate({ ...(modalBase as AirtableBase), ...form });
    } else {
      addBase.mutate(form);
    }
  };

  return (
    <>
      {modalBase !== false && (
        <BaseModal
          initial={modalBase}
          onSave={handleSaveBase}
          onClose={() => setModalBase(false)}
          saving={addBase.isPending || editBase.isPending}
        />
      )}

      <IntegrationCard
        icon={Database}
        iconBg="bg-[#F0FDF4]"
        iconColor="text-green-600"
        name="Airtable"
        description="Sync data bidirectionally between Airtable Base and your CRM"
        badge={<StatusBadge connected={data?.hasToken} />}
        defaultOpen={false}
      >
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 size={20} className="animate-spin text-[#A8A29E]" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Token section */}
            <div className="space-y-3">
              <p className={label}>Personal Access Token</p>
              {data?.hasToken ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-9 px-3 flex items-center border border-[#E8E6E2] rounded-lg bg-[#F4F3F1] text-sm text-[#57534E] font-mono">
                    {data.tokenMasked}
                  </div>
                  <button
                    onClick={() => removeToken.mutate()}
                    disabled={removeToken.isPending}
                    className="h-9 px-3 rounded-lg border border-red-200 text-red-500 text-sm hover:bg-red-50 transition flex items-center gap-1.5"
                  >
                    {removeToken.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        className={inp}
                        type={showToken ? "text" : "password"}
                        value={tokenInput}
                        onChange={e => setTokenInput(e.target.value)}
                        placeholder="pat••••••••••••••••••••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(s => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#57534E]"
                      >
                        {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <button
                      onClick={() => saveToken.mutate(tokenInput)}
                      disabled={saveToken.isPending || !tokenInput.trim()}
                      className="h-9 px-4 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5 transition disabled:opacity-60"
                      style={{ background: "var(--e-orange)" }}
                    >
                      {saveToken.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      Save
                    </button>
                  </div>
                  <p className="text-xs text-[#A8A29E]">
                    Generate at Airtable → Builder Hub → Personal access tokens
                  </p>
                </div>
              )}
            </div>

            {/* Bases section — only show when token is configured */}
            {data?.hasToken && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className={label}>Connected Bases ({data.bases.length})</p>
                  <button
                    onClick={() => setModalBase({})}
                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[#E8E6E2] hover:bg-[#F4F3F1] text-[#57534E] transition"
                  >
                    <Plus size={12} /> Add Base
                  </button>
                </div>

                {data.bases.length === 0 ? (
                  <div className="border border-dashed border-[#E8E6E2] rounded-xl p-6 text-center text-sm text-[#A8A29E]">
                    No Bases connected yet.<br />
                    <button
                      onClick={() => setModalBase({})}
                      className="mt-2 text-orange-500 font-semibold hover:underline"
                    >
                      + Add Base
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.bases.map(b => (
                      <AirtableBaseCard
                        key={b.id}
                        base={b}
                        onEdit={base => setModalBase(base)}
                        onDelete={id => deleteBase.mutate(id)}
                        onSync={syncBase}
                        syncing={syncingId === b.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </IntegrationCard>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
// ── Google Drive Section ────────────────────────────────────────────────────

function GoogleDriveSection() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [location] = useLocation();
  const [rootFolderInput, setRootFolderInput] = useState("");
  const [editingRoot, setEditingRoot] = useState(false);

  const { data: gdStatus, isLoading } = useQuery<{ connected: boolean; rootFolderId?: string | null }>({
    queryKey: ["google-drive-status"],
    queryFn: () => axios.get(`${BASE}/api/google-drive/status`).then(r => r.data),
    retry: false,
    throwOnError: false,
  });

  // Handle OAuth redirect result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("google");
    if (result === "connected") {
      toast({ title: "Google Drive connected successfully" });
      qc.invalidateQueries({ queryKey: ["google-drive-status"] });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (result === "error") {
      toast({ title: "Google Drive connection failed", description: params.get("msg") ?? "", variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [location]);

  const connectMutation = useMutation({
    mutationFn: () => axios.get(`${BASE}/api/google-drive/auth-url`).then(r => r.data.url as string),
    onSuccess: (url) => { window.location.href = url; },
    onError: (e: any) => {
      const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? "Failed to connect. Check that GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in Railway Variables.";
      toast({ title: "Google Drive Error", description: msg, variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => axios.post(`${BASE}/api/google-drive/disconnect`),
    onSuccess: () => { toast({ title: "Google Drive disconnected" }); qc.invalidateQueries({ queryKey: ["google-drive-status"] }); },
    onError: () => toast({ title: "Error disconnecting", variant: "destructive" }),
  });

  const saveRootMutation = useMutation({
    mutationFn: () => axios.put(`${BASE}/api/google-drive/root-folder`, { rootFolderId: rootFolderInput }),
    onSuccess: () => { toast({ title: "Root folder saved" }); qc.invalidateQueries({ queryKey: ["google-drive-status"] }); setEditingRoot(false); },
    onError: () => toast({ title: "Error saving root folder", variant: "destructive" }),
  });

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-[#A8A29E]" /></div>;

  return (
    <IntegrationCard
      icon={HardDrive}
      iconBg="bg-[#EFF6FF]"
      iconColor="text-blue-600"
      name="Google Drive"
      description="Auto-create student folders in Google Drive linked to Account records"
      badge={<StatusBadge connected={gdStatus?.connected} />}
    >
      <div className="space-y-4">
        {gdStatus?.connected ? (
          <>
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>Google Drive connected. Folders can be auto-created per Account.</span>
            </div>

            {/* Root folder config */}
            <div className="space-y-1.5">
              <label className={label}>Root Folder ID <span className="text-[#A8A29E] font-normal normal-case">(location for new folder creation)</span></label>
              {editingRoot ? (
                <div className="flex items-center gap-2">
                  <input
                    className={inp}
                    value={rootFolderInput}
                    onChange={e => setRootFolderInput(e.target.value)}
                    placeholder="Google Drive Folder ID (last part of the URL)"
                  />
                  <button
                    onClick={() => saveRootMutation.mutate()}
                    disabled={saveRootMutation.isPending}
                    className="h-9 px-3 rounded-lg bg-(--e-orange) text-white text-sm hover:bg-(--e-orange-hover) flex items-center gap-1.5"
                  >
                    {saveRootMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
                  </button>
                  <button onClick={() => setEditingRoot(false)} className="h-9 px-3 rounded-lg border border-[#E8E6E2] text-sm text-[#57534E]">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-9 px-3 flex items-center border border-[#E8E6E2] rounded-lg bg-[#F4F3F1] text-sm text-[#57534E] font-mono truncate">
                    {gdStatus?.rootFolderId ?? <span className="text-[#A8A29E]">Not set — folders created in My Drive root</span>}
                  </div>
                  <button onClick={() => { setRootFolderInput(gdStatus?.rootFolderId ?? ""); setEditingRoot(true); }}
                    className="h-9 px-3 rounded-lg border border-[#E8E6E2] text-sm text-[#57534E] flex items-center gap-1.5 hover:bg-[#F4F3F1]">
                    <Edit2 size={13} /> Edit
                  </button>
                </div>
              )}
              <p className="text-xs text-[#A8A29E]">
                Paste the ID that comes after folders/ in the Google Drive URL.
                Example: <code className="font-mono">https://drive.google.com/drive/folders/<strong>1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs</strong></code>
              </p>
            </div>

            <button
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="flex items-center gap-1.5 text-sm text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
            >
              {disconnectMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              Disconnect Google Drive
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[#57534E]">
              Connecting your Google account allows you to auto-create student folders from the Account page.
            </p>
            <div className="bg-[#FFF7ED] border border-[#FDDCB5] rounded-lg p-3 text-xs text-[#92400E] space-y-1">
              <p className="font-semibold">Pre-configuration required:</p>
              <p>1. Google Cloud Console → Create an OAuth 2.0 Client ID</p>
              <p>2. Redirect URI: <code className="font-mono">https://api.edubee.co/api/google-drive/callback</code></p>
              <p>3. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to Railway Variables</p>
            </div>
            <button
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition"
            >
              {connectMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <HardDrive size={14} />}
              Connect Google Drive
            </button>
          </div>
        )}
      </div>
    </IntegrationCard>
  );
}

export default function TenantIntegrations() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<any>({
    queryKey: ["tenant-integrations"],
    queryFn: () => axios.get(`${BASE}/api/tenant-integrations`).then(r => r.data),
  });

  // SMTP form state
  const [smtp, setSmtp] = useState<Record<string, any> | null>(null);
  const smtpVal = (k: string) => smtp?.[k] ?? data?.smtp?.[k] ?? "";
  const setSmtpField = (k: string, v: any) => setSmtp(s => ({ ...(s ?? data?.smtp ?? {}), [k]: v }));

  // Zapier form state
  const [zapierUrl, setZapierUrl] = useState("");

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      axios.put(`${BASE}/api/tenant-integrations`, payload).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Integration settings saved" });
      qc.invalidateQueries({ queryKey: ["tenant-integrations"] });
      setSmtp(null);
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e?.response?.data?.error ?? "Save failed", variant: "destructive" });
    },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-(--e-orange)" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 px-4">

      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-[#1C1917]">Integrations</h1>
        <p className="text-sm text-[#A8A29E] mt-0.5">
          Connect external services to extend your CRM's capabilities.
        </p>
      </div>

      {/* ── Email ──────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-[#A8A29E] uppercase tracking-widest">Email</h2>

        <IntegrationCard
          icon={Mail}
          iconBg="bg-[#FFF7ED]"
          iconColor="text-(--e-orange)"
          name="Custom SMTP"
          description="Send emails from your own email server instead of the platform default"
          badge={<StatusBadge connected={data?.smtp?.enabled} />}
          defaultOpen={false}
        >
          <div className="space-y-4">
            {/* Enable toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setSmtpField("enabled", !smtpVal("enabled"))}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${smtpVal("enabled") ? "bg-(--e-orange)" : "bg-[#D4D0CB]"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${smtpVal("enabled") ? "translate-x-5" : ""}`} />
              </div>
              <span className="text-sm text-[#1C1917]">Use custom SMTP</span>
            </label>

            {smtpVal("enabled") && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className={label}>SMTP Host</label>
                    <input className={inp} value={smtpVal("host")} onChange={e => setSmtpField("host", e.target.value)} placeholder="smtp.example.com" />
                  </div>
                  <div>
                    <label className={label}>Port</label>
                    <input className={inp} type="number" value={smtpVal("port")} onChange={e => setSmtpField("port", Number(e.target.value))} placeholder="587" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>SMTP Username</label>
                    <input className={inp} value={smtpVal("user")} onChange={e => setSmtpField("user", e.target.value)} placeholder="user@example.com" />
                  </div>
                  <div>
                    <label className={label}>SMTP Password</label>
                    <input className={inp} type="password" value={smtpVal("password") ?? ""} onChange={e => setSmtpField("password", e.target.value)} placeholder="••••••••" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>From Email</label>
                    <input className={inp} value={smtpVal("fromEmail")} onChange={e => setSmtpField("fromEmail", e.target.value)} placeholder="noreply@yourdomain.com" />
                  </div>
                  <div>
                    <label className={label}>From Name</label>
                    <input className={inp} value={smtpVal("fromName")} onChange={e => setSmtpField("fromName", e.target.value)} placeholder="Your Company" />
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => saveMutation.mutate({ smtp: smtp ?? data?.smtp })}
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ background: "var(--e-orange)" }}
            >
              {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Email Settings
            </button>
          </div>
        </IntegrationCard>
      </section>

      {/* ── Automation ─────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-[#A8A29E] uppercase tracking-widest">Automation</h2>

        <IntegrationCard
          icon={Zap}
          iconBg="bg-[#FFF7ED]"
          iconColor="text-amber-600"
          name="Zapier"
          description="Connect your CRM to 5,000+ apps via Zapier webhooks"
          badge={<StatusBadge connected={data?.zapier?.enabled} />}
        >
          <div className="space-y-3">
            <div>
              <label className={label}>Zapier Webhook URL</label>
              <input
                className={inp}
                value={zapierUrl || data?.zapier?.webhookUrl || ""}
                onChange={e => setZapierUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/hooks/catch/..."
              />
            </div>
            <p className="text-xs text-[#A8A29E]">
              Create a Zap in Zapier using the "Webhooks by Zapier" trigger, then paste the webhook URL above.
            </p>
            <button
              onClick={() => saveMutation.mutate({ zapier: { enabled: true, webhookUrl: zapierUrl || data?.zapier?.webhookUrl } })}
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ background: "var(--e-orange)" }}
            >
              {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Zapier Settings
            </button>
          </div>
        </IntegrationCard>
      </section>

      {/* ── Data Sync ──────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-[#A8A29E] uppercase tracking-widest">Data Sync</h2>
        <AirtableSection />
      </section>

      {/* ── Google Drive ────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-[#A8A29E] uppercase tracking-widest">File Storage</h2>
        <GoogleDriveSection />
      </section>

      {/* ── Coming Soon ─────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-[#A8A29E] uppercase tracking-widest">Coming Soon</h2>
        <div className="space-y-3 opacity-60 pointer-events-none">
          <IntegrationCard
            icon={MessageSquare}
            iconBg="bg-[#F0FDF4]"
            iconColor="text-green-600"
            name="Slack"
            description="Get real-time notifications in your Slack workspace"
            badge={<StatusBadge comingSoon />}
          />
          <IntegrationCard
            icon={Building2}
            iconBg="bg-[#FFF0F6]"
            iconColor="text-pink-600"
            name="HubSpot"
            description="Sync leads and contacts with HubSpot CRM"
            badge={<StatusBadge comingSoon />}
          />
          <IntegrationCard
            icon={Cable}
            iconBg="bg-[#F5F3FF]"
            iconColor="text-purple-600"
            name="Make (Integromat)"
            description="Build advanced automation workflows with Make"
            badge={<StatusBadge comingSoon />}
          />
        </div>
      </section>
    </div>
  );
}
