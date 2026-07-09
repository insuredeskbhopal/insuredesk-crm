const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const ids = [
    "9b6e755a-975d-429e-8223-da67e3e5202f", // ANURAAG
    "22097ba8-6dc1-49d3-9c5a-4bc85dca1611"  // SAGUN KUMAR
  ];

  try {
    for (const id of ids) {
      const policy = await prisma.policyRecord.findUnique({
        where: { id }
      });
      if (!policy) {
        console.log(`\nPolicy ${id} not found.`);
        continue;
      }
      console.log(`\n======================================================`);
      console.log(`POLICY ID: ${policy.id}`);
      console.log(`Saved At: ${policy.savedAt}`);
      console.log(`Created At: ${policy.createdAt}`);
      console.log(`Updated At: ${policy.updatedAt}`);
      console.log(`Created By ID: ${policy.createdById}`);
      console.log(`Updated By ID: ${policy.updatedById}`);
      console.log(`PDF File Name: ${policy.pdfFileName}`);
      console.log(`Source File: ${policy.sourceFile}`);
      console.log(`Renewal Status: ${policy.renewalStatus}`);
      console.log(`Renewed Policy ID: ${policy.renewedPolicyId}`);
      console.log(`Previous Policy ID: ${policy.previousPolicyId}`);
      console.log(`------------------------------------------------------`);
      console.log(`DATA JSON:`);
      console.log(JSON.stringify(policy.data, null, 2));
      console.log(`------------------------------------------------------`);
      console.log(`REVIEWED DATA JSON:`);
      console.log(JSON.stringify(policy.reviewedData, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
