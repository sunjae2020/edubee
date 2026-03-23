import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ArrowLeft, Plus, HeartPulse, DollarSign, Home, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { NotePanel } from "@/components/shared/NotePanel";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface WelfareCheck {
  date: string;
  staff?: string | null;
  notes?: string | null;
  status: string;
}

interface AccomDetail {
  id: string;
  contractNumber?: string | null;
  studentName?: string | null;
  agentName?: string | null;
  accommodationType?: string | null;
  hostName?: string | null;
  hostAddress?: string | null;
  hostContact?: string | null;
  distanceToSchool?: string | null;
  checkinDate?: string | null;
  checkoutDate?: string | null;
  weeklyRate?: string | null;
  partnerWeeklyCost?: string | null;
  mealIncluded?: string | null;
  roomType?: string | null;
  welfareCheckDates?: WelfareCheck[] | null;
  relocationReason?: string | null;
  status?: string | null;
  notes?: string | null;
  staffFirstName?: string | null;
  staffLastName?: string | null;
}

const WELFARE_STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  "OK":              { bg: "#DCFCE7", text: "#16A34A" },
  "Concern":         { bg: "#FEF9C3", text: "#CA8A04" },
  "Action Required": { bg: "#FEF2F2", text: "#DC2626" },
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d; }
}

function calcTotal(checkin?: string | null, checkout?: string | null, weeklyRate?: string | null): string {
  if (!checkin || !checkout || !weeklyRate) return "—";
  try {
    const days  = differenceInCalendarDays(parseISO(checkout), parseISO(checkin));
    const weeks = days / 7;
    const total = weeks * parseFloat(weeklyRate);
    return `$${total.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } catch { return "—"; }
}

// ─── Add Welfare Check Modal ──────────────────────────────────────────────────
function AddWelfareModal({
  onSave,
  onClose,
}: {
  onSave: (check: { date: string; staff: string; notes: string; status: string }) => void;
  onClose: () => void;
}) {
  const [date,   setDate]   = useState(format(new Date(), "yyyy-MM-dd"));
  const [staff,  setStaff]  = useState("");
  const [notes,  setNotes]  = useState("");
  const [status, setStatus] = useState("OK");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center gap-2">
          <HeartPulse size={16} className="text-[#F5821F]" />
          <h3 className="text-base font-bold text-stone-800">Add Welfare Check</h3>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Staff</Label>
            <Input value={staff} onChange={e => setStaff(e.target.value)} className="h-9 text-sm" placeholder="Staff name" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OK">OK</SelectItem>
                <SelectItem value="Concern">Concern</SelectItem>
                <SelectItem value="Action Required">Action Required</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="text-sm min-h-[70px] resize-none" placeholder="Welfare notes…" />
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <Button
            onClick={() => { onSave({ date, staff, notes, status }); }}
            className="flex-1 text-white" style={{ background: "#F5821F" }}
            disabled={!date}
          >
            Save Check
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Details Tab ──────────────────────────────────────────────────────────────
function DetailsTab({ record, onSave }: { record: AccomDetail; onSave: (p: object) => void }) {
  const [status, setStatus]   = useState(record.status ?? "searching");
  const [checkin, setCheckin] = useState(record.checkinDate ?? "");
  const [checkout, setCheckout] = useState(record.checkoutDate ?? "");
  const [weeklyRate, setWeeklyRate] = useState(record.weeklyRate ?? "");
  const [notes, setNotes]     = useState(record.notes ?? "");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-5">
        {/* Student & Contract */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Student</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-stone-400">Name</span><span className="font-medium text-stone-800">{record.studentName ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Agent</span><span className="text-stone-600">{record.agentName ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Contract</span><span className="font-mono text-xs text-stone-500">{record.contractNumber ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Staff</span><span className="text-stone-600">{record.staffFirstName ? `${record.staffFirstName} ${record.staffLastName ?? ""}`.trim() : "—"}</span></div>
          </div>
        </div>

        {/* Host */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Host / Provider</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-stone-400">Name</span><span className="font-medium text-stone-800">{record.hostName ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Contact</span><span className="text-stone-600">{record.hostContact ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Address</span><span className="text-stone-600 text-xs text-right max-w-[160px] leading-snug">{record.hostAddress ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">To School</span><span className="text-stone-600">{record.distanceToSchool ?? "—"}</span></div>
          </div>
        </div>
      </div>

      {/* Editable fields */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Booking Details</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Check-in Date</Label>
            <Input type="date" value={checkin} onChange={e => setCheckin(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Check-out Date</Label>
            <Input type="date" value={checkout} onChange={e => setCheckout(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Weekly Rate ($)</Label>
            <Input type="number" value={weeklyRate} onChange={e => setWeeklyRate(e.target.value)} className="h-9 text-sm" placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["searching", "confirmed", "checked_in", "checked_out", "cancelled"].map(s => (
                  <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs text-stone-600">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="text-sm min-h-[36px] resize-none" />
          </div>
        </div>
        <Button onClick={() => onSave({ checkinDate: checkin || null, checkoutDate: checkout || null, weeklyRate: weeklyRate || null, status, notes })}
          className="text-white" style={{ background: "#F5821F" }}>
          Save Details
        </Button>
      </div>
    </div>
  );
}

// ─── Welfare Checks Tab ───────────────────────────────────────────────────────
function WelfareTab({ record, id }: { record: AccomDetail; id: string }) {
  const [showAdd, setShowAdd] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const checks: WelfareCheck[] = (record.welfareCheckDates as WelfareCheck[] | null) ?? [];
  const sorted = [...checks].sort((a, b) => b.date.localeCompare(a.date));

  const addMutation = useMutation({
    mutationFn: (check: { date: string; staff: string; notes: string; status: string }) =>
      axios.post(`${BASE}/api/services/accommodation/${id}/welfare-check`, check).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accommodation-detail", id] });
      qc.invalidateQueries({ queryKey: ["accommodation-all"] });
      toast({ title: "Welfare check recorded" });
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-700">Welfare Check History ({checks.length})</h3>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-[#F5821F] hover:underline">
          <Plus size={13} /> Add Welfare Check
        </button>
      </div>

      {sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center h-32 text-stone-400 text-sm gap-2">
          <HeartPulse size={22} />
          <span>No welfare checks recorded yet</span>
        </div>
      )}

      <div className="space-y-3">
        {sorted.map((check, i) => {
          const style = WELFARE_STATUS_STYLE[check.status] ?? { bg: "#F4F3F1", text: "#57534E" };
          return (
            <div key={i} className="bg-white border border-stone-200 rounded-xl p-4 flex items-start gap-4">
              <div className="shrink-0 flex flex-col items-center gap-1">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: style.bg, color: style.text }}>
                  <HeartPulse size={16} />
                </div>
                {i < sorted.length - 1 && <div className="w-px h-full min-h-[20px] bg-stone-200" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-stone-800">{fmtDate(check.date)}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: style.bg, color: style.text }}>
                    {check.status}
                  </span>
                </div>
                {check.staff && <p className="text-xs text-stone-500 mb-1">By: {check.staff}</p>}
                {check.notes && <p className="text-sm text-stone-700">{check.notes}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <AddWelfareModal
          onSave={check => { addMutation.mutate(check); setShowAdd(false); }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

// ─── Billing Tab ──────────────────────────────────────────────────────────────
function BillingTab({ record }: { record: AccomDetail }) {
  const total = calcTotal(record.checkinDate, record.checkoutDate, record.weeklyRate);

  let nights = 0;
  let weeks  = 0;
  try {
    if (record.checkinDate && record.checkoutDate) {
      nights = differenceInCalendarDays(parseISO(record.checkoutDate), parseISO(record.checkinDate));
      weeks  = nights / 7;
    }
  } catch {}

  const partnerCost = weeks && record.partnerWeeklyCost
    ? `$${(weeks * parseFloat(record.partnerWeeklyCost)).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";

  const revenue = weeks && record.weeklyRate && record.partnerWeeklyCost
    ? `$${(weeks * (parseFloat(record.weeklyRate) - parseFloat(record.partnerWeeklyCost))).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Stay Duration", value: nights > 0 ? `${nights} nights (${weeks.toFixed(1)} wks)` : "—", icon: <Home size={16} />, color: "#F5821F", bg: "#FEF0E3" },
          { label: "Charge to Student", value: total, icon: <DollarSign size={16} />, color: "#16A34A", bg: "#DCFCE7" },
          { label: "Partner Cost", value: partnerCost, icon: <DollarSign size={16} />, color: "#CA8A04", bg: "#FEF9C3" },
        ].map(card => (
          <div key={card.label} className="bg-white border border-stone-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: card.bg, color: card.color }}>
              {card.icon}
            </div>
            <div>
              <p className="text-xl font-bold text-stone-800">{card.value}</p>
              <p className="text-xs text-stone-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              {["Item", "Rate", "Qty", "Amount"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-stone-100">
              <td className="px-4 py-3 text-stone-800 font-medium">Accommodation ({record.accommodationType?.replace(/_/g, " ") ?? ""})</td>
              <td className="px-4 py-3 text-stone-600">{record.weeklyRate ? `$${parseFloat(record.weeklyRate).toLocaleString()}/wk` : "—"}</td>
              <td className="px-4 py-3 text-stone-600">{weeks > 0 ? `${weeks.toFixed(2)} wks` : "—"}</td>
              <td className="px-4 py-3 font-semibold text-stone-800">{total}</td>
            </tr>
            <tr className="border-b border-stone-100">
              <td className="px-4 py-3 text-stone-500">Partner Cost</td>
              <td className="px-4 py-3 text-stone-500">{record.partnerWeeklyCost ? `$${parseFloat(record.partnerWeeklyCost).toLocaleString()}/wk` : "—"}</td>
              <td className="px-4 py-3 text-stone-500">{weeks > 0 ? `${weeks.toFixed(2)} wks` : "—"}</td>
              <td className="px-4 py-3 text-stone-500">{partnerCost}</td>
            </tr>
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right font-bold text-stone-700">Gross Margin</td>
              <td className="px-4 py-3 font-bold" style={{ color: "#16A34A" }}>{revenue}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
        <p className="text-xs text-stone-400 mb-2 font-semibold uppercase tracking-wide">Formula</p>
        <p className="text-xs text-stone-600 font-mono">
          Total = (nights ÷ 7) × weekly rate = {nights > 0 ? `(${nights} ÷ 7) × $${parseFloat(record.weeklyRate ?? "0").toLocaleString()} = ${total}` : "dates not set"}
        </p>
      </div>
    </div>
  );
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────
export default function AccommodationDetailPage() {
  const [, params]   = useRoute("/admin/services/accommodation/:id");
  const [, navigate] = useLocation();
  const { toast }    = useToast();
  const qc           = useQueryClient();
  const [tab, setTab] = useState<"details" | "welfare" | "billing" | "host" | "notes">("details");

  const id = params?.id;

  const { data: record, isLoading } = useQuery({
    queryKey: ["accommodation-detail", id],
    queryFn: () => axios.get(`${BASE}/api/services/accommodation/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const patchMutation = useMutation({
    mutationFn: (patch: object) =>
      axios.patch(`${BASE}/api/services/accommodation/${id}`, patch).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accommodation-detail", id] });
      qc.invalidateQueries({ queryKey: ["accommodation"] });
      qc.invalidateQueries({ queryKey: ["accommodation-all"] });
      toast({ title: "Saved successfully" });
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-stone-400 text-sm">Loading…</div>;
  if (!record)  return <div className="p-6 text-stone-500">Record not found.</div>;

  const TABS = [
    { key: "details", label: "Details"        },
    { key: "host",    label: "Host Family"    },
    { key: "welfare", label: "Welfare Checks" },
    { key: "billing", label: "Billing"        },
    { key: "notes",   label: "Notes"          },
  ] as const;

  return (
    <div className="p-6 space-y-5">
      <button onClick={() => navigate("/admin/services/accommodation")}
        className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
        <ArrowLeft size={15} /> Back to Accommodation
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{record.studentName ?? "—"}</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {record.hostName ?? "No host assigned"}{record.accommodationType ? ` · ${record.accommodationType.replace(/_/g, " ")}` : ""}
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-sm font-medium capitalize"
          style={{ background: "#F4F3F1", color: "#57534E" }}>
          {record.status?.replace(/_/g, " ") ?? "—"}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-200">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-[#F5821F] text-[#F5821F]" : "border-transparent text-stone-500 hover:text-stone-800"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "details" && <DetailsTab record={record} onSave={p => patchMutation.mutate(p)} />}
      {tab === "host" && (
        <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Home size={16} style={{ color: "#F5821F" }} />
            <h3 className="text-sm font-bold text-stone-800">Host Family Information</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400 mb-1">Host Name</p>
              <p className="text-sm text-stone-800">{record.hostName ?? <span className="text-stone-400 italic">Not assigned</span>}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400 mb-1 flex items-center gap-1"><Phone size={10} /> Contact</p>
              <p className="text-sm text-stone-800">{record.hostContact ?? "—"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400 mb-1 flex items-center gap-1"><MapPin size={10} /> Address</p>
              <p className="text-sm text-stone-800">{record.hostAddress ?? "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400 mb-1">Distance to School</p>
              <p className="text-sm text-stone-800">{record.distanceToSchool ?? "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400 mb-1">Meal Included</p>
              <p className="text-sm text-stone-800 capitalize">{record.mealIncluded?.replace(/_/g, " ") ?? "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400 mb-1">Room Type</p>
              <p className="text-sm text-stone-800 capitalize">{record.roomType?.replace(/_/g, " ") ?? "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400 mb-1">Weekly Rate</p>
              <p className="text-sm font-semibold" style={{ color: "#F5821F" }}>
                {record.weeklyRate ? `A$${Number(record.weeklyRate).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—"}
              </p>
            </div>
          </div>
        </div>
      )}
      {tab === "welfare" && <WelfareTab record={record} id={id!} />}
      {tab === "billing" && <BillingTab record={record} />}
      {tab === "notes" && id && (
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-stone-800 mb-4">Activity Notes</h3>
          <NotePanel
            entityType="accommodation_mgt"
            entityId={id}
            allowedNoteTypes={["internal"]}
            defaultVisibility="internal"
          />
        </div>
      )}
    </div>
  );
}
