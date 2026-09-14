require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const r = await prisma.policyRecord.findUnique({
    where: { id: '12ae5ead-18dd-44b0-9a76-d898d6fb69d8' }
  });
  console.log('--- DATA CONTACT PERSON ---');
  console.log(r.data?.contactPerson);
  console.log('--- DATA CONTACT NUMBER ---');
  console.log(r.data?.contactNumber);
  console.log('--- ALL KEYS IN DATA ---');
  console.log(Object.keys(r.data || {}));
}

main().finally(() => prisma.$disconnect());
