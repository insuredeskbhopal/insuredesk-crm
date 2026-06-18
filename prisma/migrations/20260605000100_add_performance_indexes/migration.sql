-- Scalar indexes generated from prisma/schema.prisma
ALTER TABLE "pdf_records"
ADD COLUMN IF NOT EXISTS "renewal_status" TEXT DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS "previous_policy_id" UUID,
ADD COLUMN IF NOT EXISTS "renewed_policy_id" UUID,
ADD COLUMN IF NOT EXISTS "renewal_date" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "lost_reason" TEXT,
ADD COLUMN IF NOT EXISTS "is_active_policy" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "customer_profiles_organization_id_deleted_at_updated_at_idx" ON "customer_profiles"("organization_id", "deleted_at", "updated_at");
CREATE INDEX IF NOT EXISTS "customer_profiles_organization_id_status_idx" ON "customer_profiles"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "customer_profiles_organization_id_next_follow_up_date_idx" ON "customer_profiles"("organization_id", "next_follow_up_date");
CREATE INDEX IF NOT EXISTS "customer_profiles_organization_id_created_at_idx" ON "customer_profiles"("organization_id", "created_at");
CREATE INDEX IF NOT EXISTS "customer_profiles_created_by_id_deleted_at_updated_at_idx" ON "customer_profiles"("created_by_id", "deleted_at", "updated_at");
CREATE INDEX IF NOT EXISTS "customer_profiles_phone_deleted_at_idx" ON "customer_profiles"("phone", "deleted_at");
CREATE INDEX IF NOT EXISTS "customer_profiles_status_deleted_at_idx" ON "customer_profiles"("status", "deleted_at");

CREATE INDEX IF NOT EXISTS "pdf_records_organization_id_deleted_at_saved_at_idx" ON "pdf_records"("organization_id", "deleted_at", "saved_at");
CREATE INDEX IF NOT EXISTS "pdf_records_organization_id_deleted_at_is_active_policy_idx" ON "pdf_records"("organization_id", "deleted_at", "is_active_policy");
CREATE INDEX IF NOT EXISTS "pdf_records_organization_id_renewal_status_idx" ON "pdf_records"("organization_id", "renewal_status");
CREATE INDEX IF NOT EXISTS "pdf_records_organization_id_is_active_policy_renewal_status_idx" ON "pdf_records"("organization_id", "is_active_policy", "renewal_status");
CREATE INDEX IF NOT EXISTS "pdf_records_created_by_id_deleted_at_saved_at_idx" ON "pdf_records"("created_by_id", "deleted_at", "saved_at");
CREATE INDEX IF NOT EXISTS "pdf_records_selected_company_idx" ON "pdf_records"("selected_company");
CREATE INDEX IF NOT EXISTS "pdf_records_selected_policy_type_idx" ON "pdf_records"("selected_policy_type");
CREATE INDEX IF NOT EXISTS "pdf_records_created_at_idx" ON "pdf_records"("created_at");
CREATE INDEX IF NOT EXISTS "pdf_records_updated_at_idx" ON "pdf_records"("updated_at");

CREATE INDEX IF NOT EXISTS "uploaded_files_organization_id_deleted_at_created_at_idx" ON "uploaded_files"("organization_id", "deleted_at", "created_at");
CREATE INDEX IF NOT EXISTS "uploaded_files_organization_id_status_created_at_idx" ON "uploaded_files"("organization_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "uploaded_files_created_by_id_deleted_at_created_at_idx" ON "uploaded_files"("created_by_id", "deleted_at", "created_at");

-- JSON key expression indexes used by policy records, renewals, dashboard, and customer profiling.
CREATE INDEX IF NOT EXISTS "pdf_records_policy_number_expr_idx" ON "pdf_records" ((lower(coalesce("reviewed_data"->>'policyNumber', "data"->>'policyNumber', ''))));
CREATE INDEX IF NOT EXISTS "pdf_records_insured_name_expr_idx" ON "pdf_records" ((lower(coalesce("reviewed_data"->>'insuredName', "data"->>'insuredName', ''))));
CREATE INDEX IF NOT EXISTS "pdf_records_company_expr_idx" ON "pdf_records" ((lower(coalesce("selected_company", "reviewed_data"->>'insuranceCompany', "reviewed_data"->>'Insurance Company', "data"->>'insuranceCompany', "data"->>'Insurance Company', ''))));
CREATE INDEX IF NOT EXISTS "pdf_records_policy_type_expr_idx" ON "pdf_records" ((lower(coalesce("selected_policy_type", "reviewed_data"->>'policyType', "reviewed_data"->>'Policy Type', "data"->>'policyType', "data"->>'Policy Type', ''))));
CREATE INDEX IF NOT EXISTS "pdf_records_registration_number_expr_idx" ON "pdf_records" ((lower(coalesce("reviewed_data"->>'registrationNumber', "data"->>'registrationNumber', "reviewed_data"->>'vehicleNumber', "data"->>'vehicleNumber', ''))));
CREATE INDEX IF NOT EXISTS "pdf_records_customer_mobile_expr_idx" ON "pdf_records" ((regexp_replace(coalesce("reviewed_data"->>'contactNumber', "reviewed_data"->>'Contact No.', "reviewed_data"->>'customerMobile', "data"->>'contactNumber', "data"->>'Contact No.', "data"->>'customerMobile', ''), '[^0-9]', '', 'g')));
CREATE INDEX IF NOT EXISTS "pdf_records_expiry_raw_expr_idx" ON "pdf_records" ((coalesce("reviewed_data"->>'expiryDate', "reviewed_data"->>'policyEndDate', "data"->>'expiryDate', "data"->>'policyEndDate')));

CREATE INDEX IF NOT EXISTS "pdf_records_data_gin_idx" ON "pdf_records" USING GIN ("data");
CREATE INDEX IF NOT EXISTS "pdf_records_reviewed_data_gin_idx" ON "pdf_records" USING GIN ("reviewed_data");
CREATE INDEX IF NOT EXISTS "customer_profiles_selected_lobs_gin_idx" ON "customer_profiles" USING GIN ("selected_lobs");
