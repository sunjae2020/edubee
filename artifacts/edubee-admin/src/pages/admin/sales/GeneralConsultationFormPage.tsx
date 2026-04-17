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

// ── Options ───────────────────────────────────────────────────────────────
const STATUSES       = ["new","in_progress","contacted","closed"];
const LANGUAGES      = [{ value:"en", label:"English" }, { value:"ko", label:"Korean" }, { value:"zh", label:"Chinese" }];
const GENDERS        = ["Male","Female","Non-binary","Prefer not to say"];

const TOPICS = [
  "Study Abroad",
  "Schooling / K-12",
  "University Admission",
  "English Language Programme",
  "Vocational / VET",
  "Student Visa",
  "Working Holiday Visa",
  "Skilled Migration",
  "Accommodation",
  "Airport Pickup",
  "Summer / Winter Camp",
  "Other",
];

const TIMELINES = [
  "As soon as possible",
  "Within 3 months",
  "3–6 months",
  "6–12 months",
  "More than 1 year",
  "Not sure yet",
];

const BUDGET_RANGES = [
  "Under $5K",
  "Under $10K",
  "$10K–$20K",
  "$20K–$40K",
  "$40K–$60K",
  "$60K+",
  "Flexible",
];

const CONTACT_METHODS = ["Email","Phone","KakaoTalk","WeChat","LINE","WhatsApp","In-Person"];
const CONTACT_TIMES   = ["Anytime","Morning (9AM–12PM)","Afternoon (12PM–5PM)","Evening (5PM–9PM)","Weekdays only","Weekends only"];
const REFERRAL_SOURCES = ["Word of Mouth","Social Media","Google","Blog / Article","Event / Seminar","Agency Partner","Other"];

// ── Empty Form ─────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  status: "new", assignedTo: "", adminNotes: "", language: "en",
  firstName: "", lastName: "", fullName: "",
  dateOfBirth: "", gender: "",
  email: "", phone: "",
  currentCity: "", currentCountry: "", nationality: "",
  kakaoId: "", messengerId: "",
  topics: [] as string[],
  topicOther: "",
  inquirySummary: "",
  targetTimeline: "",
  budgetRange: "",
  preferredDestination: "",
  questionsNotes: "",
  referralSources: [] as string[],
  preferredContactMethod: "",
  preferredContactTime: "",
  consultantName: "",
  documentNotes: "",
  privacyConsent: false,
  marketingConsent: false,
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
export default function GeneralConsultationFormPage() {
  const { id } = useParams<{ id: string }>();
  const isNew   = !id || id === "new";
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showPrint, setShowPrint] = useState(false);

  const { data: existingData, isLoading } = useQuery({
    queryKey: ["general-consultation", id],
    enabled: !isNew,
    queryFn: async () => {
      const res = await axios.get(`${BASE}/api/general-consultations/${id}`);
      return res.data;
    },
  });

  useEffect(() => {
    if (!existingData) return;
    const d = existingData as any;
    setForm({
      status:                 d.status                 ?? "new",
      assignedTo:             d.assignedTo             ?? "",
      adminNotes:             d.adminNotes             ?? "",
      language:               d.language               ?? "en",
      firstName:              d.firstName              ?? "",
      lastName:               d.lastName               ?? "",
      fullName:               d.fullName               ?? "",
      dateOfBirth:            d.dateOfBirth            ?? "",
      gender:                 d.gender                 ?? "",
      email:                  d.email                  ?? "",
      phone:                  d.phone                  ?? "",
      currentCity:            d.currentCity            ?? "",
      currentCountry:         d.currentCountry         ?? "",
      nationality:            d.nationality            ?? "",
      kakaoId:                d.kakaoId                ?? "",
      messengerId:            d.messengerId            ?? "",
      topics:                 d.topics                 ?? [],
      topicOther:             d.topicOther             ?? "",
      inquirySummary:         d.inquirySummary         ?? "",
      targetTimeline:         d.targetTimeline         ?? "",
      budgetRange:            d.budgetRange            ?? "",
      preferredDestination:   d.preferredDestination   ?? "",
      questionsNotes:         d.questionsNotes         ?? "",
      referralSources:        d.referralSources        ?? [],
      preferredContactMethod: d.preferredContactMethod ?? "",
      preferredContactTime:   d.preferredContactTime   ?? "",
      consultantName:         d.consultantName         ?? "",
      documentNotes:          d.documentNotes          ?? "",
      privacyConsent:         d.privacyConsent         ?? false,
      marketingConsent:       d.marketingConsent       ?? false,
    });
  }, [existingData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isNew) return axios.post(`${BASE}/api/general-consultations`, form);
      return axios.patch(`${BASE}/api/general-consultations/${id}`, form);
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["general-consultations"] });
      toast({ title: isNew ? "Consultation created." : "Consultation updated." });
      if (isNew) navigate(`/admin/sales/general-consultations/${res.data.id}`);
    },
    onError: () => toast({ title: "Failed to save.", variant: "destructive" }),
  });

  const setField = (key: keyof typeof form, value: any) =>
    setForm(f => ({ ...f, [key]: value }));

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
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/sales/general-consultations")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {isNew ? "New General Consultation" : "Edit General Consultation"}
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

        {/* ─── Contact Information ─── */}
        <SectionCard title="Contact Information">
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

        {/* ─── Consultation Topics ─── */}
        <SectionCard title="Consultation Topics" subtitle="Select all that apply">
          <div className="space-y-2">
            <MultiCheck options={TOPICS} selected={form.topics} onChange={v => setField("topics", v)} />
          </div>
          {form.topics.includes("Other") && (
            <div className="space-y-1.5">
              <Label>Other — please describe</Label>
              <Input placeholder="Describe your topic" value={form.topicOther} onChange={e => setField("topicOther", e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Inquiry Summary</Label>
            <Textarea
              rows={3}
              placeholder="Briefly describe what you're looking for or what you'd like help with…"
              value={form.inquirySummary}
              onChange={e => setField("inquirySummary", e.target.value)}
            />
          </div>
        </SectionCard>

        {/* ─── Preferences ─── */}
        <SectionCard title="Preferences & Timeline">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Preferred Destination</Label>
              <Input placeholder="e.g. Australia, Canada, UK…" value={form.preferredDestination} onChange={e => setField("preferredDestination", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Target Timeline</Label>
              <Select value={form.targetTimeline} onValueChange={v => setField("targetTimeline", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {TIMELINES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Budget Range</Label>
              <Select value={form.budgetRange} onValueChange={v => setField("budgetRange", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {BUDGET_RANGES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Preferred Contact Method</Label>
              <Select value={form.preferredContactMethod} onValueChange={v => setField("preferredContactMethod", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {CONTACT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Preferred Contact Time</Label>
              <Select value={form.preferredContactTime} onValueChange={v => setField("preferredContactTime", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {CONTACT_TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </SectionCard>

        {/* ─── Additional Information ─── */}
        <SectionCard title="Additional Information" subtitle="Anything else that helps us prepare for your consultation">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Consultant Name</Label>
              <Input
                placeholder="Name of the consultant who referred you, if applicable"
                value={form.consultantName}
                onChange={e => setField("consultantName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Questions or Notes</Label>
              <Textarea
                rows={3}
                placeholder="Any questions, concerns, or information you'd like to share before the consultation…"
                value={form.questionsNotes}
                onChange={e => setField("questionsNotes", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
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
          title="General Consultation"
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
              title: "Contact Information",
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
                { label: "Preferred Contact Method", value: form.preferredContactMethod },
                { label: "Preferred Contact Time", value: form.preferredContactTime },
                { label: "Referral Sources", value: form.referralSources },
              ],
            },
            {
              title: "Inquiry Details",
              rows: [
                { label: "Topics", value: form.topics },
                { label: "Other Topic", value: form.topicOther },
                { label: "Inquiry Summary", value: form.inquirySummary },
                { label: "Target Timeline", value: form.targetTimeline },
                { label: "Budget Range", value: form.budgetRange },
                { label: "Preferred Destination", value: form.preferredDestination },
                { label: "Questions / Notes", value: form.questionsNotes },
              ],
            },
            {
              title: "Admin Notes",
              rows: [
                { label: "Notes", value: form.adminNotes },
                { label: "Document Notes", value: form.documentNotes },
                { label: "Consultant Name", value: form.consultantName },
              ],
            },
          ]}
        />
      )}
    </div>
  );
}
