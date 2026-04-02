import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const inp = "w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-white transition";
const sel = "w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-white transition";
const area = "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-white transition resize-none";

const INQUIRY_TYPES = [
  "Study Abroad",
  "English Language Course",
  "University Placement",
  "Work Experience",
  "Internship Program",
  "Gap Year Program",
  "Summer Camp",
  "Other",
];

const NATIONALITIES = [
  "Australian", "British", "Canadian", "Chinese", "French", "German",
  "Indonesian", "Japanese", "Korean", "Malaysian", "New Zealand",
  "Philippine", "Singaporean", "Thai", "Vietnamese", "American", "Other",
];

export interface LeadFormInfo {
  id: string;
  name: string;
  description: string | null;
  redirectUrl: string | null;
}

export default function LeadInquiryContent({ formInfo }: { formInfo: LeadFormInfo }) {
  const [submitted, setSubmitted] = useState(false);
  const [submittedName, setSubmittedName] = useState("");

  const [firstName,         setFirstName]         = useState("");
  const [lastName,          setLastName]           = useState("");
  const [email,             setEmail]             = useState("");
  const [phone,             setPhone]             = useState("");
  const [nationality,       setNationality]       = useState("");
  const [inquiryType,       setInquiryType]       = useState("");
  const [message,           setMessage]           = useState("");
  const [budget,            setBudget]            = useState("");
  const [expectedStartDate, setExpectedStartDate] = useState("");

  const submit = useMutation({
    mutationFn: () =>
      axios.post(`${BASE}/api/public/lead-inquiry`, {
        formId: formInfo.id,
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        nationality: nationality || null,
        inquiryType: inquiryType || null,
        message: message || null,
        budget: budget ? Number(budget) : null,
        expectedStartDate: expectedStartDate || null,
        referralSource: "web_form",
      }).then(r => r.data),
    onSuccess: (data) => {
      setSubmittedName(data.fullName ?? `${firstName} ${lastName}`.trim());
      if (formInfo.redirectUrl) {
        setTimeout(() => { window.location.href = formInfo.redirectUrl!; }, 3000);
      } else {
        setSubmitted(true);
      }
    },
  });

  const canSubmit = (firstName || lastName) && (email || phone) && !submit.isPending;

  /* ── Success ── */
  if (submitted || (submit.isSuccess && !!formInfo.redirectUrl)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Thank You, {submittedName}!</h2>
          <p className="text-sm text-gray-500 mb-1">Your inquiry has been received.</p>
          <p className="text-sm text-gray-500">Our team will be in touch with you shortly.</p>
          {formInfo.redirectUrl && (
            <p className="text-xs text-gray-400 mt-4">Redirecting you in a moment…</p>
          )}
        </div>
      </div>
    );
  }

  /* ── Form ── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Header */}
      <div className="bg-white border-b border-orange-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">B</span>
          </div>
          <span className="font-semibold text-gray-800 text-sm">Edubee</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 pb-16">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{formInfo.name}</h1>
          {formInfo.description && (
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">{formInfo.description}</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
          {/* Personal Info */}
          <div className="bg-orange-500 px-5 py-2.5">
            <h3 className="text-white text-xs font-bold uppercase tracking-widest">Your Information</h3>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input className={inp} placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input className={inp} placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input type="email" className={inp} placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Phone</label>
              <input type="tel" className={inp} placeholder="+1 234 567 8900" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Nationality</label>
              <select className={sel} value={nationality} onChange={e => setNationality(e.target.value)}>
                <option value="">Select nationality…</option>
                {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {/* Inquiry Details */}
          <div className="bg-orange-500 px-5 py-2.5">
            <h3 className="text-white text-xs font-bold uppercase tracking-widest">Inquiry Details</h3>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">I'm interested in</label>
              <select className={sel} value={inquiryType} onChange={e => setInquiryType(e.target.value)}>
                <option value="">Select program type…</option>
                {INQUIRY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Estimated Budget (USD)</label>
              <input type="number" className={inp} placeholder="e.g. 5000" value={budget} onChange={e => setBudget(e.target.value)} min={0} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Preferred Start Date</label>
              <input type="date" className={inp} value={expectedStartDate} onChange={e => setExpectedStartDate(e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Message / Questions</label>
              <textarea
                className={area}
                rows={4}
                placeholder="Tell us more about your goals, any specific questions, or anything you'd like us to know…"
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
            </div>
          </div>

          {submit.isError && (
            <div className="mx-5 mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {(submit.error as any)?.response?.data?.error ?? "Submission failed. Please try again."}
            </div>
          )}

          <div className="px-5 pb-6">
            <button
              className="w-full h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={!canSubmit}
              onClick={() => submit.mutate()}
            >
              {submit.isPending && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Send Inquiry
            </button>
            <p className="text-center text-[11px] text-gray-400 mt-3">
              By submitting, you agree to be contacted by our team regarding your inquiry.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
