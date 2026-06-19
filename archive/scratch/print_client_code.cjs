const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");

async function main() {
  const dir = "tests/Warehouse/IFFCO";
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".pdf"));
  for (const file of files) {
    const parsed = await pdf(fs.readFileSync(path.join(dir, file)));
    const lines = parsed.text.split("\n");
    for (const line of lines) {
      if (/client|code|tie\s*up/i.test(line)) {
        console.log(`[${file}] ${line.trim()}`);
      }
    }
  }
}

main().catch(console.error);
