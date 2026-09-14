require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.policyRecord.findMany({
    where: {
      deletedAt: null,
      OR: [
        { detectedServiceCategory: { contains: 'warehouse', mode: 'insensitive' } },
        { detectedServiceCategory: { contains: 'fire', mode: 'insensitive' } },
        { selectedServiceCategory: { contains: 'warehouse', mode: 'insensitive' } },
        { selectedServiceCategory: { contains: 'fire', mode: 'insensitive' } },
        { data: { path: ['documentCategory'], string_contains: 'Warehouse' } },
        { data: { path: ['documentCategory'], string_contains: 'Fire' } },
        { data: { path: ['policyCategory'], string_contains: 'Warehouse' } },
        { data: { path: ['policyCategory'], string_contains: 'Fire' } },
      ]
    },
    select: {
      id: true,
      savedAt: true,
      contactPersonName: true,
      contactPersonMobile: true,
      data: true,
      reviewedData: true,
      pdfFileName: true
    },
    orderBy: { savedAt: 'desc' }
  });

  const junkList = [];
  for (const r of records) {
    const d = r.data || {};
    const rev = r.reviewedData || {};
    const cp = r.contactPersonName || rev.contactPerson || d.contactPerson || '';
    const cn = r.contactPersonMobile || rev.contactNumber || d.contactNumber || d.mobile || d.phoneNumber || '';
    const isJunk = cp.length > 50 || /pleasegothrough|address|bhopal|road|plot|street|46200/i.test(cp);
    if (isJunk) {
      junkList.push({
        id: r.id,
        savedAt: r.savedAt,
        file: r.pdfFileName || d.sourceFile,
        insured: d.insuredName || rev.insuredName,
        cp,
        cn
      });
    }
  }

  console.log(`Found ${junkList.length} records with JUNK contactPerson:\n`);
  for (const item of junkList) {
    console.log(`----------------------------------------`);
    console.log(`ID: ${item.id} | Saved: ${item.savedAt.toISOString().slice(0, 10)}`);
    console.log(`File: ${item.file}`);
    console.log(`Insured: ${item.insured}`);
    console.log(`Junk CP: ${item.cp.slice(0, 150)}...`);
    console.log(`CN: ${item.cn}`);
  }
}

main().finally(() => prisma.$disconnect());
