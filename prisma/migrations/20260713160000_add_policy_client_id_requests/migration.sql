ALTER TABLE "pdf_records"
ADD COLUMN "client_id_request_id" UUID,
ADD COLUMN "client_id_pending" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "pdf_records_client_id_request_id_idx"
ON "pdf_records"("client_id_request_id");

CREATE INDEX "pdf_records_organization_id_client_id_pending_idx"
ON "pdf_records"("organization_id", "client_id_pending");
