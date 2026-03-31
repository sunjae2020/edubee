import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Loader2, Zap, RotateCcw, MessageCircle, Lock } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function genSessionId() {
  return `adm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

type Msg = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  chunksUsed?: number;
};

const QUICK_QUESTIONS = [
  "How do I convert a lead to a quote?",
  "What are the contract workflow steps?",
  "How to manage accommodation services?",
];

export function AdminChatWidget() {
  const [open, setOpen] = useState(false);
  const [sessionId] = useState(genSessionId);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: "Hello! I'm your internal Edubee assistant.\nI can answer questions based on all registered knowledge base documents. How can I help?",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  const send = useCallback(async (question: string) => {
    const q = question.trim();
    if (!q || streaming) return;
    setInput("");

    setMessages(prev => [
      ...prev,
      { role: "user", content: q },
      { role: "assistant", content: "" },
    ]);
    setStreaming(true);

    try {
      const token = localStorage.getItem("edubee_token");
      const resp = await fetch(`${BASE}/api/chatbot/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: q, sessionId }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error ?? "Server error. Please try again.");
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let text = "";
      let sources: string[] = [];
      let chunksUsed = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              text += data.content;
              setMessages(prev => {
                const u = [...prev];
                u[u.length - 1] = { role: "assistant", content: text };
                return u;
              });
            }
            if (data.done) {
              sources    = data.sources ?? [];
              chunksUsed = data.chunksUsed ?? 0;
            }
            if (data.error) throw new Error(data.error);
          } catch {}
        }
      }

      setMessages(prev => {
        const u = [...prev];
        u[u.length - 1] = {
          role: "assistant",
          content: text || "Unable to retrieve response.",
          sources: sources.length ? sources : undefined,
          chunksUsed: chunksUsed || undefined,
        };
        return u;
      });
    } catch (e: any) {
      setMessages(prev => {
        const u = [...prev];
        u[u.length - 1] = { role: "assistant", content: e.message ?? "An error occurred. Please try again." };
        return u;
      });
    } finally {
      setStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [sessionId, streaming]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const reset = () => {
    setMessages([{
      role: "assistant",
      content: "Conversation cleared. Ask a new question!",
    }]);
  };

  return (
    <>
      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-20 right-4 z-50 w-[360px] sm:w-[380px] flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-border"
            style={{ maxHeight: "calc(100vh - 120px)", height: 520, background: "var(--e-bg-card)" }}
          >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3" style={{ background: "var(--e-orange)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm text-white leading-tight">Edubee AI Assistant</p>
                    <span className="flex items-center gap-0.5 text-[9px] bg-white/20 text-white/90 px-1.5 py-0.5 rounded-full font-medium">
                      <Lock className="w-2 h-2" /> Internal
                    </span>
                  </div>
                  <p className="text-[10px] text-white/75 leading-tight">Gemini 2.5 · All documents</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={reset}
                  title="Clear conversation"
                  className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-white/80" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ background: "var(--e-bg-sub)" }}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "var(--e-orange-lt)" }}>
                      <Bot className="w-3.5 h-3.5" style={{ color: "var(--e-orange)" }} />
                    </div>
                  )}
                  <div className={`max-w-[82%] flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user" ? "text-white rounded-tr-sm" : "rounded-tl-sm shadow-sm"
                      }`}
                      style={
                        msg.role === "user"
                          ? { background: "var(--e-orange)" }
                          : { background: "var(--e-bg-card)", border: "1px solid var(--e-border)", color: "var(--e-text-1)" }
                      }
                    >
                      {msg.content || (
                        streaming && i === messages.length - 1 ? (
                          <span className="inline-flex gap-1 items-center h-4">
                            {[0, 150, 300].map(d => (
                              <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--e-orange)", animationDelay: `${d}ms` }} />
                            ))}
                          </span>
                        ) : null
                      )}
                    </div>
                    {/* RAG metadata */}
                    {msg.role === "assistant" && (msg.chunksUsed || msg.sources?.length) ? (
                      <div className="flex flex-wrap items-center gap-1 px-0.5">
                        {msg.chunksUsed ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}>
                            <Zap className="w-2 h-2" />
                            {msg.chunksUsed} docs referenced
                          </span>
                        ) : null}
                        {msg.sources?.map((s, si) => (
                          <span key={si} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--e-bg-sub)", color: "var(--e-text-3)", border: "1px solid var(--e-border)" }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}

              {/* Quick questions — shown only at start */}
              {messages.length === 1 && (
                <div className="pt-1 space-y-1.5">
                  <p className="text-[10px] px-0.5" style={{ color: "var(--e-text-3)" }}>Quick questions</p>
                  {QUICK_QUESTIONS.map(q => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      disabled={streaming}
                      className="w-full text-left text-xs px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                      style={{
                        background: "var(--e-bg-card)",
                        border: "1px solid var(--e-border)",
                        color: "var(--e-text-2)",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--e-orange)"; e.currentTarget.style.color = "var(--e-orange)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--e-border)"; e.currentTarget.style.color = "var(--e-text-2)"; }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 px-3 py-3" style={{ borderTop: "1px solid var(--e-border)", background: "var(--e-bg-card)" }}>
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2 transition-all"
                style={{ background: "var(--e-bg-sub)", border: "1px solid var(--e-border)" }}
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask a question..."
                  disabled={streaming}
                  className="flex-1 bg-transparent text-sm outline-none disabled:opacity-60"
                  style={{ color: "var(--e-text-1)" }}
                />
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim() || streaming}
                  className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-40 transition-colors shrink-0"
                  style={{ background: "var(--e-orange)" }}
                >
                  {streaming
                    ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                    : <Send className="w-3.5 h-3.5 text-white" />
                  }
                </button>
              </div>
              <p className="text-[9px] mt-1.5 text-center" style={{ color: "var(--e-text-3)" }}>
                Answers based on registered KB documents · For reference only
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 text-white shadow-lg transition-colors rounded-full"
        style={{
          background: "var(--e-orange)",
          padding: open ? "10px 16px 10px 12px" : "10px 16px 10px 12px",
        }}
        title={open ? "Close chat" : "AI Assistant"}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-4 h-4" />
            </motion.span>
          ) : (
            <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageCircle className="w-4 h-4" />
            </motion.span>
          )}
        </AnimatePresence>
        <motion.span
          className="text-sm font-semibold whitespace-nowrap"
        >
          {open ? "Close" : "AI Assistant"}
        </motion.span>
        {/* Online indicator */}
        {!open && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
        )}
      </motion.button>
    </>
  );
}
