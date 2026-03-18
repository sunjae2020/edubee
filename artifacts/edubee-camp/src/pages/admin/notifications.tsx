import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Check, CheckCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const NOTIF_ICONS: Record<string, string> = {
  application_submitted: "📋", status_changed: "🔄", interview_scheduled: "📅",
  contract_created: "📄", document_expiring: "⚠️", report_published: "📊",
  invoice_sent: "💰", invoice_overdue: "🔴", default: "🔔",
};

interface Notification {
  id: string; type?: string | null; title?: string | null; message?: string | null;
  isRead?: boolean | null; createdAt?: string | null; referenceType?: string | null;
}

export default function Notifications() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<Notification[]>({
    queryKey: ["notifications-page"],
    queryFn: () => axios.get(`${BASE}/api/notifications?limit=50`).then(r => r.data?.data ?? []),
  });
  const notifications = data ?? [];

  const markAllMutation = useMutation({
    mutationFn: () => axios.post(`${BASE}/api/notifications/mark-all-read`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-page"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      toast({ title: "All notifications marked as read" });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => axios.patch(`${BASE}/api/notifications/${id}/read`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-page"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  const unread = notifications.filter(n => !n.isRead).length;

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F08301]/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-[#F08301]" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Notifications</h1>
            <p className="text-xs text-muted-foreground">
              {unread > 0 ? `${unread} unread` : "All caught up"}
            </p>
          </div>
        </div>
        {unread > 0 && (
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No notifications yet</p>
          <p className="text-xs mt-1">You'll be notified of important activity here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`rounded-lg border p-4 flex items-start gap-3 transition-all cursor-pointer hover:border-[#F08301]/30 ${!n.isRead ? "bg-[#F08301]/5 border-[#F08301]/20" : "bg-white"}`}
              onClick={() => !n.isRead && markOneMutation.mutate(n.id)}
            >
              <span className="text-xl shrink-0 mt-0.5">{NOTIF_ICONS[n.type ?? ""] ?? NOTIF_ICONS.default}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{n.title}</p>
                  {!n.isRead && (
                    <button
                      className="shrink-0 p-1 rounded text-muted-foreground hover:text-[#F08301] hover:bg-[#F08301]/10 transition-colors"
                      onClick={e => { e.stopPropagation(); markOneMutation.mutate(n.id); }}
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {n.message && <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>}
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {n.createdAt ? new Date(n.createdAt).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                </p>
              </div>
              {!n.isRead && <div className="w-2 h-2 rounded-full bg-[#F08301] mt-1.5 shrink-0" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
