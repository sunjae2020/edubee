import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { db } from "@workspace/db";
import {
  users, leads, applications, applicationParticipants, contracts,
  contractProducts, pickupMgt, tourMgt,
  settlementMgt, exchangeRates, packageGroups, packages, products,
  enrollmentSpots, importHistory,
  // CRM
  contacts, accounts, quotes,
  // Camp
  campApplications, campTourMgt,
  // Finance
  invoices, transactions, receipts,
  contractFinanceItems, userLedger, accountLedgerEntries,
  // Services
  accommodationMgt, studyAbroadMgt, internshipMgt, guardianMgt, visaServicesMgt,
  // Accounting
  journalEntries, paymentHeaders, paymentLines, paymentStatements, productCostLines,
} from "@workspace/db/schema";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { eq, sql, and, gte, lte, count } from "drizzle-orm";
import bcrypt from "bcryptjs";

const router = Router();

router.use((req, res, next) => {
  req.setTimeout(30000);
  res.setTimeout(30000);
  next();
});

router.use(authenticate, requireRole("super_admin", "admin"));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "text/csv" && !file.originalname.endsWith(".csv")) {
      cb(new Error("Only CSV files are allowed"));
    } else {
      cb(null, true);
    }
  },
});

const BOM = "\uFEFF";
const MAX_EXPORT_ROWS = 10000;
const BATCH_SIZE = 1000;
const IMPORT_BATCH = 100;

const ALLOWED_CURRENCIES = ["KRW", "THB", "JPY", "USD", "PHP", "SGD", "GBP", "AUD"];
const VALID_ROLES = ["super_admin", "admin", "camp_coordinator", "agent", "camp_provider", "hotel", "driver", "tour_company"];
const VALID_PRODUCT_TYPES = ["institute", "hotel", "pickup", "tour", "settlement"];

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsvRow(vals: unknown[]): string {
  return vals.map(escapeCsv).join(",") + "\n";
}

function buildCsvHeader(cols: string[]): string {
  return cols.join(",") + "\n";
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ExportConfig {
  table: any;
  columns: string[];
  dbColumns: string[];
}

const EXPORT_CONFIGS: Record<string, ExportConfig> = {
  // ── Users & Access ────────────────────────────────────────────────────────
  users: {
    table: users,
    columns: ["id", "email", "role", "staff_role", "full_name", "first_name", "last_name", "english_name", "original_name", "phone", "whatsapp", "line_id", "avatar_url", "timezone", "preferred_lang", "company_name", "business_reg_no", "country_of_ops", "platform_comm_rate", "team_id", "status", "invited_at", "last_login_at", "created_at"],
    dbColumns: ["id", "email", "role", "staffRole", "fullName", "firstName", "lastName", "englishName", "originalName", "phone", "whatsapp", "lineId", "avatarUrl", "timezone", "preferredLang", "companyName", "businessRegNo", "countryOfOps", "platformCommRate", "teamId", "status", "invitedAt", "lastLoginAt", "createdAt"],
  },
  accounts: {
    table: accounts,
    columns: ["id", "name", "account_type", "account_category", "parent_account_id", "primary_contact_id", "secondary_contact_id", "phone_number", "phone_number_2", "email", "website", "address", "secondary_address", "country", "state", "city", "postal_code", "abn", "is_product_source", "is_product_provider", "found_year", "total_capacity", "description", "bank_account_type", "owner_id", "status", "portal_access", "portal_role", "portal_email", "portal_last_login_at", "portal_invited_at", "first_name", "last_name", "english_name", "original_name", "created_on", "modified_on"],
    dbColumns: ["id", "name", "accountType", "accountCategory", "parentAccountId", "primaryContactId", "secondaryContactId", "phoneNumber", "phoneNumber2", "email", "website", "address", "secondaryAddress", "country", "state", "city", "postalCode", "abn", "isProductSource", "isProductProvider", "foundYear", "totalCapacity", "description", "bankAccountType", "ownerId", "status", "portalAccess", "portalRole", "portalEmail", "portalLastLoginAt", "portalInvitedAt", "firstName", "lastName", "englishName", "originalName", "createdOn", "modifiedOn"],
  },
  contacts: {
    table: contacts,
    columns: ["id", "first_name", "last_name", "title", "dob", "gender", "nationality", "email", "mobile", "office_number", "sns_type", "sns_id", "influx_channel", "important_date_1", "important_date_2", "english_name", "original_name", "full_name", "description", "status", "account_type", "created_on", "modified_on"],
    dbColumns: ["id", "firstName", "lastName", "title", "dob", "gender", "nationality", "email", "mobile", "officeNumber", "snsType", "snsId", "influxChannel", "importantDate1", "importantDate2", "englishName", "originalName", "fullName", "description", "status", "accountType", "createdOn", "modifiedOn"],
  },
  // ── Sales ─────────────────────────────────────────────────────────────────
  leads: {
    table: leads,
    columns: ["id", "agent_id", "full_name", "email", "phone", "nationality", "source", "status", "notes", "created_at"],
    dbColumns: ["id", "agentId", "fullName", "email", "phone", "nationality", "source", "status", "notes", "createdAt"],
  },
  applications: {
    table: applications,
    columns: ["application_number", "agent_id", "client_id", "package_group_id", "package_id", "status", "total_children", "total_adults", "preferred_start_date", "primary_language", "referral_source", "created_at"],
    dbColumns: ["applicationNumber", "agentId", "clientId", "packageGroupId", "packageId", "status", "totalChildren", "totalAdults", "preferredStartDate", "primaryLanguage", "referralSource", "createdAt"],
  },
  application_participants: {
    table: applicationParticipants,
    columns: ["id", "application_id", "participant_type", "sequence_order", "full_name", "date_of_birth", "gender", "nationality", "grade", "school_name", "english_level", "medical_conditions", "dietary_requirements", "email", "phone"],
    dbColumns: ["id", "applicationId", "participantType", "sequenceOrder", "fullName", "dateOfBirth", "gender", "nationality", "grade", "schoolName", "englishLevel", "medicalConditions", "dietaryRequirements", "email", "phone"],
  },
  camp_applications: {
    table: campApplications,
    columns: ["id", "application_ref", "package_group_id", "package_id", "applicant_first_name", "applicant_last_name", "applicant_original_name", "applicant_english_name", "applicant_name", "applicant_email", "applicant_phone", "applicant_nationality", "applicant_dob", "adult_count", "student_count", "preferred_start_date", "special_requirements", "dietary_requirements", "medical_conditions", "emergency_contact_name", "emergency_contact_phone", "lead_id", "contract_id", "assigned_staff_id", "agent_account_id", "application_status", "status", "created_at"],
    dbColumns: ["id", "applicationRef", "packageGroupId", "packageId", "applicantFirstName", "applicantLastName", "applicantOriginalName", "applicantEnglishName", "applicantName", "applicantEmail", "applicantPhone", "applicantNationality", "applicantDob", "adultCount", "studentCount", "preferredStartDate", "specialRequirements", "dietaryRequirements", "medicalConditions", "emergencyContactName", "emergencyContactPhone", "leadId", "contractId", "assignedStaffId", "agentAccountId", "applicationStatus", "status", "createdAt"],
  },
  quotes: {
    table: quotes,
    columns: ["id", "quote_ref_number", "lead_id", "contact_id", "customer_contact_id", "student_account_id", "agent_account_id", "account_name", "customer_name", "original_name", "quote_status", "expiry_date", "is_template", "notes", "owner_id", "created_by", "created_on", "modified_on"],
    dbColumns: ["id", "quoteRefNumber", "leadId", "contactId", "customerContactId", "studentAccountId", "agentAccountId", "accountName", "customerName", "originalName", "quoteStatus", "expiryDate", "isTemplate", "notes", "ownerId", "createdBy", "createdOn", "modifiedOn"],
  },
  // ── Contracts ─────────────────────────────────────────────────────────────
  contracts: {
    table: contracts,
    columns: ["id", "contract_number", "application_id", "camp_provider_id", "total_amount", "currency", "status", "start_date", "end_date", "created_at"],
    dbColumns: ["id", "contractNumber", "applicationId", "campProviderId", "totalAmount", "currency", "status", "startDate", "endDate", "createdAt"],
  },
  contract_products: {
    table: contractProducts,
    columns: ["id", "contract_id", "product_id", "quantity", "unit_price", "total_price", "status"],
    dbColumns: ["id", "contractId", "productId", "quantity", "unitPrice", "totalPrice", "status"],
  },
  contract_finance_items: {
    table: contractFinanceItems,
    columns: ["id", "contract_id", "item_type", "item_category", "cost_center", "label", "linked_product_id", "linked_partner_id", "linked_agent_id", "estimated_amount", "actual_amount", "currency", "commission_type", "commission_rate", "commission_fixed", "due_date", "paid_date", "status", "is_auto_generated", "notes", "created_at"],
    dbColumns: ["id", "contractId", "itemType", "itemCategory", "costCenter", "label", "linkedProductId", "linkedPartnerId", "linkedAgentId", "estimatedAmount", "actualAmount", "currency", "commissionType", "commissionRate", "commissionFixed", "dueDate", "paidDate", "status", "isAutoGenerated", "notes", "createdAt"],
  },
  // ── Services ──────────────────────────────────────────────────────────────
  accommodation_mgt: {
    table: accommodationMgt,
    columns: ["id", "contract_id", "lead_id", "student_account_id", "assigned_staff_id", "provider_account_id", "accommodation_type", "checkin_date", "checkout_date", "meal_included", "room_type", "weekly_rate", "partner_weekly_cost", "host_name", "host_address", "host_contact", "distance_to_school", "relocation_reason", "settlement_id", "status", "notes", "created_at"],
    dbColumns: ["id", "contractId", "leadId", "studentAccountId", "assignedStaffId", "providerAccountId", "accommodationType", "checkinDate", "checkoutDate", "mealIncluded", "roomType", "weeklyRate", "partnerWeeklyCost", "hostName", "hostAddress", "hostContact", "distanceToSchool", "relocationReason", "settlementId", "status", "notes", "createdAt"],
  },
  pickup_mgt: {
    table: pickupMgt,
    columns: ["id", "contract_id", "driver_id", "pickup_type", "from_location", "to_location", "pickup_datetime", "vehicle_info", "status"],
    dbColumns: ["id", "contractId", "driverId", "pickupType", "fromLocation", "toLocation", "pickupDatetime", "vehicleInfo", "status"],
  },
  tour_mgt: {
    table: tourMgt,
    columns: ["id", "contract_id", "tour_company_id", "tour_name", "tour_date", "start_time", "end_time", "meeting_point", "status"],
    dbColumns: ["id", "contractId", "tourCompanyId", "tourName", "tourDate", "startTime", "endTime", "meetingPoint", "status"],
  },
  camp_tour_mgt: {
    table: campTourMgt,
    columns: ["id", "contract_id", "camp_application_id", "tour_provider_account_id", "tour_name", "tour_type", "tour_date", "tour_duration_hours", "pickup_location", "booking_reference", "partner_cost", "retail_price", "status", "notes", "ar_status", "ap_status", "created_at"],
    dbColumns: ["id", "contractId", "campApplicationId", "tourProviderAccountId", "tourName", "tourType", "tourDate", "tourDurationHours", "pickupLocation", "bookingReference", "partnerCost", "retailPrice", "status", "notes", "arStatus", "apStatus", "createdAt"],
  },
  settlement_mgt: {
    table: settlementMgt,
    columns: ["id", "contract_id", "provider_user_id", "provider_role", "gross_amount", "commission_rate", "commission_amount", "net_amount", "currency", "original_currency", "original_net_amount", "aud_equivalent", "exchange_rate_to_aud", "status", "settlement_date"],
    dbColumns: ["id", "contractId", "providerUserId", "providerRole", "grossAmount", "commissionRate", "commissionAmount", "netAmount", "currency", "originalCurrency", "originalNetAmount", "audEquivalent", "exchangeRateToAud", "status", "settlementDate"],
  },
  study_abroad_mgt: {
    table: studyAbroadMgt,
    columns: ["id", "contract_id", "lead_id", "student_account_id", "assigned_staff_id", "application_stage", "coe_number", "coe_expiry_date", "visa_type", "visa_application_date", "visa_decision_date", "visa_expiry_date", "visa_granted", "departure_date", "orientation_completed", "status", "notes", "program_context", "institute_account_id", "program_name", "program_type", "program_start_date", "program_end_date", "weekly_hours", "student_first_name", "student_last_name", "student_english_name", "student_original_name", "student_date_of_birth", "student_gender", "student_nationality", "student_grade", "created_at"],
    dbColumns: ["id", "contractId", "leadId", "studentAccountId", "assignedStaffId", "applicationStage", "coeNumber", "coeExpiryDate", "visaType", "visaApplicationDate", "visaDecisionDate", "visaExpiryDate", "visaGranted", "departureDate", "orientationCompleted", "status", "notes", "programContext", "instituteAccountId", "programName", "programType", "programStartDate", "programEndDate", "weeklyHours", "studentFirstName", "studentLastName", "studentEnglishName", "studentOriginalName", "studentDateOfBirth", "studentGender", "studentNationality", "studentGrade", "createdAt"],
  },
  internship_mgt: {
    table: internshipMgt,
    columns: ["id", "contract_id", "lead_id", "student_account_id", "assigned_staff_id", "english_level", "host_company_id", "position_title", "employment_type", "hourly_rate", "resume_prepared", "cover_letter_prepared", "interview_date", "interview_result", "start_date", "end_date", "placement_fee_type", "reference_letter_issued", "status", "notes", "created_at"],
    dbColumns: ["id", "contractId", "leadId", "studentAccountId", "assignedStaffId", "englishLevel", "hostCompanyId", "positionTitle", "employmentType", "hourlyRate", "resumePrepared", "coverLetterPrepared", "interviewDate", "interviewResult", "startDate", "endDate", "placementFeeType", "referenceLetterIssued", "status", "notes", "createdAt"],
  },
  guardian_mgt: {
    table: guardianMgt,
    columns: ["id", "contract_id", "lead_id", "student_account_id", "assigned_staff_id", "guardian_staff_id", "service_start_date", "service_end_date", "billing_cycle", "school_id", "official_guardian_registered", "school_guardian_registration_date", "emergency_contact", "status", "service_fee", "notes", "created_at"],
    dbColumns: ["id", "contractId", "leadId", "studentAccountId", "assignedStaffId", "guardianStaffId", "serviceStartDate", "serviceEndDate", "billingCycle", "schoolId", "officialGuardianRegistered", "schoolGuardianRegistrationDate", "emergencyContact", "status", "serviceFee", "notes", "createdAt"],
  },
  visa_services_mgt: {
    table: visaServicesMgt,
    columns: ["id", "contract_id", "assigned_staff_id", "partner_id", "visa_type", "country", "application_date", "appointment_date", "submission_date", "decision_date", "visa_number", "start_date", "end_date", "status", "service_fee", "ap_cost", "notes", "created_at"],
    dbColumns: ["id", "contractId", "assignedStaffId", "partnerId", "visaType", "country", "applicationDate", "appointmentDate", "submissionDate", "decisionDate", "visaNumber", "startDate", "endDate", "status", "serviceFee", "apCost", "notes", "createdAt"],
  },
  // ── Finance ───────────────────────────────────────────────────────────────
  invoices: {
    table: invoices,
    columns: ["id", "invoice_number", "contract_id", "invoice_type", "recipient_id", "subtotal", "tax_amount", "total_amount", "original_currency", "original_amount", "aud_equivalent", "exchange_rate_to_aud", "currency", "status", "issued_at", "due_date", "paid_at", "notes", "finance_item_id", "agent_id", "commission_amount", "net_amount", "balance_due", "ar_status", "created_at"],
    dbColumns: ["id", "invoiceNumber", "contractId", "invoiceType", "recipientId", "subtotal", "taxAmount", "totalAmount", "originalCurrency", "originalAmount", "audEquivalent", "exchangeRateToAud", "currency", "status", "issuedAt", "dueDate", "paidAt", "notes", "financeItemId", "agentId", "commissionAmount", "netAmount", "balanceDue", "arStatus", "createdAt"],
  },
  journal_entries: {
    table: journalEntries,
    columns: ["id", "entry_date", "payment_header_id", "payment_line_id", "debit_coa", "credit_coa", "amount", "description", "student_account_id", "partner_id", "staff_id", "contract_id", "invoice_id", "entry_type", "auto_generated", "created_by", "created_on"],
    dbColumns: ["id", "entryDate", "paymentHeaderId", "paymentLineId", "debitCoa", "creditCoa", "amount", "description", "studentAccountId", "partnerId", "staffId", "contractId", "invoiceId", "entryType", "autoGenerated", "createdBy", "createdOn"],
  },
  transactions: {
    table: transactions,
    columns: ["id", "contract_id", "invoice_id", "transaction_type", "amount", "currency", "original_currency", "original_amount", "aud_equivalent", "exchange_rate_to_aud", "description", "bank_reference", "transaction_date"],
    dbColumns: ["id", "contractId", "invoiceId", "transactionType", "amount", "currency", "originalCurrency", "originalAmount", "audEquivalent", "exchangeRateToAud", "description", "bankReference", "transactionDate"],
  },
  receipts: {
    table: receipts,
    columns: ["id", "receipt_number", "invoice_id", "payer_id", "amount", "currency", "original_currency", "original_amount", "aud_equivalent", "payment_method", "receipt_date", "status"],
    dbColumns: ["id", "receiptNumber", "invoiceId", "payerId", "amount", "currency", "originalCurrency", "originalAmount", "audEquivalent", "paymentMethod", "receiptDate", "status"],
  },
  payment_headers: {
    table: paymentHeaders,
    columns: ["id", "payment_ref", "contract_id", "invoice_id", "payment_date", "total_amount", "currency", "payment_method", "payment_type", "received_from", "paid_to", "bank_reference", "notes", "created_by", "approved_by", "status", "created_on"],
    dbColumns: ["id", "paymentRef", "contractId", "invoiceId", "paymentDate", "totalAmount", "currency", "paymentMethod", "paymentType", "receivedFrom", "paidTo", "bankReference", "notes", "createdBy", "approvedBy", "status", "createdOn"],
  },
  payment_lines: {
    table: paymentLines,
    columns: ["id", "payment_header_id", "invoice_id", "contract_product_id", "coa_code", "split_type", "amount", "staff_id", "description", "created_on"],
    dbColumns: ["id", "paymentHeaderId", "invoiceId", "contractProductId", "coaCode", "splitType", "amount", "staffId", "description", "createdOn"],
  },
  payment_statements: {
    table: paymentStatements,
    columns: ["id", "statement_ref", "statement_date", "statement_scope", "contract_id", "student_account_id", "total_paid_amount", "total_outstanding", "total_contract_amount", "line_item_count", "issued_by", "sent_to_email", "sent_at", "issue_reason", "notes", "status", "created_on"],
    dbColumns: ["id", "statementRef", "statementDate", "statementScope", "contractId", "studentAccountId", "totalPaidAmount", "totalOutstanding", "totalContractAmount", "lineItemCount", "issuedBy", "sentToEmail", "sentAt", "issueReason", "notes", "status", "createdOn"],
  },
  account_ledger_entries: {
    table: accountLedgerEntries,
    columns: ["id", "account_id", "source_type", "source_id", "contract_id", "entry_type", "amount", "currency", "original_amount", "original_currency", "aud_equivalent", "exchange_rate_to_aud", "status", "description", "entry_date", "created_by", "created_at"],
    dbColumns: ["id", "accountId", "sourceType", "sourceId", "contractId", "entryType", "amount", "currency", "originalAmount", "originalCurrency", "audEquivalent", "exchangeRateToAud", "status", "description", "entryDate", "createdBy", "createdAt"],
  },
  user_ledger: {
    table: userLedger,
    columns: ["id", "contract_id", "finance_item_id", "user_id", "entry_type", "cost_center", "amount", "currency", "description", "reference_type", "reference_id", "transaction_date", "status", "created_by", "created_at"],
    dbColumns: ["id", "contractId", "financeItemId", "userId", "entryType", "costCenter", "amount", "currency", "description", "referenceType", "referenceId", "transactionDate", "status", "createdBy", "createdAt"],
  },
  exchange_rates: {
    table: exchangeRates,
    columns: ["id", "from_currency", "to_currency", "rate", "effective_date", "source", "created_at"],
    dbColumns: ["id", "fromCurrency", "toCurrency", "rate", "effectiveDate", "source", "createdAt"],
  },
  // ── Packages ──────────────────────────────────────────────────────────────
  package_groups: {
    table: packageGroups,
    columns: ["id", "camp_provider_id", "name_en", "name_ko", "name_ja", "name_th", "location", "country_code", "status", "created_at"],
    dbColumns: ["id", "campProviderId", "nameEn", "nameKo", "nameJa", "nameTh", "location", "countryCode", "status", "createdAt"],
  },
  packages: {
    table: packages,
    columns: ["id", "package_group_id", "name", "duration_days", "max_participants", "price_aud", "price_usd", "price_krw", "price_jpy", "price_thb", "price_php", "price_sgd", "price_gbp", "status"],
    dbColumns: ["id", "packageGroupId", "name", "durationDays", "maxParticipants", "priceAud", "priceUsd", "priceKrw", "priceJpy", "priceThb", "pricePhp", "priceSgd", "priceGbp", "status"],
  },
  products: {
    table: products,
    columns: ["id", "provider_account_id", "product_name", "product_type", "description", "cost", "currency", "status"],
    dbColumns: ["id", "providerAccountId", "productName", "productType", "description", "cost", "currency", "status"],
  },
  product_cost_lines: {
    table: productCostLines,
    columns: ["id", "contract_product_id", "cost_type", "partner_id", "staff_id", "calc_type", "rate", "base_amount", "calculated_amount", "coa_code", "description", "status", "paid_at", "payment_header_id", "created_on"],
    dbColumns: ["id", "contractProductId", "costType", "partnerId", "staffId", "calcType", "rate", "baseAmount", "calculatedAmount", "coaCode", "description", "status", "paidAt", "paymentHeaderId", "createdOn"],
  },
  // ── CRM (aliases) ─────────────────────────────────────────────────────────
  crm_leads: {
    table: leads,
    columns: ["id", "agent_id", "full_name", "email", "phone", "nationality", "source", "status", "notes", "created_at"],
    dbColumns: ["id", "agentId", "fullName", "email", "phone", "nationality", "source", "status", "notes", "createdAt"],
  },
  crm_contacts: {
    table: contacts,
    columns: ["id", "first_name", "last_name", "title", "dob", "gender", "nationality", "email", "mobile", "office_number", "sns_type", "sns_id", "influx_channel", "important_date_1", "important_date_2", "english_name", "original_name", "full_name", "description", "status", "account_type", "created_on", "modified_on"],
    dbColumns: ["id", "firstName", "lastName", "title", "dob", "gender", "nationality", "email", "mobile", "officeNumber", "snsType", "snsId", "influxChannel", "importantDate1", "importantDate2", "englishName", "originalName", "fullName", "description", "status", "accountType", "createdOn", "modifiedOn"],
  },
  crm_contracts: {
    table: contracts,
    columns: ["id", "contract_number", "application_id", "camp_provider_id", "total_amount", "currency", "status", "start_date", "end_date", "created_at"],
    dbColumns: ["id", "contractNumber", "applicationId", "campProviderId", "totalAmount", "currency", "status", "startDate", "endDate", "createdAt"],
  },
};

const TEMPLATES: Record<string, { columns: string[]; example: string[] }> = {
  users: {
    columns: ["email", "role", "full_name", "phone", "company_name", "country_of_ops"],
    example: ["#EXAMPLE", "agent@example.com", "agent", "John Smith", "+61412345678", "Smith Education", "AU"],
  },
  exchange_rates: {
    columns: ["from_currency", "to_currency", "rate", "effective_date", "source"],
    example: ["#EXAMPLE", "KRW", "AUD", "0.001053", "2025-01-15", "manual"],
  },
  products: {
    columns: ["product_name", "product_type", "description", "cost", "currency"],
    example: ["#EXAMPLE", "English Immersion Course", "institute", "4-week intensive course", "1500.00", "AUD"],
  },
  enrollment_spots: {
    columns: ["package_group_id", "grade_label", "total_spots"],
    example: ["#EXAMPLE", "uuid-of-package-group", "Grade 7", "20"],
  },
  transactions: {
    columns: ["contract_id", "transaction_type", "amount", "currency", "original_currency", "original_amount", "description", "bank_reference", "transaction_date"],
    example: ["#EXAMPLE", "uuid-of-contract", "payment", "2500.00", "AUD", "AUD", "2500.00", "Initial payment", "REF123456", "2025-01-15"],
  },
};

async function getTableCount(table: any): Promise<number> {
  const [row] = await db.select({ c: count() }).from(table);
  return Number(row?.c ?? 0);
}

async function exportTableToCsv(config: ExportConfig, filters?: Record<string, string>): Promise<string> {
  const total = await getTableCount(config.table);
  if (total > MAX_EXPORT_ROWS) {
    throw new Error(`Table has ${total} rows which exceeds the maximum export limit of ${MAX_EXPORT_ROWS}`);
  }
  let csv = BOM + buildCsvHeader(config.columns);
  let offset = 0;
  while (offset < total) {
    const rows = await db.select().from(config.table).limit(BATCH_SIZE).offset(offset);
    for (const row of rows) {
      const vals = config.dbColumns.map((col) => (row as any)[col]);
      csv += buildCsvRow(vals);
    }
    offset += BATCH_SIZE;
  }
  return csv;
}

router.post("/export/:tableName", async (req, res) => {
  const { tableName } = req.params;
  const config = EXPORT_CONFIGS[tableName];
  if (!config) {
    return res.status(400).json({ error: `Unknown table: ${tableName}` });
  }
  try {
    const csv = await exportTableToCsv(config, req.body?.filters);
    const filename = `${tableName}_${todayStr()}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(Buffer.from(csv, "utf-8"));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.get("/row-counts", async (_req, res) => {
  const counts: Record<string, number> = {};
  await Promise.all(
    Object.entries(EXPORT_CONFIGS).map(async ([name, cfg]) => {
      try {
        counts[name] = await getTableCount(cfg.table);
      } catch {
        counts[name] = 0;
      }
    })
  );
  return res.json(counts);
});

router.get("/template/:tableName", (req, res) => {
  const { tableName } = req.params;
  const tmpl = TEMPLATES[tableName];
  if (!tmpl) {
    return res.status(400).json({ error: `No template for table: ${tableName}` });
  }
  let csv = BOM + buildCsvHeader(tmpl.columns);
  csv += buildCsvRow(tmpl.example);
  const filename = `template_${tableName}.csv`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send(Buffer.from(csv, "utf-8"));
});

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

async function importUsers(rows: Record<string, string>[], importedBy: string) {
  const errors: { row: number; field: string; message: string }[] = [];
  const valid: { rowIdx: number; data: typeof rows[0] }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    if (!row.email) { errors.push({ row: rowNum, field: "email", message: "Required" }); continue; }
    if (!isValidEmail(row.email)) { errors.push({ row: rowNum, field: "email", message: "Invalid email format" }); continue; }
    if (!row.role) { errors.push({ row: rowNum, field: "role", message: "Required" }); continue; }
    if (row.role === "super_admin") { errors.push({ row: rowNum, field: "role", message: "Cannot import super_admin role" }); continue; }
    if (!VALID_ROLES.includes(row.role)) { errors.push({ row: rowNum, field: "role", message: `Role must be one of: ${VALID_ROLES.filter(r => r !== "super_admin").join(", ")}` }); continue; }
    if (!row.full_name) { errors.push({ row: rowNum, field: "full_name", message: "Required" }); continue; }
    valid.push({ rowIdx: i, data: row });
  }
  let success = 0;
  const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
  const passwordHash = await bcrypt.hash(randomPassword, 10);
  for (let b = 0; b < valid.length; b += IMPORT_BATCH) {
    const batch = valid.slice(b, b + IMPORT_BATCH);
    try {
      await db.transaction(async (tx) => {
        for (const { data } of batch) {
          const existing = await tx.select({ id: users.id }).from(users).where(eq(users.email, data.email));
          if (existing.length > 0) {
            errors.push({ row: 0, field: "email", message: `Email already exists: ${data.email}` });
            continue;
          }
          await tx.insert(users).values({
            email: data.email,
            role: data.role as any,
            fullName: data.full_name,
            phone: data.phone || null,
            companyName: data.company_name || null,
            countryOfOps: data.country_of_ops || null,
            status: "pending",
            passwordHash,
          });
          success++;
        }
      });
    } catch {
      errors.push({ row: 0, field: "batch", message: `Batch ${b / IMPORT_BATCH + 1} failed` });
    }
  }
  return { success, errors };
}

async function importExchangeRates(rows: Record<string, string>[], importedBy: string) {
  const errors: { row: number; field: string; message: string }[] = [];
  const valid: { rowIdx: number; data: typeof rows[0] }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    if (!row.from_currency) { errors.push({ row: rowNum, field: "from_currency", message: "Required" }); continue; }
    if (!ALLOWED_CURRENCIES.includes(row.from_currency.toUpperCase())) { errors.push({ row: rowNum, field: "from_currency", message: `Must be one of: ${ALLOWED_CURRENCIES.join(", ")}` }); continue; }
    if (!row.rate || isNaN(Number(row.rate)) || Number(row.rate) <= 0) { errors.push({ row: rowNum, field: "rate", message: "Must be a positive number" }); continue; }
    if (!row.effective_date || !isValidDate(row.effective_date)) { errors.push({ row: rowNum, field: "effective_date", message: "Must be YYYY-MM-DD format" }); continue; }
    valid.push({ rowIdx: i, data: row });
  }
  let success = 0;
  for (let b = 0; b < valid.length; b += IMPORT_BATCH) {
    const batch = valid.slice(b, b + IMPORT_BATCH);
    try {
      await db.transaction(async (tx) => {
        for (const { data } of batch) {
          await tx.insert(exchangeRates).values({
            fromCurrency: data.from_currency.toUpperCase(),
            toCurrency: (data.to_currency || "AUD").toUpperCase(),
            rate: data.rate,
            effectiveDate: data.effective_date,
            source: data.source || "import",
            createdBy: importedBy,
          }).onConflictDoUpdate({
            target: [exchangeRates.fromCurrency, exchangeRates.toCurrency, exchangeRates.effectiveDate],
            set: { rate: data.rate, source: data.source || "import" },
          });
          success++;
        }
      });
    } catch {
      errors.push({ row: 0, field: "batch", message: `Batch ${b / IMPORT_BATCH + 1} failed` });
    }
  }
  return { success, errors };
}

async function importProducts(rows: Record<string, string>[], importedBy: string) {
  const errors: { row: number; field: string; message: string }[] = [];
  const valid: { rowIdx: number; data: typeof rows[0] }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    if (!row.product_name) { errors.push({ row: rowNum, field: "product_name", message: "Required" }); continue; }
    if (!row.product_type || !VALID_PRODUCT_TYPES.includes(row.product_type)) { errors.push({ row: rowNum, field: "product_type", message: `Must be one of: ${VALID_PRODUCT_TYPES.join(", ")}` }); continue; }
    if (!row.cost || isNaN(Number(row.cost)) || Number(row.cost) <= 0) { errors.push({ row: rowNum, field: "cost", message: "Must be a positive number" }); continue; }
    valid.push({ rowIdx: i, data: row });
  }
  let success = 0;
  for (let b = 0; b < valid.length; b += IMPORT_BATCH) {
    const batch = valid.slice(b, b + IMPORT_BATCH);
    try {
      await db.transaction(async (tx) => {
        for (const { data } of batch) {
          await tx.insert(products).values({
            productName: data.product_name,
            productType: data.product_type as any,
            description: data.description || null,
            cost: data.cost,
            currency: data.currency || "AUD",
            providerAccountId: importedBy,
            status: "active",
          });
          success++;
        }
      });
    } catch {
      errors.push({ row: 0, field: "batch", message: `Batch ${b / IMPORT_BATCH + 1} failed` });
    }
  }
  return { success, errors };
}

async function importEnrollmentSpots(rows: Record<string, string>[], importedBy: string) {
  const errors: { row: number; field: string; message: string }[] = [];
  const valid: { rowIdx: number; data: typeof rows[0] }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    if (!row.package_group_id) { errors.push({ row: rowNum, field: "package_group_id", message: "Required" }); continue; }
    if (!row.grade_label) { errors.push({ row: rowNum, field: "grade_label", message: "Required" }); continue; }
    if (!row.total_spots || isNaN(Number(row.total_spots)) || Number(row.total_spots) <= 0) { errors.push({ row: rowNum, field: "total_spots", message: "Must be a positive integer" }); continue; }
    const grp = await db.select({ id: packageGroups.id }).from(packageGroups).where(eq(packageGroups.id, row.package_group_id));
    if (grp.length === 0) { errors.push({ row: rowNum, field: "package_group_id", message: `Package group not found: ${row.package_group_id}` }); continue; }
    valid.push({ rowIdx: i, data: row });
  }
  let success = 0;
  for (let b = 0; b < valid.length; b += IMPORT_BATCH) {
    const batch = valid.slice(b, b + IMPORT_BATCH);
    try {
      await db.transaction(async (tx) => {
        for (const { data } of batch) {
          await tx.insert(enrollmentSpots).values({
            packageGroupId: data.package_group_id,
            gradeLabel: data.grade_label,
            totalSpots: parseInt(data.total_spots),
          }).onConflictDoUpdate({
            target: [enrollmentSpots.packageGroupId, enrollmentSpots.gradeLabel],
            set: { totalSpots: parseInt(data.total_spots) },
          });
          success++;
        }
      });
    } catch {
      errors.push({ row: 0, field: "batch", message: `Batch ${b / IMPORT_BATCH + 1} failed` });
    }
  }
  return { success, errors };
}

async function importTransactions(rows: Record<string, string>[], importedBy: string) {
  const errors: { row: number; field: string; message: string }[] = [];
  const valid: { rowIdx: number; data: typeof rows[0] }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    if (!row.contract_id) { errors.push({ row: rowNum, field: "contract_id", message: "Required" }); continue; }
    if (!row.transaction_type) { errors.push({ row: rowNum, field: "transaction_type", message: "Required" }); continue; }
    if (!row.amount || isNaN(Number(row.amount))) { errors.push({ row: rowNum, field: "amount", message: "Must be a number" }); continue; }
    if (!row.transaction_date || !isValidDate(row.transaction_date)) { errors.push({ row: rowNum, field: "transaction_date", message: "Must be YYYY-MM-DD format" }); continue; }
    const ctr = await db.select({ id: contracts.id }).from(contracts).where(eq(contracts.id, row.contract_id));
    if (ctr.length === 0) { errors.push({ row: rowNum, field: "contract_id", message: `Contract not found: ${row.contract_id}` }); continue; }
    valid.push({ rowIdx: i, data: row });
  }
  let success = 0;
  for (let b = 0; b < valid.length; b += IMPORT_BATCH) {
    const batch = valid.slice(b, b + IMPORT_BATCH);
    try {
      await db.transaction(async (tx) => {
        for (const { data } of batch) {
          await tx.insert(transactions).values({
            contractId: data.contract_id,
            transactionType: data.transaction_type as any,
            amount: data.amount,
            currency: data.currency || "AUD",
            originalCurrency: data.original_currency || data.currency || "AUD",
            originalAmount: data.original_amount || data.amount,
            audEquivalent: data.aud_equivalent || data.amount,
            exchangeRateToAud: data.exchange_rate_to_aud || "1",
            description: data.description || null,
            bankReference: data.bank_reference || null,
            transactionDate: data.transaction_date,
            createdBy: importedBy,
          });
          success++;
        }
      });
    } catch {
      errors.push({ row: 0, field: "batch", message: `Batch ${b / IMPORT_BATCH + 1} failed` });
    }
  }
  return { success, errors };
}

const IMPORTERS: Record<string, (rows: Record<string, string>[], importedBy: string) => Promise<{ success: number; errors: any[] }>> = {
  users: importUsers,
  exchange_rates: importExchangeRates,
  products: importProducts,
  enrollment_spots: importEnrollmentSpots,
  transactions: importTransactions,
};

router.post("/import/:tableName", upload.single("file"), async (req, res) => {
  const { tableName } = req.params;
  const importer = IMPORTERS[tableName];
  if (!importer) {
    return res.status(400).json({ error: `Import not supported for table: ${tableName}` });
  }
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const userId = (req as any).user?.id;
  let allRows: Record<string, string>[] = [];
  try {
    const rawRows: Record<string, string>[] = parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      cast: false,
    });
    allRows = rawRows.filter((r) => {
      const firstVal = Object.values(r)[0];
      return typeof firstVal === "string" && !firstVal.startsWith("#");
    });
  } catch (err: any) {
    return res.status(400).json({ error: `CSV parse error: ${err.message}` });
  }
  const totalRows = allRows.length;
  const { success, errors } = await importer(allRows, userId);
  const status = errors.length === 0 ? "completed" : success > 0 ? "partial" : "failed";
  const [hist] = await db.insert(importHistory).values({
    tableName,
    filename: req.file.originalname,
    totalRows,
    successRows: success,
    errorRows: errors.length,
    status,
    errorDetails: errors as any,
    importedBy: userId,
  }).returning();
  let errorCsv: string | null = null;
  if (errors.length > 0) {
    let csv = "row,field,message\n";
    for (const e of errors) {
      csv += buildCsvRow([e.row, e.field, e.message]);
    }
    errorCsv = Buffer.from(csv, "utf-8").toString("base64");
  }
  return res.json({
    totalRows,
    successRows: success,
    errorRows: errors.length,
    importHistoryId: hist?.id,
    errorCsv,
    errors: errors.slice(0, 10),
  });
});

router.get("/import-history", async (req, res) => {
  const { tableName, status, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const offset = (pageNum - 1) * limitNum;
  const rows = await db
    .select({
      id: importHistory.id,
      tableName: importHistory.tableName,
      filename: importHistory.filename,
      totalRows: importHistory.totalRows,
      successRows: importHistory.successRows,
      errorRows: importHistory.errorRows,
      status: importHistory.status,
      importedBy: importHistory.importedBy,
      createdAt: importHistory.createdAt,
      importerName: users.fullName,
      importerEmail: users.email,
    })
    .from(importHistory)
    .leftJoin(users, eq(importHistory.importedBy, users.id))
    .orderBy(sql`${importHistory.createdAt} DESC`)
    .limit(limitNum)
    .offset(offset);
  const filtered = rows.filter((r) => {
    if (tableName && r.tableName !== tableName) return false;
    if (status && r.status !== status) return false;
    return true;
  });
  return res.json({ data: rows, page: pageNum, limit: limitNum });
});

router.get("/import-history/:id/errors", async (req, res) => {
  const [row] = await db.select().from(importHistory).where(eq(importHistory.id, req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json({ errors: row.errorDetails ?? [] });
});

router.get("/import-history/:id/error-csv", async (req, res) => {
  const [row] = await db.select().from(importHistory).where(eq(importHistory.id, req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  const errors = (row.errorDetails ?? []) as any[];
  let csv = "row,field,message\n";
  for (const e of errors) {
    csv += buildCsvRow([e.row, e.field, e.message]);
  }
  const filename = `errors_${row.tableName}_${row.id?.slice(0, 8)}.csv`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send(Buffer.from(BOM + csv, "utf-8"));
});

export default router;
