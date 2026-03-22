CREATE TABLE "camp_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_ref" varchar(50),
	"package_group_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"applicant_name" varchar(255) NOT NULL,
	"applicant_email" varchar(255) NOT NULL,
	"applicant_phone" varchar(50),
	"applicant_nationality" varchar(100),
	"applicant_dob" date,
	"adult_count" integer DEFAULT 1 NOT NULL,
	"student_count" integer DEFAULT 0 NOT NULL,
	"preferred_start_date" date,
	"special_requirements" text,
	"dietary_requirements" text,
	"medical_conditions" text,
	"emergency_contact_name" varchar(200),
	"emergency_contact_phone" varchar(50),
	"lead_id" uuid,
	"contract_id" uuid,
	"assigned_staff_id" uuid,
	"agent_account_id" uuid,
	"application_status" varchar(50) DEFAULT 'submitted' NOT NULL,
	"status" varchar(20) DEFAULT 'Active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "camp_applications_application_ref_unique" UNIQUE("application_ref")
);
--> statement-breakpoint
CREATE TABLE "camp_institute_mgt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"camp_application_id" uuid,
	"institute_account_id" uuid,
	"class_name" varchar(255),
	"class_level" varchar(100),
	"teacher_name" varchar(200),
	"class_schedule" jsonb,
	"attendance_record" jsonb,
	"teacher_comment" text,
	"certificate_issued" boolean DEFAULT false NOT NULL,
	"certificate_issued_at" timestamp,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "camp_package_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"name_i18n" jsonb,
	"country" varchar(100),
	"city" varchar(100),
	"duration_weeks_min" integer,
	"duration_weeks_max" integer,
	"target_age_group" varchar(50),
	"inclusions" text,
	"exclusions" text,
	"program_highlights" jsonb,
	"landing_page_active" boolean DEFAULT false NOT NULL,
	"landing_page_slug" varchar(200),
	"hero_image_id" uuid,
	"gallery_images" jsonb,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'Active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "camp_package_groups_landing_page_slug_unique" UNIQUE("landing_page_slug")
);
--> statement-breakpoint
CREATE TABLE "camp_package_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"service_type" varchar(50),
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(12, 2),
	"partner_cost" numeric(12, 2),
	"is_optional" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "camp_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_group_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"name_i18n" jsonb,
	"package_type" varchar(50),
	"max_adult_count" integer,
	"max_student_count" integer,
	"duration_weeks" integer,
	"start_date" date,
	"end_date" date,
	"base_price_aud" numeric(12, 2),
	"price_usd" numeric(12, 2),
	"price_jpy" numeric(12, 2),
	"price_krw" numeric(12, 2),
	"total_partner_cost_aud" numeric(12, 2),
	"max_participants" integer,
	"current_enrollment" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'Active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "camp_tour_mgt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"camp_application_id" uuid,
	"tour_provider_account_id" uuid,
	"tour_name" varchar(255),
	"tour_type" varchar(50),
	"tour_date" date,
	"tour_duration_hours" integer,
	"pickup_location" varchar(255),
	"booking_reference" varchar(100),
	"partner_cost" numeric(12, 2),
	"retail_price" numeric(12, 2),
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "camp_applications" ADD CONSTRAINT "camp_applications_package_group_id_camp_package_groups_id_fk" FOREIGN KEY ("package_group_id") REFERENCES "public"."camp_package_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camp_applications" ADD CONSTRAINT "camp_applications_package_id_camp_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."camp_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camp_applications" ADD CONSTRAINT "camp_applications_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camp_applications" ADD CONSTRAINT "camp_applications_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camp_applications" ADD CONSTRAINT "camp_applications_assigned_staff_id_users_id_fk" FOREIGN KEY ("assigned_staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camp_institute_mgt" ADD CONSTRAINT "camp_institute_mgt_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camp_institute_mgt" ADD CONSTRAINT "camp_institute_mgt_camp_application_id_camp_applications_id_fk" FOREIGN KEY ("camp_application_id") REFERENCES "public"."camp_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camp_package_groups" ADD CONSTRAINT "camp_package_groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camp_package_products" ADD CONSTRAINT "camp_package_products_package_id_camp_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."camp_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camp_package_products" ADD CONSTRAINT "camp_package_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camp_packages" ADD CONSTRAINT "camp_packages_package_group_id_camp_package_groups_id_fk" FOREIGN KEY ("package_group_id") REFERENCES "public"."camp_package_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camp_tour_mgt" ADD CONSTRAINT "camp_tour_mgt_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camp_tour_mgt" ADD CONSTRAINT "camp_tour_mgt_camp_application_id_camp_applications_id_fk" FOREIGN KEY ("camp_application_id") REFERENCES "public"."camp_applications"("id") ON DELETE no action ON UPDATE no action;