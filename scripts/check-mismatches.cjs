require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Checking Sanjay Kumar Soni and Sunil Chaudhary ===');
  const soniRecords = await prisma.policyRecord.findMany({
    where: {
      deletedAt: null,
      OR: [
        { reviewedData: { path: ['insuredName'], string_contains: 'SANJAY KUMAR SONI' } },
        { data: { path: ['insuredName'], string_contains: 'SANJAY KUMAR SONI' } },
        { reviewedData: { path: ['registrationNumber'], equals: 'MP37C5791' } },
        { reviewedData: { path: ['registrationNumber'], equals: 'MP04CA2453' } }
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
  console.log('Soni/Chaudhary records found:', soniRecords.length);
  soniRecords.forEach(r => {
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

  console.log('\n=== Checking Vijay Kumar Mishra records ===');
  const vkmRecords = await prisma.policyRecord.findMany({
    where: {
      deletedAt: null,
      OR: [
        { reviewedData: { path: ['insuredName'], string_contains: 'VIJAY' } },
        { data: { path: ['insuredName'], string_contains: 'VIJAY' } }
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
  console.log('VKM records found:', vkmRecords.length);
  vkmRecords.forEach(r => {
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
