const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const renewedPolicies = await prisma.policyRecord.findMany({
      where: {
        renewalStatus: "RENEWED"
      },
      select: {
        id: true,
        renewalStatus: true,
        organizationId: true,
        createdById: true,
        pdfFileName: true,
        sourceFile: true,
        createdAt: true,
        data: true,
      }
    });

    console.log(`Found ${renewedPolicies.length} total RENEWED policy records in DB:`);
    for (const p of renewedPolicies) {
      const payload = p.data || {};
      console.log(`- ID: ${p.id}`);
      console.log(`  Insured: ${payload.insuredName || ""}`);
      console.log(`  Policy No: ${payload.policyNumber || ""}`);
      console.log(`  Premium: ${payload.premium || payload.netPremium || ""}`);
      console.log(`  Org ID: ${p.organizationId}`);
      console.log(`  Created By ID: ${p.createdById}`);
      console.log(`  Source File: ${p.sourceFile}`);
      console.log(`  Created At: ${p.createdAt}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
