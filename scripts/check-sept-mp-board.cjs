require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const r = await prisma.policyRecord.findFirst({
    where: {
      sourceFile: { contains: 'NSD4WXE0247' }
    }
  });
  console.log('September MP Board:', {
    id: r.id,
    insuredName: r.data.insuredName,
    registrationNumber: r.data.registrationNumber,
    vehicleNumber: r.data.vehicleNumber,
    makeModel: r.data.makeModel,
    chassisNumber: r.data.chassisNumber,
    engineNumber: r.data.engineNumber,
    policyNumber: r.data.policyNumber,
    netPremium: r.data.netPremium,
    grossPremium: r.data.grossPremium,
    contactPerson: r.data.contactPerson,
    contactNumber: r.data.contactNumber,
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
