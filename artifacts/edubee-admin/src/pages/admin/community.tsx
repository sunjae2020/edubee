import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { format, formatDistanceToNow } from "date-fns";
import {
  Pin, PlusCircle, Megaphone, Bell, HelpCircle, Globe, Lock, Users,
  CheckCircle, Pencil, Trash2, MessageSquare, X, Send, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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

const VIS_OPTIONS = [
  { value: "public",   label: "Public",   icon: Globe,  color: "#16A34A" },
  { value: "internal", label: "Internal", icon: Users,  color: "#D97706" },
  { value: "private",  label: "Private",  icon: Lock,   color: "#DC2626" },
];

const AUD_OPTIONS = [
  { value: "all",      label: "Everyone"  },
  { value: "agents",   label: "Agents only" },
  { value: "partners", label: "Partners only" },
  { value: "students", label: "Students only" },
];

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
  const cfg = VIS_OPTIONS.find(v => v.value === vis) ?? VIS_OPTIONS[0];
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: "#F4F3F1", color: cfg.color }}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

// ── Create / Edit Modal ───────────────────────────────────────────────────
function PostModal({ post, onClose }: { post?: Post; onClose: () => void }) {
  const qc = useQueryClient();
  const [title,      setTitle]    = useState(post?.title ?? "");
  const [content,    setContent]  = useState(post?.content ?? "");
  const [type,       setType]     = useState(post?.type ?? "notice");
  const [vis,        setVis]      = useState(post?.visibility ?? "public");
  const [audience,   setAudience] = useState(post?.audience ?? "all");
  const [isPinned,   setIsPinned] = useState(post?.isPinned ?? false);
  const [error,      setError]    = useState("");

  const isEdit = !!post;

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      isEdit
        ? axios.put(`${BASE}/api/community/${post!.id}`, { title, content, type, visibility: vis, audience, isPinned }).then(r => r.data)
        : axios.post(`${BASE}/api/community`, { title, content, type, visibility: vis, audience, isPinned }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-community"] }); onClose(); },
    onError:   () => setError("Failed to save. Please try again."),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Post" : "New Post"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Title</label>
            <input
              className="w-full h-9 px-3 rounded-md border text-sm outline-none focus:ring-2 focus:ring-orange-200"
              style={{ borderColor: "#E8E6E2" }}
              placeholder="Post title..."
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Content</label>
            <textarea
              className="w-full px-3 py-2 rounded-md border text-sm outline-none resize-none focus:ring-2 focus:ring-orange-200"
              style={{ borderColor: "#E8E6E2" }}
              rows={6}
              placeholder="Write your post content..."
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="notice">Notice</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="question">Q&A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Visibility</label>
              <Select value={vis} onValueChange={setVis}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VIS_OPTIONS.map(v => (
                    <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Audience</label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUD_OPTIONS.map(a => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer select-none h-9">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-orange-500"
                  checked={isPinned}
                  onChange={e => setIsPinned(e.target.checked)}
                />
                <span className="text-sm">Pin to top</span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button
            onClick={() => {
              if (!title.trim()) { setError("Please enter a title."); return; }
              if (!content.trim()) { setError("Please enter content."); return; }
              setError("");
              mutate();
            }}
            disabled={isPending}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isPending ? "Saving..." : isEdit ? "Save Changes" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Post Row ──────────────────────────────────────────────────────────────
function PostRow({ post }: { post: Post }) {
  const qc = useQueryClient();
  const [expanded,    setExpanded]    = useState(false);
  const [editing,     setEditing]     = useState(false);
  const [commentText, setCommentText] = useState("");

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ["admin-community-post", post.id],
    queryFn:  () => axios.get(`${BASE}/api/community/${post.id}`).then(r => r.data),
    enabled:  expanded,
  });

  const { mutate: deletePost } = useMutation({
    mutationFn: () => axios.delete(`${BASE}/api/community/${post.id}`).then(r => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["admin-community"] }),
  });

  const { mutate: togglePin } = useMutation({
    mutationFn: () => axios.put(`${BASE}/api/community/${post.id}`, { isPinned: !post.isPinned }).then(r => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["admin-community"] }),
  });

  const { mutate: toggleResolved } = useMutation({
    mutationFn: () => axios.put(`${BASE}/api/community/${post.id}`, { isResolved: !post.isResolved }).then(r => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["admin-community"] }),
  });

  const { mutate: sendReply, isPending: sendingReply } = useMutation({
    mutationFn: () => axios.post(`${BASE}/api/community/${post.id}/comments`, { content: commentText }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-community-post", post.id] });
      qc.invalidateQueries({ queryKey: ["admin-community"] });
      setCommentText("");
    },
  });

  const { mutate: deleteComment } = useMutation({
    mutationFn: (cid: string) => axios.delete(`${BASE}/api/community/comments/${cid}`).then(r => r.data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["admin-community-post", post.id] });
      qc.invalidateQueries({ queryKey: ["admin-community"] });
    },
  });

  return (
    <>
      <tr className="hover:bg-muted/30 transition-colors">
        <td className="px-4 py-3.5">
          <div className="flex items-start gap-2">
            {post.isPinned && <Pin size={11} className="text-orange-500 mt-0.5 shrink-0" />}
            <div>
              <p className="font-medium text-sm text-foreground">{post.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{post.content}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3.5"><TypeBadge type={post.type} /></td>
        <td className="px-4 py-3.5"><VisBadge vis={post.visibility} /></td>
        <td className="px-4 py-3.5">
          <span className="text-xs capitalize text-muted-foreground">{post.audience}</span>
        </td>
        <td className="px-4 py-3.5">
          <p className="text-xs font-medium text-foreground capitalize">{post.authorRole}</p>
          <p className="text-xs text-muted-foreground">{post.authorName}</p>
        </td>
        <td className="px-4 py-3.5">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare size={11} /> {post.commentCount}
          </span>
        </td>
        <td className="px-4 py-3.5 text-xs text-muted-foreground">
          {format(new Date(post.createdAt), "dd MMM yy")}
        </td>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
              title="View / Reply"
            >
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            <button
              onClick={() => togglePin()}
              className={`p-1.5 rounded-md hover:bg-muted ${post.isPinned ? "text-orange-500" : "text-muted-foreground"}`}
              title={post.isPinned ? "Unpin" : "Pin"}
            >
              <Pin size={13} />
            </button>
            {post.type === "question" && (
              <button
                onClick={() => toggleResolved()}
                className={`p-1.5 rounded-md hover:bg-muted ${post.isResolved ? "text-emerald-600" : "text-muted-foreground"}`}
                title={post.isResolved ? "Mark unresolved" : "Mark resolved"}
              >
                <CheckCircle size={13} />
              </button>
            )}
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
              title="Edit"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => { if (confirm("Delete this post?")) deletePost(); }}
              className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600"
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded thread view */}
      {expanded && (
        <tr>
          <td colSpan={8} className="px-4 pb-4 bg-muted/10">
            <div className="rounded-xl border p-4 space-y-3" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
              {/* Original content */}
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{post.content}</p>

              {/* Comments */}
              {loadingDetail ? (
                <div className="space-y-2">
                  {[1, 2].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <div className="space-y-2">
                  {(detail?.comments ?? []).map((c: Comment) => (
                    <div key={c.id} className="flex gap-2 group">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{
                          background: c.isAdminReply ? "#FEF0E3" : "#F4F3F1",
                          color:      c.isAdminReply ? "#F5821F" : "#57534E",
                        }}
                      >
                        {c.authorName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 rounded-lg px-3 py-2" style={{
                        background: c.isAdminReply ? "#FEF0E3" : "#FAFAF9",
                        border: `1px solid ${c.isAdminReply ? "#FDE0C5" : "#F4F3F1"}`,
                      }}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-semibold"
                            style={{ color: c.isAdminReply ? "#F5821F" : "#1C1917" }}>
                            {c.isAdminReply ? "Admin" : c.authorName}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                            </span>
                            <button
                              onClick={() => deleteComment(c.id)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-600 text-muted-foreground transition-opacity"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                      </div>
                    </div>
                  ))}

                  {/* Admin reply input */}
                  <div className="flex gap-2 pt-1">
                    <input
                      className="flex-1 h-9 px-3 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-orange-200"
                      style={{ borderColor: "#E8E6E2" }}
                      placeholder="Reply as Admin..."
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey && commentText.trim()) {
                          e.preventDefault();
                          sendReply();
                        }
                      }}
                    />
                    <button
                      onClick={() => { if (commentText.trim()) sendReply(); }}
                      disabled={sendingReply || !commentText.trim()}
                      className="w-9 h-9 rounded-lg flex items-center justify-center bg-orange-500 disabled:opacity-50"
                    >
                      <Send size={13} className="text-white" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}

      {editing && <PostModal post={post} onClose={() => setEditing(false)} />}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function AdminCommunityPage() {
  const [showCreate,   setShowCreate]   = useState(false);
  const [typeFilter,   setTypeFilter]   = useState("all");
  const [visFilter,    setVisFilter]    = useState("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-community", typeFilter, visFilter],
    queryFn:  () =>
      axios.get(`${BASE}/api/community?type=${typeFilter}&visibility=${visFilter}`).then(r => r.data.data),
  });

  const posts = data ?? [];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Community</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage posts, announcements and Q&A
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white h-9"
        >
          <PlusCircle size={14} className="mr-1.5" />
          New Post
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="notice">Notice</SelectItem>
            <SelectItem value="announcement">Announcement</SelectItem>
            <SelectItem value="question">Q&A</SelectItem>
          </SelectContent>
        </Select>
        <Select value={visFilter} onValueChange={setVisFilter}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Visibility</SelectItem>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="internal">Internal</SelectItem>
            <SelectItem value="private">Private</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">
          {posts.length} post{posts.length !== 1 ? "s" : ""}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load community data. Please refresh.
        </div>
      )}

      <div className="rounded-xl border overflow-hidden bg-white">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No posts yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create the first post to share with your community.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {["Post", "Type", "Visibility", "Audience", "Author", "Replies", "Date", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {posts.map(p => <PostRow key={p.id} post={p} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && <PostModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
