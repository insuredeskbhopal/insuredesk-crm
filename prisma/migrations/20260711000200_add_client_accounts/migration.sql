CREATE TABLE IF NOT EXISTS "client_accounts" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "google_email" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMPTZ(6),
  "organization_id" UUID,
  "created_by_id" UUID,
  "updated_by_id" UUID,
  CONSTRAINT "client_accounts_pkey" PRIMARY KEY ("id")
);

INSERT INTO "client_accounts" (
  "id",
  "name",
  "phone",
  "email",
  "google_email",
  "created_at",
  "updated_at",
  "deleted_at",
  "organization_id",
  "created_by_id",
  "updated_by_id"
)
SELECT
  "id",
  "name",
  "phone",
  "email",
  "google_email",
  "created_at",
  "updated_at",
  "deleted_at",
  "organization_id",
  "created_by_id",
  "updated_by_id"
FROM "customer_profiles"
ON CONFLICT ("id") DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS "client_accounts_google_email_key"
ON "client_accounts"("google_email");

CREATE INDEX IF NOT EXISTS "client_accounts_phone_idx"
ON "client_accounts"("phone");

CREATE INDEX IF NOT EXISTS "client_accounts_organization_id_idx"
ON "client_accounts"("organization_id");

CREATE INDEX IF NOT EXISTS "client_accounts_organization_id_deleted_at_updated_at_idx"
ON "client_accounts"("organization_id", "deleted_at", "updated_at");

CREATE INDEX IF NOT EXISTS "client_accounts_created_by_id_idx"
ON "client_accounts"("created_by_id");

CREATE INDEX IF NOT EXISTS "client_accounts_deleted_at_idx"
ON "client_accounts"("deleted_at");

CREATE INDEX IF NOT EXISTS "client_accounts_google_email_idx"
ON "client_accounts"("google_email");

ALTER TABLE "client_accounts"
ADD CONSTRAINT "client_accounts_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "client_accounts"
ADD CONSTRAINT "client_accounts_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "client_accounts"
ADD CONSTRAINT "client_accounts_updated_by_id_fkey"
FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
