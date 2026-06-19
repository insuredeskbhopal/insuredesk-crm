const fs = require("fs");
const path = require("path");
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");

async function main() {
  const { extractTextFromPdf } = await import("../src/lib/policies/pdf/text.js");

  const bajajDir = "organized-policies/Bajaj Allianz/Other";
  const files = fs.readdirSync(bajajDir).filter(f => f.endsWith(".pdf"));

  for (const file of files) {
    const filePath = path.join(bajajDir, file);
    const data = fs.readFileSync(filePath);
    const textResult = await extractTextFromPdf(data);
    const text = textResult.rawText;

    const extResult = extractPolicyFromText(text, filePath);
    if (!extResult.village) {
      console.log(`\n========================================`);
      console.log(`FILE: ${file}`);
      console.log(`RISK LOCATION: ${extResult.riskLocation}`);
      console.log(`MAILING ADDRESS: ${extResult.mailingAddress}`);
    }
  }
}

main().catch(console.error);
