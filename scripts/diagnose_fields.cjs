const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const { extractPolicyFromText } = require("../lib/policies/pdf/extractor.cjs");

async function main() {
  const targetDir = path.join(__dirname, "../tests/POLICY PORTAL ENTRY- JUNE");
  
  if (!fs.existsSync(targetDir)) {
    console.error(`Error: Directory not found at ${targetDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(targetDir).filter(f => f.toLowerCase().endsWith(".pdf"));
  const issues = [];
  let processedCount = 0;
  let recognizedCount = 0;

  for (const file of files) {
    const filePath = path.join(targetDir, file);
    try {
      const buffer = fs.readFileSync(filePath);
      const parsed = await pdf(buffer);
      const rawText = parsed.text || "";
      const isScanned = rawText.replace(/\s+/g, "").length < 50;

      if (isScanned) continue; // Skip scanned files

      processedCount++;
      const extracted = extractPolicyFromText(rawText, file);
      const isRecognized = extracted && extracted.documentFormat && extracted.documentFormat !== "UNKNOWN";

      if (!isRecognized) continue;
      recognizedCount++;

      // Check fields of interest
      const fileIssues = [];
      
      const district = String(extracted.district || "").trim();
      const tehsil = String(extracted.tehsil || "").trim();
      const sumInsured = String(extracted.sumInsured || "").trim();
      const netPremium = String(extracted.netPremium || "").trim();
      const premiumIncludingGst = String(extracted.premiumIncludingGst || "").trim();
      const policyType = String(extracted.policyType || "").trim();
      const description = String(extracted.businessDescription || extracted.description || "").trim();

      if (!district || district.toLowerCase() === "n/a") {
        fileIssues.push("Missing/Invalid District");
      }
      if (!tehsil || tehsil.toLowerCase() === "n/a") {
        fileIssues.push("Missing/Invalid Tehsil");
      }
      if (!sumInsured || sumInsured === "0" || sumInsured === "0.00" || sumInsured.toLowerCase() === "n/a") {
        fileIssues.push(`Missing/Invalid Sum Insured ("${sumInsured}")`);
      }
      if (!netPremium || netPremium === "0" || netPremium === "0.00" || netPremium.toLowerCase() === "n/a") {
        fileIssues.push(`Missing/Invalid Net Premium ("${netPremium}")`);
      }
      if (!premiumIncludingGst || premiumIncludingGst === "0" || premiumIncludingGst === "0.00" || premiumIncludingGst.toLowerCase() === "n/a") {
        fileIssues.push(`Missing/Invalid Gross Premium ("${premiumIncludingGst}")`);
      }
      if (!policyType || policyType.toLowerCase() === "n/a" || policyType === "UNKNOWN") {
        fileIssues.push("Missing/Invalid Policy Type");
      }
      if (!description || description.toLowerCase() === "n/a") {
        fileIssues.push("Missing/Invalid Description");
      }

      if (fileIssues.length > 0) {
        issues.push({
          file,
          format: extracted.documentFormat,
          issues: fileIssues,
          data: {
            district,
            tehsil,
            sumInsured,
            netPremium,
            premiumIncludingGst,
            policyType,
            description: description.substring(0, 40) + (description.length > 40 ? "..." : "")
          }
        });
      }
    } catch (err) {
      // Ignore reading errors for this diagnostic script
    }
  }

  console.log(`Processed ${processedCount} text-based PDFs. Recognized: ${recognizedCount}`);
  console.log(`Found issues in ${issues.length} files.\n`);

  if (issues.length > 0) {
    console.log("=== FILES WITH MISSING OR INSUFFICIENT FIELDS ===");
    issues.forEach(iss => {
      console.log(`\nFile: ${iss.file} (${iss.format})`);
      console.log(`Issues: ${iss.issues.join(", ")}`);
      console.log(`Extracted Values:`, JSON.stringify(iss.data, null, 2));
    });
  } else {
    console.log("🎉 All processed files have complete, valid fields!");
  }
}

main().catch(err => console.error(err));
