require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.policyRecord.findMany({
    where: {
      deletedAt: null,
      savedAt: {
        gte: new Date('2026-09-01T00:00:00.000Z'),
        lte: new Date('2026-09-30T23:59:59.999Z')
      }
    },
    select: {
      id: true,
      pdfFileName: true,
      sourceFile: true,
      data: true,
      reviewedData: true,
    }
  });

  const motor = records.filter(r => {
    const d = { ...(r.data || {}), ...(r.reviewedData || {}) };
    const veh = (d.vehicleNumber || d.registrationNumber || '').trim();
    return Boolean(veh);
  });

  console.log(`Found ${motor.length} motor policies in September:`);
  for (const m of motor) {
    const d = { ...(m.data || {}), ...(m.reviewedData || {}) };
    console.log({
      id: m.id,
      name: d.insuredName,
      veh: d.vehicleNumber || d.registrationNumber,
      source: m.sourceFile,
      pdf: m.pdfFileName,
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
