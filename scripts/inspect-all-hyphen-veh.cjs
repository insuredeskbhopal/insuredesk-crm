require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allRecords = await prisma.$queryRaw`
    SELECT id, pdf_file_name,
           reviewed_data->>'registrationNumber' as reg,
           reviewed_data->>'vehicleNumber' as veh,
           reviewed_data->>'insuredName' as name
    FROM pdf_records
    WHERE deleted_at IS NULL
      AND (
        reviewed_data->>'registrationNumber' ~ '[- ]'
        OR reviewed_data->>'vehicleNumber' ~ '[- ]'
      )
  `;

  console.log('Total records with hyphen or space in reg/veh:', allRecords.length);
  for (const r of allRecords) {
    console.log(r.id, 'reg:', r.reg, 'veh:', r.veh, 'name:', r.name);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
