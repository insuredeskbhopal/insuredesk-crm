const fs = require("fs");
const pdf = require("pdf-parse");
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");

async function main() {
  const filePath = "c:\\Users\\abhis\\insuredesk-crm\\tests\\fixtures\\DADA GURU ENTERPRISES_MP04ZJ8775_2026-27.pdf";
  
  if (!fs.existsSync(filePath)) {
    console.error(`File does not exist: ${filePath}`);
    process.exit(1);
  }

  console.log("Loading and parsing PDF...");
  const buffer = fs.readFileSync(filePath);
  const parsed = await pdf(buffer);
  const text = parsed.text || "";

  console.log("\n=== EXTRACTED RAW TEXT (FIRST 1000 CHARACTERS) ===");
  console.log(text.substring(0, 1000));
  
  console.log("\n=== RUNNING EXTRACTOR ===");
  const result = extractPolicyFromText(text, "DADA GURU ENTERPRISES_MP04ZJ8775_2026-27.pdf");
  
  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => console.error(err));
