import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { PageBackground } from "@/components/ui/PageBackground";
import { FadeIn } from "@/components/ui/FadeIn";
import { Button } from "@/components/ui/Button";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const TOPICS = [
  "Study Abroad", "K-12 Schooling", "English Language Course",
  "Visa Application", "Camp / Short Program", "Migration / PR",
  "University Application", "Accommodation", "Other",
];
const DESTINATIONS = ["Australia", "New Zealand", "UK", "USA", "Canada", "Ireland", "Singapore", "Japan", "Other"];
const TIMELINES = ["ASAP", "Within 3 months", "3–6 months", "6–12 months", "1–2 years", "Undecided"];
const CONTACT_METHODS = ["Phone Call", "Zoom / Video Call", "KakaoTalk", "Email", "WhatsApp"];
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

export default function GeneralConsultationForm() {
  const [submitted, setSubmitted] = useState(false);
  const [refNumber, setRefNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    nationality: "", currentCity: "", currentCountry: "", kakaoId: "",
    topics: [] as string[], topicOther: "",
    inquirySummary: "",
    preferredDestination: "", targetTimeline: "", budgetRange: "",
    preferredContactMethod: "", preferredContactTime: "",
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
      const res = await fetch(`${BASE}/api/public/consultations/general`, {
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
              General Enquiry
            </h1>
            <p className="text-neutral-600 text-sm max-w-xl mx-auto">
              Have a question about studying, visas, camps, or migration? Submit your enquiry and our team will get back to you within 1–2 business days.
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
              {/* Contact Info */}
              <SectionCard title="Your Information">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FieldGroup label="First Name *">
                    <TextInput value={form.firstName} onChange={update("firstName")} placeholder="Jane" required />
                  </FieldGroup>
                  <FieldGroup label="Last Name *">
                    <TextInput value={form.lastName} onChange={update("lastName")} placeholder="Smith" required />
                  </FieldGroup>
                  <FieldGroup label="Email *">
                    <TextInput value={form.email} onChange={update("email")} placeholder="you@example.com" type="email" required />
                  </FieldGroup>
                  <FieldGroup label="Phone">
                    <TextInput value={form.phone} onChange={update("phone")} placeholder="+82 10 1234 5678" type="tel" />
                  </FieldGroup>
                  <FieldGroup label="Nationality">
                    <TextInput value={form.nationality} onChange={update("nationality")} placeholder="e.g. Korean" />
                  </FieldGroup>
                  <FieldGroup label="Current City / Country">
                    <TextInput value={form.currentCity} onChange={update("currentCity")} placeholder="e.g. Seoul, Korea" />
                  </FieldGroup>
                  <FieldGroup label="KakaoTalk ID">
                    <TextInput value={form.kakaoId} onChange={update("kakaoId")} placeholder="kakao_id" />
                  </FieldGroup>
                </div>
                <FieldGroup label="How did you hear about us?">
                  <CheckGroup options={REFERRAL_SOURCES} value={form.referralSources} onChange={update("referralSources")} />
                </FieldGroup>
              </SectionCard>

              {/* Topics */}
              <SectionCard title="Enquiry Topics">
                <FieldGroup label="What are you enquiring about? (select all that apply)">
                  <CheckGroup options={TOPICS} value={form.topics} onChange={update("topics")} />
                </FieldGroup>
                {form.topics.includes("Other") && (
                  <FieldGroup label="Please specify">
                    <TextInput value={form.topicOther} onChange={update("topicOther")} placeholder="Describe your topic…" />
                  </FieldGroup>
                )}
                <FieldGroup label="Brief summary of your enquiry *">
                  <textarea
                    value={form.inquirySummary}
                    onChange={e => update("inquirySummary")(e.target.value)}
                    rows={4}
                    placeholder="Please describe what you're looking for…"
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#F5821F]/30 focus:border-[#F5821F] resize-none"
                  />
                </FieldGroup>
              </SectionCard>

              {/* Preferences */}
              <SectionCard title="Preferences &amp; Timeline">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FieldGroup label="Preferred Destination">
                    <SelectInput value={form.preferredDestination} onChange={update("preferredDestination")} options={DESTINATIONS} placeholder="Select…" />
                  </FieldGroup>
                  <FieldGroup label="Target Timeline">
                    <SelectInput value={form.targetTimeline} onChange={update("targetTimeline")} options={TIMELINES} placeholder="Select…" />
                  </FieldGroup>
                  <FieldGroup label="Budget Range (AUD)">
                    <SelectInput value={form.budgetRange} onChange={update("budgetRange")} options={["Under $10,000", "$10,000 – $20,000", "$20,000 – $40,000", "$40,000 – $60,000", "$60,000+", "Not sure"]} placeholder="Select…" />
                  </FieldGroup>
                  <FieldGroup label="Preferred Contact Method">
                    <SelectInput value={form.preferredContactMethod} onChange={update("preferredContactMethod")} options={CONTACT_METHODS} placeholder="Select…" />
                  </FieldGroup>
                  <FieldGroup label="Best Time to Contact">
                    <TextInput value={form.preferredContactTime} onChange={update("preferredContactTime")} placeholder="e.g. Weekday mornings (AEST)" />
                  </FieldGroup>
                </div>
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
                  : "Submit Enquiry"}
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
