CREATE TABLE "handle_redirects" (
	"handle" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "weekly_email" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "handle_redirects" ADD CONSTRAINT "handle_redirects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "handle_redirects_user_idx" ON "handle_redirects" USING btree ("user_id");