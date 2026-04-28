import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Loader2, UserPlus } from "lucide-react";

const GENDERS = ["male", "female", "other", "prefer_not_to_say"];
const ENGLISH_LEVELS = ["beginner", "elementary", "pre_intermediate", "intermediate", "upper_intermediate", "advanced", "proficient"];
const PARTICIPANT_TYPES = ["child", "parent", "guardian", "adult", "accompanying_adult"];

function ParticipantFormFields({
  form,
  setForm,
}: {
  form: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
      <div className="space-y-3 md:col-span-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Personal Info</p>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">First Name *</Label>
        <Input value={form.firstName} onChange={e => f("firstName")(e.target.value)} className="h-8 text-sm" placeholder="e.g. Ji-won" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Last Name *</Label>
        <Input value={form.lastName} onChange={e => f("lastName")(e.target.value)} className="h-8 text-sm" placeholder="e.g. Kim" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Original Name (native script)</Label>
        <Input value={form.fullNameNative} onChange={e => f("fullNameNative")(e.target.value)} className="h-8 text-sm" placeholder="e.g. Kim Cheolsu" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">English Name (Nick Name)</Label>
        <Input value={form.englishName} onChange={e => f("englishName")(e.target.value)} className="h-8 text-sm" placeholder="e.g. Kevin" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Participant Type</Label>
        <Select value={form.participantType} onValueChange={f("participantType")}>
          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            {PARTICIPANT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Date of Birth</Label>
        <Input type="date" value={form.dateOfBirth} onChange={e => f("dateOfBirth")(e.target.value)} className="h-8 text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Gender</Label>
        <Select value={form.gender} onValueChange={f("gender")}>
          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select gender" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">—</SelectItem>
            {GENDERS.map(g => <SelectItem key={g} value={g}>{g.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Nationality</Label>
        <Input value={form.nationality} onChange={e => f("nationality")(e.target.value)} className="h-8 text-sm" placeholder="e.g. Korean" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Relationship to Student</Label>
        <Input value={form.relationshipToStudent} onChange={e => f("relationshipToStudent")(e.target.value)} className="h-8 text-sm" placeholder="e.g. parent, guardian" />
      </div>

      <div className="space-y-3 md:col-span-2 pt-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Passport</p>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Passport Number</Label>
        <Input value={form.passportNumber} onChange={e => f("passportNumber")(e.target.value)} className="h-8 text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Passport Expiry</Label>
        <Input type="date" value={form.passportExpiry} onChange={e => f("passportExpiry")(e.target.value)} className="h-8 text-sm" />
      </div>

      <div className="space-y-3 md:col-span-2 pt-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Academic</p>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Grade / Year</Label>
        <Input value={form.grade} onChange={e => f("grade")(e.target.value)} className="h-8 text-sm" placeholder="e.g. Grade 7, Year 9" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">School Name</Label>
        <Input value={form.schoolName} onChange={e => f("schoolName")(e.target.value)} className="h-8 text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">English Level</Label>
        <Select value={form.englishLevel} onValueChange={f("englishLevel")}>
          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">—</SelectItem>
            {ENGLISH_LEVELS.map(l => <SelectItem key={l} value={l}>{l.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3 md:col-span-2 pt-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Contact</p>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Email</Label>
        <Input type="email" value={form.email} onChange={e => f("email")(e.target.value)} className="h-8 text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Phone</Label>
        <Input value={form.phone} onChange={e => f("phone")(e.target.value)} className="h-8 text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">WhatsApp</Label>
        <Input value={form.whatsapp} onChange={e => f("whatsapp")(e.target.value)} className="h-8 text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">LINE ID</Label>
        <Input value={form.lineId} onChange={e => f("lineId")(e.target.value)} className="h-8 text-sm" />
      </div>

      <div className="space-y-3 md:col-span-2 pt-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Health & Dietary</p>
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label className="text-xs">Medical Conditions</Label>
        <Textarea value={form.medicalConditions} onChange={e => f("medicalConditions")(e.target.value)} className="text-sm min-h-[60px]" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Dietary Requirements</Label>
        <Input value={form.dietaryRequirements} onChange={e => f("dietaryRequirements")(e.target.value)} className="h-8 text-sm" placeholder="e.g. vegetarian, halal" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Special Needs</Label>
        <Input value={form.specialNeeds} onChange={e => f("specialNeeds")(e.target.value)} className="h-8 text-sm" />
      </div>
    </div>
  );
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────
export function ParticipantEditDialog({
  participant,
  open,
  onClose,
  onSave,
  saving,
}: {
  participant: any;
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Record<string, string>>({
    firstName: participant?.firstName ?? (participant?.fullName ? participant.fullName.split(" ")[0] : ""),
    lastName:  participant?.lastName  ?? (participant?.fullName ? participant.fullName.split(" ").slice(1).join(" ") : ""),
    fullNameNative: participant?.fullNameNative ?? "",
    englishName: participant?.englishName ?? "",
    participantType: participant?.participantType ?? "child",
    dateOfBirth: participant?.dateOfBirth ?? "",
    gender: participant?.gender || "__none",
    nationality: participant?.nationality ?? "",
    passportNumber: participant?.passportNumber ?? "",
    passportExpiry: participant?.passportExpiry ?? "",
    grade: participant?.grade ?? "",
    schoolName: participant?.schoolName ?? "",
    englishLevel: participant?.englishLevel || "__none",
    email: participant?.email ?? "",
    phone: participant?.phone ?? "",
    whatsapp: participant?.whatsapp ?? "",
    lineId: participant?.lineId ?? "",
    medicalConditions: participant?.medicalConditions ?? "",
    dietaryRequirements: participant?.dietaryRequirements ?? "",
    specialNeeds: participant?.specialNeeds ?? "",
    relationshipToStudent: participant?.relationshipToStudent ?? "",
  });

  const handleSave = () => {
    const data = { ...form };
    if (data.gender === "__none") data.gender = "";
    if (data.englishLevel === "__none") data.englishLevel = "";
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-(--e-orange)" />
            Edit Participant — {(participant?.firstName || participant?.fullName?.split(" ")[0]) ?? ""} {participant?.lastName ? participant.lastName.toUpperCase() : (participant?.fullName?.split(" ").slice(1).join(" ").toUpperCase() ?? "")}
          </DialogTitle>
        </DialogHeader>
        <ParticipantFormFields form={form} setForm={setForm} />
        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" className="bg-(--e-orange) hover:bg-[#d97706] text-white gap-1.5" onClick={handleSave} disabled={saving || !form.firstName || !form.lastName}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Dialog ───────────────────────────────────────────────────────────────
export function ParticipantAddDialog({
  applicationId,
  open,
  onClose,
  onSave,
  saving,
}: {
  applicationId: string;
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Record<string, string>>({
    firstName: "",
    lastName: "",
    fullNameNative: "",
    englishName: "",
    participantType: "child",
    dateOfBirth: "",
    gender: "__none",
    nationality: "",
    passportNumber: "",
    passportExpiry: "",
    grade: "",
    schoolName: "",
    englishLevel: "__none",
    email: "",
    phone: "",
    whatsapp: "",
    lineId: "",
    medicalConditions: "",
    dietaryRequirements: "",
    specialNeeds: "",
    relationshipToStudent: "",
  });

  const handleSave = () => {
    const data: Record<string, string> = { ...form, applicationId };
    if (data["gender"] === "__none") data["gender"] = "";
    if (data["englishLevel"] === "__none") data["englishLevel"] = "";
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-(--e-orange)" />
            Add Participant
          </DialogTitle>
        </DialogHeader>
        <ParticipantFormFields form={form} setForm={setForm} />
        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" className="bg-(--e-orange) hover:bg-[#d97706] text-white gap-1.5" onClick={handleSave} disabled={saving || !form.firstName || !form.lastName}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Add Participant
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
