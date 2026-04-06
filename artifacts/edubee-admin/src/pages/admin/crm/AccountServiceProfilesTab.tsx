import { useState, useEffect, useCallback } from "react";
import {
  Home, Car, Building2, GraduationCap, MapPin,
  Plus, Pencil, Trash2,
  Phone, Clock, Users, DollarSign, Star,
  CheckSquare, Square, Save, X, Globe, AlertCircle,
  Utensils, Bed, Plane, Bus, Map, Layers, ConciergeBell,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const token = localStorage.getItem("edubee_token");
  return fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
}

type ServiceType =
  | "homestay" | "dormitory" | "hotel" | "pickup" | "tour_provider"
  | "internship_host" | "school" | "camp_institute"
  | "guardian" | "translation" | "other";

interface ServiceCategory {
  id: string; accountId: string; serviceType: ServiceType;
  isActive: boolean; notes?: string;
}

interface HomestayProfile {
  id: string; accountId: string; roomType?: string;
  accommodationType?: string; mealIncluded?: string;
  weeklyRate?: string; partnerWeeklyCost?: string;
  distanceToSchool?: string; maxStudents?: number;
  availableFrom?: string; hostName?: string; hostContact?: string;
  propertyAddress?: string; amenities?: Record<string, boolean>;
  houseRules?: string; isCurrentlyOccupied: boolean;
  currentStudentCount: number; isActive: boolean; notes?: string;
}

interface PickupProfile {
  id: string; accountId: string; driverName?: string;
  driverContact?: string; vehicleMake?: string; vehicleModel?: string;
  vehicleColor?: string; plateNumber?: string; vehicleYear?: number;
  capacity?: number; serviceArea?: string; serviceAirports?: string[];
  baseRate?: string; nightRate?: string; isAvailable: boolean;
  isActive: boolean; notes?: string;
}

interface TourProfile {
  id: string; accountId: string; tourName: string;
  tourType?: string; tourCategory?: string; durationHours?: number;
  durationDays?: number; minParticipants?: number; maxParticipants?: number;
  defaultPickupLocation?: string; pickupAvailable: boolean;
  operatesOn?: string[]; departureTime?: string; returnTime?: string;
  inclusions?: string; exclusions?: string; adultRetailPrice?: string;
  childRetailPrice?: string; partnerCost?: string;
  advanceBookingDays?: number; cancellationPolicy?: string;
  bookingContact?: string; guideLanguages?: string[];
  isActive: boolean; notes?: string;
}

interface CompanyProfile {
  id: string; accountId: string; industry?: string; companySize?: string;
  abn?: string; contactPerson?: string; contactTitle?: string;
  contactEmail?: string; contactPhone?: string;
  availablePositions?: Array<{
    title: string; type: string; hourly_rate: number;
    hours_per_week: number; available_from?: string;
    is_active: boolean; notes?: string;
  }>;
  placementFeeType?: string; placementFee?: string;
  requiresPoliceCheck: boolean; requiresWwcc: boolean;
  dressCode?: string; workAddress?: string; isActive: boolean; notes?: string;
}

interface SchoolProfile {
  id: string; accountId: string; cricosCode?: string; rtoCode?: string;
  institutionType?: string[]; enrolmentOfficer?: string;
  enrolmentEmail?: string; enrolmentPhone?: string;
  intakeMonths?: number[]; academicCalendar?: string;
  defaultCommissionRate?: string; commissionBasis?: string;
  availableCourses?: Array<{
    name: string; code?: string; level?: string;
    duration_weeks_min: number; duration_weeks_max: number;
    tuition_per_week_aud: number; is_active: boolean;
  }>;
  canSponsorStudentVisa: boolean; oshcRequired: boolean;
  isActive: boolean; notes?: string;
}

interface HotelProfile {
  id: string; accountId: string;
  roomTypeName?: string; starRating?: number;
  mealIncluded?: string;
  retailPricePerNight?: string; partnerCostPerNight?: string;
  totalRooms?: number;
  checkInTime?: string; checkOutTime?: string;
  propertyAddress?: string;
  distanceToSchool?: string; distanceToCbd?: string;
  amenities?: Record<string, boolean>;
  bookingContact?: string; cancellationPolicy?: string;
  isActive: boolean; notes?: string;
}

interface AccountServiceProfilesTabProps {
  accountId: string; accountName?: string; readOnly?: boolean;
}

const SERVICE_TYPE_CONFIG: Record<ServiceType, {
  label: string; icon: React.ReactNode; color: string; bg: string;
}> = {
  homestay:        { label: "Homestay",        icon: <Home size={14} />,          color: "var(--e-orange)", bg: "var(--e-orange-lt)" },
  dormitory:       { label: "Dormitory",        icon: <Bed size={14} />,           color: "var(--e-orange)", bg: "var(--e-orange-lt)" },
  hotel:           { label: "Hotel",            icon: <ConciergeBell size={14} />, color: "#0369A1", bg: "#E0F2FE" },
  pickup:          { label: "Airport Pickup",   icon: <Car size={14} />,           color: "#16A34A", bg: "#DCFCE7" },
  tour_provider:   { label: "Tour Provider",    icon: <Map size={14} />,           color: "#0891B2", bg: "#E0F2FE" },
  internship_host: { label: "Internship Host",  icon: <Building2 size={14} />,     color: "#7C3AED", bg: "#EDE9FE" },
  school:          { label: "School",           icon: <GraduationCap size={14} />, color: "#CA8A04", bg: "#FEF9C3" },
  camp_institute:  { label: "Camp Institute",   icon: <Star size={14} />,          color: "#DC2626", bg: "#FEF2F2" },
  guardian:        { label: "Guardian",         icon: <Users size={14} />,         color: "#0284C7", bg: "#E0F2FE" },
  translation:     { label: "Translation",      icon: <Globe size={14} />,         color: "#57534E", bg: "#F4F3F1" },
  other:           { label: "Other",            icon: <AlertCircle size={14} />,   color: "#57534E", bg: "#F4F3F1" },
};

const INSTITUTION_TYPES = [
  "English Language School",
  "University",
  "TAFE",
  "Private College",
  "High School",
  "Primary School",
  "Other",
];

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

const FieldLabel = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <label style={{ fontSize: 11, fontWeight: 500, color: "#57534E", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {label}
    </label>
    {children}
  </div>
);

const TextInput = ({ value, onChange, placeholder, type = "text", disabled = false }: {
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
    onFocus={e => { e.target.style.borderColor = "var(--e-orange)"; e.target.style.boxShadow = "0 0 0 3px var(--e-orange-ring)"; }}
    onBlur={e => { e.target.style.borderColor = "#E8E6E2"; e.target.style.boxShadow = "none"; }}
  />
);

const SelectInput = ({ value, onChange, options, placeholder }: {
  value: string | undefined; onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>; placeholder?: string;
}) => (
  <select
    value={value ?? ""}
    onChange={e => onChange(e.target.value)}
    style={{
      height: 40, border: "1.5px solid #E8E6E2", borderRadius: 8,
      padding: "0 12px", fontSize: 14,
      color: value ? "#1C1917" : "#A8A29E",
      background: "#FFFFFF", outline: "none", width: "100%",
      cursor: "pointer", appearance: "none",
      transition: "border-color 150ms, box-shadow 150ms",
    }}
    onFocus={e => { e.target.style.borderColor = "var(--e-orange)"; e.target.style.boxShadow = "0 0 0 3px var(--e-orange-ring)"; }}
    onBlur={e => { e.target.style.borderColor = "#E8E6E2"; e.target.style.boxShadow = "none"; }}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const TextareaInput = ({ value, onChange, placeholder, rows = 3 }: {
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
    onFocus={e => { e.target.style.borderColor = "var(--e-orange)"; e.target.style.boxShadow = "0 0 0 3px var(--e-orange-ring)"; }}
    onBlur={e => { e.target.style.borderColor = "#E8E6E2"; e.target.style.boxShadow = "none"; }}
  />
);

const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) => (
  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 999, position: "relative",
        background: checked ? "var(--e-orange)" : "#E8E6E2",
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
    padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 16,
  }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--e-orange-lt)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--e-orange)" }}>
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
    primary:   { background: "var(--e-orange)", color: "#FFFFFF", border: "none" },
    secondary: { background: "#FFFFFF", color: "#1C1917", border: "1.5px solid #E8E6E2" },
    ghost:     { background: "transparent", color: "#57534E", border: "none" },
    danger:    { background: "#FEF2F2", color: "#DC2626", border: "1.5px solid #FECACA" },
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
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>{children}</div>
);

const Divider = () => <div style={{ height: 1, background: "#F4F3F1", margin: "20px 0" }} />;

const ServiceCategorySelector = ({
  accountId, readOnly, onCategoriesChange,
}: { accountId: string; readOnly?: boolean; onCategoriesChange?: (cats: ServiceType[]) => void }) => {
  const [selected, setSelected] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/accounts/${accountId}/service-categories`)
      .then(r => r.json())
      .then(d => {
        const cats = d.data.filter((c: ServiceCategory) => c.isActive).map((c: ServiceCategory) => c.serviceType);
        setSelected(cats);
        onCategoriesChange?.(cats);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [accountId]);

  const toggle = async (type: ServiceType) => {
    if (readOnly) return;
    const isSelected = selected.includes(type);
    if (isSelected) {
      await apiFetch(`/api/accounts/${accountId}/service-categories/${type}`, { method: "DELETE" });
      const next = selected.filter(t => t !== type);
      setSelected(next);
      onCategoriesChange?.(next);
    } else {
      await apiFetch(`/api/accounts/${accountId}/service-categories`, {
        method: "POST",
        body: JSON.stringify({ serviceType: type }),
      });
      const next = [...selected, type];
      setSelected(next);
      onCategoriesChange?.(next);
    }
  };

  if (loading) return <div style={{ height: 80, background: "#F4F3F1", borderRadius: 8 }} />;

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

const HomestayProfileSection = ({ accountId, readOnly }: { accountId: string; readOnly?: boolean }) => {
  const [profiles, setProfiles] = useState<HomestayProfile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<HomestayProfile>>({
    mealIncluded: "no", maxStudents: 1, isCurrentlyOccupied: false, currentStudentCount: 0,
  });

  const loadProfiles = useCallback(() => {
    apiFetch(`/api/accounts/${accountId}/profiles/homestay`)
      .then(r => r.json()).then(d => setProfiles(d.data ?? []));
  }, [accountId]);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  const save = async () => {
    const url = editId
      ? `/api/accounts/${accountId}/profiles/homestay/${editId}`
      : `/api/accounts/${accountId}/profiles/homestay`;
    await apiFetch(url, {
      method: editId ? "PUT" : "POST",
      body: JSON.stringify(form),
    });
    setShowForm(false); setEditId(null);
    setForm({ mealIncluded: "no", maxStudents: 1, isCurrentlyOccupied: false, currentStudentCount: 0 });
    loadProfiles();
  };

  const deactivate = async (id: string) => {
    await apiFetch(`/api/accounts/${accountId}/profiles/homestay/${id}`, { method: "DELETE" });
    loadProfiles();
  };

  const startEdit = (p: HomestayProfile) => {
    setForm(p); setEditId(p.id); setShowForm(true);
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
      {showForm && (
        <div style={{ background: "#FAFAF9", border: "1px solid #E8E6E2", borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1C1917" }}>{editId ? "Edit Room Profile" : "New Room Profile"}</span>
            <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#57534E" }}><X size={18} /></button>
          </div>
          <Grid2>
            <FieldLabel label="Host Name"><TextInput value={form.hostName} onChange={F("hostName")} placeholder="e.g. The Anderson Family" /></FieldLabel>
            <FieldLabel label="Host Contact"><TextInput value={form.hostContact} onChange={F("hostContact")} placeholder="+61 2 9714 5566" /></FieldLabel>
          </Grid2>
          <div style={{ marginTop: 12 }}>
            <FieldLabel label="Property Address"><TextInput value={form.propertyAddress} onChange={F("propertyAddress")} placeholder="14 Maple Street, Strathfield NSW 2135" /></FieldLabel>
          </div>
          <Divider />
          <Grid2>
            <FieldLabel label="Room Type">
              <SelectInput value={form.roomType} onChange={F("roomType")}
                options={ROOM_TYPES.map(r => ({ value: r, label: r }))} placeholder="Select room type" />
            </FieldLabel>
            <FieldLabel label="Accommodation Type">
              <SelectInput value={form.accommodationType} onChange={F("accommodationType")}
                options={ACCOMMODATION_TYPES.map(a => ({ value: a, label: a }))} placeholder="Select type" />
            </FieldLabel>
            <FieldLabel label="Meal Included">
              <SelectInput value={form.mealIncluded} onChange={F("mealIncluded")}
                options={MEAL_OPTIONS.map(m => ({ value: m, label: MEAL_LABELS[m] }))} />
            </FieldLabel>
            <FieldLabel label="Distance to School">
              <TextInput value={form.distanceToSchool} onChange={F("distanceToSchool")} placeholder="e.g. 15 min by train" />
            </FieldLabel>
            <FieldLabel label="Weekly Rate (A$)">
              <TextInput value={form.weeklyRate} onChange={F("weeklyRate")} type="number" placeholder="330.00" />
            </FieldLabel>
            <FieldLabel label="Partner Weekly Cost (A$)">
              <TextInput value={form.partnerWeeklyCost} onChange={F("partnerWeeklyCost")} type="number" placeholder="280.00" />
            </FieldLabel>
            <FieldLabel label="Max Students">
              <TextInput value={form.maxStudents} onChange={v => setForm(p => ({ ...p, maxStudents: parseInt(v) || 1 }))} type="number" placeholder="1" />
            </FieldLabel>
            <FieldLabel label="Available From">
              <TextInput value={form.availableFrom} onChange={F("availableFrom")} type="date" />
            </FieldLabel>
          </Grid2>
          <Divider />
          <ToggleSwitch checked={form.isCurrentlyOccupied ?? false} onChange={F("isCurrentlyOccupied")} label="Currently Occupied" />
          <div style={{ marginTop: 12 }}>
            <FieldLabel label="House Rules / Notes">
              <TextareaInput value={form.notes} onChange={F("notes")} placeholder="House rules, pet policy, quiet hours..." />
            </FieldLabel>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
            <Btn variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Btn>
            <Btn size="sm" onClick={save}><Save size={13} /> Save Profile</Btn>
          </div>
        </div>
      )}

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
                      color: (item as any).highlight ? "var(--e-orange)" : "#57534E", fontWeight: (item as any).highlight ? 600 : 400 }}>
                      {item.icon}{item.val}
                    </div>
                  ))}
                </div>
              </div>
              {!readOnly && (
                <div style={{ display: "flex", gap: 6, marginLeft: 12 }}>
                  <button onClick={() => startEdit(p)} style={{ background: "var(--e-orange-lt)", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: "var(--e-orange)" }}>
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

const PickupProfileSection = ({ accountId, readOnly }: { accountId: string; readOnly?: boolean }) => {
  const [profiles, setProfiles] = useState<PickupProfile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<PickupProfile>>({ isAvailable: true, serviceAirports: [] });

  const load = useCallback(() => {
    apiFetch(`/api/accounts/${accountId}/profiles/pickup`)
      .then(r => r.json()).then(d => setProfiles(d.data ?? []));
  }, [accountId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const url = editId ? `/api/accounts/${accountId}/profiles/pickup/${editId}` : `/api/accounts/${accountId}/profiles/pickup`;
    await apiFetch(url, { method: editId ? "PUT" : "POST", body: JSON.stringify(form) });
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
            <FieldLabel label="Driver Name"><TextInput value={form.driverName} onChange={F("driverName")} placeholder="John Smith" /></FieldLabel>
            <FieldLabel label="Driver Contact"><TextInput value={form.driverContact} onChange={F("driverContact")} placeholder="+61 400 000 000" /></FieldLabel>
            <FieldLabel label="Vehicle Make"><TextInput value={form.vehicleMake} onChange={F("vehicleMake")} placeholder="Toyota" /></FieldLabel>
            <FieldLabel label="Vehicle Model"><TextInput value={form.vehicleModel} onChange={F("vehicleModel")} placeholder="HiAce" /></FieldLabel>
            <FieldLabel label="Vehicle Color"><TextInput value={form.vehicleColor} onChange={F("vehicleColor")} placeholder="White" /></FieldLabel>
            <FieldLabel label="Plate Number"><TextInput value={form.plateNumber} onChange={F("plateNumber")} placeholder="EDU 001" /></FieldLabel>
            <FieldLabel label="Capacity (pax)"><TextInput value={form.capacity} onChange={v => setForm(p => ({ ...p, capacity: parseInt(v) || undefined }))} type="number" placeholder="10" /></FieldLabel>
            <FieldLabel label="Service Area"><TextInput value={form.serviceArea} onChange={F("serviceArea")} placeholder="Sydney Metro" /></FieldLabel>
            <FieldLabel label="Base Rate (A$)"><TextInput value={form.baseRate} onChange={F("baseRate")} type="number" placeholder="120.00" /></FieldLabel>
            <FieldLabel label="Night Rate (A$)"><TextInput value={form.nightRate} onChange={F("nightRate")} type="number" placeholder="150.00" /></FieldLabel>
          </Grid2>
          <Divider />
          <FieldLabel label="Service Airports">
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
          </FieldLabel>
          <div style={{ marginTop: 12 }}>
            <ToggleSwitch checked={form.isAvailable ?? true} onChange={F("isAvailable")} label="Currently Available" />
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
                      color: (item as any).highlight ? "var(--e-orange)" : "#57534E", fontWeight: (item as any).highlight ? 600 : 400 }}>
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
                  <button onClick={() => { setForm(p); setEditId(p.id); setShowForm(true); }} style={{ background: "var(--e-orange-lt)", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: "var(--e-orange)" }}><Pencil size={13} /></button>
                  <button onClick={() => apiFetch(`/api/accounts/${accountId}/profiles/pickup/${p.id}`, { method: "DELETE" }).then(load)} style={{ background: "#FEF2F2", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: "#DC2626" }}><Trash2 size={13} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
};

const TourProfileSection = ({ accountId, readOnly }: { accountId: string; readOnly?: boolean }) => {
  const [profiles, setProfiles] = useState<TourProfile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<TourProfile>>({ pickupAvailable: false, operatesOn: [], guideLanguages: [] });

  const load = useCallback(() => {
    apiFetch(`/api/accounts/${accountId}/profiles/tour`)
      .then(r => r.json()).then(d => setProfiles(d.data ?? []));
  }, [accountId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const url = editId ? `/api/accounts/${accountId}/profiles/tour/${editId}` : `/api/accounts/${accountId}/profiles/tour`;
    await apiFetch(url, { method: editId ? "PUT" : "POST", body: JSON.stringify(form) });
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
            <FieldLabel label="Tour Name"><TextInput value={form.tourName} onChange={F("tourName")} placeholder="Blue Mountains Day Tour" /></FieldLabel>
            <FieldLabel label="Tour Type">
              <SelectInput value={form.tourType} onChange={F("tourType")}
                options={TOUR_TYPES.map(t => ({ value: t, label: TOUR_TYPE_LABELS[t] }))} placeholder="Select type" />
            </FieldLabel>
            <FieldLabel label="Tour Category"><TextInput value={form.tourCategory} onChange={F("tourCategory")} placeholder="Nature / Cultural Heritage" /></FieldLabel>
            <FieldLabel label="Duration (hours)"><TextInput value={form.durationHours} onChange={v => setForm(p => ({ ...p, durationHours: parseInt(v) || undefined }))} type="number" placeholder="8" /></FieldLabel>
            <FieldLabel label="Min Participants"><TextInput value={form.minParticipants} onChange={v => setForm(p => ({ ...p, minParticipants: parseInt(v) || 1 }))} type="number" placeholder="1" /></FieldLabel>
            <FieldLabel label="Max Participants"><TextInput value={form.maxParticipants} onChange={v => setForm(p => ({ ...p, maxParticipants: parseInt(v) || undefined }))} type="number" placeholder="20" /></FieldLabel>
            <FieldLabel label="Departure Time"><TextInput value={form.departureTime} onChange={F("departureTime")} placeholder="08:00 AM" /></FieldLabel>
            <FieldLabel label="Return Time"><TextInput value={form.returnTime} onChange={F("returnTime")} placeholder="06:00 PM" /></FieldLabel>
            <FieldLabel label="Adult Retail Price (A$)"><TextInput value={form.adultRetailPrice} onChange={F("adultRetailPrice")} type="number" placeholder="149.00" /></FieldLabel>
            <FieldLabel label="Partner Cost (A$)"><TextInput value={form.partnerCost} onChange={F("partnerCost")} type="number" placeholder="95.00" /></FieldLabel>
          </Grid2>
          <div style={{ marginTop: 12 }}>
            <FieldLabel label="Default Pickup Location"><TextInput value={form.defaultPickupLocation} onChange={F("defaultPickupLocation")} placeholder="Sydney CBD — Town Hall Station" /></FieldLabel>
          </div>
          <Divider />
          <FieldLabel label="Operates On">
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
          </FieldLabel>
          <div style={{ marginTop: 12 }}>
            <ToggleSwitch checked={form.pickupAvailable ?? false} onChange={F("pickupAvailable")} label="Hotel/Accommodation Pickup Available" />
          </div>
          <Divider />
          <Grid2>
            <FieldLabel label="Inclusions"><TextareaInput value={form.inclusions} onChange={F("inclusions")} placeholder="Lunch, National Park Entry, Guide..." rows={2} /></FieldLabel>
            <FieldLabel label="Exclusions"><TextareaInput value={form.exclusions} onChange={F("exclusions")} placeholder="Personal expenses, Travel insurance..." rows={2} /></FieldLabel>
          </Grid2>
          <div style={{ marginTop: 12 }}>
            <FieldLabel label="Cancellation Policy"><TextareaInput value={form.cancellationPolicy} onChange={F("cancellationPolicy")} placeholder="48-hour cancellation policy..." rows={2} /></FieldLabel>
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
                      color: (item as any).highlight ? "var(--e-orange)" : "#57534E", fontWeight: (item as any).highlight ? 600 : 400 }}>
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
                  <button onClick={() => { setForm(p); setEditId(p.id); setShowForm(true); }} style={{ background: "var(--e-orange-lt)", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: "var(--e-orange)" }}><Pencil size={13} /></button>
                  <button onClick={() => apiFetch(`/api/accounts/${accountId}/profiles/tour/${p.id}`, { method: "DELETE" }).then(load)} style={{ background: "#FEF2F2", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: "#DC2626" }}><Trash2 size={13} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
};

const CompanyProfileSection = ({ accountId, readOnly }: { accountId: string; readOnly?: boolean }) => {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<CompanyProfile>>({ requiresPoliceCheck: false, requiresWwcc: false });

  useEffect(() => {
    apiFetch(`/api/accounts/${accountId}/profiles/company`)
      .then(r => r.json()).then(d => { setProfile(d.data); if (d.data) setForm(d.data); });
  }, [accountId]);

  const save = async () => {
    const url = profile ? `/api/accounts/${accountId}/profiles/company/${profile.id}` : `/api/accounts/${accountId}/profiles/company`;
    const r = await apiFetch(url, { method: profile ? "PUT" : "POST", body: JSON.stringify(form) });
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
            <FieldLabel label="Industry"><TextInput value={form.industry} onChange={F("industry")} placeholder="Hospitality / IT / Marketing" /></FieldLabel>
            <FieldLabel label="Company Size">
              <SelectInput value={form.companySize} onChange={F("companySize")}
                options={["1-10","11-50","51-200","201-500","500+"].map(s => ({ value: s, label: s }))}
                placeholder="Select size" />
            </FieldLabel>
            <FieldLabel label="ABN"><TextInput value={form.abn} onChange={F("abn")} placeholder="XX XXX XXX XXX" /></FieldLabel>
            <FieldLabel label="Placement Fee Type">
              <SelectInput value={form.placementFeeType} onChange={F("placementFeeType")}
                options={[{value:"flat_fee",label:"Flat Fee"},{value:"percentage_of_salary",label:"% of Salary"},{value:"none",label:"None"}]}
                placeholder="Select type" />
            </FieldLabel>
            <FieldLabel label="Contact Person"><TextInput value={form.contactPerson} onChange={F("contactPerson")} placeholder="HR Manager Name" /></FieldLabel>
            <FieldLabel label="Contact Title"><TextInput value={form.contactTitle} onChange={F("contactTitle")} placeholder="HR Manager" /></FieldLabel>
            <FieldLabel label="Contact Email"><TextInput value={form.contactEmail} onChange={F("contactEmail")} placeholder="hr@company.com" /></FieldLabel>
            <FieldLabel label="Contact Phone"><TextInput value={form.contactPhone} onChange={F("contactPhone")} placeholder="+61 2 0000 0000" /></FieldLabel>
          </Grid2>
          <div style={{ marginTop: 12 }}>
            <FieldLabel label="Work Address"><TextInput value={form.workAddress} onChange={F("workAddress")} placeholder="Level 5, 123 Collins Street, Melbourne VIC 3000" /></FieldLabel>
          </div>
          <Divider />
          <div style={{ display: "flex", gap: 24 }}>
            <ToggleSwitch checked={form.requiresPoliceCheck ?? false} onChange={F("requiresPoliceCheck")} label="Police Check Required" />
            <ToggleSwitch checked={form.requiresWwcc ?? false} onChange={F("requiresWwcc")} label="WWCC Required" />
          </div>
          <div style={{ marginTop: 12 }}>
            <FieldLabel label="Notes"><TextareaInput value={form.notes} onChange={F("notes")} placeholder="Additional requirements or notes..." /></FieldLabel>
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

const SchoolProfileSection = ({ accountId, readOnly }: { accountId: string; readOnly?: boolean }) => {
  const [profile, setProfile] = useState<SchoolProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<SchoolProfile>>({ canSponsorStudentVisa: true, oshcRequired: true, intakeMonths: [], institutionType: [] });

  useEffect(() => {
    apiFetch(`/api/accounts/${accountId}/profiles/school`)
      .then(r => r.json()).then(d => {
        setProfile(d.data);
        if (d.data) {
          const normalized = {
            ...d.data,
            institutionType: Array.isArray(d.data.institutionType)
              ? d.data.institutionType
              : d.data.institutionType
                ? [d.data.institutionType]
                : [],
          };
          setForm(normalized);
        }
      });
  }, [accountId]);

  const toggleMonth = (m: number) =>
    setForm(p => ({ ...p, intakeMonths: (p.intakeMonths ?? []).includes(m) ? (p.intakeMonths ?? []).filter(x => x !== m) : [...(p.intakeMonths ?? []), m].sort((a, b) => a - b) }));

  const toggleInstitutionType = (t: string) =>
    setForm(p => ({ ...p, institutionType: (p.institutionType ?? []).includes(t) ? (p.institutionType ?? []).filter(x => x !== t) : [...(p.institutionType ?? []), t] }));

  const save = async () => {
    const url = profile ? `/api/accounts/${accountId}/profiles/school/${profile.id}` : `/api/accounts/${accountId}/profiles/school`;
    const r = await apiFetch(url, { method: profile ? "PUT" : "POST", body: JSON.stringify(form) });
    const d = await r.json();
    if (d.data) {
      const normalized = {
        ...d.data,
        institutionType: Array.isArray(d.data.institutionType) ? d.data.institutionType : d.data.institutionType ? [d.data.institutionType] : [],
      };
      setProfile(normalized);
    }
    setEditing(false);
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
            <FieldLabel label="CRICOS Code"><TextInput value={form.cricosCode} onChange={F("cricosCode")} placeholder="00000A" /></FieldLabel>
            <FieldLabel label="RTO Code"><TextInput value={form.rtoCode} onChange={F("rtoCode")} placeholder="12345" /></FieldLabel>
            <FieldLabel label="Institution Type">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                {INSTITUTION_TYPES.map(t => {
                  const isOn = (form.institutionType ?? []).includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleInstitutionType(t)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "5px 11px", borderRadius: 999, fontSize: 12, fontWeight: 500,
                        border: `1.5px solid ${isOn ? "#CA8A04" : "#E8E6E2"}`,
                        background: isOn ? "#FEF9C3" : "#FFFFFF",
                        color: isOn ? "#CA8A04" : "#57534E",
                        cursor: "pointer", transition: "all 150ms",
                      }}
                    >
                      {isOn ? <CheckSquare size={12} /> : <Square size={12} />}
                      {t}
                    </button>
                  );
                })}
              </div>
            </FieldLabel>
            <FieldLabel label="Academic Calendar">
              <SelectInput value={form.academicCalendar} onChange={F("academicCalendar")}
                options={["Term","Semester","Trimester","Year-round"].map(t => ({ value: t, label: t }))}
                placeholder="Select" />
            </FieldLabel>
            <FieldLabel label="Enrolment Officer"><TextInput value={form.enrolmentOfficer} onChange={F("enrolmentOfficer")} placeholder="Officer Name" /></FieldLabel>
            <FieldLabel label="Enrolment Email"><TextInput value={form.enrolmentEmail} onChange={F("enrolmentEmail")} placeholder="enrolments@school.edu.au" /></FieldLabel>
            <FieldLabel label="Default Commission Rate (%)">
              <TextInput value={form.defaultCommissionRate} onChange={F("defaultCommissionRate")} type="number" placeholder="15.00" />
            </FieldLabel>
            <FieldLabel label="Commission Basis">
              <SelectInput value={form.commissionBasis} onChange={F("commissionBasis")}
                options={[{value:"gross",label:"Gross"},{value:"net",label:"Net"},{value:"first_term",label:"First Term"},{value:"full_year_first_term",label:"Full Year / First Term"}]}
                placeholder="Select basis" />
            </FieldLabel>
          </Grid2>
          <Divider />
          <FieldLabel label="Intake Months">
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
          </FieldLabel>
          <Divider />
          <div style={{ display: "flex", gap: 24 }}>
            <ToggleSwitch checked={form.canSponsorStudentVisa ?? true} onChange={F("canSponsorStudentVisa")} label="Can Sponsor Student Visa" />
            <ToggleSwitch checked={form.oshcRequired ?? true} onChange={F("oshcRequired")} label="OSHC Required" />
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
          {(Array.isArray(profile.institutionType) ? profile.institutionType : []).length > 0 && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>INSTITUTION TYPE</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {(Array.isArray(profile.institutionType) ? profile.institutionType : []).map(t => (
                  <TagChip key={t} label={t} color="#CA8A04" bg="#FEF9C3" />
                ))}
              </div>
            </div>
          )}
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

const HOTEL_AMENITIES = [
  { key: "wifi",       label: "WiFi" },
  { key: "pool",       label: "Pool" },
  { key: "gym",        label: "Gym" },
  { key: "parking",    label: "Parking" },
  { key: "aircon",     label: "Air Con" },
  { key: "laundry",    label: "Laundry" },
  { key: "restaurant", label: "Restaurant" },
  { key: "bar",        label: "Bar" },
  { key: "spa",        label: "Spa" },
  { key: "breakfast",  label: "Breakfast" },
];

const HotelProfileSection = ({ accountId, readOnly }: { accountId: string; readOnly?: boolean }) => {
  const [profiles, setProfiles] = useState<HotelProfile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<HotelProfile>>({ mealIncluded: "no", amenities: {} });

  const loadProfiles = useCallback(() => {
    apiFetch(`/api/accounts/${accountId}/profiles/hotel`)
      .then(r => r.json()).then(d => setProfiles((d.data ?? []).filter((p: HotelProfile) => p.isActive)));
  }, [accountId]);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  const save = async () => {
    const url = editId
      ? `/api/accounts/${accountId}/profiles/hotel/${editId}`
      : `/api/accounts/${accountId}/profiles/hotel`;
    await apiFetch(url, { method: editId ? "PUT" : "POST", body: JSON.stringify(form) });
    setShowForm(false); setEditId(null);
    setForm({ mealIncluded: "no", amenities: {} });
    loadProfiles();
  };

  const deactivate = async (id: string) => {
    await apiFetch(`/api/accounts/${accountId}/profiles/hotel/${id}`, { method: "DELETE" });
    loadProfiles();
  };

  const startEdit = (p: HotelProfile) => { setForm(p); setEditId(p.id); setShowForm(true); };

  const F = (key: keyof HotelProfile) => (v: string | boolean | number) =>
    setForm(prev => ({ ...prev, [key]: v }));

  const toggleAmenity = (key: string) =>
    setForm(p => ({ ...p, amenities: { ...(p.amenities ?? {}), [key]: !(p.amenities ?? {})[key] } }));

  return (
    <SectionCard
      title="Hotel Room Types"
      icon={<ConciergeBell size={16} />}
      action={!readOnly && (
        <Btn onClick={() => { setShowForm(true); setEditId(null); setForm({ mealIncluded: "no", amenities: {} }); }} size="sm">
          <Plus size={13} /> Add Room Type
        </Btn>
      )}
    >
      {showForm && (
        <div style={{ background: "#FAFAF9", border: "1px solid #E8E6E2", borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1C1917" }}>{editId ? "Edit Room Type" : "New Room Type"}</span>
            <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#57534E" }}><X size={18} /></button>
          </div>

          <Grid2>
            <FieldLabel label="Room Type Name">
              <TextInput value={form.roomTypeName} onChange={F("roomTypeName")} placeholder="e.g. Standard King, Deluxe Twin" />
            </FieldLabel>
            <FieldLabel label="Star Rating">
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, starRating: n }))}
                    style={{
                      background: "none", border: "none", cursor: "pointer", padding: 2,
                      color: (form.starRating ?? 0) >= n ? "#F59E0B" : "#D6D3D1",
                    }}
                  >
                    <Star size={22} fill={(form.starRating ?? 0) >= n ? "#F59E0B" : "none"} />
                  </button>
                ))}
                {form.starRating && (
                  <span style={{ fontSize: 12, color: "#57534E", marginLeft: 4 }}>{form.starRating} star{form.starRating > 1 ? "s" : ""}</span>
                )}
              </div>
            </FieldLabel>
          </Grid2>

          <div style={{ marginTop: 12 }}>
            <FieldLabel label="Property Address">
              <TextInput value={form.propertyAddress} onChange={F("propertyAddress")} placeholder="123 Main Street, Sydney NSW 2000" />
            </FieldLabel>
          </div>

          <Divider />

          <Grid2>
            <FieldLabel label="Meal Included">
              <SelectInput value={form.mealIncluded} onChange={F("mealIncluded")}
                options={MEAL_OPTIONS.map(m => ({ value: m, label: MEAL_LABELS[m] }))} />
            </FieldLabel>
            <FieldLabel label="Total Rooms Available">
              <TextInput value={form.totalRooms} onChange={v => setForm(p => ({ ...p, totalRooms: parseInt(v) || undefined }))} type="number" placeholder="e.g. 10" />
            </FieldLabel>
            <FieldLabel label="Retail Price / Night (A$)">
              <TextInput value={form.retailPricePerNight} onChange={F("retailPricePerNight")} type="number" placeholder="150.00" />
            </FieldLabel>
            <FieldLabel label="Partner Cost / Night (A$)">
              <TextInput value={form.partnerCostPerNight} onChange={F("partnerCostPerNight")} type="number" placeholder="120.00" />
            </FieldLabel>
            <FieldLabel label="Check-In Time">
              <TextInput value={form.checkInTime} onChange={F("checkInTime")} placeholder="e.g. 14:00" />
            </FieldLabel>
            <FieldLabel label="Check-Out Time">
              <TextInput value={form.checkOutTime} onChange={F("checkOutTime")} placeholder="e.g. 11:00" />
            </FieldLabel>
            <FieldLabel label="Distance to School">
              <TextInput value={form.distanceToSchool} onChange={F("distanceToSchool")} placeholder="e.g. 10 min walk" />
            </FieldLabel>
            <FieldLabel label="Distance to CBD">
              <TextInput value={form.distanceToCbd} onChange={F("distanceToCbd")} placeholder="e.g. 5 min by train" />
            </FieldLabel>
            <FieldLabel label="Booking Contact">
              <TextInput value={form.bookingContact} onChange={F("bookingContact")} placeholder="reservations@hotel.com" />
            </FieldLabel>
          </Grid2>

          <Divider />

          <FieldLabel label="Amenities">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {HOTEL_AMENITIES.map(({ key, label }) => {
                const isOn = !!(form.amenities ?? {})[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleAmenity(key)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "5px 11px", borderRadius: 999, fontSize: 12, fontWeight: 500,
                      border: `1.5px solid ${isOn ? "#0369A1" : "#E8E6E2"}`,
                      background: isOn ? "#E0F2FE" : "#FFFFFF",
                      color: isOn ? "#0369A1" : "#57534E",
                      cursor: "pointer", transition: "all 150ms",
                    }}
                  >
                    {isOn ? <CheckSquare size={12} /> : <Square size={12} />}
                    {label}
                  </button>
                );
              })}
            </div>
          </FieldLabel>

          <div style={{ marginTop: 12 }}>
            <FieldLabel label="Cancellation Policy">
              <TextareaInput value={form.cancellationPolicy} onChange={F("cancellationPolicy")} placeholder="Free cancellation up to 24 hours before check-in..." />
            </FieldLabel>
          </div>
          <div style={{ marginTop: 12 }}>
            <FieldLabel label="Notes">
              <TextareaInput value={form.notes} onChange={F("notes")} placeholder="Additional notes..." />
            </FieldLabel>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
            <Btn variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Btn>
            <Btn size="sm" onClick={save}><Save size={13} /> Save Room Type</Btn>
          </div>
        </div>
      )}

      {profiles.length === 0 && !showForm ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#A8A29E" }}>
          <ConciergeBell size={32} style={{ margin: "0 auto 8px", display: "block", opacity: 0.4 }} />
          <p style={{ fontSize: 14 }}>No hotel room types yet. Click "Add Room Type" to get started.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {profiles.map(p => (
            <div key={p.id} style={{ border: "1px solid #E8E6E2", borderRadius: 10, padding: "16px 20px", background: "#FFFFFF" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#1C1917" }}>{p.roomTypeName ?? "Unnamed Room"}</span>
                    {p.starRating && (
                      <span style={{ display: "flex", gap: 2 }}>
                        {Array.from({ length: p.starRating }).map((_, i) => (
                          <Star key={i} size={13} fill="#F59E0B" color="#F59E0B" />
                        ))}
                      </span>
                    )}
                  </div>
                  {p.propertyAddress && (
                    <div style={{ fontSize: 12, color: "#78716C", display: "flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={11} /> {p.propertyAddress}
                    </div>
                  )}
                </div>
                {!readOnly && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn variant="secondary" size="sm" onClick={() => startEdit(p)}><Pencil size={12} /></Btn>
                    <Btn variant="secondary" size="sm" onClick={() => deactivate(p.id)}><Trash2 size={12} /></Btn>
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px 16px", marginTop: 12 }}>
                {[
                  { label: "MEAL", val: p.mealIncluded ? MEAL_LABELS[p.mealIncluded] ?? p.mealIncluded : undefined },
                  { label: "RETAIL / NIGHT", val: p.retailPricePerNight ? `A$${p.retailPricePerNight}` : undefined },
                  { label: "PARTNER COST", val: p.partnerCostPerNight ? `A$${p.partnerCostPerNight}` : undefined },
                  { label: "ROOMS", val: p.totalRooms ? String(p.totalRooms) : undefined },
                  { label: "CHECK-IN", val: p.checkInTime },
                  { label: "CHECK-OUT", val: p.checkOutTime },
                  { label: "TO SCHOOL", val: p.distanceToSchool },
                  { label: "TO CBD", val: p.distanceToCbd },
                  { label: "BOOKING", val: p.bookingContact },
                ].map(f => f.val && (
                  <div key={f.label}>
                    <div style={{ fontSize: 10, fontWeight: 500, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.05em" }}>{f.label}</div>
                    <div style={{ fontSize: 13, color: "#1C1917" }}>{f.val}</div>
                  </div>
                ))}
              </div>

              {p.amenities && Object.values(p.amenities).some(Boolean) && (
                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {HOTEL_AMENITIES.filter(a => (p.amenities ?? {})[a.key]).map(a => (
                    <TagChip key={a.key} label={a.label} color="#0369A1" bg="#E0F2FE" />
                  ))}
                </div>
              )}

              {p.cancellationPolicy && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#57534E", borderTop: "1px solid #F4F3F1", paddingTop: 8 }}>
                  <span style={{ fontWeight: 500 }}>Cancellation: </span>{p.cancellationPolicy}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
};

export const AccountServiceProfilesTab = ({
  accountId, accountName, readOnly = false,
}: AccountServiceProfilesTabProps) => {
  const [activeCategories, setActiveCategories] = useState<ServiceType[]>([]);

  const has = (type: ServiceType) => activeCategories.includes(type);

  return (
    <div style={{ padding: "24px 0", maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1C1917", margin: 0 }}>Service Profiles</h2>
        <p style={{ fontSize: 13, color: "#57534E", marginTop: 4 }}>
          Configure service capabilities and partner details for{" "}
          <strong>{accountName ?? "this account"}</strong>.
        </p>
      </div>

      <ServiceCategorySelector accountId={accountId} readOnly={readOnly} onCategoriesChange={setActiveCategories} />

      {activeCategories.length === 0 && (
        <div style={{
          textAlign: "center", padding: "48px 24px", background: "#FAFAF9",
          border: "1px dashed #D6D3D1", borderRadius: 12, marginTop: 16,
          color: "#A8A29E",
        }}>
          <Layers size={32} style={{ margin: "0 auto 12px", display: "block", opacity: 0.4 }} />
          <p style={{ fontSize: 15, fontWeight: 500, margin: "0 0 4px", color: "#78716C" }}>No service categories selected</p>
          <p style={{ fontSize: 13, margin: 0 }}>Select one or more service types above to configure profile details.</p>
        </div>
      )}
      {(has("homestay") || has("dormitory")) && <HomestayProfileSection accountId={accountId} readOnly={readOnly} />}
      {has("hotel") && <HotelProfileSection accountId={accountId} readOnly={readOnly} />}
      {has("pickup") && <PickupProfileSection accountId={accountId} readOnly={readOnly} />}
      {has("tour_provider") && <TourProfileSection accountId={accountId} readOnly={readOnly} />}
      {has("internship_host") && <CompanyProfileSection accountId={accountId} readOnly={readOnly} />}
      {(has("school") || has("camp_institute")) && <SchoolProfileSection accountId={accountId} readOnly={readOnly} />}
    </div>
  );
};
