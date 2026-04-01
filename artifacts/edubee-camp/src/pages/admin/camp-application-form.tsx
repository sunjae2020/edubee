import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronDown, ChevronUp, Loader2, Users, GraduationCap } from "lucide-react";
import DatePickerInput from "@/components/shared/DatePickerInput";
import SignaturePad from "@/components/shared/SignaturePad";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ───────────────────────────────────────────────────────────────────
interface AdultParticipant {
  firstName: string;
  lastName: string;
  fullNameNative: string;
  relationship: string;
  phone: string;
  email: string;
  whatsapp: string;
  lineId: string;
  isEmergencyContact: boolean;
}

interface StudentParticipant {
  firstName: string;
  lastName: string;
  fullNameNative: string;
  englishName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  grade: string;
  schoolName: string;
  englishLevel: string;
  medicalConditions: string;
  dietaryRequirements: string;
  specialNeeds: string;
}

const emptyAdult = (): AdultParticipant => ({
  firstName: "", lastName: "", fullNameNative: "", relationship: "",
  phone: "", email: "", whatsapp: "", lineId: "", isEmergencyContact: false,
});

const emptyStudent = (): StudentParticipant => ({
  firstName: "", lastName: "", fullNameNative: "", englishName: "",
  dateOfBirth: "", gender: "", nationality: "", passportNumber: "",
  passportExpiry: "", grade: "", schoolName: "", englishLevel: "",
  medicalConditions: "", dietaryRequirements: "", specialNeeds: "",
});

// ── Design helpers ───────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="bg-[#F5821F] text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-t-xl">
      {title}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <SectionHeader title={title} />
      <div className="bg-card p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#57534E] uppercase tracking-wide mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "h-9 text-sm border-border focus-visible:ring-[#F5821F]/40 focus-visible:border-[#F5821F]";
const selectCls = "h-9 w-full rounded-md border border-border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-[#F5821F]/40 focus:border-[#F5821F]";
const textareaCls = "text-sm border-border focus-visible:ring-[#F5821F]/40 focus-visible:border-[#F5821F] resize-none";

// ── Adult Participant Card ───────────────────────────────────────────────────
function AdultCard({
  index, data, onChange,
}: { index: number; data: AdultParticipant; onChange: (d: AdultParticipant) => void }) {
  const [open, setOpen] = useState(true);
  const set = (k: keyof AdultParticipant, v: string | boolean) =>
    onChange({ ...data, [k]: v });

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-800">
            Adult {index + 1}
            {data.firstName && ` — ${data.firstName} ${data.lastName}`.trim()}
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />}
      </button>

      {open && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" required>
              <Input className={inputCls} value={data.firstName} onChange={e => set("firstName", e.target.value)} placeholder="e.g. Jane" />
            </Field>
            <Field label="Last Name" required>
              <Input className={inputCls} value={data.lastName} onChange={e => set("lastName", e.target.value)} placeholder="e.g. KIM" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Native Name">
              <Input className={inputCls} value={data.fullNameNative} onChange={e => set("fullNameNative", e.target.value)} placeholder="e.g. 김지수" />
            </Field>
            <Field label="Relationship to Student">
              <select className={selectCls} value={data.relationship} onChange={e => set("relationship", e.target.value)}>
                <option value="">-- Select --</option>
                <option value="Mother">Mother</option>
                <option value="Father">Father</option>
                <option value="Guardian">Guardian</option>
                <option value="Sibling">Sibling</option>
                <option value="Relative">Relative</option>
                <option value="Teacher">Teacher</option>
                <option value="Other">Other</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone">
              <Input className={inputCls} value={data.phone} onChange={e => set("phone", e.target.value)} placeholder="+82 10-0000-0000" />
            </Field>
            <Field label="Email">
              <Input className={inputCls} type="email" value={data.email} onChange={e => set("email", e.target.value)} placeholder="email@example.com" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="WhatsApp">
              <Input className={inputCls} value={data.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="+82 10-0000-0000" />
            </Field>
            <Field label="LINE ID">
              <Input className={inputCls} value={data.lineId} onChange={e => set("lineId", e.target.value)} placeholder="LINE ID" />
            </Field>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={data.isEmergencyContact}
              onCheckedChange={v => set("isEmergencyContact", !!v)}
              className="data-[state=checked]:bg-[#F5821F] data-[state=checked]:border-[#F5821F]"
            />
            <span className="text-sm text-muted-foreground">Primary Emergency Contact</span>
          </label>
        </div>
      )}
    </div>
  );
}

// ── Student Participant Card ─────────────────────────────────────────────────
function StudentCard({
  index, data, onChange,
}: { index: number; data: StudentParticipant; onChange: (d: StudentParticipant) => void }) {
  const [open, setOpen] = useState(true);
  const set = (k: keyof StudentParticipant, v: string) =>
    onChange({ ...data, [k]: v });

  const thisYear = new Date().getFullYear();

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-orange-50 hover:bg-orange-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-[#F5821F]" />
          <span className="text-sm font-semibold text-[#92400E]">
            Student {index + 1}
            {data.firstName && ` — ${data.firstName} ${data.lastName}`.trim()}
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-[#F5821F]" /> : <ChevronDown className="w-4 h-4 text-[#F5821F]" />}
      </button>

      {open && (
        <div className="p-4 space-y-4">
          {/* Names */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" required>
              <Input className={inputCls} value={data.firstName} onChange={e => set("firstName", e.target.value)} placeholder="e.g. Jisu" />
            </Field>
            <Field label="Last Name" required>
              <Input className={inputCls} value={data.lastName} onChange={e => set("lastName", e.target.value)} placeholder="e.g. KIM" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Native Name">
              <Input className={inputCls} value={data.fullNameNative} onChange={e => set("fullNameNative", e.target.value)} placeholder="e.g. 김지수" />
            </Field>
            <Field label="English Name / Nick">
              <Input className={inputCls} value={data.englishName} onChange={e => set("englishName", e.target.value)} placeholder="e.g. Jessica" />
            </Field>
          </div>

          {/* Personal Details */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date of Birth">
              <DatePickerInput value={data.dateOfBirth} onChange={v => set("dateOfBirth", v)} fromYear={thisYear - 25} toYear={thisYear} />
            </Field>
            <Field label="Gender">
              <select className={selectCls} value={data.gender} onChange={e => set("gender", e.target.value)}>
                <option value="">-- Select --</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nationality">
              <Input className={inputCls} value={data.nationality} onChange={e => set("nationality", e.target.value)} placeholder="e.g. Korean" />
            </Field>
            <Field label="English Level">
              <select className={selectCls} value={data.englishLevel} onChange={e => set("englishLevel", e.target.value)}>
                <option value="">-- Select --</option>
                <option value="Beginner">Beginner</option>
                <option value="Elementary">Elementary</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Upper-Intermediate">Upper-Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </Field>
          </div>

          {/* Passport */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Passport Number">
              <Input className={inputCls} value={data.passportNumber} onChange={e => set("passportNumber", e.target.value)} placeholder="Passport No." />
            </Field>
            <Field label="Passport Expiry Date">
              <DatePickerInput value={data.passportExpiry} onChange={v => set("passportExpiry", v)} fromYear={thisYear} toYear={thisYear + 20} />
            </Field>
          </div>

          {/* School */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="School Name">
              <Input className={inputCls} value={data.schoolName} onChange={e => set("schoolName", e.target.value)} placeholder="e.g. Seoul Middle School" />
            </Field>
            <Field label="Grade / Year">
              <Input className={inputCls} value={data.grade} onChange={e => set("grade", e.target.value)} placeholder="e.g. Grade 8 / Year 9" />
            </Field>
          </div>

          {/* Health */}
          <div className="grid grid-cols-1 gap-4">
            <Field label="Medical Conditions / Allergies">
              <Textarea className={textareaCls} rows={2} value={data.medicalConditions} onChange={e => set("medicalConditions", e.target.value)} placeholder="e.g. Asthma, peanut allergy, EpiPen required..." />
            </Field>
            <Field label="Dietary Requirements">
              <Textarea className={textareaCls} rows={2} value={data.dietaryRequirements} onChange={e => set("dietaryRequirements", e.target.value)} placeholder="e.g. Vegetarian, Halal, Kosher, nut-free..." />
            </Field>
            <Field label="Special Needs / Other">
              <Textarea className={textareaCls} rows={2} value={data.specialNeeds} onChange={e => set("specialNeeds", e.target.value)} placeholder="Any other information..." />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function AdminCampApplicationForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // ── 신청인 정보
  const [firstName,       setFirstName]       = useState("");
  const [lastName,        setLastName]        = useState("");
  const [originalName,    setOriginalName]    = useState("");
  const [englishName,     setEnglishName]     = useState("");
  const [email,           setEmail]           = useState("");
  const [phone,           setPhone]           = useState("");
  const [nationality,     setNationality]     = useState("");
  const [dob,             setDob]             = useState("");

  // ── 프로그램
  const [packageGroupId,  setPackageGroupId]  = useState("");
  const [packageId,       setPackageId]       = useState("");
  const [preferredStart,  setPreferredStart]  = useState("");
  const [adultCount,      setAdultCount]      = useState(1);
  const [studentCount,    setStudentCount]    = useState(0);

  // ── Participants
  const [adults,    setAdults]    = useState<AdultParticipant[]>([]);
  const [students,  setStudents]  = useState<StudentParticipant[]>([]);

  // ── 추가 요구사항
  const [specialReqs,     setSpecialReqs]     = useState("");
  const [dietaryReqs,     setDietaryReqs]     = useState("");
  const [medicalCond,     setMedicalCond]     = useState("");

  // ── 비상 연락처
  const [ecName,          setEcName]          = useState("");
  const [ecPhone,         setEcPhone]         = useState("");

  // ── 서명
  const [signatureImage,  setSignatureImage]  = useState<string | null>(null);
  const [signDate,        setSignDate]        = useState("");

  // ── 기타
  const [notes,           setNotes]           = useState("");

  // ── Sync participant arrays with counts
  useEffect(() => {
    setAdults(prev => {
      if (adultCount <= 0) return [];
      if (adultCount > prev.length) {
        return [...prev, ...Array.from({ length: adultCount - prev.length }, emptyAdult)];
      }
      return prev.slice(0, adultCount);
    });
  }, [adultCount]);

  useEffect(() => {
    setStudents(prev => {
      if (studentCount <= 0) return [];
      if (studentCount > prev.length) {
        return [...prev, ...Array.from({ length: studentCount - prev.length }, emptyStudent)];
      }
      return prev.slice(0, studentCount);
    });
  }, [studentCount]);

  // ── Package Groups
  const { data: pgResp } = useQuery({
    queryKey: ["admin-package-groups"],
    queryFn: () =>
      axios.get(`${BASE}/api/package-groups?limit=100&status=active`).then(r => r.data),
  });
  const packageGroups: Array<{ id: string; nameEn: string; nameKo: string }> =
    pgResp?.data ?? [];

  // ── Packages (filtered by group)
  const { data: pkgResp } = useQuery({
    queryKey: ["admin-packages", packageGroupId],
    queryFn: () =>
      axios.get(`${BASE}/api/packages?limit=100&packageGroupId=${packageGroupId}`).then(r => r.data),
    enabled: !!packageGroupId,
  });
  const packageOptions: Array<{ id: string; name: string }> = pkgResp?.data ?? [];

  const onGroupChange = (id: string) => {
    setPackageGroupId(id);
    setPackageId("");
  };

  const submit = useMutation({
    mutationFn: () => {
      // Build participants array
      const participantPayload = [
        // Adults
        ...adults.map((a, i) => ({
          participantType: "adult" as const,
          sequenceOrder: i + 1,
          fullName: `${a.firstName} ${a.lastName}`.trim(),
          firstName: a.firstName || undefined,
          lastName: a.lastName || undefined,
          fullNameNative: a.fullNameNative || undefined,
          relationshipToStudent: a.relationship || undefined,
          phone: a.phone || undefined,
          email: a.email || undefined,
          whatsapp: a.whatsapp || undefined,
          lineId: a.lineId || undefined,
          isEmergencyContact: a.isEmergencyContact,
        })),
        // Students
        ...students.map((s, i) => ({
          participantType: "child" as const,
          sequenceOrder: i + 1,
          fullName: `${s.firstName} ${s.lastName}`.trim(),
          firstName: s.firstName || undefined,
          lastName: s.lastName || undefined,
          fullNameNative: s.fullNameNative || undefined,
          englishName: s.englishName || undefined,
          dateOfBirth: s.dateOfBirth || undefined,
          gender: s.gender || undefined,
          nationality: s.nationality || undefined,
          passportNumber: s.passportNumber || undefined,
          passportExpiry: s.passportExpiry || undefined,
          grade: s.grade || undefined,
          schoolName: s.schoolName || undefined,
          englishLevel: s.englishLevel || undefined,
          medicalConditions: s.medicalConditions || undefined,
          dietaryRequirements: s.dietaryRequirements || undefined,
          specialNeeds: s.specialNeeds || undefined,
        })),
      ];

      return axios.post(`${BASE}/api/camp-applications`, {
        applicantFirstName:    firstName,
        applicantLastName:     lastName,
        applicantOriginalName: originalName || undefined,
        applicantEnglishName:  englishName  || undefined,
        applicantEmail:        email,
        applicantPhone:        phone        || undefined,
        applicantNationality:  nationality  || undefined,
        applicantDob:          dob          || undefined,
        packageGroupId,
        packageId,
        preferredStartDate:    preferredStart   || undefined,
        adultCount,
        studentCount,
        specialRequirements:   specialReqs  || undefined,
        dietaryRequirements:   dietaryReqs  || undefined,
        medicalConditions:     medicalCond  || undefined,
        emergencyContactName:  ecName          || undefined,
        emergencyContactPhone: ecPhone         || undefined,
        signatureImage:        signatureImage  || undefined,
        signatureDate:         signDate        || undefined,
        notes:                 notes           || undefined,
        participants:          participantPayload.length > 0 ? participantPayload : undefined,
      }).then(r => r.data);
    },

    onSuccess: (data) => {
      toast({ title: "Application Created", description: `${data.applicationRef} has been created.` });
      setLocation(`/admin/camp-applications/${data.id}`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error ?? "Failed to save. Please try again.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !packageGroupId || !packageId) {
      toast({
        title: "Required fields missing",
        description: "Please fill in First Name, Last Name, Email, Package Group and Package.",
        variant: "destructive",
      });
      return;
    }
    submit.mutate();
  };

  const updateAdult = (i: number, d: AdultParticipant) =>
    setAdults(prev => prev.map((a, idx) => (idx === i ? d : a)));
  const updateStudent = (i: number, d: StudentParticipant) =>
    setStudents(prev => prev.map((s, idx) => (idx === i ? d : s)));

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLocation("/admin/all-applications")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            All Applications
          </button>
          <span className="text-muted-foreground/40">|</span>
          <h1 className="text-sm font-semibold text-foreground">New Camp Application</h1>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setLocation("/admin/all-applications")}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="camp-app-form"
            size="sm"
            className="bg-[#F5821F] hover:bg-[#e06f0e] text-white"
            disabled={submit.isPending}
          >
            {submit.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Save Application
          </Button>
        </div>
      </div>

      {/* ── Form ── */}
      <form id="camp-app-form" onSubmit={onSubmit} className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* 신청인 정보 */}
        <Section title="Primary Contact / Applicant">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" required>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g. John" className={inputCls} />
            </Field>
            <Field label="Last Name" required>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="e.g. KIM" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Korean Name">
              <Input value={originalName} onChange={e => setOriginalName(e.target.value)} placeholder="e.g. 김지수" className={inputCls} />
            </Field>
            <Field label="English Name / Nick">
              <Input value={englishName} onChange={e => setEnglishName(e.target.value)} placeholder="e.g. Jisu" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" required>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="applicant@example.com" className={inputCls} />
            </Field>
            <Field label="Phone">
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+82 10-0000-0000" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nationality">
              <Input value={nationality} onChange={e => setNationality(e.target.value)} placeholder="e.g. Korean" className={inputCls} />
            </Field>
            <Field label="Date of Birth">
              <DatePickerInput value={dob} onChange={setDob} fromYear={1920} toYear={new Date().getFullYear()} />
            </Field>
          </div>
        </Section>

        {/* 프로그램 선택 */}
        <Section title="Programme">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Package Group" required>
              <select value={packageGroupId} onChange={e => onGroupChange(e.target.value)} className={selectCls}>
                <option value="">-- Select Group --</option>
                {packageGroups.map(pg => (
                  <option key={pg.id} value={pg.id}>{pg.nameEn || pg.nameKo}</option>
                ))}
              </select>
            </Field>
            <Field label="Package" required>
              <select value={packageId} onChange={e => setPackageId(e.target.value)} disabled={!packageGroupId} className={selectCls}>
                <option value="">-- Select Package --</option>
                {packageOptions.map(pk => (
                  <option key={pk.id} value={pk.id}>{pk.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Preferred Start Date">
              <DatePickerInput value={preferredStart} onChange={setPreferredStart} fromYear={new Date().getFullYear()} toYear={new Date().getFullYear() + 5} />
            </Field>
            <Field label="Adults">
              <Input
                type="number" min="0" max="10"
                value={adultCount}
                onChange={e => setAdultCount(Math.max(0, Number(e.target.value)))}
                className={inputCls}
              />
            </Field>
            <Field label="Students">
              <Input
                type="number" min="0" max="20"
                value={studentCount}
                onChange={e => setStudentCount(Math.max(0, Number(e.target.value)))}
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        {/* ── Dynamic Participants ─────────────────────────────────────────── */}
        {adults.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="bg-blue-600 text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Adult Participants ({adults.length})
            </div>
            <div className="p-4 space-y-3">
              {adults.map((a, i) => (
                <AdultCard key={i} index={i} data={a} onChange={d => updateAdult(i, d)} />
              ))}
            </div>
          </div>
        )}

        {students.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="bg-[#F5821F] text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Student Participants ({students.length})
            </div>
            <div className="p-4 space-y-3">
              {students.map((s, i) => (
                <StudentCard key={i} index={i} data={s} onChange={d => updateStudent(i, d)} />
              ))}
            </div>
          </div>
        )}

        {/* 추가 요구사항 */}
        <Section title="General Requirements">
          <Field label="Special Requirements">
            <Textarea value={specialReqs} onChange={e => setSpecialReqs(e.target.value)} placeholder="Enter any special requirements" rows={3} className={textareaCls} />
          </Field>
          <Field label="Dietary Requirements">
            <Textarea value={dietaryReqs} onChange={e => setDietaryReqs(e.target.value)} placeholder="e.g. Vegetarian, Halal, nut allergy..." rows={3} className={textareaCls} />
          </Field>
          <Field label="Medical Conditions">
            <Textarea value={medicalCond} onChange={e => setMedicalCond(e.target.value)} placeholder="e.g. Asthma, diabetes, medication..." rows={3} className={textareaCls} />
          </Field>
        </Section>

        {/* 비상 연락처 */}
        <Section title="Emergency Contact">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact Name">
              <Input value={ecName} onChange={e => setEcName(e.target.value)} placeholder="Full name" className={inputCls} />
            </Field>
            <Field label="Contact Phone">
              <Input value={ecPhone} onChange={e => setEcPhone(e.target.value)} placeholder="+82 10-0000-0000" className={inputCls} />
            </Field>
          </div>
        </Section>

        {/* 서명 */}
        <Section title="Declaration & Signature">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <SignaturePad label="Signature (Draw)" value={signatureImage} onChange={setSignatureImage} height={160} />
            <Field label="Date">
              <DatePickerInput value={signDate} onChange={setSignDate} fromYear={new Date().getFullYear() - 1} toYear={new Date().getFullYear() + 5} />
            </Field>
          </div>
        </Section>

        {/* 메모 */}
        <Section title="Internal Notes">
          <Field label="Notes (not visible to applicant)">
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes..." rows={4} className={textareaCls} />
          </Field>
        </Section>

        {/* Bottom action */}
        <div className="flex justify-end gap-2 pt-2 pb-8">
          <Button type="button" variant="outline" onClick={() => setLocation("/admin/all-applications")}>
            Cancel
          </Button>
          <Button type="submit" className="bg-[#F5821F] hover:bg-[#e06f0e] text-white" disabled={submit.isPending}>
            {submit.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Save Application
          </Button>
        </div>
      </form>
    </div>
  );
}
