require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ids = [
    'f9070176-7ae0-4bb0-8d18-3eb833e1fa9e',
    '12ae5ead-18dd-44b0-9a76-d898d6fb69d8',
    'adc0eb73-f643-4cb9-a20d-5245281e3975',
    '3f6a4820-3a7d-4a3d-9cb4-638ea42b7314',
    '444c6c1f-dd9d-4a1c-8a73-0233f520cb75',
    '86f27295-2e3b-4924-a568-c82c93a50479',
    '34c0c631-ab42-4c4e-8ff6-919328831336',
    '1029e3ee-092b-43f2-9e45-de81dd3f166c',
    'fcb3eb1c-8ada-486a-8a1c-c729d7383feb',
    '2165e159-ba92-40a1-9e04-86996d2769c0',
    '3f081f6b-a5e4-42ed-8b4c-b5cd90f0547f'
  ];

  for (const id of ids) {
    const r = await prisma.policyRecord.findUnique({ where: { id } });
    const text = r.data?.sourceText || '';
    console.log(`\n========================================`);
    console.log(`ID: ${id}`);
    console.log(`File: ${r.pdfFileName || r.data?.sourceFile}`);
    console.log(`Insured: ${r.data?.insuredName}`);
    
    // Search for mobile numbers (10 digits starting with 6, 7, 8, 9)
    const mobiles = text.match(/\b[6-9]\d{9}\b/g) || [];
    // Search for contact / mobile / phone / tel labels
    const phoneLines = text.split('\n').filter(l => /mobile|phone|contact|tel\b|proprietor|prop\b/i.test(l));
    console.log(`Phone/Contact lines:`, phoneLines.slice(0, 10));
    console.log(`Extracted 10-digit numbers:`, [...new Set(mobiles)]);
  }
}

main().finally(() => prisma.$disconnect());
