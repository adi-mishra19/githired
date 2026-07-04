CREATE TABLE "ai_queries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"query" text NOT NULL,
	"generated_sql" text,
	"results" jsonb,
	"insights" text,
	"chart_type" text,
	"is_template" boolean,
	"execution_time" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "query_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"prompt" text NOT NULL,
	"chart_type" text,
	"is_active" boolean NOT NULL,
	"sort_order" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_queries" ADD CONSTRAINT "ai_queries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_queries_user_id" ON "ai_queries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_queries_role" ON "ai_queries" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_ai_queries_created_at" ON "ai_queries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_query_templates_role" ON "query_templates" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_query_templates_category" ON "query_templates" USING btree ("category");