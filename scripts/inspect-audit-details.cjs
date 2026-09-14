require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
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

  console.log('Confirmed Motor count:', confirmedMotor.length);

  const missingIdv = [];
  const missingRto = [];

  for (const r of confirmedMotor) {
    const polType = String(r.pol_type || '').toUpperCase();
    const idv = parseFloat(String(r.idv || '0').replace(/,/g, ''));
    const isTpOnly = polType.includes('TP') || polType.includes('LIABILITY') || polType.includes('THIRD PARTY');

    if (!isTpOnly && idv === 0) {
      missingIdv.push({
        id: r.id,
        name: r.name,
        veh: r.veh,
        pol_type: r.pol_type,
        pol: r.pol,
        od: r.od,
        tp: r.tp,
        company: r.company,
        pdf: r.pdf_file_name
      });
    }

    if (!r.rto_loc) {
      missingRto.push({
        id: r.id,
        name: r.name,
        veh: r.veh,
        rto: r.rto_loc
      });
    }
  }

  console.log('\n--- Missing IDV (' + missingIdv.length + ') ---');
  console.log(JSON.stringify(missingIdv, null, 2));

  console.log('\n--- Missing RTO (' + missingRto.length + ') ---');
  console.log(JSON.stringify(missingRto, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
