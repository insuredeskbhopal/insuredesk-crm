require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { extractIciciWarehouseMsme } = require('../src/lib/policies/pdf/parsers/icici/index.cjs');

async function main() {
  const r = await prisma.policyRecord.findUnique({
    where: { id: '12ae5ead-18dd-44b0-9a76-d898d6fb69d8' }
  });
  const text = r.data.sourceText;
  const iciciWarehouse = extractIciciWarehouseMsme(text, r.data.sourceFile || 'test.pdf');
  console.log('iciciWarehouse.documentDetected:', iciciWarehouse.documentDetected);
  console.log('iciciWarehouse.insuredName:', JSON.stringify(iciciWarehouse.insuredName));
}

main().finally(() => prisma.$disconnect());
