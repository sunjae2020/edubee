import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  ArrowLeft, Map, DollarSign, Pencil, ExternalLink,
  Check, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format, parseISO } from "date-fns";
import EntityDocumentsTab from "@/components/shared/EntityDocumentsTab";
import { NotePanel } from "@/components/shared/NotePanel";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUSES = ["pending", "confirmed", "in_progress", "completed", "cancelled"] as const;
const TOUR_TYPES = ["day_trip", "excursion", "cultural_tour", "adventure", "city_tour", "other"] as const;
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:     { bg: "#FEF9C3", color: "#854D0E" },
  confirmed:   { bg: "#FEF0E3", color: "#F5821F" },
  in_progress: { bg: "#DBEAFE", color: "#1D4ED8" },
  completed:   { bg: "#DCFCE7", color: "#16A34A" },
  cancelled:   { bg: "#FEE2E2", color: "#DC2626" },
};

function fmtDate(v?: string | null) {
  if (!v) return "—";
  try { return format(parseISO(v), "d MMM yyyy"); } catch { return v; }
}
function fmtMoney(v?: string | null, currency = "AUD") {
  if (!v) return "—";
  return `${currency} ${parseFloat(v).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-[#F4F3F1] last:border-0">
      <span className="text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wide">{label}</span>
      <span className="text-sm text-[#1C1917]">{value ?? "—"}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] ?? { bg: "#F4F3F1", color: "#57534E" };
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: s.bg, color: s.color }}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ record, canEdit, onSave }: { record: any; canEdit: boolean; onSave: (p: object) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    tourName:         record.tourName         ?? "",
    tourType:         record.tourType         ?? "",
    tourDate:         record.tourDate         ?? "",
    tourDurationHours: String(record.tourDurationHours ?? ""),
    pickupLocation:   record.pickupLocation   ?? "",
    bookingReference: record.bookingReference ?? "",
    status:           record.status           ?? "pending",
    notes:            record.notes            ?? "",
    retailPrice:      record.retailPrice      ?? "",
    partnerCost:      record.partnerCost      ?? "",
  });
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => { onSave(form); setEditing(false); };
  const handleCancel = () => {
    setForm({ tourName: record.tourName ?? "", tourType: record.tourType ?? "", tourDate: record.tourDate ?? "", tourDurationHours: String(record.tourDurationHours ?? ""), pickupLocation: record.pickupLocation ?? "", bookingReference: record.bookingReference ?? "", status: record.status ?? "pending", notes: record.notes ?? "", retailPrice: record.retailPrice ?? "", partnerCost: record.partnerCost ?? "" });
    setEditing(false);
  };

  const currency = record.contract?.currency ?? "AUD";

  return (
    <div className="space-y-4">
      {/* Contract link */}
      {record.contract && (
        <div className="rounded-xl border border-[#E8E6E2] bg-[#FAFAF9] p-4">
          <div className="text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wide mb-2">Contract</div>
          <div className="flex items-center gap-3">
            <div>
              <div className="text-sm font-semibold text-[#1C1917]">{record.contract.contractNumber ?? "—"}</div>
              <div className="text-xs text-[#57534E]">{record.contract.studentName ?? "—"}</div>
            </div>
            <a href={`${BASE}/admin/camp-contracts/${record.contractId}`} className="ml-auto">
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1">
                <ExternalLink className="w-3 h-3" /> View Contract
              </Button>
            </a>
          </div>
        </div>
      )}

      {/* Overview card */}
      <div className="rounded-xl border border-[#E8E6E2] bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Map className="w-4 h-4 text-[#F5821F]" />
            <span className="text-sm font-semibold text-[#1C1917]">Tour / Activity Service</span>
          </div>
          {canEdit && !editing && (
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => setEditing(true)}>
              <Pencil className="w-3 h-3" /> Edit
            </Button>
          )}
          {editing && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={handleCancel}>
                <X className="w-3 h-3" /> Cancel
              </Button>
              <Button size="sm" className="h-7 px-2 text-xs gap-1 bg-[#F5821F] hover:bg-[#d97706] text-white" onClick={handleSave}>
                <Check className="w-3 h-3" /> Save
              </Button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Tour Name</Label>
              <Input value={form.tourName} onChange={e => f("tourName")(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tour Type</Label>
              <Select value={form.tourType || "__none"} onValueChange={v => f("tourType")(v === "__none" ? "" : v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">—</SelectItem>
                  {TOUR_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={f("status")}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tour Date</Label>
              <Input type="date" value={form.tourDate} onChange={e => f("tourDate")(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Duration (hours)</Label>
              <Input type="number" value={form.tourDurationHours} onChange={e => f("tourDurationHours")(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Pickup Location</Label>
              <Input value={form.pickupLocation} onChange={e => f("pickupLocation")(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Booking Reference</Label>
              <Input value={form.bookingReference} onChange={e => f("bookingReference")(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={e => f("notes")(e.target.value)} className="text-sm min-h-[60px]" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-6">
            <InfoRow label="Tour Name" value={record.tourName} />
            <InfoRow label="Tour Type" value={record.tourType?.replace(/_/g, " ")} />
            <InfoRow label="Tour Date" value={fmtDate(record.tourDate)} />
            <InfoRow label="Duration" value={record.tourDurationHours ? `${record.tourDurationHours} hrs` : undefined} />
            <InfoRow label="Pickup Location" value={record.pickupLocation} />
            <InfoRow label="Booking Ref" value={record.bookingReference} />
            <InfoRow label="Status" value={<StatusBadge status={record.status} />} />
            {record.notes && <InfoRow label="Notes" value={record.notes} />}
          </div>
        )}
      </div>

      {/* Bill card */}
      <div className="rounded-xl border border-[#E8E6E2] bg-white p-4">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-[#F5821F]" />
          <span className="text-sm font-semibold text-[#1C1917]">Billing</span>
        </div>
        {editing ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Retail Price (AR)</Label>
              <Input type="number" value={form.retailPrice} onChange={e => f("retailPrice")(e.target.value)} className="h-8 text-sm" placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Partner Cost (AP)</Label>
              <Input type="number" value={form.partnerCost} onChange={e => f("partnerCost")(e.target.value)} className="h-8 text-sm" placeholder="0.00" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-6">
            <InfoRow label="Retail Price (AR)" value={fmtMoney(record.retailPrice, currency)} />
            <InfoRow label="Partner Cost (AP)" value={fmtMoney(record.partnerCost, currency)} />
            <InfoRow label="AR Status" value={record.arStatus ?? "scheduled"} />
            <InfoRow label="AP Status" value={record.apStatus ?? "pending"} />
            <InfoRow label="CoA AR" value={record.coaArCode ?? "3500"} />
            <InfoRow label="CoA AP" value={record.coaApCode ?? "4600"} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { key: "overview",   label: "Overview"   },
  { key: "documents",  label: "Documents"  },
  { key: "notes",      label: "Notes"      },
] as const;
type TabKey = typeof TABS[number]["key"];

export default function CampTourDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const canEdit = ["super_admin", "admin", "camp_coordinator"].includes(user?.role ?? "");

  const { data, isLoading } = useQuery({
    queryKey: ["camp-tour-detail", id],
    queryFn: () => axios.get(`${BASE}/api/camp-services/tours/${id}`).then(r => r.data),
  });

  const update = useMutation({
    mutationFn: (patch: object) => axios.patch(`${BASE}/api/camp-services/tours/${id}`, patch).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["camp-tour-detail", id] });
      toast({ title: "Tour service updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update" }),
  });

  if (isLoading) return <div className="p-6 space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;
  if (!data) return <div className="p-6 text-[#57534E]">Tour service not found.</div>;

  const sc = STATUS_COLORS[data.status] ?? { bg: "#F4F3F1", color: "#57534E" };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E6E2] px-6 py-4">
        <div className="flex items-center gap-3 mb-3">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-[#57534E]" onClick={() => navigate(`/admin/camp-contracts/${data.contractId}`)}>
            <ArrowLeft className="w-3 h-3" /> Camp Contract
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FEF0E3] flex items-center justify-center">
            <Map className="w-5 h-5 text-[#F5821F]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#1C1917]">{data.tourName ?? "Tour / Activity"}</h1>
            <p className="text-sm text-[#57534E]">{data.contract?.contractNumber ?? "—"} · {data.contract?.studentName ?? "—"}</p>
          </div>
          <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: sc.bg, color: sc.color }}>
            {(data.status ?? "pending").replace(/_/g, " ")}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 -mb-4">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors"
              style={activeTab === t.key
                ? { color: "#F5821F", borderBottom: "2px solid #F5821F", background: "transparent" }
                : { color: "#57534E", borderBottom: "2px solid transparent" }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto p-6">
        {activeTab === "overview" && (
          <OverviewTab record={data} canEdit={canEdit} onSave={(p) => update.mutate(p)} />
        )}
        {activeTab === "documents" && (
          <EntityDocumentsTab entityType="camp_tour" entityId={id!} mode="full" />
        )}
        {activeTab === "notes" && (
          <NotePanel entityType="camp_tour" entityId={id!} />
        )}
      </div>
    </div>
  );
}
