const fs = require("fs");
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");

const text = fs.readFileSync("scratch/banke_bihari_text_full.txt", "utf8");
const result = extractPolicyFromText(text, "BANKE BIHARI WAREHOUSE -FIRE POLICY.pdf");

console.log("FORMAT:", result.documentFormat);
console.log("PRODUCT NAME:", result.productName || result.policyType);
console.log("BUILDING SI:", result.buildingSumInsured);
console.log("COVERAGE DETAILS:", result.coverageDetails);
console.log("COVERAGES (flat):", result.coverages);
