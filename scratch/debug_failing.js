const fs = require("fs");
const pdf = require("pdf-parse");
const { extractBajajAllianzMotor } = require("../src/lib/policies/pdf/parsers/bajaj/index.cjs");

async function debugFile(file) {
  console.log(`\n==================================================`);
  console.log(`FILE: ${file}`);
  const buffer = fs.readFileSync(file);
  const parsed = await pdf(buffer);
  const text = parsed.text;

  const motorDetails = extractBajajAllianzMotor(text, file);
  console.log("--- Extracted Motor Details ---");
  console.log(`  chassisNumber: "${motorDetails.chassisNumber}"`);
  console.log(`  engineNumber:  "${motorDetails.engineNumber}"`);
  console.log(`  manufacturingYear: "${motorDetails.manufacturingYear}"`);
  console.log(`  cubicCapacity:     "${motorDetails.cubicCapacity}"`);
  console.log(`  seatingCapacity:   "${motorDetails.seatingCapacity}"`);

  // Let's manually run the registration line loop and print details
  const registrationNumber = motorDetails.registrationNumber;
  const rtoLocation = motorDetails.rtoLocation;
  const lines = text.split("\n");
  console.log(`  registrationNumber: "${registrationNumber}", rtoLocation: "${rtoLocation}"`);
  for (let i = 0; i < lines.length; i++) {
    const lineCleaned = lines[i].replace(/\s+/g, "");
    if (lineCleaned.startsWith(registrationNumber)) {
      console.log(`  [Match i=${i}]: "${lines[i]}"`);
      let combined = lineCleaned;
      for (let k = 1; k <= 8; k++) {
        if (lines[i + k]) combined += lines[i + k].replace(/\s+/g, "");
      }
      const normalizedCombined = combined.replace(/[^A-Z0-9]/gi, "").toUpperCase();
      console.log(`    normalizedCombined: "${normalizedCombined}"`);
      const vinMatch = normalizedCombined.match(/M[A-EZ][A-Z0-9]{15}/i);
      if (vinMatch) {
        const candidateChassis = vinMatch[0].toUpperCase();
        console.log(`    vinMatch: "${candidateChassis}"`);
        
        const vinStartIndex = vinMatch.index;
        const vinEndIndex = vinStartIndex + 17;
        console.log(`    vin range: [${vinStartIndex}, ${vinEndIndex}]`);
        
        const engineRegex = /[A-Z0-9]{6,35}/gi;
        let match;
        while ((match = engineRegex.exec(normalizedCombined)) !== null) {
          const block = match[0];
          const candStartIndex = match.index;
          const candEndIndex = candStartIndex + block.length;
          const overlaps = (candStartIndex < vinEndIndex && candEndIndex > vinStartIndex);
          
          console.log(`      candidate block: "${block}", range: [${candStartIndex}, ${candEndIndex}], overlaps: ${overlaps}`);
          if (!overlaps) {
            // Let's trace extractSubEngine
            const rtoClean = rtoLocation.toUpperCase().replace(/\s+/g, "");
            console.log(`        trace extractSubEngine("${block}", "${rtoLocation}")`);
            let cleaned = block.toUpperCase();
            if (rtoClean && cleaned.includes(rtoClean)) {
              console.log(`          contains rtoClean "${rtoClean}"`);
            }
            const rtoPrefixMatch = cleaned.match(/[A-Z]{2}\d{2}/);
            if (rtoPrefixMatch) {
              console.log(`          contains rtoPrefix "${rtoPrefixMatch[0]}"`);
            }
            
            // Check isPlausibleEngineForBajaj
            const isPlausible = (value) => {
              const cl = value.replace(/[^A-Z0-9]/gi, "").toUpperCase();
              const isPlGlobal = require("../src/lib/policies/pdf/utils/motor.cjs").isPlausibleEngineNumber(cl);
              const startsRtoPrefix = /^[A-Z]{2}\d{2}/i.test(cl);
              const containsRto = rtoLocation && cl.includes(rtoLocation.toUpperCase().replace(/\s+/g, ""));
              const containsCommon = /(?:BHOPAL|INDORE|GWALIOR|JABALPUR|RAJGARH)/i.test(cl);
              console.log(`            isPlausibleEngineNumber("${cl}"): ${isPlGlobal}`);
              console.log(`            startsRtoPrefix: ${startsRtoPrefix}`);
              console.log(`            containsRto: ${containsRto}`);
              console.log(`            containsCommon: ${containsCommon}`);
              return isPlGlobal && !startsRtoPrefix && !containsRto && !containsCommon;
            };
            
            const sub = cleaned.split(rtoClean).join("").split(rtoPrefixMatch ? rtoPrefixMatch[0] : "").join("");
            console.log(`          after splits: "${sub}"`);
            if (sub && isPlausible(sub)) {
              console.log(`          -> SUB IS PLAUSIBLE ENGINE: "${sub}"`);
            }
          }
        }
      }
    }
  }
}

async function run() {
  await debugFile("tests/fixtures/SHREENATH DAS TANK_MP39C3588_2026-27 (1).pdf");
  await debugFile("tests/fixtures/PRIMEONE WORK FORCE PVT LTD_MP04CX2778_2026-27 policy.pdf");
}

run().catch(console.error);
