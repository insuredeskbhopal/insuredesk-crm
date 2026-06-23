const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Grouping June 2026 motor policies by creator...");
  
  const startOfJune = new Date("2026-06-01T00:00:00.000Z");
  const endOfJune = new Date("2026-06-30T23:59:59.999Z");

  const records = await prisma.policyRecord.findMany({
    where: {
      savedAt: {
        gte: startOfJune,
        lte: endOfJune
      },
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
    },
    select: {
      id: true,
      createdById: true,
      createdBy: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  console.log(`Total June motor policies: ${records.length}`);
  const groups = {};
  records.forEach((r) => {
    const creator = r.createdBy ? `${r.createdBy.name} (${r.createdBy.email})` : "Unknown";
    groups[creator] = (groups[creator] || 0) + 1;
  });

  console.log("Groups:", groups);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
