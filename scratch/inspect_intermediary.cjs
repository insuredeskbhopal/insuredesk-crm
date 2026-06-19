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
    if (!extResult.brokerCode) {
      console.log(`\n========================================`);
      console.log(`FILE: ${file}`);
      
      const lines = text.split("\n");
      lines.forEach((line, idx) => {
        if (/agency|broker|intermediary/i.test(line)) {
          console.log(`Line ${idx+1}: ${line.trim()}`);
          for (let i = 1; i <= 3; i++) {
            if (lines[idx+i]) console.log(`  +${i}: ${lines[idx+i].trim()}`);
          }
        }
      });
    }
  }
}

main().catch(console.error);
