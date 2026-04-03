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
const VALID_ROLES = ["super_admin", "admin", "finance", "admission", "team_manager", "consultant", "camp_coordinator"];
const VALID_PRODUCT_TYPES = ["institute", "hotel", "pickup", "tour", "settlement"];
const VALID_ACCOUNT_TYPES = ["Student", "Client", "Company", "Agent", "Institute", "Partner", "Organization"];
const VALID_GENDERS = ["male", "female", "other", "prefer_not_to_say"];

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
    columns: ["email", "role", "staff_role", "full_name", "first_name", "last_name", "english_name", "original_name", "phone", "whatsapp", "line_id", "timezone", "preferred_lang", "company_name", "business_reg_no", "country_of_ops", "status"],
    example: ["#EXAMPLE", "staff@edubee.co", "consultant", "", "Jane", "Smith", "Jane Smith", "제인 스미스", "+61412345678", "+61412345678", "jane_line", "Australia/Sydney", "en", "Edubee", "", "AU", "active"],
  },
  accounts: {
    columns: ["name", "account_type", "account_category", "phone_number", "email", "website", "address", "country", "state", "city", "postal_code", "abn", "description", "status", "first_name", "last_name", "english_name", "original_name"],
    example: ["#EXAMPLE", "Sydney English School", "school", "individual", "+61292345678", "admin@ses.edu.au", "https://ses.edu.au", "123 Oxford St", "AU", "NSW", "Sydney", "2000", "123456789", "English language school", "active", "John", "Lee", "John Lee", "이준호"],
  },
  contacts: {
    columns: ["first_name", "last_name", "full_name", "english_name", "original_name", "title", "dob", "gender", "nationality", "email", "mobile", "office_number", "sns_type", "sns_id", "description", "status"],
    example: ["#EXAMPLE", "Ji-ho", "Kim", "Ji-ho Kim", "Ji-ho Kim", "김지호", "Mr", "1995-03-15", "male", "KR", "jiho@example.com", "+821012345678", "", "kakao", "jihokakao", "Regular student client", "active"],
  },
  leads: {
    columns: ["full_name", "email", "phone", "nationality", "source", "status", "notes", "agent_id"],
    example: ["#EXAMPLE", "Min-jun Park", "minjun@example.com", "+821099887766", "KR", "website", "new", "Interested in 4-week program", ""],
  },
  applications: {
    columns: ["application_number", "agent_id", "client_id", "package_group_id", "package_id", "status", "total_children", "total_adults", "preferred_start_date", "primary_language", "referral_source"],
    example: ["#EXAMPLE", "APP-2025-0001", "", "", "uuid-of-package-group", "uuid-of-package", "pending", "2", "0", "2025-07-01", "KO", "website"],
  },
  camp_applications: {
    columns: ["application_ref", "package_group_id", "package_id", "applicant_name", "applicant_first_name", "applicant_last_name", "applicant_english_name", "applicant_original_name", "applicant_email", "applicant_phone", "applicant_nationality", "applicant_dob", "adult_count", "student_count", "preferred_start_date", "special_requirements", "dietary_requirements", "medical_conditions", "emergency_contact_name", "emergency_contact_phone", "agent_account_id", "application_status", "status"],
    example: ["#EXAMPLE", "CAMP-2025-001", "uuid-of-package-group", "uuid-of-package", "Soo-jin Lee", "Soo-jin", "Lee", "Soo-jin Lee", "이수진", "soojin@example.com", "+821011112222", "KR", "2010-05-20", "1", "1", "2025-07-01", "", "No peanuts", "None", "Parent Kim", "+821033334444", "", "pending", "active"],
  },
  contracts: {
    columns: ["contract_number", "application_id", "camp_provider_id", "total_amount", "currency", "status", "start_date", "end_date"],
    example: ["#EXAMPLE", "CTR-2025-0001", "uuid-of-application", "uuid-of-provider", "5500.00", "AUD", "active", "2025-07-01", "2025-07-29"],
  },
  invoices: {
    columns: ["invoice_number", "contract_id", "invoice_type", "recipient_id", "total_amount", "currency", "original_currency", "original_amount", "aud_equivalent", "exchange_rate_to_aud", "status", "issued_at", "due_date", "notes"],
    example: ["#EXAMPLE", "INV-2025-0001", "uuid-of-contract", "client", "uuid-of-recipient", "5500.00", "AUD", "AUD", "5500.00", "5500.00", "1.0", "unpaid", "2025-06-01", "2025-06-15", "First invoice"],
  },
  receipts: {
    columns: ["receipt_number", "invoice_id", "payer_id", "amount", "currency", "original_currency", "original_amount", "aud_equivalent", "payment_method", "receipt_date", "status"],
    example: ["#EXAMPLE", "RCP-2025-0001", "uuid-of-invoice", "uuid-of-payer", "2750.00", "AUD", "KRW", "2750000", "2750.00", "bank_transfer", "2025-06-05", "confirmed"],
  },
  exchange_rates: {
    columns: ["from_currency", "to_currency", "rate", "effective_date", "source"],
    example: ["#EXAMPLE", "KRW", "AUD", "0.001053", "2025-01-15", "manual"],
  },
  products: {
    columns: ["product_name", "product_type", "description", "cost", "currency"],
    example: ["#EXAMPLE", "English Immersion Course", "institute", "4-week intensive course", "1500.00", "AUD"],
  },
  package_groups: {
    columns: ["name_en", "name_ko", "name_ja", "name_th", "location", "country_code", "status", "camp_provider_id"],
    example: ["#EXAMPLE", "Sydney English Academy", "시드니 영어 아카데미", "シドニー英語アカデミー", "", "Sydney CBD", "AU", "active", ""],
  },
  packages: {
    columns: ["package_group_id", "name", "duration_days", "max_participants", "price_aud", "price_usd", "price_krw", "price_jpy", "price_thb", "price_php", "price_sgd", "price_gbp", "status"],
    example: ["#EXAMPLE", "uuid-of-package-group", "4 Week Standard", "28", "30", "1500.00", "980.00", "1350000", "145000", "35000", "55000", "1800.00", "1200.00", "active"],
  },
  enrollment_spots: {
    columns: ["package_group_id", "grade_label", "total_spots"],
    example: ["#EXAMPLE", "uuid-of-package-group", "Grade 7", "20"],
  },
  transactions: {
    columns: ["contract_id", "transaction_type", "amount", "currency", "original_currency", "original_amount", "aud_equivalent", "exchange_rate_to_aud", "description", "bank_reference", "transaction_date"],
    example: ["#EXAMPLE", "uuid-of-contract", "payment", "2500.00", "AUD", "AUD", "2500.00", "2500.00", "1.0", "Initial payment", "REF123456", "2025-01-15"],
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
    if (!row.full_name && !row.first_name && !row.last_name) { errors.push({ row: rowNum, field: "full_name", message: "full_name or first_name/last_name required" }); continue; }
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
          const firstName = data.first_name || null;
          const lastName = data.last_name || null;
          const computedFullName = data.full_name || [firstName, lastName].filter(Boolean).join(" ");
          const existing = await tx.select({ id: users.id }).from(users).where(eq(users.email, data.email));
          if (existing.length > 0) {
            await tx.update(users).set({
              role: data.role as any,
              fullName: computedFullName,
              firstName: firstName,
              lastName: lastName,
              englishName: data.english_name || null,
              originalName: data.original_name || null,
              phone: data.phone || null,
              whatsapp: data.whatsapp || null,
              lineId: data.line_id || null,
              timezone: data.timezone || null,
              preferredLang: data.preferred_lang || null,
              companyName: data.company_name || null,
              businessRegNo: data.business_reg_no || null,
              countryOfOps: data.country_of_ops || null,
              staffRole: (data.staff_role || null) as any,
            }).where(eq(users.email, data.email));
          } else {
            await tx.insert(users).values({
              email: data.email,
              role: data.role as any,
              fullName: computedFullName,
              firstName: firstName,
              lastName: lastName,
              englishName: data.english_name || null,
              originalName: data.original_name || null,
              phone: data.phone || null,
              whatsapp: data.whatsapp || null,
              lineId: data.line_id || null,
              timezone: data.timezone || null,
              preferredLang: data.preferred_lang || null,
              companyName: data.company_name || null,
              businessRegNo: data.business_reg_no || null,
              countryOfOps: data.country_of_ops || null,
              staffRole: (data.staff_role || null) as any,
              status: (data.status as any) || "pending",
              passwordHash,
            });
          }
          success++;
        }
      });
    } catch {
      errors.push({ row: 0, field: "batch", message: `Batch ${b / IMPORT_BATCH + 1} failed` });
    }
  }
  return { success, errors };
}

async function importAccounts(rows: Record<string, string>[], _importedBy: string) {
  const errors: { row: number; field: string; message: string }[] = [];
  const valid: { rowIdx: number; data: typeof rows[0] }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    if (!row.name) { errors.push({ row: rowNum, field: "name", message: "Required" }); continue; }
    if (!row.account_type) { errors.push({ row: rowNum, field: "account_type", message: "Required" }); continue; }
    if (!VALID_ACCOUNT_TYPES.includes(row.account_type)) { errors.push({ row: rowNum, field: "account_type", message: `Must be one of: ${VALID_ACCOUNT_TYPES.join(", ")}` }); continue; }
    valid.push({ rowIdx: i, data: row });
  }
  let success = 0;
  for (let b = 0; b < valid.length; b += IMPORT_BATCH) {
    const batch = valid.slice(b, b + IMPORT_BATCH);
    try {
      await db.transaction(async (tx) => {
        for (const { data } of batch) {
          await tx.insert(accounts).values({
            name: data.name,
            accountType: data.account_type as any,
            accountCategory: (data.account_category || null) as any,
            phoneNumber: data.phone_number || null,
            phoneNumber2: data.phone_number_2 || null,
            email: data.email || null,
            website: data.website || null,
            address: data.address || null,
            country: data.country || null,
            state: data.state || null,
            city: data.city || null,
            postalCode: data.postal_code || null,
            abn: data.abn || null,
            description: data.description || null,
            status: (data.status as any) || "active",
            firstName: data.first_name || null,
            lastName: data.last_name || null,
            englishName: data.english_name || null,
            originalName: data.original_name || null,
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

async function importContacts(rows: Record<string, string>[], _importedBy: string) {
  const errors: { row: number; field: string; message: string }[] = [];
  const valid: { rowIdx: number; data: typeof rows[0] }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    if (!row.first_name && !row.full_name) { errors.push({ row: rowNum, field: "first_name", message: "first_name or full_name required" }); continue; }
    valid.push({ rowIdx: i, data: row });
  }
  let success = 0;
  for (let b = 0; b < valid.length; b += IMPORT_BATCH) {
    const batch = valid.slice(b, b + IMPORT_BATCH);
    try {
      await db.transaction(async (tx) => {
        for (const { data } of batch) {
          const firstName = data.first_name || data.full_name || "";
          const lastName = data.last_name || null;
          const fullName = data.full_name || [firstName, lastName].filter(Boolean).join(" ");
          await tx.insert(contacts).values({
            firstName,
            lastName: lastName || "",
            fullName,
            englishName: data.english_name || null,
            originalName: data.original_name || null,
            title: (data.title || null) as any,
            dob: data.dob || null,
            gender: (data.gender || null) as any,
            nationality: data.nationality || null,
            email: data.email || null,
            mobile: data.mobile || null,
            officeNumber: data.office_number || null,
            snsType: (data.sns_type || null) as any,
            snsId: data.sns_id || null,
            description: data.description || null,
            status: (data.status as any) || "active",
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

async function importLeads(rows: Record<string, string>[], importedBy: string) {
  const errors: { row: number; field: string; message: string }[] = [];
  const valid: { rowIdx: number; data: typeof rows[0] }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    if (!row.full_name) { errors.push({ row: rowNum, field: "full_name", message: "Required" }); continue; }
    valid.push({ rowIdx: i, data: row });
  }
  let success = 0;
  for (let b = 0; b < valid.length; b += IMPORT_BATCH) {
    const batch = valid.slice(b, b + IMPORT_BATCH);
    try {
      await db.transaction(async (tx) => {
        for (const { data } of batch) {
          await tx.insert(leads).values({
            fullName: data.full_name,
            email: data.email || null,
            phone: data.phone || null,
            nationality: data.nationality || null,
            source: (data.source || null) as any,
            status: (data.status as any) || "new",
            notes: data.notes || null,
            agentId: data.agent_id || importedBy,
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

async function importApplications(rows: Record<string, string>[], _importedBy: string) {
  const errors: { row: number; field: string; message: string }[] = [];
  const valid: { rowIdx: number; data: typeof rows[0] }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    if (!row.package_group_id) { errors.push({ row: rowNum, field: "package_group_id", message: "Required" }); continue; }
    if (!row.status) { errors.push({ row: rowNum, field: "status", message: "Required" }); continue; }
    valid.push({ rowIdx: i, data: row });
  }
  let success = 0;
  for (let b = 0; b < valid.length; b += IMPORT_BATCH) {
    const batch = valid.slice(b, b + IMPORT_BATCH);
    try {
      await db.transaction(async (tx) => {
        for (const { data } of batch) {
          const vals: any = {
            packageGroupId: data.package_group_id,
            packageId: data.package_id || null,
            agentId: data.agent_id || null,
            clientId: data.client_id || null,
            status: data.status as any,
            totalChildren: data.total_children ? parseInt(data.total_children) : 0,
            totalAdults: data.total_adults ? parseInt(data.total_adults) : 0,
            preferredStartDate: data.preferred_start_date || null,
            primaryLanguage: data.primary_language || null,
            referralSource: data.referral_source || null,
          };
          if (data.application_number) {
            await tx.insert(applications).values({ ...vals, applicationNumber: data.application_number })
              .onConflictDoUpdate({ target: [applications.applicationNumber], set: vals });
          } else {
            await tx.insert(applications).values(vals);
          }
          success++;
        }
      });
    } catch {
      errors.push({ row: 0, field: "batch", message: `Batch ${b / IMPORT_BATCH + 1} failed` });
    }
  }
  return { success, errors };
}

async function importCampApplications(rows: Record<string, string>[], importedBy: string) {
  const errors: { row: number; field: string; message: string }[] = [];
  const valid: { rowIdx: number; data: typeof rows[0] }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    if (!row.applicant_name && !row.applicant_first_name) { errors.push({ row: rowNum, field: "applicant_name", message: "applicant_name or applicant_first_name required" }); continue; }
    if (!row.package_group_id) { errors.push({ row: rowNum, field: "package_group_id", message: "Required" }); continue; }
    valid.push({ rowIdx: i, data: row });
  }
  let success = 0;
  for (let b = 0; b < valid.length; b += IMPORT_BATCH) {
    const batch = valid.slice(b, b + IMPORT_BATCH);
    try {
      await db.transaction(async (tx) => {
        for (const { data } of batch) {
          const vals: any = {
            packageGroupId: data.package_group_id,
            packageId: data.package_id || null,
            applicantName: data.applicant_name || [data.applicant_first_name, data.applicant_last_name].filter(Boolean).join(" "),
            applicantFirstName: data.applicant_first_name || null,
            applicantLastName: data.applicant_last_name || null,
            applicantEnglishName: data.applicant_english_name || null,
            applicantOriginalName: data.applicant_original_name || null,
            applicantEmail: data.applicant_email || null,
            applicantPhone: data.applicant_phone || null,
            applicantNationality: data.applicant_nationality || null,
            applicantDob: data.applicant_dob || null,
            adultCount: data.adult_count ? parseInt(data.adult_count) : 0,
            studentCount: data.student_count ? parseInt(data.student_count) : 0,
            preferredStartDate: data.preferred_start_date || null,
            specialRequirements: data.special_requirements || null,
            dietaryRequirements: data.dietary_requirements || null,
            medicalConditions: data.medical_conditions || null,
            emergencyContactName: data.emergency_contact_name || null,
            emergencyContactPhone: data.emergency_contact_phone || null,
            agentAccountId: data.agent_account_id || null,
            assignedStaffId: data.assigned_staff_id || null,
            applicationStatus: (data.application_status || "pending") as any,
            status: (data.status || "active") as any,
          };
          if (data.application_ref) {
            await tx.insert(campApplications).values({ ...vals, applicationRef: data.application_ref })
              .onConflictDoUpdate({ target: [campApplications.applicationRef], set: vals });
          } else {
            await tx.insert(campApplications).values(vals);
          }
          success++;
        }
      });
    } catch {
      errors.push({ row: 0, field: "batch", message: `Batch ${b / IMPORT_BATCH + 1} failed` });
    }
  }
  return { success, errors };
}

async function importContracts(rows: Record<string, string>[], _importedBy: string) {
  const errors: { row: number; field: string; message: string }[] = [];
  const valid: { rowIdx: number; data: typeof rows[0] }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    if (!row.total_amount || isNaN(Number(row.total_amount))) { errors.push({ row: rowNum, field: "total_amount", message: "Must be a number" }); continue; }
    if (!row.currency || !ALLOWED_CURRENCIES.includes(row.currency.toUpperCase())) { errors.push({ row: rowNum, field: "currency", message: `Must be one of: ${ALLOWED_CURRENCIES.join(", ")}` }); continue; }
    if (!row.status) { errors.push({ row: rowNum, field: "status", message: "Required" }); continue; }
    valid.push({ rowIdx: i, data: row });
  }
  let success = 0;
  for (let b = 0; b < valid.length; b += IMPORT_BATCH) {
    const batch = valid.slice(b, b + IMPORT_BATCH);
    try {
      await db.transaction(async (tx) => {
        for (const { data } of batch) {
          const vals: any = {
            applicationId: data.application_id || null,
            campProviderId: data.camp_provider_id || null,
            totalAmount: data.total_amount,
            currency: data.currency.toUpperCase(),
            status: data.status as any,
            startDate: data.start_date || null,
            endDate: data.end_date || null,
          };
          if (data.contract_number) {
            await tx.insert(contracts).values({ ...vals, contractNumber: data.contract_number })
              .onConflictDoUpdate({ target: [contracts.contractNumber], set: vals });
          } else {
            await tx.insert(contracts).values(vals);
          }
          success++;
        }
      });
    } catch {
      errors.push({ row: 0, field: "batch", message: `Batch ${b / IMPORT_BATCH + 1} failed` });
    }
  }
  return { success, errors };
}

async function importPackageGroups(rows: Record<string, string>[], _importedBy: string) {
  const errors: { row: number; field: string; message: string }[] = [];
  const valid: { rowIdx: number; data: typeof rows[0] }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    if (!row.name_en) { errors.push({ row: rowNum, field: "name_en", message: "Required" }); continue; }
    if (!row.country_code) { errors.push({ row: rowNum, field: "country_code", message: "Required" }); continue; }
    valid.push({ rowIdx: i, data: row });
  }
  let success = 0;
  for (let b = 0; b < valid.length; b += IMPORT_BATCH) {
    const batch = valid.slice(b, b + IMPORT_BATCH);
    try {
      await db.transaction(async (tx) => {
        for (const { data } of batch) {
          await tx.insert(packageGroups).values({
            campProviderId: data.camp_provider_id || null,
            nameEn: data.name_en,
            nameKo: data.name_ko || null,
            nameJa: data.name_ja || null,
            nameTh: data.name_th || null,
            location: data.location || null,
            countryCode: data.country_code,
            status: (data.status as any) || "active",
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

async function importPackages(rows: Record<string, string>[], _importedBy: string) {
  const errors: { row: number; field: string; message: string }[] = [];
  const valid: { rowIdx: number; data: typeof rows[0] }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    if (!row.package_group_id) { errors.push({ row: rowNum, field: "package_group_id", message: "Required" }); continue; }
    if (!row.name) { errors.push({ row: rowNum, field: "name", message: "Required" }); continue; }
    if (!row.duration_days || isNaN(Number(row.duration_days))) { errors.push({ row: rowNum, field: "duration_days", message: "Must be a number" }); continue; }
    valid.push({ rowIdx: i, data: row });
  }
  let success = 0;
  for (let b = 0; b < valid.length; b += IMPORT_BATCH) {
    const batch = valid.slice(b, b + IMPORT_BATCH);
    try {
      await db.transaction(async (tx) => {
        for (const { data } of batch) {
          await tx.insert(packages).values({
            packageGroupId: data.package_group_id,
            name: data.name,
            durationDays: parseInt(data.duration_days),
            maxParticipants: data.max_participants ? parseInt(data.max_participants) : null,
            priceAud: data.price_aud || null,
            priceUsd: data.price_usd || null,
            priceKrw: data.price_krw || null,
            priceJpy: data.price_jpy || null,
            priceThb: data.price_thb || null,
            pricePhp: data.price_php || null,
            priceSgd: data.price_sgd || null,
            priceGbp: data.price_gbp || null,
            status: (data.status as any) || "active",
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

async function importInvoices(rows: Record<string, string>[], _importedBy: string) {
  const errors: { row: number; field: string; message: string }[] = [];
  const valid: { rowIdx: number; data: typeof rows[0] }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    if (!row.invoice_type) { errors.push({ row: rowNum, field: "invoice_type", message: "Required" }); continue; }
    if (!row.total_amount || isNaN(Number(row.total_amount))) { errors.push({ row: rowNum, field: "total_amount", message: "Must be a number" }); continue; }
    if (!row.currency || !ALLOWED_CURRENCIES.includes(row.currency.toUpperCase())) { errors.push({ row: rowNum, field: "currency", message: `Must be one of: ${ALLOWED_CURRENCIES.join(", ")}` }); continue; }
    if (!row.status) { errors.push({ row: rowNum, field: "status", message: "Required" }); continue; }
    valid.push({ rowIdx: i, data: row });
  }
  let success = 0;
  for (let b = 0; b < valid.length; b += IMPORT_BATCH) {
    const batch = valid.slice(b, b + IMPORT_BATCH);
    try {
      await db.transaction(async (tx) => {
        for (const { data } of batch) {
          const vals: any = {
            contractId: data.contract_id || null,
            invoiceType: data.invoice_type as any,
            recipientId: data.recipient_id || null,
            subtotal: data.subtotal || data.total_amount,
            taxAmount: data.tax_amount || "0",
            totalAmount: data.total_amount,
            originalCurrency: data.original_currency || data.currency,
            originalAmount: data.original_amount || data.total_amount,
            audEquivalent: data.aud_equivalent || data.total_amount,
            exchangeRateToAud: data.exchange_rate_to_aud || "1",
            currency: data.currency.toUpperCase(),
            status: data.status as any,
            issuedAt: data.issued_at ? new Date(data.issued_at) : new Date(),
            dueDate: data.due_date || null,
            paidAt: data.paid_at ? new Date(data.paid_at) : null,
            notes: data.notes || null,
          };
          if (data.invoice_number) {
            await tx.insert(invoices).values({ ...vals, invoiceNumber: data.invoice_number })
              .onConflictDoUpdate({ target: [invoices.invoiceNumber], set: vals });
          } else {
            await tx.insert(invoices).values(vals);
          }
          success++;
        }
      });
    } catch {
      errors.push({ row: 0, field: "batch", message: `Batch ${b / IMPORT_BATCH + 1} failed` });
    }
  }
  return { success, errors };
}

async function importReceipts(rows: Record<string, string>[], _importedBy: string) {
  const errors: { row: number; field: string; message: string }[] = [];
  const valid: { rowIdx: number; data: typeof rows[0] }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    if (!row.invoice_id) { errors.push({ row: rowNum, field: "invoice_id", message: "Required" }); continue; }
    if (!row.amount || isNaN(Number(row.amount))) { errors.push({ row: rowNum, field: "amount", message: "Must be a number" }); continue; }
    if (!row.currency || !ALLOWED_CURRENCIES.includes(row.currency.toUpperCase())) { errors.push({ row: rowNum, field: "currency", message: `Must be one of: ${ALLOWED_CURRENCIES.join(", ")}` }); continue; }
    if (!row.receipt_date || !isValidDate(row.receipt_date)) { errors.push({ row: rowNum, field: "receipt_date", message: "Must be YYYY-MM-DD format" }); continue; }
    valid.push({ rowIdx: i, data: row });
  }
  let success = 0;
  for (let b = 0; b < valid.length; b += IMPORT_BATCH) {
    const batch = valid.slice(b, b + IMPORT_BATCH);
    try {
      await db.transaction(async (tx) => {
        for (const { data } of batch) {
          const vals: any = {
            invoiceId: data.invoice_id,
            payerId: data.payer_id || null,
            amount: data.amount,
            currency: data.currency.toUpperCase(),
            originalCurrency: data.original_currency || data.currency,
            originalAmount: data.original_amount || data.amount,
            audEquivalent: data.aud_equivalent || data.amount,
            paymentMethod: (data.payment_method || "bank_transfer") as any,
            receiptDate: data.receipt_date,
            status: (data.status as any) || "confirmed",
          };
          if (data.receipt_number) {
            await tx.insert(receipts).values({ ...vals, receiptNumber: data.receipt_number })
              .onConflictDoUpdate({ target: [receipts.receiptNumber], set: vals });
          } else {
            await tx.insert(receipts).values(vals);
          }
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
  accounts: importAccounts,
  contacts: importContacts,
  leads: importLeads,
  applications: importApplications,
  camp_applications: importCampApplications,
  contracts: importContracts,
  package_groups: importPackageGroups,
  packages: importPackages,
  invoices: importInvoices,
  receipts: importReceipts,
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
