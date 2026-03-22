CREATE TABLE "system_languages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"locale" varchar(20) NOT NULL,
	"code" varchar(10) NOT NULL,
	"direction" varchar(5) DEFAULT 'ltr' NOT NULL,
	"flag" varchar(10),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'Active' NOT NULL,
	"created_on" timestamp DEFAULT now() NOT NULL,
	"modified_on" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_languages_locale_unique" UNIQUE("locale"),
	CONSTRAINT "system_languages_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text,
	"group_name" varchar(100),
	"status" varchar(20) DEFAULT 'Active' NOT NULL,
	"created_on" timestamp DEFAULT now() NOT NULL,
	"modified_on" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "theme_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text,
	"option_type" varchar(50),
	"status" varchar(20) DEFAULT 'Active' NOT NULL,
	"created_on" timestamp DEFAULT now() NOT NULL,
	"modified_on" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "theme_options_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "theme_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(500) NOT NULL,
	"language" varchar(20) NOT NULL,
	"value" text NOT NULL,
	"status" varchar(20) DEFAULT 'Active' NOT NULL,
	"created_on" timestamp DEFAULT now() NOT NULL,
	"modified_on" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "theme_translations_key_language_unique" UNIQUE("key","language")
);
