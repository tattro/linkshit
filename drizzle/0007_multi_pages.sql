ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "active_page_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "owner_id" integer;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_active_page_id_users_id_fk" FOREIGN KEY ("active_page_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_owner_idx" ON "users" USING btree ("owner_id");