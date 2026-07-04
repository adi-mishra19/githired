CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"student_id" text NOT NULL,
	"status" text NOT NULL,
	"applied_at" timestamp NOT NULL,
	"student_cgpa" text,
	"student_course" text,
	"student_degree" text,
	"cover_letter" text,
	"resume_url" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"location" text NOT NULL,
	"cgpa_cutoff" text,
	"eligible_courses" text[],
	"eligible_degrees" text[],
	"jd_url" text,
	"about_role" jsonb,
	"salary" text,
	"skills" text[],
	"benefits" text[],
	"status" text NOT NULL,
	"analytics" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "cgpa" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "degree" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "course" text;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_applications_job_id" ON "applications" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_applications_student_id" ON "applications" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_applications_job_student" ON "applications" USING btree ("job_id","student_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_company_id" ON "jobs" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_status_created_at" ON "jobs" USING btree ("status","created_at" DESC NULLS LAST);