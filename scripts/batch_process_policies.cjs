const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const { extractPolicyFromText } = require("../lib/policies/pdf/extractor.cjs");

async function runBatchAnalysis() {
  const targetDir = path.join(__dirname, "../tests/POLICY PORTAL ENTRY- JUNE");
  
  if (!fs.existsSync(targetDir)) {
    console.error(`Error: Directory not found at ${targetDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(targetDir).filter(f => f.toLowerCase().endsWith(".pdf"));
  console.log(`Found ${files.length} PDF files to process in ${targetDir}`);

  const results = [];
  let processedCount = 0;
  let recognizedCount = 0;

  for (const file of files) {
    const filePath = path.join(targetDir, file);
    processedCount++;
    console.log(`[${processedCount}/${files.length}] Processing: ${file}...`);

    try {
      const buffer = fs.readFileSync(filePath);
      const startTime = Date.now();
      const parsed = await pdf(buffer);
      const rawText = parsed.text || "";
      const isScanned = rawText.replace(/\s+/g, "").length < 50;

      const extracted = extractPolicyFromText(rawText, file);
      const durationMs = Date.now() - startTime;

      const isRecognized = extracted && extracted.documentFormat && extracted.documentFormat !== "UNKNOWN";
      if (isRecognized) recognizedCount++;

      results.push({
        fileName: file,
        status: "SUCCESS",
        recognized: isRecognized,
        isScanned,
        documentFormat: extracted?.documentFormat || "UNKNOWN",
        insuranceCompany: extracted?.insuranceCompany || extracted?.companyName || "N/A",
        policyType: extracted?.policyType || "N/A",
        policyNumber: extracted?.policyNumber || "N/A",
        netPremium: extracted?.netPremium || "N/A",
        premiumIncludingGst: extracted?.premiumIncludingGst || "N/A",
        sumInsured: extracted?.sumInsured || "N/A",
        durationMs,
      });
    } catch (error) {
      console.error(`Failed to process ${file}:`, error.message);
      results.push({
        fileName: file,
        status: "FAILED",
        recognized: false,
        isScanned: false,
        documentFormat: "ERROR",
        insuranceCompany: "N/A",
        policyType: "N/A",
        policyNumber: "N/A",
        netPremium: "N/A",
        premiumIncludingGst: "N/A",
        sumInsured: "N/A",
        error: error.message,
      });
    }
  }

  // Generate Report
  const successRate = ((recognizedCount / files.length) * 100).toFixed(1);
  
  // Grouping by Insurance Company
  const companyCounts = {};
  const formatCounts = {};
  const scannedFiles = [];
  const unrecognizedTextFiles = [];

  results.forEach(r => {
    if (r.recognized) {
      companyCounts[r.insuranceCompany] = (companyCounts[r.insuranceCompany] || 0) + 1;
      formatCounts[r.documentFormat] = (formatCounts[r.documentFormat] || 0) + 1;
    } else {
      if (r.isScanned) {
        scannedFiles.push(r.fileName);
      } else {
        unrecognizedTextFiles.push(r.fileName);
      }
    }
  });

  let report = `# Batch Policy Extraction & Training Report\n\n`;
  report += `Generated on: ${new Date().toLocaleString()}\n`;
  report += `Target Directory: \`tests/POLICY PORTAL ENTRY- JUNE\`\n\n`;

  report += `## Summary Metrics\n\n`;
  report += `| Metric | Value |\n`;
  report += `| :--- | :--- |\n`;
  report += `| **Total PDFs Processed** | ${files.length} |\n`;
  report += `| **Recognized/Parsed Successfully** | ${recognizedCount} |\n`;
  report += `| **Scanned (Image-Only) PDFs (Require OCR)** | ${scannedFiles.length} |\n`;
  report += `| **Unrecognized Text PDFs** | ${unrecognizedTextFiles.length} |\n`;
  report += `| **Rule-Based Success Rate (All Files)** | ${successRate}% |\n`;
  report += `| **Rule-Based Success Rate (Text Files Only)** | ${((recognizedCount / (files.length - scannedFiles.length)) * 100).toFixed(1)}% |\n\n`;

  report += `## Breakdown by Insurance Company\n\n`;
  report += `| Insurance Company | Count |\n`;
  report += `| :--- | :--- |\n`;
  if (Object.keys(companyCounts).length === 0) {
    report += `| *No recognized companies* | 0 |\n`;
  } else {
    Object.entries(companyCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([company, count]) => {
        report += `| ${company} | ${count} |\n`;
      });
  }
  report += `\n`;

  report += `## Breakdown by Document Format\n\n`;
  report += `| Document Format | Count |\n`;
  report += `| :--- | :--- |\n`;
  if (Object.keys(formatCounts).length === 0) {
    report += `| *No recognized formats* | 0 |\n`;
  } else {
    Object.entries(formatCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([format, count]) => {
        report += `| \`${format}\` | ${count} |\n`;
      });
  }
  report += `\n`;

  report += `## Detailed Results (First 30 files)\n\n`;
  report += `| File Name | Recognized | Format | Policy Number | Net Premium | Sum Insured |\n`;
  report += `| :--- | :---: | :--- | :--- | :--- | :--- |\n`;
  results.slice(0, 30).forEach(r => {
    report += `| ${r.fileName} | ${r.recognized ? "✅" : (r.isScanned ? "📷 Scanned" : "❌ Unrecognized")} | \`${r.documentFormat}\` | ${r.policyNumber} | ${r.netPremium} | ${r.sumInsured} |\n`;
  });
  if (results.length > 30) {
    report += `| ...and ${results.length - 30} more files | | | | | |\n`;
  }
  report += `\n`;

  if (unrecognizedTextFiles.length > 0) {
    report += `## Unrecognized Text Files (${unrecognizedTextFiles.length})\n\n`;
    report += `These files contain extractable text but did not match any of the registered parsing rules:\n\n`;
    unrecognizedTextFiles.forEach(file => {
      report += `- \`${file}\`\n`;
    });
    report += `\n`;
  } else {
    report += `## Unrecognized Text Files\n\n🎉 100% of the text-based PDF files were successfully recognized and parsed!\n\n`;
  }

  if (scannedFiles.length > 0) {
    report += `## Scanned (Image-Only) Files (${scannedFiles.length})\n\n`;
    report += `These files contain no extractable text layer and require OCR/AI processing to read:\n\n`;
    scannedFiles.forEach(file => {
      report += `- \`${file}\`\n`;
    });
  }

  // Write report file
  const reportPath = path.join(__dirname, "../artifacts/policy_analysis_report.md");
  const fallbackArtifactPath = "C:/Users/abhis/.gemini/antigravity-ide/brain/0c07dfaa-6df4-4551-8068-71b33af2628b/policy_analysis_report.md";
  
  // Ensure folders exist
  [reportPath, fallbackArtifactPath].forEach(p => {
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(p, report);
  });
  console.log(`\nReport successfully written to workspace and artifacts directory.`);
}

runBatchAnalysis().catch(err => {
  console.error("Batch process crashed:", err);
  process.exit(1);
});
