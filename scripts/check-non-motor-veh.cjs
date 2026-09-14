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
      reviewed_data->>'policyType' AS pol_type
    FROM pdf_records
    WHERE deleted_at IS NULL
      AND saved_at >= '2026-08-01'
      AND saved_at <= '2026-08-31T23:59:59.999Z'
  `;

  console.log('Total August records:', records.length);
  const nonMotorWithVeh = records.filter(r => r.cat && !r.cat.toLowerCase().includes('motor') && r.veh);
  console.log('Non-motor records with registrationNumber:', nonMotorWithVeh.length);
  for (const r of nonMotorWithVeh) {
    console.log(r.id, r.cat, r.veh, r.pdf_file_name);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
