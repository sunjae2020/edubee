import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { DetailPageLayout, DetailSection, DetailRow, EditableField } from "@/components/shared/DetailPageLayout";
import { useDetailEdit } from "@/hooks/useDetailEdit";
import { ArTimeline } from "@/components/shared/ArTimeline";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { NotePanel } from "@/components/shared/NotePanel";
import EntityDocumentsTab from "@/components/shared/EntityDocumentsTab";
import { ParticipantEditDialog, ParticipantAddDialog } from "@/components/shared/ParticipantDialogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Plus, Loader2, School, Hotel, Car, Map } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CONTRACT_STATUSES = ["draft", "sent", "signed", "active", "completed", "cancelled", "suspended"];
const CURRENCIES = ["AUD", "USD", "KRW", "JPY", "THB", "PHP", "SGD", "GBP"];
const CURRENCY_SYMBOLS: Record<string, string> = { AUD: "A$", USD: "$", KRW: "₩", JPY: "¥", THB: "฿", PHP: "₱", SGD: "S$", GBP: "£" };
const SERVICE_STATUSES = ["pending", "confirmed", "active", "in_progress", "completed", "cancelled"];
const PICKUP_TYPES = ["airport_pickup", "airport_dropoff", "hotel_to_school", "school_to_hotel", "custom"];
const ENGLISH_LEVELS_SVC = ["beginner", "elementary", "pre_intermediate", "intermediate", "upper_intermediate", "advanced", "proficient"];

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "participants", label: "Participants" },
  { key: "services", label: "Services" },
  { key: "accounting", label: "Accounting" },
  { key: "documents", label: "Documents" },
  { key: "notes", label: "Notes" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600", sent: "bg-blue-100 text-blue-700",
  signed: "bg-orange-100 text-orange-700", active: "bg-green-100 text-green-700",
  completed: "bg-teal-100 text-teal-700", cancelled: "bg-red-100 text-red-700",
  suspended: "bg-yellow-100 text-yellow-700", pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700", in_progress: "bg-purple-100 text-purple-700",
};

// ─── Service Edit Dialogs ─────────────────────────────────────────────────────
function InstituteEditDialog({ data, contractId, open, onClose, onSave, saving }: {
  data: any; contractId: string; open: boolean; onClose: () => void;
  onSave: (d: Record<string, any>) => void; saving: boolean;
}) {
  const [form, setForm] = useState({
    programDetails: data?.programDetails ?? "",
    startDate: data?.startDate ?? "",
    endDate: data?.endDate ?? "",
    totalHours: String(data?.totalHours ?? ""),
    englishLevelStart: data?.englishLevelStart ?? "__none",
    englishLevelEnd: data?.englishLevelEnd ?? "__none",
    status: data?.status ?? "confirmed",
    progressNotes: data?.progressNotes ?? "",
    teacherComments: data?.teacherComments ?? "",
  });
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }));
  const handleSave = () => {
    const d = { ...form };
    if (d.englishLevelStart === "__none") d.englishLevelStart = "";
    if (d.englishLevelEnd === "__none") d.englishLevelEnd = "";
    onSave(d);
  };
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <School className="w-4 h-4 text-[#F5821F]" /> Edit Language School Service
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Program Details</Label>
            <Input value={form.programDetails} onChange={e => f("programDetails")(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Start Date</Label>
            <Input type="date" value={form.startDate} onChange={e => f("startDate")(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">End Date</Label>
            <Input type="date" value={form.endDate} onChange={e => f("endDate")(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Total Hours</Label>
            <Input type="number" value={form.totalHours} onChange={e => f("totalHours")(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={f("status")}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{SERVICE_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">English Level — Start</Label>
            <Select value={form.englishLevelStart} onValueChange={f("englishLevelStart")}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                {ENGLISH_LEVELS_SVC.map(l => <SelectItem key={l} value={l}>{l.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">English Level — End</Label>
            <Select value={form.englishLevelEnd} onValueChange={f("englishLevelEnd")}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                {ENGLISH_LEVELS_SVC.map(l => <SelectItem key={l} value={l}>{l.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Progress Notes</Label>
            <Textarea value={form.progressNotes} onChange={e => f("progressNotes")(e.target.value)} className="text-sm min-h-[60px]" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Teacher Comments</Label>
            <Textarea value={form.teacherComments} onChange={e => f("teacherComments")(e.target.value)} className="text-sm min-h-[60px]" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t mt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HotelEditDialog({ data, contractId, open, onClose, onSave, saving }: {
  data: any; contractId: string; open: boolean; onClose: () => void;
  onSave: (d: Record<string, any>) => void; saving: boolean;
}) {
  const [form, setForm] = useState({
    roomType: data?.roomType ?? "",
    checkinDate: data?.checkinDate ?? "",
    checkinTime: data?.checkinTime ?? "",
    checkoutDate: data?.checkoutDate ?? "",
    checkoutTime: data?.checkoutTime ?? "",
    confirmationNo: data?.confirmationNo ?? "",
    guestNotes: data?.guestNotes ?? "",
    status: data?.status ?? "confirmed",
  });
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hotel className="w-4 h-4 text-[#F5821F]" /> Edit Accommodation Service
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Room Type</Label>
            <Input value={form.roomType} onChange={e => f("roomType")(e.target.value)} className="h-8 text-sm" placeholder="e.g. Twin shared, Single en-suite" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Check-in Date</Label>
            <Input type="date" value={form.checkinDate} onChange={e => f("checkinDate")(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Check-in Time</Label>
            <Input type="time" value={form.checkinTime} onChange={e => f("checkinTime")(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Check-out Date</Label>
            <Input type="date" value={form.checkoutDate} onChange={e => f("checkoutDate")(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Check-out Time</Label>
            <Input type="time" value={form.checkoutTime} onChange={e => f("checkoutTime")(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Confirmation Number</Label>
            <Input value={form.confirmationNo} onChange={e => f("confirmationNo")(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={f("status")}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{SERVICE_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Guest Notes</Label>
            <Textarea value={form.guestNotes} onChange={e => f("guestNotes")(e.target.value)} className="text-sm min-h-[60px]" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t mt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5" onClick={() => onSave(form)} disabled={saving}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PickupEditDialog({ data, contractId, open, onClose, onSave, saving }: {
  data: any; contractId: string; open: boolean; onClose: () => void;
  onSave: (d: Record<string, any>) => void; saving: boolean;
}) {
  const [form, setForm] = useState({
    pickupType: data?.pickupType ?? "airport_pickup",
    fromLocation: data?.fromLocation ?? "",
    toLocation: data?.toLocation ?? "",
    pickupDatetime: data?.pickupDatetime ? new Date(data.pickupDatetime).toISOString().slice(0, 16) : "",
    vehicleInfo: data?.vehicleInfo ?? "",
    driverNotes: data?.driverNotes ?? "",
    status: data?.status ?? "confirmed",
  });
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="w-4 h-4 text-[#F5821F]" /> Edit Airport Transfer Service
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Pickup Type</Label>
            <Select value={form.pickupType} onValueChange={f("pickupType")}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{PICKUP_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Date & Time</Label>
            <Input type="datetime-local" value={form.pickupDatetime} onChange={e => f("pickupDatetime")(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From Location</Label>
            <Input value={form.fromLocation} onChange={e => f("fromLocation")(e.target.value)} className="h-8 text-sm" placeholder="e.g. Sydney Airport T1" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To Location</Label>
            <Input value={form.toLocation} onChange={e => f("toLocation")(e.target.value)} className="h-8 text-sm" placeholder="e.g. Host family address" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Vehicle Info</Label>
            <Input value={form.vehicleInfo} onChange={e => f("vehicleInfo")(e.target.value)} className="h-8 text-sm" placeholder="e.g. White Toyota Hiace" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={f("status")}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{SERVICE_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Driver Notes</Label>
            <Textarea value={form.driverNotes} onChange={e => f("driverNotes")(e.target.value)} className="text-sm min-h-[60px]" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t mt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5" onClick={() => onSave(form)} disabled={saving}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TourEditDialog({ data, contractId, open, onClose, onSave, saving }: {
  data: any; contractId: string; open: boolean; onClose: () => void;
  onSave: (d: Record<string, any>) => void; saving: boolean;
}) {
  const [form, setForm] = useState({
    tourName: data?.tourName ?? "",
    tourDate: data?.tourDate ?? "",
    startTime: data?.startTime ?? "",
    endTime: data?.endTime ?? "",
    meetingPoint: data?.meetingPoint ?? "",
    highlights: data?.highlights ?? "",
    guideInfo: data?.guideInfo ?? "",
    tourNotes: data?.tourNotes ?? "",
    status: data?.status ?? "confirmed",
  });
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Map className="w-4 h-4 text-[#F5821F]" /> Edit Tour / Activity Service
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Tour Name</Label>
            <Input value={form.tourName} onChange={e => f("tourName")(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tour Date</Label>
            <Input type="date" value={form.tourDate} onChange={e => f("tourDate")(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={f("status")}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{SERVICE_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Start Time</Label>
            <Input type="time" value={form.startTime} onChange={e => f("startTime")(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">End Time</Label>
            <Input type="time" value={form.endTime} onChange={e => f("endTime")(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Meeting Point</Label>
            <Input value={form.meetingPoint} onChange={e => f("meetingPoint")(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Highlights</Label>
            <Input value={form.highlights} onChange={e => f("highlights")(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Guide Info</Label>
            <Input value={form.guideInfo} onChange={e => f("guideInfo")(e.target.value)} className="h-8 text-sm" placeholder="Guide name, contact, etc." />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Tour Notes</Label>
            <Textarea value={form.tourNotes} onChange={e => f("tourNotes")(e.target.value)} className="text-sm min-h-[60px]" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t mt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5" onClick={() => onSave(form)} disabled={saving}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Editable Service Section Header ─────────────────────────────────────────
function ServiceSectionHeader({ title, icon, canEdit, onEdit }: {
  title: string; icon: React.ReactNode; canEdit: boolean; onEdit: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {title}
      </div>
      {canEdit && (
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={onEdit}>
          <Pencil className="w-3 h-3" /> Edit
        </Button>
      )}
    </div>
  );
}

// ─── Participants Table ───────────────────────────────────────────────────────
function ParticipantsTab({
  applicationId,
  contractId,
  canEdit,
}: {
  applicationId: string | null;
  contractId: string;
  canEdit: boolean;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editParticipant, setEditParticipant] = useState<any | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["contract-participants", applicationId],
    queryFn: () => axios.get(`${BASE}/api/applications/${applicationId}`).then(r => r.data),
    enabled: !!applicationId,
  });

  const participants: any[] = (data?.participants ?? data?.data?.participants ?? []);

  const updateParticipant = useMutation({
    mutationFn: ({ pid, d }: { pid: string; d: Record<string, any> }) =>
      axios.patch(`${BASE}/api/applications/participants/${pid}`, d).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-participants", applicationId] });
      toast({ title: "Participant updated" });
      setEditParticipant(null);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update participant" }),
  });

  const createParticipant = useMutation({
    mutationFn: (d: Record<string, any>) =>
      axios.post(`${BASE}/api/applications/participants`, { ...d, applicationId }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-participants", applicationId] });
      toast({ title: "Participant added" });
      setAddOpen(false);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to add participant" }),
  });

  if (!applicationId) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        This contract is not linked to an application. Participants come from the linked application.
      </div>
    );
  }

  return (
    <>
      {canEdit && (
        <div className="flex justify-end mb-3">
          <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Participant
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                <th className="px-4 py-2.5 text-left w-8">#</th>
                <th className="px-4 py-2.5 text-left">Name</th>
                <th className="px-4 py-2.5 text-left">Type</th>
                <th className="px-4 py-2.5 text-left">DOB</th>
                <th className="px-4 py-2.5 text-left">Gender</th>
                <th className="px-4 py-2.5 text-left">Nationality</th>
                <th className="px-4 py-2.5 text-left">Grade</th>
                <th className="px-4 py-2.5 text-left">Passport #</th>
                {canEdit && <th className="px-4 py-2.5 w-10" />}
              </tr>
            </thead>
            <tbody>
              {participants.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 9 : 8} className="px-4 py-8 text-center text-muted-foreground text-xs">
                    No participants on this contract's application.
                  </td>
                </tr>
              ) : participants.map((p: any, i: number) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-[#FEF0E3] transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.fullName ?? "—"}</div>
                    {p.fullNameNative && <div className="text-xs text-muted-foreground">{p.fullNameNative}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-1.5 py-0.5 bg-muted rounded text-xs capitalize">{p.participantType ?? "child"}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">{p.dateOfBirth ? format(new Date(p.dateOfBirth), "MMM d, yyyy") : "—"}</td>
                  <td className="px-4 py-3 capitalize text-sm">{p.gender ?? "—"}</td>
                  <td className="px-4 py-3 text-sm">{p.nationality ?? "—"}</td>
                  <td className="px-4 py-3 text-sm">{p.grade ?? "—"}</td>
                  <td className="px-4 py-3 text-sm font-mono text-xs text-muted-foreground">{p.passportNumber ?? "—"}</td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditParticipant(p)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editParticipant && (
        <ParticipantEditDialog
          participant={editParticipant}
          open={!!editParticipant}
          onClose={() => setEditParticipant(null)}
          onSave={(d) => updateParticipant.mutate({ pid: editParticipant.id, d })}
          saving={updateParticipant.isPending}
        />
      )}

      <ParticipantAddDialog
        applicationId={applicationId}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(d) => createParticipant.mutate(d)}
        saving={createParticipant.isPending}
      />
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Service edit state
  const [editInstitute, setEditInstitute] = useState(false);
  const [editHotel, setEditHotel] = useState(false);
  const [editPickup, setEditPickup] = useState(false);
  const [editTour, setEditTour] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["contract-detail-page", id],
    queryFn: () => axios.get(`${BASE}/api/contracts/${id}`).then(r => r.data),
  });

  const { data: servicesData, refetch: refetchServices } = useQuery({
    queryKey: ["contract-services-page", id],
    queryFn: () => axios.get(`${BASE}/api/contracts/${id}/services`).then(r => r.data),
    enabled: activeTab === "services",
  });

  const { data: accountingData } = useQuery({
    queryKey: ["contract-accounting-page", id],
    queryFn: () => axios.get(`${BASE}/api/contracts/${id}/accounting`).then(r => r.data),
    enabled: activeTab === "accounting",
  });

  const contract = data?.data ?? data;
  const servicesObj = servicesData ?? null;
  const accounting = accountingData?.data ?? accountingData;

  const canEdit = ["super_admin", "admin", "camp_coordinator"].includes(user?.role ?? "");

  const updateContract = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      axios.put(`${BASE}/api/contracts/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-detail-page", id] });
      qc.invalidateQueries({ queryKey: ["contracts"] });
      toast({ title: "Contract updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update" }),
  });

  const updateInstitute = useMutation({
    mutationFn: (payload: Record<string, any>) =>
      axios.patch(`${BASE}/api/contracts/${id}/services/institute`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-services-page", id] });
      toast({ title: "Language school service updated" });
      setEditInstitute(false);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update service" }),
  });

  const updateHotel = useMutation({
    mutationFn: (payload: Record<string, any>) =>
      axios.patch(`${BASE}/api/contracts/${id}/services/hotel`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-services-page", id] });
      toast({ title: "Accommodation service updated" });
      setEditHotel(false);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update service" }),
  });

  const updatePickup = useMutation({
    mutationFn: (payload: Record<string, any>) =>
      axios.patch(`${BASE}/api/contracts/${id}/services/pickup`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-services-page", id] });
      toast({ title: "Airport transfer service updated" });
      setEditPickup(false);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update service" }),
  });

  const updateTour = useMutation({
    mutationFn: (payload: Record<string, any>) =>
      axios.patch(`${BASE}/api/contracts/${id}/services/tour`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-services-page", id] });
      toast({ title: "Tour / activity service updated" });
      setEditTour(false);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update service" }),
  });

  const { isEditing, isSaving, startEdit, cancelEdit, setField, saveEdit, getValue } = useDetailEdit({
    initialData: contract ?? {},
    onSave: async (data) => { await updateContract.mutateAsync(data); },
  });

  if (isLoading) return <div className="p-6 space-y-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (!contract) return <div className="p-6 text-muted-foreground">Contract not found.</div>;

  const fmtCcy = (amount: string | number | null, ccy = "AUD") =>
    amount ? `${CURRENCY_SYMBOLS[ccy] ?? ccy}${Number(amount).toLocaleString()}` : "—";

  const statusColor = STATUS_COLORS[contract.status ?? "draft"] ?? "bg-gray-100 text-gray-600";

  return (
    <>
      <DetailPageLayout
        title={contract.contractNumber ?? "Contract"}
        subtitle={contract.studentName ?? contract.application?.studentName ?? ""}
        badge={<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>{contract.status ?? "—"}</span>}
        backPath="/admin/contracts"
        backLabel="Contracts"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(t) => { setActiveTab(t); if (isEditing) cancelEdit(); }}
        canEdit={canEdit && activeTab === "overview"}
        isEditing={isEditing}
        isSaving={isSaving}
        onEdit={startEdit}
        onSave={saveEdit}
        onCancel={cancelEdit}
      >
        {/* ── Overview ── */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DetailSection title="Contract Info">
              <DetailRow label="Contract #" value={contract.contractNumber} />
              <EditableField label="Status" isEditing={isEditing} value={contract.status}
                editChildren={
                  <Select value={getValue("status")} onValueChange={v => setField("status", v)}>
                    <SelectTrigger className="h-8 text-sm border-[#F5821F]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONTRACT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                } />
              <EditableField label="Currency" isEditing={isEditing}
                value={contract.currency ?? "AUD"}
                editChildren={
                  <Select value={getValue("currency") ?? "AUD"} onValueChange={v => setField("currency", v)}>
                    <SelectTrigger className="h-8 text-sm border-[#F5821F]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => (
                        <SelectItem key={c} value={c}>{CURRENCY_SYMBOLS[c] ?? ""} {c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                } />
              <EditableField label="Total Amount" isEditing={isEditing}
                value={fmtCcy(contract.totalAmount, contract.currency)}
                editValue={getValue("totalAmount")} onEdit={v => setField("totalAmount", v)} type="number" />
              <EditableField label="Paid Amount" isEditing={isEditing}
                value={fmtCcy(contract.paidAmount, contract.currency)}
                editValue={getValue("paidAmount")} onEdit={v => setField("paidAmount", v)} type="number" />
              <DetailRow label="Balance">
                <span className="font-mono text-sm">
                  {fmtCcy(
                    isEditing
                      ? String(Number(getValue("totalAmount") ?? contract.totalAmount ?? 0) - Number(getValue("paidAmount") ?? contract.paidAmount ?? 0))
                      : String(Number(contract.totalAmount ?? 0) - Number(contract.paidAmount ?? 0)),
                    isEditing ? (getValue("currency") ?? contract.currency) : contract.currency
                  )}
                </span>
              </DetailRow>
            </DetailSection>

            <DetailSection title="Dates">
              <EditableField label="Start Date" isEditing={isEditing} value={contract.startDate ? format(new Date(contract.startDate), "PPP") : "—"}
                editValue={getValue("startDate")} onEdit={v => setField("startDate", v)} type="date" />
              <EditableField label="End Date" isEditing={isEditing} value={contract.endDate ? format(new Date(contract.endDate), "PPP") : "—"}
                editValue={getValue("endDate")} onEdit={v => setField("endDate", v)} type="date" />
              <EditableField label="Signed At" isEditing={isEditing} value={contract.signedAt ? format(new Date(contract.signedAt), "PPP") : "—"}
                editValue={getValue("signedAt")} onEdit={v => setField("signedAt", v)} type="date" />
              <DetailRow label="Created" value={contract.createdAt ? format(new Date(contract.createdAt), "PPP") : "—"} />
            </DetailSection>

            <DetailSection title="Student / Client">
              <EditableField label="Student Name" isEditing={isEditing}
                value={contract.studentName ?? contract.application?.studentName ?? "—"}
                editValue={getValue("studentName")} onEdit={v => setField("studentName", v)} />
              <EditableField label="Email" isEditing={isEditing}
                value={contract.clientEmail ?? contract.application?.clientEmail ?? "—"}
                editValue={getValue("clientEmail")} onEdit={v => setField("clientEmail", v)} type="email" />
              <EditableField label="Country" isEditing={isEditing}
                value={contract.clientCountry ?? "—"}
                editValue={getValue("clientCountry")} onEdit={v => setField("clientCountry", v)} />
            </DetailSection>

            <DetailSection title="Package">
              <EditableField label="Package Group" isEditing={isEditing}
                value={contract.packageGroupName ?? "—"}
                editValue={getValue("packageGroupName")} onEdit={v => setField("packageGroupName", v)} />
              <EditableField label="Package" isEditing={isEditing}
                value={contract.packageName ?? "—"}
                editValue={getValue("packageName")} onEdit={v => setField("packageName", v)} />
              <EditableField label="Agent" isEditing={isEditing}
                value={contract.agentName ?? "—"}
                editValue={getValue("agentName")} onEdit={v => setField("agentName", v)} />
              <EditableField label="Notes" isEditing={isEditing} value={contract.notes}
                editValue={getValue("notes")} onEdit={v => setField("notes", v)} />
            </DetailSection>
          </div>
        )}

        {/* ── Participants ── */}
        {activeTab === "participants" && (
          <ParticipantsTab
            applicationId={contract.applicationId ?? null}
            contractId={id!}
            canEdit={canEdit}
          />
        )}

        {/* ── Services ── */}
        {activeTab === "services" && (
          <div className="space-y-4">
            {!servicesObj ? (
              <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
            ) : (
              <>
                {servicesObj.institute && (
                  <div className="border rounded-xl p-4">
                    <ServiceSectionHeader title="Language School / Institute" icon={<School className="w-4 h-4 text-[#F5821F]" />} canEdit={canEdit} onEdit={() => setEditInstitute(true)} />
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                      <DetailRow label="Program" value={servicesObj.institute.programDetails} />
                      <DetailRow label="Start Date" value={servicesObj.institute.startDate ? format(new Date(servicesObj.institute.startDate), "PPP") : "—"} />
                      <DetailRow label="End Date" value={servicesObj.institute.endDate ? format(new Date(servicesObj.institute.endDate), "PPP") : "—"} />
                      <DetailRow label="Total Hours" value={servicesObj.institute.totalHours ? `${servicesObj.institute.totalHours} hrs` : "—"} />
                      <DetailRow label="English Level" value={servicesObj.institute.englishLevelStart ? `${servicesObj.institute.englishLevelStart} → ${servicesObj.institute.englishLevelEnd ?? "?"}` : "—"} />
                      <DetailRow label="Status">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[servicesObj.institute.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>{servicesObj.institute.status ?? "—"}</span>
                      </DetailRow>
                      {servicesObj.institute.progressNotes && <DetailRow label="Progress Notes" value={servicesObj.institute.progressNotes} />}
                      {servicesObj.institute.teacherComments && <DetailRow label="Teacher Comments" value={servicesObj.institute.teacherComments} />}
                    </div>
                  </div>
                )}

                {servicesObj.hotel && (
                  <div className="border rounded-xl p-4">
                    <ServiceSectionHeader title="Accommodation" icon={<Hotel className="w-4 h-4 text-[#F5821F]" />} canEdit={canEdit} onEdit={() => setEditHotel(true)} />
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                      <DetailRow label="Room Type" value={servicesObj.hotel.roomType} />
                      <DetailRow label="Check-in" value={servicesObj.hotel.checkinDate ? `${format(new Date(servicesObj.hotel.checkinDate), "PPP")} ${servicesObj.hotel.checkinTime ?? ""}`.trim() : "—"} />
                      <DetailRow label="Check-out" value={servicesObj.hotel.checkoutDate ? `${format(new Date(servicesObj.hotel.checkoutDate), "PPP")} ${servicesObj.hotel.checkoutTime ?? ""}`.trim() : "—"} />
                      <DetailRow label="Confirmation #" value={servicesObj.hotel.confirmationNo ?? "—"} />
                      <DetailRow label="Status">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[servicesObj.hotel.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>{servicesObj.hotel.status ?? "—"}</span>
                      </DetailRow>
                      {servicesObj.hotel.guestNotes && <DetailRow label="Guest Notes" value={servicesObj.hotel.guestNotes} />}
                    </div>
                  </div>
                )}

                {servicesObj.pickup && (
                  <div className="border rounded-xl p-4">
                    <ServiceSectionHeader title="Airport Pickup / Transfer" icon={<Car className="w-4 h-4 text-[#F5821F]" />} canEdit={canEdit} onEdit={() => setEditPickup(true)} />
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                      <DetailRow label="Type" value={servicesObj.pickup.pickupType?.replace(/_/g, " ") ?? "—"} />
                      <DetailRow label="Date & Time" value={servicesObj.pickup.pickupDatetime ? format(new Date(servicesObj.pickup.pickupDatetime), "PPP HH:mm") : "—"} />
                      <DetailRow label="From" value={servicesObj.pickup.fromLocation} />
                      <DetailRow label="To" value={servicesObj.pickup.toLocation} />
                      <DetailRow label="Vehicle" value={servicesObj.pickup.vehicleInfo} />
                      <DetailRow label="Status">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[servicesObj.pickup.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>{servicesObj.pickup.status ?? "—"}</span>
                      </DetailRow>
                      {servicesObj.pickup.driverNotes && <DetailRow label="Driver Notes" value={servicesObj.pickup.driverNotes} />}
                    </div>
                  </div>
                )}

                {servicesObj.tour && (
                  <div className="border rounded-xl p-4">
                    <ServiceSectionHeader title="Tour / Activity" icon={<Map className="w-4 h-4 text-[#F5821F]" />} canEdit={canEdit} onEdit={() => setEditTour(true)} />
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                      <DetailRow label="Tour Name" value={servicesObj.tour.tourName} />
                      <DetailRow label="Date" value={servicesObj.tour.tourDate ? format(new Date(servicesObj.tour.tourDate), "PPP") : "—"} />
                      <DetailRow label="Time" value={servicesObj.tour.startTime ? `${servicesObj.tour.startTime} – ${servicesObj.tour.endTime ?? "?"}` : "—"} />
                      <DetailRow label="Meeting Point" value={servicesObj.tour.meetingPoint} />
                      <DetailRow label="Highlights" value={servicesObj.tour.highlights} />
                      <DetailRow label="Guide Info" value={servicesObj.tour.guideInfo} />
                      <DetailRow label="Status">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[servicesObj.tour.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>{servicesObj.tour.status ?? "—"}</span>
                      </DetailRow>
                      {servicesObj.tour.tourNotes && <DetailRow label="Notes" value={servicesObj.tour.tourNotes} />}
                    </div>
                  </div>
                )}

                {Array.isArray(servicesObj.settlements) && servicesObj.settlements.length > 0 && (
                  <div className="border rounded-xl p-4">
                    <div className="text-sm font-semibold mb-3">Settlements</div>
                    <div className="space-y-2">
                      {servicesObj.settlements.map((s: any) => (
                        <div key={s.id} className="border rounded-lg p-3 text-sm grid grid-cols-2 gap-1">
                          <div className="col-span-2 font-medium text-xs text-muted-foreground uppercase mb-1">{s.providerRole?.replace(/_/g, " ")} — {s.providerName ?? "—"}</div>
                          <div><span className="text-muted-foreground">Gross:</span> {CURRENCY_SYMBOLS[s.currency ?? "AUD"] ?? s.currency}{Number(s.grossAmount ?? 0).toLocaleString()}</div>
                          <div><span className="text-muted-foreground">Commission:</span> {s.commissionRate}%</div>
                          <div><span className="text-muted-foreground">Net:</span> {CURRENCY_SYMBOLS[s.currency ?? "AUD"] ?? s.currency}{Number(s.netAmount ?? 0).toLocaleString()}</div>
                          <div><span className={`px-1.5 py-0.5 rounded text-xs ${STATUS_COLORS[s.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>{s.status ?? "—"}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!servicesObj.institute && !servicesObj.hotel && !servicesObj.pickup && !servicesObj.tour && (
                  <div className="text-sm text-muted-foreground text-center py-8">No services linked to this contract yet.</div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Accounting ── */}
        {activeTab === "accounting" && (
          <div className="space-y-4">
            <ArTimeline contractId={id!} />
          </div>
        )}

        {/* ── Documents ── */}
        {activeTab === "documents" && (
          <EntityDocumentsTab entityType="contract" entityId={id!} mode="full" />
        )}

        {/* ── Notes ── */}
        {activeTab === "notes" && (
          <NotePanel entityType="contract" entityId={id!} />
        )}
      </DetailPageLayout>

      {/* ── Service Edit Dialogs ── */}
      {servicesObj?.institute && (
        <InstituteEditDialog
          data={servicesObj.institute}
          contractId={id!}
          open={editInstitute}
          onClose={() => setEditInstitute(false)}
          onSave={(d) => updateInstitute.mutate(d)}
          saving={updateInstitute.isPending}
        />
      )}
      {servicesObj?.hotel && (
        <HotelEditDialog
          data={servicesObj.hotel}
          contractId={id!}
          open={editHotel}
          onClose={() => setEditHotel(false)}
          onSave={(d) => updateHotel.mutate(d)}
          saving={updateHotel.isPending}
        />
      )}
      {servicesObj?.pickup && (
        <PickupEditDialog
          data={servicesObj.pickup}
          contractId={id!}
          open={editPickup}
          onClose={() => setEditPickup(false)}
          onSave={(d) => updatePickup.mutate(d)}
          saving={updatePickup.isPending}
        />
      )}
      {servicesObj?.tour && (
        <TourEditDialog
          data={servicesObj.tour}
          contractId={id!}
          open={editTour}
          onClose={() => setEditTour(false)}
          onSave={(d) => updateTour.mutate(d)}
          saving={updateTour.isPending}
        />
      )}
    </>
  );
}
