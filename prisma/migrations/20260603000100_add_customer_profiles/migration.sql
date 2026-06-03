CREATE TABLE "customer_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "alternate_phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "occupation" TEXT,
    "business_type" TEXT,
    "contact_person_name" TEXT,
    "customer_type" TEXT NOT NULL DEFAULT 'New',
    "assigned_to" TEXT,
    "reference_source" TEXT,
    "selected_lobs" JSONB NOT NULL DEFAULT '[]',
    "lob_details" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'New Lead',
    "follow_up_date" TIMESTAMPTZ(6),
    "remarks" TEXT,
    "converted_to_customer" BOOLEAN NOT NULL DEFAULT false,
    "converted_policy_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "organization_id" UUID,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_profiles_phone_idx" ON "customer_profiles"("phone");
CREATE INDEX "customer_profiles_organization_id_idx" ON "customer_profiles"("organization_id");
CREATE INDEX "customer_profiles_created_by_id_idx" ON "customer_profiles"("created_by_id");
CREATE INDEX "customer_profiles_deleted_at_idx" ON "customer_profiles"("deleted_at");

ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
