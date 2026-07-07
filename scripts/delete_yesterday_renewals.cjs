const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Starting deletion of yesterday's renewal imports...");

  const targetSourceFile = "Non_Motor_July_2026_Renewal_Data (1).xlsx";
  const startDate = new Date("2026-07-06T00:00:00.000Z");
  const endDate = new Date("2026-07-06T23:59:59.999Z");

  const deleteResult = await prisma.policyRecord.deleteMany({
    where: {
      extractionMethod: "renewal_excel_import",
      sourceFile: targetSourceFile,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  console.log(`\nSuccessfully deleted ${deleteResult.count} records matching:`);
  console.log(`- Method: renewal_excel_import`);
  console.log(`- File: ${targetSourceFile}`);
  console.log(`- Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
}

main()
  .catch((err) => {
    console.error("Error during deletion execution:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
