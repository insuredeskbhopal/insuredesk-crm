require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.$queryRaw`
    SELECT id, pdf_file_name, 
           reviewed_data->>'registrationNumber' as reg,
           reviewed_data->>'vehicleNumber' as veh,
           reviewed_data->>'insuredName' as name
    FROM pdf_records
    WHERE deleted_at IS NULL
      AND (
        reviewed_data->>'registrationNumber' ILIKE '%2453%'
        OR reviewed_data->>'vehicleNumber' ILIKE '%2453%'
      )
  `;
  console.log('Matches for 2453:', records);

  const hyphenated = await prisma.$queryRaw`
    SELECT id, pdf_file_name, 
           reviewed_data->>'registrationNumber' as reg,
           reviewed_data->>'vehicleNumber' as veh
    FROM pdf_records
    WHERE deleted_at IS NULL
      AND (
        reviewed_data->>'registrationNumber' LIKE '%-%'
        OR reviewed_data->>'vehicleNumber' LIKE '%-%'
        OR reviewed_data->>'registrationNumber' LIKE '% %'
        OR reviewed_data->>'vehicleNumber' LIKE '% %'
      )
      AND (
        reviewed_data->>'documentCategory' ILIKE '%Motor%'
        OR reviewed_data->>'registrationNumber' ~ '^[A-Za-z]{2}'
      )
  `;
  console.log('\nHyphenated/spaced motor count:', hyphenated.length);
  for (const h of hyphenated) {
    console.log(h.id, 'reg:', h.reg, 'veh:', h.veh, 'file:', h.pdf_file_name);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
