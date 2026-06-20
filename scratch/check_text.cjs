const fs = require("fs");
const path = require("path");

async function main() {
  const { extractTextFromPdf } = await import("../src/lib/policies/pdf/text.js");
  const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");
  
  const file = "tests/_LAHOTI WAREHOUSING CORPORATION AC MPWLC -POLICY.pdf";
  if (!fs.existsSync(file)) {
    console.log(`File ${file} does not exist!`);
    return;
  }

  const data = fs.readFileSync(file);
  process.env.OCR_MAX_PAGES = "13";
  const textResult = await extractTextFromPdf(data);
  const text = textResult.rawText;

  const result = extractPolicyFromText(text, path.basename(file));
  
  let out = "";
  out += "=== RAW TEXT ===\n";
  out += text + "\n";
  out += "=== EXTRACTION RESULT ===\n";
  out += JSON.stringify(result, null, 2) + "\n";

  fs.writeFileSync("scratch/lahoti_debug.txt", out);
  console.log("Written output to scratch/lahoti_debug.txt");
}

main().catch(console.error);
