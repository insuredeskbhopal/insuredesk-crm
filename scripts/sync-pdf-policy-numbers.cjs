require('dotenv').config();
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== SYNCING VERIFIED PDF POLICY NUMBERS TO DATABASE ===\n');
  const results = JSON.parse(fs.readFileSync('scripts/deep_pdf_verification_results.json', 'utf8'));

  let updatedCount = 0;
  for (const item of results) {
    if (!item.leadId || !item.pdfExtracted?.policyNumber) continue;

    const currentPol = item.leadDbPol;
    const extractedPol = item.pdfExtracted.policyNumber;

    if (!currentPol || currentPol.length < 5 || currentPol !== extractedPol) {
      // Update record with verified policy number from PDF
      const currentRec = await prisma.policyRecord.findUnique({
        where: { id: item.leadId },
        select: { reviewedData: true, data: true }
      });

      if (currentRec) {
        const rev = {
          ...(currentRec.reviewedData || {}),
          policyNumber: extractedPol,
          insuranceCompany: item.pdfExtracted.insurer || currentRec.reviewedData?.insuranceCompany
        };
        const dat = {
          ...(currentRec.data || {}),
          policyNumber: extractedPol,
          insuranceCompany: item.pdfExtracted.insurer || currentRec.data?.insuranceCompany
        };

        await prisma.policyRecord.update({
          where: { id: item.leadId },
          data: {
            reviewedData: rev,
            data: dat,
            detectedPolicyType: rev.policyType,
            selectedPolicyType: rev.policyType,
            detectedCompany: rev.insuranceCompany,
            selectedCompany: rev.insuranceCompany
          }
        });

        updatedCount++;
        console.log(`✓ Updated [${item.leadId}] ${item.tableInsuredName}: Policy No. -> ${extractedPol} (from PDF)`);
      }
    }
  }

  console.log(`\n=== SYNC COMPLETE: ${updatedCount} records enriched with verified PDF policy numbers ===`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
