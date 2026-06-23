const fs = require("fs");
const pdf = require("pdf-parse");
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");

async function main() {
  const filePath = "c:\\Users\\abhis\\insuredesk-crm\\tests\\fixtures\\DADA GURU ENTERPRISES_MP04ZJ8775_2026-27.pdf";
  const buffer = fs.readFileSync(filePath);
  const parsed = await pdf(buffer);
  const text = parsed.text || "";

  const result = extractPolicyFromText(text, "DADA GURU ENTERPRISES_MP04ZJ8775_2026-27.pdf");
  
  fs.writeFileSync("scripts/dada_guru_raw_text.txt", text);
  fs.writeFileSync("scripts/dada_guru_parsed.json", JSON.stringify(result, null, 2));
  console.log("Written scripts/dada_guru_raw_text.txt and scripts/dada_guru_parsed.json");
}

main().catch(err => console.error(err));
