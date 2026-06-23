const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Checking database policy counts by month...");
  
  const startOfMay = new Date("2026-05-01T00:00:00.000Z");
  const endOfMay = new Date("2026-05-31T23:59:59.999Z");
  const startOfJune = new Date("2026-06-01T00:00:00.000Z");
  const endOfJune = new Date("2026-06-30T23:59:59.999Z");

  const mayCount = await prisma.policyRecord.count({
    where: {
      savedAt: { gte: startOfMay, lte: endOfMay }
    }
  });

  const juneCount = await prisma.policyRecord.count({
    where: {
      savedAt: { gte: startOfJune, lte: endOfJune }
    }
  });

  console.log(`May 2026 count: ${mayCount}`);
  console.log(`June 2026 count: ${juneCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
