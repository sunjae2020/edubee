import { db } from "@workspace/db";
import {
  contracts,
  applications,
  applicationParticipants,
  packages,
  packageGroups,
  instituteMgt,
  hotelMgt,
  pickupMgt,
  tourMgt,
  users,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

export interface SectionData {
  sectionType: string;
  sectionTitle: string;
  displayOrder: number;
  content: Record<string, unknown>;
}

const DEFAULT_TITLES: Record<string, string> = {
  student_profile: "Student Profile",
  pickup_schedule: "Pickup & Transportation",
  accommodation: "Accommodation",
  academic: "Academic Program",
  tour: "Tours & Activities",
  summary: "Program Summary",
};

function calculateAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function daysBetween(start: string | null | undefined, end: string | null | undefined): number | null {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
}

export async function autoPopulateSections(contractId: string): Promise<SectionData[]> {
  const sections: SectionData[] = [];

  // ── 1. student_profile ───────────────────────────────────────────
  try {
    const contractRow = await db
      .select({
        id: contracts.id,
        startDate: contracts.startDate,
        endDate: contracts.endDate,
        applicationId: contracts.applicationId,
        campProviderId: contracts.campProviderId,
        packageGroupName: contracts.packageGroupName,
        packageName: contracts.packageName,
      })
      .from(contracts)
      .where(eq(contracts.id, contractId))
      .limit(1);

    const c = contractRow[0];

    if (c?.applicationId) {
      const appRow = await db
        .select()
        .from(applications)
        .where(eq(applications.id, c.applicationId))
        .limit(1);
      const app = appRow[0];

      const participantRow = await db
        .select()
        .from(applicationParticipants)
        .where(
          and(
            eq(applicationParticipants.applicationId, c.applicationId),
            eq(applicationParticipants.participantType, "primary_student"),
          ),
        )
        .limit(1);
      const ap = participantRow[0] ?? null;

      let coordinatorName: string | null = null;
      let coordinatorContact: string | null = null;
      if (c.campProviderId) {
        const ccRow = await db
          .select({ fullName: users.fullName, phone: users.phone })
          .from(users)
          .where(eq(users.id, c.campProviderId))
          .limit(1);
        coordinatorName = ccRow[0]?.fullName ?? null;
        coordinatorContact = ccRow[0]?.phone ?? null;
      }

      sections.push({
        sectionType: "student_profile",
        sectionTitle: DEFAULT_TITLES.student_profile,
        displayOrder: 0,
        content: {
          fullName: ap?.fullName ?? null,
          fullNameNative: ap?.fullNameNative ?? null,
          dateOfBirth: ap?.dateOfBirth ?? null,
          age: calculateAge(ap?.dateOfBirth),
          gender: ap?.gender ?? null,
          nationality: ap?.nationality ?? null,
          passportNumber: ap?.passportNumber ?? null,
          passportExpiry: ap?.passportExpiry ?? null,
          grade: ap?.grade ?? null,
          schoolName: ap?.schoolName ?? null,
          englishLevel: ap?.englishLevel ?? null,
          medicalConditions: ap?.medicalConditions ?? null,
          dietaryRequirements: ap?.dietaryRequirements ?? null,
          specialNeeds: ap?.specialNeeds ?? null,
          emergencyPhone: ap?.phone ?? null,
          whatsapp: ap?.whatsapp ?? null,
          lineId: ap?.lineId ?? null,
          programName: c.packageGroupName ?? null,
          packageName: c.packageName ?? null,
          startDate: c.startDate ?? null,
          endDate: c.endDate ?? null,
          totalDays: daysBetween(c.startDate, c.endDate),
          campLocation: null,
          coordinatorName,
          coordinatorContact,
        },
      });
    } else {
      sections.push({
        sectionType: "student_profile",
        sectionTitle: DEFAULT_TITLES.student_profile,
        displayOrder: 0,
        content: {},
      });
    }
  } catch {
    sections.push({
      sectionType: "student_profile",
      sectionTitle: DEFAULT_TITLES.student_profile,
      displayOrder: 0,
      content: {},
    });
  }

  // ── 2. pickup_schedule ───────────────────────────────────────────
  try {
    const pickupRows = await db
      .select()
      .from(pickupMgt)
      .where(eq(pickupMgt.contractId, contractId));

    sections.push({
      sectionType: "pickup_schedule",
      sectionTitle: DEFAULT_TITLES.pickup_schedule,
      displayOrder: 1,
      content: {
        pickups: pickupRows.map((p) => ({
          pickupType: p.pickupType,
          fromLocation: p.fromLocation,
          toLocation: p.toLocation,
          pickupDatetime: p.pickupDatetime,
          vehicleInfo: p.vehicleInfo,
          driverNotes: p.driverNotes,
          status: p.status,
        })),
      },
    });
  } catch {
    sections.push({
      sectionType: "pickup_schedule",
      sectionTitle: DEFAULT_TITLES.pickup_schedule,
      displayOrder: 1,
      content: { pickups: [] },
    });
  }

  // ── 3. accommodation ─────────────────────────────────────────────
  try {
    const hotelRows = await db
      .select({
        h: hotelMgt,
        hotelName: users.fullName,
      })
      .from(hotelMgt)
      .leftJoin(users, eq(users.id, hotelMgt.hotelId))
      .where(eq(hotelMgt.contractId, contractId))
      .limit(1);

    const h = hotelRows[0];
    sections.push({
      sectionType: "accommodation",
      sectionTitle: DEFAULT_TITLES.accommodation,
      displayOrder: 2,
      content: h
        ? {
            hotelName: h.hotelName,
            roomType: h.h.roomType,
            checkinDate: h.h.checkinDate,
            checkinTime: h.h.checkinTime,
            checkoutDate: h.h.checkoutDate,
            checkoutTime: h.h.checkoutTime,
            confirmationNo: h.h.confirmationNo,
            guestNotes: h.h.guestNotes,
            status: h.h.status,
          }
        : {},
    });
  } catch {
    sections.push({
      sectionType: "accommodation",
      sectionTitle: DEFAULT_TITLES.accommodation,
      displayOrder: 2,
      content: {},
    });
  }

  // ── 4. academic ──────────────────────────────────────────────────
  try {
    const instRows = await db
      .select({
        im: instituteMgt,
        instituteName: users.fullName,
      })
      .from(instituteMgt)
      .leftJoin(users, eq(users.id, instituteMgt.instituteId))
      .where(eq(instituteMgt.contractId, contractId))
      .limit(1);

    const im = instRows[0];
    sections.push({
      sectionType: "academic",
      sectionTitle: DEFAULT_TITLES.academic,
      displayOrder: 3,
      content: im
        ? {
            instituteName: im.instituteName,
            programDetails: im.im.programDetails,
            startDate: im.im.startDate,
            endDate: im.im.endDate,
            totalHours: im.im.totalHours,
            englishLevelStart: im.im.englishLevelStart,
            englishLevelEnd: im.im.englishLevelEnd,
            schedule: im.im.schedule ?? [],
            teacherComments: im.im.teacherComments,
            progressNotes: im.im.progressNotes,
            status: im.im.status,
          }
        : { schedule: [] },
    });
  } catch {
    sections.push({
      sectionType: "academic",
      sectionTitle: DEFAULT_TITLES.academic,
      displayOrder: 3,
      content: { schedule: [] },
    });
  }

  // ── 5. tour ──────────────────────────────────────────────────────
  try {
    const tourRows = await db
      .select({
        tm: tourMgt,
        tourCompanyName: users.fullName,
      })
      .from(tourMgt)
      .leftJoin(users, eq(users.id, tourMgt.tourCompanyId))
      .where(eq(tourMgt.contractId, contractId));

    sections.push({
      sectionType: "tour",
      sectionTitle: DEFAULT_TITLES.tour,
      displayOrder: 4,
      content: {
        tours: tourRows.map((t) => ({
          tourName: t.tm.tourName,
          tourDate: t.tm.tourDate,
          startTime: t.tm.startTime,
          endTime: t.tm.endTime,
          meetingPoint: t.tm.meetingPoint,
          highlights: t.tm.highlights,
          guideInfo: t.tm.guideInfo,
          tourNotes: t.tm.tourNotes,
          status: t.tm.status,
          tourCompanyName: t.tourCompanyName,
        })),
      },
    });
  } catch {
    sections.push({
      sectionType: "tour",
      sectionTitle: DEFAULT_TITLES.tour,
      displayOrder: 4,
      content: { tours: [] },
    });
  }

  // ── 6. summary ───────────────────────────────────────────────────
  sections.push({
    sectionType: "summary",
    sectionTitle: DEFAULT_TITLES.summary,
    displayOrder: 5,
    content: {
      overallNotes: "",
      achievements: [],
      recommendations: "",
      closingMessage:
        "Thank you for choosing Edubee Camp. We look forward to supporting your educational journey.",
    },
  });

  return sections;
}
