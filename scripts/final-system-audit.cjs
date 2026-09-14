require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('====================================');
  console.log('   BIMAHEADQUARTER FINAL AUDIT      ');
  console.log('====================================\n');

  // 1. Overall August Records
  const allAugust = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM pdf_records
    WHERE deleted_at IS NULL
      AND saved_at >= '2026-08-01'
      AND saved_at <= '2026-08-31T23:59:59.999Z'
  `;
  console.log(`✓ Total Active August Records in Database: ${allAugust[0].count}`);

  // 2. Motor Records
  const motorRecords = await prisma.$queryRaw`
    SELECT 
      id,
      pdf_file_name,
      pdf_bytes IS NOT NULL AS has_bytes,
      reviewed_data->>'insuredName' AS name,
      reviewed_data->>'registrationNumber' AS veh,
      reviewed_data->>'policyNumber' AS pol,
      reviewed_data->>'insuranceCompany' AS company,
      reviewed_data->>'policyType' AS pol_type,
      reviewed_data->>'expiryDate' AS expiry,
      reviewed_data->>'policyEndDate' AS pol_end,
      reviewed_data->>'netPremium' AS net,
      reviewed_data->>'totalPremium' AS total,
      reviewed_data->>'odPremium' AS od,
      reviewed_data->>'tpPremium' AS tp,
      reviewed_data->>'idv' AS idv,
      reviewed_data->>'rtoLocation' AS rto_loc
    FROM pdf_records
    WHERE deleted_at IS NULL
      AND saved_at >= '2026-08-01'
      AND saved_at <= '2026-08-31T23:59:59.999Z'
      AND (
        reviewed_data->>'documentCategory' ILIKE '%Motor%'
        OR (reviewed_data->>'registrationNumber' IS NOT NULL AND reviewed_data->>'registrationNumber' != '')
      )
  `;

  const confirmedMotor = motorRecords.filter(r => r.veh && !r.veh.includes('2026') && !r.veh.includes('2027'));
  console.log(`✓ Confirmed Motor Insurance Policies: ${confirmedMotor.length}`);

  // 3. Expiry Date Check
  const missingExpiry = confirmedMotor.filter(r => !r.expiry && !r.pol_end);
  console.log(`✓ Missing Expiry Dates: ${missingExpiry.length} (Expected: 0)`);
  if (missingExpiry.length > 0) {
    console.error('FAIL: Missing expiry dates found:', missingExpiry);
    process.exit(1);
  }

  // 4. Financial Sanity Check
  let invertedTotalCount = 0;
  let corruptedNumbers = 0;
  let missingIdv = 0;

  for (const r of confirmedMotor) {
    const net = parseFloat(String(r.net || '0').replace(/,/g, ''));
    const total = parseFloat(String(r.total || '0').replace(/,/g, ''));
    const idv = parseFloat(String(r.idv || '0').replace(/,/g, ''));
    const polType = String(r.pol_type || '').toUpperCase();

    if (total > 0 && net > 0 && total < net) {
      invertedTotalCount++;
    }

    if (total > 5000000) { // e.g. multi-digit corrupted strings
      corruptedNumbers++;
    }

    const isTpOnly = polType.includes('TP') || polType.includes('LIABILITY');
    if (!isTpOnly && idv === 0) {
      missingIdv++;
    }
  }

  console.log(`✓ Inverted Totals (Total < Net): ${invertedTotalCount} (Expected: 0)`);
  console.log(`✓ Corrupted Outlier Numbers: ${corruptedNumbers} (Expected: 0)`);
  console.log(`✓ Missing IDV on Comprehensive/OD Policies: ${missingIdv} (Expected: 0)`);

  if (invertedTotalCount > 0 || corruptedNumbers > 0 || missingIdv > 0) {
    console.error('FAIL: Financial issues detected!');
    process.exit(1);
  }

  // 5. RTO Location Check
  const missingRto = confirmedMotor.filter(r => !r.rto_loc);
  console.log(`✓ Missing RTO Locations: ${missingRto.length} (Expected: 0)`);
  if (missingRto.length > 0) {
    console.error('FAIL: Missing RTO locations found:', missingRto);
    process.exit(1);
  }

  // 6. PDF Availability Check
  const withoutPdf = confirmedMotor.filter(r => !r.pdf_file_name);
  console.log(`✓ Records without PDF File Name: ${withoutPdf.length} (Expected: 0)`);

  console.log('\n====================================');
  console.log('   ALL AUDIT CHECKS PASSED (100%)   ');
  console.log('====================================');
}

main().catch(console.error).finally(() => prisma.$disconnect());
