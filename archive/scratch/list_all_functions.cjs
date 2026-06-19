const fs = require("fs");
const path = require("path");

const functions = JSON.parse(fs.readFileSync(path.resolve(__dirname, "functions.json"), "utf8"));
console.log("Total functions:", functions.length);

const grouped = {
  routers: ["extractPolicyFromPdf", "extractPolicyFromText", "buildIntelligentResult"],
  helpers: []
};

functions.forEach(f => {
  if (grouped.routers.includes(f.name)) return;
  
  // Classify by name prefix
  if (f.name.toLowerCase().startsWith("icici")) {
    grouped.icici = grouped.icici || [];
    grouped.icici.push(f.name);
  } else if (f.name.toLowerCase().startsWith("iffco")) {
    grouped.iffco = grouped.iffco || [];
    grouped.iffco.push(f.name);
  } else if (f.name.toLowerCase().startsWith("bajaj")) {
    grouped.bajaj = grouped.bajaj || [];
    grouped.bajaj.push(f.name);
  } else if (f.name.toLowerCase().startsWith("tata")) {
    grouped.tata = grouped.tata || [];
    grouped.tata.push(f.name);
  } else if (f.name.toLowerCase().startsWith("newindia") || f.name.toLowerCase().includes("newindia") || f.name.toLowerCase().includes("new_india")) {
    grouped.newindia = grouped.newindia || [];
    grouped.newindia.push(f.name);
  } else if (f.name.toLowerCase().startsWith("hdfc")) {
    grouped.hdfcergo = grouped.hdfcergo || [];
    grouped.hdfcergo.push(f.name);
  } else if (f.name.toLowerCase().startsWith("generali")) {
    grouped.generali = grouped.generali || [];
    grouped.generali.push(f.name);
  } else if (f.name.toLowerCase().startsWith("royal")) {
    grouped.royalsundaram = grouped.royalsundaram || [];
    grouped.royalsundaram.push(f.name);
  } else if (f.name.toLowerCase().includes("digit")) {
    grouped.godigit = grouped.godigit || [];
    grouped.godigit.push(f.name);
  } else if (f.name.toLowerCase().includes("generic")) {
    grouped.generic = grouped.generic || [];
    grouped.generic.push(f.name);
  } else {
    grouped.helpers.push({ name: f.name, line: f.startLine, length: f.lineCount });
  }
});

console.log("Grouped counts:");
Object.keys(grouped).forEach(k => {
  console.log(`- ${k}: ${grouped[k].length}`);
});

console.log("\nUnclassified helper functions:");
console.log(JSON.stringify(grouped.helpers, null, 2));
