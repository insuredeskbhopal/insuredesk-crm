const fs = require("fs");
const pdf = require("pdf-parse");
const { matchGroup } = require("../src/lib/policies/pdf/utils/regex.cjs");

async function test() {
  const files = [
    "tests/fixtures/SHREENATH DAS TANK_MP39C3588_2026-27 (1).pdf",
    "tests/fixtures/PRIMEONE WORK FORCE PVT LTD_MP04CX2778_2026-27 policy.pdf"
  ];
  
  const regex = /(?:Name\s*of\s*Registration\s*Authority|NAMEOFREGISTRATIONAUTHORITY)\s*[:.-]?\s*([A-Z0-9 -]{3,30})/i;
  
  for (const file of files) {
    const parsed = await pdf(fs.readFileSync(file));
    const rto = matchGroup(parsed.text, regex);
    console.log(`File: ${file} -> RTO: "${rto}"`);
  }
}

test().catch(console.error);
