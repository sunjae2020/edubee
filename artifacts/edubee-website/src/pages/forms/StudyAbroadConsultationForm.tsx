import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { PageBackground } from "@/components/ui/PageBackground";
import { FadeIn } from "@/components/ui/FadeIn";
import { Button } from "@/components/ui/Button";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const DESTINATIONS = ["Australia", "New Zealand", "United Kingdom", "United States", "Canada", "Ireland", "Singapore", "Japan", "Other"];
const COURSE_TYPES = ["ELICOS (English)", "Certificate / Diploma", "Bachelor's Degree", "Master's Degree", "PhD", "Vocational / TAFE", "Exchange Program", "Short Course"];
const STUDY_LEVELS = ["English Language", "Certificate / Diploma", "Undergraduate (Bachelor)", "Postgraduate (Master)", "PhD / Research", "Vocational (TAFE/VET)"];
const FIELDS = ["Business / Management", "IT / Computer Science", "Engineering", "Health / Nursing", "Education", "Arts / Design", "Law", "Science", "Social Science", "Hospitality / Tourism", "Other"];
const DURATIONS = ["Less than 3 months", "3–6 months", "6–12 months", "1–2 years", "2+ years", "Full degree"];
const TERMS = ["2025 S1 (Feb)", "2025 S2 (Jul)", "2026 S1 (Feb)", "2026 S2 (Jul)", "Flexible / Undecided"];
const ENG_LEVELS = ["Beginner", "Elementary", "Intermediate", "Upper-Intermediate", "Advanced", "Native"];
const ENG_TESTS = ["IELTS", "TOEFL", "PTE Academic", "Cambridge", "Duolingo English Test", "Not taken yet"];
const EDU_LEVELS = ["High School (in progress)", "High School (completed)", "Certificate / Diploma", "Bachelor's Degree (in progress)", "Bachelor's Degree (completed)", "Master's Degree", "Other"];
const REFERRAL_SOURCES = ["Google", "SNS / Social Media", "Friend / Family", "Agent Referral", "Exhibition / Event", "Other"];

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

export default function StudyAbroadConsultationForm() {
  const [submitted, setSubmitted] = useState(false);
  const [refNumber, setRefNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "", lastName: "", dateOfBirth: "", gender: "",
    email: "", phone: "", nationality: "", currentCity: "", currentCountry: "", kakaoId: "",
    destinationCountries: [] as string[],
    courseTypes: [] as string[],
    studyLevel: "", fieldOfStudy: "", studyDuration: "", targetStartTerm: "",
    preferredInstitutions: "",
    englishLevel: "", englishTestType: "", englishScore: "",
    currentEducationLevel: "", currentInstitution: "", workExperience: "",
    annualBudget: "", fundingSource: "", visaTypeInterest: "",
    questionsNotes: "",
    referralSources: [] as string[],
    privacyConsent: false,
    marketingConsent: false,
  });

  const update = (k: keyof typeof form) => (v: any) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.privacyConsent) { setError("Please agree to the privacy policy to continue."); return; }
    if (!form.firstName || !form.email) { setError("First name and email are required."); return; }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/api/public/consultations/study-abroad`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
              Study Abroad Consultation
            </h1>
            <p className="text-neutral-600 text-sm max-w-xl mx-auto">
              Enquire about higher education, vocational study, or English language programs overseas.
              Our consultants will be in touch within 1–2 business days.
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
              {/* Personal Info */}
              <SectionCard title="Personal Information">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FieldGroup label="First Name *">
                    <TextInput value={form.firstName} onChange={update("firstName")} placeholder="Jane" required />
                  </FieldGroup>
                  <FieldGroup label="Last Name *">
                    <TextInput value={form.lastName} onChange={update("lastName")} placeholder="Smith" required />
                  </FieldGroup>
                  <FieldGroup label="Date of Birth">
                    <TextInput value={form.dateOfBirth} onChange={update("dateOfBirth")} type="date" />
                  </FieldGroup>
                  <FieldGroup label="Gender">
                    <SelectInput value={form.gender} onChange={update("gender")} options={["Male", "Female", "Other / Prefer not to say"]} />
                  </FieldGroup>
                  <FieldGroup label="Email *">
                    <TextInput value={form.email} onChange={update("email")} placeholder="you@example.com" type="email" required />
                  </FieldGroup>
                  <FieldGroup label="Phone *">
                    <TextInput value={form.phone} onChange={update("phone")} placeholder="+82 10 1234 5678" type="tel" required />
                  </FieldGroup>
                  <FieldGroup label="Nationality">
                    <TextInput value={form.nationality} onChange={update("nationality")} placeholder="e.g. Korean" />
                  </FieldGroup>
                  <FieldGroup label="Current City">
                    <TextInput value={form.currentCity} onChange={update("currentCity")} placeholder="e.g. Seoul" />
                  </FieldGroup>
                  <FieldGroup label="Current Country">
                    <TextInput value={form.currentCountry} onChange={update("currentCountry")} placeholder="e.g. South Korea" />
                  </FieldGroup>
                  <FieldGroup label="KakaoTalk ID">
                    <TextInput value={form.kakaoId} onChange={update("kakaoId")} placeholder="kakao_id" />
                  </FieldGroup>
                </div>
                <FieldGroup label="How did you hear about us?">
                  <CheckGroup options={REFERRAL_SOURCES} value={form.referralSources} onChange={update("referralSources")} />
                </FieldGroup>
              </SectionCard>

              {/* Study Preferences */}
              <SectionCard title="Study Preferences">
                <FieldGroup label="Preferred Destination(s)">
                  <CheckGroup options={DESTINATIONS} value={form.destinationCountries} onChange={update("destinationCountries")} />
                </FieldGroup>
                <FieldGroup label="Course Type(s)">
                  <CheckGroup options={COURSE_TYPES} value={form.courseTypes} onChange={update("courseTypes")} />
                </FieldGroup>
                <div className="grid sm:grid-cols-2 gap-4">
                  <FieldGroup label="Study Level">
                    <SelectInput value={form.studyLevel} onChange={update("studyLevel")} options={STUDY_LEVELS} placeholder="Select level…" />
                  </FieldGroup>
                  <FieldGroup label="Field of Study">
                    <SelectInput value={form.fieldOfStudy} onChange={update("fieldOfStudy")} options={FIELDS} placeholder="Select field…" />
                  </FieldGroup>
                  <FieldGroup label="Study Duration">
                    <SelectInput value={form.studyDuration} onChange={update("studyDuration")} options={DURATIONS} placeholder="Select duration…" />
                  </FieldGroup>
                  <FieldGroup label="Target Start Term">
                    <SelectInput value={form.targetStartTerm} onChange={update("targetStartTerm")} options={TERMS} placeholder="Select term…" />
                  </FieldGroup>
                </div>
                <FieldGroup label="Preferred Institutions (optional)">
                  <TextInput value={form.preferredInstitutions} onChange={update("preferredInstitutions")} placeholder="e.g. UNSW, University of Melbourne…" />
                </FieldGroup>
              </SectionCard>

              {/* Academic Background */}
              <SectionCard title="Academic Background">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FieldGroup label="English Proficiency Level">
                    <SelectInput value={form.englishLevel} onChange={update("englishLevel")} options={ENG_LEVELS} placeholder="Select level…" />
                  </FieldGroup>
                  <FieldGroup label="English Test Taken">
                    <SelectInput value={form.englishTestType} onChange={update("englishTestType")} options={ENG_TESTS} placeholder="Select test…" />
                  </FieldGroup>
                  <FieldGroup label="Test Score (if applicable)">
                    <TextInput value={form.englishScore} onChange={update("englishScore")} placeholder="e.g. IELTS 6.5" />
                  </FieldGroup>
                  <FieldGroup label="Highest Education Level">
                    <SelectInput value={form.currentEducationLevel} onChange={update("currentEducationLevel")} options={EDU_LEVELS} placeholder="Select…" />
                  </FieldGroup>
                  <FieldGroup label="Current Institution (if applicable)">
                    <TextInput value={form.currentInstitution} onChange={update("currentInstitution")} placeholder="University / School name" />
                  </FieldGroup>
                  <FieldGroup label="Work Experience">
                    <SelectInput value={form.workExperience} onChange={update("workExperience")} options={["No experience", "Less than 1 year", "1–3 years", "3–5 years", "5+ years"]} placeholder="Select…" />
                  </FieldGroup>
                </div>
              </SectionCard>

              {/* Financial */}
              <SectionCard title="Budget &amp; Funding">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FieldGroup label="Annual Budget (AUD)">
                    <SelectInput value={form.annualBudget} onChange={update("annualBudget")} options={["Under $20,000", "$20,000 – $35,000", "$35,000 – $50,000", "$50,000 – $70,000", "$70,000+", "Undecided"]} placeholder="Select budget…" />
                  </FieldGroup>
                  <FieldGroup label="Funding Source">
                    <SelectInput value={form.fundingSource} onChange={update("fundingSource")} options={["Self-funded", "Family support", "Scholarship", "Employer-sponsored", "Loan", "Combination"]} placeholder="Select…" />
                  </FieldGroup>
                  <FieldGroup label="Visa Type of Interest">
                    <SelectInput value={form.visaTypeInterest} onChange={update("visaTypeInterest")} options={["Student Visa", "Working Holiday", "Graduate Visa", "Not sure yet"]} placeholder="Select…" />
                  </FieldGroup>
                </div>
              </SectionCard>

              {/* Notes */}
              <SectionCard title="Questions &amp; Additional Notes">
                <FieldGroup label="Anything specific you'd like to ask?">
                  <textarea
                    value={form.questionsNotes}
                    onChange={e => update("questionsNotes")(e.target.value)}
                    rows={4}
                    placeholder="Share any questions, special circumstances, or requirements…"
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#F5821F]/30 focus:border-[#F5821F] resize-none"
                  />
                </FieldGroup>
              </SectionCard>

              {/* Privacy */}
              <SectionCard title="Privacy &amp; Consent">
                <div className="space-y-3">
                  <label className="flex gap-3 items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.privacyConsent}
                      onChange={e => update("privacyConsent")(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#F5821F] flex-shrink-0"
                    />
                    <span className="text-sm text-neutral-600 leading-relaxed">
                      I agree to the collection and use of my personal information for consultation purposes.
                      Your data is handled in accordance with our{" "}
                      <a href="/about/security" target="_blank" className="text-[#F5821F] underline">Privacy Policy</a>.
                    </span>
                  </label>
                  <label className="flex gap-3 items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.marketingConsent}
                      onChange={e => update("marketingConsent")(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#F5821F] flex-shrink-0"
                    />
                    <span className="text-sm text-neutral-600 leading-relaxed">
                      I'd like to receive newsletters and updates from Edubee. (Optional)
                    </span>
                  </label>
                </div>
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
