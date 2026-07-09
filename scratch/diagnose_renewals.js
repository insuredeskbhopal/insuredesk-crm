const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.policyRecord.findMany({
    where: {
      renewalStatus: "RENEWED"
    },
    select: {
      id: true,
      renewalStatus: true,
      renewalDate: true,
      renewedPolicyId: true,
      pdfFileName: true,
      data: true,
      reviewedData: true
    }
  });

  console.log(`Found ${records.length} records with RENEWED status:`);
  for (const r of records) {
    const payload = r.reviewedData || r.data || {};
    console.log(`- Policy ID: ${r.id}`);
    console.log(`  Policy Number: ${payload.policyNumber}`);
    console.log(`  Insured Name: ${payload.insuredName}`);
    console.log(`  renewalStatus: ${r.renewalStatus}`);
    console.log(`  renewalDate: ${r.renewalDate}`);
    console.log(`  renewedPolicyId: ${r.renewedPolicyId}`);
    if (r.renewedPolicyId) {
      const renewedRec = await prisma.policyRecord.findUnique({
        where: { id: r.renewedPolicyId },
        select: { id: true, createdAt: true, savedAt: true, data: true, reviewedData: true }
      });
      if (renewedRec) {
        const rp = renewedRec.reviewedData || renewedRec.data || {};
        console.log(`  Renewed Policy Number: ${rp.policyNumber}`);
        console.log(`  Renewed Policy savedAt: ${renewedRec.savedAt}`);
        console.log(`  Renewed Policy createdAt: ${renewedRec.createdAt}`);
      } else {
        console.log(`  Renewed Policy Record not found in DB!`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
