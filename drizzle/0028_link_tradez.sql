CREATE TABLE "link_trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"proposer_id" integer NOT NULL,
	"partner_id" integer NOT NULL,
	"proposer_title" text NOT NULL,
	"proposer_url" text NOT NULL,
	"proposer_clicks" integer DEFAULT 0 NOT NULL,
	"partner_title" text,
	"partner_url" text,
	"partner_clicks" integer DEFAULT 0 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"duration_days" integer DEFAULT 14 NOT NULL,
	"expires_at" timestamp with time zone,
	"change_by" integer,
	"change_title" text,
	"change_url" text,
	"responded_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tradez_listed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tradez_pitch" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "link_trades" ADD CONSTRAINT "link_trades_proposer_id_users_id_fk" FOREIGN KEY ("proposer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_trades" ADD CONSTRAINT "link_trades_partner_id_users_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_trades" ADD CONSTRAINT "link_trades_change_by_users_id_fk" FOREIGN KEY ("change_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "link_trades_proposer_idx" ON "link_trades" USING btree ("proposer_id","status");--> statement-breakpoint
CREATE INDEX "link_trades_partner_idx" ON "link_trades" USING btree ("partner_id","status");