import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ArrowLeft, Phone, Mail, MessageSquare, Calendar, Users, FileText, Folder, Activity, CheckSquare, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_COLORS: Record<string, string> = {
  new:         "bg-[#FEF0E3] text-[#F5821F]",
  open:        "bg-[#EFF6FF] text-[#3B82F6]",
  in_progress: "bg-[#FEF9C3] text-[#CA8A04]",
  qualified:   "bg-[#DCFCE7] text-[#16A34A]",
  unqualified: "bg-[#F4F3F1] text-[#57534E]",
};

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  Call:      Phone,
  Email:     Mail,
  SMS:       MessageSquare,
  Meeting:   Users,
  WhatsApp:  MessageSquare,
  LINE:      MessageSquare,
  KakaoTalk: MessageSquare,
};

const CHANNELS = ["Call", "Email", "SMS", "Meeting", "WhatsApp", "LINE", "KakaoTalk"];

const TABS = [
  { key: "details",   label: "Details",           icon: FileText },
  { key: "activity",  label: "Activity Timeline", icon: Activity },
  { key: "tasks",     label: "Tasks",             icon: CheckSquare },
  { key: "files",     label: "Files",             icon: Folder },
];

interface Activity {
  id: string;
  channel: string;
  scheduledAt?: string | null;
  description: string;
  createdOn: string;
}

interface CampApplicationSnippet {
  id: string;
  applicationRef?: string | null;
  packageGroupId?: string | null;
  preferredStartDate?: string | null;
  applicationStatus?: string | null;
}

interface Lead {
  id: string;
  leadRefNumber?: string | null;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  nationality?: string | null;
  inquiryType?: string | null;
  budget?: string | null;
  expectedStartDate?: string | null;
  status?: string | null;
  source?: string | null;
  notes?: string | null;
  activities?: Activity[];
  campApplication?: CampApplicationSnippet | null;
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-stone-400 mb-0.5">{label}</p>
      <p className="text-sm text-stone-800 font-medium">{value || "—"}</p>
    </div>
  );
}

function ChannelIcon({ channel }: { channel: string }) {
  const Icon = CHANNEL_ICONS[channel] ?? MessageSquare;
  return (
    <div className="w-8 h-8 rounded-full bg-[#FEF0E3] flex items-center justify-center shrink-0">
      <Icon size={14} className="text-[#F5821F]" />
    </div>
  );
}

export default function LeadDetailPage() {
  const [, params] = useRoute("/admin/crm/leads/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState("details");
  const [activityForm, setActivityForm] = useState({ channel: "Call", scheduledAt: "", description: "" });
  const id = params?.id ?? "";

  const { data: lead, isLoading } = useQuery<Lead>({
    queryKey: ["crm-lead", id],
    queryFn: () => axios.get(`${BASE}/api/crm/leads/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const activityMutation = useMutation({
    mutationFn: (payload: typeof activityForm) =>
      axios.post(`${BASE}/api/crm/leads/${id}/activities`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-lead", id] });
      setActivityForm({ channel: "Call", scheduledAt: "", description: "" });
      toast({ title: "Activity logged" });
    },
    onError: () => toast({ title: "Failed to log activity", variant: "destructive" }),
  });

  const convertMutation = useMutation({
    mutationFn: () => axios.post(`${BASE}/api/crm/leads/${id}/convert-to-quote`).then(r => r.data),
    onSuccess: (data) => {
      toast({ title: `Quote created: ${data.quoteRefNumber}` });
      navigate(data.redirectTo ?? "/admin/crm/quotes");
    },
    onError: () => toast({ title: "Conversion failed", variant: "destructive" }),
  });

  function handleLogActivity() {
    if (!activityForm.description.trim()) {
      toast({ title: "Description is required", variant: "destructive" });
      return;
    }
    activityMutation.mutate(activityForm);
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-stone-400 text-sm">Loading lead…</div>;
  }
  if (!lead) {
    return <div className="flex items-center justify-center h-64 text-stone-400 text-sm">Lead not found.</div>;
  }

  const status = lead.status ?? "new";

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => navigate("/admin/crm/leads")}
        className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Leads
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-stone-800">{lead.fullName}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[status] ?? "bg-[#F4F3F1] text-[#57534E]"}`}>
              {status.replace(/_/g, " ")}
            </span>
          </div>
          {lead.leadRefNumber && (
            <p className="font-mono text-sm text-stone-400">{lead.leadRefNumber}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => convertMutation.mutate()}
            disabled={convertMutation.isPending}
            className="text-white"
            style={{ background: "#F5821F" }}
          >
            {convertMutation.isPending ? "Converting…" : "Convert to Quote"}
          </Button>
          <Button variant="outline">Edit</Button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-stone-200">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                active ? "border-[#F5821F] text-[#F5821F]" : "border-transparent text-stone-500 hover:text-stone-800"
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "details" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <DetailField label="Full Name"       value={lead.fullName} />
            <DetailField label="Email"           value={lead.email} />
            <DetailField label="Phone"           value={lead.phone} />
            <DetailField label="Nationality"     value={lead.nationality} />
            <DetailField label="Inquiry Type"    value={lead.inquiryType} />
            <DetailField label="Budget"          value={lead.budget ? `A$${Number(lead.budget).toLocaleString("en-AU")}` : null} />
            <DetailField label="Expected Start"  value={lead.expectedStartDate ? format(new Date(lead.expectedStartDate), "MMM d, yyyy") : null} />
            <DetailField label="Source"          value={lead.source} />
            {lead.notes && (
              <div className="col-span-full">
                <p className="text-xs text-stone-400 mb-0.5">Notes</p>
                <p className="text-sm text-stone-700 whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}
          </div>

          {lead.source === "Camp Application" && lead.campApplication && (
            <div className="border border-[#F5821F]/30 rounded-xl p-4 bg-[#FEF0E3]/40">
              <p className="text-xs font-semibold text-[#F5821F] uppercase tracking-wide mb-3">Linked Camp Application</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Application Ref</p>
                  <p className="text-sm font-mono font-medium text-stone-800">{lead.campApplication.applicationRef ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Preferred Start</p>
                  <p className="text-sm font-medium text-stone-800">
                    {lead.campApplication.preferredStartDate
                      ? format(new Date(lead.campApplication.preferredStartDate), "MMM d, yyyy")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Status</p>
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FEF9C3] text-[#CA8A04] capitalize">
                    {lead.campApplication.applicationStatus ?? "—"}
                  </span>
                </div>
              </div>
              <a
                href={`/admin/camp-applications/${lead.campApplication.id}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#F5821F] hover:underline"
              >
                View Application <ExternalLink size={13} />
              </a>
            </div>
          )}
        </div>
      )}

      {tab === "activity" && (
        <div className="space-y-6">
          <div className="space-y-0">
            {(lead.activities ?? []).length === 0 && (
              <p className="text-sm text-stone-400 text-center py-8">No activities yet. Log the first one below.</p>
            )}
            {(lead.activities ?? []).map((a, idx) => {
              const isLast = idx === (lead.activities ?? []).length - 1;
              return (
                <div key={a.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <ChannelIcon channel={a.channel} />
                    {!isLast && <div className="w-px flex-1 bg-stone-200 mt-2" />}
                  </div>
                  <div className={`pb-6 flex-1 ${isLast ? "" : ""}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-stone-600">{a.channel}</span>
                      <span className="text-[11px] text-stone-400">
                        {format(new Date(a.createdOn), "MMM d, yyyy · h:mm a")}
                      </span>
                      {a.scheduledAt && (
                        <span className="flex items-center gap-1 text-[11px] text-stone-400">
                          <Calendar size={11} />
                          {format(new Date(a.scheduledAt), "MMM d, yyyy · h:mm a")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-stone-700">{a.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border border-stone-200 rounded-xl p-4 space-y-3 bg-stone-50">
            <p className="text-sm font-semibold text-stone-700">+ Log Activity</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-stone-600">Channel</Label>
                <Select value={activityForm.channel} onValueChange={v => setActivityForm(f => ({ ...f, channel: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-stone-600">Scheduled At</Label>
                <Input
                  type="datetime-local"
                  value={activityForm.scheduledAt}
                  onChange={e => setActivityForm(f => ({ ...f, scheduledAt: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-stone-600">Description <span className="text-red-500">*</span></Label>
              <Textarea
                value={activityForm.description}
                onChange={e => setActivityForm(f => ({ ...f, description: e.target.value }))}
                className="text-sm min-h-[70px] resize-none bg-white"
                placeholder="Describe the activity…"
              />
            </div>
            <Button
              onClick={handleLogActivity}
              disabled={activityMutation.isPending}
              className="text-white"
              style={{ background: "#F5821F" }}
            >
              {activityMutation.isPending ? "Saving…" : "Save Activity"}
            </Button>
          </div>
        </div>
      )}

      {(tab === "tasks" || tab === "files") && (
        <div className="flex items-center justify-center h-40 text-stone-400 text-sm">
          {TABS.find(t => t.key === tab)?.label} — coming soon
        </div>
      )}
    </div>
  );
}
