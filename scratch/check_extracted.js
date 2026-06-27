const fs = require("fs");
const path = require("path");

const content = fs.readFileSync("scratch/worldway_results.txt", "utf8");
const sections = content.split("========================================================");

for (const section of sections) {
  if (!section.trim()) continue;
  const lines = section.split("\n");
  const fileLine = lines.find(l => l.startsWith("FILE:"));
  if (!fileLine) continue;
  const fileName = fileLine.replace("FILE:", "").trim();
  
  // Find JSON block
  const jsonStart = section.indexOf("--- Extracted Policy Details ---");
  if (jsonStart === -1) continue;
  const jsonText = section.slice(jsonStart + "--- Extracted Policy Details ---".length).trim();
  try {
    const data = JSON.parse(jsonText);
    console.log(`\nFILE: ${fileName}`);
    console.log(`  Insured Name:   ${data.insuredName}`);
    console.log(`  Policy Type:    ${data.policyType}`);
    console.log(`  Policy Number:  ${data.policyNumber}`);
    console.log(`  Make/Model:     ${data.makeModel} (${data.vehicleMake} / ${data.vehicleModel})`);
    console.log(`  Chassis Number: ${data.chassisNumber}`);
    console.log(`  Engine Number:  ${data.engineNumber}`);
    console.log(`  IDV / Sum Ins:  ${data.idv}`);
    console.log(`  Net Premium:    ${data.netPremium}`);
    console.log(`  OD Premium:     ${data.odPremium}`);
    console.log(`  TP Premium:     ${data.tpDriverOwner}`);
    console.log(`  Financer:       ${data.financerName}`);
    console.log(`  Fuel Type:      ${data.fuelType}`);
    console.log(`  Seating Cap:    ${data.seatingCapacity}`);
    console.log(`  Mfg Year:       ${data.manufacturingYear}`);
    console.log(`  Cubic Capacity: ${data.cubicCapacity}`);
  } catch (e) {
    console.log(`\nFILE: ${fileName} - JSON Parse Error: ${e.message}`);
  }
}
