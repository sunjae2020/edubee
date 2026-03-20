import { useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EdubeeLogo } from "@/components/shared/EdubeeLogo";
import { ReportSymbol } from "@/components/shared/ReportSymbol";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { ReportStatusBadge } from "@/components/shared/ReportStatusBadge";
import { ChevronLeft } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Report {
  id: string;
  reportTitle?: string | null;
  status?: string | null;
  publishedAt?: string | null;
  contractId?: string | null;
  summaryNotes?: string | null;
  sections?: Section[];
}

interface Section {
  id: string;
  sectionType: string;
  sectionTitle: string;
  displayOrder: number;
  isVisible: boolean;
  content: Record<string, unknown>;
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d as string).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Shared sub-components ─────────────────────────────────────────
function InfoRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex border-b border-[#F4F3F1] py-2">
      <span className="w-[38%] text-xs text-[#57534E] shrink-0">{label}</span>
      <span className={`text-xs ${highlight ? "text-[#F5821F] font-semibold" : "text-[#1C1917]"}`}>{value || "—"}</span>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    completed: { bg: "#DCFCE7", color: "#16A34A" },
    confirmed: { bg: "#FEF0E3", color: "#F5821F" },
    pending:   { bg: "#FEF9C3", color: "#CA8A04" },
    cancelled: { bg: "#F4F3F1", color: "#57534E" },
    checked_in:  { bg: "#DBEAFE", color: "#2563EB" },
    checked_out: { bg: "#DCFCE7", color: "#16A34A" },
  };
  const cfg = map[status?.toLowerCase()] ?? { bg: "#F4F3F1", color: "#57534E" };
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.color }}>
      {status || "—"}
    </span>
  );
}

// ── Section Viewers ────────────────────────────────────────────────
function StudentProfileViewer({ section, role }: { section: Section; role: string }) {
  const c = section.content;
  const canSeePassport = ["super_admin", "admin", "camp_coordinator"].includes(role);
  const dob = c.dateOfBirth as string | null;
  const dobStr = dob ? `${fmtDate(dob)} (Age: ${c.age ?? Math.floor((Date.now() - new Date(dob).getTime()) / 31536000000)})` : "—";

  return (
    <div>
      <SectionHeader symbol="student" number="01" title="Student Profile" variant="viewer" className="mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <InfoRow label="Full Name (EN)" value={(c.fullName as string) ?? ""} />
          <InfoRow label="Full Name (Native)" value={(c.fullNameNative as string) ?? ""} />
          <InfoRow label="Date of Birth" value={dobStr} />
          <InfoRow label="Gender" value={(c.gender as string) ?? ""} />
          <InfoRow label="Nationality" value={(c.nationality as string) ?? ""} />
          <InfoRow label="Grade / Year" value={(c.grade as string) ?? ""} />
          <InfoRow label="School" value={(c.schoolName as string) ?? ""} />
          <InfoRow label="English Level" value={(c.englishLevel as string) ?? ""} />
        </div>
        <div>
          <InfoRow label="Passport No." value={canSeePassport ? ((c.passportNumber as string) ?? "") : "— (Hidden)"} />
          <InfoRow label="Passport Expiry" value={canSeePassport ? fmtDate(c.passportExpiry as string) : "— (Hidden)"} />
          <InfoRow label="Emergency Phone" value={(c.emergencyPhone as string) ?? ""} />
          <InfoRow label="WhatsApp" value={(c.whatsapp as string) ?? ""} />
          <InfoRow label="LINE ID" value={(c.lineId as string) ?? ""} />
          <InfoRow label="Dietary" value={(c.dietaryRequirements as string) ?? ""} />
          <InfoRow label="Medical Notes" value={(c.medicalConditions as string) ?? ""} />
        </div>
      </div>
      {/* Program Summary */}
      <div className="mt-4 bg-[#FEF0E3] border border-[#F5821F]/30 rounded-xl p-4">
        <p className="text-xs font-semibold text-[#F5821F] mb-3">Program Details</p>
        <div className="grid grid-cols-2 gap-1">
          <InfoRow label="Program" value={(c.programName as string) ?? ""} />
          <InfoRow label="Package" value={(c.packageName as string) ?? ""} />
          <InfoRow label="Duration" value={c.startDate ? `${fmtDate(c.startDate as string)} ~ ${fmtDate(c.endDate as string)}` : "—"} />
          <InfoRow label="Location" value={(c.campLocation as string) ?? ""} />
          <InfoRow label="Days" value={c.totalDays ? `${c.totalDays} days` : "—"} />
        </div>
      </div>
    </div>
  );
}

function PickupViewer({ section }: { section: Section }) {
  const pickups = (section.content.pickups as Record<string, unknown>[]) ?? [];

  return (
    <div>
      <SectionHeader symbol="pickup" number="02" title="Pickup & Transportation" variant="viewer" className="mb-4" />
      {pickups.length === 0 ? (
        <div className="flex flex-col items-center py-10 gap-2 text-[#A8A29E]">
          <ReportSymbol name="pickup" size={40} color="#E8E6E2" />
          <p className="text-sm italic">No pickup service recorded for this program.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#E8E6E2]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#FAFAF9] border-b border-[#E8E6E2]">
                {["Type", "Date & Time", "From", "To", "Vehicle", "Status"].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-[#57534E] font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pickups.map((p, i) => (
                <tr key={i} className={`border-b border-[#F4F3F1] ${i % 2 === 1 ? "bg-[#FAFAF9]" : ""}`}>
                  <td className="px-3 py-2 text-[#1C1917]">{((p.pickupType as string) ?? "").replace(/_/g, " ")}</td>
                  <td className="px-3 py-2 text-[#1C1917]">{(p.pickupDatetime as string) ? new Date(p.pickupDatetime as string).toLocaleString("en-AU", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "—"}</td>
                  <td className="px-3 py-2 text-[#1C1917]">{(p.fromLocation as string) || "—"}</td>
                  <td className="px-3 py-2 text-[#1C1917]">{(p.toLocation as string) || "—"}</td>
                  <td className="px-3 py-2 text-[#1C1917]">{(p.vehicleInfo as string) || "—"}</td>
                  <td className="px-3 py-2"><StatusChip status={(p.status as string) || "pending"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AccommodationViewer({ section }: { section: Section }) {
  const c = section.content;
  const hasData = !!(c.hotelName || c.checkinDate);

  return (
    <div>
      <SectionHeader symbol="accommodation" number="03" title="Accommodation" variant="viewer" className="mb-4" />
      {!hasData ? (
        <div className="flex flex-col items-center py-10 gap-2 text-[#A8A29E]">
          <ReportSymbol name="accommodation" size={40} color="#E8E6E2" />
          <p className="text-sm italic">No accommodation service recorded.</p>
        </div>
      ) : (
        <>
          <div className="border border-[#E8E6E2] rounded-xl p-4 space-y-0">
            <InfoRow label="Hotel Name" value={(c.hotelName as string) ?? ""} />
            <InfoRow label="Room Type" value={(c.roomType as string) ?? ""} />
            <InfoRow label="Check-in" value={c.checkinDate ? `${fmtDate(c.checkinDate as string)} ${(c.checkinTime as string) ?? ""}`.trim() : "—"} />
            <InfoRow label="Check-out" value={c.checkoutDate ? `${fmtDate(c.checkoutDate as string)} ${(c.checkoutTime as string) ?? ""}`.trim() : "—"} />
            <InfoRow label="Confirmation #" value={(c.confirmationNo as string) ?? ""} />
            <div className="flex border-b border-[#F4F3F1] py-2">
              <span className="w-[38%] text-xs text-[#57534E] shrink-0">Status</span>
              <StatusChip status={(c.status as string) || "pending"} />
            </div>
          </div>
          {c.guestNotes && (
            <div className="mt-3 bg-[#FAFAF9] border-l-[3px] border-[#E8E6E2] pl-3 py-2 rounded-r-lg">
              <p className="text-xs font-semibold text-[#57534E] mb-1">Guest Notes</p>
              <p className="text-xs text-[#1C1917]">{c.guestNotes as string}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const LEVEL_PCTS: Record<string, number> = {
  Beginner: 10, Elementary: 22, "Pre-Intermediate": 38, Intermediate: 52,
  "Upper-Intermediate": 70, Advanced: 90, A1: 10, A2: 22, B1: 52, B2: 70, C1: 90, C2: 100,
};

function AcademicViewer({ section }: { section: Section }) {
  const c = section.content;
  const schedule = (c.schedule as Record<string, unknown>[]) ?? [];
  const startLvl = c.englishLevelStart as string | null;
  const endLvl = c.englishLevelEnd as string | null;
  const pct = LEVEL_PCTS[endLvl ?? startLvl ?? ""] ?? 30;

  return (
    <div>
      <SectionHeader symbol="academic" number="04" title="Academic Program" variant="viewer" className="mb-4" />

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Institute", value: (c.instituteName as string) || "—" },
          { label: "Period", value: c.startDate ? `${fmtDate(c.startDate as string)} ~ ${fmtDate(c.endDate as string)}` : "—" },
          { label: "Hours", value: c.totalHours ? `${c.totalHours} hrs` : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#FAFAF9] border border-[#E8E6E2] rounded-xl p-3">
            <p className="text-[10px] text-[#57534E] mb-1">{label}</p>
            <p className="text-sm font-bold text-[#1C1917]">{value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {(startLvl || endLvl) && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-[#1C1917] mb-2">English Level Progress</p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#57534E] w-24">{startLvl || "—"}</span>
            <div className="flex-1 bg-[#E8E6E2] h-2 rounded-full overflow-hidden">
              <div
                className="h-2 bg-[#F5821F] rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-[#F5821F] font-bold w-24 text-right">{endLvl || startLvl || "—"}</span>
          </div>
        </div>
      )}

      {/* Schedule table */}
      {schedule.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-[#1C1917] mb-2">Class Schedule</p>
          <div className="overflow-x-auto rounded-lg border border-[#E8E6E2]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#FAFAF9] border-b border-[#E8E6E2]">
                  {["Date", "Day", "Start", "End", "Subject", "Teacher", "Room"].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-[#57534E] font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schedule.map((row, i) => (
                  <tr key={i} className={`border-b border-[#F4F3F1] ${i % 2 === 1 ? "bg-[#FAFAF9]" : ""}`}>
                    <td className="px-3 py-2">{fmtDate(row.date as string)}</td>
                    <td className="px-3 py-2 text-[#57534E]">{(row.day as string) || "—"}</td>
                    <td className="px-3 py-2">{(row.startTime as string) || "—"}</td>
                    <td className="px-3 py-2">{(row.endTime as string) || "—"}</td>
                    <td className="px-3 py-2 font-medium">{(row.subject as string) || "—"}</td>
                    <td className="px-3 py-2">{(row.teacher as string) || "—"}</td>
                    <td className="px-3 py-2">{(row.room as string) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {c.teacherComments && (
        <div className="bg-[#FEF0E3] border-l-[3px] border-[#F5821F] pl-3 py-2 rounded-r-lg mb-3">
          <p className="text-xs font-semibold text-[#F5821F] mb-1">Teacher's Comments</p>
          <p className="text-xs text-[#1C1917]">{c.teacherComments as string}</p>
        </div>
      )}
      {c.progressNotes && (
        <div className="bg-[#FAFAF9] border-l-[3px] border-[#E8E6E2] pl-3 py-2 rounded-r-lg">
          <p className="text-xs font-semibold text-[#57534E] mb-1">Progress Notes</p>
          <p className="text-xs text-[#1C1917]">{c.progressNotes as string}</p>
        </div>
      )}
    </div>
  );
}

function TourViewer({ section }: { section: Section }) {
  const tours = (section.content.tours as Record<string, unknown>[]) ?? [];

  return (
    <div>
      <SectionHeader symbol="tour" number="05" title="Tours & Activities" variant="viewer" className="mb-4" />
      {tours.length === 0 ? (
        <div className="flex flex-col items-center py-10 gap-2 text-[#A8A29E]">
          <ReportSymbol name="tour" size={40} color="#E8E6E2" />
          <p className="text-sm italic">No tour activities recorded.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tours.map((t, i) => (
            <div key={i} className="border border-[#E8E6E2] rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-sm font-bold text-[#1C1917]">{(t.tourName as string) || "Tour"}</p>
                <StatusChip status={(t.status as string) || "pending"} />
              </div>
              <div className="flex gap-4 text-xs text-[#57534E] mb-3">
                {t.tourDate && <span>Date: {fmtDate(t.tourDate as string)}</span>}
                {(t.startTime || t.endTime) && <span>Time: {(t.startTime as string) || "—"} ~ {(t.endTime as string) || "—"}</span>}
              </div>
              <InfoRow label="Meeting Point" value={(t.meetingPoint as string) ?? ""} />
              <InfoRow label="Guide" value={(t.guideInfo as string) ?? ""} />
              {Array.isArray(t.highlights) && (t.highlights as string[]).length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-[#57534E] mb-1.5">Highlights</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(t.highlights as string[]).map((h, j) => (
                      <span key={j} className="bg-[#FEF0E3] text-[#F5821F] text-xs px-2.5 py-0.5 rounded-full">{h}</span>
                    ))}
                  </div>
                </div>
              )}
              {t.tourNotes && <p className="mt-3 text-xs text-[#57534E] italic">{t.tourNotes as string}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryViewer({ section }: { section: Section }) {
  const c = section.content;
  const achievements = (c.achievements as string[]) ?? [];

  return (
    <div>
      <SectionHeader symbol="summary" number="06" title="Program Summary" variant="viewer" className="mb-4" />

      {/* Overall Assessment */}
      <div className="bg-[#FEF0E3] border border-[#F5821F]/30 rounded-xl p-5 mb-4">
        <p className="text-sm font-bold text-[#F5821F] mb-3">Overall Assessment</p>
        <p className="text-sm text-[#1C1917] leading-relaxed">{(c.overallNotes as string) || "—"}</p>
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-[#1C1917] mb-2">Achievements</p>
          <div className="space-y-1.5">
            {achievements.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#F5821F] rounded-sm shrink-0" />
                <span className="text-sm text-[#1C1917]">{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {c.recommendations && (
        <div className="bg-[#FAFAF9] border-l-[3px] border-[#E8E6E2] pl-4 py-3 rounded-r-lg mb-4">
          <p className="text-xs font-semibold text-[#57534E] mb-1">Recommendations</p>
          <p className="text-sm text-[#1C1917]">{c.recommendations as string}</p>
        </div>
      )}

      {/* Closing message */}
      {c.closingMessage && (
        <p className="text-sm text-[#57534E] text-center italic mt-4">{c.closingMessage as string}</p>
      )}
    </div>
  );
}

function CustomViewer({ section, sectionNumber }: { section: Section; sectionNumber: number }) {
  const c = section.content;
  const num = String(sectionNumber).padStart(2, "0");
  const contentType = (c.contentType as string) ?? "text";
  const items = (c.items as string[]) ?? [];
  const tableData = c.table as { headers: string[]; rows: string[][] } | undefined;

  return (
    <div>
      <SectionHeader symbol="custom" number={`0${num}`} title={section.sectionTitle} variant="viewer" className="mb-4" />
      {contentType === "text" && c.text && <p className="text-sm text-[#1C1917] leading-relaxed">{c.text as string}</p>}
      {contentType === "bullet_list" && items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-[#1C1917]">
              <div className="w-1.5 h-1.5 bg-[#57534E] rounded-full shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      )}
      {contentType === "table" && tableData && (
        <div className="overflow-x-auto rounded-lg border border-[#E8E6E2]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#FAFAF9] border-b border-[#E8E6E2]">
                {tableData.headers.map(h => <th key={h} className="text-left px-3 py-2 text-[#57534E] font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {tableData.rows.map((row, i) => (
                <tr key={i} className={`border-b border-[#F4F3F1] ${i % 2 === 1 ? "bg-[#FAFAF9]" : ""}`}>
                  {row.map((cell, j) => <td key={j} className="px-3 py-2 text-[#1C1917]">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {contentType === "note" && c.note && (
        <div className="bg-[#FAFAF9] border-l-[3px] border-[#E8E6E2] pl-4 py-3 rounded-r-lg">
          <p className="text-sm text-[#1C1917]">{c.note as string}</p>
        </div>
      )}
    </div>
  );
}

function renderSectionViewer(section: Section, role: string, customIdx: number) {
  switch (section.sectionType) {
    case "student_profile": return <StudentProfileViewer key={section.id} section={section} role={role} />;
    case "pickup_schedule": return <PickupViewer key={section.id} section={section} />;
    case "accommodation":   return <AccommodationViewer key={section.id} section={section} />;
    case "academic":        return <AcademicViewer key={section.id} section={section} />;
    case "tour":            return <TourViewer key={section.id} section={section} />;
    case "summary":         return <SummaryViewer key={section.id} section={section} />;
    case "custom":          return <CustomViewer key={section.id} section={section} sectionNumber={customIdx} />;
    default:                return null;
  }
}

// ── Viewer Loading Skeleton ───────────────────────────────────────
function ViewerLoadingSkeleton() {
  return (
    <div className="bg-[#FAFAF9] min-h-screen pb-24">
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E6E2] px-6 py-2 flex items-center gap-2">
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="max-w-[860px] mx-auto mt-8 px-4">
        <div className="bg-white border border-[#E8E6E2] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="bg-[#FEF0E3] px-14 py-12 flex flex-col items-center gap-4" style={{ minHeight: 300 }}>
            <Skeleton className="h-12 w-32 bg-[#F5821F]/20" />
            <Skeleton className="h-8 w-64 bg-[#F5821F]/15" />
            <Skeleton className="h-5 w-48 bg-[#F5821F]/10" />
            <div className="flex gap-8 mt-4">
              {[0,1,2,3].map(i => <Skeleton key={i} className="h-10 w-20 bg-[#F5821F]/10" />)}
            </div>
          </div>
          <div className="px-14 py-10 space-y-10">
            {[0,1,2].map(i => (
              <div key={i} className="border-t border-[#F4F3F1] pt-8 first:border-t-0 first:pt-0 space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Error States ──────────────────────────────────────────────────
function ForbiddenCard({ navigate }: { navigate: (path: string) => void }) {
  return (
    <div className="bg-[#FAFAF9] min-h-screen flex items-center justify-center">
      <div className="bg-white border border-[#E8E6E2] rounded-2xl p-10 max-w-sm text-center shadow-sm space-y-4">
        <ReportSymbol name="report" size={48} color="#E8E6E2" />
        <h2 className="text-lg font-bold text-[#1C1917]">Report Not Available</h2>
        <p className="text-sm text-[#57534E]">This report has not been published yet or you do not have access.</p>
        <Button className="bg-[#F5821F] hover:bg-[#d97706] text-white" onClick={() => navigate("/admin/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}

function NotFoundCard({ navigate, role }: { navigate: (path: string) => void; role: string }) {
  const isParent = role === "parent_client";
  return (
    <div className="bg-[#FAFAF9] min-h-screen flex items-center justify-center">
      <div className="bg-white border border-[#E8E6E2] rounded-2xl p-10 max-w-sm text-center shadow-sm space-y-4">
        <ReportSymbol name="report" size={48} color="#E8E6E2" />
        <h2 className="text-lg font-bold text-[#1C1917]">Report Not Found</h2>
        <p className="text-sm text-[#57534E]">The requested report could not be found.</p>
        <Button className="bg-[#F5821F] hover:bg-[#d97706] text-white" onClick={() => navigate(isParent ? "/admin/my-programs" : "/admin/reports")}>
          {isParent ? "Back to My Programs" : "Back to Reports"}
        </Button>
      </div>
    </div>
  );
}

// ── Main Viewer Page ──────────────────────────────────────────────
export default function ReportViewerPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const role = user?.role ?? "";
  const canEdit = ["super_admin", "admin", "camp_coordinator"].includes(role);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);

  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ["report", id],
    queryFn: () => axios.get(`${BASE}/api/reports/${id}`).then(r => r.data),
    retry: false,
  });
  const report: Report | null = reportData ?? null;
  const httpStatus = (error as any)?.response?.status;

  const publishMutation = useMutation({
    mutationFn: () => axios.patch(`${BASE}/api/reports/${id}/publish`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["report", id] }); toast({ title: "Report published!" }); },
  });

  const downloadPdf = useCallback(async () => {
    setPdfLoading(true);
    setPdfProgress(0);
    // Start progress animation for long PDFs
    const progressInterval = setInterval(() => {
      setPdfProgress(prev => Math.min(prev + 8, 85));
    }, 250);
    try {
      const token = localStorage.getItem("edubee_token") || "";
      const resp = await fetch(`${BASE}/api/reports/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (report?.reportTitle ?? "Report").replace(/[^a-zA-Z0-9]/g, "_");
      a.download = `EdubeeCamp_Report_${safeName}_${new Date().getFullYear()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setPdfProgress(100);
      toast({ title: "PDF downloaded", description: a.download });
    } catch (err: any) {
      toast({ title: "PDF generation failed. Please try again.", variant: "destructive", duration: 4000 } as any);
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => { setPdfLoading(false); setPdfProgress(0); }, 600);
    }
  }, [id, report?.reportTitle, toast]);

  if (isLoading) return <ViewerLoadingSkeleton />;
  if (httpStatus === 403) return <ForbiddenCard navigate={navigate} />;
  if (httpStatus === 404 || !report) return <NotFoundCard navigate={navigate} role={role} />;

  const sp = (report.sections?.find(s => s.sectionType === "student_profile")?.content ?? {}) as Record<string, unknown>;
  const studentName = (sp.fullName as string) || report.reportTitle || "Student";
  const programName = (sp.programName as string) || "";
  const startDate = sp.startDate ? new Date(sp.startDate as string).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }) : "";
  const endDate = sp.endDate ? new Date(sp.endDate as string).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }) : "";

  const visibleSections = [...(report.sections ?? [])]
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .filter(s => s.isVisible !== false);

  let customCount = 6;

  return (
    <div className="bg-[#FAFAF9] min-h-screen pb-24">
      {/* Back nav */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E6E2] px-6 py-2 flex items-center gap-2">
        <button className="flex items-center gap-1 text-xs text-[#57534E] hover:text-[#1C1917]" onClick={() => navigate("/admin/reports")}>
          <ChevronLeft className="w-3.5 h-3.5" /> All Reports
        </button>
        <span className="text-[#E8E6E2]">/</span>
        <span className="text-xs text-[#1C1917] font-medium truncate max-w-xs">{report.reportTitle}</span>
        <div className="ml-2"><ReportStatusBadge status={(report.status ?? "draft") as "draft" | "published"} /></div>
      </div>

      {/* Report Card */}
      <div className="max-w-[860px] mx-auto mt-8 px-4">
        <div className="bg-white border border-[#E8E6E2] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] overflow-hidden">

          {/* Cover Area */}
          <div className="bg-[#FEF0E3] border-b-[3px] border-[#F5821F] px-14 py-12 text-center">
            <div className="flex justify-center mb-6">
              <EdubeeLogo variant="full" size="lg" />
            </div>
            <h1 className="text-3xl font-bold text-[#1C1917]">{studentName}</h1>
            {programName && <p className="text-base text-[#57534E] mt-2">{programName}</p>}
            {(startDate || endDate) && (
              <p className="text-sm text-[#57534E] mt-1">{startDate} — {endDate}</p>
            )}
            <div className="flex justify-center gap-8 mt-6">
              {[
                { label: "Location", value: (sp.campLocation as string) || "—" },
                { label: "Package", value: (sp.packageName as string) || "—" },
                { label: "Duration", value: sp.totalDays ? `${sp.totalDays} days` : "—" },
                { label: "Coordinator", value: (sp.coordinatorName as string) || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-[10px] text-[#A8A29E] uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-semibold text-[#1C1917] mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sections */}
          <div className="px-14 py-10 space-y-8">
            {visibleSections.map(section => {
              if (section.sectionType === "custom") customCount++;
              return (
                <div key={section.id} className="border-t border-[#F4F3F1] pt-8 first:border-t-0 first:pt-0">
                  {renderSectionViewer(section, role, customCount)}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PDF Progress Modal */}
      {pdfLoading && pdfProgress > 0 && pdfProgress < 100 && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-xs w-full mx-4 text-center space-y-4">
            <ReportSymbol name="pdf" size={36} color="#F5821F" />
            <p className="text-sm font-semibold text-[#1C1917]">Generating your PDF report…</p>
            <div className="w-full bg-[#F4F3F1] rounded-full h-2 overflow-hidden">
              <div
                className="h-2 bg-[#F5821F] rounded-full transition-all duration-300"
                style={{ width: `${pdfProgress}%` }}
              />
            </div>
            <p className="text-xs text-[#A8A29E]">Please wait a moment</p>
          </div>
        </div>
      )}

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E6E2] px-6 py-3 flex items-center justify-between shadow-[0_-4px_16px_rgba(0,0,0,0.06)] z-20">
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/admin/reports/${id}/edit`)}>
              <ReportSymbol name="edit" size={15} />
              Edit Report
            </Button>
          )}
          {canEdit && report.status === "draft" && (
            <Button size="sm" className="bg-[#16A34A] hover:bg-[#15803D] text-white gap-1.5"
              onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
              <ReportSymbol name="publish" size={15} color="white" />
              {publishMutation.isPending ? "Publishing…" : "Publish"}
            </Button>
          )}
        </div>
        <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5"
          onClick={downloadPdf} disabled={pdfLoading}>
          <ReportSymbol name="pdf" size={15} color="white" />
          {pdfLoading ? "Generating PDF…" : "Download PDF"}
        </Button>
      </div>
    </div>
  );
}
