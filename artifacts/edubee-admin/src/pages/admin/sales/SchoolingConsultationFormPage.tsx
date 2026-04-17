import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import axios from "axios";
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, Save, Printer, ExternalLink } from "lucide-react";
import { ConsultationPrintModal } from "@/components/common/ConsultationPrintModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Options ──────────────────────────────────────────────────────────────────
const STATUSES         = ["new","in_progress","contacted","closed"];
const LANGUAGES        = [{ value:"en", label:"English" }, { value:"ko", label:"Korean" }, { value:"zh", label:"Chinese" }];
const RELATIONSHIPS    = ["Parent","Guardian","Grandparent","Relative","Other"];
const REFERRAL_SOURCES = ["Word of Mouth","Social Media","Google","Blog/Article","Event/Seminar","Agency Partner","Other"];
const AU_STATES        = ["NSW","VIC","QLD","WA","SA","ACT","TAS","NT"];
const SCHOOL_TYPES     = ["Public","Catholic","Independent/Private","Boarding School"];
const SCHOOL_PRIORITIES= ["Academic Results","Sports Facilities","Arts Programme","International Students","Location","Fees","Boarding Available","Small Class Size"];
const STUDY_DURATIONS  = ["6 months","1 year","2 years","3 years","4 years","5+ years"];
const TARGET_TERMS     = ["Term 1 (Jan/Feb)","Term 2 (Apr/May)","Term 3 (Jul/Aug)","Term 4 (Oct/Nov)"];
const ACCOMMODATIONS   = ["Homestay","School Boarding","Private Boarding House","Student Apartment","With Relatives"];
const ANNUAL_BUDGETS   = ["Under $30K","$30K–$40K","$40K–$50K","$50K–$60K","$60K–$80K","$80K+","Flexible"];
const CONCERNS         = ["Language Barrier","Academic Difficulty","Cost","Safety","Homesickness","Cultural Adjustment","School Selection","Visa Process"];
const CONSULT_METHODS  = ["Phone","Zoom / Video Call","In-Person","KakaoTalk","WhatsApp","LINE","WeChat"];
const CONSULT_TIMES    = ["Weekday Morning (9–12)","Weekday Afternoon (12–5)","Weekday Evening (5–8)","Weekend Morning","Weekend Afternoon"];
const ACCOMPANIMENTS   = ["Yes – Guardian accompanies","No – Student travels alone","Undecided"];
const GENDERS          = ["Male","Female","Non-binary","Prefer not to say"];
const GRADES_KR        = ["Pre-K / Kindergarten","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12","University","Graduate"];
const AU_GRADES        = ["Foundation / Prep","Year 1","Year 2","Year 3","Year 4","Year 5","Year 6","Year 7","Year 8","Year 9","Year 10","Year 11","Year 12"];
const ENGLISH_LEVELS   = ["Beginner","Elementary","Pre-Intermediate","Intermediate","Upper-Intermediate","Advanced","Native"];
const INTERESTS        = ["Sports","Music","Visual Arts","Science","Technology","Mathematics","Languages","Drama","Dance","Gaming","Cooking","Reading","Travel"];
const PREV_EXPERIENCES = ["Exchange Programme","International School","English Tutoring","ESL Classes","Study Tour","None"];
const POST_GRAD_PLANS  = ["Return Home","Work in Australia","University in Australia","PR / Migration","Undecided"];
const CAREER_FIELDS    = ["Medicine / Health","Engineering","Business / Commerce","Law","Education","IT / Technology","Science","Arts / Design","Architecture","Agriculture","Other"];
const PR_LEVELS        = [1,2,3,4,5];
const SCALE_LABELS: Record<number, string> = { 1:"Very Low", 2:"Low", 3:"Moderate", 4:"High", 5:"Very High" };

// ── Types ─────────────────────────────────────────────────────────────────────
interface StudentForm {
  _key: string;
  name: string; gender: string; dateOfBirth: string;
  currentGrade: string; currentSchool: string; currentCity: string;
  englishLevel: string; englishScore: string; targetAuGrade: string;
  specialNotes: string;
  learningStyle: number | null; sociability: number | null;
  independence: number | null; emotionalStability: number | null;
  interests: string[]; prevExperience: string[];
  postGradPlans: string[]; prInterest: number | null; careerFields: string[];
  targetUniversity: string;
  _open: boolean;
}

const emptyStudent = (): StudentForm => ({
  _key: crypto.randomUUID(),
  name:"", gender:"", dateOfBirth:"",
  currentGrade:"", currentSchool:"", currentCity:"",
  englishLevel:"", englishScore:"", targetAuGrade:"",
  specialNotes:"",
  learningStyle:null, sociability:null, independence:null, emotionalStability:null,
  interests:[], prevExperience:[],
  postGradPlans:[], prInterest:null, careerFields:[],
  targetUniversity:"",
  _open: true,
});

const EMPTY_FORM = {
  status:"new", assignedTo:"", adminNotes:"", language:"en",
  guardianName:"", relationship:"", phone:"", email:"",
  kakaoId:"", messengerId:"", accompaniment:"",
  referralSources:[] as string[],
  preferredStates:[] as string[], urbanPreference:null as number|null,
  schoolTypes:[] as string[], schoolPriorities:[] as string[],
  preferredSchools:"", studyDuration:"", targetTerm:"",
  accommodation:[] as string[], annualBudget:"",
  concerns:[] as string[], specialNote:"",
  consultMethod:"", consultTimes:[] as string[],
  privacyConsent:false,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function MultiCheck({ options, selected, onChange }: { options:string[]; selected:string[]; onChange:(v:string[])=>void }) {
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <label key={o} className={`flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-full text-xs border transition-colors ${selected.includes(o) ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-orange-300"}`}>
          <Checkbox
            checked={selected.includes(o)}
            onCheckedChange={() => toggle(o)}
            className="hidden"
          />
          {o}
        </label>
      ))}
    </div>
  );
}

function ScaleSelect({ value, onChange, label }: { value: number|null; onChange:(v:number|null)=>void; label:string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-1.5">
        {[1,2,3,4,5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            className={`w-9 h-9 rounded-lg text-sm font-medium border transition-colors ${value === n ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-orange-300"}`}
          >
            {n}
          </button>
        ))}
        {value !== null && (
          <span className="text-xs text-gray-500 self-center ml-1">{SCALE_LABELS[value]}</span>
        )}
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-xl bg-white">
      <div className="px-5 py-3.5 border-b bg-gray-50 rounded-t-xl">
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SchoolingConsultationFormPage() {
  const { id } = useParams<{ id: string }>();
  const isNew   = !id || id === "new";
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [form, setForm]         = useState({ ...EMPTY_FORM });
  const [students, setStudents] = useState<StudentForm[]>([emptyStudent()]);
  const [showPrint, setShowPrint] = useState(false);

  const { data: existingData, isLoading } = useQuery({
    queryKey: ["schooling-consultation", id],
    enabled: !isNew,
    queryFn: async () => {
      const res = await axios.get(`${BASE}/api/schooling-consultations/${id}`);
      return res.data;
    },
  });

  useEffect(() => {
    if (!existingData) return;
    const data = existingData as any;
    setForm({
      status:           data.status           ?? "new",
      assignedTo:       data.assignedTo        ?? "",
      adminNotes:       data.adminNotes        ?? "",
      language:         data.language          ?? "en",
      guardianName:     data.guardianName      ?? "",
      relationship:     data.relationship      ?? "",
      phone:            data.phone             ?? "",
      email:            data.email             ?? "",
      kakaoId:          data.kakaoId           ?? "",
      messengerId:      data.messengerId       ?? "",
      accompaniment:    data.accompaniment     ?? "",
      referralSources:  data.referralSources   ?? [],
      preferredStates:  data.preferredStates   ?? [],
      urbanPreference:  data.urbanPreference   ?? null,
      schoolTypes:      data.schoolTypes       ?? [],
      schoolPriorities: data.schoolPriorities  ?? [],
      preferredSchools: data.preferredSchools  ?? "",
      studyDuration:    data.studyDuration     ?? "",
      targetTerm:       data.targetTerm        ?? "",
      accommodation:    data.accommodation     ?? [],
      annualBudget:     data.annualBudget      ?? "",
      concerns:         data.concerns          ?? [],
      specialNote:      data.specialNote       ?? "",
      consultMethod:    data.consultMethod     ?? "",
      consultTimes:     data.consultTimes      ?? [],
      privacyConsent:   data.privacyConsent    ?? false,
    });
    if (Array.isArray(data.students) && data.students.length > 0) {
      setStudents(data.students.map((s: any) => ({
        _key: s.id ?? crypto.randomUUID(),
        name: s.name ?? "", gender: s.gender ?? "", dateOfBirth: s.dateOfBirth ?? "",
        currentGrade: s.currentGrade ?? "", currentSchool: s.currentSchool ?? "", currentCity: s.currentCity ?? "",
        englishLevel: s.englishLevel ?? "", englishScore: s.englishScore ?? "", targetAuGrade: s.targetAuGrade ?? "",
        specialNotes: s.specialNotes ?? "",
        learningStyle: s.learningStyle ?? null, sociability: s.sociability ?? null,
        independence: s.independence ?? null, emotionalStability: s.emotionalStability ?? null,
        interests: s.interests ?? [], prevExperience: s.prevExperience ?? [],
        postGradPlans: s.postGradPlans ?? [], prInterest: s.prInterest ?? null, careerFields: s.careerFields ?? [],
        targetUniversity: s.targetUniversity ?? "",
        _open: true,
      })));
    }
  }, [existingData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        students: students.map(({ _key, _open, ...rest }) => rest),
      };
      if (isNew) {
        return axios.post(`${BASE}/api/schooling-consultations`, payload);
      } else {
        return axios.patch(`${BASE}/api/schooling-consultations/${id}`, payload);
      }
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["schooling-consultations"] });
      toast({ title: isNew ? "Consultation created." : "Consultation updated." });
      if (isNew) {
        navigate(`/admin/sales/schooling-consultations/${res.data.id}`);
      }
    },
    onError: () => toast({ title: "Failed to save.", variant: "destructive" }),
  });

  const setField = (key: keyof typeof form, value: any) =>
    setForm(f => ({ ...f, [key]: value }));

  const updateStudent = (key: string, field: keyof StudentForm, value: any) =>
    setStudents(ss => ss.map(s => s._key === key ? { ...s, [field]: value } : s));

  const addStudent = () => setStudents(ss => [...ss, emptyStudent()]);

  const removeStudent = (key: string) =>
    setStudents(ss => ss.filter(s => s._key !== key));

  const toggleStudentOpen = (key: string) =>
    setStudents(ss => ss.map(s => s._key === key ? { ...s, _open: !s._open } : s));

  if (!isNew && isLoading) {
    return (
      <div className="p-8 text-center text-gray-400">Loading…</div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-white border-b px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/sales/schooling-consultations")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {isNew ? "New Schooling Consultation" : "Edit Schooling Consultation"}
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
        {/* ─── Section 1: Admin ─── */}
        <SectionCard title="Admin">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setField("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s.replace("_"," ").replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>
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

        {/* ─── Section 2: Guardian Info ─── */}
        <SectionCard title="Guardian Information">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Guardian Name <span className="text-red-500">*</span></Label>
              <Input placeholder="Full name" value={form.guardianName} onChange={e => setField("guardianName", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Relationship <span className="text-red-500">*</span></Label>
              <Select value={form.relationship} onValueChange={v => setField("relationship", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Phone <span className="text-red-500">*</span></Label>
              <Input placeholder="+82 10-0000-0000" value={form.phone} onChange={e => setField("phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email <span className="text-red-500">*</span></Label>
              <Input type="email" placeholder="guardian@example.com" value={form.email} onChange={e => setField("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>KakaoTalk ID</Label>
              <Input placeholder="kakao_id" value={form.kakaoId} onChange={e => setField("kakaoId", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Messenger ID (WeChat / LINE / etc.)</Label>
              <Input placeholder="messenger_id" value={form.messengerId} onChange={e => setField("messengerId", e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Accompaniment</Label>
              <Select value={form.accompaniment} onValueChange={v => setField("accompaniment", v)}>
                <SelectTrigger><SelectValue placeholder="Will guardian accompany?" /></SelectTrigger>
                <SelectContent>
                  {ACCOMPANIMENTS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>How did you hear about us?</Label>
            <MultiCheck options={REFERRAL_SOURCES} selected={form.referralSources} onChange={v => setField("referralSources", v)} />
          </div>
        </SectionCard>

        {/* ─── Section 3: Preferences ─── */}
        <SectionCard title="Study Preferences">
          <div className="space-y-2">
            <Label>Preferred Australian States / Territories</Label>
            <MultiCheck options={AU_STATES} selected={form.preferredStates} onChange={v => setField("preferredStates", v)} />
          </div>

          <div className="space-y-2">
            <Label>Urban / Rural Preference <span className="text-xs text-gray-400 font-normal">(1 = City Centre, 5 = Rural)</span></Label>
            <ScaleSelect label="" value={form.urbanPreference} onChange={v => setField("urbanPreference", v)} />
          </div>

          <div className="space-y-2">
            <Label>School Types</Label>
            <MultiCheck options={SCHOOL_TYPES} selected={form.schoolTypes} onChange={v => setField("schoolTypes", v)} />
          </div>

          <div className="space-y-2">
            <Label>School Priorities</Label>
            <MultiCheck options={SCHOOL_PRIORITIES} selected={form.schoolPriorities} onChange={v => setField("schoolPriorities", v)} />
          </div>

          <div className="space-y-1.5">
            <Label>Preferred Schools (if any)</Label>
            <Textarea rows={2} placeholder="e.g. Shore School, Scotch College, MLC School…" value={form.preferredSchools} onChange={e => setField("preferredSchools", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <Label>Target Term / Start Date</Label>
              <Select value={form.targetTerm} onValueChange={v => setField("targetTerm", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {TARGET_TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Annual Budget (AUD)</Label>
              <Select value={form.annualBudget} onValueChange={v => setField("annualBudget", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {ANNUAL_BUDGETS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Accommodation Preference</Label>
            <MultiCheck options={ACCOMMODATIONS} selected={form.accommodation} onChange={v => setField("accommodation", v)} />
          </div>

          <div className="space-y-2">
            <Label>Main Concerns</Label>
            <MultiCheck options={CONCERNS} selected={form.concerns} onChange={v => setField("concerns", v)} />
          </div>

          <div className="space-y-1.5">
            <Label>Special Notes / Additional Requests</Label>
            <Textarea rows={3} placeholder="Any special requests or additional information…" value={form.specialNote} onChange={e => setField("specialNote", e.target.value)} />
          </div>
        </SectionCard>

        {/* ─── Section 4: Consultation Schedule ─── */}
        <SectionCard title="Consultation Schedule">
          <div className="space-y-2">
            <Label>Preferred Consultation Method</Label>
            <MultiCheck options={CONSULT_METHODS} selected={form.consultMethod ? [form.consultMethod] : []} onChange={v => setField("consultMethod", v[v.length-1] ?? "")} />
          </div>
          <div className="space-y-2">
            <Label>Available Times</Label>
            <MultiCheck options={CONSULT_TIMES} selected={form.consultTimes} onChange={v => setField("consultTimes", v)} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="privacy"
              checked={form.privacyConsent}
              onCheckedChange={v => setField("privacyConsent", !!v)}
            />
            <label htmlFor="privacy" className="text-sm text-gray-700 cursor-pointer">
              Privacy consent obtained <span className="text-red-500">*</span>
            </label>
          </div>
        </SectionCard>

        {/* ─── Section 5: Students ─── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Students</h2>
            <Button variant="outline" size="sm" onClick={addStudent} className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add Student
            </Button>
          </div>

          {students.map((s, idx) => (
            <div key={s._key} className="border rounded-xl bg-white overflow-hidden">
              {/* Student Header */}
              <div
                className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleStudentOpen(s._key)}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 text-sm font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-semibold text-gray-800">{s.name || "Student " + (idx + 1)}</span>
                    {s.currentGrade && <Badge className="ml-2 text-xs bg-gray-100 text-gray-600 border-0">{s.currentGrade}</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {students.length > 1 && (
                    <Button
                      variant="ghost" size="icon" className="w-7 h-7 text-red-400 hover:text-red-600"
                      onClick={e => { e.stopPropagation(); removeStudent(s._key); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  {s._open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {s._open && (
                <div className="px-5 pb-5 border-t space-y-5 pt-4">
                  {/* Basic Info */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Basic Information</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Student Name</Label>
                        <Input placeholder="Full name" value={s.name} onChange={e => updateStudent(s._key, "name", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Gender</Label>
                        <Select value={s.gender} onValueChange={v => updateStudent(s._key, "gender", v)}>
                          <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                          <SelectContent>
                            {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Date of Birth</Label>
                        <Input type="date" value={s.dateOfBirth} onChange={e => updateStudent(s._key, "dateOfBirth", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Current Grade</Label>
                        <Select value={s.currentGrade} onValueChange={v => updateStudent(s._key, "currentGrade", v)}>
                          <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                          <SelectContent>
                            {GRADES_KR.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Current School</Label>
                        <Input placeholder="School name" value={s.currentSchool} onChange={e => updateStudent(s._key, "currentSchool", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Current City</Label>
                        <Input placeholder="City / Region" value={s.currentCity} onChange={e => updateStudent(s._key, "currentCity", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>English Level</Label>
                        <Select value={s.englishLevel} onValueChange={v => updateStudent(s._key, "englishLevel", v)}>
                          <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                          <SelectContent>
                            {ENGLISH_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>English Test Score</Label>
                        <Input placeholder="e.g. IELTS 5.5, TOEFL 65" value={s.englishScore} onChange={e => updateStudent(s._key, "englishScore", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Target Australian Grade</Label>
                        <Select value={s.targetAuGrade} onValueChange={v => updateStudent(s._key, "targetAuGrade", v)}>
                          <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                          <SelectContent>
                            {AU_GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <Label>Special Notes</Label>
                        <Textarea rows={2} placeholder="Any special educational or health requirements…" value={s.specialNotes} onChange={e => updateStudent(s._key, "specialNotes", e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {/* Profile */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Student Profile</p>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <ScaleSelect label="Learning Style (1=Visual → 5=Kinesthetic)" value={s.learningStyle} onChange={v => updateStudent(s._key, "learningStyle", v)} />
                      <ScaleSelect label="Sociability (1=Introverted → 5=Extroverted)" value={s.sociability} onChange={v => updateStudent(s._key, "sociability", v)} />
                      <ScaleSelect label="Independence (1=Needs Support → 5=Very Independent)" value={s.independence} onChange={v => updateStudent(s._key, "independence", v)} />
                      <ScaleSelect label="Emotional Stability (1=Low → 5=Very Stable)" value={s.emotionalStability} onChange={v => updateStudent(s._key, "emotionalStability", v)} />
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Interests & Hobbies</Label>
                        <MultiCheck options={INTERESTS} selected={s.interests} onChange={v => updateStudent(s._key, "interests", v)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Previous International Experience</Label>
                        <MultiCheck options={PREV_EXPERIENCES} selected={s.prevExperience} onChange={v => updateStudent(s._key, "prevExperience", v)} />
                      </div>
                    </div>
                  </div>

                  {/* Goals */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Goals &amp; Aspirations</p>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Post-Graduation Plans</Label>
                        <MultiCheck options={POST_GRAD_PLANS} selected={s.postGradPlans} onChange={v => updateStudent(s._key, "postGradPlans", v)} />
                      </div>
                      <ScaleSelect label="PR / Migration Interest (1=Not Interested → 5=Strong Interest)" value={s.prInterest} onChange={v => updateStudent(s._key, "prInterest", v)} />
                      <div className="space-y-2">
                        <Label>Career Fields of Interest</Label>
                        <MultiCheck options={CAREER_FIELDS} selected={s.careerFields} onChange={v => updateStudent(s._key, "careerFields", v)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Target University (if applicable)</Label>
                        <Input placeholder="e.g. University of Sydney, UNSW…" value={s.targetUniversity} onChange={e => updateStudent(s._key, "targetUniversity", e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          <Button variant="outline" className="w-full" onClick={addStudent}>
            <Plus className="w-4 h-4 mr-2" /> Add Another Student
          </Button>
        </div>

        {/* Save Button (bottom) */}
        <div className="flex justify-end pb-6">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="lg" className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Saving…" : "Save Consultation"}
          </Button>
        </div>
      </div>

      {showPrint && !isNew && (
        <ConsultationPrintModal
          title="Schooling Consultation"
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
              ],
            },
            {
              title: "Guardian Information",
              rows: [
                { label: "Guardian Name", value: form.guardianName },
                { label: "Relationship", value: form.relationship },
                { label: "Phone", value: form.phone },
                { label: "Email", value: form.email },
                { label: "KakaoTalk ID", value: form.kakaoId },
                { label: "Messenger ID", value: form.messengerId },
                { label: "Accompanying Students", value: form.accompaniment },
                { label: "Referral Sources", value: form.referralSources },
              ],
            },
            {
              title: "Study Preferences",
              rows: [
                { label: "Preferred AU States", value: form.preferredStates },
                { label: "Urban Preference (1-5)", value: form.urbanPreference?.toString() },
                { label: "School Types", value: form.schoolTypes },
                { label: "School Priorities", value: form.schoolPriorities },
                { label: "Preferred Schools", value: form.preferredSchools },
                { label: "Study Duration", value: form.studyDuration },
                { label: "Target Term", value: form.targetTerm },
                { label: "Accommodation", value: form.accommodation },
                { label: "Annual Budget", value: form.annualBudget },
                { label: "Main Concerns", value: form.concerns },
                { label: "Special Notes", value: form.specialNote },
              ],
            },
            {
              title: "Consultation Schedule",
              rows: [
                { label: "Preferred Method", value: form.consultMethod },
                { label: "Available Times", value: form.consultTimes },
              ],
            },
            ...students.map((s, i) => ({
              title: `Student ${i + 1}${s.name ? ` — ${s.name}` : ""}`,
              rows: [
                { label: "Name", value: s.name },
                { label: "Gender", value: s.gender },
                { label: "Date of Birth", value: s.dateOfBirth },
                { label: "Current Grade", value: s.currentGrade },
                { label: "Current School", value: s.currentSchool },
                { label: "Current City", value: s.currentCity },
                { label: "English Level", value: s.englishLevel },
                { label: "English Score", value: s.englishScore },
                { label: "Target AU Grade", value: s.targetAuGrade },
                { label: "Learning Style", value: s.learningStyle?.toString() },
                { label: "Sociability", value: s.sociability?.toString() },
                { label: "Independence", value: s.independence?.toString() },
                { label: "Emotional Stability", value: s.emotionalStability?.toString() },
                { label: "Interests", value: s.interests },
                { label: "Post-Grad Plans", value: s.postGradPlans },
                { label: "Target University", value: s.targetUniversity },
              ],
            })),
            {
              title: "Admin Notes",
              rows: [
                { label: "Notes", value: form.adminNotes },
              ],
            },
          ]}
        />
      )}
    </div>
  );
}
