require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function cleanReg(val) {
  if (!val) return '';
  return String(val).replace(/[\s-]+/g, '').toUpperCase();
}

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

  console.log('--- Proposed transformations ---');
  for (const r of allRecords) {
    console.log(`${r.reg} -> ${cleanReg(r.reg)} | ${r.veh} -> ${cleanReg(r.veh)} (${r.name})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
