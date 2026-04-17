import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { PageBackground } from "@/components/ui/PageBackground";
import { FadeIn } from "@/components/ui/FadeIn";
import { Button } from "@/components/ui/Button";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const SCHOOL_TYPES = ["Public", "Catholic", "Independent", "Grammar", "International", "Boarding"];
const CONSULT_METHODS = ["Phone Call", "Zoom / Video Call", "In-Person", "KakaoTalk", "Email"];
const REFERRAL_SOURCES = ["Google", "SNS / Social Media", "Friend / Family", "Agent Referral", "Exhibition / Event", "Other"];
const DURATIONS = ["1 term", "2 terms", "3 terms", "1 year", "2 years", "3+ years", "Undecided"];
const TERMS = ["2025 Term 1", "2025 Term 2", "2025 Term 3", "2025 Term 4", "2026 Term 1", "2026 Term 2", "2026 Term 3", "2026 Term 4"];
const GENDERS = ["Male", "Female", "Other / Prefer not to say"];
const GRADES = ["Year 1","Year 2","Year 3","Year 4","Year 5","Year 6","Year 7","Year 8","Year 9","Year 10","Year 11","Year 12"];

interface Student {
  name: string;
  gender: string;
  dateOfBirth: string;
  currentGrade: string;
  currentSchool: string;
  currentCity: string;
}

function emptyStudent(): Student {
  return { name: "", gender: "", dateOfBirth: "", currentGrade: "", currentSchool: "", currentCity: "" };
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-neutral-700">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", required }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#F5821F]/30 focus:border-[#F5821F]"
    />
  );
}

function SelectInput({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#F5821F]/30 focus:border-[#F5821F] bg-white"
    >
      <option value="">{placeholder || "Select…"}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function CheckGroup({ options, value, onChange }: {
  options: string[]; value: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
            value.includes(opt)
              ? "bg-[#F5821F] border-[#F5821F] text-white"
              : "border-neutral-200 text-neutral-600 hover:border-[#F5821F]"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
      <h3 className="text-base font-semibold text-neutral-800 pb-1 border-b border-neutral-100">{title}</h3>
      {children}
    </div>
  );
}

export default function SchoolingConsultationForm() {
  const [submitted, setSubmitted] = useState(false);
  const [refNumber, setRefNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    guardianName: "",
    relationship: "",
    phone: "",
    email: "",
    kakaoId: "",
    accompaniment: "",
    referralSources: [] as string[],
    preferredStates: [] as string[],
    schoolTypes: [] as string[],
    studyDuration: "",
    targetTerm: "",
    annualBudget: "",
    specialNote: "",
    consultMethod: "",
    privacyConsent: false,
  });

  const [students, setStudents] = useState<Student[]>([emptyStudent()]);

  const updateForm = (k: keyof typeof form) => (v: any) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const updateStudent = (i: number, k: keyof Student) => (v: string) =>
    setStudents(prev => prev.map((s, idx) => idx === i ? { ...s, [k]: v } : s));

  const addStudent = () => setStudents(prev => [...prev, emptyStudent()]);
  const removeStudent = (i: number) => setStudents(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.privacyConsent) { setError("Please agree to the privacy policy to continue."); return; }
    if (!form.guardianName || !form.email) { setError("Guardian name and email are required."); return; }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/api/public/consultations/schooling`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, students }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setRefNumber(data.refNumber);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-16 bg-neutral-50 min-h-screen relative overflow-hidden">
      <PageBackground variant="wave" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10">
        <FadeIn>
          <div className="text-center mb-10">
            <span className="inline-block px-3 py-1 bg-[#FEF0E3] text-[#F5821F] text-xs font-semibold rounded-full mb-3">
              FREE CONSULTATION
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-3">
              Schooling Consultation
            </h1>
            <p className="text-neutral-600 text-sm max-w-xl mx-auto">
              Enquire about K–12 schooling in Australia. Our consultants will review your request and contact you within 1–2 business days.
            </p>
          </div>

          {submitted ? (
            <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center shadow-sm">
              <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">Enquiry Submitted!</h2>
              <p className="text-neutral-600 text-sm mb-4">
                Thank you for reaching out. Our team will contact you within 1–2 business days.
              </p>
              {refNumber && (
                <div className="inline-block bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2">
                  <span className="text-xs text-neutral-500 block">Reference Number</span>
                  <span className="text-lg font-bold text-[#F5821F]">{refNumber}</span>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Guardian Info */}
              <SectionCard title="Guardian / Parent Information">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FieldGroup label="Guardian Name *">
                    <TextInput value={form.guardianName} onChange={updateForm("guardianName")} placeholder="e.g. Jane Smith" required />
                  </FieldGroup>
                  <FieldGroup label="Relationship to Student">
                    <SelectInput value={form.relationship} onChange={updateForm("relationship")} options={["Parent", "Grandparent", "Guardian", "Other"]} placeholder="Select…" />
                  </FieldGroup>
                  <FieldGroup label="Phone *">
                    <TextInput value={form.phone} onChange={updateForm("phone")} placeholder="+82 10 1234 5678" type="tel" required />
                  </FieldGroup>
                  <FieldGroup label="Email *">
                    <TextInput value={form.email} onChange={updateForm("email")} placeholder="you@example.com" type="email" required />
                  </FieldGroup>
                  <FieldGroup label="KakaoTalk ID">
                    <TextInput value={form.kakaoId} onChange={updateForm("kakaoId")} placeholder="kakao_id" />
                  </FieldGroup>
                  <FieldGroup label="Accompanying Students?">
                    <SelectInput value={form.accompaniment} onChange={updateForm("accompaniment")} options={["Yes — guardian will accompany", "No — students will be unaccompanied", "Undecided"]} placeholder="Select…" />
                  </FieldGroup>
                </div>
                <FieldGroup label="How did you hear about us?">
                  <CheckGroup options={REFERRAL_SOURCES} value={form.referralSources} onChange={updateForm("referralSources")} />
                </FieldGroup>
              </SectionCard>

              {/* Students */}
              <SectionCard title="Student Information">
                {students.map((s, i) => (
                  <div key={i} className="border border-neutral-100 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-700">Student {i + 1}</span>
                      {students.length > 1 && (
                        <button type="button" onClick={() => removeStudent(i)} className="text-xs text-red-500 hover:underline">Remove</button>
                      )}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <FieldGroup label="Full Name">
                        <TextInput value={s.name} onChange={updateStudent(i, "name")} placeholder="Student Name" />
                      </FieldGroup>
                      <FieldGroup label="Gender">
                        <SelectInput value={s.gender} onChange={updateStudent(i, "gender")} options={GENDERS} />
                      </FieldGroup>
                      <FieldGroup label="Date of Birth">
                        <TextInput value={s.dateOfBirth} onChange={updateStudent(i, "dateOfBirth")} type="date" />
                      </FieldGroup>
                      <FieldGroup label="Current Grade">
                        <SelectInput value={s.currentGrade} onChange={updateStudent(i, "currentGrade")} options={GRADES} />
                      </FieldGroup>
                      <FieldGroup label="Current School">
                        <TextInput value={s.currentSchool} onChange={updateStudent(i, "currentSchool")} placeholder="School name" />
                      </FieldGroup>
                      <FieldGroup label="Current City / Country">
                        <TextInput value={s.currentCity} onChange={updateStudent(i, "currentCity")} placeholder="e.g. Seoul, Korea" />
                      </FieldGroup>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addStudent} className="text-sm text-[#F5821F] hover:underline font-medium">
                  + Add Another Student
                </button>
              </SectionCard>

              {/* Study Preferences */}
              <SectionCard title="Study Preferences">
                <FieldGroup label="Preferred Australian States">
                  <CheckGroup options={AU_STATES} value={form.preferredStates} onChange={updateForm("preferredStates")} />
                </FieldGroup>
                <FieldGroup label="Preferred School Types">
                  <CheckGroup options={SCHOOL_TYPES} value={form.schoolTypes} onChange={updateForm("schoolTypes")} />
                </FieldGroup>
                <div className="grid sm:grid-cols-2 gap-4">
                  <FieldGroup label="Study Duration">
                    <SelectInput value={form.studyDuration} onChange={updateForm("studyDuration")} options={DURATIONS} placeholder="Select duration…" />
                  </FieldGroup>
                  <FieldGroup label="Target Start Term">
                    <SelectInput value={form.targetTerm} onChange={updateForm("targetTerm")} options={TERMS} placeholder="Select term…" />
                  </FieldGroup>
                  <FieldGroup label="Annual Budget (AUD)">
                    <SelectInput value={form.annualBudget} onChange={updateForm("annualBudget")} options={["Under $30,000", "$30,000 – $40,000", "$40,000 – $50,000", "$50,000 – $60,000", "$60,000+", "Undecided"]} placeholder="Select budget…" />
                  </FieldGroup>
                  <FieldGroup label="Preferred Consultation Method">
                    <SelectInput value={form.consultMethod} onChange={updateForm("consultMethod")} options={CONSULT_METHODS} placeholder="Select method…" />
                  </FieldGroup>
                </div>
                <FieldGroup label="Additional Notes or Questions">
                  <textarea
                    value={form.specialNote}
                    onChange={e => updateForm("specialNote")(e.target.value)}
                    rows={3}
                    placeholder="Any specific questions or requirements…"
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#F5821F]/30 focus:border-[#F5821F] resize-none"
                  />
                </FieldGroup>
              </SectionCard>

              {/* Privacy */}
              <SectionCard title="Privacy &amp; Consent">
                <label className="flex gap-3 items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.privacyConsent}
                    onChange={e => updateForm("privacyConsent")(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#F5821F] flex-shrink-0"
                  />
                  <span className="text-sm text-neutral-600 leading-relaxed">
                    I agree to the collection and use of my personal information for consultation purposes.
                    Your data is handled in accordance with our{" "}
                    <a href="/about/security" target="_blank" className="text-[#F5821F] underline">Privacy Policy</a>.
                  </span>
                </label>
              </SectionCard>

              {error && (
                <p className="text-sm text-red-600 text-center">{error}</p>
              )}

              <Button variant="primary" fullWidth disabled={loading} onClick={() => {}}>
                {loading
                  ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</span>
                  : "Submit Consultation Request"}
              </Button>

              <p className="text-center text-xs text-neutral-400 pb-4">
                After submission you'll receive a reference number for follow-up.
              </p>
            </form>
          )}
        </FadeIn>
      </div>
    </section>
  );
}
