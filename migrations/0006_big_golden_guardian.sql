CREATE TABLE "ats_scans" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"resume_url" text NOT NULL,
	"resume_label" text,
	"score" text NOT NULL,
	"analysis" jsonb NOT NULL,
	"job_description" text,
	"matched_keywords" text[],
	"missing_keywords" text[],
	"suggestions" jsonb,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_suggestions" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"suggestions" jsonb NOT NULL,
	"last_generated" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "profile_suggestions_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "deadline" timestamp;--> statement-breakpoint
ALTER TABLE "ats_scans" ADD CONSTRAINT "ats_scans_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_suggestions" ADD CONSTRAINT "profile_suggestions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ats_scans_student" ON "ats_scans" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_ats_scans_created" ON "ats_scans" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_profile_suggestions_student" ON "profile_suggestions" USING btree ("student_id");