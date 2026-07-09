const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const isUuid = (val) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

async function main() {
  const query = (process.argv[2] || "8839707135").trim();
  console.log(`Searching for: ${query}`);

  try {
    if (isUuid(query)) {
      // Direct ID search
      const policy = await prisma.policyRecord.findUnique({
        where: { id: query }
      });
      if (policy) {
        const payload = policy.reviewedData || policy.data || {};
        console.log(`\nFound Policy Record by ID:`);
        console.log(`- ID: ${policy.id}`);
        console.log(`  Insured: ${payload.insuredName || ""}`);
        console.log(`  Company: ${payload.insuranceCompany || ""}`);
        console.log(`  Policy No: ${payload.policyNumber || ""}`);
        console.log(`  Expiry Date: ${payload.expiryDate || ""}`);
        console.log(`  Status: ${policy.renewalStatus || "ACTIVE"}`);
        console.log(`  Previous Policy ID: ${policy.previousPolicyId || ""}`);
        console.log(`  Renewed Policy ID: ${policy.renewedPolicyId || ""}`);
        console.log(`  Renewal Date: ${policy.renewalDate || ""}`);
        console.log(`  Created By: ${policy.createdById || ""}`);
        console.log(`  Updated By: ${policy.updatedById || ""}`);
        console.log(`  Created At: ${policy.createdAt || ""}`);
        console.log(`  Updated At: ${policy.updatedAt || ""}`);
      } else {
        console.log(`No Policy Record found with ID ${query}`);
      }
      return;
    }

    // 1. Search in CustomerProfile
    const profiles = await prisma.customerProfile.findMany({
      where: {
        OR: [
          { phone: query },
          { alternatePhone: query }
        ]
      }
    });
    console.log(`\nFound ${profiles.length} Customer Profiles:`);
    profiles.forEach(p => {
      console.log(`- ID: ${p.id}, Name: ${p.contactPersonName || p.remarks}, Phone: ${p.phone}, Status: ${p.status}, Next F/Up: ${p.nextFollowUpDate}`);
    });

    // 2. Search in PolicyRecord
    const policies = await prisma.policyRecord.findMany({
      where: {
        OR: [
          {
            reviewedData: {
              path: ["contactNumber"],
              string_contains: query
            }
          },
          {
            reviewedData: {
              path: ["customerMobile"],
              string_contains: query
            }
          },
          {
            data: {
              path: ["contactNumber"],
              string_contains: query
            }
          },
          {
            data: {
              path: ["customerMobile"],
              string_contains: query
            }
          },
          {
            reviewedData: {
              path: ["policyNumber"],
              string_contains: query
            }
          },
          {
            data: {
              path: ["policyNumber"],
              string_contains: query
            }
          }
        ]
      }
    });
    console.log(`\nFound ${policies.length} Policy Records:`);
    policies.forEach(p => {
      const payload = p.reviewedData || p.data || {};
      console.log(`- ID: ${p.id}`);
      console.log(`  Insured: ${payload.insuredName || ""}`);
      console.log(`  Company: ${payload.insuranceCompany || ""}`);
      console.log(`  Policy No: ${payload.policyNumber || ""}`);
      console.log(`  Expiry Date: ${payload.expiryDate || ""}`);
      console.log(`  Status: ${p.renewalStatus || "ACTIVE"}`);
      console.log(`  Previous Policy ID: ${p.previousPolicyId || ""}`);
      console.log(`  Renewed Policy ID: ${p.renewedPolicyId || ""}`);
      console.log(`  Renewal Date: ${p.renewalDate || ""}`);
    });

  } catch (error) {
    console.error("Error running search:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
