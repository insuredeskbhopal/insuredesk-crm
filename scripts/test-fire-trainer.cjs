require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const trainer = require('../src/lib/policies/pdf/training/icici-lombard/fire.cjs');

async function main() {
  const r = await prisma.policyRecord.findUnique({
    where: { id: '12ae5ead-18dd-44b0-9a76-d898d6fb69d8' }
  });
  const text = r.data.sourceText;
  const patch = trainer.train({ text, result: {} });
  console.log('PATCH contactPerson:', JSON.stringify(patch.contactPerson));
  console.log('PATCH insuredName:', JSON.stringify(patch.insuredName));
  console.log('PATCH contactNumber:', JSON.stringify(patch.contactNumber));

  // Let's test what propMatch matched
  const propMatch =
    text.match(/PROP(?:RIETOR)?\.?\s+([A-Za-z\s]+?)(?:,|\s+JASALPUR|\s+TEH|\s+DIST|\s+MADHYA|\n)/i) ||
    text.match(/Contact\s+Person\s*[:\s]*([^\n]+)/i);
  console.log('propMatch full:', propMatch ? propMatch[0] : null);
  console.log('propMatch group 1:', propMatch ? propMatch[1] : null);
}

main().finally(() => prisma.$disconnect());
