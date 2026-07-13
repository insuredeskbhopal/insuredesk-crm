ALTER TABLE "pdf_records"
ADD COLUMN "client_id_status" VARCHAR(32) NOT NULL DEFAULT 'LINKED';

UPDATE "pdf_records"
SET "client_id_status" = 'PENDING'
WHERE "client_id_pending" = true;

CREATE INDEX "pdf_records_organization_id_client_id_status_idx"
ON "pdf_records"("organization_id", "client_id_status");
