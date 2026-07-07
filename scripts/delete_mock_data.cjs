const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Starting deletion of test template mock data...");

  const targetFiles = ["renewal_template.xlsx", "generic_renewal_template.xlsx"];

  const deleteResult = await prisma.policyRecord.deleteMany({
    where: {
      OR: [
        { sourceFile: { in: targetFiles } },
        { pdfFileName: { in: targetFiles } },
      ],
    },
  });

  console.log(`\nSuccessfully deleted ${deleteResult.count} test records from the database.`);
}

main()
  .catch((err) => {
    console.error("Error during mock deletion execution:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
