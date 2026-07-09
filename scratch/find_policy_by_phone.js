const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const phone = "8839707135";
  console.log(`Searching for policy records with phone containing: ${phone}`);
  
  // Search in PolicyRecord where contactNumber contains the phone
  const records = await prisma.policyRecord.findMany({
    select: {
      id: true,
      pdfFileName: true,
      selectedCompany: true,
      selectedPolicyType: true,
      renewalStatus: true,
      data: true,
      reviewedData: true
    }
  });

  const matches = [];
  for (const r of records) {
    const payload = r.reviewedData || r.data || {};
    const contactNumber = String(payload.contactNumber || payload.customerMobile || payload.phone || payload.mobileNumber || "");
    if (contactNumber.includes(phone)) {
      matches.push({
        id: r.id,
        policyNumber: payload.policyNumber,
        insuredName: payload.insuredName,
        contactNumber,
        company: payload.insuranceCompany || r.selectedCompany,
        policyType: payload.policyType || r.selectedPolicyType,
        renewalStatus: r.renewalStatus
      });
    }
  }

  console.log(`Found ${matches.length} matches:`);
  console.log(JSON.stringify(matches, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
