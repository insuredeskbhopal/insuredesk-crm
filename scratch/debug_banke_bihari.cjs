const fs = require("fs");
const { matchGroup } = require("../src/lib/policies/pdf/utils/regex.cjs");

async function main() {
  const { extractTextFromPdf } = await import("../src/lib/policies/pdf/text.js");
  const file = "organized-policies/Bajaj Allianz/Other/BANKE BIHARI WAREHOUSE -FIRE POLICY.pdf";
  const data = fs.readFileSync(file);
  const textResult = await extractTextFromPdf(data);
  const text = textResult.rawText;

  console.log("=== DIAGNOSTIC ===");
  // Test building SI
  const bsiMatch = text.match(/Building Including Plinth & Foundation[\s\S]{0,240}?([0-9][0-9,]*(?:\.\d{2})?)/i);
  console.log("Building match:", bsiMatch ? bsiMatch[0] : null, "Group 1:", bsiMatch ? bsiMatch[1] : null);

  // Test Stocks SI
  const stocksMatch = text.match(/(?:Stocks|Stock)\s+([0-9][0-9,]*)(?:\.\d{2})?/i);
  console.log("Stocks match:", stocksMatch ? stocksMatch[0] : null, "Group 1:", stocksMatch ? stocksMatch[1] : null);

  // Test Total SI
  const totalMatch = text.match(/Total\s+Sum\s+(?:Insured|lnsured)(?:\s*\(INR\)|\s*\(Rs\)|\s*\(Rs\.\))?\s*[:\-\s]*\s*([0-9][0-9,.]*)/i);
  console.log("Total match:", totalMatch ? totalMatch[0] : null, "Group 1:", totalMatch ? totalMatch[1] : null);
}

main().catch(console.error);
