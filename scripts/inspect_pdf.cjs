const fs = require("fs");
const pdf = require("pdf-parse");

async function main() {
  const filePath =
    "c:\\Users\\Wim11\\Desktop\\bimaheadquarter\\tests\\fixtures\\RAKESH ASAI_CG074035_2026-27.pdf";
  const buffer = fs.readFileSync(filePath);
  const parsed = await pdf(buffer);

  console.log("=== PDF METADATA ===");
  console.log(parsed.info);
  console.log("\n=== PDF TEXT ===");
  console.log(parsed.text);
}

main().catch((err) => console.error(err));
