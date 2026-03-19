import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { Pin, Trash2, Send, StickyNote } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Note {
  id: string;
  entityType: string;
  entityId: string;
  noteType: string;
  content: string;
  visibility: "internal" | "partner" | "client";
  isPinned: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  createdByName?: string | null;
}

interface NotePanelProps {
  entityType: string;
  entityId: string;
  allowedNoteTypes?: string[];
  defaultVisibility?: "internal" | "partner" | "client";
  compact?: boolean;
}

const VISIBILITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  internal: { label: "Internal", color: "#F5821F", bg: "#FEF0E3" },
  partner:  { label: "Partner",  color: "#0EA5E9", bg: "#E0F2FE" },
  client:   { label: "Client",   color: "#16A34A", bg: "#DCFCE7" },
};

const NOTE_TYPE_LABELS: Record<string, string> = {
  internal:        "Internal",
  teacher:         "Teacher",
  progress:        "Progress",
  guest:           "Guest",
  driver:          "Driver",
  guide:           "Guide",
  interviewer:     "Interviewer",
  candidate:       "Candidate",
  special_request: "Special Request",
};

export function NotePanel({
  entityType,
  entityId,
  allowedNoteTypes = ["internal"],
  defaultVisibility = "internal",
  compact = false,
}: NotePanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState(allowedNoteTypes[0] ?? "internal");
  const [visibility, setVisibility] = useState<"internal" | "partner" | "client">(defaultVisibility);

  const isAdmin = ["super_admin", "admin", "camp_coordinator"].includes(user?.role ?? "");

  const { data, isLoading } = useQuery({
    queryKey: ["notes", entityType, entityId],
    queryFn: () =>
      axios.get(`${BASE}/api/notes`, { params: { entityType, entityId } })
        .then(r => r.data.data as Note[]),
    enabled: Boolean(entityId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      axios.post(`${BASE}/api/notes`, { entityType, entityId, noteType, content, visibility }),
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["notes", entityType, entityId] });
    },
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) =>
      axios.patch(`${BASE}/api/notes/${id}`, { isPinned: !isPinned }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notes", entityType, entityId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/notes/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notes", entityType, entityId] }),
  });

  const noteList = data ?? [];
  const pinned  = noteList.filter(n => n.isPinned);
  const regular = noteList.filter(n => !n.isPinned);
  const sorted  = [...pinned, ...regular];

  return (
    <div className={`flex flex-col ${compact ? "gap-3" : "gap-4"}`}>
      {/* Input area */}
      <div className="rounded-xl border border-border bg-card p-3 flex flex-col gap-2">
        {isAdmin && (
          <div className="flex gap-2 flex-wrap">
            {allowedNoteTypes.length > 1 && (
              <select
                value={noteType}
                onChange={e => setNoteType(e.target.value)}
                className="text-xs px-2 py-1 rounded-md border border-border bg-muted text-foreground focus:outline-none"
              >
                {allowedNoteTypes.map(t => (
                  <option key={t} value={t}>{NOTE_TYPE_LABELS[t] ?? t}</option>
                ))}
              </select>
            )}
            <select
              value={visibility}
              onChange={e => setVisibility(e.target.value as any)}
              className="text-xs px-2 py-1 rounded-md border border-border bg-muted text-foreground focus:outline-none"
            >
              <option value="internal">Internal only</option>
              <option value="partner">Visible to partner</option>
              <option value="client">Visible to client</option>
            </select>
          </div>
        )}
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Add a note… (Ctrl+Enter to send)"
          rows={compact ? 2 : 3}
          className="w-full resize-none border-none outline-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground font-sans"
          onKeyDown={e => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              if (content.trim()) createMutation.mutate();
            }
          }}
        />
        <div className="flex justify-end">
          <button
            disabled={!content.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate()}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-white transition-all
              ${content.trim() ? "bg-[#F5821F] hover:bg-[#d97706]" : "bg-muted-foreground/30 cursor-not-allowed"}
              ${createMutation.isPending ? "opacity-70" : ""}`}
          >
            <Send className="w-3 h-3" />
            {createMutation.isPending ? "Adding…" : "Add note"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-xs text-muted-foreground py-2">Loading notes…</div>
      )}

      {/* Empty state */}
      {!isLoading && sorted.length === 0 && (
        <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-6" : "py-10"} text-muted-foreground`}>
          <StickyNote className={`${compact ? "w-6 h-6" : "w-8 h-8"} mb-2 opacity-30`} />
          <p className="text-xs">No notes yet.</p>
        </div>
      )}

      {/* Note list */}
      {sorted.map(note => {
        const vis = VISIBILITY_CONFIG[note.visibility] ?? VISIBILITY_CONFIG.internal;
        const canManage = isAdmin || note.createdBy === user?.id;
        return (
          <div
            key={note.id}
            className="rounded-xl flex flex-col gap-1.5"
            style={{
              border: note.isPinned ? `1.5px solid #F5821F` : "1px solid var(--border)",
              padding: compact ? "10px 14px" : "12px 16px",
              background: note.isPinned ? "#FEF0E3" : "var(--card)",
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground">
                {note.createdByName ?? "User"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {format(new Date(note.createdAt), "MMM d, yyyy HH:mm")}
              </span>
              {note.noteType !== "internal" && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {NOTE_TYPE_LABELS[note.noteType] ?? note.noteType}
                </span>
              )}
              <span
                className="text-[11px] px-2 py-0.5 rounded-full ml-auto"
                style={{ background: vis.bg, color: vis.color }}
              >
                {vis.label}
              </span>
              {canManage && (
                <div className="flex gap-0.5">
                  <button
                    onClick={() => pinMutation.mutate({ id: note.id, isPinned: note.isPinned })}
                    title={note.isPinned ? "Unpin" : "Pin"}
                    className="p-1 rounded hover:bg-muted transition-colors"
                    style={{ color: note.isPinned ? "#F5821F" : undefined }}
                  >
                    <Pin className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("Delete this note?")) deleteMutation.mutate(note.id);
                    }}
                    title="Delete"
                    className="p-1 rounded hover:bg-muted transition-colors text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            {/* Content */}
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap m-0">
              {note.content}
            </p>
          </div>
        );
      })}
    </div>
  );
}
