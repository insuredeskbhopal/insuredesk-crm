require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CONTACT_PERSON = 'Arjun Nair';
const CONTACT_NUMBER = '9111111692';

async function main() {
  // Find all LION ENGINEERING records via data JSON insuredName
  const records = await prisma.policyRecord.findMany({
    where: {
      deletedAt: null,
      OR: [
        { data: { path: ['insuredName'], string_contains: 'LION ENGINEERING' } },
        { pdfFileName: { contains: 'LION', mode: 'insensitive' } },
      ],
    },
    select: { id: true, contactPersonName: true, contactPersonMobile: true, data: true, pdfFileName: true },
  });

  console.log(`Found ${records.length} LION record(s).`);

  for (const r of records) {
    const insured = r.data?.insuredName || r.pdfFileName || r.id;
    console.log(`  ID: ${r.id} | Insured: ${insured}`);
    console.log(`    Before: name="${r.contactPersonName}" mobile="${r.contactPersonMobile}"`);

    await prisma.policyRecord.update({
      where: { id: r.id },
      data: {
        contactPersonName: CONTACT_PERSON,
        contactPersonMobile: CONTACT_NUMBER,
      },
    });

    console.log(`    After:  name="${CONTACT_PERSON}" mobile="${CONTACT_NUMBER}"`);
  }

  console.log('\nDone. All LION records updated.');
}

main().finally(() => prisma.$disconnect());
