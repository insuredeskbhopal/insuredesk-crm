CREATE TABLE "endorsements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "endorsement_no" TEXT NOT NULL,
    "policy_no" TEXT,
    "insured_name" TEXT NOT NULL,
    "customer_name" TEXT,
    "insurance_company" TEXT,
    "policy_type" TEXT,
    "endorsement_type" TEXT NOT NULL,
    "endorsement_date" TIMESTAMPTZ(6) NOT NULL,
    "effective_date" TIMESTAMPTZ(6),
    "effective_from" TIMESTAMPTZ(6),
    "effective_to" TIMESTAMPTZ(6),
    "customer_request_date" TIMESTAMPTZ(6),
    "policy_start_date" TIMESTAMPTZ(6),
    "policy_expiry_date" TIMESTAMPTZ(6),
    "sum_insured" TEXT,
    "address" TEXT,
    "warehouse_details" TEXT,
    "old_values" JSONB NOT NULL DEFAULT '{}',
    "new_values" JSONB NOT NULL DEFAULT '{}',
    "extracted_policy_data" JSONB NOT NULL DEFAULT '{}',
    "description" TEXT,
    "internal_remark" TEXT,
    "customer_remark" TEXT,
    "remark" TEXT,
    "generated_letter_pdf_url" TEXT,
    "generated_letter_file_name" TEXT,
    "insurance_company_letter_pdf_url" TEXT,
    "insurance_company_letter_file_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "policy_id" UUID,
    "customer_id" UUID,
    "uploaded_policy_file_id" UUID,
    "organization_id" UUID,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,

    CONSTRAINT "endorsements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "endorsement_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "endorsement_id" UUID NOT NULL,
    "document_type" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT,
    "size" INTEGER,
    "data_url" TEXT NOT NULL,
    "remark" TEXT,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by_id" UUID,

    CONSTRAINT "endorsement_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "endorsements_organization_id_endorsement_no_key" ON "endorsements"("organization_id", "endorsement_no");
CREATE INDEX "endorsements_organization_id_deleted_at_created_at_idx" ON "endorsements"("organization_id", "deleted_at", "created_at");
CREATE INDEX "endorsements_organization_id_status_idx" ON "endorsements"("organization_id", "status");
CREATE INDEX "endorsements_policy_no_idx" ON "endorsements"("policy_no");
CREATE INDEX "endorsements_endorsement_no_idx" ON "endorsements"("endorsement_no");
CREATE INDEX "endorsements_insurance_company_idx" ON "endorsements"("insurance_company");
CREATE INDEX "endorsements_policy_id_idx" ON "endorsements"("policy_id");
CREATE INDEX "endorsements_customer_id_idx" ON "endorsements"("customer_id");
CREATE INDEX "endorsement_documents_endorsement_id_document_type_idx" ON "endorsement_documents"("endorsement_id", "document_type");
CREATE INDEX "endorsement_documents_uploaded_by_id_idx" ON "endorsement_documents"("uploaded_by_id");

ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "pdf_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_uploaded_policy_file_id_fkey" FOREIGN KEY ("uploaded_policy_file_id") REFERENCES "uploaded_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "endorsement_documents" ADD CONSTRAINT "endorsement_documents_endorsement_id_fkey" FOREIGN KEY ("endorsement_id") REFERENCES "endorsements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "endorsement_documents" ADD CONSTRAINT "endorsement_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
