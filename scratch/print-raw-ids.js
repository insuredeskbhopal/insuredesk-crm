const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const ids = {
    ANURAAG: "9b6e755a-975d-429e-8223-da67e3e5202f",
    SAGUN: "22097ba8-6dc1-49d3-9c5a-4bc85dca1611"
  };

  try {
    for (const [name, id] of Object.entries(ids)) {
      const p = await prisma.policyRecord.findUnique({
        where: { id },
        select: {
          id: true,
          renewalStatus: true,
          previousPolicyId: true,
          renewedPolicyId: true,
          pdfFileName: true,
          sourceFile: true,
        }
      });
      console.log(`\nPolicy: ${name}`);
      console.log(`- ID: ${p?.id}`);
      console.log(`- Status: ${p?.renewalStatus}`);
      console.log(`- previousPolicyId: ${p?.previousPolicyId}`);
      console.log(`- renewedPolicyId: ${p?.renewedPolicyId}`);
      console.log(`- pdfFileName: ${p?.pdfFileName}`);
      console.log(`- sourceFile: ${p?.sourceFile}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
