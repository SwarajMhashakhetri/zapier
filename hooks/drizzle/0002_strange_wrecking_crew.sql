ALTER TABLE "actions" ADD COLUMN "sorting_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "triggers" DROP COLUMN "sorting_order";