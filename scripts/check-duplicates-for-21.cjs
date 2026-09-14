require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const regList = [
  'MP04ZL6963',
  'MP04CJ2645',
  'MP04EB7507',
  'MP04CT2032',
  'MP04CP6963',
  'MP04CX5642',
  'MP04BA4360',
  'MP04SF1726',
  'MP04YB2059',
  'MP04CN1498',
  'MP04UG1132',
  'MP04KG0802',
  'MP09KD6546',
  'MP09KD6564',
  'MP04CL5420',
  'MP07ZC1277',
  'MP04ZA1437',
  'MP04CT2003',
  'MP04YA8427',
  'MP04EC5499',
  'MP09ZS9904',
  'MP04UC1162'
];

async function main() {
  console.log('=== CHECKING ALL RECORDS FOR THESE 21 VEHICLES ===');
  const all = await prisma.policyRecord.findMany({
    where: {
      deletedAt: null
    },
    select: {
      id: true,
      savedAt: true,
      createdAt: true,
      pdfFileName: true,
      uploadedFileId: true,
      reviewedData: true,
      data: true
    }
  });

  for (const reg of regList) {
    const matched = all.filter(r => {
      const rReg = ((r.reviewedData?.registrationNumber || r.data?.registrationNumber || '')).replace(/[^A-Za-z0-9]/g, '').toUpperCase().replace('MP004', 'MP04');
      return rReg === reg;
    });
    console.log(`Vehicle ${reg}: ${matched.length} records found`);
    matched.forEach(m => {
      console.log(`  - [${m.id}] SavedAt: ${m.savedAt.toISOString()}, Name: ${m.reviewedData?.insuredName}, PDF: ${m.pdfFileName}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
