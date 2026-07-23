CREATE UNIQUE INDEX IF NOT EXISTS "client_accounts_active_organization_phone_key"
ON "client_accounts" ("organization_id", "phone")
WHERE "deleted_at" IS NULL AND "organization_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "client_accounts_active_unscoped_phone_key"
ON "client_accounts" ("phone")
WHERE "deleted_at" IS NULL AND "organization_id" IS NULL;
