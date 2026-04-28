import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Bot, Send, Plus, Trash2, FileText, Link2, Loader2, X,
  RotateCcw, Upload, RefreshCw, AlertCircle,
  Database, Cpu, Key, Lock, Globe, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/date-format";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function genSessionId() {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

type KBScope = "internal" | "public";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  chunksUsed?: number;
  topScore?: number | null;
};

type Doc = {
  id: string;
  title: string;
  source?: string;
  sourceType: string;
  scope: KBScope;
  createdAt: string;
  preview: string;
  chunkCount: number;
};

type AddModalType = "google" | "file" | "manual" | null;

// ─── Helpers ────────────────────────────────────────────────────────────
const SOURCE_BADGE: Record<string, { label: string; className: string }> = {
  manual:     { label: "Manual",       className: "bg-blue-50 text-blue-700" },
  google_doc: { label: "Google Docs",  className: "bg-green-50 text-green-700" },
  file:       { label: "File Upload",  className: "bg-purple-50 text-purple-700" },
};

const SCOPE_CONFIG: Record<KBScope, { label: string; icon: typeof Lock; className: string; dotClass: string }> = {
  internal: { label: "Internal", icon: Lock,  className: "bg-amber-50 text-amber-700 border border-amber-200",  dotClass: "bg-amber-400" },
  public:   { label: "Public",   icon: Globe, className: "bg-teal-50 text-teal-700 border border-teal-200",     dotClass: "bg-teal-400" },
};

// ─── Main Page ───────────────────────────────────────────────────────────
export default function ChatbotAdminPage() {
  const [activeTab, setActiveTab] = useState<"knowledge" | "chat" | "settings">("knowledge");

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ["chatbot-status"],
    queryFn: () => axios.get(`${BASE}/api/chatbot/status`).then(r => r.data),
    refetchInterval: 8000,
  });

  const totalDocs = (status?.documentCount ?? 0);
  const internalCount = status?.internalCount ?? 0;
  const publicCount = status?.publicCount ?? 0;
  const kbReady = totalDocs > 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-(--e-orange)/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-(--e-orange)" />
          </div>
          <div>
            <h1 className="font-semibold text-base text-foreground">AI Chatbot Management</h1>
            <p className="text-xs text-muted-foreground">
              Gemini 2.5 Flash · gemini-embedding-001
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Status badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            kbReady ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${kbReady ? "bg-green-500" : "bg-yellow-500"}`} />
            {kbReady ? "Chatbot Active" : "No Documents"}
          </div>

          {/* Scope counters */}
          {kbReady && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <Lock className="w-3 h-3" /> {internalCount} Internal
              </span>
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                <Globe className="w-3 h-3" /> {publicCount} Public
              </span>
            </div>
          )}

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {([
              { id: "knowledge", label: "Knowledge Base" },
              { id: "chat",      label: "Chat Test" },
              { id: "settings",  label: "Settings" },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-white shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "knowledge" && (
        <KnowledgePanel onStatusChange={refetchStatus} />
      )}
      {activeTab === "chat" && <ChatPanel />}
      {activeTab === "settings" && <SettingsPanel status={status} />}
    </div>
  );
}

// ─── Knowledge Base Panel ────────────────────────────────────────────────
function KnowledgePanel({ onStatusChange }: { onStatusChange: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [addModal, setAddModal] = useState<AddModalType>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<"all" | KBScope>("all");

  const { data: docs = [], isLoading } = useQuery<Doc[]>({
    queryKey: ["chatbot-docs"],
    queryFn: () => axios.get(`${BASE}/api/chatbot/docs`).then(r => r.data),
  });

  const filteredDocs = scopeFilter === "all" ? docs : docs.filter(d => d.scope === scopeFilter);

  const deleteDoc = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/chatbot/docs/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatbot-docs"] });
      onStatusChange();
      toast({ title: "Document deleted" });
    },
    onError: () => toast({ variant: "destructive", title: "Delete failed" }),
  });

  const changeScope = useMutation({
    mutationFn: ({ id, scope }: { id: string; scope: KBScope }) =>
      axios.patch(`${BASE}/api/chatbot/docs/${id}/scope`, { scope }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatbot-docs"] });
      onStatusChange();
      toast({ title: "Scope updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Scope update failed" }),
  });

  const syncAll = async () => {
    setSyncingAll(true);
    try {
      const token = localStorage.getItem("edubee_token");
      const res = await fetch(`${BASE}/api/chatbot/docs/sync-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      qc.invalidateQueries({ queryKey: ["chatbot-docs"] });
      onStatusChange();
      toast({
        title: "Google Docs sync complete",
        description: `${data.synced} updated${data.errors ? ` · ${data.errors} errors` : ""}`,
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sync error", description: e.message });
    } finally {
      setSyncingAll(false);
    }
  };

  const handleAdded = () => {
    setAddModal(null);
    qc.invalidateQueries({ queryKey: ["chatbot-docs"] });
    onStatusChange();
  };

  const internalCount = docs.filter(d => d.scope === "internal").length;
  const publicCount   = docs.filter(d => d.scope === "public").length;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
      {/* Scope explanation banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex gap-3 p-3.5 rounded-xl border border-amber-200 bg-amber-50">
          <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-800">Internal Documents</p>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Visible to logged-in staff only (admin chatbot). Use for operations manuals, pricing, internal policies.
            </p>
          </div>
        </div>
        <div className="flex gap-3 p-3.5 rounded-xl border border-teal-200 bg-teal-50">
          <Globe className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-teal-800">Public Documents</p>
            <p className="text-xs text-teal-700 mt-0.5 leading-relaxed">
              Available on the landing page chatbot (no login required). Use for FAQs, program info, how to apply.
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Scope filter tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg text-xs">
          {([
            { key: "all",      label: `All (${docs.length})` },
            { key: "internal", label: `Internal (${internalCount})` },
            { key: "public",   label: `Public (${publicCount})` },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setScopeFilter(t.key)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                scopeFilter === t.key
                  ? "bg-white shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs"
            onClick={syncAll} disabled={syncingAll}>
            {syncingAll
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing...</>
              : <><RefreshCw className="w-3.5 h-3.5" /> Sync All</>}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs"
            onClick={() => setAddModal("google")}>
            <Link2 className="w-3.5 h-3.5" /> Google Docs
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs"
            onClick={() => setAddModal("file")}>
            <Upload className="w-3.5 h-3.5" /> Upload File
          </Button>
          <Button size="sm" className="bg-(--e-orange) hover:bg-[#d97706] text-white gap-1.5 text-xs"
            onClick={() => setAddModal("manual")}>
            <Plus className="w-3.5 h-3.5" /> Add Manual
          </Button>
        </div>
      </div>

      {/* Documents table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-(--e-orange)" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center border border-dashed border-border rounded-xl">
          <div className="w-14 h-14 rounded-2xl bg-(--e-orange)/8 flex items-center justify-center">
            <FileText className="w-7 h-7 text-(--e-orange)/60" />
          </div>
          <p className="font-medium text-sm">
            {scopeFilter === "all" ? "No documents added yet" : `No ${scopeFilter} documents`}
          </p>
          <p className="text-xs text-muted-foreground">
            {scopeFilter === "all"
              ? "Add FAQs, policy docs, or guides so the AI can answer questions."
              : `Add documents and mark them as ${scopeFilter}.`}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">Document</th>
                <th className="text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">Scope</th>
                <th className="text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">Source</th>
                <th className="text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">Chunks</th>
                <th className="text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc, i) => {
                const badge = SOURCE_BADGE[doc.sourceType] ?? SOURCE_BADGE.manual;
                const scopeCfg = SCOPE_CONFIG[doc.scope ?? "internal"];
                const ScopeIcon = scopeCfg.icon;
                return (
                  <tr key={doc.id} className={`border-b border-border last:border-0 hover:bg-(--e-orange-lt)/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground truncate max-w-[220px]">{doc.title}</p>
                      {doc.source && (
                        <p className="text-[10px] text-muted-foreground truncate max-w-[220px] mt-0.5">{doc.source}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {/* Scope toggle dropdown */}
                      <div className="relative group">
                        <button
                          className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium transition-colors ${scopeCfg.className} hover:opacity-80`}
                          title="Click to change scope"
                          onClick={() => {
                            const next: KBScope = doc.scope === "internal" ? "public" : "internal";
                            if (confirm(`Change scope to "${next}"?`)) {
                              changeScope.mutate({ id: doc.id, scope: next });
                            }
                          }}
                        >
                          <ScopeIcon className="w-2.5 h-2.5" />
                          {scopeCfg.label}
                          <ChevronDown className="w-2.5 h-2.5 opacity-50" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground">
                        {doc.chunkCount > 0
                          ? <span className="text-(--e-orange) font-semibold">{doc.chunkCount}</span>
                          : <span className="text-yellow-600 text-[10px]">Processing...</span>
                        }
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground whitespace-nowrap">
                      {formatDateTime(doc.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { if (confirm("Delete this document?")) deleteDoc.mutate(doc.id); }}
                        className="text-muted-foreground/40 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Document Modal */}
      {addModal && (
        <AddDocumentModal
          type={addModal}
          onClose={() => setAddModal(null)}
          onAdded={handleAdded}
        />
      )}
    </div>
  );
}

// ─── Add Document Modal ──────────────────────────────────────────────────
function AddDocumentModal({ type, onClose, onAdded }: {
  type: AddModalType;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { toast } = useToast();
  const [url, setUrl]         = useState("");
  const [title, setTitle]     = useState("");
  const [content, setContent] = useState("");
  const [file, setFile]       = useState<File | null>(null);
  const [scope, setScope]     = useState<KBScope>("internal");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("edubee_token");
      if (type === "google") {
        const res = await fetch(`${BASE}/api/chatbot/docs/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ url, scope }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "An error occurred.");
        toast({ title: `"${data.title}" imported`, description: "Generating embeddings..." });
      } else if (type === "file") {
        if (!file) throw new Error("Please select a file.");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("scope", scope);
        if (title.trim()) formData.append("title", title.trim());
        const res = await fetch(`${BASE}/api/chatbot/docs/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        toast({ title: `"${data.document?.title}" uploaded`, description: "Generating embeddings..." });
      } else {
        if (!title.trim() || !content.trim()) throw new Error("Title and content are required.");
        const res = await fetch(`${BASE}/api/chatbot/docs`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title, content, sourceType: "manual", scope }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to add document");
        toast({ title: "Document added", description: "Generating embeddings..." });
      }
      onAdded();
    } catch (e: any) {
      setError(e.message ?? "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const modalTitle =
    type === "google" ? "Add Google Doc" :
    type === "file"   ? "Upload File" :
                        "Add Manual Entry";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-base">{modalTitle}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Scope Selector */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Visibility Scope *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope("internal")}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-2 text-left transition-colors ${
                  scope === "internal"
                    ? "border-amber-400 bg-amber-50"
                    : "border-border hover:border-amber-300 hover:bg-amber-50/40"
                }`}
              >
                <Lock className={`w-4 h-4 shrink-0 ${scope === "internal" ? "text-amber-600" : "text-muted-foreground"}`} />
                <div>
                  <div className={`text-xs font-semibold ${scope === "internal" ? "text-amber-800" : "text-foreground"}`}>Internal</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">Staff only · Admin chatbot</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setScope("public")}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-2 text-left transition-colors ${
                  scope === "public"
                    ? "border-teal-400 bg-teal-50"
                    : "border-border hover:border-teal-300 hover:bg-teal-50/40"
                }`}
              >
                <Globe className={`w-4 h-4 shrink-0 ${scope === "public" ? "text-teal-600" : "text-muted-foreground"}`} />
                <div>
                  <div className={`text-xs font-semibold ${scope === "public" ? "text-teal-800" : "text-foreground"}`}>Public</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">Anyone · Landing page</div>
                </div>
              </button>
            </div>
          </div>

          {type === "google" && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                Google Docs URL *
              </label>
              <Input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://docs.google.com/document/d/..."
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                The service account must be shared as Viewer on the document.
              </p>
            </div>
          )}

          {type === "file" && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                Select File (.txt, .md) *
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
                }}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-5 cursor-pointer transition-colors ${
                  file
                    ? "border-(--e-orange)/50 bg-(--e-orange)/5"
                    : "border-border hover:border-(--e-orange)/40 hover:bg-muted/40"
                }`}
              >
                <Upload className={`w-5 h-5 ${file ? "text-(--e-orange)" : "text-muted-foreground/40"}`} />
                {file
                  ? <p className="text-sm font-medium text-(--e-orange)">{file.name}</p>
                  : <p className="text-sm text-muted-foreground">Click to select a file</p>
                }
                <p className="text-[10px] text-muted-foreground/60">.txt · .md · max 5 MB</p>
              </div>
            </div>
          )}

          {type === "manual" && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                Content *
              </label>
              <Textarea
                placeholder="Paste FAQs, policy documents, guides, or any text content here"
                value={content}
                onChange={e => setContent(e.target.value)}
                className="min-h-[120px] text-sm font-mono"
              />
            </div>
          )}

          {/* Title field — all types */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
              Document Name{type !== "manual" ? " (optional)" : " *"}
            </label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={type === "manual" ? "Document title" : "Auto-set if left blank"}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-5">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 bg-(--e-orange) hover:bg-[#d97706] text-white"
            disabled={loading || (type === "google" ? !url.trim() : type === "file" ? !file : !title.trim() || !content.trim())}
            onClick={submit}
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Chat Test Panel ─────────────────────────────────────────────────────
function ChatPanel() {
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState(genSessionId);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hello! I'm the Edubee Camp AI Assistant (Internal). I can answer questions using all documents — both internal and public." },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const clearSession = useCallback(async () => {
    const newId = genSessionId();
    try {
      const token = localStorage.getItem("edubee_token");
      await fetch(`${BASE}/api/chatbot/session/${sessionId}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
    setSessionId(newId);
    setMessages([{ role: "assistant", content: "Conversation cleared. Ask a new question!" }]);
  }, [sessionId]);

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || isStreaming) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: question }, { role: "assistant", content: "" }]);
    setIsStreaming(true);

    try {
      const token = localStorage.getItem("edubee_token");
      const resp = await fetch(`${BASE}/api/chatbot/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question, sessionId }),
      });
      if (!resp.ok) throw new Error("Request failed");

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      let sources: string[] = [];
      let chunksUsed = 0;
      let topScore: number | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              assistantText += data.content;
              setMessages(prev => {
                const u = [...prev];
                u[u.length - 1] = { role: "assistant", content: assistantText };
                return u;
              });
            }
            if (data.done) {
              sources    = data.sources ?? [];
              chunksUsed = data.chunksUsed ?? 0;
              topScore   = data.topScore ?? null;
            }
            if (data.error) throw new Error(data.error);
          } catch {}
        }
      }
      setMessages(prev => {
        const u = [...prev];
        u[u.length - 1] = { role: "assistant", content: assistantText, sources: sources.length ? sources : undefined, chunksUsed: chunksUsed || undefined, topScore };
        return u;
      });
    } catch (e: any) {
      setMessages(prev => {
        const u = [...prev];
        u[u.length - 1] = { role: "assistant", content: "An error occurred. Please try again." };
        return u;
      });
      toast({ variant: "destructive", title: "AI Response Error", description: e.message });
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Info bar */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-border bg-amber-50/60 shrink-0">
        <div className="flex items-center gap-2 text-xs text-amber-700">
          <Lock className="w-3.5 h-3.5" />
          <span className="font-medium">Internal Staff View</span>
          <span className="text-amber-600/70">— searches all documents (internal + public)</span>
        </div>
        <button
          onClick={clearSession}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="w-3 h-3" /> Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-(--e-orange)/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-(--e-orange)" />
              </div>
            )}
            <div className={`max-w-[80%] ${msg.role === "user" ? "order-first" : ""}`}>
              <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-(--e-orange) text-white rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}>
                {msg.content || (isStreaming && i === messages.length - 1
                  ? <span className="flex items-center gap-1.5 text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking...</span>
                  : ""
                )}
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {msg.sources.map((s, si) => (
                    <span key={si} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-200">
                      {s}
                    </span>
                  ))}
                  {msg.topScore != null && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded-full">
                      top {(msg.topScore * 100).toFixed(0)}% match
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-border bg-card shrink-0">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask a question based on the knowledge base..."
            className="text-sm"
            disabled={isStreaming}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className="bg-(--e-orange) hover:bg-[#d97706] text-white shrink-0"
          >
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────
function SettingsPanel({ status }: { status: any }) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 max-w-2xl">
      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">AI Model</p>
            <p className="text-xs text-muted-foreground mt-0.5">gemini-2.5-flash (text generation)</p>
          </div>
          <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">Active</span>
        </div>
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
            <Database className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Embedding Model</p>
            <p className="text-xs text-muted-foreground mt-0.5">gemini-embedding-001 · Cosine similarity search</p>
          </div>
          <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-full font-medium">Active</span>
        </div>
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
            <Key className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">API Key</p>
            <p className="text-xs text-muted-foreground mt-0.5">GEMINI_API_KEY environment variable</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            status?.keyConfigured ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {status?.keyConfigured ? "Configured" : "Missing"}
          </span>
        </div>
      </div>

      {/* Scope summary */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <p className="text-sm font-semibold">Knowledge Base Summary</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <Lock className="w-4 h-4 text-amber-600" />
            <div>
              <p className="text-xs font-semibold text-amber-800">{status?.internalCount ?? 0} Internal Docs</p>
              <p className="text-[10px] text-amber-600">Admin chatbot only</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-teal-50 border border-teal-200">
            <Globe className="w-4 h-4 text-teal-600" />
            <div>
              <p className="text-xs font-semibold text-teal-800">{status?.publicCount ?? 0} Public Docs</p>
              <p className="text-[10px] text-teal-600">Landing page chatbot</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Total {status?.totalChunks ?? 0} vector chunks indexed in PostgreSQL
        </p>
      </div>
    </div>
  );
}
