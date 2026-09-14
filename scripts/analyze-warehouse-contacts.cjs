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

  console.log(`Analyzing ${records.length} warehouse/fire records:\n`);
  for (const r of records) {
    const d = r.data || {};
    const rev = r.reviewedData || {};
    const cp = r.contactPersonName || rev.contactPerson || d.contactPerson || '';
    const cn = r.contactPersonMobile || rev.contactNumber || d.contactNumber || d.mobile || d.phoneNumber || '';
    const isJunk = cp.length > 50 || /pleasegothrough|address|bhopal|road|plot|street|46200/i.test(cp);
    console.log(`ID: ${r.id}`);
    console.log(`  Insured: ${d.insuredName || rev.insuredName}`);
    console.log(`  CP: ${JSON.stringify(cp.slice(0, 70))}${cp.length > 70 ? '...' : ''} ${isJunk ? '[JUNK!]' : '[OK]'}`);
    console.log(`  CN: ${JSON.stringify(cn)}`);
  }
}

main().finally(() => prisma.$disconnect());
