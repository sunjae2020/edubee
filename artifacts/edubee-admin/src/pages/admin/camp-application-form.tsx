import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronDown, ChevronUp, Loader2, Users, GraduationCap, Paperclip, X, FileText, Upload, Plus, Trash2 } from "lucide-react";
import DatePickerInput from "@/components/shared/DatePickerInput";
import SignaturePad from "@/components/shared/SignaturePad";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ───────────────────────────────────────────────────────────────────
interface Participant {
  type: "adult" | "child";
  // Common
  firstName: string;
  lastName: string;
  fullNameNative: string;
  // Adult-only
  relationship: string;
  phone: string;
  email: string;
  whatsapp: string;
  lineId: string;
  isEmergencyContact: boolean;
  // Child-only
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

// ── Document Types ───────────────────────────────────────────────────────────
interface StagedFile {
  id: string;
  file: File;
  documentName: string;
  category: string;
}

const CAMP_DOC_CATEGORIES: { value: string; label: string }[] = [
  { value: "PASSPORT",     label: "Passport" },
  { value: "PHOTO_ID",     label: "Photo / ID Card" },
  { value: "MEDICAL",      label: "Medical Documents" },
  { value: "CONSENT",      label: "Consent Form" },
  { value: "INSURANCE",    label: "Travel / Health Insurance" },
  { value: "ACADEMIC",     label: "School / Academic Records" },
  { value: "APPLICATION",  label: "Application Form" },
  { value: "OTHER",        label: "Other" },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Documents Section component ──────────────────────────────────────────────
function DocumentsSection({
  files,
  onChange,
}: { files: StagedFile[]; onChange: (files: StagedFile[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const newEntries: StagedFile[] = Array.from(incoming).map(f => ({
      id: `${Date.now()}-${Math.random()}`,
      file: f,
      documentName: f.name.replace(/\.[^.]+$/, ""),
      category: "OTHER",
    }));
    onChange([...files, ...newEntries]);
  };

  const remove = (id: string) => onChange(files.filter(f => f.id !== id));
  const update = (id: string, key: "documentName" | "category", value: string) =>
    onChange(files.map(f => (f.id === id ? { ...f, [key]: value } : f)));

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors
          ${dragging ? "border-(--e-orange) bg-orange-50" : "border-border hover:border-(--e-orange)/60 hover:bg-orange-50/40"}
        `}
      >
        <Upload className="w-7 h-7 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">
          <span className="font-semibold text-(--e-orange)">Click to browse</span> or drag & drop files here
        </p>
        <p className="text-xs text-muted-foreground">PDF, JPG, PNG, DOCX — max 20 MB per file</p>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={e => addFiles(e.target.files)} />
      </div>

      {/* Staged file list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(sf => (
            <div key={sf.id} className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 border border-border">
              <FileText className="w-4 h-4 mt-1 shrink-0 text-muted-foreground" />
              <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
                <div>
                  <p className="text-[10px] font-semibold text-[#57534E] uppercase tracking-wide mb-0.5">Document Name</p>
                  <Input
                    value={sf.documentName}
                    onChange={e => update(sf.id, "documentName", e.target.value)}
                    className="h-8 text-sm border-border focus-visible:ring-(--e-orange)/40 focus-visible:border-(--e-orange)"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[#57534E] uppercase tracking-wide mb-0.5">Category</p>
                  <select
                    value={sf.category}
                    onChange={e => update(sf.id, "category", e.target.value)}
                    className="h-8 w-full rounded-md border border-border px-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-(--e-orange)/40 focus:border-(--e-orange)"
                  >
                    {CAMP_DOC_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <p className="col-span-2 text-[11px] text-muted-foreground truncate">
                  {sf.file.name} &middot; {formatBytes(sf.file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(sf.id)}
                className="text-muted-foreground hover:text-red-500 transition-colors mt-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {files.length} file{files.length !== 1 ? "s" : ""} ready to upload
        </p>
      )}
    </div>
  );
}

const emptyParticipant = (type: "adult" | "child" = "adult"): Participant => ({
  type,
  firstName: "", lastName: "", fullNameNative: "",
  relationship: "", phone: "", email: "", whatsapp: "", lineId: "", isEmergencyContact: false,
  englishName: "", dateOfBirth: "", gender: "", nationality: "", passportNumber: "",
  passportExpiry: "", grade: "", schoolName: "", englishLevel: "",
  medicalConditions: "", dietaryRequirements: "", specialNeeds: "",
});

// ── Design helpers ───────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="bg-(--e-orange) text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-t-xl">
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

const inputCls = "h-9 text-sm border-border focus-visible:ring-(--e-orange)/40 focus-visible:border-(--e-orange)";
const selectCls = "h-9 w-full rounded-md border border-border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-(--e-orange)/40 focus:border-(--e-orange)";
const textareaCls = "text-sm border-border focus-visible:ring-(--e-orange)/40 focus-visible:border-(--e-orange) resize-none";

// ── Unified Participant Card ─────────────────────────────────────────────────
function ParticipantCard({
  index, data, onChange, onRemove, isAutoFilled,
}: {
  index: number;
  data: Participant;
  onChange: (d: Participant) => void;
  onRemove: () => void;
  isAutoFilled?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const set = <K extends keyof Participant>(k: K, v: Participant[K]) =>
    onChange({ ...data, [k]: v });
  const thisYear = new Date().getFullYear();

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center bg-orange-50">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex-1 flex items-center gap-2 px-4 py-3 hover:bg-orange-100 transition-colors text-left"
        >
          {data.type === "adult"
            ? <Users className="w-4 h-4 text-(--e-orange)" />
            : <GraduationCap className="w-4 h-4 text-(--e-orange)" />
          }
          <span className="text-sm font-semibold text-[#92400E]">
            Participant {index + 1}
            {data.firstName && ` — ${data.firstName} ${data.lastName}`.trim()}
          </span>
          {isAutoFilled && (
            <span className="text-[10px] font-medium bg-(--e-orange)/15 text-(--e-orange) px-2 py-0.5 rounded-full">
              From Primary Contact
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-(--e-orange) ml-auto" /> : <ChevronDown className="w-4 h-4 text-(--e-orange) ml-auto" />}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="px-3 py-3 text-muted-foreground hover:text-red-500 transition-colors"
          title="Remove participant"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {open && (
        <div className="p-4 space-y-4">
          {/* Type Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#57534E] uppercase tracking-wide">Type</span>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => set("type", "adult")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                  data.type === "adult"
                    ? "bg-(--e-orange) text-white"
                    : "bg-background text-muted-foreground hover:bg-orange-50"
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Adult
              </button>
              <button
                type="button"
                onClick={() => set("type", "child")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l border-border ${
                  data.type === "child"
                    ? "bg-(--e-orange) text-white"
                    : "bg-background text-muted-foreground hover:bg-orange-50"
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" /> Child
              </button>
            </div>
          </div>

          {/* Common Name Fields */}
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
              <Input className={inputCls} value={data.fullNameNative} onChange={e => set("fullNameNative", e.target.value)} placeholder="e.g. Kim Ji-su" />
            </Field>
            {data.type === "child" ? (
              <Field label="English Name / Nick">
                <Input className={inputCls} value={data.englishName} onChange={e => set("englishName", e.target.value)} placeholder="e.g. Jessica" />
              </Field>
            ) : (
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
            )}
          </div>

          {/* Adult-specific fields */}
          {data.type === "adult" && (
            <>
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
                  className="data-[state=checked]:bg-(--e-orange) data-[state=checked]:border-(--e-orange)"
                />
                <span className="text-sm text-muted-foreground">Primary Emergency Contact</span>
              </label>
            </>
          )}

          {/* Child-specific fields */}
          {data.type === "child" && (
            <>
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
              <div className="grid grid-cols-2 gap-4">
                <Field label="Passport Number">
                  <Input className={inputCls} value={data.passportNumber} onChange={e => set("passportNumber", e.target.value)} placeholder="Passport No." />
                </Field>
                <Field label="Passport Expiry Date">
                  <DatePickerInput value={data.passportExpiry} onChange={v => set("passportExpiry", v)} fromYear={thisYear} toYear={thisYear + 20} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="School Name">
                  <Input className={inputCls} value={data.schoolName} onChange={e => set("schoolName", e.target.value)} placeholder="e.g. Seoul Middle School" />
                </Field>
                <Field label="Grade / Year">
                  <Input className={inputCls} value={data.grade} onChange={e => set("grade", e.target.value)} placeholder="e.g. Grade 8 / Year 9" />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <Field label="Medical Conditions / Allergies">
                  <Textarea className={textareaCls} rows={2} value={data.medicalConditions} onChange={e => set("medicalConditions", e.target.value)} placeholder="e.g. Asthma, peanut allergy..." />
                </Field>
                <Field label="Dietary Requirements">
                  <Textarea className={textareaCls} rows={2} value={data.dietaryRequirements} onChange={e => set("dietaryRequirements", e.target.value)} placeholder="e.g. Vegetarian, Halal..." />
                </Field>
                <Field label="Special Needs / Other">
                  <Textarea className={textareaCls} rows={2} value={data.specialNeeds} onChange={e => set("specialNeeds", e.target.value)} placeholder="Any other information..." />
                </Field>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function AdminCampApplicationForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Read packageGroupId from query param (when opened via iframe from camp.edubee.co)
  const preselectedGroupId = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("packageGroupId") ?? ""
    : "";

  // ── Applicant info
  const [firstName,       setFirstName]       = useState("");
  const [lastName,        setLastName]        = useState("");
  const [originalName,    setOriginalName]    = useState("");
  const [englishName,     setEnglishName]     = useState("");
  const [email,           setEmail]           = useState("");
  const [phone,           setPhone]           = useState("");
  const [nationality,     setNationality]     = useState("");
  const [dob,             setDob]             = useState("");

  // ── Programme
  const [packageGroupId,  setPackageGroupId]  = useState(preselectedGroupId);
  const [packageId,       setPackageId]       = useState("");
  const [preferredStart,  setPreferredStart]  = useState("");

  // ── Participants (unified)
  const [participants, setParticipants] = useState<Participant[]>([emptyParticipant("adult")]);

  // ── Additional requirements
  const [specialReqs,     setSpecialReqs]     = useState("");
  const [dietaryReqs,     setDietaryReqs]     = useState("");
  const [medicalCond,     setMedicalCond]     = useState("");

  // ── Emergency contact
  const [ecName,          setEcName]          = useState("");
  const [ecPhone,         setEcPhone]         = useState("");

  // ── Signature
  const [signatureImage,  setSignatureImage]  = useState<string | null>(null);
  const [signDate,        setSignDate]        = useState("");

  // ── Other
  const [notes,           setNotes]           = useState("");

  // ── Attached documents
  const [stagedFiles,     setStagedFiles]     = useState<StagedFile[]>([]);

  // ── Auto-fill Participant 1 (adult) from Primary Contact info
  useEffect(() => {
    setParticipants(prev => {
      if (prev.length === 0 || prev[0].type !== "adult") return prev;
      const updated = [...prev];
      updated[0] = { ...updated[0], firstName, lastName, fullNameNative: originalName, phone, email };
      return updated;
    });
  }, [firstName, lastName, originalName, phone, email]);

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
    mutationFn: async () => {
      // Build participants array
      const participantPayload = participants.map((p, i) => p.type === "adult" ? ({
          participantType: "adult" as const,
          sequenceOrder: i + 1,
          fullName: `${p.firstName} ${p.lastName}`.trim(),
          firstName: p.firstName || undefined,
          lastName: p.lastName || undefined,
          fullNameNative: p.fullNameNative || undefined,
          relationshipToStudent: p.relationship || undefined,
          phone: p.phone || undefined,
          email: p.email || undefined,
          whatsapp: p.whatsapp || undefined,
          lineId: p.lineId || undefined,
          isEmergencyContact: p.isEmergencyContact,
        }) : ({
          participantType: "child" as const,
          sequenceOrder: i + 1,
          fullName: `${p.firstName} ${p.lastName}`.trim(),
          firstName: p.firstName || undefined,
          lastName: p.lastName || undefined,
          fullNameNative: p.fullNameNative || undefined,
          englishName: p.englishName || undefined,
          dateOfBirth: p.dateOfBirth || undefined,
          gender: p.gender || undefined,
          nationality: p.nationality || undefined,
          passportNumber: p.passportNumber || undefined,
          passportExpiry: p.passportExpiry || undefined,
          grade: p.grade || undefined,
          schoolName: p.schoolName || undefined,
          englishLevel: p.englishLevel || undefined,
          medicalConditions: p.medicalConditions || undefined,
          dietaryRequirements: p.dietaryRequirements || undefined,
          specialNeeds: p.specialNeeds || undefined,
        }));

      const appResp = await axios.post(`${BASE}/api/camp-applications`, {
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
        adultCount:   participants.filter(p => p.type === "adult").length,
        studentCount: participants.filter(p => p.type === "child").length,
        specialRequirements:   specialReqs  || undefined,
        dietaryRequirements:   dietaryReqs  || undefined,
        medicalConditions:     medicalCond  || undefined,
        emergencyContactName:  ecName          || undefined,
        emergencyContactPhone: ecPhone         || undefined,
        signatureImage:        signatureImage  || undefined,
        signatureDate:         signDate        || undefined,
        notes:                 notes           || undefined,
        participants:          participantPayload.length > 0 ? participantPayload : undefined,
      });
      const newApp = appResp.data;

      // Upload staged documents
      if (stagedFiles.length > 0) {
        const token = localStorage.getItem("edubee_token") ?? "";
        for (const sf of stagedFiles) {
          const fd = new FormData();
          fd.append("file", sf.file);
          fd.append("referenceType", "camp_application");
          fd.append("referenceId", newApp.id);
          fd.append("documentName", sf.documentName || sf.file.name);
          fd.append("documentCategory", sf.category);
          fd.append("status", "pending_review");
          await axios.post(`${BASE}/api/documents`, fd, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          });
        }
      }

      return newApp;
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

  const updateParticipant = (i: number, d: Participant) =>
    setParticipants(prev => prev.map((p, idx) => (idx === i ? d : p)));
  const removeParticipant = (i: number) =>
    setParticipants(prev => prev.filter((_, idx) => idx !== i));
  const addParticipant = (type: "adult" | "child") =>
    setParticipants(prev => [...prev, emptyParticipant(type)]);

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
            className="bg-(--e-orange) hover:bg-[#e06f0e] text-white"
            disabled={submit.isPending}
          >
            {submit.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Save Application
          </Button>
        </div>
      </div>

      {/* ── Form ── */}
      <form id="camp-app-form" onSubmit={onSubmit} className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Primary contact info */}
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
            <Field label="Native Name">
              <Input value={originalName} onChange={e => setOriginalName(e.target.value)} placeholder="e.g. Kim Jisu" className={inputCls} />
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

        {/* Programme selection */}
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
          <div className="grid grid-cols-1 gap-4">
            <Field label="Preferred Start Date">
              <DatePickerInput value={preferredStart} onChange={setPreferredStart} fromYear={new Date().getFullYear()} toYear={new Date().getFullYear() + 5} />
            </Field>
          </div>
        </Section>

        {/* ── Participants ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="bg-(--e-orange) text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Participants ({participants.length})
          </div>
          <div className="p-4 space-y-3">
            {participants.map((p, i) => (
              <ParticipantCard
                key={i}
                index={i}
                data={p}
                onChange={d => updateParticipant(i, d)}
                onRemove={() => removeParticipant(i)}
                isAutoFilled={i === 0 && p.type === "adult"}
              />
            ))}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" className="gap-1.5 flex-1"
                onClick={() => addParticipant("adult")}>
                <Plus className="w-3.5 h-3.5" /> Add Adult
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-1.5 flex-1"
                onClick={() => addParticipant("child")}>
                <Plus className="w-3.5 h-3.5" /> Add Child
              </Button>
            </div>
          </div>
        </div>

        {/* Additional requirements */}
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

        {/* Emergency contact */}
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

        {/* Attached documents */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="bg-(--e-orange) text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            Documents
            {stagedFiles.length > 0 && (
              <span className="ml-auto bg-white/20 rounded-full px-2 py-0.5 text-xs">
                {stagedFiles.length}
              </span>
            )}
          </div>
          <div className="bg-card p-5">
            <DocumentsSection files={stagedFiles} onChange={setStagedFiles} />
          </div>
        </div>

        {/* Signature */}
        <Section title="Declaration & Signature">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <SignaturePad label="Signature (Draw)" value={signatureImage} onChange={setSignatureImage} height={160} />
            <Field label="Date">
              <DatePickerInput value={signDate} onChange={setSignDate} fromYear={new Date().getFullYear() - 1} toYear={new Date().getFullYear() + 5} />
            </Field>
          </div>
        </Section>

        {/* Internal notes */}
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
          <Button type="submit" className="bg-(--e-orange) hover:bg-[#e06f0e] text-white" disabled={submit.isPending}>
            {submit.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Save Application
          </Button>
        </div>
      </form>
    </div>
  );
}
