const fs = require("fs");
const path = require("path");

const deps = JSON.parse(fs.readFileSync(path.resolve(__dirname, "dependencies.json"), "utf8"));

const keyFunctions = [
  "extractPolicyFromText",
  "buildIntelligentResult",
  "extractIciciMotor",
  "extractIciciWarehouseMsme",
  "extractTataAigMotor",
  "extractTataWarehouse",
  "extractIffcoMotorDetails",
  "extractIffcoWarehouse",
  "extractIffcoWorkmenCompensation",
  "extractNewIndiaMotorDetails",
  "extractHdfcErgoMotor",
  "extractGeneraliMotor",
  "extractRoyalSundaramMotor",
  "extractGoDigitMotor"
];

console.log("=== Key Functions Dependencies ===");
keyFunctions.forEach(name => {
  console.log(`- ${name} depends on:`, deps[name] || []);
});
