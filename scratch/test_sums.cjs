const fs = require("fs");
const { extractBajajPropertySums, extractBajajBuildingAmount } = require("../src/lib/policies/pdf/parsers/bajaj/index.cjs");

const text = fs.readFileSync("scratch/banke_bihari_text_full.txt", "utf8");

console.log("Building amount extraction from text directly:", extractBajajBuildingAmount(text));
const sums = extractBajajPropertySums(text);
console.log("Sums:", sums);
