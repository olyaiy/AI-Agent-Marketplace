ALTER TABLE "credit_account" ADD COLUMN "balance_microcents" bigint NOT NULL DEFAULT 100000000;
--> statement-breakpoint
ALTER TABLE "credit_account" ADD COLUMN "auto_reload_threshold_microcents" bigint;
--> statement-breakpoint
ALTER TABLE "credit_account" ADD COLUMN "auto_reload_amount_microcents" bigint;
--> statement-breakpoint
UPDATE "credit_account"
SET
  "balance_microcents" = "balance_cents" * 1000000,
  "auto_reload_threshold_microcents" = CASE
    WHEN "auto_reload_threshold_cents" IS NULL THEN NULL
    ELSE "auto_reload_threshold_cents" * 1000000
  END,
  "auto_reload_amount_microcents" = CASE
    WHEN "auto_reload_amount_cents" IS NULL THEN NULL
    ELSE "auto_reload_amount_cents" * 1000000
  END;
--> statement-breakpoint
ALTER TABLE "credit_account" DROP COLUMN "balance_cents";
--> statement-breakpoint
ALTER TABLE "credit_account" DROP COLUMN "auto_reload_threshold_cents";
--> statement-breakpoint
ALTER TABLE "credit_account" DROP COLUMN "auto_reload_amount_cents";
--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD COLUMN "amount_microcents" bigint NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD COLUMN "balance_after_microcents" bigint;
--> statement-breakpoint
UPDATE "credit_ledger"
SET
  "amount_microcents" = "amount_cents" * 1000000,
  "balance_after_microcents" = CASE
    WHEN "balance_after_cents" IS NULL THEN NULL
    ELSE "balance_after_cents" * 1000000
  END;
--> statement-breakpoint
ALTER TABLE "credit_ledger" ALTER COLUMN "amount_microcents" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "credit_ledger" DROP COLUMN "amount_cents";
--> statement-breakpoint
ALTER TABLE "credit_ledger" DROP COLUMN "balance_after_cents";
