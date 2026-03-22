CREATE TABLE "accommodation_mgt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"lead_id" uuid,
	"student_account_id" uuid,
	"assigned_staff_id" uuid,
	"provider_account_id" uuid,
	"accommodation_type" varchar(50),
	"checkin_date" date,
	"checkout_date" date,
	"meal_included" varchar(50),
	"room_type" varchar(100),
	"weekly_rate" numeric(12, 2),
	"partner_weekly_cost" numeric(12, 2),
	"host_name" varchar(200),
	"host_address" text,
	"host_contact" varchar(200),
	"distance_to_school" varchar(100),
	"welfare_check_dates" jsonb,
	"relocation_reason" text,
	"settlement_id" uuid,
	"status" varchar(50) DEFAULT 'searching' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardian_mgt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"lead_id" uuid,
	"student_account_id" uuid,
	"assigned_staff_id" uuid,
	"guardian_staff_id" uuid,
	"service_start_date" date,
	"service_end_date" date,
	"billing_cycle" varchar(20),
	"school_id" uuid,
	"official_guardian_registered" boolean DEFAULT false NOT NULL,
	"school_guardian_registration_date" date,
	"monthly_reports" jsonb,
	"parent_contact" jsonb,
	"emergency_contact" varchar(500),
	"school_events_attended" jsonb,
	"medical_emergencies" jsonb,
	"welfare_interventions" jsonb,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internship_mgt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"lead_id" uuid,
	"student_account_id" uuid,
	"assigned_staff_id" uuid,
	"english_level" varchar(50),
	"work_experience" jsonb,
	"preferred_industry" jsonb,
	"available_hours_per_week" integer,
	"host_company_id" uuid,
	"position_title" varchar(200),
	"employment_type" varchar(50),
	"hourly_rate" numeric(8, 2),
	"resume_prepared" boolean DEFAULT false NOT NULL,
	"cover_letter_prepared" boolean DEFAULT false NOT NULL,
	"interview_date" timestamp,
	"interview_result" varchar(50),
	"start_date" date,
	"end_date" date,
	"placement_fee_type" varchar(50),
	"reference_letter_issued" boolean DEFAULT false NOT NULL,
	"status" varchar(50) DEFAULT 'profile_review' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_abroad_mgt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"lead_id" uuid,
	"student_account_id" uuid,
	"assigned_staff_id" uuid,
	"application_stage" varchar(50),
	"target_schools" jsonb,
	"coe_number" varchar(100),
	"coe_expiry_date" date,
	"coe_document_id" uuid,
	"visa_type" varchar(100),
	"visa_application_date" date,
	"visa_decision_date" date,
	"visa_expiry_date" date,
	"visa_granted" boolean DEFAULT false NOT NULL,
	"visa_document_id" uuid,
	"departure_date" date,
	"orientation_completed" boolean DEFAULT false NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accommodation_mgt" ADD CONSTRAINT "accommodation_mgt_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accommodation_mgt" ADD CONSTRAINT "accommodation_mgt_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accommodation_mgt" ADD CONSTRAINT "accommodation_mgt_assigned_staff_id_users_id_fk" FOREIGN KEY ("assigned_staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_mgt" ADD CONSTRAINT "guardian_mgt_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_mgt" ADD CONSTRAINT "guardian_mgt_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_mgt" ADD CONSTRAINT "guardian_mgt_assigned_staff_id_users_id_fk" FOREIGN KEY ("assigned_staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_mgt" ADD CONSTRAINT "guardian_mgt_guardian_staff_id_users_id_fk" FOREIGN KEY ("guardian_staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_mgt" ADD CONSTRAINT "internship_mgt_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_mgt" ADD CONSTRAINT "internship_mgt_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_mgt" ADD CONSTRAINT "internship_mgt_assigned_staff_id_users_id_fk" FOREIGN KEY ("assigned_staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_abroad_mgt" ADD CONSTRAINT "study_abroad_mgt_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_abroad_mgt" ADD CONSTRAINT "study_abroad_mgt_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_abroad_mgt" ADD CONSTRAINT "study_abroad_mgt_assigned_staff_id_users_id_fk" FOREIGN KEY ("assigned_staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;