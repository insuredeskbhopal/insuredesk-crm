const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");

const dir = "c:\\Users\\abhis\\insuredesk-crm\\organized-policies\\Tata AIG\\Warehouse";
const files = fs.readdirSync(dir).filter(f => f.endsWith(".pdf"));

async function testExtraction() {
  for (const file of files) {
    const filePath = path.join(dir, file);
    const buffer = fs.readFileSync(filePath);
    const parsed = await pdf(buffer);
    const result = extractPolicyFromText(parsed.text, file);
    console.log(`FILE: ${file}`);
    console.log(`  documentFormat: ${result.documentFormat}`);
    console.log(`  documentCategory: ${result.documentCategory}`);
    console.log(`  insuranceCompany: ${result.insuranceCompany}`);
    if (result.documentFormat !== "TATA_AIG_WAREHOUSE_V1") {
      console.log(`  FAILED! Result keys:`, Object.keys(result));
    }
  }
}

testExtraction().catch(console.error);
