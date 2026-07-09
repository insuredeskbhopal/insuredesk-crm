const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const totalCount = await prisma.policyRecord.count();
    const excelCount = await prisma.policyRecord.count({
      where: {
        extractionMethod: "renewal_excel_import"
      }
    });

    console.log("Total Policy Records in DB:", totalCount);
    console.log("Excel-imported Policy Records in DB:", excelCount);

    // Let's get unique statuses of the excel-imported policies
    const groups = await prisma.policyRecord.groupBy({
      by: ["renewalStatus"],
      where: {
        extractionMethod: "renewal_excel_import"
      },
      _count: {
        id: true
      }
    });
    console.log("Excel-imported policies status distribution:");
    console.log(groups);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
