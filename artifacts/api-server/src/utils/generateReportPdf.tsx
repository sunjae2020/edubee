import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Svg,
  Circle,
  Path,
  Ellipse,
  Line,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ProgramReport, ReportSection } from "@workspace/db/schema";

// ── Design Tokens ─────────────────────────────────────────────────
const C = {
  orange:      "#F5821F",
  orangeLight: "#FEF0E3",
  orangeDark:  "#D96A0A",
  textDark:    "#1C1917",
  textMuted:   "#57534E",
  textFaint:   "#A8A29E",
  border:      "#E8E6E2",
  surface:     "#FAFAF9",
  success:     "#16A34A",
  successBg:   "#DCFCE7",
  warning:     "#CA8A04",
  warningBg:   "#FEF9C3",
  white:       "#FFFFFF",
  faint:       "#F4F3F1",
};

// ── Helpers ────────────────────────────────────────────────────────
function fmtDate(val: string | null | undefined): string {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleDateString("en-AU", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return val; }
}

function fmtDatetime(val: Date | string | null | undefined): string {
  if (!val) return "—";
  try {
    return new Date(val as string).toLocaleString("en-AU", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  } catch { return String(val); }
}

function fmtPickupType(t: string | null | undefined): string {
  if (!t) return "—";
  return t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function todayFormatted(): string {
  return new Date().toLocaleDateString("en-AU", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

const LEVEL_MAP: Record<string, number> = {
  A1: 10, A2: 20, B1: 40, B2: 60, C1: 80, C2: 100,
  Beginner: 10, Elementary: 20, Intermediate: 50, Advanced: 80,
};

function levelWidth(level: string | null | undefined): string {
  const pct = LEVEL_MAP[level ?? ""] ?? 30;
  return `${pct}%`;
}

// ── Bee SVG Icon ──────────────────────────────────────────────────
function BeeSvg({ size = 30 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 30 30" width={size} height={size}>
      <Ellipse cx="7" cy="13" rx="5" ry="7" fill={C.orangeLight} stroke={C.orange} strokeWidth={0.8} />
      <Ellipse cx="23" cy="13" rx="5" ry="7" fill={C.orangeLight} stroke={C.orange} strokeWidth={0.8} />
      <Ellipse cx="15" cy="17" rx="7" ry="9" fill={C.orange} />
      <Path d="M 9,15 Q 15,13 21,15" stroke={C.white} strokeWidth={1.2} />
      <Path d="M 9,18 Q 15,16 21,18" stroke={C.white} strokeWidth={1.2} />
      <Path d="M 12,8 Q 10,4 9,2" stroke={C.orangeDark} strokeWidth={1} />
      <Circle cx={9} cy={2} r={1} fill={C.orangeDark} />
      <Path d="M 18,8 Q 20,4 21,2" stroke={C.orangeDark} strokeWidth={1} />
      <Circle cx={21} cy={2} r={1} fill={C.orangeDark} />
    </Svg>
  );
}

// ── PdfLogo ───────────────────────────────────────────────────────
function PdfLogo({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? 60 : size === "md" ? 40 : 30;
  const textSz = size === "lg" ? 28 : size === "md" ? 18 : 14;
  const subSz = size === "lg" ? 10 : size === "md" ? 8 : 7;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <BeeSvg size={sz} />
      <View style={{ flexDirection: "column" }}>
        <Text style={{ fontSize: textSz, fontWeight: 700, color: C.textDark, letterSpacing: -0.2 }}>edubee</Text>
        <Text style={{ fontSize: subSz, fontWeight: 500, color: C.orange, letterSpacing: 2, marginTop: 2 }}>CAMP</Text>
      </View>
    </View>
  );
}

// ── PdfHeader ─────────────────────────────────────────────────────
function PdfHeader({ title }: { title: string }) {
  return (
    <View style={{ position: "absolute", top: 16, left: 56, right: 56 }} fixed>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 8 }}>
        <PdfLogo size="sm" />
        <Text style={{ fontSize: 8, color: C.textMuted, maxWidth: 200, textAlign: "right" }}>{title}</Text>
      </View>
      <Svg height={1} width="100%">
        <Line x1="0" y1="0" x2="500" y2="0" stroke={C.orange} strokeWidth={0.8} />
      </Svg>
    </View>
  );
}

// ── PdfFooter ─────────────────────────────────────────────────────
function PdfFooter() {
  return (
    <View style={{ position: "absolute", bottom: 16, left: 56, right: 56 }} fixed>
      <Svg height={1} width="100%">
        <Line x1="0" y1="0" x2="500" y2="0" stroke={C.border} strokeWidth={0.5} />
      </Svg>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 6 }}>
        <Text style={{ fontSize: 7, color: C.textFaint }}>Generated: {todayFormatted()}</Text>
        <Text style={{ fontSize: 7, color: C.textFaint }}>CONFIDENTIAL — For authorized recipients only</Text>
      </View>
    </View>
  );
}

// ── PdfSectionHeader ──────────────────────────────────────────────
function PdfSectionHeader({ number, title, first = false }: { number: string; title: string; first?: boolean }) {
  return (
    <View style={{
      backgroundColor: C.orangeLight,
      borderLeftWidth: 4,
      borderLeftColor: C.orange,
      borderLeftStyle: "solid",
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 12,
      marginTop: first ? 0 : 20,
      flexDirection: "row",
      alignItems: "center",
    }}>
      <Text style={{ fontSize: 9, color: C.orange, fontWeight: 700 }}>{number}</Text>
      <Text style={{ fontSize: 9, color: C.orange, fontWeight: 700 }}>{"  "}</Text>
      <Text style={{ fontSize: 11, color: C.textDark, fontWeight: 700 }}>{title}</Text>
    </View>
  );
}

// ── PdfInfoRow ────────────────────────────────────────────────────
function PdfInfoRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={{
      flexDirection: "row",
      borderBottomWidth: 0.5,
      borderBottomColor: C.faint,
      borderBottomStyle: "solid",
      paddingVertical: 5,
    }}>
      <Text style={{ width: "35%", fontSize: 9, color: C.textMuted }}>{label}</Text>
      <Text style={{ width: "65%", fontSize: 9, color: highlight ? C.orange : C.textDark, fontWeight: highlight ? 700 : 400 }}>{value}</Text>
    </View>
  );
}

// ── PdfStatusBadge ────────────────────────────────────────────────
function PdfStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    completed: { bg: C.successBg, color: C.success },
    pending:   { bg: C.warningBg, color: C.warning },
    confirmed: { bg: C.orangeLight, color: C.orange },
  };
  const cfg = map[status?.toLowerCase()] ?? { bg: C.faint, color: C.textMuted };
  return (
    <View style={{ backgroundColor: cfg.bg, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start" }}>
      <Text style={{ fontSize: 7, color: cfg.color }}>{status ?? "—"}</Text>
    </View>
  );
}

// ── PdfTable ──────────────────────────────────────────────────────
function PdfTable({
  headers,
  rows,
  columnWidths,
}: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
  columnWidths?: number[];
}) {
  const widths = columnWidths ?? headers.map(() => Math.floor(100 / headers.length));

  return (
    <View style={{ width: "100%" }}>
      {/* Header row */}
      <View style={{
        flexDirection: "row",
        backgroundColor: C.surface,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
        borderBottomStyle: "solid",
      }}>
        {headers.map((h, i) => (
          <Text key={i} style={{
            width: `${widths[i]}%`,
            fontSize: 8,
            color: C.textMuted,
            fontWeight: 700,
            paddingHorizontal: 6,
            paddingVertical: 5,
          }}>{h}</Text>
        ))}
      </View>
      {/* Data rows */}
      {rows.map((row, ri) => (
        <View key={ri} style={{
          flexDirection: "row",
          backgroundColor: ri % 2 === 0 ? C.white : C.surface,
          borderBottomWidth: 0.3,
          borderBottomColor: C.faint,
          borderBottomStyle: "solid",
        }}>
          {row.map((cell, ci) => (
            <View key={ci} style={{
              width: `${widths[ci]}%`,
              paddingHorizontal: 6,
              paddingVertical: 5,
            }}>
              {typeof cell === "string"
                ? <Text style={{ fontSize: 8, color: C.textDark }}>{cell || "—"}</Text>
                : cell}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Cover Page ────────────────────────────────────────────────────
function CoverPage({
  report,
  studentName,
  studentProfile,
}: {
  report: ProgramReport & { programName?: string | null };
  studentName: string;
  studentProfile: Record<string, unknown>;
}) {
  const sp = studentProfile;
  const startDate = fmtDate(sp.startDate as string);
  const endDate = fmtDate(sp.endDate as string);
  const totalDays = sp.totalDays as number | null;

  return (
    <Page size="A4" style={{ backgroundColor: C.white, paddingHorizontal: 56, paddingVertical: 56 }}>
      {/* Centered layout */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        {/* Large logo */}
        <PdfLogo size="lg" />

        {/* Orange divider */}
        <View style={{ width: 80, height: 3, backgroundColor: C.orange, marginTop: 32, marginBottom: 32 }} />

        {/* Student name */}
        <Text style={{ fontSize: 24, fontWeight: 700, color: C.textDark, textAlign: "center" }}>
          {studentName}
        </Text>

        {/* Program name */}
        <Text style={{ fontSize: 14, color: C.textMuted, textAlign: "center", marginTop: 6 }}>
          {(report as Record<string, unknown>).programName as string ?? report.reportTitle ?? "Program Report"}
        </Text>

        {/* Dates */}
        {sp.startDate && sp.endDate && (
          <Text style={{ fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 4 }}>
            {startDate} — {endDate}{totalDays ? `  ·  ${totalDays} days` : ""}
          </Text>
        )}

        {/* Bottom orange divider */}
        <View style={{ width: 40, height: 3, backgroundColor: C.orange, marginTop: 20, marginBottom: 24 }} />

        {/* Detail grid */}
        <View style={{ flexDirection: "row", gap: 40 }}>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Text style={{ fontSize: 9, color: C.textMuted, width: 90 }}>Camp Location</Text>
              <Text style={{ fontSize: 9, color: C.textDark, fontWeight: 700 }}>{(sp.campLocation as string) || "—"}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Text style={{ fontSize: 9, color: C.textMuted, width: 90 }}>Coordinator</Text>
              <Text style={{ fontSize: 9, color: C.textDark, fontWeight: 700 }}>{(sp.coordinatorName as string) || "—"}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Text style={{ fontSize: 9, color: C.textMuted, width: 90 }}>Package</Text>
              <Text style={{ fontSize: 9, color: C.textDark, fontWeight: 700 }}>{(sp.packageName as string) || "—"}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Text style={{ fontSize: 9, color: C.textMuted, width: 90 }}>Report Date</Text>
              <Text style={{ fontSize: 9, color: C.textDark, fontWeight: 700 }}>{todayFormatted()}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom watermark */}
      <View style={{ position: "absolute", bottom: 20, left: 0, right: 0, alignItems: "center" }}>
        <Text style={{ fontSize: 7, color: C.border }}>
          EDUBEE CAMP — CONFIDENTIAL PROGRAM REPORT
        </Text>
      </View>
    </Page>
  );
}

// ── Section 1: Student Profile ────────────────────────────────────
function StudentProfileSection({
  section,
  role,
  isFirst,
  reportTitle,
}: {
  section: ReportSection;
  role: string;
  isFirst: boolean;
  reportTitle: string;
}) {
  const c = (section.content ?? {}) as Record<string, unknown>;
  const canSeePassport = ["super_admin", "admin", "camp_coordinator"].includes(role);
  const dob = c.dateOfBirth as string | null;
  const dobStr = dob ? `${fmtDate(dob)} (Age: ${c.age ?? "?"})` : "—";

  return (
    <Page size="A4" style={{ paddingTop: 72, paddingBottom: 56, paddingHorizontal: 56 }}>
      <PdfHeader title={reportTitle} />
      <PdfSectionHeader number="01" title="STUDENT PROFILE" first={isFirst} />

      {/* Two-column grid */}
      <View style={{ flexDirection: "row", gap: 20 }}>
        {/* Left column */}
        <View style={{ flex: 1 }}>
          <PdfInfoRow label="Full Name (EN)" value={(c.fullName as string) || "—"} />
          <PdfInfoRow label="Full Name (Native)" value={(c.fullNameNative as string) || "—"} />
          <PdfInfoRow label="Date of Birth" value={dobStr} />
          <PdfInfoRow label="Gender" value={(c.gender as string) || "—"} />
          <PdfInfoRow label="Nationality" value={(c.nationality as string) || "—"} />
          <PdfInfoRow label="Grade / Year" value={(c.grade as string) || "—"} />
          <PdfInfoRow label="School" value={(c.schoolName as string) || "—"} />
          <PdfInfoRow label="English Level" value={(c.englishLevel as string) || "—"} />
        </View>
        {/* Right column */}
        <View style={{ flex: 1 }}>
          <PdfInfoRow label="Passport No." value={canSeePassport ? ((c.passportNumber as string) || "—") : "— (Hidden)"} />
          <PdfInfoRow label="Passport Expiry" value={canSeePassport ? fmtDate(c.passportExpiry as string) : "— (Hidden)"} />
          <PdfInfoRow label="Emergency Phone" value={(c.emergencyPhone as string) || "—"} />
          <PdfInfoRow label="WhatsApp" value={(c.whatsapp as string) || "—"} />
          <PdfInfoRow label="LINE ID" value={(c.lineId as string) || "—"} />
          <PdfInfoRow label="Dietary" value={(c.dietaryRequirements as string) || "—"} />
          <PdfInfoRow label="Medical Notes" value={(c.medicalConditions as string) || "—"} />
        </View>
      </View>

      {/* Program Summary Box */}
      <View style={{
        marginTop: 16,
        backgroundColor: C.orangeLight,
        borderWidth: 0.5,
        borderColor: C.orange,
        borderStyle: "solid",
        borderRadius: 6,
        padding: 12,
      }}>
        <Text style={{ fontSize: 9, color: C.orange, fontWeight: 700, marginBottom: 6 }}>Program Details</Text>
        <PdfInfoRow label="Program" value={(c.programName as string) || "—"} />
        <PdfInfoRow label="Package" value={(c.packageName as string) || "—"} />
        <PdfInfoRow label="Duration" value={c.startDate ? `${fmtDate(c.startDate as string)} ~ ${fmtDate(c.endDate as string)}` : "—"} />
        <PdfInfoRow label="Location" value={(c.campLocation as string) || "—"} />
        <PdfInfoRow label="Days" value={c.totalDays ? `${c.totalDays} days` : "—"} />
      </View>

      <PdfFooter />
    </Page>
  );
}

// ── Section 2: Pickup & Transportation ────────────────────────────
function PickupSection({
  section,
  reportTitle,
}: {
  section: ReportSection;
  reportTitle: string;
}) {
  const c = (section.content ?? {}) as Record<string, unknown>;
  const pickups = (c.pickups as Record<string, unknown>[]) ?? [];

  return (
    <Page size="A4" style={{ paddingTop: 72, paddingBottom: 56, paddingHorizontal: 56 }}>
      <PdfHeader title={reportTitle} />
      <PdfSectionHeader number="02" title="PICKUP & TRANSPORTATION" />

      {pickups.length === 0 ? (
        <Text style={{ fontSize: 10, color: C.textFaint, fontStyle: "italic" }}>
          No pickup service recorded for this program.
        </Text>
      ) : (
        <PdfTable
          headers={["Type", "Date & Time", "From", "To", "Vehicle", "Status"]}
          columnWidths={[15, 22, 20, 20, 13, 10]}
          rows={pickups.map(p => [
            fmtPickupType(p.pickupType as string),
            fmtDatetime(p.pickupDatetime as string),
            (p.fromLocation as string) || "—",
            (p.toLocation as string) || "—",
            (p.vehicleInfo as string) || "—",
            <PdfStatusBadge key="s" status={p.status as string} />,
          ])}
        />
      )}

      <PdfFooter />
    </Page>
  );
}

// ── Section 3: Accommodation ──────────────────────────────────────
function AccommodationSection({
  section,
  reportTitle,
}: {
  section: ReportSection;
  reportTitle: string;
}) {
  const c = (section.content ?? {}) as Record<string, unknown>;
  const hasData = !!c.hotelName || !!c.roomType || !!c.checkinDate;

  return (
    <Page size="A4" style={{ paddingTop: 72, paddingBottom: 56, paddingHorizontal: 56 }}>
      <PdfHeader title={reportTitle} />
      <PdfSectionHeader number="03" title="ACCOMMODATION" />

      {!hasData ? (
        <Text style={{ fontSize: 10, color: C.textFaint, fontStyle: "italic" }}>
          No accommodation service recorded.
        </Text>
      ) : (
        <>
          <View style={{
            borderWidth: 0.5,
            borderColor: C.border,
            borderStyle: "solid",
            borderRadius: 6,
            padding: 12,
          }}>
            <PdfInfoRow label="Hotel Name" value={(c.hotelName as string) || "—"} />
            <PdfInfoRow label="Room Type" value={(c.roomType as string) || "—"} />
            <PdfInfoRow label="Check-in" value={c.checkinDate ? `${fmtDate(c.checkinDate as string)} ${(c.checkinTime as string) ?? ""}`.trim() : "—"} />
            <PdfInfoRow label="Check-out" value={c.checkoutDate ? `${fmtDate(c.checkoutDate as string)} ${(c.checkoutTime as string) ?? ""}`.trim() : "—"} />
            <PdfInfoRow label="Confirmation #" value={(c.confirmationNo as string) || "—"} />
            <View style={{ flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.faint, borderBottomStyle: "solid", paddingVertical: 5 }}>
              <Text style={{ width: "35%", fontSize: 9, color: C.textMuted }}>Status</Text>
              <View style={{ width: "65%" }}>
                <PdfStatusBadge status={(c.status as string) || "pending"} />
              </View>
            </View>
          </View>

          {c.guestNotes && (
            <View style={{
              backgroundColor: C.surface,
              borderLeftWidth: 3,
              borderLeftColor: C.border,
              borderLeftStyle: "solid",
              paddingHorizontal: 10,
              paddingVertical: 8,
              marginTop: 8,
            }}>
              <Text style={{ fontSize: 8, color: C.textMuted, fontWeight: 700, marginBottom: 3 }}>Guest Notes</Text>
              <Text style={{ fontSize: 9, color: C.textDark }}>{c.guestNotes as string}</Text>
            </View>
          )}
        </>
      )}

      <PdfFooter />
    </Page>
  );
}

// ── Section 4: Academic Program ───────────────────────────────────
function AcademicSection({
  section,
  reportTitle,
}: {
  section: ReportSection;
  reportTitle: string;
}) {
  const c = (section.content ?? {}) as Record<string, unknown>;
  const schedule = (c.schedule as Record<string, unknown>[]) ?? [];

  const startLvl = c.englishLevelStart as string | null;
  const endLvl = c.englishLevelEnd as string | null;

  return (
    <Page size="A4" style={{ paddingTop: 72, paddingBottom: 56, paddingHorizontal: 56 }}>
      <PdfHeader title={reportTitle} />
      <PdfSectionHeader number="04" title="ACADEMIC PROGRAM" />

      {/* Summary row */}
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
        {[
          { label: "Institute", value: (c.instituteName as string) || "—" },
          { label: "Period", value: c.startDate ? `${fmtDate(c.startDate as string)} ~ ${fmtDate(c.endDate as string)}` : "—" },
          { label: "Hours", value: c.totalHours ? `${c.totalHours} hrs` : "—" },
        ].map(({ label, value }) => (
          <View key={label} style={{
            flex: 1,
            backgroundColor: C.surface,
            borderWidth: 0.5,
            borderColor: C.border,
            borderStyle: "solid",
            borderRadius: 4,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}>
            <Text style={{ fontSize: 7, color: C.textMuted, marginBottom: 2 }}>{label}</Text>
            <Text style={{ fontSize: 10, fontWeight: 700, color: C.textDark }}>{value}</Text>
          </View>
        ))}
      </View>

      {/* English Level Progress */}
      {(startLvl || endLvl) && (
        <View style={{ marginTop: 12, marginBottom: 14 }}>
          <Text style={{ fontSize: 9, fontWeight: 700, color: C.textDark, marginBottom: 6 }}>English Level Progress</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 9, color: C.textMuted, width: 25 }}>{startLvl || "—"}</Text>
            <View style={{ flex: 1, backgroundColor: C.border, height: 4, borderRadius: 2 }}>
              <View style={{
                width: levelWidth(endLvl || startLvl),
                backgroundColor: C.orange,
                height: 4,
                borderRadius: 2,
              }} />
            </View>
            <Text style={{ fontSize: 9, color: C.orange, fontWeight: 700, width: 25 }}>{endLvl || startLvl || "—"}</Text>
          </View>
        </View>
      )}

      {/* Schedule Table */}
      {schedule.length > 0 && (
        <View style={{ marginTop: 2 }}>
          <Text style={{ fontSize: 9, fontWeight: 700, color: C.textDark, marginBottom: 6 }}>Class Schedule</Text>
          <PdfTable
            headers={["Date", "Day", "Start", "End", "Subject", "Teacher", "Room"]}
            columnWidths={[14, 10, 8, 8, 25, 20, 15]}
            rows={schedule.map(s => [
              fmtDate(s.date as string),
              (s.day as string) || "—",
              (s.startTime as string) || "—",
              (s.endTime as string) || "—",
              (s.subject as string) || "—",
              (s.teacher as string) || "—",
              (s.room as string) || "—",
            ])}
          />
        </View>
      )}

      {/* Teacher Comments */}
      {c.teacherComments && (
        <View style={{
          backgroundColor: C.orangeLight,
          borderLeftWidth: 3,
          borderLeftColor: C.orange,
          borderLeftStyle: "solid",
          paddingHorizontal: 10,
          paddingVertical: 8,
          marginTop: 12,
        }}>
          <Text style={{ fontSize: 8, color: C.orange, fontWeight: 700, marginBottom: 3 }}>Teacher's Comments</Text>
          <Text style={{ fontSize: 9, color: C.textDark }}>{c.teacherComments as string}</Text>
        </View>
      )}

      {/* Progress Notes */}
      {c.progressNotes && (
        <View style={{
          backgroundColor: C.surface,
          borderLeftWidth: 3,
          borderLeftColor: C.border,
          borderLeftStyle: "solid",
          paddingHorizontal: 10,
          paddingVertical: 8,
          marginTop: 8,
        }}>
          <Text style={{ fontSize: 8, color: C.textMuted, fontWeight: 700, marginBottom: 3 }}>Progress Notes</Text>
          <Text style={{ fontSize: 9, color: C.textDark }}>{c.progressNotes as string}</Text>
        </View>
      )}

      <PdfFooter />
    </Page>
  );
}

// ── Section 5: Tours & Activities ────────────────────────────────
function TourSection({
  section,
  reportTitle,
}: {
  section: ReportSection;
  reportTitle: string;
}) {
  const c = (section.content ?? {}) as Record<string, unknown>;
  const tours = (c.tours as Record<string, unknown>[]) ?? [];

  return (
    <Page size="A4" style={{ paddingTop: 72, paddingBottom: 56, paddingHorizontal: 56 }}>
      <PdfHeader title={reportTitle} />
      <PdfSectionHeader number="05" title="TOURS & ACTIVITIES" />

      {tours.length === 0 ? (
        <Text style={{ fontSize: 10, color: C.textFaint, fontStyle: "italic" }}>
          No tour activities recorded.
        </Text>
      ) : tours.map((t, i) => (
        <View key={i} style={{
          borderWidth: 0.5,
          borderColor: C.border,
          borderStyle: "solid",
          borderRadius: 6,
          padding: 12,
          marginBottom: 8,
        }}>
          {/* Card header */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Text style={{ fontSize: 11, fontWeight: 700, color: C.textDark, flex: 1 }}>
              {(t.tourName as string) || "Tour"}
            </Text>
            <PdfStatusBadge status={(t.status as string) || "pending"} />
          </View>

          {/* Info row */}
          <View style={{ flexDirection: "row", gap: 16, marginTop: 6 }}>
            <Text style={{ fontSize: 8, color: C.textMuted }}>
              Date: {fmtDate(t.tourDate as string)}
            </Text>
            {(t.startTime || t.endTime) && (
              <Text style={{ fontSize: 8, color: C.textMuted }}>
                Time: {(t.startTime as string) || "—"} ~ {(t.endTime as string) || "—"}
              </Text>
            )}
          </View>

          <PdfInfoRow label="Meeting Point" value={(t.meetingPoint as string) || "—"} />
          <PdfInfoRow label="Guide" value={(t.guideInfo as string) || "—"} />

          {/* Highlights */}
          {Array.isArray(t.highlights) && (t.highlights as string[]).length > 0 && (
            <View style={{ marginTop: 6 }}>
              <Text style={{ fontSize: 8, color: C.textMuted, marginBottom: 4 }}>Highlights</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                {(t.highlights as string[]).map((h, j) => (
                  <View key={j} style={{
                    backgroundColor: C.orangeLight,
                    borderRadius: 999,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}>
                    <Text style={{ fontSize: 7, color: C.orange }}>{h}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {t.tourNotes && (
            <Text style={{ fontSize: 8, color: C.textMuted, marginTop: 4 }}>{t.tourNotes as string}</Text>
          )}
        </View>
      ))}

      <PdfFooter />
    </Page>
  );
}

// ── Section 6: Program Summary ────────────────────────────────────
function SummarySection({
  section,
  reportTitle,
  coordinatorName,
  publishedAt,
}: {
  section: ReportSection;
  reportTitle: string;
  coordinatorName: string;
  publishedAt: Date | null | undefined;
}) {
  const c = (section.content ?? {}) as Record<string, unknown>;
  const achievements = (c.achievements as string[]) ?? [];

  return (
    <Page size="A4" style={{ paddingTop: 72, paddingBottom: 56, paddingHorizontal: 56 }}>
      <PdfHeader title={reportTitle} />
      <PdfSectionHeader number="06" title="PROGRAM SUMMARY" />

      {/* Overall Assessment */}
      <View style={{
        backgroundColor: C.orangeLight,
        borderWidth: 0.5,
        borderColor: C.orange,
        borderStyle: "solid",
        borderRadius: 6,
        padding: 14,
      }}>
        <Text style={{ fontSize: 10, fontWeight: 700, color: C.orange, marginBottom: 8 }}>Overall Assessment</Text>
        <Text style={{ fontSize: 10, color: C.textDark, lineHeight: 1.6 }}>
          {(c.overallNotes as string) || "—"}
        </Text>
      </View>

      {/* Achievements */}
      {achievements.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 9, fontWeight: 700, color: C.textDark, marginBottom: 4 }}>Achievements</Text>
          {achievements.map((a, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
              <View style={{ width: 6, height: 6, backgroundColor: C.orange, borderRadius: 1 }} />
              <Text style={{ fontSize: 9, color: C.textDark }}>{a}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recommendations */}
      {c.recommendations && (
        <View style={{
          backgroundColor: C.surface,
          borderLeftWidth: 3,
          borderLeftColor: C.border,
          borderLeftStyle: "solid",
          paddingHorizontal: 12,
          paddingVertical: 10,
          marginTop: 16,
        }}>
          <Text style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, marginBottom: 3 }}>Recommendations</Text>
          <Text style={{ fontSize: 9, color: C.textDark }}>{c.recommendations as string}</Text>
        </View>
      )}

      {/* Closing Message */}
      {c.closingMessage && (
        <Text style={{ fontSize: 10, color: C.textMuted, textAlign: "center", fontStyle: "italic", marginTop: 24 }}>
          {c.closingMessage as string}
        </Text>
      )}

      {/* Signature Area */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 32 }}>
        <View>
          <View style={{ width: 160, borderBottomWidth: 0.5, borderBottomColor: C.textDark, borderBottomStyle: "solid" }} />
          <Text style={{ fontSize: 8, color: C.textMuted, marginTop: 4 }}>Camp Coordinator Signature</Text>
          <Text style={{ fontSize: 9, fontWeight: 700, color: C.textDark }}>{coordinatorName || "—"}</Text>
        </View>
        <View>
          <View style={{ width: 120, borderBottomWidth: 0.5, borderBottomColor: C.textDark, borderBottomStyle: "solid" }} />
          <Text style={{ fontSize: 8, color: C.textMuted, marginTop: 4 }}>Date</Text>
          <Text style={{ fontSize: 9, color: C.textDark }}>{publishedAt ? fmtDate(publishedAt.toISOString()) : todayFormatted()}</Text>
        </View>
      </View>

      {/* Bottom Logo */}
      <View style={{ alignItems: "center", marginTop: 32 }}>
        <PdfLogo size="md" />
        <Text style={{ fontSize: 8, color: C.textFaint, textAlign: "center", marginTop: 4 }}>www.edubee.com</Text>
      </View>

      <PdfFooter />
    </Page>
  );
}

// ── Custom Section ────────────────────────────────────────────────
function CustomSection({
  section,
  sectionNumber,
  reportTitle,
}: {
  section: ReportSection;
  sectionNumber: number;
  reportTitle: string;
}) {
  const c = (section.content ?? {}) as Record<string, unknown>;
  const num = String(sectionNumber).padStart(2, "0");

  const tableData = c.table as { headers: string[]; rows: string[][] } | undefined;
  const items = c.items as string[] | undefined;

  return (
    <Page size="A4" style={{ paddingTop: 72, paddingBottom: 56, paddingHorizontal: 56 }}>
      <PdfHeader title={reportTitle} />
      <PdfSectionHeader number={num} title={(section.sectionTitle ?? "CUSTOM SECTION").toUpperCase()} />

      {c.text && (
        <Text style={{ fontSize: 10, color: C.textDark, lineHeight: 1.5, marginBottom: 12 }}>
          {c.text as string}
        </Text>
      )}

      {items && items.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          {items.map((item, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
              <View style={{ width: 4, height: 4, backgroundColor: C.textMuted, borderRadius: 999 }} />
              <Text style={{ fontSize: 9, color: C.textDark }}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      {tableData && (
        <PdfTable headers={tableData.headers} rows={tableData.rows} />
      )}

      {c.note && (
        <View style={{
          backgroundColor: C.surface,
          borderLeftWidth: 3,
          borderLeftColor: C.border,
          borderLeftStyle: "solid",
          paddingHorizontal: 10,
          paddingVertical: 8,
          marginTop: 8,
        }}>
          <Text style={{ fontSize: 9, color: C.textDark }}>{c.note as string}</Text>
        </View>
      )}

      <PdfFooter />
    </Page>
  );
}

// ── Section Router ────────────────────────────────────────────────
function renderSection(
  section: ReportSection,
  role: string,
  idx: number,
  reportTitle: string,
  coordinatorName: string,
  publishedAt: Date | null | undefined,
): React.ReactElement | null {
  const customIdx = idx + 7; // base for custom section numbers

  switch (section.sectionType) {
    case "student_profile":
      return <StudentProfileSection key={section.id} section={section} role={role} isFirst={idx === 0} reportTitle={reportTitle} />;
    case "pickup_schedule":
      return <PickupSection key={section.id} section={section} reportTitle={reportTitle} />;
    case "accommodation":
      return <AccommodationSection key={section.id} section={section} reportTitle={reportTitle} />;
    case "academic":
      return <AcademicSection key={section.id} section={section} reportTitle={reportTitle} />;
    case "tour":
      return <TourSection key={section.id} section={section} reportTitle={reportTitle} />;
    case "summary":
      return <SummarySection key={section.id} section={section} reportTitle={reportTitle} coordinatorName={coordinatorName} publishedAt={publishedAt} />;
    case "custom":
      return <CustomSection key={section.id} section={section} sectionNumber={customIdx} reportTitle={reportTitle} />;
    default:
      return null;
  }
}

// ── Main Generator ────────────────────────────────────────────────
export async function generateReportPdf(
  report: ProgramReport & { programName?: string | null; generatedByName?: string | null },
  sections: ReportSection[],
  role: string,
): Promise<Buffer> {
  // Sort + filter invisible sections
  const visibleSections = [...sections]
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .filter(s => s.isVisible !== false);

  // Get student name and profile content
  const studentProfileSection = visibleSections.find(s => s.sectionType === "student_profile");
  const sp = (studentProfileSection?.content ?? {}) as Record<string, unknown>;
  const studentName = (sp.fullName as string) || (report as Record<string, unknown>).studentName as string || "Student";

  // Get coordinator name from student_profile content or report
  const coordinatorName = (sp.coordinatorName as string) || (report.generatedByName as string) || "";

  const reportTitle = report.reportTitle ?? "Program Report";

  const doc = (
    <Document title={reportTitle} author="Edubee Camp" subject="Program Report">
      {/* Cover Page */}
      <CoverPage
        report={report}
        studentName={studentName}
        studentProfile={sp}
      />

      {/* Section Pages */}
      {visibleSections.map((section, idx) =>
        renderSection(section, role, idx, reportTitle, coordinatorName, report.publishedAt)
      )}
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  return Buffer.from(buffer);
}
