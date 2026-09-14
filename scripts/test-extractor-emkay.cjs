require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { extractPolicyFromText } = require('../src/lib/policies/pdf/extractor.cjs');

async function main() {
  const r = await prisma.policyRecord.findUnique({
    where: { id: '12ae5ead-18dd-44b0-9a76-d898d6fb69d8' }
  });
  const ext = extractPolicyFromText(r.data.sourceText, r.data.sourceFile || 'test.pdf');
  console.log('sourceDocumentType:', ext.sourceDocumentType);
  console.log('documentFormat:', ext.documentFormat);
  console.log('documentCategory:', ext.documentCategory);
  console.log('extractionTrainingVersion:', ext.extractionTrainingVersion);
  console.log('insuranceCompany:', ext.insuranceCompany);
}

main().finally(() => prisma.$disconnect());
