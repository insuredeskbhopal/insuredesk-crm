require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const r = await prisma.policyRecord.findFirst({
    where: { data: { path: ['insuredName'], string_contains: 'MP BOARD' } }
  });
  console.log('MP Board:', {
    insuredName: r.data.insuredName,
    registrationNumber: r.data.registrationNumber,
    vehicleNumber: r.data.vehicleNumber,
    makeModel: r.data.makeModel,
    chassisNumber: r.data.chassisNumber,
    engineNumber: r.data.engineNumber
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
