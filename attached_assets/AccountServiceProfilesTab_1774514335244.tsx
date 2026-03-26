// ============================================================
// 🐝  Edubee CRM — Account Service Profiles UI
// AccountServiceProfilesTab.tsx
// ============================================================
// 위치  : /client/src/components/accounts/AccountServiceProfilesTab.tsx
// 버전  : v1.1 (Tour Profile 포함)
// 작성일: 2026-03-26
//
// 구성:
//   1. ServiceCategorySelector   — 멀티 체크박스 서비스 카테고리
//   2. HomestayProfileSection    — 홈스테이 프로필 카드 + 폼
//   3. PickupProfileSection      — 픽업/드라이버/차량 카드 + 폼
//   4. CompanyProfileSection     — 인턴십 호스트 컴퍼니 폼
//   5. SchoolProfileSection      — 학교 추가 정보 폼
//   6. TourProfileSection        — 투어 상품 카드 + 폼
//   7. AccountServiceProfilesTab — 통합 탭 컴포넌트 (entry point)
// ============================================================

import { useState, useEffect, useCallback } from "react";
import {
  Home, Car, Building2, GraduationCap, MapPin,
  Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  Phone, Mail, Clock, Users, DollarSign, Star,
  CheckSquare, Square, Save, X, Globe, AlertCircle,
  Utensils, Bed, Plane, Bus, Map,
} from "lucide-react";

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────
type ServiceType =
  | "homestay" | "dormitory" | "pickup" | "tour_provider"
  | "internship_host" | "school" | "camp_institute"
  | "guardian" | "translation" | "other";

interface ServiceCategory {
  id: string;
  accountId: string;
  serviceType: ServiceType;
  isActive: boolean;
  notes?: string;
}

interface HomestayProfile {
  id: string;
  accountId: string;
  roomType?: string;
  accommodationType?: string;
  mealIncluded?: string;
  weeklyRate?: string;
  partnerWeeklyCost?: string;
  distanceToSchool?: string;
  maxStudents?: number;
  availableFrom?: string;
  hostName?: string;
  hostContact?: string;
  propertyAddress?: string;
  amenities?: Record<string, boolean>;
  houseRules?: string;
  isCurrentlyOccupied: boolean;
  currentStudentCount: number;
  isActive: boolean;
  notes?: string;
}

interface PickupProfile {
  id: string;
  accountId: string;
  driverName?: string;
  driverContact?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  plateNumber?: string;
  vehicleYear?: number;
  capacity?: number;
  serviceArea?: string;
  serviceAirports?: string[];
  baseRate?: string;
  nightRate?: string;
  isAvailable: boolean;
  isActive: boolean;
  notes?: string;
}

interface TourProfile {
  id: string;
  accountId: string;
  tourName: string;
  tourType?: string;
  tourCategory?: string;
  durationHours?: number;
  durationDays?: number;
  minParticipants?: number;
  maxParticipants?: number;
  defaultPickupLocation?: string;
  pickupAvailable: boolean;
  operatesOn?: string[];
  departureTime?: string;
  returnTime?: string;
  inclusions?: string;
  exclusions?: string;
  adultRetailPrice?: string;
  childRetailPrice?: string;
  partnerCost?: string;
  advanceBookingDays?: number;
  cancellationPolicy?: string;
  bookingContact?: string;
  guideLanguages?: string[];
  isActive: boolean;
  notes?: string;
}

interface CompanyProfile {
  id: string;
  accountId: string;
  industry?: string;
  companySize?: string;
  abn?: string;
  contactPerson?: string;
  contactTitle?: string;
  contactEmail?: string;
  contactPhone?: string;
  availablePositions?: Array<{
    title: string; type: string; hourly_rate: number;
    hours_per_week: number; available_from?: string;
    is_active: boolean; notes?: string;
  }>;
  placementFeeType?: string;
  placementFee?: string;
  requiresPoliceCheck: boolean;
  requiresWwcc: boolean;
  dressCode?: string;
  workAddress?: string;
  isActive: boolean;
  notes?: string;
}

interface SchoolProfile {
  id: string;
  accountId: string;
  cricosCode?: string;
  rtoCode?: string;
  institutionType?: string;
  enrolmentOfficer?: string;
  enrolmentEmail?: string;
  enrolmentPhone?: string;
  intakeMonths?: number[];
  academicCalendar?: string;
  defaultCommissionRate?: string;
  commissionBasis?: string;
  availableCourses?: Array<{
    name: string; code?: string; level?: string;
    duration_weeks_min: number; duration_weeks_max: number;
    tuition_per_week_aud: number; is_active: boolean;
  }>;
  canSponsorStudentVisa: boolean;
  oshcRequired: boolean;
  isActive: boolean;
  notes?: string;
}

interface AccountServiceProfilesTabProps {
  accountId: string;
  accountName?: string;
  readOnly?: boolean;
}

// ──────────────────────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────────────────────
const SERVICE_TYPE_CONFIG: Record<ServiceType, {
  label: string; icon: React.ReactNode; color: string; bg: string;
}> = {
  homestay:       { label: "Homestay",        icon: <Home size={14} />,        color: "#F5821F", bg: "#FEF0E3" },
  dormitory:      { label: "Dormitory",        icon: <Bed size={14} />,         color: "#F5821F", bg: "#FEF0E3" },
  pickup:         { label: "Airport Pickup",   icon: <Car size={14} />,         color: "#16A34A", bg: "#DCFCE7" },
  tour_provider:  { label: "Tour Provider",    icon: <Map size={14} />,         color: "#0891B2", bg: "#E0F2FE" },
  internship_host:{ label: "Internship Host",  icon: <Building2 size={14} />,   color: "#7C3AED", bg: "#EDE9FE" },
  school:         { label: "School",           icon: <GraduationCap size={14} />, color: "#CA8A04", bg: "#FEF9C3" },
  camp_institute: { label: "Camp Institute",   icon: <Star size={14} />,        color: "#DC2626", bg: "#FEF2F2" },
  guardian:       { label: "Guardian",         icon: <Users size={14} />,       color: "#0284C7", bg: "#E0F2FE" },
  translation:    { label: "Translation",      icon: <Globe size={14} />,       color: "#57534E", bg: "#F4F3F1" },
  other:          { label: "Other",            icon: <AlertCircle size={14} />, color: "#57534E", bg: "#F4F3F1" },
};

const MEAL_OPTIONS = ["no", "breakfast", "half_board", "full_board"];
const MEAL_LABELS: Record<string, string> = {
  no: "No Meals", breakfast: "Breakfast Only",
  half_board: "Half Board", full_board: "Full Board",
};
const ROOM_TYPES = ["Single Room", "Twin Room", "Single Ensuite", "Studio", "Granny Flat", "Other"];
const ACCOMMODATION_TYPES = ["House", "Shared Apartment", "Townhouse", "Granny Flat", "Unit", "Other"];
const TOUR_TYPES = ["day_tour", "overnight", "cultural", "adventure", "city", "nature", "theme_park", "wildlife", "other"];
const TOUR_TYPE_LABELS: Record<string, string> = {
  day_tour: "Day Tour", overnight: "Overnight", cultural: "Cultural",
  adventure: "Adventure", city: "City", nature: "Nature",
  theme_park: "Theme Park", wildlife: "Wildlife", other: "Other",
};
const AIRPORTS = ["SYD", "MEL", "BNE", "PER", "ADL", "CBR", "OOL", "CNS"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  { value: 1, label: "Jan" }, { value: 2, label: "Feb" },
  { value: 3, label: "Mar" }, { value: 4, label: "Apr" },
  { value: 5, label: "May" }, { value: 6, label: "Jun" },
  { value: 7, label: "Jul" }, { value: 8, label: "Aug" },
  { value: 9, label: "Sep" }, { value: 10, label: "Oct" },
  { value: 11, label: "Nov" }, { value: 12, label: "Dec" },
];

// ──────────────────────────────────────────────────────────────
// SUB COMPONENTS
// ──────────────────────────────────────────────────────────────

// 공통 인풋
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <label style={{ fontSize: 11, fontWeight: 500, color: "#57534E", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {label}
    </label>
    {children}
  </div>
);

const Input = ({ value, onChange, placeholder, type = "text", disabled = false }: {
  value: string | number | undefined; onChange: (v: string) => void;
  placeholder?: string; type?: string; disabled?: boolean;
}) => (
  <input
    type={type}
    value={value ?? ""}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    style={{
      height: 40, border: "1.5px solid #E8E6E2", borderRadius: 8,
      padding: "0 12px", fontSize: 14, color: "#1C1917",
      background: disabled ? "#FAFAF9" : "#FFFFFF",
      outline: "none", width: "100%", boxSizing: "border-box",
      transition: "border-color 150ms, box-shadow 150ms",
    }}
    onFocus={e => {
      e.target.style.borderColor = "#F5821F";
      e.target.style.boxShadow = "0 0 0 3px rgba(245,130,31,0.15)";
    }}
    onBlur={e => {
      e.target.style.borderColor = "#E8E6E2";
      e.target.style.boxShadow = "none";
    }}
  />
);

const Select = ({ value, onChange, options, placeholder }: {
  value: string | undefined;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) => (
  <select
    value={value ?? ""}
    onChange={e => onChange(e.target.value)}
    style={{
      height: 40, border: "1.5px solid #E8E6E2", borderRadius: 8,
      padding: "0 12px", fontSize: 14, color: value ? "#1C1917" : "#A8A29E",
      background: "#FFFFFF", outline: "none", width: "100%",
      cursor: "pointer", appearance: "none",
      transition: "border-color 150ms, box-shadow 150ms",
    }}
    onFocus={e => {
      e.target.style.borderColor = "#F5821F";
      e.target.style.boxShadow = "0 0 0 3px rgba(245,130,31,0.15)";
    }}
    onBlur={e => {
      e.target.style.borderColor = "#E8E6E2";
      e.target.style.boxShadow = "none";
    }}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const Textarea = ({ value, onChange, placeholder, rows = 3 }: {
  value: string | undefined; onChange: (v: string) => void;
  placeholder?: string; rows?: number;
}) => (
  <textarea
    value={value ?? ""}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    style={{
      border: "1.5px solid #E8E6E2", borderRadius: 8,
      padding: "10px 12px", fontSize: 14, color: "#1C1917",
      background: "#FFFFFF", outline: "none", width: "100%",
      resize: "vertical", fontFamily: "inherit",
      boxSizing: "border-box", lineHeight: 1.6,
      transition: "border-color 150ms, box-shadow 150ms",
    }}
    onFocus={e => {
      e.target.style.borderColor = "#F5821F";
      e.target.style.boxShadow = "0 0 0 3px rgba(245,130,31,0.15)";
    }}
    onBlur={e => {
      e.target.style.borderColor = "#E8E6E2";
      e.target.style.boxShadow = "none";
    }}
  />
);

const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) => (
  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 999, position: "relative",
        background: checked ? "#F5821F" : "#E8E6E2",
        transition: "background 200ms", cursor: "pointer", flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", top: 3, left: checked ? 21 : 3,
        width: 16, height: 16, borderRadius: "50%", background: "#FFFFFF",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        transition: "left 200ms",
      }} />
    </div>
    {label && <span style={{ fontSize: 14, color: "#1C1917" }}>{label}</span>}
  </label>
);

const TagChip = ({ label, onRemove, color, bg }: {
  label: string; onRemove?: () => void; color?: string; bg?: string;
}) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500,
    background: bg ?? "#F4F3F1", color: color ?? "#57534E",
  }}>
    {label}
    {onRemove && (
      <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit", display: "flex", alignItems: "center" }}>
        <X size={10} />
      </button>
    )}
  </span>
);

const SectionCard = ({ title, icon, children, action }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode;
}) => (
  <div style={{
    background: "#FFFFFF", border: "1px solid #E8E6E2", borderRadius: 12,
    padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    marginBottom: 16,
  }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#FEF0E3", display: "flex", alignItems: "center", justifyContent: "center", color: "#F5821F" }}>
          {icon}
        </div>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#1C1917" }}>{title}</span>
      </div>
      {action}
    </div>
    {children}
  </div>
);

const Btn = ({ onClick, children, variant = "primary", size = "md", disabled = false }: {
  onClick: () => void; children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md"; disabled?: boolean;
}) => {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: "#F5821F", color: "#FFFFFF", border: "none" },
    secondary: { background: "#FFFFFF", color: "#1C1917", border: "1.5px solid #E8E6E2" },
    ghost: { background: "transparent", color: "#57534E", border: "none" },
    danger: { background: "#FEF2F2", color: "#DC2626", border: "1.5px solid #FECACA" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles[variant],
        padding: size === "sm" ? "6px 12px" : "10px 20px",
        borderRadius: 8, fontSize: size === "sm" ? 12 : 14,
        fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex", alignItems: "center", gap: 6,
        opacity: disabled ? 0.5 : 1, transition: "all 150ms",
      }}
    >
      {children}
    </button>
  );
};

const Grid2 = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
    {children}
  </div>
);

const Divider = () => <div style={{ height: 1, background: "#F4F3F1", margin: "20px 0" }} />;

// ──────────────────────────────────────────────────────────────
// 1. SERVICE CATEGORY SELECTOR
// ──────────────────────────────────────────────────────────────
const ServiceCategorySelector = ({
  accountId, readOnly,
}: { accountId: string; readOnly?: boolean }) => {
  const [selected, setSelected] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/accounts/${accountId}/service-categories`)
      .then(r => r.json())
      .then(d => {
        setSelected(d.data.filter((c: ServiceCategory) => c.isActive).map((c: ServiceCategory) => c.serviceType));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [accountId]);

  const toggle = async (type: ServiceType) => {
    if (readOnly) return;
    const isSelected = selected.includes(type);
    if (isSelected) {
      await fetch(`/api/accounts/${accountId}/service-categories/${type}`, { method: "DELETE" });
      setSelected(prev => prev.filter(t => t !== type));
    } else {
      await fetch(`/api/accounts/${accountId}/service-categories`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceType: type }),
      });
      setSelected(prev => [...prev, type]);
    }
  };

  if (loading) return <div style={{ height: 80, background: "#F4F3F1", borderRadius: 8, animation: "pulse 1.5s infinite" }} />;

  return (
    <SectionCard title="Service Categories" icon={<Star size={16} />}>
      <p style={{ fontSize: 13, color: "#57534E", marginBottom: 16, marginTop: -8 }}>
        Select all service types this account provides. Additional profile sections will appear based on your selection.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {(Object.keys(SERVICE_TYPE_CONFIG) as ServiceType[]).map(type => {
          const config = SERVICE_TYPE_CONFIG[type];
          const isOn = selected.includes(type);
          return (
            <button
              key={type}
              onClick={() => toggle(type)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 500,
                border: `1.5px solid ${isOn ? config.color : "#E8E6E2"}`,
                background: isOn ? config.bg : "#FFFFFF",
                color: isOn ? config.color : "#57534E",
                cursor: readOnly ? "default" : "pointer",
                transition: "all 150ms",
              }}
            >
              {isOn ? <CheckSquare size={14} /> : <Square size={14} />}
              {config.label}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#A8A29E", marginRight: 4 }}>Active:</span>
          {selected.map(t => (
            <TagChip
              key={t}
              label={SERVICE_TYPE_CONFIG[t].label}
              color={SERVICE_TYPE_CONFIG[t].color}
              bg={SERVICE_TYPE_CONFIG[t].bg}
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
};

// ──────────────────────────────────────────────────────────────
// 2. HOMESTAY PROFILE SECTION
// ──────────────────────────────────────────────────────────────
const HomestayProfileSection = ({ accountId, readOnly }: { accountId: string; readOnly?: boolean }) => {
  const [profiles, setProfiles] = useState<HomestayProfile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<HomestayProfile>>({
    mealIncluded: "no", maxStudents: 1, isCurrentlyOccupied: false, currentStudentCount: 0,
  });

  const loadProfiles = useCallback(() => {
    fetch(`/api/accounts/${accountId}/profiles/homestay`)
      .then(r => r.json()).then(d => setProfiles(d.data ?? []));
  }, [accountId]);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  const save = async () => {
    const url = editId
      ? `/api/accounts/${accountId}/profiles/homestay/${editId}`
      : `/api/accounts/${accountId}/profiles/homestay`;
    await fetch(url, {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false); setEditId(null);
    setForm({ mealIncluded: "no", maxStudents: 1, isCurrentlyOccupied: false, currentStudentCount: 0 });
    loadProfiles();
  };

  const deactivate = async (id: string) => {
    await fetch(`/api/accounts/${accountId}/profiles/homestay/${id}`, { method: "DELETE" });
    loadProfiles();
  };

  const startEdit = (p: HomestayProfile) => {
    setForm(p); setEditId(p.id); setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const F = (key: keyof HomestayProfile) => (v: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: v }));

  return (
    <SectionCard
      title="Homestay Profiles"
      icon={<Home size={16} />}
      action={!readOnly && (
        <Btn onClick={() => { setShowForm(true); setEditId(null); setForm({ mealIncluded: "no", maxStudents: 1, isCurrentlyOccupied: false, currentStudentCount: 0 }); }} size="sm">
          <Plus size={13} /> Add Room
        </Btn>
      )}
    >
      {/* FORM */}
      {showForm && (
        <div style={{ background: "#FAFAF9", border: "1px solid #E8E6E2", borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1C1917" }}>
              {editId ? "Edit Room Profile" : "New Room Profile"}
            </span>
            <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#57534E" }}>
              <X size={18} />
            </button>
          </div>
          <Grid2>
            <Field label="Host Name">
              <Input value={form.hostName} onChange={F("hostName")} placeholder="e.g. The Anderson Family" />
            </Field>
            <Field label="Host Contact">
              <Input value={form.hostContact} onChange={F("hostContact")} placeholder="+61 2 9714 5566" />
            </Field>
          </Grid2>
          <div style={{ marginTop: 12 }}>
            <Field label="Property Address">
              <Input value={form.propertyAddress} onChange={F("propertyAddress")} placeholder="14 Maple Street, Strathfield NSW 2135" />
            </Field>
          </div>
          <Divider />
          <Grid2>
            <Field label="Room Type">
              <Select value={form.roomType} onChange={F("roomType")}
                options={ROOM_TYPES.map(r => ({ value: r, label: r }))}
                placeholder="Select room type" />
            </Field>
            <Field label="Accommodation Type">
              <Select value={form.accommodationType} onChange={F("accommodationType")}
                options={ACCOMMODATION_TYPES.map(a => ({ value: a, label: a }))}
                placeholder="Select type" />
            </Field>
            <Field label="Meal Included">
              <Select value={form.mealIncluded} onChange={F("mealIncluded")}
                options={MEAL_OPTIONS.map(m => ({ value: m, label: MEAL_LABELS[m] }))} />
            </Field>
            <Field label="Distance to School">
              <Input value={form.distanceToSchool} onChange={F("distanceToSchool")} placeholder="e.g. 15 min by train" />
            </Field>
            <Field label="Weekly Rate (A$)">
              <Input value={form.weeklyRate} onChange={F("weeklyRate")} type="number" placeholder="330.00" />
            </Field>
            <Field label="Partner Weekly Cost (A$)">
              <Input value={form.partnerWeeklyCost} onChange={F("partnerWeeklyCost")} type="number" placeholder="280.00" />
            </Field>
            <Field label="Max Students">
              <Input value={form.maxStudents} onChange={v => setForm(p => ({ ...p, maxStudents: parseInt(v) || 1 }))} type="number" placeholder="1" />
            </Field>
            <Field label="Available From">
              <Input value={form.availableFrom} onChange={F("availableFrom")} type="date" />
            </Field>
          </Grid2>
          <Divider />
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Toggle checked={form.isCurrentlyOccupied ?? false} onChange={F("isCurrentlyOccupied")} label="Currently Occupied" />
          </div>
          <div style={{ marginTop: 12 }}>
            <Field label="House Rules / Notes">
              <Textarea value={form.notes} onChange={F("notes")} placeholder="House rules, pet policy, quiet hours..." />
            </Field>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
            <Btn variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Btn>
            <Btn size="sm" onClick={save}><Save size={13} /> Save Profile</Btn>
          </div>
        </div>
      )}

      {/* CARDS LIST */}
      {profiles.length === 0 && !showForm ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#A8A29E" }}>
          <Home size={32} style={{ margin: "0 auto 8px", display: "block", opacity: 0.4 }} />
          <p style={{ fontSize: 14 }}>No homestay profiles yet. Click "Add Room" to get started.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {profiles.map(p => (
            <div key={p.id} style={{
              border: "1px solid #E8E6E2", borderRadius: 10, padding: "16px 20px",
              background: "#FFFFFF", display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#1C1917" }}>{p.hostName ?? "Unnamed Host"}</span>
                  <TagChip label={p.isCurrentlyOccupied ? "Occupied" : "Available"}
                    color={p.isCurrentlyOccupied ? "#DC2626" : "#16A34A"}
                    bg={p.isCurrentlyOccupied ? "#FEF2F2" : "#DCFCE7"} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px 16px" }}>
                  {[
                    { icon: <MapPin size={12} />, val: p.propertyAddress },
                    { icon: <Phone size={12} />, val: p.hostContact },
                    { icon: <Bed size={12} />, val: p.roomType },
                    { icon: <Home size={12} />, val: p.accommodationType },
                    { icon: <Utensils size={12} />, val: p.mealIncluded ? MEAL_LABELS[p.mealIncluded] : undefined },
                    { icon: <Bus size={12} />, val: p.distanceToSchool },
                    { icon: <DollarSign size={12} />, val: p.weeklyRate ? `A$${p.weeklyRate}/wk` : undefined, highlight: true },
                    { icon: <Users size={12} />, val: p.maxStudents ? `Max ${p.maxStudents} student${p.maxStudents > 1 ? "s" : ""}` : undefined },
                  ].filter(i => i.val).map((item, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13,
                      color: (item as any).highlight ? "#F5821F" : "#57534E", fontWeight: (item as any).highlight ? 600 : 400 }}>
                      {item.icon}{item.val}
                    </div>
                  ))}
                </div>
              </div>
              {!readOnly && (
                <div style={{ display: "flex", gap: 6, marginLeft: 12 }}>
                  <button onClick={() => startEdit(p)} style={{ background: "#FEF0E3", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: "#F5821F" }}>
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => deactivate(p.id)} style={{ background: "#FEF2F2", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: "#DC2626" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
};

// ──────────────────────────────────────────────────────────────
// 3. PICKUP PROFILE SECTION
// ──────────────────────────────────────────────────────────────
const PickupProfileSection = ({ accountId, readOnly }: { accountId: string; readOnly?: boolean }) => {
  const [profiles, setProfiles] = useState<PickupProfile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<PickupProfile>>({ isAvailable: true, serviceAirports: [] });

  const load = useCallback(() => {
    fetch(`/api/accounts/${accountId}/profiles/pickup`)
      .then(r => r.json()).then(d => setProfiles(d.data ?? []));
  }, [accountId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const url = editId ? `/api/accounts/${accountId}/profiles/pickup/${editId}` : `/api/accounts/${accountId}/profiles/pickup`;
    await fetch(url, { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false); setEditId(null); setForm({ isAvailable: true, serviceAirports: [] }); load();
  };

  const toggleAirport = (code: string) => {
    setForm(prev => {
      const airports = prev.serviceAirports ?? [];
      return { ...prev, serviceAirports: airports.includes(code) ? airports.filter(a => a !== code) : [...airports, code] };
    });
  };

  const F = (key: keyof PickupProfile) => (v: string | boolean) => setForm(prev => ({ ...prev, [key]: v }));

  return (
    <SectionCard
      title="Pickup / Vehicle Profiles"
      icon={<Car size={16} />}
      action={!readOnly && (
        <Btn size="sm" onClick={() => { setShowForm(true); setEditId(null); setForm({ isAvailable: true, serviceAirports: [] }); }}>
          <Plus size={13} /> Add Vehicle
        </Btn>
      )}
    >
      {showForm && (
        <div style={{ background: "#FAFAF9", border: "1px solid #E8E6E2", borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{editId ? "Edit Vehicle" : "New Vehicle"}</span>
            <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#57534E" }}><X size={18} /></button>
          </div>
          <Grid2>
            <Field label="Driver Name"><Input value={form.driverName} onChange={F("driverName")} placeholder="John Smith" /></Field>
            <Field label="Driver Contact"><Input value={form.driverContact} onChange={F("driverContact")} placeholder="+61 400 000 000" /></Field>
            <Field label="Vehicle Make"><Input value={form.vehicleMake} onChange={F("vehicleMake")} placeholder="Toyota" /></Field>
            <Field label="Vehicle Model"><Input value={form.vehicleModel} onChange={F("vehicleModel")} placeholder="HiAce" /></Field>
            <Field label="Vehicle Color"><Input value={form.vehicleColor} onChange={F("vehicleColor")} placeholder="White" /></Field>
            <Field label="Plate Number"><Input value={form.plateNumber} onChange={F("plateNumber")} placeholder="EDU 001" /></Field>
            <Field label="Capacity (pax)"><Input value={form.capacity} onChange={v => setForm(p => ({ ...p, capacity: parseInt(v) || undefined }))} type="number" placeholder="10" /></Field>
            <Field label="Service Area"><Input value={form.serviceArea} onChange={F("serviceArea")} placeholder="Sydney Metro" /></Field>
            <Field label="Base Rate (A$)"><Input value={form.baseRate} onChange={F("baseRate")} type="number" placeholder="120.00" /></Field>
            <Field label="Night Rate (A$)"><Input value={form.nightRate} onChange={F("nightRate")} type="number" placeholder="150.00" /></Field>
          </Grid2>
          <Divider />
          <Field label="Service Airports">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {AIRPORTS.map(code => {
                const isOn = (form.serviceAirports ?? []).includes(code);
                return (
                  <button key={code} onClick={() => toggleAirport(code)} style={{
                    padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                    border: `1.5px solid ${isOn ? "#16A34A" : "#E8E6E2"}`,
                    background: isOn ? "#DCFCE7" : "#FFFFFF", color: isOn ? "#16A34A" : "#57534E",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <Plane size={10} />{code}
                  </button>
                );
              })}
            </div>
          </Field>
          <div style={{ marginTop: 12 }}>
            <Toggle checked={form.isAvailable ?? true} onChange={F("isAvailable")} label="Currently Available" />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
            <Btn variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Btn>
            <Btn size="sm" onClick={save}><Save size={13} /> Save Vehicle</Btn>
          </div>
        </div>
      )}

      {profiles.length === 0 && !showForm ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#A8A29E" }}>
          <Car size={32} style={{ margin: "0 auto 8px", display: "block", opacity: 0.4 }} />
          <p style={{ fontSize: 14 }}>No vehicle profiles yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {profiles.map(p => (
            <div key={p.id} style={{ border: "1px solid #E8E6E2", borderRadius: 10, padding: "16px 20px", background: "#FFFFFF", display: "flex", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#1C1917" }}>
                    {[p.vehicleMake, p.vehicleModel, "—", p.vehicleColor, p.plateNumber ? `(${p.plateNumber})` : ""].filter(Boolean).join(" ")}
                  </span>
                  <TagChip label={p.isAvailable ? "Available" : "Unavailable"}
                    color={p.isAvailable ? "#16A34A" : "#DC2626"}
                    bg={p.isAvailable ? "#DCFCE7" : "#FEF2F2"} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px 16px" }}>
                  {[
                    { icon: <Users size={12} />, val: p.driverName },
                    { icon: <Phone size={12} />, val: p.driverContact },
                    { icon: <Users size={12} />, val: p.capacity ? `${p.capacity} pax` : undefined },
                    { icon: <MapPin size={12} />, val: p.serviceArea },
                    { icon: <DollarSign size={12} />, val: p.baseRate ? `A$${p.baseRate}` : undefined, highlight: true },
                  ].filter(i => i.val).map((item, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13,
                      color: (item as any).highlight ? "#F5821F" : "#57534E", fontWeight: (item as any).highlight ? 600 : 400 }}>
                      {item.icon}{item.val}
                    </div>
                  ))}
                </div>
                {(p.serviceAirports ?? []).length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {(p.serviceAirports ?? []).map(a => <TagChip key={a} label={a} color="#16A34A" bg="#DCFCE7" />)}
                  </div>
                )}
              </div>
              {!readOnly && (
                <div style={{ display: "flex", gap: 6, marginLeft: 12 }}>
                  <button onClick={() => { setForm(p); setEditId(p.id); setShowForm(true); }} style={{ background: "#FEF0E3", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: "#F5821F" }}><Pencil size={13} /></button>
                  <button onClick={() => fetch(`/api/accounts/${accountId}/profiles/pickup/${p.id}`, { method: "DELETE" }).then(load)} style={{ background: "#FEF2F2", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: "#DC2626" }}><Trash2 size={13} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
};

// ──────────────────────────────────────────────────────────────
// 4. TOUR PROFILE SECTION
// ──────────────────────────────────────────────────────────────
const TourProfileSection = ({ accountId, readOnly }: { accountId: string; readOnly?: boolean }) => {
  const [profiles, setProfiles] = useState<TourProfile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<TourProfile>>({ pickupAvailable: false, operatesOn: [], guideLanguages: [] });

  const load = useCallback(() => {
    fetch(`/api/accounts/${accountId}/profiles/tour`)
      .then(r => r.json()).then(d => setProfiles(d.data ?? []));
  }, [accountId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const url = editId ? `/api/accounts/${accountId}/profiles/tour/${editId}` : `/api/accounts/${accountId}/profiles/tour`;
    await fetch(url, { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false); setEditId(null); setForm({ pickupAvailable: false, operatesOn: [], guideLanguages: [] }); load();
  };

  const toggleDay = (day: string) =>
    setForm(p => ({ ...p, operatesOn: (p.operatesOn ?? []).includes(day) ? (p.operatesOn ?? []).filter(d => d !== day) : [...(p.operatesOn ?? []), day] }));

  const F = (key: keyof TourProfile) => (v: string | boolean) => setForm(prev => ({ ...prev, [key]: v }));

  return (
    <SectionCard
      title="Tour Product Profiles"
      icon={<Map size={16} />}
      action={!readOnly && (
        <Btn size="sm" onClick={() => { setShowForm(true); setEditId(null); setForm({ pickupAvailable: false, operatesOn: [], guideLanguages: [] }); }}>
          <Plus size={13} /> Add Tour
        </Btn>
      )}
    >
      {showForm && (
        <div style={{ background: "#FAFAF9", border: "1px solid #E8E6E2", borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{editId ? "Edit Tour" : "New Tour Product"}</span>
            <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#57534E" }}><X size={18} /></button>
          </div>
          <Grid2>
            <Field label="Tour Name"><Input value={form.tourName} onChange={F("tourName")} placeholder="Blue Mountains Day Tour" /></Field>
            <Field label="Tour Type">
              <Select value={form.tourType} onChange={F("tourType")}
                options={TOUR_TYPES.map(t => ({ value: t, label: TOUR_TYPE_LABELS[t] }))}
                placeholder="Select type" />
            </Field>
            <Field label="Tour Category"><Input value={form.tourCategory} onChange={F("tourCategory")} placeholder="Nature / Cultural Heritage" /></Field>
            <Field label="Duration (hours)"><Input value={form.durationHours} onChange={v => setForm(p => ({ ...p, durationHours: parseInt(v) || undefined }))} type="number" placeholder="8" /></Field>
            <Field label="Min Participants"><Input value={form.minParticipants} onChange={v => setForm(p => ({ ...p, minParticipants: parseInt(v) || 1 }))} type="number" placeholder="1" /></Field>
            <Field label="Max Participants"><Input value={form.maxParticipants} onChange={v => setForm(p => ({ ...p, maxParticipants: parseInt(v) || undefined }))} type="number" placeholder="20" /></Field>
            <Field label="Departure Time"><Input value={form.departureTime} onChange={F("departureTime")} placeholder="08:00 AM" /></Field>
            <Field label="Return Time"><Input value={form.returnTime} onChange={F("returnTime")} placeholder="06:00 PM" /></Field>
            <Field label="Adult Retail Price (A$)"><Input value={form.adultRetailPrice} onChange={F("adultRetailPrice")} type="number" placeholder="149.00" /></Field>
            <Field label="Partner Cost (A$)"><Input value={form.partnerCost} onChange={F("partnerCost")} type="number" placeholder="95.00" /></Field>
          </Grid2>
          <div style={{ marginTop: 12 }}>
            <Field label="Default Pickup Location"><Input value={form.defaultPickupLocation} onChange={F("defaultPickupLocation")} placeholder="Sydney CBD — Town Hall Station" /></Field>
          </div>
          <Divider />
          <Field label="Operates On">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {WEEKDAYS.map(day => {
                const isOn = (form.operatesOn ?? []).includes(day);
                return (
                  <button key={day} onClick={() => toggleDay(day)} style={{
                    padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                    border: `1.5px solid ${isOn ? "#0891B2" : "#E8E6E2"}`,
                    background: isOn ? "#E0F2FE" : "#FFFFFF", color: isOn ? "#0891B2" : "#57534E",
                    cursor: "pointer",
                  }}>{day}</button>
                );
              })}
            </div>
          </Field>
          <div style={{ marginTop: 12 }}>
            <Toggle checked={form.pickupAvailable ?? false} onChange={F("pickupAvailable")} label="Hotel/Accommodation Pickup Available" />
          </div>
          <Divider />
          <Grid2>
            <Field label="Inclusions"><Textarea value={form.inclusions} onChange={F("inclusions")} placeholder="Lunch, National Park Entry, Guide..." rows={2} /></Field>
            <Field label="Exclusions"><Textarea value={form.exclusions} onChange={F("exclusions")} placeholder="Personal expenses, Travel insurance..." rows={2} /></Field>
          </Grid2>
          <div style={{ marginTop: 12 }}>
            <Field label="Cancellation Policy"><Textarea value={form.cancellationPolicy} onChange={F("cancellationPolicy")} placeholder="48-hour cancellation policy..." rows={2} /></Field>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
            <Btn variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Btn>
            <Btn size="sm" onClick={save}><Save size={13} /> Save Tour</Btn>
          </div>
        </div>
      )}

      {profiles.length === 0 && !showForm ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#A8A29E" }}>
          <Map size={32} style={{ margin: "0 auto 8px", display: "block", opacity: 0.4 }} />
          <p style={{ fontSize: 14 }}>No tour products yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {profiles.map(p => (
            <div key={p.id} style={{ border: "1px solid #E8E6E2", borderRadius: 10, padding: "16px 20px", background: "#FFFFFF", display: "flex", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#1C1917" }}>{p.tourName}</span>
                  {p.tourType && <TagChip label={TOUR_TYPE_LABELS[p.tourType] ?? p.tourType} color="#0891B2" bg="#E0F2FE" />}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px 16px" }}>
                  {[
                    { icon: <Clock size={12} />, val: p.durationHours ? `${p.durationHours}h` : undefined },
                    { icon: <Users size={12} />, val: p.maxParticipants ? `Max ${p.maxParticipants} pax` : undefined },
                    { icon: <MapPin size={12} />, val: p.defaultPickupLocation },
                    { icon: <DollarSign size={12} />, val: p.adultRetailPrice ? `A$${p.adultRetailPrice}/person` : undefined, highlight: true },
                    { icon: <DollarSign size={12} />, val: p.partnerCost ? `Cost: A$${p.partnerCost}` : undefined },
                  ].filter(i => i.val).map((item, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13,
                      color: (item as any).highlight ? "#F5821F" : "#57534E", fontWeight: (item as any).highlight ? 600 : 400 }}>
                      {item.icon}{item.val}
                    </div>
                  ))}
                </div>
                {(p.operatesOn ?? []).length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {(p.operatesOn ?? []).map(d => <TagChip key={d} label={d} color="#0891B2" bg="#E0F2FE" />)}
                  </div>
                )}
              </div>
              {!readOnly && (
                <div style={{ display: "flex", gap: 6, marginLeft: 12 }}>
                  <button onClick={() => { setForm(p); setEditId(p.id); setShowForm(true); }} style={{ background: "#FEF0E3", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: "#F5821F" }}><Pencil size={13} /></button>
                  <button onClick={() => fetch(`/api/accounts/${accountId}/profiles/tour/${p.id}`, { method: "DELETE" }).then(load)} style={{ background: "#FEF2F2", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: "#DC2626" }}><Trash2 size={13} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
};

// ──────────────────────────────────────────────────────────────
// 5. COMPANY PROFILE SECTION (인턴십 호스트)
// ──────────────────────────────────────────────────────────────
const CompanyProfileSection = ({ accountId, readOnly }: { accountId: string; readOnly?: boolean }) => {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<CompanyProfile>>({ requiresPoliceCheck: false, requiresWwcc: false });

  useEffect(() => {
    fetch(`/api/accounts/${accountId}/profiles/company`)
      .then(r => r.json()).then(d => { setProfile(d.data); if (d.data) setForm(d.data); });
  }, [accountId]);

  const save = async () => {
    const url = profile ? `/api/accounts/${accountId}/profiles/company/${profile.id}` : `/api/accounts/${accountId}/profiles/company`;
    const r = await fetch(url, { method: profile ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await r.json();
    setProfile(d.data); setEditing(false);
  };

  const F = (key: keyof CompanyProfile) => (v: string | boolean) => setForm(prev => ({ ...prev, [key]: v }));

  return (
    <SectionCard
      title="Company Profile"
      icon={<Building2 size={16} />}
      action={!readOnly && (
        <Btn size="sm" variant={editing ? "secondary" : "ghost"} onClick={() => setEditing(!editing)}>
          {editing ? <><X size={13} /> Cancel</> : <><Pencil size={13} /> {profile ? "Edit" : "Add Profile"}</>}
        </Btn>
      )}
    >
      {(editing || !profile) ? (
        <div>
          <Grid2>
            <Field label="Industry"><Input value={form.industry} onChange={F("industry")} placeholder="Hospitality / IT / Marketing" /></Field>
            <Field label="Company Size">
              <Select value={form.companySize} onChange={F("companySize")}
                options={["1-10","11-50","51-200","201-500","500+"].map(s => ({ value: s, label: s }))}
                placeholder="Select size" />
            </Field>
            <Field label="ABN"><Input value={form.abn} onChange={F("abn")} placeholder="XX XXX XXX XXX" /></Field>
            <Field label="Placement Fee Type">
              <Select value={form.placementFeeType} onChange={F("placementFeeType")}
                options={[{value:"flat_fee",label:"Flat Fee"},{value:"percentage_of_salary",label:"% of Salary"},{value:"none",label:"None"}]}
                placeholder="Select type" />
            </Field>
            <Field label="Contact Person"><Input value={form.contactPerson} onChange={F("contactPerson")} placeholder="HR Manager Name" /></Field>
            <Field label="Contact Title"><Input value={form.contactTitle} onChange={F("contactTitle")} placeholder="HR Manager" /></Field>
            <Field label="Contact Email"><Input value={form.contactEmail} onChange={F("contactEmail")} placeholder="hr@company.com" /></Field>
            <Field label="Contact Phone"><Input value={form.contactPhone} onChange={F("contactPhone")} placeholder="+61 2 0000 0000" /></Field>
          </Grid2>
          <div style={{ marginTop: 12 }}>
            <Field label="Work Address"><Input value={form.workAddress} onChange={F("workAddress")} placeholder="Level 5, 123 Collins Street, Melbourne VIC 3000" /></Field>
          </div>
          <Divider />
          <div style={{ display: "flex", gap: 24 }}>
            <Toggle checked={form.requiresPoliceCheck ?? false} onChange={F("requiresPoliceCheck")} label="Police Check Required" />
            <Toggle checked={form.requiresWwcc ?? false} onChange={F("requiresWwcc")} label="WWCC Required" />
          </div>
          <div style={{ marginTop: 12 }}>
            <Field label="Notes"><Textarea value={form.notes} onChange={F("notes")} placeholder="Additional requirements or notes..." /></Field>
          </div>
          {!readOnly && (
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              {editing && <Btn variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</Btn>}
              <Btn size="sm" onClick={save}><Save size={13} /> Save Profile</Btn>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px 24px" }}>
          {[
            { label: "INDUSTRY", val: profile.industry },
            { label: "COMPANY SIZE", val: profile.companySize },
            { label: "ABN", val: profile.abn },
            { label: "CONTACT PERSON", val: profile.contactPerson },
            { label: "CONTACT EMAIL", val: profile.contactEmail },
            { label: "CONTACT PHONE", val: profile.contactPhone },
            { label: "PLACEMENT FEE TYPE", val: profile.placementFeeType },
            { label: "POLICE CHECK", val: profile.requiresPoliceCheck ? "Required" : "Not Required" },
            { label: "WWCC", val: profile.requiresWwcc ? "Required" : "Not Required" },
          ].map(f => f.val && (
            <div key={f.label}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{f.label}</div>
              <div style={{ fontSize: 14, color: "#1C1917" }}>{f.val}</div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
};

// ──────────────────────────────────────────────────────────────
// 6. SCHOOL PROFILE SECTION
// ──────────────────────────────────────────────────────────────
const SchoolProfileSection = ({ accountId, readOnly }: { accountId: string; readOnly?: boolean }) => {
  const [profile, setProfile] = useState<SchoolProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<SchoolProfile>>({ canSponsorStudentVisa: true, oshcRequired: true, intakeMonths: [] });

  useEffect(() => {
    fetch(`/api/accounts/${accountId}/profiles/school`)
      .then(r => r.json()).then(d => { setProfile(d.data); if (d.data) setForm(d.data); });
  }, [accountId]);

  const toggleMonth = (m: number) =>
    setForm(p => ({ ...p, intakeMonths: (p.intakeMonths ?? []).includes(m) ? (p.intakeMonths ?? []).filter(x => x !== m) : [...(p.intakeMonths ?? []), m].sort((a, b) => a - b) }));

  const save = async () => {
    const url = profile ? `/api/accounts/${accountId}/profiles/school/${profile.id}` : `/api/accounts/${accountId}/profiles/school`;
    const r = await fetch(url, { method: profile ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await r.json();
    setProfile(d.data); setEditing(false);
  };

  const F = (key: keyof SchoolProfile) => (v: string | boolean) => setForm(prev => ({ ...prev, [key]: v }));

  return (
    <SectionCard
      title="School Profile"
      icon={<GraduationCap size={16} />}
      action={!readOnly && (
        <Btn size="sm" variant="ghost" onClick={() => setEditing(!editing)}>
          {editing ? <><X size={13} /> Cancel</> : <><Pencil size={13} /> {profile ? "Edit" : "Add Profile"}</>}
        </Btn>
      )}
    >
      {(editing || !profile) ? (
        <div>
          <Grid2>
            <Field label="CRICOS Code"><Input value={form.cricosCode} onChange={F("cricosCode")} placeholder="00000A" /></Field>
            <Field label="RTO Code"><Input value={form.rtoCode} onChange={F("rtoCode")} placeholder="12345" /></Field>
            <Field label="Institution Type">
              <Select value={form.institutionType} onChange={F("institutionType")}
                options={["University","TAFE","English Language School","High School","Primary School","Other"].map(t => ({ value: t, label: t }))}
                placeholder="Select type" />
            </Field>
            <Field label="Academic Calendar">
              <Select value={form.academicCalendar} onChange={F("academicCalendar")}
                options={["Term","Semester","Trimester","Year-round"].map(t => ({ value: t, label: t }))}
                placeholder="Select" />
            </Field>
            <Field label="Enrolment Officer"><Input value={form.enrolmentOfficer} onChange={F("enrolmentOfficer")} placeholder="Officer Name" /></Field>
            <Field label="Enrolment Email"><Input value={form.enrolmentEmail} onChange={F("enrolmentEmail")} placeholder="enrolments@school.edu.au" /></Field>
            <Field label="Default Commission Rate (%)">
              <Input value={form.defaultCommissionRate} onChange={F("defaultCommissionRate")} type="number" placeholder="15.00" />
            </Field>
            <Field label="Commission Basis">
              <Select value={form.commissionBasis} onChange={F("commissionBasis")}
                options={[{value:"gross",label:"Gross"},{value:"net",label:"Net"},{value:"first_term",label:"First Term"},{value:"full_year_first_term",label:"Full Year / First Term"}]}
                placeholder="Select basis" />
            </Field>
          </Grid2>
          <Divider />
          <Field label="Intake Months">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {MONTHS.map(m => {
                const isOn = (form.intakeMonths ?? []).includes(m.value);
                return (
                  <button key={m.value} onClick={() => toggleMonth(m.value)} style={{
                    padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                    border: `1.5px solid ${isOn ? "#CA8A04" : "#E8E6E2"}`,
                    background: isOn ? "#FEF9C3" : "#FFFFFF", color: isOn ? "#CA8A04" : "#57534E",
                    cursor: "pointer",
                  }}>{m.label}</button>
                );
              })}
            </div>
          </Field>
          <Divider />
          <div style={{ display: "flex", gap: 24 }}>
            <Toggle checked={form.canSponsorStudentVisa ?? true} onChange={F("canSponsorStudentVisa")} label="Can Sponsor Student Visa" />
            <Toggle checked={form.oshcRequired ?? true} onChange={F("oshcRequired")} label="OSHC Required" />
          </div>
          {!readOnly && (
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              {editing && <Btn variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</Btn>}
              <Btn size="sm" onClick={save}><Save size={13} /> Save Profile</Btn>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px 24px" }}>
          {[
            { label: "CRICOS CODE", val: profile.cricosCode },
            { label: "RTO CODE", val: profile.rtoCode },
            { label: "INSTITUTION TYPE", val: profile.institutionType },
            { label: "ACADEMIC CALENDAR", val: profile.academicCalendar },
            { label: "ENROLMENT OFFICER", val: profile.enrolmentOfficer },
            { label: "ENROLMENT EMAIL", val: profile.enrolmentEmail },
            { label: "DEFAULT COMMISSION", val: profile.defaultCommissionRate ? `${profile.defaultCommissionRate}%` : undefined },
            { label: "COMMISSION BASIS", val: profile.commissionBasis },
            { label: "STUDENT VISA", val: profile.canSponsorStudentVisa ? "✅ Can Sponsor" : "❌ Cannot Sponsor" },
          ].map(f => f.val && (
            <div key={f.label}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{f.label}</div>
              <div style={{ fontSize: 14, color: "#1C1917" }}>{f.val}</div>
            </div>
          ))}
          {(profile.intakeMonths ?? []).length > 0 && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>INTAKE MONTHS</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {(profile.intakeMonths ?? []).map(m => (
                  <TagChip key={m} label={MONTHS.find(mo => mo.value === m)?.label ?? String(m)} color="#CA8A04" bg="#FEF9C3" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
};

// ──────────────────────────────────────────────────────────────
// MAIN ENTRY POINT
// ──────────────────────────────────────────────────────────────
export const AccountServiceProfilesTab = ({
  accountId,
  accountName,
  readOnly = false,
}: AccountServiceProfilesTabProps) => {
  const [activeCategories, setActiveCategories] = useState<ServiceType[]>([]);

  // 카테고리 상태를 자식에서 끌어올리기 위한 polling
  useEffect(() => {
    const poll = () => {
      fetch(`/api/accounts/${accountId}/service-categories`)
        .then(r => r.json())
        .then(d => setActiveCategories(
          d.data.filter((c: ServiceCategory) => c.isActive).map((c: ServiceCategory) => c.serviceType)
        ));
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [accountId]);

  const has = (type: ServiceType) => activeCategories.includes(type);

  return (
    <div style={{ padding: "24px 0", maxWidth: 900 }}>
      {/* 섹션 헤더 */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1C1917", margin: 0 }}>
          Service Profiles
        </h2>
        <p style={{ fontSize: 13, color: "#57534E", marginTop: 4 }}>
          Configure service capabilities and partner details for{" "}
          <strong>{accountName ?? "this account"}</strong>.
          Profile data pre-fills contract service modules automatically.
        </p>
      </div>

      {/* 1. 카테고리 선택 — 항상 표시 */}
      <ServiceCategorySelector accountId={accountId} readOnly={readOnly} />

      {/* 2. 카테고리별 프로필 섹션 — 동적 렌더링 */}
      {(has("homestay") || has("dormitory")) && (
        <HomestayProfileSection accountId={accountId} readOnly={readOnly} />
      )}

      {has("pickup") && (
        <PickupProfileSection accountId={accountId} readOnly={readOnly} />
      )}

      {has("tour_provider") && (
        <TourProfileSection accountId={accountId} readOnly={readOnly} />
      )}

      {has("internship_host") && (
        <CompanyProfileSection accountId={accountId} readOnly={readOnly} />
      )}

      {(has("school") || has("camp_institute")) && (
        <SchoolProfileSection accountId={accountId} readOnly={readOnly} />
      )}

      {/* 카테고리 미선택 시 안내 */}
      {activeCategories.length === 0 && (
        <div style={{
          textAlign: "center", padding: "48px 32px",
          background: "#FFFFFF", border: "1px dashed #E8E6E2", borderRadius: 12,
          color: "#A8A29E",
        }}>
          <Star size={36} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "#57534E", margin: "0 0 6px" }}>
            No service categories selected
          </p>
          <p style={{ fontSize: 13, margin: 0 }}>
            Select one or more service types above to add profile details.
          </p>
        </div>
      )}
    </div>
  );
};

export default AccountServiceProfilesTab;
