CREATE TABLE "claims" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "insured_name" TEXT NOT NULL,
  "mobile_no" TEXT,
  "contact_person" TEXT,
  "policy_no" TEXT,
  "claim_no" TEXT NOT NULL,
  "group_name" TEXT,
  "claim_description" TEXT,
  "claim_date" TIMESTAMPTZ(6),
  "claim_type" TEXT NOT NULL DEFAULT 'Motor',
  "claim_status" TEXT NOT NULL DEFAULT 'Open',
  "follow_up_date" TIMESTAMPTZ(6),
  "current_remark" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMPTZ(6),
  "organization_id" UUID,
  "created_by_id" UUID,
  "updated_by_id" UUID,
  "deleted_by_id" UUID,
  CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "claim_remarks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "claim_id" UUID NOT NULL,
  "text" TEXT NOT NULL,
  "follow_up_date" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_id" UUID,
  CONSTRAINT "claim_remarks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "claim_documents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "claim_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_type" TEXT,
  "size" INTEGER,
  "data_url" TEXT NOT NULL,
  "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploaded_by_id" UUID,
  CONSTRAINT "claim_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "claims_organization_id_deleted_at_updated_at_idx" ON "claims"("organization_id", "deleted_at", "updated_at");
CREATE INDEX "claims_organization_id_claim_status_idx" ON "claims"("organization_id", "claim_status");
CREATE INDEX "claims_organization_id_follow_up_date_idx" ON "claims"("organization_id", "follow_up_date");
CREATE INDEX "claims_created_by_id_deleted_at_updated_at_idx" ON "claims"("created_by_id", "deleted_at", "updated_at");
CREATE INDEX "claims_claim_no_idx" ON "claims"("claim_no");
CREATE INDEX "claims_mobile_no_idx" ON "claims"("mobile_no");
CREATE INDEX "claim_remarks_claim_id_created_at_idx" ON "claim_remarks"("claim_id", "created_at");
CREATE INDEX "claim_remarks_created_by_id_idx" ON "claim_remarks"("created_by_id");
CREATE INDEX "claim_documents_claim_id_uploaded_at_idx" ON "claim_documents"("claim_id", "uploaded_at");
CREATE INDEX "claim_documents_uploaded_by_id_idx" ON "claim_documents"("uploaded_by_id");

ALTER TABLE "claims" ADD CONSTRAINT "claims_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "claims" ADD CONSTRAINT "claims_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "claims" ADD CONSTRAINT "claims_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "claims" ADD CONSTRAINT "claims_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "claim_remarks" ADD CONSTRAINT "claim_remarks_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "claim_remarks" ADD CONSTRAINT "claim_remarks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "claim_documents" ADD CONSTRAINT "claim_documents_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "claim_documents" ADD CONSTRAINT "claim_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
