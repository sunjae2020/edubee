CREATE TABLE "lead_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"channel" varchar(50) NOT NULL,
	"scheduled_at" timestamp,
	"description" text NOT NULL,
	"created_by" uuid,
	"created_on" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_ref_number" varchar(30),
	"lead_id" uuid,
	"contact_id" uuid,
	"quote_status" varchar(30) DEFAULT 'Draft' NOT NULL,
	"created_by" uuid,
	"created_on" timestamp DEFAULT now() NOT NULL,
	"modified_on" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_quote_ref_number_unique" UNIQUE("quote_ref_number")
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "lead_ref_number" varchar(30);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "assigned_staff_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "inquiry_type" varchar(100);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "budget" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "expected_start_date" date;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "contact_id" uuid;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_staff_id_users_id_fk" FOREIGN KEY ("assigned_staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_lead_ref_number_unique" UNIQUE("lead_ref_number");