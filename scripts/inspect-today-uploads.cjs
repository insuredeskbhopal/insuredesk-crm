require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== POLICIES SAVED TODAY (14 SEPT 2026) ===');
  const todayRecords = await prisma.policyRecord.findMany({
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
      uploadedFileId: true,
      reviewedData: true,
      data: true,
      uploadedFile: {
        select: {
          id: true,
          storagePath: true,
          storageProvider: true,
          sourceFile: true
        }
      }
    },
    orderBy: { savedAt: 'desc' }
  });

  console.log(`Found ${todayRecords.length} records saved today.`);
  const recent = todayRecords.slice(0, 30);
  recent.forEach((r, idx) => {
    const name = r.reviewedData?.insuredName || r.data?.insuredName;
    const pol = r.reviewedData?.policyNumber || r.data?.policyNumber;
    const reg = r.reviewedData?.registrationNumber || r.data?.registrationNumber;
    const net = r.reviewedData?.netPremium || r.data?.netPremium;
    const gross = r.reviewedData?.totalPremium || r.data?.totalPremium;
    const cat = r.reviewedData?.documentCategory || r.data?.documentCategory;
    console.log(`${idx + 1}. [${r.id}] ${name} | Pol: ${pol} | Reg: ${reg} | Cat: ${cat} | SavedAt: ${r.savedAt.toISOString()}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
