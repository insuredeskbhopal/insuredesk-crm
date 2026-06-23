const fs = require("fs");
const pdf = require("pdf-parse");
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");

async function main() {
  const filePath = "tests/fixtures/MR AJAY  VISHVAKARMA_MP04ZJ8425_2026-27 POLICY.pdf";
  const buffer = fs.readFileSync(filePath);
  const parsed = await pdf(buffer);
  const text = parsed.text || "";

  const result = extractPolicyFromText(text, "MR AJAY  VISHVAKARMA_MP04ZJ8425_2026-27 POLICY.pdf");

  console.log("documentFormat:", result.documentFormat);
  console.log("insuranceCompany:", result.insuranceCompany);
  console.log("insuredName:", result.insuredName);
  console.log("policyNumber:", result.policyNumber);
  console.log("policyType:", result.policyType);
  console.log("vehicleNumber:", result.vehicleNumber);
  console.log("registrationNumber:", result.registrationNumber);
  console.log("makeModel:", result.makeModel);
  console.log("variant:", result.variant);
  console.log("fuelType:", result.fuelType);
  console.log("engineNumber:", result.engineNumber);
  console.log("chassisNumber:", result.chassisNumber);
  console.log("cubicCapacity:", result.cubicCapacity);
  console.log("seatingCapacity:", result.seatingCapacity);
  console.log("manufacturingYear:", result.manufacturingYear);
  console.log("idv:", result.idv);
  console.log("premium:", result.premium);
  console.log("totalPremium:", result.totalPremium);
  console.log("netPremium:", result.netPremium);
  console.log("odPremium:", result.odPremium);
  console.log("tpDriverOwner:", result.tpDriverOwner);
  console.log("gstAmount:", result.gstAmount);
  console.log("ncb:", result.ncb);
  console.log("startDate:", result.startDate);
  console.log("expiryDate:", result.expiryDate);
  console.log("rtoLocation:", result.rtoLocation);
  console.log("contactNumber:", result.contactNumber);
  console.log("nomineeName:", result.nomineeName);
  console.log("financerName:", result.financerName);
  console.log("policyCoverType:", result.policyCoverType);
}

main().catch(err => console.error(err));
