CREATE TABLE "link_thumbs" (
	"link_id" integer PRIMARY KEY NOT NULL,
	"data" "bytea" NOT NULL,
	"content_type" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "device" text;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "thumb_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "lock_code" text;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "android_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "redirect_link_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "lock_code" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "seo_title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "seo_description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "meta_pixel" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_analytics" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tiktok_pixel" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "utm" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "link_thumbs" ADD CONSTRAINT "link_thumbs_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;