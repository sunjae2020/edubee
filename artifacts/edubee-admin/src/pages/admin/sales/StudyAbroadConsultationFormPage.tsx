import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import axios from "axios";
import { ArrowLeft, Save, Printer, ExternalLink } from "lucide-react";
import { ConsultationPrintModal } from "@/components/common/ConsultationPrintModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Options ────────────────────────────────────────────────────────────────
const STATUSES          = ["new","in_progress","contacted","closed"];
const LANGUAGES         = [{ value:"en", label:"English" }, { value:"ko", label:"Korean" }, { value:"zh", label:"Chinese" }];
const GENDERS           = ["Male","Female","Non-binary","Prefer not to say"];
const DESTINATIONS      = ["Australia","Canada","United Kingdom","United States","New Zealand","Ireland","Germany","Japan","Other"];
const COURSE_TYPES      = ["ELICOS (English Language)","Vocational / VET","Diploma / Associate Degree","Bachelor's Degree","Postgraduate Diploma","Master's Degree","PhD / Doctoral","Foundation / Pathway","Working Holiday"];
const STUDY_LEVELS      = ["English Programme","VET / TAFE","Diploma","Bachelor","Postgraduate","Master","PhD","Foundation / Pathway"];
const STUDY_DURATIONS   = ["Less than 6 months","6 months","1 year","1.5 years","2 years","3 years","4 years","5+ years"];
const TARGET_TERMS      = ["January / Term 1","April / Term 2","July / Term 3","October / Term 4","Semester 1","Semester 2","Flexible"];
const ENGLISH_LEVELS    = ["Beginner","Elementary","Pre-Intermediate","Intermediate","Upper-Intermediate","Advanced","Native"];
const ENGLISH_TEST_TYPES= ["IELTS Academic","IELTS General","TOEFL iBT","PTE Academic","Cambridge (CAE/CPE)","Duolingo English Test","Other","Not Yet Taken"];
const EDUCATION_LEVELS  = ["High School (incomplete)","High School Graduate","Diploma / Associate","Bachelor's Degree","Postgraduate Diploma","Master's Degree","PhD","Other"];
const WORK_EXPERIENCES  = ["No experience","Less than 1 year","1–2 years","3–5 years","5–10 years","10+ years"];
const ANNUAL_BUDGETS    = ["Under $20K","$20K–$30K","$30K–$40K","$40K–$60K","$60K–$80K","$80K–$100K","$100K+","Flexible"];
const FUNDING_SOURCES   = ["Personal / Family Savings","Bank Loan","Government Scholarship","Private Scholarship","Employer Sponsorship","Other"];
const VISA_TYPES        = ["Student Visa","Working Holiday Visa","Skilled Migration","Employer Sponsored","Permanent Residency","Other"];
const ACCOMMODATIONS    = ["Homestay","University Accommodation","Private Rental","Student Residence","Shared House","Not Sure Yet"];
const REFERRAL_SOURCES  = ["Word of Mouth","Social Media","Google","Blog / Article","Event / Seminar","Agency Partner","Other"];

// ── Empty Form ─────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  status: "new", assignedTo: "", adminNotes: "", language: "en",
  fullName: "", firstName: "", lastName: "", dateOfBirth: "", gender: "",
  email: "", phone: "", currentCity: "", currentCountry: "", nationality: "",
  kakaoId: "", messengerId: "",
  destinationCountries: [] as string[],
  courseTypes: [] as string[],
  fieldOfStudy: "", studyLevel: "", studyDuration: "", targetStartTerm: "",
  preferredInstitutions: "",
  englishLevel: "", englishTestType: "", englishScore: "",
  currentEducationLevel: "", currentInstitution: "", workExperience: "",
  annualBudget: "", fundingSource: "", visaTypeInterest: "",
  accommodationPreference: "",
  airportPickup: false,
  healthSpecialNeeds: "", referralConsultant: "", questionsNotes: "",
  documentNotes: "",
  privacyConsent: false, marketingConsent: false,
  referralSources: [] as string[],
};

// ── Shared UI helpers ──────────────────────────────────────────────────────
function MultiCheck({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button
          key={o}
          type="button"
          onClick={() => toggle(o)}
          className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${selected.includes(o) ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-orange-300"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-xl bg-white">
      <div className="px-5 py-3.5 border-b bg-gray-50 rounded-t-xl">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function StudyAbroadConsultationFormPage() {
  const { id } = useParams<{ id: string }>();
  const isNew   = !id || id === "new";
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showPrint, setShowPrint] = useState(false);

  const { data: existingData, isLoading } = useQuery({
    queryKey: ["study-abroad-consultation", id],
    enabled: !isNew,
    queryFn: async () => {
      const res = await axios.get(`${BASE}/api/study-abroad-consultations/${id}`);
      return res.data;
    },
  });

  useEffect(() => {
    if (!existingData) return;
    const d = existingData as any;
    setForm({
      status:                d.status               ?? "new",
      assignedTo:            d.assignedTo            ?? "",
      adminNotes:            d.adminNotes            ?? "",
      language:              d.language              ?? "en",
      fullName:              d.fullName              ?? "",
      firstName:             d.firstName             ?? "",
      lastName:              d.lastName              ?? "",
      dateOfBirth:           d.dateOfBirth           ?? "",
      gender:                d.gender                ?? "",
      email:                 d.email                 ?? "",
      phone:                 d.phone                 ?? "",
      currentCity:           d.currentCity           ?? "",
      currentCountry:        d.currentCountry        ?? "",
      nationality:           d.nationality           ?? "",
      kakaoId:               d.kakaoId               ?? "",
      messengerId:           d.messengerId           ?? "",
      destinationCountries:  d.destinationCountries  ?? [],
      courseTypes:           d.courseTypes           ?? [],
      fieldOfStudy:          d.fieldOfStudy          ?? "",
      studyLevel:            d.studyLevel            ?? "",
      studyDuration:         d.studyDuration         ?? "",
      targetStartTerm:       d.targetStartTerm       ?? "",
      preferredInstitutions: d.preferredInstitutions ?? "",
      englishLevel:          d.englishLevel          ?? "",
      englishTestType:       d.englishTestType       ?? "",
      englishScore:          d.englishScore          ?? "",
      currentEducationLevel: d.currentEducationLevel ?? "",
      currentInstitution:    d.currentInstitution    ?? "",
      workExperience:        d.workExperience        ?? "",
      annualBudget:          d.annualBudget          ?? "",
      fundingSource:         d.fundingSource         ?? "",
      visaTypeInterest:      d.visaTypeInterest      ?? "",
      accommodationPreference: d.accommodationPreference ?? "",
      airportPickup:         d.airportPickup         ?? false,
      healthSpecialNeeds:    d.healthSpecialNeeds    ?? "",
      referralConsultant:    d.referralConsultant    ?? "",
      questionsNotes:        d.questionsNotes        ?? "",
      documentNotes:         d.documentNotes         ?? "",
      privacyConsent:        d.privacyConsent        ?? false,
      marketingConsent:      d.marketingConsent      ?? false,
      referralSources:       d.referralSources       ?? [],
    });
  }, [existingData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isNew) return axios.post(`${BASE}/api/study-abroad-consultations`, form);
      return axios.patch(`${BASE}/api/study-abroad-consultations/${id}`, form);
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["study-abroad-consultations"] });
      toast({ title: isNew ? "Consultation created." : "Consultation updated." });
      if (isNew) navigate(`/admin/sales/study-abroad-consultations/${res.data.id}`);
    },
    onError: () => toast({ title: "Failed to save.", variant: "destructive" }),
  });

  const setField = (key: keyof typeof form, value: any) =>
    setForm(f => ({ ...f, [key]: value }));

  // Auto-compute fullName from first+last
  const handleNameChange = (key: "firstName" | "lastName", value: string) => {
    const next = { ...form, [key]: value };
    next.fullName = [next.firstName, next.lastName].filter(Boolean).join(" ");
    setForm(next);
  };

  if (!isNew && isLoading) {
    return <div className="p-8 text-center text-gray-400">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-white border-b px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/sales/study-abroad-consultations")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {isNew ? "New Study Abroad Consultation" : "Edit Study Abroad Consultation"}
            </h1>
            {!isNew && <p className="text-xs text-gray-400">ID: {id}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button variant="outline" size="sm" onClick={() => setShowPrint(true)} className="flex items-center gap-1.5 text-gray-600">
              <Printer className="w-4 h-4" /> PDF
            </Button>
          )}
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="flex items-center gap-1.5">
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* ─── Lead/Source badge ─── */}
        {!isNew && existingData?.submittedVia && (
          <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${existingData.submittedVia === "public" ? "bg-orange-50 text-orange-700 border border-orange-200" : "bg-gray-100 text-gray-600 border border-gray-200"}`}>
              {existingData.submittedVia === "public" ? "Public Form Submission" : "Admin Created"}
            </span>
            {existingData.refNumber && (
              <span className="text-xs text-gray-400">Ref: <span className="font-medium text-gray-600">{existingData.refNumber}</span></span>
            )}
            {existingData.leadId && (
              <a
                href={`/admin/crm/leads/${existingData.leadId}`}
                className="ml-auto flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Linked Lead
              </a>
            )}
          </div>
        )}

        {/* ─── Admin ─── */}
        <SectionCard title="Admin">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setField("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Language</Label>
              <Select value={form.language} onValueChange={v => setField("language", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assigned To</Label>
              <Input placeholder="Consultant name" value={form.assignedTo} onChange={e => setField("assignedTo", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Admin Notes</Label>
            <Textarea rows={2} placeholder="Internal notes…" value={form.adminNotes} onChange={e => setField("adminNotes", e.target.value)} />
          </div>
        </SectionCard>

        {/* ─── Personal Information ─── */}
        <SectionCard title="Personal Information" subtitle="For students aged 18 and above">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>First Name <span className="text-red-500">*</span></Label>
              <Input placeholder="First name" value={form.firstName} onChange={e => handleNameChange("firstName", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name <span className="text-red-500">*</span></Label>
              <Input placeholder="Last name" value={form.lastName} onChange={e => handleNameChange("lastName", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Date of Birth</Label>
              <Input type="date" value={form.dateOfBirth} onChange={e => setField("dateOfBirth", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={v => setField("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Email <span className="text-red-500">*</span></Label>
              <Input type="email" placeholder="applicant@example.com" value={form.email} onChange={e => setField("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone <span className="text-red-500">*</span></Label>
              <Input placeholder="+82 10-0000-0000" value={form.phone} onChange={e => setField("phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Nationality</Label>
              <Input placeholder="e.g. Korean, Chinese" value={form.nationality} onChange={e => setField("nationality", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Current Country</Label>
              <Input placeholder="Country of residence" value={form.currentCountry} onChange={e => setField("currentCountry", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Current City</Label>
              <Input placeholder="City" value={form.currentCity} onChange={e => setField("currentCity", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>KakaoTalk ID</Label>
              <Input placeholder="kakao_id" value={form.kakaoId} onChange={e => setField("kakaoId", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Messenger ID (WeChat / LINE / etc.)</Label>
              <Input placeholder="messenger_id" value={form.messengerId} onChange={e => setField("messengerId", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>How did you hear about us?</Label>
            <MultiCheck options={REFERRAL_SOURCES} selected={form.referralSources} onChange={v => setField("referralSources", v)} />
          </div>
        </SectionCard>

        {/* ─── Study Preferences ─── */}
        <SectionCard title="Study Preferences">
          <div className="space-y-2">
            <Label>Preferred Destination Country / Countries</Label>
            <MultiCheck options={DESTINATIONS} selected={form.destinationCountries} onChange={v => setField("destinationCountries", v)} />
          </div>
          <div className="space-y-2">
            <Label>Course Type</Label>
            <MultiCheck options={COURSE_TYPES} selected={form.courseTypes} onChange={v => setField("courseTypes", v)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Study Level</Label>
              <Select value={form.studyLevel} onValueChange={v => setField("studyLevel", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {STUDY_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Field of Study</Label>
              <Input placeholder="e.g. Business, Engineering, Nursing…" value={form.fieldOfStudy} onChange={e => setField("fieldOfStudy", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Study Duration</Label>
              <Select value={form.studyDuration} onValueChange={v => setField("studyDuration", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {STUDY_DURATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Target Start Term</Label>
              <Select value={form.targetStartTerm} onValueChange={v => setField("targetStartTerm", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {TARGET_TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Preferred Institutions (if any)</Label>
              <Textarea rows={2} placeholder="e.g. University of Melbourne, RMIT, Macquarie University…" value={form.preferredInstitutions} onChange={e => setField("preferredInstitutions", e.target.value)} />
            </div>
          </div>
        </SectionCard>

        {/* ─── English & Academic Background ─── */}
        <SectionCard title="English & Academic Background">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>English Level (Self-assessed)</Label>
              <Select value={form.englishLevel} onValueChange={v => setField("englishLevel", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {ENGLISH_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>English Test Type</Label>
              <Select value={form.englishTestType} onValueChange={v => setField("englishTestType", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {ENGLISH_TEST_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Test Score</Label>
              <Input placeholder="e.g. 6.5, 90, 65" value={form.englishScore} onChange={e => setField("englishScore", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Highest Education Level</Label>
              <Select value={form.currentEducationLevel} onValueChange={v => setField("currentEducationLevel", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Current / Most Recent Institution</Label>
              <Input placeholder="School or university name" value={form.currentInstitution} onChange={e => setField("currentInstitution", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Work Experience</Label>
              <Select value={form.workExperience} onValueChange={v => setField("workExperience", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {WORK_EXPERIENCES.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </SectionCard>

        {/* ─── Financial & Visa ─── */}
        <SectionCard title="Financial & Visa">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Annual Budget (AUD)</Label>
              <Select value={form.annualBudget} onValueChange={v => setField("annualBudget", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {ANNUAL_BUDGETS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Funding Source</Label>
              <Select value={form.fundingSource} onValueChange={v => setField("fundingSource", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {FUNDING_SOURCES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Visa Type of Interest</Label>
              <Select value={form.visaTypeInterest} onValueChange={v => setField("visaTypeInterest", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {VISA_TYPES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </SectionCard>

        {/* ─── Additional Information (Step 4 from image) ─── */}
        <SectionCard title="Additional Information" subtitle="Anything else that helps us prepare for your consultation">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Accommodation Preference</Label>
              <Select value={form.accommodationPreference} onValueChange={v => setField("accommodationPreference", v)}>
                <SelectTrigger><SelectValue placeholder="Please Select" /></SelectTrigger>
                <SelectContent>
                  {ACCOMMODATIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Airport Pickup Needed?</Label>
              <Select value={form.airportPickup ? "yes" : "no"} onValueChange={v => setField("airportPickup", v === "yes")}>
                <SelectTrigger><SelectValue placeholder="Please Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Health or Special Needs</Label>
              <Textarea
                rows={2}
                placeholder="e.g. dietary needs, disability support, medical conditions — optional"
                value={form.healthSpecialNeeds}
                onChange={e => setField("healthSpecialNeeds", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Consultant Name</Label>
              <Input
                placeholder="Name of the consultant who referred you, if applicable"
                value={form.referralConsultant}
                onChange={e => setField("referralConsultant", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Questions or Notes</Label>
              <Textarea
                rows={3}
                placeholder="Any questions, concerns, or information you'd like to share before the consultation…"
                value={form.questionsNotes}
                onChange={e => setField("questionsNotes", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Document Notes</Label>
              <Textarea
                rows={2}
                placeholder="Notes about documents provided (passport copy, academic transcripts, English test certificate, résumé, etc.)"
                value={form.documentNotes}
                onChange={e => setField("documentNotes", e.target.value)}
              />
            </div>
          </div>
        </SectionCard>

        {/* ─── Privacy & Consent ─── */}
        <SectionCard title="Privacy & Consent" subtitle="Information is protected under Australian Privacy Law">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 border rounded-lg bg-gray-50">
              <Checkbox
                id="privacy"
                checked={form.privacyConsent}
                onCheckedChange={v => setField("privacyConsent", !!v)}
                className="mt-0.5"
              />
              <label htmlFor="privacy" className="text-sm text-gray-700 cursor-pointer leading-relaxed">
                I consent to the agency collecting and using my personal information for consultation and service delivery purposes in accordance with the Australian Privacy Act 1988.
                <span className="text-red-500 ml-1">*</span>
              </label>
            </div>
            <div className="flex items-start gap-3 p-3 border rounded-lg bg-gray-50">
              <Checkbox
                id="marketing"
                checked={form.marketingConsent}
                onCheckedChange={v => setField("marketingConsent", !!v)}
                className="mt-0.5"
              />
              <label htmlFor="marketing" className="text-sm text-gray-700 cursor-pointer leading-relaxed">
                I agree to receive updates, news, and promotional information via email and messaging apps. (Optional)
              </label>
            </div>
          </div>
        </SectionCard>

        {/* Save (bottom) */}
        <div className="flex justify-end pb-6">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="lg" className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Saving…" : "Save Consultation"}
          </Button>
        </div>
      </div>

      {showPrint && !isNew && (
        <ConsultationPrintModal
          title="Study Abroad Consultation"
          refNumber={existingData?.refNumber}
          status={form.status}
          submittedVia={existingData?.submittedVia}
          date={existingData?.createdAt}
          onClose={() => setShowPrint(false)}
          sections={[
            {
              title: "Consultation Details",
              rows: [
                { label: "Status", value: form.status },
                { label: "Language", value: form.language },
                { label: "Assigned To", value: form.assignedTo },
                { label: "Privacy Consent", value: form.privacyConsent },
                { label: "Marketing Consent", value: form.marketingConsent },
              ],
            },
            {
              title: "Personal Information",
              rows: [
                { label: "Full Name", value: form.fullName || `${form.firstName} ${form.lastName}`.trim() },
                { label: "Date of Birth", value: form.dateOfBirth },
                { label: "Gender", value: form.gender },
                { label: "Nationality", value: form.nationality },
                { label: "Email", value: form.email },
                { label: "Phone", value: form.phone },
                { label: "Current City", value: form.currentCity },
                { label: "Current Country", value: form.currentCountry },
                { label: "KakaoTalk ID", value: form.kakaoId },
                { label: "Messenger ID", value: form.messengerId },
                { label: "Referral Sources", value: form.referralSources },
              ],
            },
            {
              title: "Study Preferences",
              rows: [
                { label: "Destination Countries", value: form.destinationCountries },
                { label: "Course Types", value: form.courseTypes },
                { label: "Field of Study", value: form.fieldOfStudy },
                { label: "Study Level", value: form.studyLevel },
                { label: "Study Duration", value: form.studyDuration },
                { label: "Target Start Term", value: form.targetStartTerm },
                { label: "Preferred Institutions", value: form.preferredInstitutions },
                { label: "Accommodation", value: form.accommodationPreference },
                { label: "Airport Pickup", value: form.airportPickup },
                { label: "Annual Budget", value: form.annualBudget },
              ],
            },
            {
              title: "Academic & Language Background",
              rows: [
                { label: "English Level", value: form.englishLevel },
                { label: "English Test Type", value: form.englishTestType },
                { label: "English Score", value: form.englishScore },
                { label: "Current Education Level", value: form.currentEducationLevel },
                { label: "Current Institution", value: form.currentInstitution },
                { label: "Work Experience", value: form.workExperience },
              ],
            },
            {
              title: "Financial & Visa",
              rows: [
                { label: "Funding Source", value: form.fundingSource },
                { label: "Visa Type Interest", value: form.visaTypeInterest },
                { label: "Health / Special Needs", value: form.healthSpecialNeeds },
                { label: "Questions / Notes", value: form.questionsNotes },
              ],
            },
            {
              title: "Admin Notes",
              rows: [
                { label: "Notes", value: form.adminNotes },
                { label: "Document Notes", value: form.documentNotes },
              ],
            },
          ]}
        />
      )}
    </div>
  );
}
