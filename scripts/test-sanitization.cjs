require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function isJunkContact(val) {
  if (!val) return true;
  const s = String(val).trim();
  if (s.length === 0 || s === '-') return true;
  if (s.length > 50) return true;
  if (/pleasegothrough|discrepanc|rectification|letter|formatandalso|documenttoensure/i.test(s)) return true;
  if (/\b(?:road|street|plot|ward|behind|near|teh|dist|madhya|bhopal|462001|458888)\b/i.test(s)) return true;
  if (/e-mail id|fax:|issuing office/i.test(s)) return true;
  return false;
}

async function main() {
  const records = await prisma.policyRecord.findMany({
    where: {
      deletedAt: null,
      OR: [
        { data: { path: ['documentCategory'], string_contains: 'Warehouse' } },
        { data: { path: ['documentCategory'], string_contains: 'Fire' } },
        { data: { path: ['policyCategory'], string_contains: 'Warehouse' } },
        { data: { path: ['policyCategory'], string_contains: 'Fire' } },
      ]
    },
    select: {
      id: true,
      contactPersonName: true,
      contactPersonMobile: true,
      data: true,
      reviewedData: true
    }
  });

  console.log(`Testing sanitization against ${records.length} records:`);
  let junkCount = 0;
  let validCount = 0;

  for (const r of records) {
    const d = r.data || {};
    const rev = r.reviewedData || {};
    const cp = r.contactPersonName || rev.contactPerson || d.contactPerson || '';
    if (isJunkContact(cp)) {
      junkCount++;
      console.log(`[FILTERED JUNK] ${d.insuredName} -> "${cp.slice(0, 60)}..."`);
    } else {
      validCount++;
      console.log(`[KEPT VALID]    ${d.insuredName} -> "${cp}"`);
    }
  }

  console.log(`\nResults: ${validCount} valid contact persons kept, ${junkCount} junk contact persons filtered.`);
}

main().finally(() => prisma.$disconnect());
