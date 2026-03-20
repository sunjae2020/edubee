import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Bot, Send, Plus, Trash2, FileText, Link2, Loader2, X,
  RotateCcw, Zap, Upload, RefreshCw, CheckCircle2, AlertCircle,
  Database, Cpu, Search, Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function genSessionId() {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

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
  createdAt: string;
  preview: string;
  chunkCount: number;
};

type AddModalType = "google" | "file" | "manual" | null;

// ─── Helpers ────────────────────────────────────────────────────────────
const SOURCE_BADGE: Record<string, { label: string; className: string }> = {
  manual:     { label: "수동 입력",    className: "bg-blue-50 text-blue-700" },
  google_doc: { label: "Google Docs", className: "bg-green-50 text-green-700" },
  file:       { label: "파일 업로드", className: "bg-purple-50 text-purple-700" },
};

// ─── Main Page ───────────────────────────────────────────────────────────
export default function ChatbotAdminPage() {
  const [activeTab, setActiveTab] = useState<"knowledge" | "chat" | "settings">("knowledge");

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ["chatbot-status"],
    queryFn: () => axios.get(`${BASE}/api/chatbot/status`).then(r => r.data),
    refetchInterval: 8000,
  });

  const kbReady = (status?.documentCount ?? 0) > 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F5821F]/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-[#F5821F]" />
          </div>
          <div>
            <h1 className="font-semibold text-base text-foreground">AI 챗봇 관리</h1>
            <p className="text-xs text-muted-foreground">
              Gemini 2.5 Flash · gemini-embedding-001
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Status badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            kbReady ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${kbReady ? "bg-green-500" : "bg-yellow-500"}`} />
            {kbReady ? "챗봇 활성" : "문서 없음"}
          </div>
          <span className="text-xs text-muted-foreground hidden sm:block">
            문서 {status?.documentCount ?? 0}개 · 청크 {status?.totalChunks ?? 0}개
          </span>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {([
              { id: "knowledge", label: "지식 베이스" },
              { id: "chat",      label: "챗봇 테스트" },
              { id: "settings",  label: "설정" },
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

  const { data: docs = [], isLoading } = useQuery<Doc[]>({
    queryKey: ["chatbot-docs"],
    queryFn: () => axios.get(`${BASE}/api/chatbot/docs`).then(r => r.data),
  });

  const deleteDoc = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/chatbot/docs/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatbot-docs"] });
      onStatusChange();
      toast({ title: "문서 삭제 완료" });
    },
    onError: () => toast({ variant: "destructive", title: "삭제 실패" }),
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
      if (!res.ok) throw new Error(data.error ?? "동기화 실패");
      qc.invalidateQueries({ queryKey: ["chatbot-docs"] });
      onStatusChange();
      toast({
        title: "Google Docs 동기화 완료",
        description: `${data.synced}개 갱신${data.errors ? ` · ${data.errors}개 오류` : ""}`,
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "동기화 오류", description: e.message });
    } finally {
      setSyncingAll(false);
    }
  };

  const handleAdded = () => {
    setAddModal(null);
    qc.invalidateQueries({ queryKey: ["chatbot-docs"] });
    onStatusChange();
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
      {/* How-to tip */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-800 mb-1">Google Docs 공유 설정</p>
        <p className="text-xs text-blue-700 leading-relaxed">
          Google Docs → 공유 → 서비스 계정 이메일을 뷰어로 추가 → URL 입력.
          문서 수정 시 <strong>전체 재동기화</strong>를 클릭하세요.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">
          총 <strong>{docs.length}</strong>개 문서
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs"
            onClick={syncAll} disabled={syncingAll}>
            {syncingAll
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 동기화 중...</>
              : <><RefreshCw className="w-3.5 h-3.5" /> 전체 재동기화</>}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs"
            onClick={() => setAddModal("google")}>
            <Link2 className="w-3.5 h-3.5" /> Google Docs
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs"
            onClick={() => setAddModal("file")}>
            <Upload className="w-3.5 h-3.5" /> 파일 업로드
          </Button>
          <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5 text-xs"
            onClick={() => setAddModal("manual")}>
            <Plus className="w-3.5 h-3.5" /> 직접 입력
          </Button>
        </div>
      </div>

      {/* Documents table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#F5821F]" />
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center border border-dashed border-border rounded-xl">
          <div className="w-14 h-14 rounded-2xl bg-[#F5821F]/8 flex items-center justify-center">
            <FileText className="w-7 h-7 text-[#F5821F]/60" />
          </div>
          <p className="font-medium text-sm">등록된 문서가 없습니다</p>
          <p className="text-xs text-muted-foreground">
            FAQ, 정책 문서, 가이드 등을 추가하면<br />AI가 해당 내용을 기반으로 답변합니다
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">문서명</th>
                <th className="text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">소스</th>
                <th className="text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">청크</th>
                <th className="text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">추가일</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {docs.map((doc, i) => {
                const badge = SOURCE_BADGE[doc.sourceType] ?? SOURCE_BADGE.manual;
                return (
                  <tr key={doc.id} className={`border-b border-border last:border-0 hover:bg-[#FEF0E3]/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground truncate max-w-[240px]">{doc.title}</p>
                      {doc.source && (
                        <p className="text-[10px] text-muted-foreground truncate max-w-[240px] mt-0.5">{doc.source}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground">
                        {doc.chunkCount > 0
                          ? <span className="text-[#F5821F] font-semibold">{doc.chunkCount}</span>
                          : <span className="text-yellow-600 text-[10px]">처리 중...</span>
                        }
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground whitespace-nowrap">
                      {format(new Date(doc.createdAt), "yyyy.MM.dd HH:mm")}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { if (confirm("이 문서를 삭제하시겠습니까?")) deleteDoc.mutate(doc.id); }}
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
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "오류가 발생했습니다.");
        toast({ title: `"${data.title}" 문서를 가져왔습니다`, description: "임베딩 생성 중..." });
      } else if (type === "file") {
        if (!file) throw new Error("파일을 선택해 주세요.");
        const formData = new FormData();
        formData.append("file", file);
        if (title.trim()) formData.append("title", title.trim());
        const res = await fetch(`${BASE}/api/chatbot/docs/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "업로드 실패");
        toast({ title: `"${data.document?.title}" 업로드 완료`, description: "임베딩 생성 중..." });
      } else {
        // manual
        if (!title.trim() || !content.trim()) throw new Error("제목과 내용을 입력해 주세요.");
        const res = await fetch(`${BASE}/api/chatbot/docs`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title, content, sourceType: "manual" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "추가 실패");
        toast({ title: "문서가 추가되었습니다", description: "임베딩 생성 중..." });
      }
      onAdded();
    } catch (e: any) {
      setError(e.message ?? "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const modalTitle = type === "google" ? "Google Docs 추가" : type === "file" ? "파일 업로드" : "직접 입력";

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
          {type === "google" && (
            <>
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
                  서비스 계정을 문서에 뷰어로 공유해야 합니다
                </p>
              </div>
            </>
          )}

          {type === "file" && (
            <>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  파일 선택 (.txt, .md) *
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
                      ? "border-[#F5821F]/50 bg-[#F5821F]/5"
                      : "border-border hover:border-[#F5821F]/40 hover:bg-muted/40"
                  }`}
                >
                  <Upload className={`w-5 h-5 ${file ? "text-[#F5821F]" : "text-muted-foreground/40"}`} />
                  {file
                    ? <p className="text-sm font-medium text-[#F5821F]">{file.name}</p>
                    : <p className="text-sm text-muted-foreground">클릭하여 파일 선택</p>
                  }
                  <p className="text-[10px] text-muted-foreground/60">.txt · .md · 최대 5MB</p>
                </div>
              </div>
            </>
          )}

          {type === "manual" && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                내용 *
              </label>
              <Textarea
                placeholder="FAQ, 정책 문서, 가이드 등 내용을 붙여넣으세요"
                value={content}
                onChange={e => setContent(e.target.value)}
                className="min-h-[140px] text-sm font-mono"
              />
            </div>
          )}

          {/* Title field — all types */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
              문서 이름{type !== "manual" ? " (선택)" : " *"}
            </label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={type === "manual" ? "문서 제목" : "비워두면 자동 설정"}
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
          <Button variant="outline" className="flex-1" onClick={onClose}>취소</Button>
          <Button
            className="flex-1 bg-[#F5821F] hover:bg-[#d97706] text-white"
            disabled={loading || (type === "google" ? !url.trim() : type === "file" ? !file : !title.trim() || !content.trim())}
            onClick={submit}
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 처리 중...</> : "추가"}
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
    { role: "assistant", content: "안녕하세요! Edubee Camp AI 어시스턴트입니다. 지식 베이스에 등록된 문서를 기반으로 답변드립니다." },
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
    setMessages([{ role: "assistant", content: "대화가 초기화되었습니다. 새로운 질문을 입력하세요!" }]);
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
      if (!resp.ok) throw new Error("요청 실패");

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
        u[u.length - 1] = { role: "assistant", content: "오류가 발생했습니다. 다시 시도해주세요." };
        return u;
      });
      toast({ variant: "destructive", title: "AI 응답 오류", description: e.message });
    } finally {
      setIsStreaming(false);
    }
  };

  const QUICK_QUESTIONS = [
    "캠프 신청 자격이 어떻게 되나요?",
    "프로그램 종류를 알려주세요",
    "비용은 얼마인가요?",
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-[#F5821F]/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-[#F5821F]" />
              </div>
            )}
            <div className={`max-w-[78%] flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-[#F5821F] text-white rounded-tr-sm"
                  : "bg-muted text-foreground rounded-tl-sm"
              }`}>
                {msg.content || (isStreaming && i === messages.length - 1
                  ? <span className="inline-flex gap-1 items-center h-4">
                      {[0, 150, 300].map(d => (
                        <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#F5821F] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </span>
                  : null
                )}
              </div>
              {msg.role === "assistant" && (msg.chunksUsed || msg.sources?.length) ? (
                <div className="flex flex-wrap items-center gap-1.5 px-1">
                  {msg.chunksUsed ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] bg-[#F5821F]/8 text-[#F5821F] px-2 py-0.5 rounded-full">
                      <Zap className="w-2.5 h-2.5" />
                      {msg.chunksUsed}개 청크
                      {msg.topScore != null && ` · ${(msg.topScore * 100).toFixed(0)}%`}
                    </span>
                  ) : null}
                  {msg.sources?.length ? (
                    <>
                      <span className="text-[10px] text-muted-foreground">출처:</span>
                      {msg.sources.map((s, si) => (
                        <span key={si} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick questions */}
      {messages.length <= 1 && (
        <div className="px-6 pb-2 flex flex-wrap gap-2">
          {QUICK_QUESTIONS.map(q => (
            <button
              key={q}
              onClick={() => { setInput(q); }}
              className="text-xs px-3 py-1.5 bg-card border border-border rounded-full text-muted-foreground hover:border-[#F5821F]/40 hover:text-[#F5821F] transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="shrink-0 px-6 py-4 border-t border-border bg-card">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="질문을 입력하세요... (Shift+Enter 줄바꿈)"
            className="resize-none min-h-[48px] max-h-[120px] text-sm"
            disabled={isStreaming}
            rows={1}
          />
          <Button onClick={sendMessage} disabled={!input.trim() || isStreaming}
            className="bg-[#F5821F] hover:bg-[#d97706] text-white h-12 w-12 shrink-0 p-0">
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <div className="flex items-center justify-between mt-1.5 px-0.5">
          <p className="text-[10px] text-muted-foreground/60">
            코사인 유사도 검색으로 관련 청크를 찾아 답변합니다
          </p>
          <button onClick={clearSession}
            className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            <RotateCcw className="w-2.5 h-2.5" /> 대화 초기화
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Panel ──────────────────────────────────────────────────────
function SettingsPanel({ status }: { status: any }) {
  const geminiConfigured = status?.keyConfigured ?? false;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
      <div className="grid gap-5 max-w-2xl">

        {/* Model configuration */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-1">
          <h3 className="font-semibold text-sm mb-3">AI 모델 구성</h3>
          {[
            { icon: <Cpu className="w-4 h-4 text-[#F5821F]" />, label: "채팅 모델", value: "Gemini 2.5 Flash" },
            { icon: <Database className="w-4 h-4 text-[#F5821F]" />, label: "임베딩 모델", value: "gemini-embedding-001" },
            { icon: <Search className="w-4 h-4 text-[#F5821F]" />, label: "벡터 검색", value: "코사인 유사도 (인메모리)" },
            {
              icon: geminiConfigured
                ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                : <AlertCircle className="w-4 h-4 text-yellow-600" />,
              label: "Gemini API Key",
              value: geminiConfigured ? "설정됨" : "설정 안 됨",
              valueClass: geminiConfigured ? "text-green-700" : "text-yellow-700",
            },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {row.icon} {row.label}
              </div>
              <span className={`text-sm font-medium ${row.valueClass ?? "text-foreground"}`}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* KB Stats */}
        {status && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-3">지식 베이스 현황</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "등록 문서 수", value: status.documentCount },
                { label: "임베딩 청크 수", value: status.totalChunks },
              ].map(stat => (
                <div key={stat.label} className="bg-[#F5821F]/5 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-[#F5821F]">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Secrets reminder */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-4 h-4 text-amber-700" />
            <h3 className="font-semibold text-sm text-amber-800">필요한 환경 변수 (Secrets)</h3>
          </div>
          <div className="space-y-1 font-mono text-xs text-amber-800 bg-amber-100 rounded-lg p-3">
            <p>GEMINI_API_KEY=AIza...</p>
            <p>GOOGLE_SERVICE_ACCOUNT_JSON={"{"} ... {"}"}</p>
          </div>
          <p className="text-xs text-amber-700 mt-2">
            Replit → Secrets 탭에서 설정하세요.
            <code className="bg-amber-100 px-1 rounded ml-1">GEMINI_API_KEY</code>는 채팅 및 임베딩에 필수입니다.
          </p>
        </div>
      </div>
    </div>
  );
}
