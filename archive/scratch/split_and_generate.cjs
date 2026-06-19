const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const extractorPath = path.resolve(rootDir, "lib/policies/pdf/extractor.cjs");
const backupPath = path.resolve(rootDir, "lib/policies/pdf/extractor.backup.cjs");
const code = fs.readFileSync(backupPath, "utf8");
const lines = code.split("\n");

// Load functions and dependencies from scratch
const functions = JSON.parse(fs.readFileSync(path.resolve(__dirname, "functions.json"), "utf8"));
const deps = JSON.parse(fs.readFileSync(path.resolve(__dirname, "dependencies.json"), "utf8"));

// Target files configuration
const targets = {
  // Utility files
  "utils/text.cjs": [],
  "utils/regex.cjs": [],
  "utils/dates.cjs": [],
  "utils/amounts.cjs": [],
  "utils/locations.cjs": [],
  "utils/motor.cjs": [],
  "utils/warehouse.cjs": [],
  
  // Insurer parsers
  "parsers/icici/index.cjs": [],
  "parsers/iffco/index.cjs": [],
  "parsers/bajaj/index.cjs": [],
  "parsers/tata/index.cjs": [],
  "parsers/new-india/index.cjs": [],
  "parsers/hdfc-ergo/index.cjs": [],
  "parsers/generali/index.cjs": [],
  "parsers/royal-sundaram/index.cjs": [],
  "parsers/go-digit/index.cjs": [],
  "parsers/generic/index.cjs": [],
  
  // Main router file
  "extractor.cjs": []
};

// Classification rules for every function
function classify(fName) {
  const name = fName.toLowerCase();
  
  // Router functions stay in extractor.cjs
  if (["extractpolicyfrompdf", "extractpolicyfromtext", "buildintelligentresult"].includes(name)) {
    return "extractor.cjs";
  }

  // Override carrier prefix matching for generic helpers
  if (name === "cleanhdfcvalue") {
    return "utils/text.cjs";
  }
  if ([
    "extractmakemodel",
    "extractmfgyear",
    "splitgenericmakemodel",
    "extractiffcocompressedvehicletable",
    "extractiffcodenseprivatecarvehicletable",
    "extractiffcostandaloneodvehicletable",
    "extractnewindiadenseidv"
  ].includes(name)) {
    return "utils/motor.cjs";
  }
  if (name === "normalizehdfctypedvalue") {
    return "utils/regex.cjs";
  }
  if (name === "extractiffcopremiumfromblock") {
    return "utils/amounts.cjs";
  }
  
  // Insurer specific checks using includes (since function names can be extractIcici..., isIcici..., etc.)
  if (name.includes("icici")) return "parsers/icici/index.cjs";
  if (name.includes("iffco")) return "parsers/iffco/index.cjs";
  if (name.includes("bajaj")) return "parsers/bajaj/index.cjs";
  if (name.includes("tata")) return "parsers/tata/index.cjs";
  if (name.includes("newindia") || name.includes("new_india") || name.includes("new assurance")) {
    return "parsers/new-india/index.cjs";
  }
  if (name.includes("hdfc")) return "parsers/hdfc-ergo/index.cjs";
  if (name.includes("generali")) return "parsers/generali/index.cjs";
  if (name.includes("royal")) return "parsers/royal-sundaram/index.cjs";
  if (name.includes("digit")) return "parsers/go-digit/index.cjs";
  
  if (name.includes("generic") || name === "extractpremium" || name === "extractidv" || name === "extractmakemodel" || name === "extractmfgyear") {
    return "parsers/generic/index.cjs";
  }
 
  // Warehouse-specific helpers
  if (["buildwarehouselegacydata", "iswarehouseextraction", "protectwarehousemergedfields", "coverageamount"].includes(name)) {
    return "utils/warehouse.cjs";
  }
  
  // Locations utilities
  if (["extractlocationpart", "lookuprtolocation", "cleanicicirto", "localextractlocationpart", "extractbajajrisklocation", "extractbajajaddressparts", "dedupebajajplace"].includes(name)) {
    return "utils/locations.cjs";
  }
  
  // Amounts utilities
  if (["normalizeamount", "sumamounts", "diffamounts", "cleangeneraliamount", "extractgeneralitotalidv", "extractgeneralitotalpremium", "extracttataaiggstamount", "extracttataaigtotalpremium", "sumplainamounts", "parsedensegst", "parsedenseamounts", "normalizeiffcowarehouseamount", "extractiffcopremiumfromblock"].includes(name)) {
    return "utils/amounts.cjs";
  }
  
  // Dates utilities
  if (["buildduration", "parserobustdate", "normalizetatadate", "normalizebajajdate", "normalizegodigitdate", "normalizeicicidate", "cleanhdfcperiodvalue", "normalizewarehousedate", "extractgeneraliperiod", "extractiffcopolicyperiod", "extracticicipolicyperiod", "extracthdfcperiod", "extractnewindiapolicyperiod", "extractgenericpolicyperiod", "extractbajajwarehousedates"].includes(name)) {
    return "utils/dates.cjs";
  }
  
  // Regex utilities
  if (["matchgroup", "escaperegexp", "extractbylabels", "extractnearlabel", "extracttataafterlabel", "extracthdfcboundedtext"].includes(name)) {
    return "utils/regex.cjs";
  }
  
  // Text utilities
  if (["cleantext", "slicetext", "cleanwarehouseaddress", "cleanwarehousedescription", "cleantatavehiclevalue", "cleaninsuredname", "cleanmakemodel", "cleanmotortablemakemodel", "cleanwarehouseblock", "derivegroupname"].includes(name)) {
    return "utils/text.cjs";
  }
  
  // Default to motor utilities for other helpers
  return "utils/motor.cjs";
}

// Group functions
functions.forEach(f => {
  const target = classify(f.name);
  targets[target].push(f);
});

// Load the original code lines for helper functions extraction
function getFunctionCode(f) {
  return lines.slice(f.startLine - 1, f.endLine).join("\n");
}

// Dependency resolver for module imports
function getDependenciesForModule(moduleFunctions, modulePath) {
  const insideModule = new Set(moduleFunctions.map(f => f.name));
  const externalDeps = new Set();
  
  moduleFunctions.forEach(f => {
    const fDeps = deps[f.name] || [];
    fDeps.forEach(d => {
      if (!insideModule.has(d)) {
        externalDeps.add(d);
      }
    });
    
    // Check for normalizeCompanyFromMaster reference in the function code
    const fCode = getFunctionCode(f);
    if (fCode.includes("normalizeCompanyFromMaster")) {
      externalDeps.add("normalizeCompanyFromMaster");
    }
  });
  
  return Array.from(externalDeps);
}

// Function to find which module contains a given function name
function findModuleForFunction(fName) {
  for (const [targetPath, funcs] of Object.entries(targets)) {
    if (funcs.some(f => f.name === fName)) {
      return targetPath;
    }
  }
  return null;
}

// External dependency paths relative to rootDir
const EXTERNAL_REQUIRES_PATHS = {
  "pdf": "pdf-parse",
  "understandDocument": "lib/policies/understanding/understandDocument.js",
  "resolveSchema": "lib/policies/intelligence/schemaEngine.js",
  "extractWithSchema": "lib/policies/intelligence/dynamicExtractor.js",
  "mergeSchemaWithFallback": "lib/policies/intelligence/confidenceEngine.js",
  "validateExtraction": "lib/policies/intelligence/confidenceEngine.js",
  "normalizeCompanyFromMaster": "lib/master/insurance-companies.cjs"
};

// Create the folders
const baseDir = path.resolve(rootDir, "lib/policies/pdf");
fs.mkdirSync(path.join(baseDir, "utils"), { recursive: true });
fs.mkdirSync(path.join(baseDir, "parsers/icici"), { recursive: true });
fs.mkdirSync(path.join(baseDir, "parsers/iffco"), { recursive: true });
fs.mkdirSync(path.join(baseDir, "parsers/bajaj"), { recursive: true });
fs.mkdirSync(path.join(baseDir, "parsers/tata"), { recursive: true });
fs.mkdirSync(path.join(baseDir, "parsers/new-india"), { recursive: true });
fs.mkdirSync(path.join(baseDir, "parsers/hdfc-ergo"), { recursive: true });
fs.mkdirSync(path.join(baseDir, "parsers/generali"), { recursive: true });
fs.mkdirSync(path.join(baseDir, "parsers/royal-sundaram"), { recursive: true });
fs.mkdirSync(path.join(baseDir, "parsers/go-digit"), { recursive: true });
fs.mkdirSync(path.join(baseDir, "parsers/generic"), { recursive: true });

// Write all helper and parser files
for (const [targetPath, moduleFuncs] of Object.entries(targets)) {
  if (targetPath === "extractor.cjs") continue; // Done separately
  
  const destFile = path.join(baseDir, targetPath);
  let fileContent = "";
  
  // Resolve required imports
  const extDeps = getDependenciesForModule(moduleFuncs, targetPath);
  const importsMap = {};
  const requiresSet = new Set();
  
  extDeps.forEach(d => {
    if (EXTERNAL_REQUIRES_PATHS[d]) {
      const depPath = EXTERNAL_REQUIRES_PATHS[d];
      if (depPath === "pdf-parse") {
        requiresSet.add(`const pdf = require("pdf-parse");`);
      } else {
        const absDep = path.resolve(rootDir, depPath);
        const absTarget = path.join(baseDir, targetPath);
        let rel = path.relative(path.dirname(absTarget), absDep).replace(/\\/g, "/");
        if (!rel.startsWith(".")) {
          rel = `./${rel}`;
        }
        
        if (d === "understandDocument") {
          requiresSet.add(`const { understandDocument } = require("${rel}");`);
        } else if (d === "resolveSchema") {
          requiresSet.add(`const { resolveSchema } = require("${rel}");`);
        } else if (d === "extractWithSchema") {
          requiresSet.add(`const { extractWithSchema } = require("${rel}");`);
        } else if (d === "mergeSchemaWithFallback" || d === "validateExtraction") {
          requiresSet.add(`const { mergeSchemaWithFallback, validateExtraction } = require("${rel}");`);
        } else if (d === "normalizeCompanyFromMaster") {
          requiresSet.add(`const { normalizeInsuranceCompanyName: normalizeCompanyFromMaster } = require("${rel}");`);
        }
      }
    } else {
      if (targetPath === "utils/text.cjs" && d === "matchGroup") {
        return;
      }
      // Find which module it belongs to
      const sourceModule = findModuleForFunction(d);
      if (sourceModule) {
        importsMap[sourceModule] = importsMap[sourceModule] || [];
        importsMap[sourceModule].push(d);
      }
    }
  });
  
  // Write requires
  fileContent += Array.from(requiresSet).sort().join("\n") + "\n";
  
  // Write relative imports from other utils/parsers
  Object.entries(importsMap).forEach(([sourceMod, fNames]) => {
    const absSource = path.join(baseDir, sourceMod);
    const absTarget = path.join(baseDir, targetPath);
    let rel = path.relative(path.dirname(absTarget), absSource).replace(/\\/g, "/");
    if (!rel.startsWith(".")) {
      rel = `./${rel}`;
    }
    
    fileContent += `const { ${fNames.join(", ")} } = require("${rel}");\n`;
  });
  
  fileContent += "\n";
  
  // Insert local matchGroup definition in utils/text.cjs
  if (targetPath === "utils/text.cjs") {
    fileContent += `function matchGroup(text, pattern, groupIndex = 1) {
  const match = text.match(pattern);
  return match?.[groupIndex]?.replace(/\\s+/g, " ").trim() || "";
}\n\n`;
  }
  
  // Insert MP_DISTRICTS in utils/locations.cjs
  if (targetPath === "utils/locations.cjs") {
    fileContent += `let rtoMaster = null;\n\n`;
    fileContent += `const MP_DISTRICTS = [
  "AGAR MALWA", "ALIRAJPUR", "ANUPPUR", "ASHOKNAGAR", "ASHOK NAGAR", "BALAGHAT", "BARWANI", "BETUL",
  "BHIND", "BHOPAL", "BURHANPUR", "CHHATARPUR", "CHHINDWARA", "DAMOH", "DATIA", "DEWAS", "DHAR",
  "DINDORI", "GUNA", "GWALIOR", "HARDA", "HOSHANGABAD", "NARMADAPURAM", "INDORE", "JABALPUR",
  "JHABUA", "KATNI", "KHANDWA", "KHARGONE", "MANDLA", "MANDSAUR", "MORENA", "NARSINGHPUR",
  "NEEMUCH", "NIWARI", "PANNA", "RAISEN", "RAJGARH", "RATLAM", "REWA", "SAGAR", "SATNA", "SEHORE",
  "SEONI", "SHAHDOL", "SHAJAPUR", "SHEOPUR", "SHIVPURI", "SIDHI", "SINGRAULI", "TIKAMGARH",
  "UJJAIN", "UMARIA", "VIDISHA"
];\n\n`;
  }
  
  // Write function bodies
  moduleFuncs.forEach(f => {
    let fCode = getFunctionCode(f);
    if (targetPath === "utils/locations.cjs") {
      fCode = fCode.replace("../../../rto-data/rto-master.json", "../../../../rto-data/rto-master.json");
    }
    fileContent += `// Start of ${f.name} (Lines ${f.startLine}-${f.endLine})\n`;
    fileContent += fCode + "\n\n";
  });
  
  // Write exports
  const exportNames = moduleFuncs.map(f => f.name);
  fileContent += `module.exports = {\n  ${exportNames.join(",\n  ")}\n};\n`;
  
  fs.writeFileSync(destFile, fileContent, "utf8");
  console.log(`Wrote ${moduleFuncs.length} functions to ${targetPath}`);
}

// Generate the new extractor.cjs
let newExtractorContent = `const pdf = require("pdf-parse");
const { understandDocument } = require("../understanding/understandDocument.js");
const { resolveSchema } = require("../intelligence/schemaEngine.js");
const { extractWithSchema } = require("../intelligence/dynamicExtractor.js");
const { mergeSchemaWithFallback, validateExtraction } = require("../intelligence/confidenceEngine.js");
const { normalizeInsuranceCompanyName: normalizeCompanyFromMaster } = require("../../master/insurance-companies.cjs");

`;

// Import all functions from utils and parsers
for (const [targetPath, moduleFuncs] of Object.entries(targets)) {
  if (targetPath === "extractor.cjs") continue;
  const exportNames = moduleFuncs.map(f => f.name);
  
  // We can require relative to extractor.cjs
  let relPath = `./${targetPath}`;
  newExtractorContent += `const {\n  ${exportNames.join(",\n  ")}\n} = require("${relPath}");\n\n`;
}

// Write the main extractor functions that remain in extractor.cjs
targets["extractor.cjs"].forEach(f => {
  newExtractorContent += `// Start of ${f.name}\n`;
  newExtractorContent += getFunctionCode(f) + "\n\n";
});

newExtractorContent += `module.exports = {\n  extractPolicyFromPdf,\n  extractPolicyFromText\n};\n`;

fs.writeFileSync(extractorPath, newExtractorContent, "utf8");
console.log("Rewrote extractor.cjs successfully!");
