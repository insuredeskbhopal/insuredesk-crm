const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Finding all non-motor policies in June 2026...");
  
  const startOfJune = new Date("2026-06-01T00:00:00.000Z");
  const endOfJune = new Date("2026-06-30T23:59:59.999Z");

  const records = await prisma.policyRecord.findMany({
    where: {
      savedAt: {
        gte: startOfJune,
        lte: endOfJune
      },
      NOT: {
        OR: [
          { selectedServiceCategory: { contains: "motor", mode: "insensitive" } },
          { detectedServiceCategory: { contains: "motor", mode: "insensitive" } },
          { selectedPolicyType: { contains: "motor", mode: "insensitive" } },
          { detectedPolicyType: { contains: "motor", mode: "insensitive" } },
          { selectedPolicyType: { contains: "car", mode: "insensitive" } },
          { detectedPolicyType: { contains: "car", mode: "insensitive" } },
          { selectedPolicyType: { contains: "wheeler", mode: "insensitive" } },
          { detectedPolicyType: { contains: "wheeler", mode: "insensitive" } },
          { selectedPolicyType: { contains: "vehicle", mode: "insensitive" } },
          { detectedPolicyType: { contains: "vehicle", mode: "insensitive" } }
        ]
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

  console.log(`Total non-motor policies in June: ${records.length}`);
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
