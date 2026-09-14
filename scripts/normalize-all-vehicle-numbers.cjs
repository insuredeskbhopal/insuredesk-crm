require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function cleanReg(val) {
  if (!val) return val;
  return String(val).replace(/[\s-]+/g, '').toUpperCase();
}

async function main() {
  console.log('=== Normalizing Vehicle Registration Numbers ===\n');

  const records = await prisma.$queryRaw`
    SELECT id, pdf_file_name, reviewed_data, data
    FROM pdf_records
    WHERE deleted_at IS NULL
      AND (
        reviewed_data->>'registrationNumber' ~ '[- ]'
        OR reviewed_data->>'vehicleNumber' ~ '[- ]'
        OR data->>'registrationNumber' ~ '[- ]'
        OR data->>'vehicleNumber' ~ '[- ]'
      )
  `;

  console.log(`Found ${records.length} records with hyphens/spaces in vehicle numbers.\n`);

  let updatedCount = 0;

  for (const r of records) {
    const rev = { ...(r.reviewed_data || {}) };
    const dat = { ...(r.data || {}) };

    const oldReg = rev.registrationNumber || dat.registrationNumber;
    const oldVeh = rev.vehicleNumber || dat.vehicleNumber;

    if (rev.registrationNumber) rev.registrationNumber = cleanReg(rev.registrationNumber);
    if (rev.vehicleNumber) rev.vehicleNumber = cleanReg(rev.vehicleNumber);

    if (dat.registrationNumber) dat.registrationNumber = cleanReg(dat.registrationNumber);
    if (dat.vehicleNumber) dat.vehicleNumber = cleanReg(dat.vehicleNumber);

    const newReg = rev.registrationNumber || dat.registrationNumber;
    const newVeh = rev.vehicleNumber || dat.vehicleNumber;

    await prisma.$queryRaw`
      UPDATE pdf_records
      SET 
        reviewed_data = ${JSON.stringify(rev)}::jsonb,
        data = ${JSON.stringify(dat)}::jsonb,
        updated_at = NOW()
      WHERE id = ${r.id}::uuid
    `;

    console.log(`✓ ID ${r.id}: [${oldReg} / ${oldVeh}] -> [${newReg} / ${newVeh}] (${rev.insuredName || 'N/A'})`);
    updatedCount++;
  }

  console.log(`\nSuccessfully updated ${updatedCount} records to clean format.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
