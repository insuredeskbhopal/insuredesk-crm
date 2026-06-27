const fs = require("fs");
const pdf = require("pdf-parse");

async function test() {
  const file = "c:\\Users\\abhis\\insuredesk-crm\\organized-policies\\WORLDWAY INTERNATIONAL SCHOOL_MP04PA4264_2026-27.pdf";
  const buffer = fs.readFileSync(file);
  const parsed = await pdf(buffer);
  const text = parsed.text;
  
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Vehicle IDV")) {
      console.log(`Line ${i}: ${lines[i]}`);
      for (let k = 1; k <= 10; k++) {
        console.log(`Line ${i+k}: ${lines[i+k]}`);
      }
    }
  }
}

test().catch(console.error);
