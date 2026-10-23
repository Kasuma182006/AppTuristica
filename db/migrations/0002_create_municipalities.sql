CREATE TABLE "municipalities" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "municipalities_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"code" varchar(5) NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"department_id" smallint NOT NULL,
	"geom" geometry(MultiPolygon, 4326) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "municipalities_code_unique" UNIQUE("code"),
	CONSTRAINT "municipalities_slug_unique" UNIQUE("slug"),
	CONSTRAINT "municipalities_code_format" CHECK ("municipalities"."code" ~ '^[0-9]{5}$'),
	CONSTRAINT "municipalities_slug_format" CHECK ("municipalities"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "municipalities_geom_valid" CHECK (ST_IsValid("municipalities"."geom"))
);
--> statement-breakpoint
ALTER TABLE "municipalities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "municipalities" ADD CONSTRAINT "municipalities_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;