import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare, PlusCircle, Pin, X, Send, ChevronDown, ChevronUp,
  Megaphone, HelpCircle, Bell, Globe, Lock, Users,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────
interface Post {
  id: string;
  title: string;
  content: string;
  type: string;
  visibility: string;
  audience: string;
  authorRole: string;
  authorName: string;
  authorAccountId: string | null;
  isPinned: boolean;
  isResolved: boolean;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Comment {
  id: string;
  postId: string;
  content: string;
  authorRole: string;
  authorName: string;
  isAdminReply: boolean;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  notice:       { label: "Notice",       icon: Bell,      color: "#2563EB", bg: "#EFF6FF" },
  announcement: { label: "Announcement", icon: Megaphone, color: "#D97706", bg: "#FFFBEB" },
  question:     { label: "Q&A",          icon: HelpCircle, color: "#7C3AED", bg: "#F5F3FF" },
};

const VIS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  public:   { label: "Public",   icon: Globe,  color: "#16A34A" },
  internal: { label: "Internal", icon: Users,  color: "#D97706" },
  private:  { label: "Private",  icon: Lock,   color: "#DC2626" },
};

function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.notice;
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: cfg.bg, color: cfg.color }}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

function VisBadge({ vis }: { vis: string }) {
  const cfg = VIS_CONFIG[vis] ?? VIS_CONFIG.public;
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: "var(--e-bg-muted)", color: cfg.color }}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

function RoleAvatar({ role, name }: { role: string; name: string }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colors: Record<string, { bg: string; color: string }> = {
    admin:   { bg: "#FEE2E2", color: "#DC2626" },
    agent:   { bg: "var(--e-orange-lt)", color: "var(--e-orange)" },
    partner: { bg: "#EFF6FF", color: "#2563EB" },
    student: { bg: "#F5F3FF", color: "#7C3AED" },
  };
  const c = colors[role] ?? { bg: "var(--e-bg-muted)", color: "var(--e-text-2)" };
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
      style={{ background: c.bg, color: c.color }}>
      {initials}
    </div>
  );
}

// ── Create Post Modal ─────────────────────────────────────────────────────
function CreatePostModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle]       = useState("");
  const [content, setContent]   = useState("");
  const [type, setType]         = useState("question");
  const [vis, setVis]           = useState("public");
  const [error, setError]       = useState("");

  const isAgent   = !["student", "hotel", "pickup", "institute", "tour"].includes(user?.portalRole ?? "");
  const isStudent = user?.portalRole === "student";

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () => api.post("/portal/community", { title: title.trim(), content: content.trim(), type, visibility: vis }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["portal-community"] }); onClose(); },
    onError:   () => setError("Failed to post. Please try again."),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{ background: "var(--e-bg-surface)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #E8E6E2" }}>
          <h2 className="font-semibold text-base" style={{ color: "var(--e-text-1)" }}>New Post</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={16} style={{ color: "var(--e-text-3)" }} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--e-text-3)" }}>Title</label>
            <input
              className="w-full h-9 px-3 rounded-lg border text-sm outline-none"
              style={{ borderColor: "var(--e-border)", color: "var(--e-text-1)" }}
              placeholder="What's this about?"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--e-text-3)" }}>Message</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
              style={{ borderColor: "var(--e-border)", color: "var(--e-text-1)" }}
              rows={5}
              placeholder="Write your question or message..."
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            {isAgent && (
              <>
                <div className="flex-1 min-w-28">
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--e-text-3)" }}>Type</label>
                  <select
                    className="w-full h-9 px-3 rounded-lg border text-sm outline-none"
                    style={{ borderColor: "var(--e-border)", color: "var(--e-text-2)" }}
                    value={type}
                    onChange={e => setType(e.target.value)}
                  >
                    <option value="question">Q&A</option>
                    <option value="notice">Notice</option>
                  </select>
                </div>
                <div className="flex-1 min-w-28">
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--e-text-3)" }}>Visibility</label>
                  <select
                    className="w-full h-9 px-3 rounded-lg border text-sm outline-none"
                    style={{ borderColor: "var(--e-border)", color: "var(--e-text-2)" }}
                    value={vis}
                    onChange={e => setVis(e.target.value)}
                  >
                    <option value="public">Public</option>
                    <option value="internal">Internal</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="px-5 py-4 flex justify-end gap-2" style={{ borderTop: "1px solid #E8E6E2" }}>
          <button onClick={onClose}
            className="h-8 px-4 rounded-lg text-sm font-medium"
            style={{ background: "var(--e-bg-muted)", color: "var(--e-text-2)" }}>
            Cancel
          </button>
          <button
            onClick={() => {
              if (!title.trim()) { setError("Please enter a title."); return; }
              if (!content.trim()) { setError("Please enter a message."); return; }
              setError("");
              submit();
            }}
            disabled={isPending}
            className="h-8 px-4 rounded-lg text-sm font-medium text-white"
            style={{ background: "var(--e-orange)", opacity: isPending ? 0.7 : 1 }}
          >
            {isPending ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Post Card ─────────────────────────────────────────────────────────────
function PostCard({ post, isOwn }: { post: Post; isOwn: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState("");
  const qc = useQueryClient();

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ["portal-community-post", post.id],
    queryFn:  () => api.get<{ data: Post; comments: Comment[] }>(`/portal/community/${post.id}`),
    enabled:  expanded,
  });

  const { mutate: sendComment, isPending } = useMutation({
    mutationFn: () => api.post(`/portal/community/${post.id}/comments`, { content: commentText }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-community-post", post.id] });
      qc.invalidateQueries({ queryKey: ["portal-community"] });
      setCommentText("");
    },
  });

  const { mutate: deletePost } = useMutation({
    mutationFn: () => api.del(`/portal/community/${post.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal-community"] }),
  });

  const cfg = TYPE_CONFIG[post.type] ?? TYPE_CONFIG.notice;

  return (
    <div className="rounded-xl border overflow-hidden transition-all"
      style={{
        background:   "var(--e-bg-surface)",
        borderColor:  post.isPinned ? "var(--e-orange)" : "var(--e-border)",
        boxShadow:    "0 1px 3px rgba(0,0,0,0.04)",
        borderWidth:  post.isPinned ? 2 : 1,
      }}>
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <RoleAvatar role={post.authorRole} name={post.authorName} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                {post.isPinned && (
                  <Pin size={11} style={{ color: "var(--e-orange)" }} className="shrink-0" />
                )}
                <p className="font-semibold text-sm" style={{ color: "var(--e-text-1)" }}>{post.title}</p>
                {post.isResolved && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                    style={{ background: "#F0FDF4", color: "#16A34A" }}>Resolved</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs" style={{ color: "var(--e-text-3)" }}>
                  {post.authorRole === "admin" ? "Admin" : post.authorName}
                </span>
                <span className="text-xs" style={{ color: "#D1CFC8" }}>·</span>
                <span className="text-xs" style={{ color: "var(--e-text-3)" }}>
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <TypeBadge type={post.type} />
            <VisBadge vis={post.visibility} />
          </div>
        </div>

        {/* Preview content */}
        <p className="text-sm leading-relaxed" style={{ color: "var(--e-text-2)", whiteSpace: "pre-wrap" }}>
          {expanded ? "" : post.content.slice(0, 200)}
          {!expanded && post.content.length > 200 ? "..." : ""}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: "var(--e-orange)" }}
          >
            {expanded ? <><ChevronUp size={13} /> Collapse</> : <><ChevronDown size={13} /> Read more</>}
          </button>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs" style={{ color: "var(--e-text-3)" }}>
              <MessageSquare size={12} /> {post.commentCount}
            </span>
            {isOwn && (
              <button
                onClick={() => {
                  if (confirm("Delete this post?")) deletePost();
                }}
                className="text-xs"
                style={{ color: "#DC2626" }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded content + comments */}
      {expanded && (
        <div style={{ borderTop: "1px solid #F4F3F1" }}>
          <div className="px-5 py-4">
            <p className="text-sm leading-relaxed" style={{ color: "var(--e-text-2)", whiteSpace: "pre-wrap" }}>
              {post.content}
            </p>
          </div>

          {/* Comments */}
          <div className="px-5 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--e-text-3)" }}>
              Replies ({detail?.comments?.length ?? 0})
            </p>

            {loadingDetail ? (
              <div className="space-y-3">
                {[1, 2].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {(detail?.comments ?? []).map(c => (
                  <div key={c.id} className="flex gap-3">
                    <RoleAvatar role={c.authorRole} name={c.authorName} />
                    <div className="flex-1 rounded-xl px-4 py-3" style={{
                      background: c.isAdminReply ? "var(--e-orange-lt)" : "var(--e-bg-page)",
                      border: c.isAdminReply ? "1px solid #FDE0C5" : "1px solid #F4F3F1",
                    }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold" style={{ color: c.isAdminReply ? "var(--e-orange)" : "var(--e-text-1)" }}>
                          {c.isAdminReply ? "Admin" : c.authorName}
                        </span>
                        <span className="text-xs" style={{ color: "var(--e-text-3)" }}>
                          {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: "var(--e-text-2)", whiteSpace: "pre-wrap" }}>{c.content}</p>
                    </div>
                  </div>
                ))}

                {/* Comment input */}
                <div className="flex gap-2 mt-2">
                  <input
                    className="flex-1 h-9 px-3 rounded-lg border text-sm outline-none"
                    style={{ borderColor: "var(--e-border)", color: "var(--e-text-1)" }}
                    placeholder="Write a reply..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey && commentText.trim()) {
                        e.preventDefault();
                        sendComment();
                      }
                    }}
                  />
                  <button
                    onClick={() => { if (commentText.trim()) sendComment(); }}
                    disabled={isPending || !commentText.trim()}
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: "var(--e-orange)", opacity: isPending || !commentText.trim() ? 0.5 : 1 }}
                  >
                    <Send size={14} style={{ color: "var(--e-bg-surface)" }} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function CommunityPage() {
  const { user } = useAuth();
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  const { data: posts = [], isLoading, error } = useQuery({
    queryKey: ["portal-community", typeFilter],
    queryFn:  () =>
      api.get<{ data: Post[] }>(`/portal/community?type=${typeFilter}`).then(r => r.data),
  });

  const pinned  = posts.filter(p => p.isPinned);
  const regular = posts.filter(p => !p.isPinned);

  const canPost = true; // all portal users can post

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {["all", "announcement", "notice", "question"].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className="h-8 px-3 rounded-lg text-xs font-medium capitalize transition-all"
              style={{
                background: typeFilter === t ? "var(--e-orange-lt)" : "var(--e-bg-muted)",
                color:      typeFilter === t ? "var(--e-orange)"  : "var(--e-text-2)",
                fontWeight: typeFilter === t ? 600 : 400,
              }}
            >
              {t === "all" ? "All Posts" : TYPE_CONFIG[t]?.label ?? t}
            </button>
          ))}
        </div>
        {canPost && (
          <button
            onClick={() => setShowCreate(true)}
            className="h-8 px-3 rounded-lg text-xs font-medium text-white flex items-center gap-1.5"
            style={{ background: "var(--e-orange)" }}
          >
            <PlusCircle size={13} />
            New Post
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load community posts. Please try again.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5 border" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
              <div className="flex gap-3 mb-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1"><Skeleton className="h-4 w-48 mb-1" /><Skeleton className="h-3 w-32" /></div>
              </div>
              <Skeleton className="h-3 w-full mb-1" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 rounded-xl border" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
          <MessageSquare className="w-10 h-10 mx-auto mb-3" style={{ color: "#D1CFC8" }} />
          <p className="text-sm font-medium" style={{ color: "var(--e-text-1)" }}>No posts yet</p>
          <p className="text-xs mt-1" style={{ color: "var(--e-text-3)" }}>Be the first to post a question or share information.</p>
        </div>
      ) : (
        <>
          {pinned.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5"
                style={{ color: "var(--e-orange)" }}>
                <Pin size={11} /> Pinned
              </p>
              {pinned.map(p => (
                <PostCard
                  key={p.id}
                  post={p}
                  isOwn={p.authorAccountId === user?.accountId}
                />
              ))}
            </div>
          )}
          {regular.length > 0 && (
            <div className="space-y-3">
              {pinned.length > 0 && (
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--e-text-3)" }}>
                  Recent
                </p>
              )}
              {regular.map(p => (
                <PostCard
                  key={p.id}
                  post={p}
                  isOwn={p.authorAccountId === user?.accountId}
                />
              ))}
            </div>
          )}
        </>
      )}

      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
