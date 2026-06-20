const fs = require("fs");
const path = require("path");

async function run() {
  const { extractTextFromPdf } = await import("../src/lib/policies/pdf/text.js");
  const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");

  const files = [
    "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\krishna warehouse endorsement.pdf",
    "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\DEVANSHI WAREHOUSE AC MPWLC ENDORSEMENT.pdf"
  ];

  process.env.OCR_MAX_PAGES = "13";

  for (const file of files) {
    const name = path.basename(file, ".pdf");
    console.log(`Running OCR for ${name}...`);
    try {
      const buffer = fs.readFileSync(file);
      const textResult = await extractTextFromPdf(buffer);
      const rawText = textResult.rawText;
      
      const outPath = path.join(__dirname, `${name}_ocr_text.txt`);
      fs.writeFileSync(outPath, rawText);
      console.log(`Saved OCR text to ${outPath}`);

      const result = extractPolicyFromText(rawText, path.basename(file));
      console.log(`Parsed result for ${name}:`);
      console.log(JSON.stringify({
        company: result.insuranceCompany,
        category: result.documentCategory,
        insuredName: result.insuredName,
        policyNumber: result.policyNumber,
        sumInsured: result.sumInsured,
        premium: result.premium,
        netPremium: result.netPremium,
        riskLocation: result.riskLocation ? (result.riskLocation.slice(0, 100) + "...") : ""
      }, null, 2));

    } catch (e) {
      console.error(`Failed OCR/Parse for ${name}:`, e);
    }
  }
}

run().catch(console.error);
