import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReportSymbol, SymbolName } from "@/components/shared/ReportSymbol";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { ReportStatusBadge } from "@/components/shared/ReportStatusBadge";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, ChevronLeft, Plus, X } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const SECTION_SYMBOL_MAP: Record<string, SymbolName> = {
  student_profile: "student",
  pickup_schedule: "pickup",
  accommodation: "accommodation",
  academic: "academic",
  tour: "tour",
  summary: "summary",
  custom: "custom",
};

const SECTION_NUMBER_MAP: Record<string, string> = {
  student_profile: "01", pickup_schedule: "02", accommodation: "03",
  academic: "04", tour: "05", summary: "06",
};

const ENGLISH_LEVELS = ["Beginner", "Elementary", "Pre-Intermediate", "Intermediate", "Upper-Intermediate", "Advanced"];
const DIETARY_OPTIONS = ["None", "Vegetarian", "Vegan", "Halal", "Kosher", "Gluten-Free", "Nut Allergy", "Other"];
const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
const PICKUP_TYPES = ["airport_pickup", "airport_dropoff", "hotel_to_school", "school_to_hotel", "custom"];
const TOUR_STATUSES = ["pending", "confirmed", "completed", "cancelled"];
const ACCOM_STATUSES = ["pending", "confirmed", "checked_in", "checked_out", "cancelled"];

interface Report {
  id: string;
  contractId?: string | null;
  reportTitle?: string | null;
  status?: string | null;
  summaryNotes?: string | null;
}

interface Section {
  id: string;
  sectionType: string;
  sectionTitle: string;
  displayOrder: number;
  isVisible: boolean;
  isManuallyEdited: boolean;
  content: Record<string, unknown>;
}

// ── Sortable Section Item ─────────────────────────────────────────
function SortableSectionItem({
  section, isActive, onSelect, onToggleVisible,
}: {
  section: Section;
  isActive: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const sym = SECTION_SYMBOL_MAP[section.sectionType] ?? "custom";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={`flex items-center gap-2 px-3 py-2 cursor-pointer rounded-r-lg select-none
        ${isActive ? "bg-[#FEF0E3] border-l-[3px] border-[#F5821F]" : "hover:bg-[#FAFAF9] border-l-[3px] border-transparent"}
        ${!section.isVisible ? "opacity-40" : ""}`}
      onClick={onSelect}
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab text-[#A8A29E] flex-shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </span>
      <ReportSymbol name={sym} size={15} color={isActive ? "#F5821F" : "#57534E"} />
      <span className={`flex-1 text-xs truncate ${isActive ? "text-[#F5821F] font-semibold" : "text-[#1C1917]"}
        ${!section.isVisible ? "line-through" : ""}`}>
        {section.sectionTitle}
      </span>
      <button
        className="flex-shrink-0 text-[#A8A29E] hover:text-[#1C1917]"
        onClick={e => { e.stopPropagation(); onToggleVisible(); }}
      >
        {section.isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
      </button>
    </div>
  );
}

// ── Field Components ──────────────────────────────────────────────
function FieldGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      {title && <h4 className="text-xs font-semibold text-[#57534E] uppercase tracking-wide pt-2">{title}</h4>}
      {children}
    </div>
  );
}

function FieldRow({ label, children, note }: { label: string; children: React.ReactNode; note?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-[#57534E]">{label}</label>
      {children}
      {note && <span className="text-[10px] text-[#A8A29E]">{note}</span>}
    </div>
  );
}

// ── Tag Input ─────────────────────────────────────────────────────
function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex flex-wrap gap-1.5 border border-[#E8E6E2] rounded-md p-2 min-h-[38px]">
      {tags.map((t, i) => (
        <span key={i} className="inline-flex items-center gap-1 bg-[#FEF0E3] text-[#F5821F] text-xs rounded-full px-2 py-0.5">
          {t}
          <button onClick={() => onChange(tags.filter((_, j) => j !== i))}><X className="w-2.5 h-2.5" /></button>
        </span>
      ))}
      <input
        className="text-xs outline-none flex-1 min-w-[80px] bg-transparent"
        placeholder="Type + Enter"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" && val.trim()) {
            onChange([...tags, val.trim()]);
            setVal("");
            e.preventDefault();
          }
        }}
      />
    </div>
  );
}

// ── Section Editors ───────────────────────────────────────────────
function StudentProfileEditor({ content, onChange, role }: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  role: string;
}) {
  const canSeePassport = ["super_admin", "admin", "camp_coordinator"].includes(role);
  const dob = content.dateOfBirth as string | null;
  const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / 31536000000) : null;

  return (
    <div className="space-y-6">
      <FieldGroup title="Personal Information">
        <FieldRow label="Full Name (English)"><Input className="h-8 text-sm" value={(content.fullName as string) ?? ""} onChange={e => onChange({ ...content, fullName: e.target.value })} /></FieldRow>
        <FieldRow label="Full Name (Native)"><Input className="h-8 text-sm" value={(content.fullNameNative as string) ?? ""} onChange={e => onChange({ ...content, fullNameNative: e.target.value })} /></FieldRow>
        <FieldRow label="Date of Birth" note={age !== null ? `Age: ${age} years` : undefined}>
          <Input type="date" className="h-8 text-sm" value={(content.dateOfBirth as string) ?? ""} onChange={e => onChange({ ...content, dateOfBirth: e.target.value })} />
        </FieldRow>
        <FieldRow label="Gender">
          <Select value={(content.gender as string) ?? ""} onValueChange={v => onChange({ ...content, gender: v })}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>{GENDER_OPTIONS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
          </Select>
        </FieldRow>
        <FieldRow label="Nationality"><Input className="h-8 text-sm" value={(content.nationality as string) ?? ""} onChange={e => onChange({ ...content, nationality: e.target.value })} /></FieldRow>
        <FieldRow label="Grade / Year"><Input className="h-8 text-sm" value={(content.grade as string) ?? ""} onChange={e => onChange({ ...content, grade: e.target.value })} /></FieldRow>
        <FieldRow label="School"><Input className="h-8 text-sm" value={(content.schoolName as string) ?? ""} onChange={e => onChange({ ...content, schoolName: e.target.value })} /></FieldRow>
        <FieldRow label="English Level">
          <Select value={(content.englishLevel as string) ?? ""} onValueChange={v => onChange({ ...content, englishLevel: v })}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>{ENGLISH_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </FieldRow>
      </FieldGroup>

      <FieldGroup title="Travel & Contact">
        {canSeePassport ? (
          <>
            <FieldRow label="Passport Number"><Input className="h-8 text-sm" value={(content.passportNumber as string) ?? ""} onChange={e => onChange({ ...content, passportNumber: e.target.value })} /></FieldRow>
            <FieldRow label="Passport Expiry"><Input type="date" className="h-8 text-sm" value={(content.passportExpiry as string) ?? ""} onChange={e => onChange({ ...content, passportExpiry: e.target.value })} /></FieldRow>
          </>
        ) : (
          <p className="text-xs text-[#A8A29E] italic">Passport fields are restricted to Admins and Camp Coordinators.</p>
        )}
        <FieldRow label="Emergency Phone"><Input className="h-8 text-sm" value={(content.emergencyPhone as string) ?? ""} onChange={e => onChange({ ...content, emergencyPhone: e.target.value })} /></FieldRow>
        <FieldRow label="WhatsApp"><Input className="h-8 text-sm" value={(content.whatsapp as string) ?? ""} onChange={e => onChange({ ...content, whatsapp: e.target.value })} /></FieldRow>
        <FieldRow label="LINE ID"><Input className="h-8 text-sm" value={(content.lineId as string) ?? ""} onChange={e => onChange({ ...content, lineId: e.target.value })} /></FieldRow>
        <FieldRow label="Dietary Requirements">
          <Select value={(content.dietaryRequirements as string) ?? ""} onValueChange={v => onChange({ ...content, dietaryRequirements: v })}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>{DIETARY_OPTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </FieldRow>
        <FieldRow label="Medical Notes"><Textarea rows={3} className="text-sm" value={(content.medicalConditions as string) ?? ""} onChange={e => onChange({ ...content, medicalConditions: e.target.value })} /></FieldRow>
      </FieldGroup>

      <FieldGroup title="Program Details (Read-only)">
        <div className="bg-[#FAFAF9] rounded-lg border border-[#E8E6E2] p-3 space-y-1.5 text-xs">
          {[
            ["Program", content.programName],
            ["Package", content.packageName],
            ["Dates", content.startDate ? `${content.startDate} ~ ${content.endDate}` : "—"],
            ["Location", content.campLocation],
            ["Coordinator", content.coordinatorName],
          ].map(([k, v]) => (
            <div key={k as string} className="flex gap-2">
              <span className="text-[#57534E] w-24 shrink-0">{k as string}</span>
              <span className="text-[#1C1917] font-medium">{(v as string) || "—"}</span>
            </div>
          ))}
        </div>
      </FieldGroup>
    </div>
  );
}

function PickupEditor({ content, onChange }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  const pickups = (content.pickups as Record<string, unknown>[]) ?? [];

  const setPickups = (p: Record<string, unknown>[]) => onChange({ ...content, pickups: p });

  const addRow = () => setPickups([...pickups, {
    pickupType: "airport_pickup", pickupDatetime: "", fromLocation: "", toLocation: "", vehicleInfo: "", notes: "", status: "pending",
  }]);

  const updateRow = (i: number, field: string, val: string) => {
    const next = pickups.map((p, idx) => idx === i ? { ...p, [field]: val } : p);
    setPickups(next);
  };

  const removeRow = (i: number) => setPickups(pickups.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-[#FAFAF9] border-b border-[#E8E6E2]">
              {["Type", "Date & Time", "From", "To", "Vehicle", "Status", ""].map(h => (
                <th key={h} className="text-left px-2 py-2 text-[#57534E] font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pickups.map((p, i) => (
              <tr key={i} className="border-b border-[#F4F3F1]">
                <td className="px-1 py-1">
                  <Select value={(p.pickupType as string) ?? "airport_pickup"} onValueChange={v => updateRow(i, "pickupType", v)}>
                    <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{PICKUP_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="px-1 py-1"><Input type="datetime-local" className="h-7 text-xs w-40" value={(p.pickupDatetime as string) ?? ""} onChange={e => updateRow(i, "pickupDatetime", e.target.value)} /></td>
                <td className="px-1 py-1"><Input className="h-7 text-xs w-28" value={(p.fromLocation as string) ?? ""} onChange={e => updateRow(i, "fromLocation", e.target.value)} /></td>
                <td className="px-1 py-1"><Input className="h-7 text-xs w-28" value={(p.toLocation as string) ?? ""} onChange={e => updateRow(i, "toLocation", e.target.value)} /></td>
                <td className="px-1 py-1"><Input className="h-7 text-xs w-24" value={(p.vehicleInfo as string) ?? ""} onChange={e => updateRow(i, "vehicleInfo", e.target.value)} /></td>
                <td className="px-1 py-1">
                  <Select value={(p.status as string) ?? "pending"} onValueChange={v => updateRow(i, "status", v)}>
                    <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>{["pending", "confirmed", "completed", "cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="px-1 py-1"><button onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button size="sm" variant="ghost" className="text-xs gap-1 text-[#F5821F]" onClick={addRow}>
        <Plus className="w-3.5 h-3.5" /> Add Row
      </Button>
    </div>
  );
}

function AccommodationEditor({ content, onChange }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  const f = (field: string) => (content[field] as string) ?? "";
  const s = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...content, [field]: e.target.value });

  return (
    <div className="space-y-3">
      <FieldRow label="Hotel Name"><Input className="h-8 text-sm bg-[#FAFAF9]" value={f("hotelName")} onChange={s("hotelName")} /></FieldRow>
      <FieldRow label="Room Type"><Input className="h-8 text-sm" value={f("roomType")} onChange={s("roomType")} /></FieldRow>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FieldRow label="Check-in Date"><Input type="date" className="h-8 text-sm" value={f("checkinDate")} onChange={s("checkinDate")} /></FieldRow>
        <FieldRow label="Check-in Time"><Input type="time" className="h-8 text-sm" value={f("checkinTime")} onChange={s("checkinTime")} /></FieldRow>
        <FieldRow label="Check-out Date"><Input type="date" className="h-8 text-sm" value={f("checkoutDate")} onChange={s("checkoutDate")} /></FieldRow>
        <FieldRow label="Check-out Time"><Input type="time" className="h-8 text-sm" value={f("checkoutTime")} onChange={s("checkoutTime")} /></FieldRow>
      </div>
      <FieldRow label="Confirmation #"><Input className="h-8 text-sm" value={f("confirmationNo")} onChange={s("confirmationNo")} /></FieldRow>
      <FieldRow label="Status">
        <Select value={f("status") || "pending"} onValueChange={v => onChange({ ...content, status: v })}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{ACCOM_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="Guest Notes"><Textarea rows={3} className="text-sm" value={f("guestNotes")} onChange={s("guestNotes")} /></FieldRow>
    </div>
  );
}

function AcademicEditor({ content, onChange }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  const f = (field: string) => (content[field] as string) ?? "";
  const schedule = (content.schedule as Record<string, unknown>[]) ?? [];

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const autoDay = (date: string) => { try { return DAYS[new Date(date).getDay()]; } catch { return ""; } };

  const addRow = () => onChange({ ...content, schedule: [...schedule, { date: "", day: "", startTime: "", endTime: "", subject: "", teacher: "", room: "" }] });
  const updateRow = (i: number, field: string, val: string) => {
    const next = schedule.map((r, idx) => {
      if (idx !== i) return r;
      const updated = { ...r, [field]: val };
      if (field === "date") updated.day = autoDay(val);
      return updated;
    });
    onChange({ ...content, schedule: next });
  };
  const removeRow = (i: number) => onChange({ ...content, schedule: schedule.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FieldRow label="Institute"><Input className="h-8 text-sm bg-[#FAFAF9]" value={f("instituteName")} onChange={e => onChange({ ...content, instituteName: e.target.value })} /></FieldRow>
        <FieldRow label="Total Hours"><Input type="number" className="h-8 text-sm" value={f("totalHours")} onChange={e => onChange({ ...content, totalHours: e.target.value })} /></FieldRow>
        <FieldRow label="Period Start"><Input type="date" className="h-8 text-sm" value={f("startDate")} onChange={e => onChange({ ...content, startDate: e.target.value })} /></FieldRow>
        <FieldRow label="Period End"><Input type="date" className="h-8 text-sm" value={f("endDate")} onChange={e => onChange({ ...content, endDate: e.target.value })} /></FieldRow>
        <FieldRow label="English Level (Start)">
          <Select value={f("englishLevelStart")} onValueChange={v => onChange({ ...content, englishLevelStart: v })}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>{ENGLISH_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </FieldRow>
        <FieldRow label="English Level (End)">
          <Select value={f("englishLevelEnd")} onValueChange={v => onChange({ ...content, englishLevelEnd: v })}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>{ENGLISH_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </FieldRow>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-2">Class Schedule</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAFAF9] border-b border-[#E8E6E2]">
                {["Date", "Day", "Start", "End", "Subject", "Teacher", "Room", ""].map(h => (
                  <th key={h} className="text-left px-2 py-1.5 text-[#57534E] font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, i) => (
                <tr key={i} className="border-b border-[#F4F3F1]">
                  <td className="px-1 py-1"><Input type="date" className="h-7 text-xs w-32" value={(row.date as string) ?? ""} onChange={e => updateRow(i, "date", e.target.value)} /></td>
                  <td className="px-1 py-1"><Input className="h-7 text-xs w-12" value={(row.day as string) ?? ""} onChange={e => updateRow(i, "day", e.target.value)} /></td>
                  <td className="px-1 py-1"><Input type="time" className="h-7 text-xs w-20" value={(row.startTime as string) ?? ""} onChange={e => updateRow(i, "startTime", e.target.value)} /></td>
                  <td className="px-1 py-1"><Input type="time" className="h-7 text-xs w-20" value={(row.endTime as string) ?? ""} onChange={e => updateRow(i, "endTime", e.target.value)} /></td>
                  <td className="px-1 py-1"><Input className="h-7 text-xs w-32" value={(row.subject as string) ?? ""} onChange={e => updateRow(i, "subject", e.target.value)} /></td>
                  <td className="px-1 py-1"><Input className="h-7 text-xs w-28" value={(row.teacher as string) ?? ""} onChange={e => updateRow(i, "teacher", e.target.value)} /></td>
                  <td className="px-1 py-1"><Input className="h-7 text-xs w-20" value={(row.room as string) ?? ""} onChange={e => updateRow(i, "room", e.target.value)} /></td>
                  <td className="px-1 py-1"><button onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button size="sm" variant="ghost" className="text-xs gap-1 text-[#F5821F] mt-2" onClick={addRow}>
          <Plus className="w-3.5 h-3.5" /> Add Class
        </Button>
      </div>

      <FieldRow label="Teacher's Comments"><Textarea rows={4} className="text-sm" value={f("teacherComments")} onChange={e => onChange({ ...content, teacherComments: e.target.value })} /></FieldRow>
      <FieldRow label="Progress Notes"><Textarea rows={3} className="text-sm" value={f("progressNotes")} onChange={e => onChange({ ...content, progressNotes: e.target.value })} /></FieldRow>
    </div>
  );
}

function TourEditor({ content, onChange }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  const tours = (content.tours as Record<string, unknown>[]) ?? [];
  const [expanded, setExpanded] = useState<number | null>(0);

  const addTour = () => {
    onChange({ ...content, tours: [...tours, { tourName: "New Tour", tourDate: "", startTime: "", endTime: "", meetingPoint: "", guideInfo: "", highlights: [], tourNotes: "", status: "pending" }] });
    setExpanded(tours.length);
  };

  const updateTour = (i: number, field: string, val: unknown) => {
    onChange({ ...content, tours: tours.map((t, idx) => idx === i ? { ...t, [field]: val } : t) });
  };

  const removeTour = (i: number) => {
    onChange({ ...content, tours: tours.filter((_, idx) => idx !== i) });
    setExpanded(null);
  };

  return (
    <div className="space-y-2">
      {tours.map((t, i) => (
        <div key={i} className="border border-[#E8E6E2] rounded-lg overflow-hidden">
          <div
            className="flex items-center gap-2 px-3 py-2.5 cursor-pointer bg-[#FAFAF9] hover:bg-[#F4F3F1]"
            onClick={() => setExpanded(expanded === i ? null : i)}
          >
            <ReportSymbol name="tour" size={14} color="#57534E" />
            <span className="flex-1 text-sm font-medium text-[#1C1917]">{(t.tourName as string) || "Tour"}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${(t.status as string) === "completed" ? "bg-green-100 text-green-700" : "bg-[#FEF0E3] text-[#F5821F]"}`}>{(t.status as string) || "pending"}</span>
            <button onClick={e => { e.stopPropagation(); removeTour(i); }} className="text-red-400 hover:text-red-600 ml-1"><X className="w-3.5 h-3.5" /></button>
          </div>
          {expanded === i && (
            <div className="p-3 space-y-3 bg-white">
              <FieldRow label="Tour Name"><Input className="h-8 text-sm" value={(t.tourName as string) ?? ""} onChange={e => updateTour(i, "tourName", e.target.value)} /></FieldRow>
              <div className="grid grid-cols-3 gap-2">
                <FieldRow label="Date"><Input type="date" className="h-8 text-sm" value={(t.tourDate as string) ?? ""} onChange={e => updateTour(i, "tourDate", e.target.value)} /></FieldRow>
                <FieldRow label="Start"><Input type="time" className="h-8 text-sm" value={(t.startTime as string) ?? ""} onChange={e => updateTour(i, "startTime", e.target.value)} /></FieldRow>
                <FieldRow label="End"><Input type="time" className="h-8 text-sm" value={(t.endTime as string) ?? ""} onChange={e => updateTour(i, "endTime", e.target.value)} /></FieldRow>
              </div>
              <FieldRow label="Meeting Point"><Input className="h-8 text-sm" value={(t.meetingPoint as string) ?? ""} onChange={e => updateTour(i, "meetingPoint", e.target.value)} /></FieldRow>
              <FieldRow label="Guide Info"><Input className="h-8 text-sm" value={(t.guideInfo as string) ?? ""} onChange={e => updateTour(i, "guideInfo", e.target.value)} /></FieldRow>
              <FieldRow label="Highlights">
                <TagInput tags={(t.highlights as string[]) ?? []} onChange={tags => updateTour(i, "highlights", tags)} />
              </FieldRow>
              <FieldRow label="Tour Notes"><Textarea rows={2} className="text-sm" value={(t.tourNotes as string) ?? ""} onChange={e => updateTour(i, "tourNotes", e.target.value)} /></FieldRow>
              <FieldRow label="Status">
                <Select value={(t.status as string) ?? "pending"} onValueChange={v => updateTour(i, "status", v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{TOUR_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
            </div>
          )}
        </div>
      ))}
      <Button size="sm" variant="ghost" className="w-full text-xs gap-1 text-[#F5821F] border border-dashed border-[#F5821F]/40" onClick={addTour}>
        <Plus className="w-3.5 h-3.5" /> Add Tour Activity
      </Button>
    </div>
  );
}

function SummaryEditor({ content, onChange }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  const achievements = (content.achievements as string[]) ?? [];

  return (
    <div className="space-y-4">
      <FieldRow label="Overall Assessment"><Textarea rows={6} className="text-sm" value={(content.overallNotes as string) ?? ""} onChange={e => onChange({ ...content, overallNotes: e.target.value })} /></FieldRow>

      <div>
        <label className="text-xs text-[#57534E]">Achievements</label>
        <div className="mt-2 space-y-1.5">
          {achievements.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#F5821F] rounded-sm shrink-0" />
              <Input className="h-7 text-sm flex-1" value={a} onChange={e => {
                const next = achievements.map((v, j) => j === i ? e.target.value : v);
                onChange({ ...content, achievements: next });
              }} />
              <button onClick={() => onChange({ ...content, achievements: achievements.filter((_, j) => j !== i) })} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
        <Button size="sm" variant="ghost" className="text-xs gap-1 text-[#F5821F] mt-2" onClick={() => onChange({ ...content, achievements: [...achievements, ""] })}>
          <Plus className="w-3.5 h-3.5" /> Add Achievement
        </Button>
      </div>

      <FieldRow label="Recommendations"><Textarea rows={4} className="text-sm" value={(content.recommendations as string) ?? ""} onChange={e => onChange({ ...content, recommendations: e.target.value })} /></FieldRow>
      <FieldRow label="Closing Message"><Textarea rows={3} className="text-sm" value={(content.closingMessage as string) ?? ""} onChange={e => onChange({ ...content, closingMessage: e.target.value })} /></FieldRow>
    </div>
  );
}

function CustomEditor({ section, onChange, onTitleChange }: {
  section: Section;
  onChange: (c: Record<string, unknown>) => void;
  onTitleChange: (t: string) => void;
}) {
  const content = section.content;
  const contentType = (content.contentType as string) ?? "text";
  const items = (content.items as string[]) ?? [];

  return (
    <div className="space-y-4">
      <FieldRow label="Section Title">
        <Input className="h-8 text-sm" value={section.sectionTitle} onChange={e => onTitleChange(e.target.value)} />
      </FieldRow>
      <FieldRow label="Content Type">
        <Select value={contentType} onValueChange={v => onChange({ ...content, contentType: v })}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="bullet_list">Bullet List</SelectItem>
            <SelectItem value="table">Table</SelectItem>
            <SelectItem value="note">Note</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      {contentType === "text" && <FieldRow label="Content"><Textarea rows={6} className="text-sm" value={(content.text as string) ?? ""} onChange={e => onChange({ ...content, text: e.target.value })} /></FieldRow>}
      {contentType === "bullet_list" && (
        <div>
          <label className="text-xs text-[#57534E]">Items</label>
          <div className="mt-2 space-y-1.5">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[#A8A29E]">•</span>
                <Input className="h-7 text-sm flex-1" value={item} onChange={e => onChange({ ...content, items: items.map((v, j) => j === i ? e.target.value : v) })} />
                <button onClick={() => onChange({ ...content, items: items.filter((_, j) => j !== i) })} className="text-red-400"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
          <Button size="sm" variant="ghost" className="text-xs gap-1 text-[#F5821F] mt-2" onClick={() => onChange({ ...content, items: [...items, ""] })}>
            <Plus className="w-3.5 h-3.5" /> Add Item
          </Button>
        </div>
      )}
      {contentType === "note" && (
        <div className="bg-[#FAFAF9] border border-[#E8E6E2] rounded-lg p-3">
          <Textarea rows={5} className="text-sm bg-transparent border-none shadow-none resize-none" value={(content.note as string) ?? ""} onChange={e => onChange({ ...content, note: e.target.value })} placeholder="Note content…" />
        </div>
      )}
    </div>
  );
}

// ── Editor Loading Skeleton ───────────────────────────────────────
function EditorLoadingSkeleton() {
  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      <div className="w-[280px] shrink-0 border-r border-[#E8E6E2] flex flex-col bg-white p-3 gap-3">
        <div className="h-4 w-24 bg-[#F4F3F1] rounded animate-pulse" />
        <div className="h-5 w-40 bg-[#F4F3F1] rounded animate-pulse" />
        <div className="h-8 w-full bg-[#FEF0E3] rounded animate-pulse" />
        <div className="space-y-2 pt-2">
          {[0,1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center gap-2 px-1 py-2">
              <div className="w-3.5 h-3.5 bg-[#E8E6E2] rounded animate-pulse" />
              <div className="h-3.5 bg-[#F4F3F1] rounded animate-pulse flex-1" style={{ width: `${60 + i*5}%` }} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 bg-[#FAFAF9] p-6 space-y-4">
        <div className="h-6 w-48 bg-[#F4F3F1] rounded animate-pulse" />
        {[0,1,2,3,4].map(i => (
          <div key={i} className="h-9 bg-white border border-[#E8E6E2] rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// ── Main Editor Page ──────────────────────────────────────────────
export default function ReportEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  // All hooks must be declared before any early returns
  const [sections, setSections] = useState<Section[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Record<string, Date>>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [lastFailedSectionId, setLastFailedSectionId] = useState<string | null>(null);
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleVal, setTitleVal] = useState("");
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState("");

  const autoSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const role = user?.role ?? "";
  const isViewOnly = false; // all internal staff can edit reports

  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ["report", id],
    queryFn: () => axios.get(`${BASE}/api/reports/${id}`).then(r => r.data),
    enabled: !isViewOnly,
  });
  const report: Report | null = reportData ?? null;

  // Redirect view-only roles to viewer
  useEffect(() => {
    if (isViewOnly && id) navigate(`/admin/reports/${id}`);
  }, [isViewOnly, id, navigate]);

  useEffect(() => {
    if (reportData?.sections) {
      const sorted = [...reportData.sections].sort((a: Section, b: Section) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      setSections(sorted);
      if (!activeId) setActiveId(sorted[0]?.id ?? null);
    }
    if (reportData?.reportTitle) setTitleVal(reportData.reportTitle);
  }, [reportData]);

  const activeSection = sections.find(s => s.id === activeId) ?? null;
  const activeSym: SymbolName = SECTION_SYMBOL_MAP[activeSection?.sectionType ?? ""] ?? "custom";
  const activeNum = SECTION_NUMBER_MAP[activeSection?.sectionType ?? ""] ?? "0X";
  const canUnpublish = ["super_admin", "admin"].includes(role);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = sections.findIndex(s => s.id === active.id);
    const newIdx = sections.findIndex(s => s.id === over.id);
    const reordered = arrayMove(sections, oldIdx, newIdx);
    setSections(reordered);
    const orderedIds = reordered.map(s => s.id);
    axios.patch(`${BASE}/api/reports/${id}/sections/reorder`, { orderedIds }).catch(() => {
      toast({ title: "Reorder failed", variant: "destructive" });
    });
  }, [sections, id, toast]);

  const updateTitleMutation = useMutation({
    mutationFn: (title: string) => axios.put(`${BASE}/api/reports/${id}`, { reportTitle: title }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["report", id] }); setTitleEditing(false); toast({ title: "Title saved" }); },
  });

  const publishMutation = useMutation({
    mutationFn: () => axios.patch(`${BASE}/api/reports/${id}/publish`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["report", id] }); toast({ title: "Report published!", description: "Agent and client notified." }); },
  });

  const unpublishMutation = useMutation({
    mutationFn: () => axios.patch(`${BASE}/api/reports/${id}/unpublish`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["report", id] }); toast({ title: "Report unpublished." }); },
  });

  const syncMutation = useMutation({
    mutationFn: () => axios.post(`${BASE}/api/reports/${id}/sync`).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["report", id] });
      const synced = data?.synced?.join(", ") ?? "";
      const skipped = data?.skipped?.join(", ") ?? "";
      toast({ title: "Sync complete", description: `Synced: ${synced || "none"}. Skipped: ${skipped || "none"}` });
    },
  });

  const addCustomMutation = useMutation({
    mutationFn: (title: string) => axios.post(`${BASE}/api/reports/${id}/sections`, { sectionTitle: title, sectionType: "custom" }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["report", id] }); setShowAddCustom(false); setCustomTitle(""); },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: ({ sectionId, isVisible }: { sectionId: string; isVisible: boolean }) =>
      axios.patch(`${BASE}/api/reports/${id}/sections/${sectionId}`, { isVisible }).then(r => r.data),
    onSuccess: (_, vars) => {
      setSections(prev => prev.map(s => s.id === vars.sectionId ? { ...s, isVisible: vars.isVisible } : s));
    },
  });

  const handleSectionChange = useCallback((sectionId: string, newContent: Record<string, unknown>, newTitle?: string) => {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, content: newContent, ...(newTitle !== undefined ? { sectionTitle: newTitle } : {}) } : s));
    setSaveState("saving");
    setLastFailedSectionId(null);

    if (autoSaveTimers.current[sectionId]) clearTimeout(autoSaveTimers.current[sectionId]);
    autoSaveTimers.current[sectionId] = setTimeout(async () => {
      try {
        const payload: Record<string, unknown> = { content: newContent };
        if (newTitle !== undefined) payload.sectionTitle = newTitle;
        await axios.patch(`${BASE}/api/reports/${id}/sections/${sectionId}`, payload);
        setSavedAt(prev => ({ ...prev, [sectionId]: new Date() }));
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      } catch {
        setSaveState("failed");
        setLastFailedSectionId(sectionId);
      }
    }, 1500);
  }, [id]);

  if (isViewOnly) return null;
  if (reportLoading) return <EditorLoadingSkeleton />;
  if (!report) return <div className="p-6 text-sm text-red-500">Report not found.</div>;

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* LEFT PANEL — Section Navigator */}
      <div className="w-[280px] shrink-0 border-r border-[#E8E6E2] flex flex-col bg-white overflow-hidden">
        <div className="p-3 border-b border-[#E8E6E2] space-y-2">
          {/* Back button */}
          <button className="flex items-center gap-1 text-xs text-[#57534E] hover:text-[#1C1917] mb-1" onClick={() => navigate("/admin/reports")}>
            <ChevronLeft className="w-3.5 h-3.5" /> All Reports
          </button>

          {/* Editable title */}
          {titleEditing ? (
            <div className="flex gap-1">
              <Input
                className="h-7 text-xs flex-1"
                value={titleVal}
                onChange={e => setTitleVal(e.target.value)}
                onBlur={() => updateTitleMutation.mutate(titleVal)}
                autoFocus
              />
              <Button size="sm" className="h-7 text-xs px-2 bg-[#F5821F] text-white" onClick={() => updateTitleMutation.mutate(titleVal)}>Save</Button>
            </div>
          ) : (
            <p className="text-sm font-semibold text-[#1C1917] cursor-pointer hover:text-[#F5821F] line-clamp-2" onClick={() => setTitleEditing(true)}>
              {report.reportTitle ?? "Untitled Report"}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <ReportStatusBadge status={(report.status ?? "draft") as "draft" | "published"} />
            {saveState === "saved" && <span className="text-[10px] text-[#16A34A] font-medium">Saved ✓</span>}
            {saveState === "saving" && <span className="text-[10px] text-[#A8A29E]">Saving…</span>}
            {saveState === "failed" && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-red-500 font-medium">Save failed ✗</span>
                {lastFailedSectionId && activeSection && (
                  <button
                    className="text-[10px] text-[#F5821F] underline"
                    onClick={() => {
                      handleSectionChange(lastFailedSectionId, activeSection.content);
                    }}
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
          </div>

          {report.status === "draft" ? (
            <Button size="sm" className="w-full bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5 h-8" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
              <ReportSymbol name="publish" size={13} color="white" />
              {publishMutation.isPending ? "Publishing…" : "Publish Report"}
            </Button>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 bg-[#FEF0E3] rounded-lg px-2 py-1.5 text-xs text-[#F5821F]">
                <ReportSymbol name="publish" size={13} color="#F5821F" />
                Published — visible to agent & client
              </div>
              {canUnpublish && (
                <Button size="sm" variant="ghost" className="w-full h-7 text-xs" onClick={() => unpublishMutation.mutate()}>Unpublish</Button>
              )}
            </div>
          )}
        </div>

        {/* Section list */}
        <div className="flex-1 overflow-y-auto py-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {sections.map(s => (
                <SortableSectionItem
                  key={s.id}
                  section={s}
                  isActive={s.id === activeId}
                  onSelect={() => setActiveId(s.id)}
                  onToggleVisible={() => toggleVisibilityMutation.mutate({ sectionId: s.id, isVisible: !s.isVisible })}
                />
              ))}
            </SortableContext>
          </DndContext>

          <div className="px-3 pt-2">
            <Button size="sm" variant="ghost" className="w-full text-xs gap-1 text-[#57534E] border border-dashed border-[#E8E6E2]" onClick={() => setShowAddCustom(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Custom Section
            </Button>
          </div>
        </div>

        {/* Bottom buttons */}
        <div className="p-3 border-t border-[#E8E6E2] space-y-1.5">
          <Button size="sm" variant="outline" className="w-full text-xs gap-1.5"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}>
            <ReportSymbol name="sync" size={13} />
            {syncMutation.isPending ? "Syncing…" : "Sync from Services"}
          </Button>
        </div>
      </div>

      {/* RIGHT PANEL — Section Editor */}
      <div className="flex-1 overflow-y-auto bg-[#FAFAF9]">
        {activeSection ? (
          <div>
            {/* Panel header */}
            <div className="sticky top-0 z-10 bg-white border-b border-[#E8E6E2] px-6 py-3 flex items-center justify-between">
              <SectionHeader
                symbol={activeSym}
                number={activeNum}
                title={activeSection.sectionTitle}
                variant="editor"
              />
              <span className="text-xs text-[#A8A29E]">
                {savedAt[activeSection.id] ? `Saved ${savedAt[activeSection.id].toLocaleTimeString()}` : saveState === "saving" ? "Saving…" : ""}
              </span>
            </div>

            {/* Section editor */}
            <div className="p-6 max-w-3xl">
              {activeSection.sectionType === "student_profile" && (
                <StudentProfileEditor
                  content={activeSection.content}
                  onChange={c => handleSectionChange(activeSection.id, c)}
                  role={role}
                />
              )}
              {activeSection.sectionType === "pickup_schedule" && (
                <PickupEditor content={activeSection.content} onChange={c => handleSectionChange(activeSection.id, c)} />
              )}
              {activeSection.sectionType === "accommodation" && (
                <AccommodationEditor content={activeSection.content} onChange={c => handleSectionChange(activeSection.id, c)} />
              )}
              {activeSection.sectionType === "academic" && (
                <AcademicEditor content={activeSection.content} onChange={c => handleSectionChange(activeSection.id, c)} />
              )}
              {activeSection.sectionType === "tour" && (
                <TourEditor content={activeSection.content} onChange={c => handleSectionChange(activeSection.id, c)} />
              )}
              {activeSection.sectionType === "summary" && (
                <SummaryEditor content={activeSection.content} onChange={c => handleSectionChange(activeSection.id, c)} />
              )}
              {activeSection.sectionType === "custom" && (
                <CustomEditor
                  section={activeSection}
                  onChange={c => handleSectionChange(activeSection.id, c)}
                  onTitleChange={t => handleSectionChange(activeSection.id, activeSection.content, t)}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[#A8A29E] text-sm">
            Select a section to edit
          </div>
        )}
      </div>

      {/* Add Custom Section Dialog */}
      <Dialog open={showAddCustom} onOpenChange={setShowAddCustom}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Custom Section</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs text-[#57534E]">Section title</label>
              <Input
                className="mt-1 h-8 text-sm"
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                placeholder="e.g. Cultural Exchange Activities"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 bg-[#F5821F] hover:bg-[#d97706] text-white"
                onClick={() => addCustomMutation.mutate(customTitle)}
                disabled={!customTitle.trim() || addCustomMutation.isPending}>
                Add Section
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddCustom(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
