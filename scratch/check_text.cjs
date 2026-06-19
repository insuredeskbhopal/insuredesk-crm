const fs = require("fs");

async function main() {
  const { extractTextFromPdf } = await import("../src/lib/policies/pdf/text.js");
  const file = "organized-policies/Bajaj Allianz/Other/SHRI MAHAKAL WAREHOUSE -BUILDING POLICY.pdf";
  const data = fs.readFileSync(file);
  process.env.OCR_MAX_PAGES = "13";
  const textResult = await extractTextFromPdf(data);
  const text = textResult.rawText;

  // Search for lines containing premium, tax, gst, and check where they are
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/premium|tax|gst|cgst|sgst|igst|total|gross|amount/i.test(line)) {
      console.log(`Line ${i+1}: ${line.trim()}`);
    }
  }
}

main().catch(console.error);
