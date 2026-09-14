require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ids = [
    '763d2d36-f332-4826-bd81-93bc0a20fd4b',
    'd180d116-d904-4187-ac2e-61ceaba475d4',
    '3e6c15ba-708d-4c3c-b906-5ed2e66b51ab'
  ];

  for (const id of ids) {
    const recs = await prisma.$queryRaw`SELECT * FROM pdf_records WHERE id = ${id}::uuid`;
    const rec = recs[0];
    console.log('ID:', id);
    console.log('File:', rec.pdf_file_name);
    console.log('Reviewed Data:', {
      category: rec.reviewed_data?.documentCategory,
      insuredName: rec.reviewed_data?.insuredName,
      policyType: rec.reviewed_data?.policyType,
      registrationNumber: rec.reviewed_data?.registrationNumber,
      netPremium: rec.reviewed_data?.netPremium,
      totalPremium: rec.reviewed_data?.totalPremium,
      rtoLocation: rec.reviewed_data?.rtoLocation
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
