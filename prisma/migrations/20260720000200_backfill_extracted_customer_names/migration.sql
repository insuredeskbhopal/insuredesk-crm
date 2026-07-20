-- Backfill only missing/default names. Existing user-entered names are preserved.
WITH valid_policy_candidates AS (
  SELECT record.id, candidate.name
  FROM "pdf_records" record
  CROSS JOIN LATERAL (
    SELECT BTRIM(source.value) AS name
    FROM (VALUES
      (1, record."contact_person_name"),
      (2, record."renewal_recipient_name"),
      (3, record."reviewed_data"->>'contactPerson'),
      (4, record."reviewed_data"->>'contactPersonName'),
      (5, record."reviewed_data"->>'customerName'),
      (6, record."reviewed_data"->>'insuredName'),
      (7, record."data"->>'contactPerson'),
      (8, record."data"->>'contactPersonName'),
      (9, record."data"->>'customerName'),
      (10, record."data"->>'insuredName'),
      (11, record."extracted_data"->>'contactPerson'),
      (12, record."extracted_data"->>'contactPersonName'),
      (13, record."extracted_data"->>'customerName'),
      (14, record."extracted_data"->>'insuredName')
    ) AS source(priority, value)
    WHERE NULLIF(BTRIM(source.value), '') IS NOT NULL
      AND LOWER(REGEXP_REPLACE(BTRIM(source.value), '[[:space:]]+', ' ', 'g')) NOT IN (
        'valued customer', 'dear customer', 'customer', 'insured', 'policy holder',
        'policyholder', 'policyholder name', 'applicant', 'client', 'unknown',
        'na', 'n/a', 'nil', 'none', '*'
      )
    ORDER BY source.priority
    LIMIT 1
  ) candidate
  WHERE record."deleted_at" IS NULL
)
UPDATE "pdf_records" record
SET
  "contact_person_name" = CASE
    WHEN LOWER(REGEXP_REPLACE(BTRIM(COALESCE(record."contact_person_name", '')), '[[:space:]]+', ' ', 'g')) IN (
      '', 'valued customer', 'dear customer', 'customer', 'insured', 'policy holder',
      'policyholder', 'policyholder name', 'applicant', 'client', 'unknown',
      'na', 'n/a', 'nil', 'none', '*'
    ) THEN candidate.name
    ELSE record."contact_person_name"
  END,
  "renewal_recipient_name" = CASE
    WHEN LOWER(REGEXP_REPLACE(BTRIM(COALESCE(record."renewal_recipient_name", '')), '[[:space:]]+', ' ', 'g')) IN (
      '', 'valued customer', 'dear customer', 'customer', 'insured', 'policy holder',
      'policyholder', 'policyholder name', 'applicant', 'client', 'unknown',
      'na', 'n/a', 'nil', 'none', '*'
    ) THEN candidate.name
    ELSE record."renewal_recipient_name"
  END
FROM valid_policy_candidates candidate
WHERE record.id = candidate.id
  AND (
    LOWER(REGEXP_REPLACE(BTRIM(COALESCE(record."contact_person_name", '')), '[[:space:]]+', ' ', 'g')) IN (
      '', 'valued customer', 'dear customer', 'customer', 'insured', 'policy holder',
      'policyholder', 'policyholder name', 'applicant', 'client', 'unknown',
      'na', 'n/a', 'nil', 'none', '*'
    )
    OR LOWER(REGEXP_REPLACE(BTRIM(COALESCE(record."renewal_recipient_name", '')), '[[:space:]]+', ' ', 'g')) IN (
      '', 'valued customer', 'dear customer', 'customer', 'insured', 'policy holder',
      'policyholder', 'policyholder name', 'applicant', 'client', 'unknown',
      'na', 'n/a', 'nil', 'none', '*'
    )
  );

-- Keep linked portfolio names in sync only when their current value is also missing/default.
WITH latest_policy_name AS (
  SELECT DISTINCT ON (record."customer_portfolio_id")
    record."customer_portfolio_id" AS portfolio_id,
    record."contact_person_name" AS name
  FROM "pdf_records" record
  WHERE record."deleted_at" IS NULL
    AND record."customer_portfolio_id" IS NOT NULL
    AND NULLIF(BTRIM(record."contact_person_name"), '') IS NOT NULL
    AND LOWER(REGEXP_REPLACE(BTRIM(record."contact_person_name"), '[[:space:]]+', ' ', 'g')) NOT IN (
      'valued customer', 'dear customer', 'customer', 'insured', 'policy holder',
      'policyholder', 'policyholder name', 'applicant', 'client', 'unknown',
      'na', 'n/a', 'nil', 'none', '*'
    )
  ORDER BY record."customer_portfolio_id", record."updated_at" DESC
)
UPDATE "customer_profiles" profile
SET
  "contact_person_name" = CASE
    WHEN LOWER(REGEXP_REPLACE(BTRIM(COALESCE(profile."contact_person_name", '')), '[[:space:]]+', ' ', 'g')) IN (
      '', 'valued customer', 'dear customer', 'customer', 'insured', 'policy holder',
      'policyholder', 'policyholder name', 'applicant', 'client', 'unknown',
      'na', 'n/a', 'nil', 'none', '*'
    ) THEN policy.name
    ELSE profile."contact_person_name"
  END,
  "name" = CASE
    WHEN LOWER(REGEXP_REPLACE(BTRIM(COALESCE(profile."name", '')), '[[:space:]]+', ' ', 'g')) IN (
      '', 'unnamed customer', 'valued customer', 'dear customer', 'customer', 'insured',
      'policy holder', 'policyholder', 'policyholder name', 'applicant', 'client',
      'unknown', 'na', 'n/a', 'nil', 'none', '*'
    ) THEN policy.name
    ELSE profile."name"
  END,
  "updated_at" = CURRENT_TIMESTAMP
FROM latest_policy_name policy
WHERE profile.id = policy.portfolio_id
  AND profile."deleted_at" IS NULL
  AND (
    LOWER(REGEXP_REPLACE(BTRIM(COALESCE(profile."contact_person_name", '')), '[[:space:]]+', ' ', 'g')) IN (
      '', 'valued customer', 'dear customer', 'customer', 'insured', 'policy holder',
      'policyholder', 'policyholder name', 'applicant', 'client', 'unknown',
      'na', 'n/a', 'nil', 'none', '*'
    )
    OR LOWER(REGEXP_REPLACE(BTRIM(COALESCE(profile."name", '')), '[[:space:]]+', ' ', 'g')) IN (
      '', 'unnamed customer', 'valued customer', 'dear customer', 'customer', 'insured',
      'policy holder', 'policyholder', 'policyholder name', 'applicant', 'client',
      'unknown', 'na', 'n/a', 'nil', 'none', '*'
    )
  );
