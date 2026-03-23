import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import axios from "axios";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Ticket, List, LayoutGrid, Plus, Search, Send, Lock, Globe,
  User, Mail, Phone, LinkIcon, Star, Clock, CheckCircle2, XCircle,
  AlertCircle, Loader2,
} from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type TaskRec = {
  id: string; taskNumber: string; taskType: string; category: string;
  source: string; submittedBy: string | null; submittedName: string | null;
  submittedEmail: string | null; submittedPhone: string | null;
  assignedTo: string | null; assignedToName: string | null; assignedTeam: string | null;
  contractId: string | null; applicationId: string | null; relatedServiceType: string | null;
  title: string | null; description: string | null; priority: string; status: string;
  visibility: string; dueDate: string | null; firstResponseAt: string | null;
  resolvedAt: string | null; slaBreached: boolean; satisfactionRating: number | null;
  satisfactionComment: string | null; createdAt: string; updatedAt: string;
};
type Comment = { id: string; authorId: string | null; authorName: string | null; content: string; isInternal: boolean; createdAt: string };
type TaskDetail = TaskRec & { comments: Comment[]; attachments: unknown[] };

const STATUSES = ["open", "in_progress", "pending_response", "resolved", "closed"] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
const CATEGORIES = ["complaint", "inquiry", "request", "document", "payment", "service", "other"] as const;
const TASK_TYPES = ["internal", "partner_work", "cs_request"] as const;

const STATUS_LABELS: Record<string, string> = {
  open: "Open", in_progress: "In Progress", pending_response: "Pending Response", resolved: "Resolved", closed: "Closed",
};
const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-orange-100 text-[#F5821F]",
  pending_response: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-[#E7E5E4] text-[#78716C]",
};
const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-[#E7E5E4] text-[#57534E]",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-[#F5821F]",
  urgent: "bg-red-100 text-red-700",
};
const TYPE_COLORS: Record<string, string> = {
  internal: "bg-[#E7E5E4] text-[#57534E]",
  partner_work: "bg-purple-100 text-purple-700",
  cs_request: "bg-[#F5821F]/10 text-[#F5821F]",
};

function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[status] ?? "bg-muted text-muted-foreground"}`}>{STATUS_LABELS[status] ?? status}</span>;
}
function PriorityBadge({ priority }: { priority: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_COLORS[priority] ?? "bg-muted text-muted-foreground"}`}>{priority}</span>;
}
function TypeBadge({ type }: { type: string }) {
  const label = type === "cs_request" ? "CS Request" : type === "partner_work" ? "Partner Work" : "Internal";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLORS[type] ?? "bg-muted text-muted-foreground"}`}>{label}</span>;
}

export default function TasksPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const role = user?.role ?? "";
  const isParent = role === "parent_client";
  const isAdmin = ["super_admin", "admin"].includes(role);

  const [view, setView] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selected, setSelected] = useState<TaskDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [newComment, setNewComment] = useState("");
  const [commentInternal, setCommentInternal] = useState(false);
  const [editingStatus, setEditingStatus] = useState("");
  const [editingAssignee, setEditingAssignee] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", statusFilter, priorityFilter, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (search) params.set("search", search);
      params.set("limit", "100");
      return axios.get(`${BASE}/api/tasks?${params}`).then(r => r.data);
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => axios.get(`${BASE}/api/users?limit=100`).then(r => r.data),
    enabled: isAdmin,
  });

  const tasks: TaskRec[] = data?.data ?? [];

  function openDetail(t: TaskRec) {
    axios.get(`${BASE}/api/tasks/${t.id}`).then(r => {
      setSelected(r.data);
      setEditingStatus(r.data.status);
      setEditingAssignee(r.data.assignedTo ?? "");
    });
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      axios.patch(`${BASE}/api/tasks/${id}/status`, { status }).then(r => r.data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setSelected(prev => prev ? { ...prev, ...updated } : null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<TaskRec>) =>
      axios.put(`${BASE}/api/tasks/${selected!.id}`, payload).then(r => r.data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setSelected(prev => prev ? { ...prev, ...updated } : null);
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ content, isInternal }: { content: string; isInternal: boolean }) =>
      axios.post(`${BASE}/api/tasks/${selected!.id}/comments`, { content, isInternal }).then(r => r.data),
    onSuccess: (comment) => {
      setNewComment("");
      setSelected(prev => prev ? { ...prev, comments: [...prev.comments, comment] } : null);
    },
  });

  const [createForm, setCreateForm] = useState({
    title: "", description: "", taskType: "internal", category: "inquiry",
    priority: "normal", assignedTo: "", visibility: "internal",
  });

  const createMutation = useMutation({
    mutationFn: () => axios.post(`${BASE}/api/tasks`, createForm).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setShowCreate(false);
      setCreateForm({ title: "", description: "", taskType: "internal", category: "inquiry", priority: "normal", assignedTo: "", visibility: "internal" });
    },
  });

  function fmtDate(s?: string | null) {
    if (!s) return "—";
    try { return format(new Date(s), "MMM d, yyyy"); } catch { return s; }
  }

  const allUsers: { id: string; fullName: string }[] = usersData?.data ?? [];

  const kanbanCols = STATUSES.map(s => ({ key: s, label: STATUS_LABELS[s], tasks: tasks.filter(t => t.status === s) }));

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F5821F]/10 flex items-center justify-center">
            <Ticket className="w-5 h-5 text-[#F5821F]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1C1917]">Tasks / CS</h1>
            <p className="text-xs text-[#A8A29E]">Customer support & internal task management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("list")}
            className={`p-1.5 rounded-md ${view === "list" ? "bg-[#F5821F] text-white" : "text-[#78716C] hover:bg-[#F4F3F1]"}`}
          ><List className="w-4 h-4" /></button>
          <button
            onClick={() => setView("kanban")}
            className={`p-1.5 rounded-md ${view === "kanban" ? "bg-[#F5821F] text-white" : "text-[#78716C] hover:bg-[#F4F3F1]"}`}
          ><LayoutGrid className="w-4 h-4" /></button>
          {!isParent && (
            <Button className="h-8 gap-1.5 text-xs" onClick={() => setShowCreate(true)}>
              <Plus className="w-3.5 h-3.5" /> New Task
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A8A29E]" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search tasks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue placeholder="All priorities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-[#A8A29E] ml-auto">{tasks.length} tasks</span>
      </div>

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <div className="rounded-lg border border-[#E7E5E4] overflow-x-auto bg-white">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-[#E7E5E4] bg-[#FAFAF9]">
                {["Task #", "Type", "Category", "Subject", "Submitted by", "Assigned", "Priority", "Status", "Created"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-[#78716C] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="py-16 text-center text-[#A8A29E]">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </td></tr>
              ) : tasks.length === 0 ? (
                <tr><td colSpan={9} className="py-16 text-center text-[#A8A29E]">
                  <Ticket className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No tasks found</p>
                </td></tr>
              ) : tasks.map(t => (
                <tr
                  key={t.id}
                  onClick={() => openDetail(t)}
                  className="border-b border-[#F4F3F1] hover:bg-[#FAFAF9] cursor-pointer"
                >
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold text-[#F5821F] whitespace-nowrap">{t.taskNumber}</td>
                  <td className="px-4 py-2.5"><TypeBadge type={t.taskType} /></td>
                  <td className="px-4 py-2.5 text-xs text-[#57534E] capitalize whitespace-nowrap">{t.category}</td>
                  <td className="px-4 py-2.5 max-w-[200px]">
                    <p className="truncate text-xs font-medium text-[#1C1917]">{t.title ?? "—"}</p>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#57534E] whitespace-nowrap">
                    {t.submittedName ?? t.submittedEmail ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#57534E] whitespace-nowrap">
                    {t.assignedToName ?? "—"}
                  </td>
                  <td className="px-4 py-2.5"><PriorityBadge priority={t.priority} /></td>
                  <td className="px-4 py-2.5"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-2.5 text-xs text-[#A8A29E] whitespace-nowrap">{fmtDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── KANBAN VIEW ── */}
      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanCols.map(col => (
            <div key={col.key} className="flex-shrink-0 w-64 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#57534E]">{col.label}</span>
                <span className="text-xs text-[#A8A29E] bg-[#F4F3F1] px-1.5 rounded-full">{col.tasks.length}</span>
              </div>
              <div className="space-y-2">
                {col.tasks.map(t => (
                  <div
                    key={t.id}
                    onClick={() => openDetail(t)}
                    className="bg-white border border-[#E7E5E4] rounded-lg p-3 cursor-pointer hover:shadow-sm hover:border-[#F5821F]/30 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[10px] text-[#F5821F] font-semibold">{t.taskNumber}</span>
                      <PriorityBadge priority={t.priority} />
                    </div>
                    <p className="text-xs font-medium text-[#1C1917] line-clamp-2">{t.title ?? "—"}</p>
                    <div className="flex items-center gap-1.5">
                      <TypeBadge type={t.taskType} />
                    </div>
                    {t.submittedName && (
                      <div className="flex items-center gap-1 text-[10px] text-[#A8A29E]">
                        <User className="w-3 h-3" />
                        <span className="truncate">{t.submittedName}</span>
                      </div>
                    )}
                    <div className="text-[10px] text-[#A8A29E]">{fmtDate(t.createdAt)}</div>
                  </div>
                ))}
                {col.tasks.length === 0 && (
                  <div className="border border-dashed border-[#E7E5E4] rounded-lg p-4 text-center text-xs text-[#A8A29E]">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── DETAIL DRAWER ── */}
      <Sheet open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <SheetContent className="w-[540px] sm:max-w-xl overflow-y-auto p-0">
          {selected && (
            <>
              <SheetHeader className="p-6 pb-4 border-b border-[#E7E5E4]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-bold text-[#F5821F]">{selected.taskNumber}</span>
                  <TypeBadge type={selected.taskType} />
                  <PriorityBadge priority={selected.priority} />
                  {selected.slaBreached && (
                    <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> SLA Breached
                    </span>
                  )}
                </div>
                <SheetTitle className="text-base text-[#1C1917] mt-1">{selected.title ?? "—"}</SheetTitle>
                <SheetDescription className="text-xs text-[#A8A29E]">
                  Created {fmtDate(selected.createdAt)} · Category: <span className="capitalize">{selected.category}</span> · Source: <span className="capitalize">{selected.source}</span>
                </SheetDescription>
              </SheetHeader>

              <div className="p-6 space-y-5">
                {/* Status & Assignee Controls */}
                {!isParent && (
                  <div className="flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[140px]">
                      <label className="text-xs font-medium text-[#78716C] mb-1 block">Status</label>
                      <Select
                        value={editingStatus}
                        onValueChange={v => {
                          setEditingStatus(v);
                          statusMutation.mutate({ id: selected.id, status: v });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {isAdmin && (
                      <div className="flex-1 min-w-[140px]">
                        <label className="text-xs font-medium text-[#78716C] mb-1 block">Assigned To</label>
                        <Select
                          value={editingAssignee || "__none__"}
                          onValueChange={v => {
                            const val = v === "__none__" ? "" : v;
                            setEditingAssignee(val);
                            updateMutation.mutate({ assignedTo: val || null } as Partial<TaskRec>);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Unassigned</SelectItem>
                            {allUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                {/* Submitter Info */}
                <div className="rounded-lg border border-[#E7E5E4] p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-[#57534E] uppercase tracking-wide">Contact Info</h4>
                  <dl className="space-y-1.5 text-xs">
                    {selected.submittedName && (
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-[#A8A29E]" />
                        <span className="text-[#1C1917] font-medium">{selected.submittedName}</span>
                      </div>
                    )}
                    {selected.submittedEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-[#A8A29E]" />
                        <a href={`mailto:${selected.submittedEmail}`} className="text-[#F5821F] hover:underline">{selected.submittedEmail}</a>
                      </div>
                    )}
                    {selected.submittedPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-[#A8A29E]" />
                        <span className="text-[#57534E]">{selected.submittedPhone}</span>
                      </div>
                    )}
                  </dl>
                  {(selected.contractId || selected.applicationId) && !isParent && (
                    <div className="pt-2 border-t border-[#E7E5E4] flex flex-wrap gap-2">
                      {selected.contractId && (
                        <button
                          onClick={() => { setSelected(null); navigate(`${BASE}/admin/crm/contracts?contractId=${selected.contractId}`); }}
                          className="flex items-center gap-1 text-xs text-[#F5821F] hover:underline"
                        ><LinkIcon className="w-3 h-3" /> View Contract</button>
                      )}
                      {selected.applicationId && (
                        <button
                          onClick={() => { setSelected(null); navigate(`${BASE}/admin/applications`); }}
                          className="flex items-center gap-1 text-xs text-[#F5821F] hover:underline"
                        ><LinkIcon className="w-3 h-3" /> View Application</button>
                      )}
                    </div>
                  )}
                </div>

                {/* Description */}
                {selected.description && (
                  <div>
                    <h4 className="text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-2">Description</h4>
                    <p className="text-sm text-[#57534E] whitespace-pre-wrap bg-[#FAFAF9] rounded-lg border border-[#E7E5E4] p-3">
                      {selected.description}
                    </p>
                  </div>
                )}

                {/* Satisfaction Rating (if resolved/closed) */}
                {["resolved", "closed"].includes(selected.status) && (
                  <div className="rounded-lg border border-[#E7E5E4] p-4">
                    <h4 className="text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-2">Satisfaction Rating</h4>
                    {selected.satisfactionRating ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star key={n} className={`w-4 h-4 ${n <= selected.satisfactionRating! ? "text-[#F5821F] fill-[#F5821F]" : "text-[#E7E5E4]"}`} />
                          ))}
                          <span className="text-xs text-[#78716C] ml-1">{selected.satisfactionRating}/5</span>
                        </div>
                        {selected.satisfactionComment && <p className="text-xs text-[#57534E] italic">"{selected.satisfactionComment}"</p>}
                      </div>
                    ) : (
                      <p className="text-xs text-[#A8A29E]">No rating submitted yet</p>
                    )}
                  </div>
                )}

                {/* Comments Thread */}
                <div>
                  <h4 className="text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-3">Comments</h4>
                  <div className="space-y-3">
                    {selected.comments.length === 0 && (
                      <p className="text-xs text-[#A8A29E] text-center py-4">No comments yet</p>
                    )}
                    {selected.comments.map(c => (
                      <div key={c.id} className={`rounded-lg p-3 space-y-1 ${c.isInternal ? "bg-amber-50 border border-amber-200" : "bg-[#FAFAF9] border border-[#E7E5E4]"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-[#1C1917]">{c.authorName ?? "Anonymous"}</span>
                            {c.isInternal && (
                              <span className="flex items-center gap-0.5 text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full font-medium">
                                <Lock className="w-2.5 h-2.5" /> Internal
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#A8A29E]">{fmtDate(c.createdAt)}</span>
                        </div>
                        <p className="text-xs text-[#57534E] whitespace-pre-wrap">{c.content}</p>
                      </div>
                    ))}
                  </div>

                  {/* Add comment */}
                  <div className="mt-3 space-y-2">
                    <Textarea
                      className="text-sm min-h-[80px] resize-none"
                      placeholder="Write a comment…"
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                    />
                    <div className="flex items-center justify-between gap-2">
                      {!isParent && (
                        <label className="flex items-center gap-1.5 text-xs text-[#57534E] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={commentInternal}
                            onChange={e => setCommentInternal(e.target.checked)}
                            className="rounded"
                          />
                          <Lock className="w-3 h-3 text-amber-600" />
                          Internal note only
                        </label>
                      )}
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1 ml-auto"
                        disabled={!newComment.trim() || commentMutation.isPending}
                        onClick={() => commentMutation.mutate({ content: newComment.trim(), isInternal: commentInternal })}
                      >
                        <Send className="w-3 h-3" /> Send
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="text-[11px] text-[#A8A29E] space-y-0.5 pt-2 border-t border-[#E7E5E4]">
                  <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Created: {fmtDate(selected.createdAt)}</div>
                  {selected.firstResponseAt && <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-green-500" /> First response: {fmtDate(selected.firstResponseAt)}</div>}
                  {selected.resolvedAt && <div className="flex items-center gap-1.5"><XCircle className="w-3 h-3 text-green-600" /> Resolved: {fmtDate(selected.resolvedAt)}</div>}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── CREATE TASK DRAWER ── */}
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="w-[480px] sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create New Task</SheetTitle>
            <SheetDescription>Add an internal task or CS request</SheetDescription>
          </SheetHeader>
          <div className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-[#57534E] mb-1 block">Subject *</label>
              <Input
                className="text-sm"
                placeholder="Brief description of the task"
                value={createForm.title}
                onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[#57534E] mb-1 block">Type</label>
                <Select value={createForm.taskType} onValueChange={v => setCreateForm(f => ({ ...f, taskType: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t === "cs_request" ? "CS Request" : t === "partner_work" ? "Partner Work" : "Internal"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#57534E] mb-1 block">Category</label>
                <Select value={createForm.category} onValueChange={v => setCreateForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#57534E] mb-1 block">Priority</label>
                <Select value={createForm.priority} onValueChange={v => setCreateForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#57534E] mb-1 block">Visibility</label>
                <Select value={createForm.visibility} onValueChange={v => setCreateForm(f => ({ ...f, visibility: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal"><span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Internal</span></SelectItem>
                    <SelectItem value="shared"><span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Shared</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {isAdmin && (
              <div>
                <label className="text-xs font-medium text-[#57534E] mb-1 block">Assign To</label>
                <Select value={createForm.assignedTo || "__none__"} onValueChange={v => setCreateForm(f => ({ ...f, assignedTo: v === "__none__" ? "" : v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {allUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-[#57534E] mb-1 block">Description</label>
              <Textarea
                className="text-sm min-h-[100px] resize-none"
                placeholder="Detailed description…"
                value={createForm.description}
                onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={!createForm.title.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Task"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
