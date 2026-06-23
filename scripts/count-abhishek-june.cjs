const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const userId = "30f1e9c6-7b55-4b49-a1c6-748a42df0fd8"; // Abhishek Verma
  console.log(`Checking June 2026 policies created by Abhishek Verma (${userId})...`);
  
  const startOfJune = new Date("2026-06-01T00:00:00.000Z");
  const endOfJune = new Date("2026-06-30T23:59:59.999Z");

  const records = await prisma.policyRecord.findMany({
    where: {
      createdById: userId,
      savedAt: {
        gte: startOfJune,
        lte: endOfJune
      }
    },
    select: {
      id: true,
      savedAt: true,
      pdfFileName: true,
      selectedServiceCategory: true,
      detectedServiceCategory: true,
      selectedPolicyType: true,
      detectedPolicyType: true,
    }
  });

  console.log(`Found ${records.length} June policies created by Abhishek Verma.`);
  records.forEach((r, i) => {
    console.log(`[${i + 1}] ID: ${r.id} | File: ${r.pdfFileName} | Cat: ${r.selectedServiceCategory || r.detectedServiceCategory} | Type: ${r.selectedPolicyType || r.detectedPolicyType} | SavedAt: ${r.savedAt.toISOString()}`);
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
