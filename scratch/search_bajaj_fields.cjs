const fs = require("fs");
const path = require("path");

async function main() {
  const { extractTextFromPdf } = await import("../src/lib/policies/pdf/text.js");
  const file = "organized-policies/Bajaj Allianz/Other/ENDORSEMENT HARIOM WAREHOUSE AC MPWLC - FIRE POLICY.pdf";
  const data = fs.readFileSync(file);
  const textResult = await extractTextFromPdf(data);
  const text = textResult.rawText;

  fs.writeFileSync("scratch/hariom_fire_text.txt", text);
  console.log("Wrote Hariom Fire text to scratch/hariom_fire_text.txt");

  const lines = text.split("\n");
  console.log("=== Matching Lines ===");
  for (const line of lines) {
    if (/client|code|tie|intermediary|broker|issue|date|agent/i.test(line)) {
      console.log(line.trim());
    }
  }
}

main().catch(console.error);
