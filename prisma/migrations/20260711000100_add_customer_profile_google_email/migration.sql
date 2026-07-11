ALTER TABLE "customer_profiles"
ADD COLUMN IF NOT EXISTS "google_email" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "customer_profiles_google_email_key"
ON "customer_profiles"("google_email");

CREATE INDEX IF NOT EXISTS "customer_profiles_google_email_idx"
ON "customer_profiles"("google_email");
