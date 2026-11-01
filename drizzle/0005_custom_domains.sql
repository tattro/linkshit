ALTER TABLE "users" ADD COLUMN "custom_domain" text;--> statement-breakpoint
CREATE UNIQUE INDEX "users_custom_domain_idx" ON "users" USING btree ("custom_domain");