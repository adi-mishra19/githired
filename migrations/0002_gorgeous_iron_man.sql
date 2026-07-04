CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"website_url" text,
	"location" text,
	"about" text,
	"industry" text,
	"size" text,
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"linkedin_url" text,
	"twitter_url" text,
	"founded_year" text,
	"specialties" text[],
	"benefits" jsonb,
	"culture" text,
	"tech_stack" text[],
	"office_locations" jsonb,
	"verified" boolean NOT NULL,
	"status" text NOT NULL,
	"admin_note" text,
	"analytics" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "companies_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_companies_status_created_at" ON "companies" USING btree ("status","created_at" DESC NULLS LAST);