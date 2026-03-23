import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, Loader2, Upload } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Design helpers ──────────────────────────────────────────────────────────
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

function Field({ label, required, half, children }: { label: string; required?: boolean; half?: boolean; children: React.ReactNode }) {
  return (
    <div className={half ? "col-span-1" : ""}>
      <label className="block text-[11px] font-semibold text-[#57534E] uppercase tracking-wide mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function RadioGroup({ name, options, value, onChange }: {
  name: string; options: { label: string; value: string }[];
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            value === o.value
              ? "bg-[#F5821F] text-white border-[#F5821F]"
              : "border-border text-muted-foreground hover:border-[#F5821F]/50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const inputCls = "h-9 text-sm border-border focus-visible:ring-[#F5821F]/40 focus-visible:border-[#F5821F]";

// ── Available services ──────────────────────────────────────────────────────
const SERVICES = [
  { key: "study_abroad",  label: "Study Abroad" },
  { key: "accommodation", label: "Accommodation / Homestay / Boarding" },
  { key: "pickup",        label: "Airport Pickup by Edubee" },
  { key: "settlement",    label: "Settlement Service by Edubee" },
  { key: "guardian",      label: "Family / Nanny Guardian Service" },
  { key: "internship",    label: "Internship Placement" },
];

const ENGLISH_LEVELS = ["Beginner", "Pre-Intermediate", "Intermediate", "Upper-Intermediate", "Advanced", "Proficient"];

// ── Main component ──────────────────────────────────────────────────────────
export default function ApplicationForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const passportRef  = useRef<HTMLInputElement>(null);
  const enrolmentRef = useRef<HTMLInputElement>(null);
  const signatureRef = useRef<HTMLInputElement>(null);

  // ── Service checkboxes
  const [services, setServices] = useState<string[]>([]);
  const has = (k: string) => services.includes(k);
  const toggle = (k: string) => setServices(p => p.includes(k) ? p.filter(s => s !== k) : [...p, k]);

  // ── Personal Information
  const [lastName,        setLastName]        = useState("");
  const [firstName,       setFirstName]       = useState("");
  const [nationality,     setNationality]     = useState("");
  const [dob,             setDob]             = useState("");
  const [sex,             setSex]             = useState("");
  const [passportNo,      setPassportNo]      = useState("");
  const [passportExpiry,  setPassportExpiry]  = useState("");
  const [addlPassport,    setAddlPassport]    = useState("None");
  const [firstYear,       setFirstYear]       = useState("");
  const [address,         setAddress]         = useState("");
  const [phoneMobile,     setPhoneMobile]     = useState("");
  const [phoneHome,       setPhoneHome]       = useState("");
  const [email,           setEmail]           = useState("");
  const [schoolGradeYear, setSchoolGradeYear] = useState("");

  // ── Emergency Contact
  const [ecName,         setEcName]         = useState("");
  const [ecRelationship, setEcRelationship] = useState("");
  const [ecPhone,        setEcPhone]        = useState("");
  const [ecEmail,        setEcEmail]        = useState("");

  // ── School Information
  const [institution,         setInstitution]         = useState("");
  const [course,              setCourse]              = useState("");
  const [enrollmentFrom,      setEnrollmentFrom]      = useState("");
  const [enrollmentTo,        setEnrollmentTo]        = useState("");
  const [schoolNote,          setSchoolNote]          = useState("");

  // ── Airport Pickup
  const [arrivalDate,     setArrivalDate]     = useState("");
  const [flightNumber,    setFlightNumber]    = useState("");
  const [numLuggage,      setNumLuggage]      = useState("");
  const [pickupAddress,   setPickupAddress]   = useState("");
  const [arrivalAirport,  setArrivalAirport]  = useState("");
  const [departureAirport,setDepartureAirport]= useState("");
  const [arrivalTime,     setArrivalTime]     = useState("");
  const [passengerCount,  setPassengerCount]  = useState("");

  // ── Homestay / Accommodation
  const [checkinDate,  setCheckinDate]  = useState("");
  const [checkoutDate, setCheckoutDate] = useState("");
  const [dietary,      setDietary]      = useState("");
  const [allergies,    setAllergies]    = useState("");
  const [pets,         setPets]         = useState("");
  const [roomType,     setRoomType]     = useState("");

  // ── Homestay Information
  const [englishLevel,     setEnglishLevel]     = useState("");
  const [studyDuration,    setStudyDuration]    = useState("");
  const [prevStay,         setPrevStay]         = useState("");
  const [prefRoom,         setPrefRoom]         = useState("");
  const [smoker,           setSmoker]           = useState("");

  // ── Declaration checkboxes
  const [declAgree, setDeclAgree] = useState(false);

  // ── Files (display only — not uploaded to server in this version)
  const [passportFile,  setPassportFile]  = useState<File | null>(null);
  const [enrolmentFile, setEnrolmentFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);

  // ── Notes / Agent
  const [notes, setNotes]   = useState("");
  const [agent, setAgent]   = useState("");

  const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || "";

  const submit = useMutation({
    mutationFn: () => {
      const extraNotes = [
        ecName        ? `EC Name: ${ecName}`               : "",
        ecRelationship? `EC Relationship: ${ecRelationship}` : "",
        ecPhone       ? `EC Phone: ${ecPhone}`             : "",
        ecEmail       ? `EC Email: ${ecEmail}`             : "",
        passportNo    ? `Passport: ${passportNo} (exp ${passportExpiry})` : "",
        numLuggage    ? `Luggage: ${numLuggage}`           : "",
        pickupAddress ? `Pickup Address: ${pickupAddress}` : "",
        dietary       ? `Dietary: ${dietary}`              : "",
        allergies     ? `Allergies: ${allergies}`          : "",
        pets          ? `Pets: ${pets}`                    : "",
        englishLevel  ? `English Level: ${englishLevel}`   : "",
        studyDuration ? `Study Duration: ${studyDuration}` : "",
        prevStay      ? `Previous Australia Stay: ${prevStay}` : "",
        prefRoom      ? `Preferred Room: ${prefRoom}`      : "",
        smoker        ? `Smoker: ${smoker}`                : "",
        schoolGradeYear ? `School/Grade/Year: ${schoolGradeYear}` : "",
        agent         ? `Agent: ${agent}`                  : "",
        schoolNote    ? `School Note: ${schoolNote}`       : "",
        notes,
      ].filter(Boolean).join("\n");

      const payload: Record<string, unknown> = {
        applicationType:    "service",
        serviceTypes:       services,
        applicantName:      fullName || undefined,
        applicantEmail:     email    || undefined,
        applicantPhone:     phoneMobile || undefined,
        applicantNationality: nationality || undefined,
        applicationStatus:  "submitted",
        status:             "submitted",
        // school
        institutionName:    institution    || undefined,
        courseName:         course         || undefined,
        studyStartDate:     enrollmentFrom || undefined,
        studyEndDate:       enrollmentTo   || undefined,
        destinationCountry: nationality    || undefined,
        // pickup
        flightNumber:       flightNumber     || undefined,
        flightDate:         arrivalDate      || undefined,
        arrivalTime:        arrivalTime      || undefined,
        departureAirport:   departureAirport || undefined,
        arrivalAirport:     arrivalAirport   || undefined,
        passengerCount:     passengerCount ? Number(passengerCount) : undefined,
        // accommodation
        checkinDate:        checkinDate  || undefined,
        checkoutDate:       checkoutDate || undefined,
        roomType:           roomType     || undefined,
        accommodationAddress: address    || undefined,
        // notes
        notes: extraNotes || undefined,
      };
      Object.keys(payload).forEach(k => { if (payload[k] === undefined) delete payload[k]; });
      return axios.post(`${BASE}/api/applications`, payload).then(r => r.data);
    },
    onSuccess: (data) => {
      toast({ title: "Application submitted successfully" });
      setLocation(`${BASE}/admin/applications/${data.id}`);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to submit application" }),
  });

  const canSubmit = fullName.length > 0 && services.length > 0;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-5">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setLocation(`${BASE}/admin/applications`)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-[#1C1917]">Program & Service Application</h1>
          <p className="text-xs text-muted-foreground">Fill in all required fields and submit</p>
        </div>
      </div>

      {/* ── 1. AVAILABLE SERVICE LIST ──────────────────────────────── */}
      <Section title="Available Service List">
        <p className="text-xs text-muted-foreground -mt-1">Select all services that apply (multiple selections allowed)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SERVICES.map(s => (
            <label
              key={s.key}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                has(s.key)
                  ? "border-[#F5821F] bg-[#FEF0E3]"
                  : "border-border hover:border-[#F5821F]/40 hover:bg-muted/30"
              }`}
            >
              <Checkbox
                checked={has(s.key)}
                onCheckedChange={() => toggle(s.key)}
                className="data-[state=checked]:bg-[#F5821F] data-[state=checked]:border-[#F5821F] shrink-0"
              />
              <span className={`text-sm font-medium ${has(s.key) ? "text-[#F5821F]" : "text-[#1C1917]"}`}>
                {s.label}
              </span>
            </label>
          ))}
        </div>
      </Section>

      {/* ── 2. PERSONAL INFORMATION ────────────────────────────────── */}
      <Section title="Personal Information">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Last Name" required>
            <Input className={inputCls} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Family name" />
          </Field>
          <Field label="First Name" required>
            <Input className={inputCls} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Given name" />
          </Field>
          <Field label="Nationality" required>
            <Input className={inputCls} value={nationality} onChange={e => setNationality(e.target.value)} placeholder="e.g. Korean" />
          </Field>
          <Field label="Date of Birth (DD/MM/YYYY)" required>
            <Input className={inputCls} type="date" value={dob} onChange={e => setDob(e.target.value)} />
          </Field>
        </div>

        <Field label="Sex" required>
          <RadioGroup name="sex" value={sex} onChange={setSex}
            options={[{ label: "Male", value: "male" }, { label: "Female", value: "female" }, { label: "Other", value: "other" }]}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="ID / Passport No." required>
            <Input className={inputCls} value={passportNo} onChange={e => setPassportNo(e.target.value)} placeholder="Passport number" />
          </Field>
          <Field label="Passport Expiry Date">
            <Input className={inputCls} type="date" value={passportExpiry} onChange={e => setPassportExpiry(e.target.value)} />
          </Field>
          <Field label="Additional Passport Country">
            <Input className={inputCls} value={addlPassport} onChange={e => setAddlPassport(e.target.value)} placeholder="None (or country)" />
          </Field>
          <Field label="First Year in Australia?">
            <RadioGroup name="firstYear" value={firstYear} onChange={setFirstYear}
              options={[{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]}
            />
          </Field>
        </div>

        <Field label="Current Address" required>
          <Input className={inputCls} value={address} onChange={e => setAddress(e.target.value)} placeholder="Full address" />
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Mobile Phone">
            <Input className={inputCls} value={phoneMobile} onChange={e => setPhoneMobile(e.target.value)} placeholder="+82 10 xxxx xxxx" />
          </Field>
          <Field label="Home Phone">
            <Input className={inputCls} value={phoneHome} onChange={e => setPhoneHome(e.target.value)} placeholder="Home number" />
          </Field>
          <Field label="Email Address">
            <Input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
          </Field>
        </div>

        <Field label="School / Grade / Year">
          <Input className={inputCls} value={schoolGradeYear} onChange={e => setSchoolGradeYear(e.target.value)} placeholder="e.g. Sydney High School / Year 10" />
        </Field>
      </Section>

      {/* ── 3. EMERGENCY CONTACT DETAILS ───────────────────────────── */}
      <Section title="Emergency Contact Details">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Contact Name">
            <Input className={inputCls} value={ecName} onChange={e => setEcName(e.target.value)} placeholder="Full name" />
          </Field>
          <Field label="Relationship">
            <Input className={inputCls} value={ecRelationship} onChange={e => setEcRelationship(e.target.value)} placeholder="e.g. Parent, Guardian" />
          </Field>
          <Field label="Contact Phone">
            <Input className={inputCls} value={ecPhone} onChange={e => setEcPhone(e.target.value)} placeholder="Phone number" />
          </Field>
          <Field label="Contact Email">
            <Input className={inputCls} type="email" value={ecEmail} onChange={e => setEcEmail(e.target.value)} placeholder="email@example.com" />
          </Field>
        </div>
      </Section>

      {/* ── 4. SCHOOL INFORMATION ──────────────────────────────────── */}
      <Section title="School Information">
        <div className="grid grid-cols-2 gap-4">
          <Field label="School / Institution">
            <Input className={inputCls} value={institution} onChange={e => setInstitution(e.target.value)} placeholder="School or university name" />
          </Field>
          <Field label="Course / Program" required={has("study_abroad")}>
            <Input className={inputCls} value={course} onChange={e => setCourse(e.target.value)} placeholder="Course name" />
          </Field>
          <Field label="Enrollment From">
            <Input className={inputCls} type="date" value={enrollmentFrom} onChange={e => setEnrollmentFrom(e.target.value)} />
          </Field>
          <Field label="Enrollment To">
            <Input className={inputCls} type="date" value={enrollmentTo} onChange={e => setEnrollmentTo(e.target.value)} />
          </Field>
        </div>
        <Field label="Note">
          <Textarea className="text-sm min-h-[70px] border-border focus-visible:ring-[#F5821F]/40 focus-visible:border-[#F5821F]"
            value={schoolNote} onChange={e => setSchoolNote(e.target.value)} placeholder="Any additional school information..." />
        </Field>
      </Section>

      {/* ── 5. AIRPORT PICKUP (conditional) ───────────────────────── */}
      {has("pickup") && (
        <Section title="Airport Pickup">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Arrival Date" required>
              <Input className={inputCls} type="date" value={arrivalDate} onChange={e => setArrivalDate(e.target.value)} />
            </Field>
            <Field label="Arrival Time">
              <Input className={inputCls} type="time" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} />
            </Field>
            <Field label="Flight Number">
              <Input className={inputCls} value={flightNumber} onChange={e => setFlightNumber(e.target.value)} placeholder="e.g. QF123" />
            </Field>
            <Field label="Number of Luggage">
              <Input className={inputCls} type="number" min={0} value={numLuggage} onChange={e => setNumLuggage(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Departure Airport">
              <Input className={inputCls} value={departureAirport} onChange={e => setDepartureAirport(e.target.value)} placeholder="City or IATA code" />
            </Field>
            <Field label="Arrival Airport">
              <Input className={inputCls} value={arrivalAirport} onChange={e => setArrivalAirport(e.target.value)} placeholder="e.g. SYD" />
            </Field>
            <Field label="Number of Passengers">
              <Input className={inputCls} type="number" min={1} value={passengerCount} onChange={e => setPassengerCount(e.target.value)} placeholder="1" />
            </Field>
            <Field label="Pickup / Drop-off Address">
              <Input className={inputCls} value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} placeholder="Destination address" />
            </Field>
          </div>
        </Section>
      )}

      {/* ── 6. ACCOMMODATION / HOMESTAY (conditional) ─────────────── */}
      {has("accommodation") && (
        <Section title="Accommodation / Homestay">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date of Arrival" required>
              <Input className={inputCls} type="date" value={checkinDate} onChange={e => setCheckinDate(e.target.value)} />
            </Field>
            <Field label="Date of Departure">
              <Input className={inputCls} type="date" value={checkoutDate} onChange={e => setCheckoutDate(e.target.value)} />
            </Field>
            <Field label="Room Type">
              <RadioGroup name="roomType" value={roomType} onChange={setRoomType}
                options={[
                  { label: "Single",  value: "single" },
                  { label: "Twin",    value: "twin" },
                  { label: "Double",  value: "double" },
                  { label: "Family",  value: "family" },
                ]}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <Field label="Dietary Requirements">
              <RadioGroup name="dietary" value={dietary} onChange={setDietary}
                options={[{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]}
              />
              {dietary === "yes" && (
                <Input className={`${inputCls} mt-2`} placeholder="Please describe..." />
              )}
            </Field>
            <Field label="Allergies">
              <RadioGroup name="allergies" value={allergies} onChange={setAllergies}
                options={[{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]}
              />
              {allergies === "yes" && (
                <Input className={`${inputCls} mt-2`} placeholder="Please describe..." />
              )}
            </Field>
            <Field label="Pets (describe if any)">
              <Input className={inputCls} value={pets} onChange={e => setPets(e.target.value)} placeholder="e.g. Has a dog allergy" />
            </Field>
          </div>
        </Section>
      )}

      {/* ── 7. HOMESTAY INFORMATION (conditional) ─────────────────── */}
      {has("accommodation") && (
        <Section title="Homestay Information">
          <Field label="Current English Level">
            <div className="flex flex-wrap gap-2">
              {ENGLISH_LEVELS.map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setEnglishLevel(l)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    englishLevel === l
                      ? "bg-[#F5821F] text-white border-[#F5821F]"
                      : "border-border text-muted-foreground hover:border-[#F5821F]/50"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Estimated Study Duration">
              <Input className={inputCls} value={studyDuration} onChange={e => setStudyDuration(e.target.value)} placeholder="e.g. 6 months" />
            </Field>
            <Field label="Previous Stay in Australia?">
              <RadioGroup name="prevStay" value={prevStay} onChange={setPrevStay}
                options={[{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]}
              />
            </Field>
            <Field label="Preferred Room (Gender)">
              <RadioGroup name="prefRoom" value={prefRoom} onChange={setPrefRoom}
                options={[{ label: "Male Host", value: "male" }, { label: "Female Host", value: "female" }, { label: "No Preference", value: "any" }]}
              />
            </Field>
            <Field label="Smoker?">
              <RadioGroup name="smoker" value={smoker} onChange={setSmoker}
                options={[{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]}
              />
            </Field>
          </div>
        </Section>
      )}

      {/* ── 8. DOCUMENTS & SIGN ────────────────────────────────────── */}
      <Section title="Documents & Sign">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Passport */}
          <div>
            <p className="text-[11px] font-semibold text-[#57534E] uppercase tracking-wide mb-2">Passport Copy</p>
            <div
              onClick={() => passportRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border hover:border-[#F5821F]/60 cursor-pointer py-6 transition-colors bg-muted/20"
            >
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {passportFile ? passportFile.name : "Browse Files"}
              </span>
            </div>
            <input ref={passportRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setPassportFile(e.target.files?.[0] ?? null)} />
          </div>

          {/* Enrolment */}
          <div>
            <p className="text-[11px] font-semibold text-[#57534E] uppercase tracking-wide mb-2">Enrolment / Application</p>
            <div
              onClick={() => enrolmentRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border hover:border-[#F5821F]/60 cursor-pointer py-6 transition-colors bg-muted/20"
            >
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {enrolmentFile ? enrolmentFile.name : "Browse Files"}
              </span>
            </div>
            <input ref={enrolmentRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setEnrolmentFile(e.target.files?.[0] ?? null)} />
          </div>

          {/* Signature */}
          <div>
            <p className="text-[11px] font-semibold text-[#57534E] uppercase tracking-wide mb-2">Signature</p>
            <div
              onClick={() => signatureRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border hover:border-[#F5821F]/60 cursor-pointer py-6 transition-colors bg-muted/20"
            >
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {signatureFile ? signatureFile.name : "Browse Files"}
              </span>
            </div>
            <input ref={signatureRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setSignatureFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>

        <div className="flex items-start gap-2.5 pt-2">
          <Checkbox
            id="decl"
            checked={declAgree}
            onCheckedChange={v => setDeclAgree(!!v)}
            className="mt-0.5 data-[state=checked]:bg-[#F5821F] data-[state=checked]:border-[#F5821F]"
          />
          <label htmlFor="decl" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
            I confirm that all information provided in this application is true and correct. I agree to the{" "}
            <span className="text-[#F5821F] underline cursor-pointer">terms and conditions</span>{" "}
            of service.
          </label>
        </div>
      </Section>

      {/* ── 9. AGENT ───────────────────────────────────────────────── */}
      <Section title="Agent">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Agent Name / Code">
            <Input className={inputCls} value={agent} onChange={e => setAgent(e.target.value)} placeholder="Agent name or referral code" />
          </Field>
          <Field label="Additional Notes">
            <Input className={inputCls} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any other information..." />
          </Field>
        </div>
      </Section>

      {/* ── Submit ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 pb-8">
        <Button
          type="button"
          variant="outline"
          onClick={() => setLocation(`${BASE}/admin/applications`)}
        >
          Cancel
        </Button>
        <Button
          type="button"
          className="bg-[#F5821F] hover:bg-[#D96A0A] text-white px-8 gap-2"
          onClick={() => submit.mutate()}
          disabled={submit.isPending || !canSubmit}
        >
          {submit.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
          ) : (
            "Submit Application"
          )}
        </Button>
      </div>

      {!canSubmit && (
        <p className="text-xs text-muted-foreground text-center -mt-4 pb-4">
          Please select at least one service and enter applicant name to submit.
        </p>
      )}
    </div>
  );
}
