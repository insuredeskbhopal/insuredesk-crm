require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const chaudharyRecords = await prisma.policyRecord.findMany({
    where: {
      deletedAt: null,
      OR: [
        { reviewedData: { path: ['insuredName'], string_contains: 'CHAUDHARY' } },
        { data: { path: ['insuredName'], string_contains: 'CHAUDHARY' } },
        { reviewedData: { path: ['registrationNumber'], equals: 'MP04CA2453' } },
        { data: { path: ['registrationNumber'], equals: 'MP04CA2453' } }
      ]
    },
    select: {
      id: true,
      savedAt: true,
      contactPersonName: true,
      contactPersonMobile: true,
      pdfFileName: true,
      reviewedData: true
    }
  });
  console.log('Chaudhary records found:', chaudharyRecords.length);
  chaudharyRecords.forEach(r => {
    console.log({
      id: r.id,
      savedAt: r.savedAt,
      name: r.reviewedData?.insuredName,
      reg: r.reviewedData?.registrationNumber,
      contact: r.contactPersonName,
      mobile: r.contactPersonMobile,
      pdf: r.pdfFileName
    });
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
