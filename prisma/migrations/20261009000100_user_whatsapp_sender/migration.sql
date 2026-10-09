ALTER TABLE "users" ADD COLUMN "primary_whatsapp_account_id" TEXT;
ALTER TABLE "organizations" ADD COLUMN "system_whatsapp_account_id" TEXT;
ALTER TABLE "whatsapp_message_queue" ADD COLUMN "initiated_by_user_id" UUID;
CREATE TABLE "whatsapp_accounts" (
 "id" TEXT PRIMARY KEY,
 "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
 "owner_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
 "label" TEXT NOT NULL,
 "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "whatsapp_accounts_organization_id_idx" ON "whatsapp_accounts"("organization_id");
CREATE TABLE "whatsapp_account_access" (
 "account_id" TEXT NOT NULL REFERENCES "whatsapp_accounts"("id") ON DELETE CASCADE,
 "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
 PRIMARY KEY ("account_id", "user_id")
);
