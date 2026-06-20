const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");

const files = [
  "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\AGRAWAL WAREHOUSE AC MPWLC_ ENDO.pdf",
  "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\ASHIRWAD WAREHOUSE ENDO.pdf",
  "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\ENDO_K S PUSHPDEEEP WAREHOUSE.pdf",
  "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\ENDO_KRISHNA WAREHOUSE-POLICY.pdf"
];

async function dump() {
  const { extractTextFromPdf } = await import("../src/lib/policies/pdf/text.js");
  process.env.OCR_MAX_PAGES = "13";

  for (const file of files) {
    const name = path.basename(file, ".pdf");
    try {
      const buffer = fs.readFileSync(file);
      const textResult = await extractTextFromPdf(buffer);
      const rawText = textResult.rawText;
      const outPath = path.join(__dirname, `${name}_ocr_text.txt`);
      fs.writeFileSync(outPath, rawText);
      console.log(`Dumped ${name} text to ${outPath}`);
    } catch (e) {
      console.error(`Failed to dump ${name}:`, e);
    }
  }
}

dump();
