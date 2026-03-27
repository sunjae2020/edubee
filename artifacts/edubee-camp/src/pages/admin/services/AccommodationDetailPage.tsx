import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SystemInfoSection } from "@/components/shared/SystemInfoSection";
import axios from "axios";
import { ArrowLeft, Plus, HeartPulse, DollarSign, Home, Phone, MapPin, FileText, ExternalLink, X, RotateCcw, Save } from "lucide-react";
import { ContractPaymentsPanel } from "@/components/finance/ContractPaymentsPanel";
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
  contractId?: string | null;
  contractNumber?: string | null;
  clientName?: string | null;
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
  contractStatus?: string | null;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  contractTotalAmount?: string | null;
  contractCurrency?: string | null;
  contractPaidAmount?: string | null;
  contractBalanceAmount?: string | null;
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
  const [isDirty, setIsDirty] = useState(false);
  const [status, setStatus]   = useState(record.status ?? "searching");
  const [checkin, setCheckin] = useState(record.checkinDate ?? "");
  const [checkout, setCheckout] = useState(record.checkoutDate ?? "");
  const [weeklyRate, setWeeklyRate] = useState(record.weeklyRate ?? "");
  const [notes, setNotes]     = useState(record.notes ?? "");

  const mark = () => setIsDirty(true);

  const discard = () => {
    setStatus(record.status ?? "searching");
    setCheckin(record.checkinDate ?? "");
    setCheckout(record.checkoutDate ?? "");
    setWeeklyRate(record.weeklyRate ?? "");
    setNotes(record.notes ?? "");
    setIsDirty(false);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Client & Contract */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Client</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-stone-400">Name</span><span className="font-medium text-stone-800">{record.clientName ?? record.studentName ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Agent</span><span className="text-stone-600">{record.agentName ?? "—"}</span></div>
            <div className="flex justify-between items-center"><span className="text-stone-400">Contract #</span>
              {record.contractId ? (
                <button onClick={() => navigate(`/admin/crm/contracts/${record.contractId}`)}
                  className="font-mono text-xs text-[#F5821F] hover:underline flex items-center gap-1">
                  {record.contractNumber ?? "View"} <ExternalLink size={10} />
                </button>
              ) : <span className="font-mono text-xs text-stone-500">{record.contractNumber ?? "—"}</span>}
            </div>
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
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Booking Details</h3>
          {isDirty && (
            <div className="flex items-center gap-2">
              <button onClick={discard}
                className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 border border-stone-200 rounded-md px-2.5 py-1 transition-colors">
                <RotateCcw size={11} /> Discard
              </button>
              <button onClick={() => { onSave({ checkinDate: checkin || null, checkoutDate: checkout || null, weeklyRate: weeklyRate || null, status, notes }); setIsDirty(false); }}
                className="flex items-center gap-1 text-xs text-white rounded-md px-2.5 py-1 font-semibold"
                style={{ background: "#F5821F" }}>
                <Save size={11} /> Save Changes
              </button>
            </div>
          )}
        </div>
        {isDirty && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 flex items-center gap-1.5">
            <span className="text-amber-500">●</span>
            Unsaved changes — click <strong className="mx-0.5">Save Changes</strong> to apply.
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Check-in Date</Label>
            <Input type="date" value={checkin} onChange={e => { setCheckin(e.target.value); mark(); }} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Check-out Date</Label>
            <Input type="date" value={checkout} onChange={e => { setCheckout(e.target.value); mark(); }} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Weekly Rate ($)</Label>
            <Input type="number" value={weeklyRate} onChange={e => { setWeeklyRate(e.target.value); mark(); }} className="h-9 text-sm" placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Status</Label>
            <Select value={status} onValueChange={v => { setStatus(v); mark(); }}>
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
            <Textarea value={notes} onChange={e => { setNotes(e.target.value); mark(); }} className="text-sm min-h-[36px] resize-none" />
          </div>
        </div>
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

// ─── Host Tab ─────────────────────────────────────────────────────────────────
function HostTab({ record, onSave }: { record: AccomDetail; onSave: (p: object) => void }) {
  const [isDirty,           setIsDirty]           = useState(false);
  const [hostName,          setHostName]           = useState(record.hostName          ?? "");
  const [hostContact,       setHostContact]        = useState(record.hostContact       ?? "");
  const [hostAddress,       setHostAddress]        = useState(record.hostAddress       ?? "");
  const [distanceToSchool,  setDistanceToSchool]   = useState(record.distanceToSchool  ?? "");
  const [mealIncluded,      setMealIncluded]       = useState(record.mealIncluded      ?? "");
  const [roomType,          setRoomType]           = useState(record.roomType          ?? "");
  const [accommodationType, setAccommodationType]  = useState(record.accommodationType ?? "");
  const [partnerWeeklyCost, setPartnerWeeklyCost]  = useState(record.partnerWeeklyCost ?? "");

  const mark = () => setIsDirty(true);

  const discard = () => {
    setHostName(record.hostName ?? "");
    setHostContact(record.hostContact ?? "");
    setHostAddress(record.hostAddress ?? "");
    setDistanceToSchool(record.distanceToSchool ?? "");
    setMealIncluded(record.mealIncluded ?? "");
    setRoomType(record.roomType ?? "");
    setAccommodationType(record.accommodationType ?? "");
    setPartnerWeeklyCost(record.partnerWeeklyCost ?? "");
    setIsDirty(false);
  };

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Home size={16} style={{ color: "#F5821F" }} />
          <h3 className="text-sm font-bold text-stone-800">Host Family Information</h3>
        </div>
        {isDirty && (
          <div className="flex items-center gap-2">
            <button onClick={discard}
              className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 border border-stone-200 rounded-md px-2.5 py-1 transition-colors">
              <RotateCcw size={11} /> Discard
            </button>
            <button onClick={() => { onSave({ hostName: hostName || null, hostContact: hostContact || null, hostAddress: hostAddress || null, distanceToSchool: distanceToSchool || null, mealIncluded: mealIncluded || null, roomType: roomType || null, accommodationType: accommodationType || null, partnerWeeklyCost: partnerWeeklyCost || null }); setIsDirty(false); }}
              className="flex items-center gap-1 text-xs text-white rounded-md px-2.5 py-1 font-semibold"
              style={{ background: "#F5821F" }}>
              <Save size={11} /> Save Changes
            </button>
          </div>
        )}
      </div>

      {isDirty && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 flex items-center gap-1.5">
          <span className="text-amber-500">●</span>
          Unsaved changes — click <strong className="mx-0.5">Save Changes</strong> to apply.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-600">Host Name</Label>
          <Input value={hostName} onChange={e => { setHostName(e.target.value); mark(); }} className="h-9 text-sm" placeholder="Host family name" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-600 flex items-center gap-1"><Phone size={10} />Contact</Label>
          <Input value={hostContact} onChange={e => { setHostContact(e.target.value); mark(); }} className="h-9 text-sm" placeholder="Phone / Email" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs text-stone-600 flex items-center gap-1"><MapPin size={10} />Address</Label>
          <Input value={hostAddress} onChange={e => { setHostAddress(e.target.value); mark(); }} className="h-9 text-sm" placeholder="Full address" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-600">Distance to School</Label>
          <Input value={distanceToSchool} onChange={e => { setDistanceToSchool(e.target.value); mark(); }} className="h-9 text-sm" placeholder="e.g. 2.5 km" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-600">Accommodation Type</Label>
          <Select value={accommodationType || "_none"} onValueChange={v => { setAccommodationType(v === "_none" ? "" : v); mark(); }}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">— Not set —</SelectItem>
              {["homestay", "private_rental", "student_residence", "shared_house"].map(t => (
                <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-600">Room Type</Label>
          <Select value={roomType || "_none"} onValueChange={v => { setRoomType(v === "_none" ? "" : v); mark(); }}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">— Not set —</SelectItem>
              {["single", "shared", "ensuite", "studio"].map(t => (
                <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-600">Meal Included</Label>
          <Select value={mealIncluded || "_none"} onValueChange={v => { setMealIncluded(v === "_none" ? "" : v); mark(); }}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">— Not set —</SelectItem>
              {["none", "breakfast", "half_board", "full_board"].map(t => (
                <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-600">Partner Weekly Cost ($)</Label>
          <Input type="number" value={partnerWeeklyCost} onChange={e => { setPartnerWeeklyCost(e.target.value); mark(); }} className="h-9 text-sm" placeholder="0.00" />
        </div>
      </div>
    </div>
  );
}

// ─── Billing Tab ──────────────────────────────────────────────────────────────
function BillingTab({ record, onEditRates }: { record: AccomDetail; onEditRates: () => void }) {
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Stay Duration", value: nights > 0 ? `${nights} nights (${weeks.toFixed(1)} wks)` : "—", icon: <Home size={16} />, color: "#F5821F", bg: "#FEF0E3" },
          { label: "Charge to Client", value: total, icon: <DollarSign size={16} />, color: "#16A34A", bg: "#DCFCE7" },
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

      <div className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-xl p-4">
        <div>
          <p className="text-xs text-stone-400 mb-1 font-semibold uppercase tracking-wide">Formula</p>
          <p className="text-xs text-stone-600 font-mono">
            Total = (nights ÷ 7) × weekly rate = {nights > 0 ? `(${nights} ÷ 7) × $${parseFloat(record.weeklyRate ?? "0").toLocaleString()} = ${total}` : "dates not set"}
          </p>
        </div>
        <button
          onClick={onEditRates}
          className="flex items-center gap-1.5 text-xs font-medium text-[#F5821F] hover:underline shrink-0 ml-4"
        >
          <Pencil size={12} /> Edit Rates
        </button>
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
    { key: "details",   label: "Details"        },
    { key: "host",      label: "Host Family"    },
    { key: "welfare",   label: "Welfare Checks" },
    { key: "billing",   label: "Billing"        },
    { key: "payments",  label: "Payments"       },
    { key: "notes",     label: "Notes"          },
  ] as const;

  return (
    <div className="p-6 space-y-5">
      <button onClick={() => navigate("/admin/services/accommodation")}
        className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
        <ArrowLeft size={15} /> Back to Accommodation
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{record.clientName ?? record.studentName ?? "—"}</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {record.hostName ?? "No host assigned"}{record.accommodationType ? ` · ${record.accommodationType.replace(/_/g, " ")}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1 rounded-full text-sm font-medium capitalize"
            style={{ background: "#F4F3F1", color: "#57534E" }}>
            {record.status?.replace(/_/g, " ") ?? "—"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTab("host")}
            className="flex items-center gap-1.5 h-8 text-sm border-stone-300"
          >
            <Pencil size={13} /> Edit Host
          </Button>
        </div>
      </div>

      {/* Related Contract + Financial Summary */}
      {record.contractId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileText size={14} style={{ color: "#F5821F" }} />
              <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500">Related Contract</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Contract #</span>
                <button
                  onClick={() => navigate(`/admin/crm/contracts/${record.contractId}`)}
                  className="flex items-center gap-1 font-mono text-xs text-[#F5821F] hover:underline font-semibold"
                >
                  {record.contractNumber ?? "View"} <ExternalLink size={10} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Status</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
                  style={{ background: "#F4F3F1", color: "#57534E" }}>
                  {record.contractStatus ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Period</span>
                <span className="text-stone-600 text-xs">{fmtDate(record.contractStartDate)} → {fmtDate(record.contractEndDate)}</span>
              </div>
            </div>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign size={14} style={{ color: "#F5821F" }} />
              <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500">Financial Summary</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Weekly Rate</span>
                <span className="font-semibold text-stone-800">
                  {record.weeklyRate ? `$${Number(record.weeklyRate).toLocaleString("en-AU", { minimumFractionDigits: 2 })}/wk` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Contract Value</span>
                <span className="font-semibold text-stone-800">
                  {record.contractTotalAmount ? `${record.contractCurrency ?? "AUD"} ${Number(record.contractTotalAmount).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Paid / Balance</span>
                <span className="text-xs">
                  <span className="text-[#16A34A] font-medium">{record.contractPaidAmount ? `$${Number(record.contractPaidAmount).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—"}</span>
                  <span className="text-stone-300 mx-1">/</span>
                  <span className="text-[#DC2626] font-medium">{record.contractBalanceAmount ? `$${Number(record.contractBalanceAmount).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—"}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-200 overflow-x-auto">
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
      {tab === "host" && <HostTab record={record} onSave={p => patchMutation.mutate(p)} />}
      {tab === "welfare" && <WelfareTab record={record} id={id!} />}
      {tab === "billing" && <BillingTab record={record} onEditRates={() => setTab("details")} />}
      {tab === "payments" && (
        <ContractPaymentsPanel
          contractId={record.contractId}
          contractNumber={record.contractNumber}
        />
      )}
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
      <SystemInfoSection owner={record.clientId ?? null} createdAt={record.createdAt} updatedAt={record.updatedAt} />
    </div>
  );
}
