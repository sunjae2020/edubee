import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Bot, Send, Plus, Trash2, FileText, Link2, Loader2, X, RotateCcw, Zap } from "lucide-react";
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
type Doc = { id: string; title: string; source?: string; sourceType: string; createdAt: string; preview: string };

export default function ChatbotAdminPage() {
  const [activeTab, setActiveTab] = useState<"chat" | "docs">("chat");
  const { toast } = useToast();
  const qc = useQueryClient();

  // ─── Chat state ────────────────────────────────────────────────────────
  const [sessionId, setSessionId] = useState(genSessionId);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "안녕하세요! Edubee Camp AI 어시스턴트입니다. 지식 베이스에 등록된 문서를 기반으로 질문에 답변드립니다. 무엇이 궁금하신가요?" },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const clearSession = useCallback(async () => {
    const newSessionId = genSessionId();
    // Tell server to drop old session history
    try {
      const token = localStorage.getItem("edubee_token");
      await fetch(`${BASE}/api/chatbot/session/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
    setSessionId(newSessionId);
    setMessages([
      { role: "assistant", content: "대화가 초기화되었습니다. 새로운 질문을 입력하세요!" },
    ]);
  }, [sessionId]);

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || isStreaming) return;
    setInput("");

    const userMsg: ChatMessage = { role: "user", content: question };
    setMessages(prev => [...prev, userMsg, { role: "assistant", content: "" }]);
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
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              assistantText += data.content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantText };
                return updated;
              });
            }
            if (data.done) {
              sources = data.sources ?? [];
              chunksUsed = data.chunksUsed ?? 0;
              topScore = data.topScore ?? null;
            }
            if (data.error) throw new Error(data.error);
          } catch {}
        }
      }

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: assistantText,
          sources: sources.length > 0 ? sources : undefined,
          chunksUsed: chunksUsed > 0 ? chunksUsed : undefined,
          topScore,
        };
        return updated;
      });
    } catch (e: any) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "오류가 발생했습니다. 다시 시도해주세요." };
        return updated;
      });
      toast({ variant: "destructive", title: "AI 응답 오류", description: e.message });
    } finally {
      setIsStreaming(false);
    }
  };

  // ─── Docs state ────────────────────────────────────────────────────────
  const [addMode, setAddMode] = useState<"manual" | "google" | null>(null);
  const [docForm, setDocForm] = useState({ title: "", content: "" });
  const [googleUrl, setGoogleUrl] = useState("");
  const [importingGoogle, setImportingGoogle] = useState(false);

  const { data: docs = [], isLoading: docsLoading } = useQuery<Doc[]>({
    queryKey: ["chatbot-docs"],
    queryFn: () => axios.get(`${BASE}/api/chatbot/docs`).then(r => r.data),
    enabled: activeTab === "docs",
  });

  const { data: status } = useQuery({
    queryKey: ["chatbot-status"],
    queryFn: () => axios.get(`${BASE}/api/chatbot/status`).then(r => r.data),
    refetchInterval: 5000,
  });

  const addDoc = useMutation({
    mutationFn: (payload: { title: string; content: string; sourceType: string }) =>
      axios.post(`${BASE}/api/chatbot/docs`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatbot-docs"] });
      qc.invalidateQueries({ queryKey: ["chatbot-status"] });
      setDocForm({ title: "", content: "" });
      setAddMode(null);
      toast({ title: "문서가 추가되었습니다", description: "임베딩 생성 중... 잠시 후 검색에 반영됩니다." });
    },
    onError: () => toast({ variant: "destructive", title: "추가 실패" }),
  });

  const deleteDoc = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/chatbot/docs/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatbot-docs"] });
      qc.invalidateQueries({ queryKey: ["chatbot-status"] });
      toast({ title: "문서 삭제 완료" });
    },
    onError: () => toast({ variant: "destructive", title: "삭제 실패" }),
  });

  const importGoogleDoc = async () => {
    if (!googleUrl.trim()) return;
    setImportingGoogle(true);
    try {
      const token = localStorage.getItem("edubee_token");
      const res = await fetch(`${BASE}/api/chatbot/docs/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: googleUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Google Docs 가져오기 실패");
      qc.invalidateQueries({ queryKey: ["chatbot-docs"] });
      qc.invalidateQueries({ queryKey: ["chatbot-status"] });
      setGoogleUrl("");
      setAddMode(null);
      toast({ title: `"${data.title}" 문서를 가져왔습니다`, description: "임베딩 생성 중... 잠시 후 검색에 반영됩니다." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Google Docs 오류", description: e.message });
    } finally {
      setImportingGoogle(false);
    }
  };

  const SOURCE_BADGE: Record<string, { label: string; className: string }> = {
    manual:     { label: "수동 입력",    className: "bg-blue-50 text-blue-700" },
    google_doc: { label: "Google Docs", className: "bg-green-50 text-green-700" },
    file:       { label: "파일 업로드", className: "bg-purple-50 text-purple-700" },
  };

  const kbChunks = status?.totalChunks ?? 0;
  const kbDocs   = status?.documentCount ?? 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F5821F]/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-[#F5821F]" />
          </div>
          <div>
            <h1 className="font-semibold text-base text-foreground">AI 챗봇</h1>
            <p className="text-xs text-muted-foreground">
              Gemini 2.5 Flash · 문서 {kbDocs}개 · 청크 {kbChunks}개
            </p>
          </div>
        </div>
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {(["chat", "docs"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-white shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "chat" ? "채팅" : "지식 베이스"}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Chat Tab ─────────────────────────────────────────────── */}
      {activeTab === "chat" && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-[#F5821F]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-[#F5821F]" />
                  </div>
                )}
                <div className={`max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-[#F5821F] text-white rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                  }`}>
                    {msg.content || (
                      isStreaming && i === messages.length - 1 ? (
                        <span className="inline-flex gap-1 items-center h-4">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#F5821F] animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#F5821F] animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#F5821F] animate-bounce" style={{ animationDelay: "300ms" }} />
                        </span>
                      ) : null
                    )}
                  </div>

                  {/* Sources & RAG metadata */}
                  {msg.role === "assistant" && (msg.sources?.length || msg.chunksUsed) ? (
                    <div className="flex flex-wrap items-center gap-1.5 px-1">
                      {msg.chunksUsed != null && msg.chunksUsed > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-[#F5821F]/8 text-[#F5821F] px-2 py-0.5 rounded-full">
                          <Zap className="w-2.5 h-2.5" />
                          {msg.chunksUsed}개 청크 검색됨
                          {msg.topScore != null && ` · 관련도 ${(msg.topScore * 100).toFixed(0)}%`}
                        </span>
                      )}
                      {msg.sources && msg.sources.length > 0 && (
                        <>
                          <span className="text-[10px] text-muted-foreground">출처:</span>
                          {msg.sources.map((s, si) => (
                            <span key={si} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                              {s}
                            </span>
                          ))}
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
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
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isStreaming}
                className="bg-[#F5821F] hover:bg-[#d97706] text-white h-12 w-12 shrink-0 p-0"
              >
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-0.5">
              <p className="text-[10px] text-muted-foreground/60">
                지식 베이스 문서를 기반으로 코사인 유사도 검색 후 답변합니다
              </p>
              <button
                onClick={clearSession}
                className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                대화 초기화
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Docs Tab ─────────────────────────────────────────────── */}
      {activeTab === "docs" && (
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              총 <strong>{docs.length}</strong>개 문서 · <strong>{kbChunks}</strong>개 청크 임베딩됨
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => setAddMode(addMode === "google" ? null : "google")}
              >
                <Link2 className="w-3.5 h-3.5" /> Google Docs 추가
              </Button>
              <Button
                size="sm"
                className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5 text-xs"
                onClick={() => setAddMode(addMode === "manual" ? null : "manual")}
              >
                <Plus className="w-3.5 h-3.5" /> 문서 추가
              </Button>
            </div>
          </div>

          {/* Manual add form */}
          {addMode === "manual" && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">새 문서 추가</h3>
                <button onClick={() => setAddMode(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              <Input
                placeholder="문서 제목"
                value={docForm.title}
                onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))}
              />
              <Textarea
                placeholder="문서 내용을 붙여넣으세요 (FAQ, 정책 문서, 가이드 등)"
                value={docForm.content}
                onChange={e => setDocForm(f => ({ ...f, content: e.target.value }))}
                className="min-h-[160px] text-sm font-mono"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setAddMode(null)}>취소</Button>
                <Button
                  size="sm"
                  className="bg-[#F5821F] hover:bg-[#d97706] text-white"
                  disabled={!docForm.title || !docForm.content || addDoc.isPending}
                  onClick={() => addDoc.mutate({ title: docForm.title, content: docForm.content, sourceType: "manual" })}
                >
                  {addDoc.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "추가"}
                </Button>
              </div>
            </div>
          )}

          {/* Google Docs form */}
          {addMode === "google" && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Google Docs 가져오기</h3>
                <button onClick={() => setAddMode(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              <p className="text-xs text-muted-foreground">
                서비스 계정 이메일을 해당 문서에 뷰어로 공유한 뒤 URL을 입력하세요.
                <br />서버에 <code className="bg-muted px-1 rounded">GOOGLE_SERVICE_ACCOUNT_JSON</code> 시크릿이 필요합니다.
              </p>
              <Input
                placeholder="https://docs.google.com/document/d/.../edit"
                value={googleUrl}
                onChange={e => setGoogleUrl(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setAddMode(null)}>취소</Button>
                <Button
                  size="sm"
                  className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5"
                  disabled={!googleUrl.trim() || importingGoogle}
                  onClick={importGoogleDoc}
                >
                  {importingGoogle ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 가져오는 중...</> : "가져오기"}
                </Button>
              </div>
            </div>
          )}

          {/* Docs list */}
          {docsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#F5821F]" />
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#F5821F]/8 flex items-center justify-center">
                <FileText className="w-7 h-7 text-[#F5821F]/60" />
              </div>
              <p className="font-medium text-sm">등록된 문서가 없습니다</p>
              <p className="text-xs text-muted-foreground">
                FAQ, 정책 문서, 가이드 등을 추가하면<br />AI가 해당 내용을 바탕으로 답변합니다
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map(doc => {
                const badge = SOURCE_BADGE[doc.sourceType] ?? SOURCE_BADGE.manual;
                return (
                  <div key={doc.id} className="bg-card border border-border rounded-xl p-4 hover:border-[#F5821F]/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-foreground">{doc.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                        {doc.source && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{doc.source}</p>
                        )}
                        <p className="text-xs text-muted-foreground/80 mt-1.5 leading-relaxed line-clamp-2">{doc.preview}</p>
                        <p className="text-[10px] text-muted-foreground/50 mt-2">
                          {format(new Date(doc.createdAt), "yyyy.MM.dd HH:mm")}
                        </p>
                      </div>
                      <button
                        onClick={() => { if (confirm("이 문서를 삭제하시겠습니까?")) deleteDoc.mutate(doc.id); }}
                        className="shrink-0 text-muted-foreground/40 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
