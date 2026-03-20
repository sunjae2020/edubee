/**
 * Edubee Camp — AI Chatbot Admin Page
 * Route: /admin/chatbot
 * 
 * Features:
 * - Knowledge Base management (Google Docs + file upload)
 * - Live chat test interface
 * - Sync status monitoring
 */

import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = import.meta.env.VITE_CHATBOT_API_URL || "http://localhost:3001";

// ─── Types ──────────────────────────────────────────────────────────────
/**
 * @typedef {{ id: string, title: string, source: string, sourceUrl: string, chunkCount: number, lastUpdated: string }} KBDocument
 * @typedef {{ role: 'user'|'bot', content: string, sources?: string[], loading?: boolean }} ChatMessage
 */

// ─── Main Page ──────────────────────────────────────────────────────────
export default function ChatbotAdminPage() {
  const [activeTab, setActiveTab] = useState("knowledge");

  return (
    <div className="p-8 max-w-screen-xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#E8E6E2]">
        <div>
          <h1 className="text-2xl font-semibold text-[#1C1917]">AI 챗봇 관리</h1>
          <p className="text-sm text-[#57534E] mt-1">
            지식 베이스 관리 및 Gemini 2.5 Flash 챗봇 설정
          </p>
        </div>
        <StatusBadge />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#E8E6E2]">
        {[
          { id: "knowledge", label: "📚 지식 베이스" },
          { id: "chat", label: "💬 챗봇 테스트" },
          { id: "settings", label: "⚙️ 설정" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-[#F5821F] text-[#F5821F]"
                : "border-transparent text-[#57534E] hover:text-[#1C1917]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === "knowledge" && <KnowledgeBasePanel />}
      {activeTab === "chat" && <ChatTestPanel />}
      {activeTab === "settings" && <SettingsPanel />}
    </div>
  );
}

// ─── Status Badge ────────────────────────────────────────────────────────
function StatusBadge() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    axios.get(`${API}/api/docs/status`).then((r) => setStatus(r.data)).catch(() => {});
    const interval = setInterval(() => {
      axios.get(`${API}/api/docs/status`).then((r) => setStatus(r.data)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
          status.ready
            ? "bg-[#DCFCE7] text-[#16A34A]"
            : "bg-[#FEF9C3] text-[#CA8A04]"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            status.ready ? "bg-[#16A34A]" : "bg-[#CA8A04]"
          }`}
        />
        {status.ready ? "챗봇 활성" : "문서 없음"}
      </div>
      <span className="text-xs text-[#A8A29E]">
        문서 {status.documentCount}개 · 청크 {status.totalChunks}개
      </span>
    </div>
  );
}

// ─── Knowledge Base Panel ────────────────────────────────────────────────
function KnowledgeBasePanel() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState("google"); // 'google' | 'file'

  const loadDocuments = async () => {
    try {
      const { data } = await axios.get(`${API}/api/docs/list`);
      setDocuments(data.documents || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadDocuments(); }, []);

  const syncAll = async () => {
    setSyncing(true);
    try {
      await axios.post(`${API}/api/docs/sync-all`);
      await loadDocuments();
    } finally {
      setSyncing(false);
    }
  };

  const removeDoc = async (docId) => {
    if (!confirm("이 문서를 지식 베이스에서 제거하시겠습니까?")) return;
    await axios.delete(`${API}/api/docs/${docId}`);
    await loadDocuments();
  };

  return (
    <div>
      {/* Action bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-2">
          <button
            onClick={() => { setAddType("google"); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#F5821F] text-white rounded-lg text-sm font-medium hover:bg-[#D96A0A] transition-colors"
          >
            + Google Docs 추가
          </button>
          <button
            onClick={() => { setAddType("file"); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E8E6E2] text-[#1C1917] rounded-lg text-sm hover:bg-[#FAFAF9] transition-colors"
          >
            파일 업로드
          </button>
        </div>
        <button
          onClick={syncAll}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E8E6E2] text-[#57534E] rounded-lg text-sm hover:bg-[#FAFAF9] transition-colors disabled:opacity-50"
        >
          {syncing ? "동기화 중..." : "🔄 전체 재동기화"}
        </button>
      </div>

      {/* How to share Google Doc */}
      <div className="bg-[#E6F1FB] border border-[#B5D4F4] rounded-xl p-4 mb-5">
        <p className="text-sm font-medium text-[#185FA5] mb-1">📋 Google Docs 공유 설정 방법</p>
        <p className="text-xs text-[#185FA5] leading-relaxed">
          1. Google Docs에서 <strong>공유 → 링크가 있는 모든 사용자</strong> 또는 서비스 계정 이메일 추가 →
          2. 문서 URL을 아래 입력창에 붙여넣기 →
          3. 문서가 업데이트되면 <strong>전체 재동기화</strong> 클릭
        </p>
      </div>

      {/* Documents table */}
      {documents.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#E8E6E2] rounded-xl">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-[#57534E] font-medium">등록된 문서가 없습니다</p>
          <p className="text-sm text-[#A8A29E] mt-1">
            Google Docs URL을 입력하거나 파일을 업로드하세요
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#FAFAF9] border-b border-[#E8E6E2]">
                <th className="text-left text-xs font-medium uppercase tracking-wide text-[#57534E] px-4 py-3">문서명</th>
                <th className="text-left text-xs font-medium uppercase tracking-wide text-[#57534E] px-4 py-3">소스</th>
                <th className="text-left text-xs font-medium uppercase tracking-wide text-[#57534E] px-4 py-3">청크 수</th>
                <th className="text-left text-xs font-medium uppercase tracking-wide text-[#57534E] px-4 py-3">업데이트</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-[#F4F3F1] hover:bg-[#FAFAF9]">
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm text-[#1C1917]">{doc.title}</div>
                    {doc.sourceUrl && (
                      <a
                        href={doc.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#F5821F] hover:underline truncate block max-w-xs"
                      >
                        {doc.sourceUrl}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        doc.source === "google_docs"
                          ? "bg-[#E6F1FB] text-[#185FA5]"
                          : "bg-[#F4F3F1] text-[#57534E]"
                      }`}
                    >
                      {doc.source === "google_docs" ? "Google Docs" : "파일 업로드"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#57534E]">{doc.chunkCount}개</td>
                  <td className="px-4 py-3 text-xs text-[#A8A29E]">
                    {new Date(doc.lastUpdated).toLocaleString("ko-KR")}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => removeDoc(doc.id)}
                      className="text-xs text-[#DC2626] hover:underline"
                    >
                      제거
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Document Modal */}
      {showAddModal && (
        <AddDocumentModal
          type={addType}
          onClose={() => setShowAddModal(false)}
          onAdded={() => { setShowAddModal(false); loadDocuments(); }}
        />
      )}
    </div>
  );
}

// ─── Add Document Modal ──────────────────────────────────────────────────
function AddDocumentModal({ type, onClose, onAdded }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      if (type === "google") {
        await axios.post(`${API}/api/docs/google`, { url, title });
      } else {
        const formData = new FormData();
        formData.append("file", file);
        if (title) formData.append("title", title);
        await axios.post(`${API}/api/docs/upload`, formData);
      }
      onAdded();
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[#1C1917]">
            {type === "google" ? "Google Docs 추가" : "파일 업로드"}
          </h2>
          <button onClick={onClose} className="text-[#A8A29E] hover:text-[#1C1917]">✕</button>
        </div>

        <div className="space-y-4">
          {type === "google" ? (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-[#57534E] mb-1.5">
                Google Docs URL *
              </label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://docs.google.com/document/d/..."
                className="w-full h-10 px-3 border border-[#E8E6E2] rounded-lg text-sm focus:outline-none focus:border-[#F5821F] focus:ring-2 focus:ring-[#F5821F]/15"
              />
              <p className="text-xs text-[#A8A29E] mt-1">
                문서를 서비스 계정과 공유했는지 확인하세요
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-[#57534E] mb-1.5">
                파일 선택 (.txt, .md) *
              </label>
              <input
                type="file"
                accept=".txt,.md"
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full text-sm text-[#57534E] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#FEF0E3] file:text-[#F5821F] hover:file:bg-[#F5821F]/20"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-[#57534E] mb-1.5">
              문서 이름 (선택)
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 워크플로우 가이드"
              className="w-full h-10 px-3 border border-[#E8E6E2] rounded-lg text-sm focus:outline-none focus:border-[#F5821F] focus:ring-2 focus:ring-[#F5821F]/15"
            />
          </div>

          {error && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3 py-2.5 text-sm text-[#DC2626]">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 h-10 border border-[#E8E6E2] rounded-lg text-sm text-[#57534E] hover:bg-[#FAFAF9]"
          >
            취소
          </button>
          <button
            onClick={submit}
            disabled={loading || (type === "google" ? !url : !file)}
            className="flex-1 h-10 bg-[#F5821F] text-white rounded-lg text-sm font-medium hover:bg-[#D96A0A] disabled:opacity-50 transition-colors"
          >
            {loading ? "처리 중..." : "추가"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Chat Test Panel ─────────────────────────────────────────────────────
function ChatTestPanel() {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      content: "안녕하세요! Edubee Camp 전용 도우미입니다. 등록된 문서를 기반으로만 답변드립니다.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId] = useState(`test-${Date.now()}`);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || sending) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setSending(true);
    setMessages((prev) => [...prev, { role: "bot", content: "", loading: true }]);

    try {
      const { data } = await axios.post(`${API}/api/chat/message`, {
        sessionId,
        message: msg,
      });

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "bot",
          content: data.reply,
          sources: data.sources,
          chunksUsed: data.chunksUsed,
        };
        return updated;
      });
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "bot",
          content: "오류가 발생했습니다. 서버 상태를 확인해 주세요.",
        };
        return updated;
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-hidden">
        {/* Messages */}
        <div className="h-96 overflow-y-auto p-4 flex flex-col gap-3 bg-[#FAFAF9]">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#F5821F] text-white rounded-br-sm"
                    : "bg-white border border-[#E8E6E2] text-[#1C1917] rounded-bl-sm"
                }`}
              >
                {msg.loading ? (
                  <span className="text-[#A8A29E] animate-pulse">응답 생성 중...</span>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.sources?.length > 0 && (
                      <p className="text-xs mt-2 opacity-60">
                        출처: {msg.sources.join(", ")}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-[#E8E6E2] flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="질문을 입력하세요..."
            className="flex-1 h-10 px-3 border border-[#E8E6E2] rounded-lg text-sm focus:outline-none focus:border-[#F5821F] focus:ring-2 focus:ring-[#F5821F]/15"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="px-4 h-10 bg-[#F5821F] text-white rounded-lg text-sm font-medium hover:bg-[#D96A0A] disabled:opacity-50 transition-colors"
          >
            전송
          </button>
        </div>
      </div>

      {/* Preset test questions */}
      <div className="mt-4">
        <p className="text-xs text-[#A8A29E] mb-2">빠른 테스트 질문:</p>
        <div className="flex flex-wrap gap-2">
          {[
            "에이전트의 역할이 뭔가요?",
            "패키지 그룹이란?",
            "계약 프로세스를 설명해주세요",
            "오늘 날씨 어때요?",
            "담당자 연결해줘",
          ].map((q) => (
            <button
              key={q}
              onClick={() => { setInput(q); }}
              className="text-xs px-3 py-1.5 bg-white border border-[#E8E6E2] rounded-full text-[#57534E] hover:border-[#F5821F] hover:text-[#F5821F] transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Settings Panel ──────────────────────────────────────────────────────
function SettingsPanel() {
  return (
    <div className="max-w-xl space-y-4">
      <div className="bg-white border border-[#E8E6E2] rounded-xl p-5">
        <h3 className="font-semibold text-[#1C1917] mb-3">API 설정</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-[#F4F3F1]">
            <span className="text-[#57534E]">AI 모델</span>
            <span className="font-medium text-[#1C1917]">Gemini 2.5 Flash</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[#F4F3F1]">
            <span className="text-[#57534E]">임베딩 모델</span>
            <span className="font-medium text-[#1C1917]">text-embedding-004 (무료)</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[#F4F3F1]">
            <span className="text-[#57534E]">벡터 검색</span>
            <span className="font-medium text-[#1C1917]">FAISS 인메모리</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-[#57534E]">컨텍스트 캐싱</span>
            <span className="px-2 py-0.5 text-xs rounded-full bg-[#DCFCE7] text-[#16A34A] font-medium">활성</span>
          </div>
        </div>
      </div>

      <div className="bg-[#FEF0E3] border border-[#F5821F]/30 rounded-xl p-5">
        <h3 className="font-semibold text-[#D96A0A] mb-2">Replit Secrets 설정 필요</h3>
        <div className="space-y-1.5 text-xs text-[#92400E] font-mono">
          <p>GEMINI_API_KEY=AIza...</p>
          <p>GOOGLE_SERVICE_ACCOUNT_JSON={"{...}"}</p>
        </div>
        <p className="text-xs text-[#92400E] mt-2">
          Replit → Secrets 탭에서 위 두 값을 설정하세요
        </p>
      </div>
    </div>
  );
}
