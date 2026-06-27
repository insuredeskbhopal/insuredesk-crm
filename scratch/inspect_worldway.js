const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");

const files = [
  "c:\\Users\\abhis\\insuredesk-crm\\organized-policies\\WORLDWAY INTERNATIONAL SCHOOL_MP04PA4264_2026-27.pdf",
  "c:\\Users\\abhis\\insuredesk-crm\\organized-policies\\WORLDWAY INTERNATIONAL SCHOOL_MP04PA4265_2026-27.pdf",
  "c:\\Users\\abhis\\insuredesk-crm\\organized-policies\\WORLDWAYINTERNATIONALSCHOOL_MP04PA4266_2026-27.pdf"
];

async function inspectFiles() {
  let output = "";
  for (const file of files) {
    output += `\n========================================================\n`;
    output += `FILE: ${path.basename(file)}\n`;
    if (!fs.existsSync(file)) {
      output += `File does not exist!\n`;
      continue;
    }
    try {
      const buffer = fs.readFileSync(file);
      const parsed = await pdf(buffer);
      output += `--- Metadata ---\n${JSON.stringify(parsed.info, null, 2)}\n`;
      output += `--- Raw Text Snippet (First 1500 chars) ---\n${parsed.text.substring(0, 1500)}\n`;
      output += `------------------------------------\n`;

      const extracted = extractPolicyFromText(parsed.text, path.basename(file));
      output += `--- Extracted Policy Details ---\n${JSON.stringify(extracted, null, 2)}\n`;
    } catch (e) {
      output += `Error parsing/extracting file: ${e.message}\n`;
    }
  }
  fs.writeFileSync("scratch/worldway_results.txt", output);
  console.log("Analysis results written to scratch/worldway_results.txt");
}

inspectFiles().catch(console.error);
