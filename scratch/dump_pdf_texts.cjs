const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");

const files = [
  "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\SHRI MOOLCHAND JI WAREHOUSE AC MPWLC - BURGLARY  ENDORSEMENT.pdf",
  "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\krishna warehouse endorsement.pdf",
  "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\DEVANSHI WAREHOUSE AC MPWLC ENDORSEMENT.pdf",
  "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\MISHRA WAREHOUSE PVT. LTD. AC MPWLC_ ENDORSEMENT.pdf",
  "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\TARA AGRO PARK AC MPWLC -endorsement.pdf",
  "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\BARSAIYAN WAREHOUSE AC MPWLC ENDORSEMENT.pdf"
];

async function dump() {
  for (const file of files) {
    const name = path.basename(file, ".pdf");
    try {
      const buffer = fs.readFileSync(file);
      const parsed = await pdf(buffer);
      const outPath = path.join(__dirname, `${name}_text.txt`);
      fs.writeFileSync(outPath, parsed.text);
      console.log(`Dumped ${name} text to ${outPath}`);
    } catch (e) {
      console.error(`Failed to dump ${name}:`, e);
    }
  }
}

dump();
