ALTER TABLE "pdf_records"
ADD COLUMN "customer_portfolio_id" UUID,
ADD COLUMN "contact_person_name" TEXT,
ADD COLUMN "contact_person_mobile" TEXT,
ADD COLUMN "contact_person_email" TEXT,
ADD COLUMN "renewal_recipient_name" TEXT,
ADD COLUMN "renewal_recipient_mobile" TEXT,
ADD COLUMN "renewal_recipient_email" TEXT;

CREATE INDEX "pdf_records_organization_id_customer_portfolio_id_idx"
ON "pdf_records"("organization_id", "customer_portfolio_id");

CREATE INDEX "pdf_records_organization_id_renewal_recipient_mobile_idx"
ON "pdf_records"("organization_id", "renewal_recipient_mobile");

ALTER TABLE "pdf_records"
ADD CONSTRAINT "pdf_records_customer_portfolio_id_fkey"
FOREIGN KEY ("customer_portfolio_id") REFERENCES "customer_profiles"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve today's renewal groups as initial customer portfolios.
WITH policy_groups AS (
  SELECT
    organization_id,
    RIGHT(regexp_replace(COALESCE(
      reviewed_data->>'contactNumber', reviewed_data->>'customerMobile',
      data->>'contactNumber', data->>'customerMobile', ''
    ), '[^0-9]', '', 'g'), 10) AS mobile,
    MAX(NULLIF(COALESCE(reviewed_data->>'insuredName', data->>'insuredName', ''), '')) AS display_name,
    MAX(NULLIF(COALESCE(reviewed_data->>'contactPerson', reviewed_data->>'contactPersonName', data->>'contactPerson', data->>'contactPersonName', ''), '')) AS contact_name,
    MAX(NULLIF(COALESCE(reviewed_data->>'email', reviewed_data->>'customerEmail', data->>'email', data->>'customerEmail', ''), '')) AS email
  FROM "pdf_records"
  WHERE deleted_at IS NULL
    AND LENGTH(regexp_replace(COALESCE(
      reviewed_data->>'contactNumber', reviewed_data->>'customerMobile',
      data->>'contactNumber', data->>'customerMobile', ''
    ), '[^0-9]', '', 'g')) >= 10
  GROUP BY organization_id, RIGHT(regexp_replace(COALESCE(
    reviewed_data->>'contactNumber', reviewed_data->>'customerMobile',
    data->>'contactNumber', data->>'customerMobile', ''
  ), '[^0-9]', '', 'g'), 10)
)
INSERT INTO "customer_profiles" (
  "id", "name", "phone", "email", "contact_person_name", "organization_id", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  COALESCE(policy_groups.display_name, policy_groups.contact_name, 'Unnamed Customer'),
  policy_groups.mobile,
  policy_groups.email,
  policy_groups.contact_name,
  policy_groups.organization_id,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM policy_groups
WHERE NOT EXISTS (
  SELECT 1
  FROM "customer_profiles" profile
  WHERE profile.deleted_at IS NULL
    AND profile.organization_id IS NOT DISTINCT FROM policy_groups.organization_id
    AND RIGHT(regexp_replace(profile.phone, '[^0-9]', '', 'g'), 10) = policy_groups.mobile
);

-- Policies without a usable mobile retain their own stable portfolio.
INSERT INTO "customer_profiles" (
  "id", "name", "phone", "contact_person_name", "source_policy_id", "organization_id", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  COALESCE(NULLIF(COALESCE(record.reviewed_data->>'insuredName', record.data->>'insuredName', ''), ''), 'Unnamed Customer'),
  'NO-MOBILE-' || record.id::text,
  NULLIF(COALESCE(record.reviewed_data->>'contactPerson', record.reviewed_data->>'contactPersonName', record.data->>'contactPerson', record.data->>'contactPersonName', ''), ''),
  record.id,
  record.organization_id,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "pdf_records" record
WHERE record.deleted_at IS NULL
  AND LENGTH(regexp_replace(COALESCE(
    record.reviewed_data->>'contactNumber', record.reviewed_data->>'customerMobile',
    record.data->>'contactNumber', record.data->>'customerMobile', ''
  ), '[^0-9]', '', 'g')) < 10
  AND NOT EXISTS (
    SELECT 1 FROM "customer_profiles" profile WHERE profile.source_policy_id = record.id AND profile.deleted_at IS NULL
  );

UPDATE "pdf_records" record
SET "customer_portfolio_id" = COALESCE(
  (
    SELECT profile.id
    FROM "customer_profiles" profile
    WHERE profile.deleted_at IS NULL
      AND profile.organization_id IS NOT DISTINCT FROM record.organization_id
      AND LENGTH(regexp_replace(COALESCE(
        record.reviewed_data->>'contactNumber', record.reviewed_data->>'customerMobile',
        record.data->>'contactNumber', record.data->>'customerMobile', ''
      ), '[^0-9]', '', 'g')) >= 10
      AND RIGHT(regexp_replace(profile.phone, '[^0-9]', '', 'g'), 10) = RIGHT(regexp_replace(COALESCE(
        record.reviewed_data->>'contactNumber', record.reviewed_data->>'customerMobile',
        record.data->>'contactNumber', record.data->>'customerMobile', ''
      ), '[^0-9]', '', 'g'), 10)
    ORDER BY profile.created_at ASC
    LIMIT 1
  ),
  (
    SELECT profile.id
    FROM "customer_profiles" profile
    WHERE profile.source_policy_id = record.id AND profile.deleted_at IS NULL
    ORDER BY profile.created_at ASC
    LIMIT 1
  )
),
"contact_person_name" = NULLIF(COALESCE(
  record.reviewed_data->>'contactPerson', record.reviewed_data->>'contactPersonName',
  record.data->>'contactPerson', record.data->>'contactPersonName', ''
), ''),
"contact_person_mobile" = NULLIF(COALESCE(
  record.reviewed_data->>'contactNumber', record.reviewed_data->>'customerMobile',
  record.data->>'contactNumber', record.data->>'customerMobile', ''
), ''),
"contact_person_email" = NULLIF(COALESCE(
  record.reviewed_data->>'email', record.reviewed_data->>'customerEmail',
  record.data->>'email', record.data->>'customerEmail', ''
), ''),
"renewal_recipient_name" = NULLIF(COALESCE(
  record.reviewed_data->>'contactPerson', record.reviewed_data->>'contactPersonName',
  record.data->>'contactPerson', record.data->>'contactPersonName', ''
), ''),
"renewal_recipient_mobile" = NULLIF(COALESCE(
  record.reviewed_data->>'contactNumber', record.reviewed_data->>'customerMobile',
  record.data->>'contactNumber', record.data->>'customerMobile', ''
), ''),
"renewal_recipient_email" = NULLIF(COALESCE(
  record.reviewed_data->>'email', record.reviewed_data->>'customerEmail',
  record.data->>'email', record.data->>'customerEmail', ''
), '')
WHERE record.deleted_at IS NULL;
