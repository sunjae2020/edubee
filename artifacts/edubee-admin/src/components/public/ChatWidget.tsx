import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Loader2, Zap, RotateCcw, MessageCircle } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function genSessionId() {
  return `pub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

type Msg = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  chunksUsed?: number;
};

const QUICK_QUESTIONS = [
  "What are the camp eligibility requirements?",
  "What programs do you offer?",
  "What are the costs and scholarship options?",
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [sessionId] = useState(genSessionId);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: "Hello! 🐝 I'm the Edubee Camp AI assistant.\nFeel free to ask about programs, applications, costs, and more!",
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
      const resp = await fetch(`${BASE}/api/public/chatbot/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, sessionId }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error ?? "A server error occurred.");
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
          content: text || "Unable to retrieve a response.",
          sources: sources.length ? sources : undefined,
          chunksUsed: chunksUsed || undefined,
        };
        return u;
      });
    } catch (e: any) {
      setMessages(prev => {
        const u = [...prev];
        u[u.length - 1] = { role: "assistant", content: e.message ?? "An error occurred. Please try again shortly." };
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
      content: "Conversation reset. Feel free to ask a new question! 😊",
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
            className="fixed bottom-20 right-4 z-40 w-[360px] sm:w-[380px] flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-border bg-white"
            style={{ maxHeight: "calc(100vh - 120px)", height: 520 }}
          >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-(--e-orange)">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-white leading-tight">Edubee AI Assistant</p>
                  <p className="text-[10px] text-white/75 leading-tight">Gemini 2.5 · Knowledge base powered</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={reset}
                  title="Reset conversation"
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
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#FAFAFA]">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-(--e-orange)/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-(--e-orange)" />
                    </div>
                  )}
                  <div className={`max-w-[82%] flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-(--e-orange) text-white rounded-tr-sm"
                        : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm"
                    }`}>
                      {msg.content || (
                        streaming && i === messages.length - 1 ? (
                          <span className="inline-flex gap-1 items-center h-4">
                            {[0, 150, 300].map(d => (
                              <span key={d} className="w-1.5 h-1.5 rounded-full bg-(--e-orange) animate-bounce" style={{ animationDelay: `${d}ms` }} />
                            ))}
                          </span>
                        ) : null
                      )}
                    </div>
                    {/* RAG metadata */}
                    {msg.role === "assistant" && (msg.chunksUsed || msg.sources?.length) ? (
                      <div className="flex flex-wrap items-center gap-1 px-0.5">
                        {msg.chunksUsed ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] bg-(--e-orange)/8 text-(--e-orange) px-1.5 py-0.5 rounded-full">
                            <Zap className="w-2 h-2" />
                            {msg.chunksUsed} docs referenced
                          </span>
                        ) : null}
                        {msg.sources?.map((s, si) => (
                          <span key={si} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
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
                  <p className="text-[10px] text-gray-400 px-0.5">Frequently asked questions</p>
                  {QUICK_QUESTIONS.map(q => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      disabled={streaming}
                      className="w-full text-left text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 hover:border-(--e-orange)/40 hover:text-(--e-orange) transition-colors disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 px-3 py-3 border-t border-gray-100 bg-white">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-(--e-orange)/50 focus-within:ring-2 focus-within:ring-(--e-orange)/10 transition-all">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Type your question..."
                  disabled={streaming}
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none disabled:opacity-60"
                />
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim() || streaming}
                  className="w-7 h-7 rounded-lg bg-(--e-orange) flex items-center justify-center disabled:opacity-40 hover:bg-[#d97706] transition-colors shrink-0"
                >
                  {streaming
                    ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                    : <Send className="w-3.5 h-3.5 text-white" />
                  }
                </button>
              </div>
              <p className="text-[9px] text-gray-400 mt-1.5 text-center">
                Answers are based on registered documents · AI responses are for reference only
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
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 bg-(--e-orange) text-white shadow-lg hover:bg-[#d97706] transition-colors rounded-full"
        style={{ padding: open ? "10px 16px 10px 12px" : "12px 18px 12px 14px" }}
        title={open ? "Close chat" : "AI Consultation"}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-5 h-5" />
            </motion.span>
          ) : (
            <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageCircle className="w-5 h-5" />
            </motion.span>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {!open && (
            <motion.span
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-sm font-semibold overflow-hidden whitespace-nowrap"
            >
              AI Chat
            </motion.span>
          )}
        </AnimatePresence>
        {/* Unread dot when closed */}
        {!open && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
        )}
      </motion.button>
    </>
  );
}
