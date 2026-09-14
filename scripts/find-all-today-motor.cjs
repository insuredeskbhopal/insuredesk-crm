require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allToday = await prisma.policyRecord.findMany({
    where: {
      deletedAt: null,
      savedAt: {
        gte: new Date('2026-09-14T00:00:00.000Z'),
        lte: new Date('2026-09-14T23:59:59.999Z')
      }
    },
    select: {
      id: true,
      savedAt: true,
      createdAt: true,
      contactPersonName: true,
      contactPersonMobile: true,
      pdfFileName: true,
      detectedServiceCategory: true,
      selectedServiceCategory: true,
      reviewedData: true,
      data: true
    }
  });

  const motorToday = allToday.filter(r => {
    const cat = r.selectedServiceCategory || r.detectedServiceCategory || r.reviewedData?.documentCategory || r.data?.documentCategory;
    const reg = r.reviewedData?.registrationNumber || r.data?.registrationNumber;
    const type = r.reviewedData?.policyType || r.data?.policyType || '';
    return cat === 'Motor Insurance' || Boolean(reg) || type.toLowerCase().includes('car') || type.toLowerCase().includes('two wheeler') || type.toLowerCase().includes('motor');
  });

  console.log(`Total records saved today: ${allToday.length}`);
  console.log(`Motor records saved today: ${motorToday.length}`);
  motorToday.forEach((r, idx) => {
    const name = r.reviewedData?.insuredName || r.data?.insuredName;
    const pol = r.reviewedData?.policyNumber || r.data?.policyNumber;
    const reg = r.reviewedData?.registrationNumber || r.data?.registrationNumber;
    console.log(`${idx + 1}. [${r.id}] ${name} | Pol: ${pol} | Reg: ${reg} | SavedAt: ${r.savedAt.toISOString()}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
