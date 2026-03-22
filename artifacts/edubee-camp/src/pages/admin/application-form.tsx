import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Check, Loader2, FileText } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const APP_TYPES = [
  { key: "service",    label: "Service Application",    desc: "Study abroad, pickup, accommodation, internship, settlement, guardian" },
  { key: "camp",       label: "Camp Application",       desc: "Summer / winter language / academic camps" },
  { key: "school",     label: "School Application",     desc: "Enrolment at partner schools" },
  { key: "university", label: "University Application", desc: "Undergraduate / postgraduate / pathway" },
];

const SERVICE_OPTIONS = [
  { key: "study_abroad",   label: "Study Abroad" },
  { key: "pickup",         label: "Pickup / Airport Transfer" },
  { key: "accommodation",  label: "Accommodation" },
  { key: "internship",     label: "Internship" },
  { key: "settlement",     label: "Settlement" },
  { key: "guardian",       label: "Guardian" },
];

function StepIndicator({ step }: { step: number }) {
  const steps = ["Service Selection", "Applicant Info", "Review & Submit"];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => {
        const num = i + 1;
        const active = num === step;
        const done = num < step;
        return (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
              done ? "bg-[#F5821F] text-white" : active ? "bg-[#F5821F] text-white" : "bg-muted text-muted-foreground"
            }`}>
              {done ? <Check className="w-3.5 h-3.5" /> : num}
            </div>
            <span className={`text-sm font-medium ${active ? "text-[#1C1917]" : "text-muted-foreground"}`}>{s}</span>
            {i < steps.length - 1 && <div className="w-8 h-px bg-border mx-1" />}
          </div>
        );
      })}
    </div>
  );
}

function FieldRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

export default function ApplicationForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  // Step 1: Service selection
  const [appType, setAppType] = useState<string>("");
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);

  // Step 2: Applicant info (shared)
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [applicantNationality, setApplicantNationality] = useState("");
  const [notes, setNotes] = useState("");

  // Pickup fields
  const [flightNumber, setFlightNumber] = useState("");
  const [flightDate, setFlightDate] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [departureAirport, setDepartureAirport] = useState("");
  const [arrivalAirport, setArrivalAirport] = useState("");
  const [passengerCount, setPassengerCount] = useState("");

  // Accommodation fields
  const [checkinDate, setCheckinDate] = useState("");
  const [checkoutDate, setCheckoutDate] = useState("");
  const [roomType, setRoomType] = useState("");
  const [numRooms, setNumRooms] = useState("");
  const [accommodationAddress, setAccommodationAddress] = useState("");

  // Study Abroad fields
  const [destinationCountry, setDestinationCountry] = useState("");
  const [studyStartDate, setStudyStartDate] = useState("");
  const [studyEndDate, setStudyEndDate] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [courseName, setCourseName] = useState("");

  // Internship fields
  const [internshipStartDate, setInternshipStartDate] = useState("");
  const [internshipEndDate, setInternshipEndDate] = useState("");
  const [industry, setIndustry] = useState("");
  const [companyPreference, setCompanyPreference] = useState("");

  // Settlement fields
  const [settlementDate, setSettlementDate] = useState("");
  const [suburb, setSuburb] = useState("");

  // Guardian fields
  const [guardianStartDate, setGuardianStartDate] = useState("");
  const [guardianEndDate, setGuardianEndDate] = useState("");
  const [guardianType, setGuardianType] = useState("");

  const toggleService = (key: string) => {
    setServiceTypes(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  };

  const submit = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        applicationType: appType,
        serviceTypes,
        applicantName,
        applicantEmail,
        applicantPhone,
        applicantNationality,
        notes,
        applicationStatus: "submitted",
        status: "submitted",
        // service-specific
        flightNumber, flightDate, arrivalTime, departureAirport, arrivalAirport, passengerCount: passengerCount ? Number(passengerCount) : null,
        checkinDate, checkoutDate, roomType, numRooms: numRooms ? Number(numRooms) : null, accommodationAddress,
        destinationCountry, studyStartDate, studyEndDate, institutionName, courseName,
        internshipStartDate, internshipEndDate, industry, companyPreference,
        settlementDate, suburb,
        guardianStartDate, guardianEndDate, guardianType,
      };
      // strip nulls/empty strings for cleanliness
      Object.keys(payload).forEach(k => {
        if (payload[k] === "" || payload[k] === null) delete payload[k];
      });
      return axios.post(`${BASE}/api/applications`, payload).then(r => r.data);
    },
    onSuccess: (data) => {
      toast({ title: "Application created" });
      setLocation(`${BASE}/admin/applications/${data.id}`);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to create application" }),
  });

  const canGoToStep2 = !!appType && (appType !== "service" || serviceTypes.length > 0);
  const canSubmit = !!applicantName;

  const hasService = (key: string) => serviceTypes.includes(key);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => step === 1 ? setLocation(`${BASE}/admin/applications`) : setStep(s => s - 1)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#FEF0E3] flex items-center justify-center">
            <FileText className="w-4 h-4 text-[#F5821F]" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[#1C1917]">New Application</h1>
            <p className="text-xs text-muted-foreground">Create a service or camp application</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <StepIndicator step={step} />

        {/* ── Step 1: Service Selection ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-medium text-[#57534E] uppercase tracking-wide mb-3">Application Type *</p>
              <div className="grid grid-cols-1 gap-2">
                {APP_TYPES.map(t => (
                  <button
                    key={t.key}
                    onClick={() => { setAppType(t.key); if (t.key !== "service") setServiceTypes([]); }}
                    className={`text-left px-4 py-3 rounded-lg border transition-colors ${
                      appType === t.key ? "border-[#F5821F] bg-[#FEF0E3]" : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <p className="font-medium text-sm text-[#1C1917]">{t.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {appType === "service" && (
              <div>
                <p className="text-xs font-medium text-[#57534E] uppercase tracking-wide mb-3">Service Types * <span className="text-muted-foreground normal-case">(select all that apply)</span></p>
                <div className="grid grid-cols-2 gap-2">
                  {SERVICE_OPTIONS.map(s => (
                    <label key={s.key} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border hover:border-muted-foreground cursor-pointer transition-colors">
                      <Checkbox
                        checked={serviceTypes.includes(s.key)}
                        onCheckedChange={() => toggleService(s.key)}
                        className="data-[state=checked]:bg-[#F5821F] data-[state=checked]:border-[#F5821F]"
                      />
                      <span className="text-sm font-medium">{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                className="bg-[#F5821F] hover:bg-[#D96A0A] text-white gap-1.5"
                onClick={() => setStep(2)}
                disabled={!canGoToStep2}
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Applicant Info ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <FieldRow label="Applicant Name" required>
                <Input value={applicantName} onChange={e => setApplicantName(e.target.value)} placeholder="Full name" />
              </FieldRow>
              <FieldRow label="Email">
                <Input type="email" value={applicantEmail} onChange={e => setApplicantEmail(e.target.value)} placeholder="email@example.com" />
              </FieldRow>
              <FieldRow label="Phone">
                <Input value={applicantPhone} onChange={e => setApplicantPhone(e.target.value)} placeholder="+61 4xx xxx xxx" />
              </FieldRow>
              <FieldRow label="Nationality">
                <Input value={applicantNationality} onChange={e => setApplicantNationality(e.target.value)} placeholder="Country" />
              </FieldRow>
            </div>

            {/* Pickup fields */}
            {hasService("pickup") && (
              <div className="rounded-lg border border-border p-4 space-y-4">
                <p className="text-xs font-semibold text-[#F5821F] uppercase tracking-wide">Pickup / Airport Transfer</p>
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow label="Flight Number"><Input value={flightNumber} onChange={e => setFlightNumber(e.target.value)} placeholder="e.g. QF123" /></FieldRow>
                  <FieldRow label="Flight Date"><Input type="date" value={flightDate} onChange={e => setFlightDate(e.target.value)} /></FieldRow>
                  <FieldRow label="Arrival Time"><Input type="time" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} /></FieldRow>
                  <FieldRow label="Passengers"><Input type="number" min={1} value={passengerCount} onChange={e => setPassengerCount(e.target.value)} placeholder="1" /></FieldRow>
                  <FieldRow label="Departure Airport"><Input value={departureAirport} onChange={e => setDepartureAirport(e.target.value)} placeholder="City or IATA code" /></FieldRow>
                  <FieldRow label="Arrival Airport"><Input value={arrivalAirport} onChange={e => setArrivalAirport(e.target.value)} placeholder="City or IATA code" /></FieldRow>
                </div>
              </div>
            )}

            {/* Accommodation fields */}
            {hasService("accommodation") && (
              <div className="rounded-lg border border-border p-4 space-y-4">
                <p className="text-xs font-semibold text-[#F5821F] uppercase tracking-wide">Accommodation</p>
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow label="Check-in Date"><Input type="date" value={checkinDate} onChange={e => setCheckinDate(e.target.value)} /></FieldRow>
                  <FieldRow label="Check-out Date"><Input type="date" value={checkoutDate} onChange={e => setCheckoutDate(e.target.value)} /></FieldRow>
                  <FieldRow label="Room Type">
                    <Select value={roomType} onValueChange={setRoomType}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {["Single", "Twin", "Double", "Family", "Studio"].map(r => (
                          <SelectItem key={r} value={r.toLowerCase()}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label="Number of Rooms"><Input type="number" min={1} value={numRooms} onChange={e => setNumRooms(e.target.value)} placeholder="1" /></FieldRow>
                </div>
                <FieldRow label="Address"><Input value={accommodationAddress} onChange={e => setAccommodationAddress(e.target.value)} placeholder="Property name or address" /></FieldRow>
              </div>
            )}

            {/* Study Abroad fields */}
            {hasService("study_abroad") && (
              <div className="rounded-lg border border-border p-4 space-y-4">
                <p className="text-xs font-semibold text-[#F5821F] uppercase tracking-wide">Study Abroad</p>
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow label="Destination Country"><Input value={destinationCountry} onChange={e => setDestinationCountry(e.target.value)} placeholder="e.g. Australia" /></FieldRow>
                  <FieldRow label="Institution"><Input value={institutionName} onChange={e => setInstitutionName(e.target.value)} placeholder="School / University" /></FieldRow>
                  <FieldRow label="Course"><Input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="Course name" /></FieldRow>
                  <FieldRow label="Start Date"><Input type="date" value={studyStartDate} onChange={e => setStudyStartDate(e.target.value)} /></FieldRow>
                  <FieldRow label="End Date"><Input type="date" value={studyEndDate} onChange={e => setStudyEndDate(e.target.value)} /></FieldRow>
                </div>
              </div>
            )}

            {/* Internship fields */}
            {hasService("internship") && (
              <div className="rounded-lg border border-border p-4 space-y-4">
                <p className="text-xs font-semibold text-[#F5821F] uppercase tracking-wide">Internship</p>
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow label="Start Date"><Input type="date" value={internshipStartDate} onChange={e => setInternshipStartDate(e.target.value)} /></FieldRow>
                  <FieldRow label="End Date"><Input type="date" value={internshipEndDate} onChange={e => setInternshipEndDate(e.target.value)} /></FieldRow>
                  <FieldRow label="Industry"><Input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Technology" /></FieldRow>
                  <FieldRow label="Company Preference"><Input value={companyPreference} onChange={e => setCompanyPreference(e.target.value)} placeholder="Optional" /></FieldRow>
                </div>
              </div>
            )}

            {/* Settlement fields */}
            {hasService("settlement") && (
              <div className="rounded-lg border border-border p-4 space-y-4">
                <p className="text-xs font-semibold text-[#F5821F] uppercase tracking-wide">Settlement</p>
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow label="Settlement Date"><Input type="date" value={settlementDate} onChange={e => setSettlementDate(e.target.value)} /></FieldRow>
                  <FieldRow label="Suburb / Area"><Input value={suburb} onChange={e => setSuburb(e.target.value)} placeholder="e.g. Parramatta" /></FieldRow>
                </div>
              </div>
            )}

            {/* Guardian fields */}
            {hasService("guardian") && (
              <div className="rounded-lg border border-border p-4 space-y-4">
                <p className="text-xs font-semibold text-[#F5821F] uppercase tracking-wide">Guardian</p>
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow label="Start Date"><Input type="date" value={guardianStartDate} onChange={e => setGuardianStartDate(e.target.value)} /></FieldRow>
                  <FieldRow label="End Date"><Input type="date" value={guardianEndDate} onChange={e => setGuardianEndDate(e.target.value)} /></FieldRow>
                  <FieldRow label="Guardian Type"><Input value={guardianType} onChange={e => setGuardianType(e.target.value)} placeholder="e.g. Educational" /></FieldRow>
                </div>
              </div>
            )}

            <FieldRow label="Notes">
              <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes..." />
            </FieldRow>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-1">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                className="bg-[#F5821F] hover:bg-[#D96A0A] text-white gap-1.5"
                onClick={() => setStep(3)}
                disabled={!canSubmit}
              >
                Review <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Review & Submit ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="rounded-lg bg-muted/40 p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Application Type</span>
                <span className="font-medium">{APP_TYPES.find(t => t.key === appType)?.label}</span>
              </div>
              {serviceTypes.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Services</span>
                  <span className="font-medium text-right">{serviceTypes.map(s => SERVICE_OPTIONS.find(o => o.key === s)?.label).join(", ")}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Applicant</span>
                <span className="font-medium">{applicantName}</span>
              </div>
              {applicantEmail && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{applicantEmail}</span>
                </div>
              )}
              {applicantPhone && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium">{applicantPhone}</span>
                </div>
              )}
              {applicantNationality && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nationality</span>
                  <span className="font-medium">{applicantNationality}</span>
                </div>
              )}
              {notes && (
                <div>
                  <span className="text-muted-foreground block mb-1">Notes</span>
                  <span className="text-sm">{notes}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">The application will be created with status <strong>Submitted</strong> and can be reviewed in the Applications list.</p>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-1">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                className="bg-[#F5821F] hover:bg-[#D96A0A] text-white gap-1.5"
                onClick={() => submit.mutate()}
                disabled={submit.isPending}
              >
                {submit.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                ) : (
                  <><Check className="w-4 h-4" /> Create Application</>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
