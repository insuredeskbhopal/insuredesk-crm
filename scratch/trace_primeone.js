const fs = require("fs");
const pdf = require("pdf-parse");

async function run() {
  const file = "tests/fixtures/PRIMEONE WORK FORCE PVT LTD_MP04CX2778_2026-27 policy.pdf";
  const buffer = fs.readFileSync(file);
  const parsed = await pdf(buffer);
  const text = parsed.text;

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  console.log("File lines containing MALFC81AVKM021034 or G3LCKM808840 or parts of them:");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("MALFC") || lines[i].includes("021034") || lines[i].includes("G3LC") || lines[i].includes("808840")) {
      console.log(`Line ${i}: "${lines[i]}"`);
    }
  }
}

run().catch(console.error);
