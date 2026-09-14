require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.$queryRaw`
    SELECT 
      id,
      pdf_file_name,
      reviewed_data->>'documentCategory' AS cat,
      reviewed_data->>'registrationNumber' AS veh,
      reviewed_data->>'insuredName' AS name,
      reviewed_data->>'policyType' AS pol_type,
      reviewed_data->>'idv' AS idv
    FROM pdf_records
    WHERE deleted_at IS NULL
      AND saved_at >= '2026-08-01'
      AND saved_at <= '2026-08-31T23:59:59.999Z'
  `;

  // Count by category
  const catCount = {};
  for (const r of records) {
    const c = r.cat || 'UNKNOWN';
    catCount[c] = (catCount[c] || 0) + 1;
  }
  console.log('Categories breakdown:', catCount);

  const motor = records.filter(r => (r.cat && r.cat.toLowerCase().includes('motor')) || (r.veh && /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/i.test(r.veh.replace(/\s+/g, ''))));
  console.log('Real motor records:', motor.length);

  const missingIdvMotor = motor.filter(r => {
    const polType = String(r.pol_type || '').toUpperCase();
    const isTpOnly = polType.includes('TP') || polType.includes('LIABILITY') || polType.includes('THIRD PARTY');
    const idv = parseFloat(String(r.idv || '0').replace(/,/g, ''));
    return !isTpOnly && idv === 0;
  });

  console.log('Real motor missing IDV (Comprehensive/OD):', missingIdvMotor.length);
  for (const m of missingIdvMotor) {
    console.log(m.id, m.name, m.veh, m.pol_type, m.idv, m.pdf_file_name);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
