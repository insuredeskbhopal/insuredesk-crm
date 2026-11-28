-- Add sequential human-friendly client_code to client_accounts and relational client_account_id FK to pdf_records

CREATE SEQUENCE IF NOT EXISTS "client_account_code_seq" START WITH 100001 INCREMENT BY 1;

ALTER TABLE "client_accounts" ADD COLUMN IF NOT EXISTS "client_code" TEXT;

WITH ordered_clients AS (
  SELECT "id"
  FROM "client_accounts"
  WHERE "client_code" IS NULL
  ORDER BY "created_at" ASC, "id" ASC
)
UPDATE "client_accounts" AS ca
SET "client_code" = 'BHQ-' || nextval('"client_account_code_seq"')::text
FROM ordered_clients AS oc
WHERE ca."id" = oc."id";

CREATE UNIQUE INDEX IF NOT EXISTS "client_accounts_client_code_key" ON "client_accounts"("client_code");

ALTER TABLE "pdf_records" ADD COLUMN IF NOT EXISTS "client_account_id" UUID;

UPDATE "pdf_records" AS pr
SET "client_account_id" = ca."id"
FROM "client_accounts" AS ca
WHERE pr."client_account_id" IS NULL
  AND ca."deleted_at" IS NULL
  AND (ca."organization_id" IS NOT DISTINCT FROM pr."organization_id")
  AND COALESCE(NULLIF(pr."reviewed_data"->>'clientId', ''), pr."data"->>'clientId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND ca."id" = COALESCE(NULLIF(pr."reviewed_data"->>'clientId', ''), pr."data"->>'clientId')::uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pdf_records_client_account_id_fkey'
  ) THEN
    ALTER TABLE "pdf_records"
      ADD CONSTRAINT "pdf_records_client_account_id_fkey"
      FOREIGN KEY ("client_account_id")
      REFERENCES "client_accounts"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "pdf_records_client_account_id_idx" ON "pdf_records"("client_account_id");
CREATE INDEX IF NOT EXISTS "pdf_records_organization_id_client_account_id_idx" ON "pdf_records"("organization_id", "client_account_id");
