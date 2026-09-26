const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  // Find by policy number in JSON data
  const records = await p.$queryRaw`
    SELECT id, data, reviewed_data, pdf_file_name
    FROM pdf_records 
    WHERE data->>'policyNumber' = '1030/411861042/00/000'
    OR reviewed_data->>'policyNumber' = '1030/411861042/00/000'
    LIMIT 1
  `;
  
  if (records.length === 0) {
    console.log("Not found");
    return;
  }
  
  const r = records[0];
  const d = r.reviewed_data || r.data || {};
  console.log("policyCategory:", d.policyCategory);
  console.log("category:", d.category);
  console.log("documentCategory:", d.documentCategory);
  console.log("policyType:", d.policyType);
  console.log("displayPolicyType:", d.displayPolicyType);
  console.log("productName:", d.productName);
  console.log("product:", d.product);
  console.log("lob:", d.lob || d.lineOfBusiness);
  console.log("vehicleNumber:", d.vehicleNumber);
  console.log("registrationNumber:", d.registrationNumber);
  console.log("vehicleMake:", d.vehicleMake);
  console.log("vehicleModel:", d.vehicleModel);
  console.log("makeModel:", d.makeModel);
}

main().catch(console.error).finally(() => p.$disconnect());
