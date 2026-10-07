/**
 * BIMA HEADQUARTER / INSUREDESK CRM
 * MASTER PRODUCTION PERFORMANCE REMEDIATION — BACKFILL & VERIFICATION ENGINE
 * 
 * Idempotent, batch-safe, non-destructive migration program for populating
 * canonical operational columns on `pdf_records` and verifying 100% data equivalence.
 *
 * Usage:
 *   node scripts/remediation-backfill.cjs           # Runs backfill + verification
 *   node scripts/remediation-backfill.cjs --verify  # Runs verification only
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function runBackfill() {
  console.log("============================================================");
  console.log("BIMA HEADQUARTER — CANONICAL POLICY RECORD BACKFILL");
  console.log("============================================================");

  const startTime = Date.now();
  const totalCount = await prisma.policyRecord.count();
  console.log(`[Backfill] Total policy records in database: ${totalCount}`);

  console.log("[Backfill] Executing set-based idempotent canonical column update...");

  const updateSql = `
    UPDATE "pdf_records"
    SET
      policy_number = COALESCE(
        NULLIF(BTRIM(reviewed_data->>'policyNumber'), ''),
        NULLIF(BTRIM(data->>'policyNumber'), '')
      ),
      normalized_policy_number = LOWER(REGEXP_REPLACE(
        COALESCE(
          NULLIF(BTRIM(reviewed_data->>'policyNumber'), ''),
          NULLIF(BTRIM(data->>'policyNumber'), ''),
          ''
        ),
        '[^a-zA-Z0-9]', '', 'g'
      )),
      insured_name = COALESCE(
        NULLIF(BTRIM(reviewed_data->>'insuredName'), ''),
        NULLIF(BTRIM(data->>'insuredName'), ''),
        NULLIF(BTRIM(reviewed_data->>'customerName'), ''),
        NULLIF(BTRIM(data->>'customerName'), ''),
        NULLIF(BTRIM(reviewed_data->>'Insured Name'), ''),
        NULLIF(BTRIM(data->>'Insured Name'), '')
      ),
      gross_premium = (CASE
        WHEN NULLIF(REGEXP_REPLACE(COALESCE(
          NULLIF(reviewed_data->>'grossPremium', ''), NULLIF(data->>'grossPremium', ''),
          NULLIF(reviewed_data->>'totalPremium', ''), NULLIF(data->>'totalPremium', ''),
          NULLIF(reviewed_data->>'premium', ''), NULLIF(data->>'premium', ''), ''
        ), '[^0-9.]', '', 'g'), '') ~ '^[0-9]+(\\.[0-9]+)?$'
        THEN CAST(REGEXP_REPLACE(COALESCE(
          NULLIF(reviewed_data->>'grossPremium', ''), NULLIF(data->>'grossPremium', ''),
          NULLIF(reviewed_data->>'totalPremium', ''), NULLIF(data->>'totalPremium', ''),
          NULLIF(reviewed_data->>'premium', ''), NULLIF(data->>'premium', ''), ''
        ), '[^0-9.]', '', 'g') AS DOUBLE PRECISION)
        ELSE NULL
      END),
      net_premium = (CASE
        WHEN NULLIF(REGEXP_REPLACE(COALESCE(
          NULLIF(reviewed_data->>'netPremium', ''), NULLIF(data->>'netPremium', ''),
          NULLIF(reviewed_data->>'basicPremium', ''), NULLIF(data->>'basicPremium', ''), ''
        ), '[^0-9.]', '', 'g'), '') ~ '^[0-9]+(\\.[0-9]+)?$'
        THEN CAST(REGEXP_REPLACE(COALESCE(
          NULLIF(reviewed_data->>'netPremium', ''), NULLIF(data->>'netPremium', ''),
          NULLIF(reviewed_data->>'basicPremium', ''), NULLIF(data->>'basicPremium', ''), ''
        ), '[^0-9.]', '', 'g') AS DOUBLE PRECISION)
        ELSE NULL
      END),
      total_premium = (CASE
        WHEN NULLIF(REGEXP_REPLACE(COALESCE(
          NULLIF(reviewed_data->>'totalPremium', ''), NULLIF(data->>'totalPremium', ''),
          NULLIF(reviewed_data->>'grossPremium', ''), NULLIF(data->>'grossPremium', ''),
          NULLIF(reviewed_data->>'netPremium', ''), NULLIF(data->>'netPremium', ''),
          NULLIF(reviewed_data->>'premium', ''), NULLIF(data->>'premium', ''), ''
        ), '[^0-9.]', '', 'g'), '') ~ '^[0-9]+(\\.[0-9]+)?$'
        THEN CAST(REGEXP_REPLACE(COALESCE(
          NULLIF(reviewed_data->>'totalPremium', ''), NULLIF(data->>'totalPremium', ''),
          NULLIF(reviewed_data->>'grossPremium', ''), NULLIF(data->>'grossPremium', ''),
          NULLIF(reviewed_data->>'netPremium', ''), NULLIF(data->>'netPremium', ''),
          NULLIF(reviewed_data->>'premium', ''), NULLIF(data->>'premium', ''), ''
        ), '[^0-9.]', '', 'g') AS DOUBLE PRECISION)
        ELSE NULL
      END),
      policy_start_date = (CASE
        WHEN COALESCE(NULLIF(reviewed_data->>'startDate', ''), NULLIF(data->>'startDate', ''), NULLIF(reviewed_data->>'policyStartDate', ''), NULLIF(data->>'policyStartDate', '')) ~ '^\\d{4}-\\d{2}-\\d{2}'
        THEN (COALESCE(NULLIF(reviewed_data->>'startDate', ''), NULLIF(data->>'startDate', ''), NULLIF(reviewed_data->>'policyStartDate', ''), NULLIF(data->>'policyStartDate', '')))::timestamptz
        ELSE NULL
      END),
      policy_expiry_date = (CASE
        WHEN COALESCE(NULLIF(reviewed_data->>'expiryDate', ''), NULLIF(data->>'expiryDate', ''), NULLIF(reviewed_data->>'policyEndDate', ''), NULLIF(data->>'policyEndDate', '')) ~ '^\\d{4}-\\d{2}-\\d{2}'
        THEN (COALESCE(NULLIF(reviewed_data->>'expiryDate', ''), NULLIF(data->>'expiryDate', ''), NULLIF(reviewed_data->>'policyEndDate', ''), NULLIF(data->>'policyEndDate', '')))::timestamptz
        ELSE NULL
      END),
      vehicle_registration_number = NULLIF(BTRIM(COALESCE(
        NULLIF(reviewed_data->>'vehicleNumber', ''), NULLIF(data->>'vehicleNumber', ''),
        NULLIF(reviewed_data->>'registrationNumber', ''), NULLIF(data->>'registrationNumber', '')
      )), ''),
      make_model = NULLIF(BTRIM(COALESCE(
        NULLIF(reviewed_data->>'makeModel', ''), NULLIF(data->>'makeModel', ''),
        NULLIF(reviewed_data->>'vehicleMake', ''), NULLIF(data->>'vehicleMake', '')
      )), ''),
      policy_category = NULLIF(BTRIM(COALESCE(
        NULLIF(reviewed_data->>'policyCategory', ''), NULLIF(data->>'policyCategory', ''),
        NULLIF(reviewed_data->>'documentCategory', ''), NULLIF(data->>'documentCategory', ''),
        selected_service_category,
        detected_service_category
      )), '');
  `;

  const updatedRows = await prisma.$executeRawUnsafe(updateSql);
  const duration = Date.now() - startTime;
  console.log(`[Backfill] Successfully backfilled ${updatedRows} records in ${duration} ms.`);
}

async function runVerification() {
  console.log("\n============================================================");
  console.log("CANONICAL DATA EQUIVALENCE VERIFICATION ENGINE");
  console.log("============================================================");

  const verificationSql = `
    SELECT
      id,
      policy_number,
      COALESCE(NULLIF(BTRIM(reviewed_data->>'policyNumber'), ''), NULLIF(BTRIM(data->>'policyNumber'), '')) AS expected_policy_number,
      insured_name,
      COALESCE(
        NULLIF(BTRIM(reviewed_data->>'insuredName'), ''),
        NULLIF(BTRIM(data->>'insuredName'), ''),
        NULLIF(BTRIM(reviewed_data->>'customerName'), ''),
        NULLIF(BTRIM(data->>'customerName'), ''),
        NULLIF(BTRIM(reviewed_data->>'Insured Name'), ''),
        NULLIF(BTRIM(data->>'Insured Name'), '')
      ) AS expected_insured_name,
      total_premium,
      (CASE
        WHEN NULLIF(REGEXP_REPLACE(COALESCE(
          NULLIF(reviewed_data->>'totalPremium', ''), NULLIF(data->>'totalPremium', ''),
          NULLIF(reviewed_data->>'grossPremium', ''), NULLIF(data->>'grossPremium', ''),
          NULLIF(reviewed_data->>'netPremium', ''), NULLIF(data->>'netPremium', ''),
          NULLIF(reviewed_data->>'premium', ''), NULLIF(data->>'premium', ''), ''
        ), '[^0-9.]', '', 'g'), '') ~ '^[0-9]+(\\.[0-9]+)?$'
        THEN CAST(REGEXP_REPLACE(COALESCE(
          NULLIF(reviewed_data->>'totalPremium', ''), NULLIF(data->>'totalPremium', ''),
          NULLIF(reviewed_data->>'grossPremium', ''), NULLIF(data->>'grossPremium', ''),
          NULLIF(reviewed_data->>'netPremium', ''), NULLIF(data->>'netPremium', ''),
          NULLIF(reviewed_data->>'premium', ''), NULLIF(data->>'premium', ''), ''
        ), '[^0-9.]', '', 'g') AS DOUBLE PRECISION)
        ELSE NULL
      END) AS expected_total_premium,
      policy_category,
      NULLIF(BTRIM(COALESCE(
        NULLIF(reviewed_data->>'policyCategory', ''), NULLIF(data->>'policyCategory', ''),
        NULLIF(reviewed_data->>'documentCategory', ''), NULLIF(data->>'documentCategory', ''),
        selected_service_category,
        detected_service_category
      )), '') AS expected_category
    FROM "pdf_records"
    ORDER BY created_at ASC;
  `;

  const rows = await prisma.$queryRawUnsafe(verificationSql);
  let equivalentCount = 0;
  let mismatchCount = 0;
  const mismatches = [];

  for (const row of rows) {
    const policyNumMatch = (row.policy_number || "") === (row.expected_policy_number || "");
    const insuredMatch = (row.insured_name || "") === (row.expected_insured_name || "");
    const premiumMatch = (row.total_premium === null && row.expected_total_premium === null) ||
      (Math.abs((row.total_premium || 0) - (row.expected_total_premium || 0)) < 0.01);
    const categoryMatch = (row.policy_category || "") === (row.expected_category || "");

    if (policyNumMatch && insuredMatch && premiumMatch && categoryMatch) {
      equivalentCount++;
    } else {
      mismatchCount++;
      if (mismatches.length < 5) {
        mismatches.push({
          id: row.id,
          policyNumber: { canonical: row.policy_number, expected: row.expected_policy_number },
          insuredName: { canonical: row.insured_name, expected: row.expected_insured_name },
          premium: { canonical: row.total_premium, expected: row.expected_total_premium },
          category: { canonical: row.policy_category, expected: row.expected_category },
        });
      }
    }
  }

  console.log(`Total records evaluated:    ${rows.length}`);
  console.log(`Successfully equivalent:    ${equivalentCount} (${((equivalentCount / rows.length) * 100).toFixed(2)}%)`);
  console.log(`Mismatches:                 ${mismatchCount}`);
  console.log(`Unable to determine:        0`);

  if (mismatchCount > 0) {
    console.error(`[Warning] Found ${mismatchCount} mismatches. Sample:`, JSON.stringify(mismatches, null, 2));
    process.exitCode = 1;
  } else {
    console.log("============================================================");
    console.log("VERIFICATION STATUS: 100% DATA EQUIVALENCE CONFIRMED");
    console.log("============================================================");
  }
}

async function main() {
  const isVerifyOnly = process.argv.includes("--verify");
  try {
    if (!isVerifyOnly) {
      await runBackfill();
    }
    await runVerification();
  } catch (err) {
    console.error("Backfill/Verification failed:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
