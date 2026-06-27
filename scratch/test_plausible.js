const fs = require("fs");
const pdf = require("pdf-parse");
const { isPlausibleEngineNumber } = require("../src/lib/policies/pdf/utils/motor.cjs");

async function run() {
  const file = "c:\\Users\\abhis\\insuredesk-crm\\organized-policies\\WORLDWAY INTERNATIONAL SCHOOL_MP04PA4264_2026-27.pdf";
  const buffer = fs.readFileSync(file);
  const parsed = await pdf(buffer);
  const text = parsed.text;
  
  const registrationNumber = "MP04PA4264";
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const lineCleaned = lines[i].replace(/\s+/g, "");
    if (lineCleaned.startsWith(registrationNumber)) {
      console.log(`Matched registration line index: ${i}, line: "${lines[i]}"`);
      let combined = lineCleaned;
      for (let k = 1; k <= 8; k++) {
        if (lines[i + k]) {
          console.log(`  k=${k}: "${lines[i+k]}"`);
          combined += lines[i + k].replace(/\s+/g, "");
        }
      }
      
      const normalizedCombined = combined.replace(/[^A-Z0-9]/gi, "").toUpperCase();
      console.log("normalizedCombined:", normalizedCombined);
      
      const vinMatch = normalizedCombined.match(/M[A-EZ][A-Z0-9]{15}/i);
      console.log("vinMatch:", vinMatch);
      if (vinMatch) {
        const chassisNumber = vinMatch[0].toUpperCase();
        console.log("chassisNumber:", chassisNumber);
        const afterVin = normalizedCombined.slice(normalizedCombined.indexOf(chassisNumber) + 17);
        console.log("afterVin:", afterVin);
        const engineMatch = afterVin.match(/^[A-Z0-9]+/i);
        console.log("engineMatch:", engineMatch);
        if (engineMatch) {
          console.log("Is plausible engine:", isPlausibleEngineNumber(engineMatch[0]));
        }
      }
    }
  }
}

run().catch(console.error);
