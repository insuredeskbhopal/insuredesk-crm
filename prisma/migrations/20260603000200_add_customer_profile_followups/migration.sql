ALTER TABLE "customer_profiles"
ADD COLUMN "last_follow_up_date" TIMESTAMPTZ(6),
ADD COLUMN "next_follow_up_date" TIMESTAMPTZ(6),
ADD COLUMN "follow_up_remark" TEXT,
ADD COLUMN "follow_up_outcome" TEXT;
