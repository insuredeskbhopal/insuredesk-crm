require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.$queryRaw`
    SELECT id, reviewed_data, data
    FROM pdf_records
    WHERE deleted_at IS NULL
      AND (
        reviewed_data::text ILIKE '%MP-04-CA-2453%'
        OR data::text ILIKE '%MP-04-CA-2453%'
      )
  `;

  console.log('Matches for text MP-04-CA-2453:', records.length);
  for (const r of records) {
    console.log(r.id);
    for (const [k, v] of Object.entries(r.reviewed_data || {})) {
      if (typeof v === 'string' && v.includes('2453')) {
        console.log(`  reviewed_data.${k} = ${v}`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
