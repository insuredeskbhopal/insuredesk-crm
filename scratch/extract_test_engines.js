const fs = require("fs");

const content = fs.readFileSync("tests/motor-extraction.test.js", "utf8");
const matches = content.match(/engineNumber:\s*"([^"]+)"/g) || [];
console.log("Expected engine numbers in tests:");
console.log(matches.map(m => m.replace(/engineNumber:\s*"/, "").replace(/"/, "")).filter((v, i, a) => a.indexOf(v) === i));
