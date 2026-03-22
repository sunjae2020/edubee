CREATE TABLE "agent_commission_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"school_id" uuid,
	"commission_type" varchar(20) NOT NULL,
	"default_rate" numeric(8, 4),
	"default_amount" numeric(12, 2),
	"default_base" varchar(30),
	"payment_method" varchar(20),
	"payment_timing" varchar(50),
	"notes" text,
	"valid_from" date,
	"valid_to" date,
	"status" varchar(20) DEFAULT 'Active' NOT NULL,
	"created_on" timestamp DEFAULT now() NOT NULL,
	"modified_on" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chart_of_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(255) NOT NULL,
	"account_type" varchar(20) NOT NULL,
	"description" text,
	"parent_code" varchar(10),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_on" timestamp DEFAULT now() NOT NULL,
	"modified_on" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chart_of_accounts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_date" date NOT NULL,
	"payment_header_id" uuid,
	"debit_coa" varchar(10) NOT NULL,
	"credit_coa" varchar(10) NOT NULL,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"description" text,
	"student_account_id" uuid,
	"partner_id" uuid,
	"staff_id" uuid,
	"contract_id" uuid,
	"invoice_id" uuid,
	"entry_type" varchar(50),
	"auto_generated" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_on" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_headers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_ref" varchar(50),
	"payment_date" date NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"currency" varchar(10) DEFAULT 'AUD' NOT NULL,
	"payment_method" varchar(50),
	"payment_type" varchar(30) NOT NULL,
	"received_from" uuid,
	"paid_to" uuid,
	"bank_reference" varchar(100),
	"payment_info_id" uuid,
	"notes" text,
	"created_by" uuid NOT NULL,
	"approved_by" uuid,
	"status" varchar(20) DEFAULT 'Active' NOT NULL,
	"created_on" timestamp DEFAULT now() NOT NULL,
	"modified_on" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_headers_payment_ref_unique" UNIQUE("payment_ref")
);
--> statement-breakpoint
CREATE TABLE "payment_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_header_id" uuid NOT NULL,
	"invoice_id" uuid,
	"contract_product_id" uuid,
	"coa_code" varchar(10),
	"split_type" varchar(50),
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"staff_id" uuid,
	"description" text,
	"created_on" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_cost_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_product_id" uuid NOT NULL,
	"cost_type" varchar(50) NOT NULL,
	"partner_id" uuid,
	"staff_id" uuid,
	"calc_type" varchar(20) NOT NULL,
	"rate" numeric(8, 4),
	"base_amount" numeric(12, 2),
	"calculated_amount" numeric(12, 2),
	"coa_code" varchar(10),
	"description" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp,
	"payment_header_id" uuid,
	"created_on" timestamp DEFAULT now() NOT NULL,
	"modified_on" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_kpi_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"period_type" varchar(20) NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"lead_count" integer DEFAULT 0 NOT NULL,
	"conversion_count" integer DEFAULT 0 NOT NULL,
	"conversion_rate" numeric(8, 4),
	"attributed_revenue" numeric(12, 2) DEFAULT '0' NOT NULL,
	"payment_processed_count" integer DEFAULT 0 NOT NULL,
	"visa_granted_count" integer DEFAULT 0 NOT NULL,
	"incentive_rate" numeric(8, 4),
	"incentive_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"bonus_tier" varchar(50),
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp,
	"paid_at" timestamp,
	"notes" text,
	"created_on" timestamp DEFAULT now() NOT NULL,
	"modified_on" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_kpi_periods_staff_id_period_type_period_start_unique" UNIQUE("staff_id","period_type","period_start")
);
--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_payment_header_id_payment_headers_id_fk" FOREIGN KEY ("payment_header_id") REFERENCES "public"."payment_headers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_debit_coa_chart_of_accounts_code_fk" FOREIGN KEY ("debit_coa") REFERENCES "public"."chart_of_accounts"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_credit_coa_chart_of_accounts_code_fk" FOREIGN KEY ("credit_coa") REFERENCES "public"."chart_of_accounts"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_headers" ADD CONSTRAINT "payment_headers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_headers" ADD CONSTRAINT "payment_headers_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_lines" ADD CONSTRAINT "payment_lines_payment_header_id_payment_headers_id_fk" FOREIGN KEY ("payment_header_id") REFERENCES "public"."payment_headers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_lines" ADD CONSTRAINT "payment_lines_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_lines" ADD CONSTRAINT "payment_lines_contract_product_id_contract_products_id_fk" FOREIGN KEY ("contract_product_id") REFERENCES "public"."contract_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_lines" ADD CONSTRAINT "payment_lines_coa_code_chart_of_accounts_code_fk" FOREIGN KEY ("coa_code") REFERENCES "public"."chart_of_accounts"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_lines" ADD CONSTRAINT "payment_lines_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_cost_lines" ADD CONSTRAINT "product_cost_lines_contract_product_id_contract_products_id_fk" FOREIGN KEY ("contract_product_id") REFERENCES "public"."contract_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_cost_lines" ADD CONSTRAINT "product_cost_lines_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_cost_lines" ADD CONSTRAINT "product_cost_lines_coa_code_chart_of_accounts_code_fk" FOREIGN KEY ("coa_code") REFERENCES "public"."chart_of_accounts"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_kpi_periods" ADD CONSTRAINT "staff_kpi_periods_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_kpi_periods" ADD CONSTRAINT "staff_kpi_periods_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;