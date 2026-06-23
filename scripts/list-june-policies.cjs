const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Listing all June 2026 policies...");
  
  // June starts on June 1st, 2026 and ends on June 30th, 2026
  const startOfJune = new Date("2026-06-01T00:00:00.000Z");
  const endOfJune = new Date("2026-06-30T23:59:59.999Z");

  const records = await prisma.policyRecord.findMany({
    where: {
      savedAt: {
        gte: startOfJune,
        lte: endOfJune
      }
    },
    select: {
      id: true,
      savedAt: true,
      selectedServiceCategory: true,
      detectedServiceCategory: true,
      selectedPolicyType: true,
      detectedPolicyType: true,
      pdfFileName: true,
      selectedCompany: true,
      detectedCompany: true
    },
    orderBy: {
      savedAt: "asc"
    }
  });

  console.log(`Total June policies found: ${records.length}`);
  records.forEach((r, i) => {
    console.log(`[${i + 1}] ID: ${r.id}
    File: ${r.pdfFileName}
    Sel Cat: ${r.selectedServiceCategory} | Det Cat: ${r.detectedServiceCategory}
    Sel Type: ${r.selectedPolicyType} | Det Type: ${r.detectedPolicyType}
    Company: ${r.selectedCompany || r.detectedCompany}
    SavedAt: ${r.savedAt.toISOString()}\n`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
