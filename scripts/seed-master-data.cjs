const { PrismaClient } = require("@prisma/client");
const { INSURANCE_COMPANY_MASTER } = require("../lib/master/insurance-companies.cjs");

const prisma = new PrismaClient();

const bankSources = ["HDFC Bank", "SBI", "ICICI Bank", "Direct Client", "Broker Channel"];
const categories = [
  ["Vehicle Insurance", ["vehicle", "motor", "chassis", "engine", "idv"]],
  ["Health Insurance", ["health", "tpa", "hospitalization", "mediclaim"]],
  ["Life Insurance", ["life assured", "nominee", "sum assured"]],
  ["Commercial Insurance", ["fire", "stock", "building", "machinery", "marine", "liability"]],
  ["Cyber Insurance", ["cyber", "data breach", "ransomware"]],
  ["Travel Insurance", ["travel", "passport", "trip", "baggage"]]
];

const policyTypes = [
  ["Vehicle Insurance", "Car Insurance", ["vehicle number", "registration no", "chassis no", "engine no", "idv"]],
  ["Vehicle Insurance", "Bike Insurance", ["two wheeler", "bike", "registration no"]],
  ["Vehicle Insurance", "Commercial Vehicle", ["commercial vehicle", "permit", "fitness"]],
  ["Commercial Insurance", "Fire Policy", ["fire", "building", "stock", "risk location"]],
  ["Commercial Insurance", "Marine Policy", ["marine", "cargo", "transit"]],
  ["Commercial Insurance", "Liability Policy", ["liability", "indemnity", "third party"]],
  ["Health Insurance", "Individual Health", ["individual health", "tpa"]],
  ["Health Insurance", "Family Floater", ["family floater", "members covered"]],
  ["Health Insurance", "Group Mediclaim", ["group mediclaim", "employee"]]
];

async function main() {
  for (const name of bankSources) {
    await prisma.bankSource.upsert({ where: { name }, update: { active: true }, create: { name, aliases: [] } });
  }

  for (const company of INSURANCE_COMPANY_MASTER) {
    await prisma.insuranceCompany.upsert({
      where: { name: company.name },
      update: { aliases: company.aliases, active: company.active },
      create: { name: company.name, aliases: company.aliases, active: company.active }
    });
  }

  for (const [name, keywords] of categories) {
    await prisma.serviceCategory.upsert({
      where: { name },
      update: { keywords, active: true },
      create: { name, aliases: [], keywords }
    });
  }

  for (const [categoryName, policyName, keywords] of policyTypes) {
    const category = await prisma.serviceCategory.findUnique({ where: { name: categoryName } });
    if (!category) continue;
    const existing = await prisma.policyType.findFirst({
      where: { name: policyName, serviceCategoryId: category.id, insuranceCompanyId: null }
    });
    if (existing) {
      await prisma.policyType.update({ where: { id: existing.id }, data: { keywords, active: true } });
    } else {
      await prisma.policyType.create({
        data: { name: policyName, serviceCategoryId: category.id, keywords, aliases: [] }
      });
    }
  }

  console.log("Seeded setup master data only. No policy records were created.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
