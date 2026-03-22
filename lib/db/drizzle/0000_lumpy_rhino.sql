CREATE TABLE "impersonation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"target_user_id" uuid,
	"started_at" timestamp DEFAULT now(),
	"ended_at" timestamp,
	"ip_address" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "page_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" varchar(50) NOT NULL,
	"page_slug" varchar(100) NOT NULL,
	"can_access" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"token" varchar(500) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "refresh_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" varchar(50) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"phone" varchar(50),
	"whatsapp" varchar(50),
	"line_id" varchar(100),
	"avatar_url" varchar(500),
	"timezone" varchar(100) DEFAULT 'Asia/Seoul',
	"preferred_lang" varchar(10) DEFAULT 'en',
	"company_name" varchar(255),
	"business_reg_no" varchar(100),
	"country_of_ops" varchar(10),
	"platform_comm_rate" numeric(5, 2),
	"status" varchar(20) DEFAULT 'active',
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "enrollment_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_group_id" uuid,
	"is_spot_limited" boolean DEFAULT false,
	"display_on_landing" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "enrollment_settings_package_group_id_unique" UNIQUE("package_group_id")
);
--> statement-breakpoint
CREATE TABLE "enrollment_spots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_group_id" uuid,
	"grade_label" varchar(100) NOT NULL,
	"grade_order" integer DEFAULT 0,
	"total_spots" integer NOT NULL,
	"reserved_spots" integer DEFAULT 0,
	"manual_reserved" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'available',
	"start_date" timestamp,
	"end_date" timestamp,
	"dob_range_start" timestamp,
	"dob_range_end" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "interview_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_group_id" uuid,
	"is_required" boolean DEFAULT false,
	"format" varchar(50),
	"duration_minutes" integer DEFAULT 30,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "interview_settings_package_group_id_unique" UNIQUE("package_group_id")
);
--> statement-breakpoint
CREATE TABLE "package_group_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_group_id" uuid,
	"product_id" uuid,
	"quantity" integer DEFAULT 1,
	"unit_price" numeric(10, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "package_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"camp_provider_id" uuid,
	"name_en" varchar(255) NOT NULL,
	"name_ko" varchar(255),
	"name_ja" varchar(255),
	"name_th" varchar(255),
	"description_en" text,
	"description_ko" text,
	"description_ja" text,
	"description_th" text,
	"inclusions_en" text,
	"inclusions_ko" text,
	"exclusions_en" text,
	"exclusions_ko" text,
	"duration_text" varchar(100),
	"thumbnail_url" varchar(500),
	"location" varchar(255),
	"country_code" varchar(10),
	"status" varchar(20) DEFAULT 'draft',
	"sort_order" integer DEFAULT 0,
	"landing_order" integer,
	"min_age" integer,
	"max_age" integer,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "package_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid,
	"product_id" uuid,
	"is_optional" boolean DEFAULT false,
	"quantity" integer DEFAULT 1,
	"unit_price" numeric(10, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_group_id" uuid,
	"name" varchar(100) NOT NULL,
	"duration_days" integer NOT NULL,
	"max_participants" integer,
	"max_adults" integer,
	"max_students" integer,
	"price_aud" numeric(12, 2),
	"price_usd" numeric(12, 2),
	"price_krw" numeric(15, 0),
	"price_jpy" numeric(15, 0),
	"price_thb" numeric(12, 2),
	"price_php" numeric(12, 2),
	"price_sgd" numeric(10, 2),
	"price_gbp" numeric(10, 2),
	"features" jsonb,
	"status" varchar(20) DEFAULT 'active',
	"agent_commission_type" varchar(20),
	"agent_commission_rate" numeric(5, 2),
	"agent_commission_fixed" numeric(12, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_account_id" uuid,
	"product_name" varchar(255) NOT NULL,
	"product_type" varchar(50) NOT NULL,
	"description" text,
	"cost" numeric(10, 2),
	"currency" varchar(10) DEFAULT 'AUD',
	"unit" varchar(50),
	"status" varchar(20) DEFAULT 'active',
	"service_module_type" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "application_grade" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid,
	"participant_id" uuid,
	"enrollment_spot_id" uuid,
	"grade_label" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "application_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid,
	"participant_type" varchar(50) NOT NULL,
	"sequence_order" integer DEFAULT 1,
	"full_name" varchar(255) NOT NULL,
	"full_name_native" varchar(255),
	"date_of_birth" date,
	"gender" varchar(20),
	"nationality" varchar(100),
	"passport_number" varchar(100),
	"passport_expiry" date,
	"grade" varchar(100),
	"school_name" varchar(255),
	"english_level" varchar(50),
	"medical_conditions" text,
	"dietary_requirements" varchar(100),
	"special_needs" text,
	"relationship_to_student" varchar(100),
	"is_emergency_contact" boolean DEFAULT false,
	"email" varchar(255),
	"phone" varchar(50),
	"whatsapp" varchar(50),
	"line_id" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_number" varchar(50),
	"agent_id" uuid,
	"client_id" uuid,
	"package_group_id" uuid,
	"package_id" uuid,
	"preferred_start_date" date,
	"status" varchar(50) DEFAULT 'pending',
	"total_children" integer DEFAULT 1,
	"total_adults" integer DEFAULT 0,
	"primary_language" varchar(10) DEFAULT 'en',
	"referral_source" varchar(100),
	"referral_agent_code" varchar(50),
	"special_requests" text,
	"terms_accepted" boolean DEFAULT false,
	"terms_accepted_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "applications_application_number_unique" UNIQUE("application_number")
);
--> statement-breakpoint
CREATE TABLE "interview_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid,
	"package_group_id" uuid,
	"interviewer_id" uuid,
	"scheduled_datetime" timestamp NOT NULL,
	"timezone" varchar(100) DEFAULT 'Asia/Seoul',
	"format" varchar(50),
	"meeting_link" varchar(500),
	"location" varchar(255),
	"status" varchar(50) DEFAULT 'pending',
	"result" varchar(20),
	"interviewer_notes" text,
	"candidate_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"nationality" varchar(100),
	"source" varchar(100),
	"interested_in" uuid,
	"status" varchar(50) DEFAULT 'new',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contract_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid,
	"product_id" uuid,
	"quantity" integer DEFAULT 1,
	"unit_price" numeric(10, 2),
	"total_price" numeric(10, 2),
	"status" varchar(50) DEFAULT 'pending',
	"ar_due_date" date,
	"ap_due_date" date,
	"ar_amount" numeric(12, 2),
	"ap_amount" numeric(12, 2),
	"ar_status" varchar(20) DEFAULT 'scheduled',
	"ap_status" varchar(20) DEFAULT 'pending',
	"coa_ar_code" varchar(10),
	"coa_ap_code" varchar(10),
	"service_module_type" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_number" varchar(50),
	"application_id" uuid,
	"camp_provider_id" uuid,
	"total_amount" numeric(12, 2),
	"paid_amount" numeric(12, 2),
	"balance_amount" numeric(12, 2),
	"currency" varchar(10) DEFAULT 'AUD',
	"status" varchar(50) DEFAULT 'draft',
	"signed_at" date,
	"start_date" date,
	"end_date" date,
	"student_name" varchar(255),
	"client_email" varchar(255),
	"client_country" varchar(100),
	"package_group_name" varchar(255),
	"package_name" varchar(255),
	"agent_name" varchar(255),
	"notes" text,
	"payment_frequency" varchar(50),
	"course_start_date" date,
	"course_end_date" date,
	"total_ar_amount" numeric(12, 2),
	"total_ap_amount" numeric(12, 2),
	"service_modules_activated" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "contracts_contract_number_unique" UNIQUE("contract_number"),
	CONSTRAINT "contracts_application_id_unique" UNIQUE("application_id")
);
--> statement-breakpoint
CREATE TABLE "hotel_mgt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid,
	"hotel_id" uuid,
	"room_type" varchar(100),
	"checkin_date" date,
	"checkin_time" varchar(20),
	"checkout_date" date,
	"checkout_time" varchar(20),
	"confirmation_no" varchar(100),
	"guest_notes" text,
	"status" varchar(50) DEFAULT 'pending',
	"ledger_entry_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "institute_mgt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid,
	"institute_id" uuid,
	"program_details" text,
	"start_date" date,
	"end_date" date,
	"schedule" jsonb,
	"total_hours" integer,
	"english_level_start" varchar(50),
	"english_level_end" varchar(50),
	"teacher_comments" text,
	"status" varchar(50) DEFAULT 'pending',
	"progress_notes" text,
	"ledger_entry_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pickup_mgt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid,
	"driver_id" uuid,
	"pickup_type" varchar(50),
	"from_location" varchar(255),
	"to_location" varchar(255),
	"pickup_datetime" timestamp,
	"vehicle_info" varchar(100),
	"driver_notes" text,
	"status" varchar(50) DEFAULT 'pending',
	"ledger_entry_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settlement_mgt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid,
	"product_id" uuid,
	"provider_user_id" uuid,
	"provider_role" varchar(50),
	"service_description" text,
	"gross_amount" numeric(12, 2),
	"commission_rate" numeric(5, 2),
	"commission_amount" numeric(12, 2),
	"net_amount" numeric(12, 2),
	"currency" varchar(10) DEFAULT 'AUD',
	"original_currency" varchar(10),
	"original_net_amount" numeric(12, 2),
	"aud_equivalent" numeric(12, 2),
	"exchange_rate_to_aud" numeric(10, 6),
	"status" varchar(50) DEFAULT 'pending',
	"settlement_date" date,
	"notes" text,
	"ledger_entry_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tour_mgt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid,
	"tour_company_id" uuid,
	"tour_name" varchar(255),
	"tour_date" date,
	"start_time" varchar(20),
	"end_time" varchar(20),
	"meeting_point" varchar(255),
	"highlights" jsonb,
	"guide_info" varchar(255),
	"tour_notes" text,
	"status" varchar(50) DEFAULT 'pending',
	"ledger_entry_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "default_doc_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_group" varchar(50) NOT NULL,
	"role" varchar(50) NOT NULL,
	"can_view" boolean DEFAULT false,
	"can_download" boolean DEFAULT false,
	"can_upload_extra" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "default_doc_permissions_category_group_role_unique" UNIQUE("category_group","role")
);
--> statement-breakpoint
CREATE TABLE "document_access_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid,
	"user_id" uuid,
	"action" varchar(50),
	"ip_address" varchar(50),
	"user_agent" varchar(500),
	"accessed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_code" varchar(100),
	"category_name_en" varchar(255),
	"category_name_ko" varchar(255),
	"category_name_ja" varchar(255),
	"category_name_th" varchar(255),
	"category_group" varchar(50),
	"icon" varchar(50),
	"is_required" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"allow_extra_upload" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "document_categories_category_code_unique" UNIQUE("category_code")
);
--> statement-breakpoint
CREATE TABLE "document_extra_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_type" varchar(20) NOT NULL,
	"reference_id" uuid NOT NULL,
	"category_name" varchar(255) NOT NULL,
	"category_group" varchar(50) DEFAULT 'other',
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid,
	"role" varchar(50) NOT NULL,
	"can_view" boolean DEFAULT false,
	"can_download" boolean DEFAULT false,
	"can_delete" boolean DEFAULT false,
	"can_upload_extra" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "document_permissions_document_id_role_unique" UNIQUE("document_id","role")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_type" varchar(20) NOT NULL,
	"reference_id" uuid NOT NULL,
	"category_id" uuid,
	"extra_category_id" uuid,
	"service_type" varchar(20),
	"service_id" uuid,
	"participant_id" uuid,
	"document_name" varchar(255) NOT NULL,
	"original_filename" varchar(255),
	"file_path" varchar(1000) NOT NULL,
	"file_size_bytes" integer,
	"file_type" varchar(100),
	"file_extension" varchar(20),
	"version" integer DEFAULT 1,
	"is_latest_version" boolean DEFAULT true,
	"previous_version_id" uuid,
	"status" varchar(50) DEFAULT 'pending_review',
	"expiry_date" date,
	"rejection_reason" text,
	"uploaded_by" uuid,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"notes" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "account_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"source_type" varchar(50) NOT NULL,
	"source_id" uuid NOT NULL,
	"contract_id" uuid,
	"entry_type" varchar(10) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'AUD',
	"original_amount" numeric(12, 2),
	"original_currency" varchar(10),
	"aud_equivalent" numeric(12, 2),
	"exchange_rate_to_aud" numeric(10, 6),
	"status" varchar(20) DEFAULT 'pending',
	"description" varchar(500),
	"entry_date" date NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "banking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"bank_name" varchar(255),
	"account_number" varchar(100),
	"account_holder" varchar(255),
	"bank_code" varchar(50),
	"country_code" varchar(10),
	"default_currency" varchar(10),
	"is_primary" boolean DEFAULT false,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contract_finance_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"item_type" varchar(20) NOT NULL,
	"item_category" varchar(50) NOT NULL,
	"cost_center" varchar(30),
	"label" varchar(255) NOT NULL,
	"linked_product_id" uuid,
	"linked_partner_id" uuid,
	"linked_agent_id" uuid,
	"estimated_amount" numeric(12, 2) NOT NULL,
	"actual_amount" numeric(12, 2),
	"currency" varchar(10) DEFAULT 'AUD',
	"commission_type" varchar(20),
	"commission_rate" numeric(5, 2),
	"commission_fixed" numeric(12, 2),
	"due_date" date,
	"paid_date" date,
	"status" varchar(20) DEFAULT 'pending',
	"is_auto_generated" boolean DEFAULT true,
	"is_deleted" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_currency" varchar(10) NOT NULL,
	"to_currency" varchar(10) DEFAULT 'AUD' NOT NULL,
	"rate" numeric(12, 6) NOT NULL,
	"source" varchar(50) DEFAULT 'manual',
	"effective_date" date NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "exchange_rates_from_currency_to_currency_effective_date_unique" UNIQUE("from_currency","to_currency","effective_date")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" varchar(50),
	"contract_id" uuid,
	"invoice_type" varchar(20) NOT NULL,
	"recipient_id" uuid,
	"line_items" jsonb,
	"subtotal" numeric(12, 2),
	"tax_amount" numeric(12, 2),
	"total_amount" numeric(12, 2),
	"original_currency" varchar(10),
	"original_amount" numeric(12, 2),
	"aud_equivalent" numeric(12, 2),
	"exchange_rate_to_aud" numeric(10, 6),
	"rate_applied_at" timestamp,
	"currency" varchar(10) DEFAULT 'AUD',
	"status" varchar(20) DEFAULT 'draft',
	"issued_at" timestamp,
	"due_date" date,
	"paid_at" timestamp,
	"notes" text,
	"ledger_entry_id" uuid,
	"finance_item_id" uuid,
	"agent_id" uuid,
	"commission_amount" numeric(12, 2),
	"net_amount" numeric(12, 2),
	"created_by" uuid,
	"parent_invoice_id" uuid,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurring_cycle" varchar(20),
	"recurring_seq" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_number" varchar(50),
	"invoice_id" uuid,
	"payer_id" uuid,
	"amount" numeric(12, 2),
	"original_currency" varchar(10),
	"original_amount" numeric(12, 2),
	"aud_equivalent" numeric(12, 2),
	"exchange_rate_to_aud" numeric(10, 6),
	"currency" varchar(10) DEFAULT 'AUD',
	"payment_method" varchar(50),
	"receipt_date" date,
	"status" varchar(20) DEFAULT 'confirmed',
	"notes" text,
	"ledger_entry_id" uuid,
	"finance_item_id" uuid,
	"confirmed_by" uuid,
	"confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "receipts_receipt_number_unique" UNIQUE("receipt_number")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid,
	"invoice_id" uuid,
	"bank_account_id" uuid,
	"transaction_type" varchar(20) NOT NULL,
	"amount" numeric(12, 2),
	"original_currency" varchar(10),
	"original_amount" numeric(12, 2),
	"aud_equivalent" numeric(12, 2),
	"exchange_rate_to_aud" numeric(10, 6),
	"currency" varchar(10) DEFAULT 'AUD',
	"description" varchar(500),
	"bank_reference" varchar(200),
	"transaction_date" date,
	"ledger_entry_id" uuid,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"finance_item_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"entry_type" varchar(10) NOT NULL,
	"cost_center" varchar(30),
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'AUD',
	"description" varchar(500),
	"reference_type" varchar(20),
	"reference_id" uuid,
	"transaction_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'confirmed',
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "import_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"filename" varchar(255),
	"total_rows" integer DEFAULT 0,
	"success_rows" integer DEFAULT 0,
	"error_rows" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'completed',
	"error_details" jsonb,
	"imported_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"type" varchar(100),
	"title" varchar(255),
	"message" text,
	"reference_type" varchar(50),
	"reference_id" uuid,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "program_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid,
	"report_title" varchar(255),
	"status" varchar(20) DEFAULT 'draft',
	"generated_by" uuid,
	"published_at" timestamp,
	"summary_notes" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "report_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid,
	"section_type" varchar(50),
	"section_title" varchar(255),
	"display_order" integer DEFAULT 0,
	"is_visible" boolean DEFAULT true,
	"content" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid,
	"file_path" varchar(500),
	"file_name" varchar(255),
	"file_type" varchar(100),
	"uploaded_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid,
	"author_id" uuid,
	"author_name" varchar(255),
	"content" text,
	"is_internal" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_number" varchar(30),
	"task_type" varchar(30) DEFAULT 'cs_request',
	"category" varchar(30) DEFAULT 'inquiry',
	"source" varchar(30) DEFAULT 'portal',
	"submitted_by" uuid,
	"submitted_name" varchar(255),
	"submitted_email" varchar(255),
	"submitted_phone" varchar(50),
	"assigned_to" uuid,
	"assigned_team" varchar(100),
	"contract_id" uuid,
	"application_id" uuid,
	"related_service_type" varchar(30),
	"title" varchar(255),
	"task_title" varchar(255),
	"description" text,
	"priority" varchar(20) DEFAULT 'normal',
	"status" varchar(30) DEFAULT 'open',
	"visibility" varchar(20) DEFAULT 'internal',
	"due_date" date,
	"first_response_at" timestamp,
	"resolved_at" timestamp,
	"sla_breached" boolean DEFAULT false,
	"satisfaction_rating" integer,
	"satisfaction_comment" text,
	"rated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"note_type" varchar(50) DEFAULT 'internal' NOT NULL,
	"content" text NOT NULL,
	"visibility" varchar(20) DEFAULT 'internal' NOT NULL,
	"is_pinned" boolean DEFAULT false,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_chunks" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"doc_id" varchar(36) NOT NULL,
	"chunk_index" integer NOT NULL,
	"text" text NOT NULL,
	"embedding" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_documents" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"source" varchar(1000),
	"source_type" varchar(50) DEFAULT 'manual' NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "impersonation_logs" ADD CONSTRAINT "impersonation_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impersonation_logs" ADD CONSTRAINT "impersonation_logs_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_settings" ADD CONSTRAINT "enrollment_settings_package_group_id_package_groups_id_fk" FOREIGN KEY ("package_group_id") REFERENCES "public"."package_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_spots" ADD CONSTRAINT "enrollment_spots_package_group_id_package_groups_id_fk" FOREIGN KEY ("package_group_id") REFERENCES "public"."package_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_settings" ADD CONSTRAINT "interview_settings_package_group_id_package_groups_id_fk" FOREIGN KEY ("package_group_id") REFERENCES "public"."package_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_group_products" ADD CONSTRAINT "package_group_products_package_group_id_package_groups_id_fk" FOREIGN KEY ("package_group_id") REFERENCES "public"."package_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_group_products" ADD CONSTRAINT "package_group_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_groups" ADD CONSTRAINT "package_groups_camp_provider_id_users_id_fk" FOREIGN KEY ("camp_provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_products" ADD CONSTRAINT "package_products_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_products" ADD CONSTRAINT "package_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_package_group_id_package_groups_id_fk" FOREIGN KEY ("package_group_id") REFERENCES "public"."package_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_provider_account_id_users_id_fk" FOREIGN KEY ("provider_account_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_grade" ADD CONSTRAINT "application_grade_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_grade" ADD CONSTRAINT "application_grade_participant_id_application_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."application_participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_grade" ADD CONSTRAINT "application_grade_enrollment_spot_id_enrollment_spots_id_fk" FOREIGN KEY ("enrollment_spot_id") REFERENCES "public"."enrollment_spots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_participants" ADD CONSTRAINT "application_participants_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_package_group_id_package_groups_id_fk" FOREIGN KEY ("package_group_id") REFERENCES "public"."package_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_schedules" ADD CONSTRAINT "interview_schedules_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_schedules" ADD CONSTRAINT "interview_schedules_package_group_id_package_groups_id_fk" FOREIGN KEY ("package_group_id") REFERENCES "public"."package_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_schedules" ADD CONSTRAINT "interview_schedules_interviewer_id_users_id_fk" FOREIGN KEY ("interviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_interested_in_package_groups_id_fk" FOREIGN KEY ("interested_in") REFERENCES "public"."package_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_products" ADD CONSTRAINT "contract_products_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_products" ADD CONSTRAINT "contract_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_camp_provider_id_users_id_fk" FOREIGN KEY ("camp_provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_mgt" ADD CONSTRAINT "hotel_mgt_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_mgt" ADD CONSTRAINT "hotel_mgt_hotel_id_users_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institute_mgt" ADD CONSTRAINT "institute_mgt_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institute_mgt" ADD CONSTRAINT "institute_mgt_institute_id_users_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_mgt" ADD CONSTRAINT "pickup_mgt_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_mgt" ADD CONSTRAINT "pickup_mgt_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_mgt" ADD CONSTRAINT "settlement_mgt_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_mgt" ADD CONSTRAINT "settlement_mgt_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_mgt" ADD CONSTRAINT "settlement_mgt_provider_user_id_users_id_fk" FOREIGN KEY ("provider_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_mgt" ADD CONSTRAINT "tour_mgt_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_mgt" ADD CONSTRAINT "tour_mgt_tour_company_id_users_id_fk" FOREIGN KEY ("tour_company_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_access_logs" ADD CONSTRAINT "document_access_logs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_access_logs" ADD CONSTRAINT "document_access_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_extra_categories" ADD CONSTRAINT "document_extra_categories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_permissions" ADD CONSTRAINT "document_permissions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_category_id_document_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."document_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_extra_category_id_document_extra_categories_id_fk" FOREIGN KEY ("extra_category_id") REFERENCES "public"."document_extra_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_participant_id_application_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."application_participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_ledger_entries" ADD CONSTRAINT "account_ledger_entries_account_id_users_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_ledger_entries" ADD CONSTRAINT "account_ledger_entries_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_ledger_entries" ADD CONSTRAINT "account_ledger_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banking" ADD CONSTRAINT "banking_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_finance_items" ADD CONSTRAINT "contract_finance_items_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_finance_items" ADD CONSTRAINT "contract_finance_items_linked_product_id_products_id_fk" FOREIGN KEY ("linked_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_finance_items" ADD CONSTRAINT "contract_finance_items_linked_partner_id_users_id_fk" FOREIGN KEY ("linked_partner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_finance_items" ADD CONSTRAINT "contract_finance_items_linked_agent_id_users_id_fk" FOREIGN KEY ("linked_agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_finance_item_id_contract_finance_items_id_fk" FOREIGN KEY ("finance_item_id") REFERENCES "public"."contract_finance_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_parent_invoice_id_invoices_id_fk" FOREIGN KEY ("parent_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_payer_id_users_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_finance_item_id_contract_finance_items_id_fk" FOREIGN KEY ("finance_item_id") REFERENCES "public"."contract_finance_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bank_account_id_banking_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."banking"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_ledger" ADD CONSTRAINT "user_ledger_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_ledger" ADD CONSTRAINT "user_ledger_finance_item_id_contract_finance_items_id_fk" FOREIGN KEY ("finance_item_id") REFERENCES "public"."contract_finance_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_ledger" ADD CONSTRAINT "user_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_ledger" ADD CONSTRAINT "user_ledger_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_history" ADD CONSTRAINT "import_history_imported_by_users_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_reports" ADD CONSTRAINT "program_reports_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_reports" ADD CONSTRAINT "program_reports_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_sections" ADD CONSTRAINT "report_sections_report_id_program_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."program_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_chunks" ADD CONSTRAINT "chat_chunks_doc_id_chat_documents_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."chat_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ledger_account" ON "account_ledger_entries" USING btree ("account_id","entry_date");--> statement-breakpoint
CREATE INDEX "idx_ledger_source" ON "account_ledger_entries" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "idx_ledger_contract" ON "account_ledger_entries" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "idx_cfi_contract" ON "contract_finance_items" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "idx_cfi_item_type" ON "contract_finance_items" USING btree ("item_type","status");--> statement-breakpoint
CREATE INDEX "idx_ul_user" ON "user_ledger" USING btree ("user_id","transaction_date");--> statement-breakpoint
CREATE INDEX "idx_ul_contract" ON "user_ledger" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "idx_ul_finance_item" ON "user_ledger" USING btree ("finance_item_id");