const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const source = "Non_Motor_July_2026_Renewal_Data (1).xlsx";
    const count = await prisma.policyRecord.count({
      where: {
        OR: [
          { sourceFile: source },
          { pdfFileName: source }
        ]
      }
    });
    console.log(`Found ${count} records from source file "${source}" in the database.`);

    const sample = await prisma.policyRecord.findFirst({
      where: {
        OR: [
          { sourceFile: source },
          { pdfFileName: source }
        ]
      }
    });
    if (sample) {
      console.log("Sample record status:", sample.renewalStatus);
      console.log("Sample record details:", JSON.stringify(sample.data, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
