const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");

async function main() {
  const dir = "tests/Warehouse/IFFCO";
  const files = fs.readdirSync(dir).filter(f => f.toLowerCase().includes("fidelity"));
  for (const file of files) {
    console.log(`=== File: ${file} ===`);
    const parsed = await pdf(fs.readFileSync(path.join(dir, file)));
    const lines = parsed.text.split("\n");
    for (const line of lines) {
      if (/unnamed|employee|guarantee|limit/i.test(line)) {
        console.log(`  Line: ${line.trim()}`);
      }
    }
    console.log();
  }
}

main().catch(console.error);
