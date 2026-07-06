const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function inspect() {
  const records = await prisma.policyRecord.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      selectedPolicyType: true,
      data: true,
      reviewedData: true,
    }
  });

  console.log(`Total active policy records: ${records.length}`);
  
  const categories = {
    motor: [],
    fire: [],
    other: [],
  };

  const motorTerms = [
    "motor", "vehicle", "private car", "two wheeler", "bike", "scooter",
    "commercial vehicle", "taxi", "school bus", "goods carrying",
    "passenger carrying", "auto secure"
  ];
  const fireTerms = [
    "fire", "sfsp", "burglary", "msme", "warehouse", "stock", "property",
    "business guard", "laghu", "sookshma"
  ];

  function matchesTerms(record, terms) {
    const spt = (record.selectedPolicyType || "").toLowerCase();
    const rd = (record.reviewedData?.policyType || "").toLowerCase();
    const d = (record.data?.policyType || "").toLowerCase();
    
    return terms.some(term => 
      spt.includes(term) || rd.includes(term) || d.includes(term)
    );
  }

  for (const r of records) {
    const isMotor = matchesTerms(r, motorTerms);
    const isFire = matchesTerms(r, fireTerms);
    
    const label = isMotor ? "MOTOR" : (isFire ? "FIRE" : "OTHER");
    
    if (isMotor) categories.motor.push(r);
    else if (isFire) categories.fire.push(r);
    else categories.other.push(r);
  }

  console.log(`\nRefined Summary:`);
  console.log(`  Motor: ${categories.motor.length}`);
  console.log(`  Fire: ${categories.fire.length}`);
  console.log(`  Other: ${categories.other.length}`);
  
  console.log(`\nList of FIRE policies (${categories.fire.length}):`);
  for (const r of categories.fire) {
    const policyTypeStr = r.reviewedData?.policyType || r.data?.policyType || r.selectedPolicyType || "N/A";
    console.log(`  - Record ID ${r.id}: "${policyTypeStr}"`);
  }

  console.log(`\nList of OTHER policies (${categories.other.length}):`);
  for (const r of categories.other) {
    const policyTypeStr = r.reviewedData?.policyType || r.data?.policyType || r.selectedPolicyType || "N/A";
    console.log(`  - Record ID ${r.id}: "${policyTypeStr}"`);
  }
}

inspect()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
