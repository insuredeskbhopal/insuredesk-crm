const fs = require("fs");
const pdf = require("pdf-parse");

async function main() {
  const parsed = await pdf(fs.readFileSync("tests/Warehouse/IFFCO/222.pdf"));
  const text = parsed.text;
  
  const stateCodeIndex = text.indexOf("State Code:");
  let insuredName = "";
  if (stateCodeIndex !== -1) {
    const afterState = text.slice(stateCodeIndex + 11).trim().split("\n");
    for (let line of afterState) {
      line = line.trim();
      if (line && !line.includes("Country") && !line.includes("GSTIN")) {
        insuredName = line;
        break;
      }
    }
  }
  
  console.log("Insured Name found:", insuredName);
  
  let addrBlock = text.match(/Address\s*:\s*([\s\S]+?)(?:State Code:|$)/i);
  console.log("addrBlock with Address regex:", addrBlock ? addrBlock[0] : null);
  
  if (insuredName) {
    const insuredIdx = text.indexOf(insuredName);
    console.log("insuredIdx:", insuredIdx);
    if (insuredIdx !== -1) {
      const afterInsured = text.slice(insuredIdx + insuredName.length);
      console.log("afterInsured starts with:", JSON.stringify(afterInsured.slice(0, 200)));
      const fallbackMatch = afterInsured.match(/^([\s\S]+?)(?:State Code:|$)/i);
      console.log("fallbackMatch:", fallbackMatch ? fallbackMatch[1].slice(0, 100) : null);
    }
  }
}

main().catch(console.error);
