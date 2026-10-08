-- Add nullable account_id column to whatsapp_message_queue without altering or deleting existing data.
ALTER TABLE "whatsapp_message_queue"
ADD COLUMN IF NOT EXISTS "account_id" TEXT;
