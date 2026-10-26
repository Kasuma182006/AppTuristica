CREATE TABLE "rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start"),
	CONSTRAINT "rate_limits_key_format" CHECK ("rate_limits"."key" ~ '^[a-z0-9-]+:[0-9a-f]{64}$'),
	CONSTRAINT "rate_limits_count_positive" CHECK ("rate_limits"."count" > 0),
	CONSTRAINT "rate_limits_window_order" CHECK ("rate_limits"."expires_at" > "rate_limits"."window_start")
);
--> statement-breakpoint
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "rate_limits_expires_at_idx" ON "rate_limits" USING btree ("expires_at");