const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");

const dir = "c:\\Users\\abhis\\insuredesk-crm\\organized-policies\\Tata AIG\\Warehouse";
const files = fs.readdirSync(dir).filter(f => f.endsWith(".pdf"));

async function checkFiles() {
  for (const file of files) {
    const filePath = path.join(dir, file);
    const buffer = fs.readFileSync(filePath);
    const parsed = await pdf(buffer);
    
    const text = parsed.text;
    const hasTataAig = /\bTATA\s*AIG\b/i.test(text);
    const hasBusinessGuard = /Business\s+Guard\s+(?:Laghu|Sookshma)\s+Package\s+Policy/i.test(text);
    const hasBusinessGuardSimple = /Business\s+Guard/i.test(text);
    
    // Extract potential product names / title lines
    const titleMatch = text.match(/(?:Business\s+Guard\s+[A-Za-z\s]+Policy|Standard\s+Fire\s+and\s+Special\s+Perils\s+Policy|Standard\s+Fire\s+&\s+Special\s+Perils\s+Policy|Fire\s+and\s+Special\s+Perils\s+Policy|Industrial\s+All\s+Risks\s+Policy)/i);
    const firstLine = text.split("\n").map(l => l.trim()).filter(Boolean)[0] || "";
    
    console.log(`FILE: ${file}`);
    console.log(`  firstLine: "${firstLine}"`);
    console.log(`  hasTataAig: ${hasTataAig} | hasBusinessGuard: ${hasBusinessGuard} | hasBusinessGuardSimple: ${hasBusinessGuardSimple}`);
    console.log(`  titleMatch: ${titleMatch ? `"${titleMatch[0]}"` : "null"}`);
  }
}

checkFiles().catch(console.error);
