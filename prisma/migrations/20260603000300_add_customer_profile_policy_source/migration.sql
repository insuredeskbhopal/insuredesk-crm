ALTER TABLE "customer_profiles"
ADD COLUMN "source_policy_id" UUID,
ADD COLUMN "source_policy_number" TEXT,
ADD COLUMN "source_policy_type" TEXT,
ADD COLUMN "source_company" TEXT;

CREATE INDEX "customer_profiles_source_policy_number_idx"
ON "customer_profiles"("source_policy_number");
