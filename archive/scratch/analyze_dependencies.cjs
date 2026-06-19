const fs = require("fs");
const path = require("path");

const filePath = path.resolve(__dirname, "../lib/policies/pdf/extractor.cjs");
const code = fs.readFileSync(filePath, "utf8");
const lines = code.split("\n");

// 1. Get all functions and their ranges
const functions = [];
const funcRegex = /^(?:async\s+)?function\s+(\w+)\s*\(/;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const match = line.match(funcRegex);
  if (match) {
    const name = match[1];
    const startLine = i + 1;
    let braceCount = 0;
    let endLine = -1;
    let foundStart = false;
    
    for (let j = i; j < lines.length; j++) {
      const l = lines[j];
      let cleanL = l.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
      cleanL = cleanL.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '""');
      cleanL = cleanL.replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g, "''");
      cleanL = cleanL.replace(/`[^`\\]*(?:\\.[^`\\]*)*`/g, "``");
      
      for (const char of cleanL) {
        if (char === "{") {
          braceCount++;
          foundStart = true;
        } else if (char === "}") {
          braceCount--;
        }
      }
      
      if (foundStart && braceCount === 0) {
        endLine = j + 1;
        break;
      }
    }
    
    functions.push({ name, startLine, endLine, code: lines.slice(startLine - 1, endLine).join("\n") });
  }
}

const functionNames = functions.map(f => f.name);

// 2. Find dependencies for each function
const deps = {};
functions.forEach(f => {
  deps[f.name] = [];
  functionNames.forEach(otherName => {
    if (otherName === f.name) return;
    
    // Search for otherName calls (excluding word boundaries)
    const callRegex = new RegExp(`\\b${otherName}\\b\\s*\\(`, "g");
    if (callRegex.test(f.code)) {
      deps[f.name].push(otherName);
    }
  });
});

fs.writeFileSync(path.resolve(__dirname, "dependencies.json"), JSON.stringify(deps, null, 2), "utf8");
console.log(`Analyzed dependencies for ${functions.length} functions.`);
