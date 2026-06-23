const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Fetching motor records...");
  const records = await prisma.policyRecord.findMany({
    where: {
      OR: [
        { selectedServiceCategory: { equals: "motor", mode: "insensitive" } },
        { detectedServiceCategory: { equals: "motor", mode: "insensitive" } },
        { selectedPolicyType: { contains: "motor", mode: "insensitive" } },
        { detectedPolicyType: { contains: "motor", mode: "insensitive" } }
      ]
    },
    select: {
      id: true,
      savedAt: true,
      createdAt: true,
      selectedServiceCategory: true,
      detectedServiceCategory: true,
      selectedPolicyType: true,
      pdfFileName: true
    }
  });

  console.log(`Found ${records.length} motor records.`);
  records.forEach((r, i) => {
    console.log(`[${i + 1}] ID: ${r.id} | Name: ${r.pdfFileName} | Service Category: ${r.selectedServiceCategory || r.detectedServiceCategory} | Policy Type: ${r.selectedPolicyType} | SavedAt: ${r.savedAt.toISOString()} | CreatedAt: ${r.createdAt.toISOString()}`);
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
