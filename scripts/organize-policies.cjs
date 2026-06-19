const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const readline = require("readline");

// Load standard CommonJS extraction libraries from codebase
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");
const { normalizeInsuranceCompanyName } = require("../src/lib/master/insurance-companies.cjs");
const { classifyDocument } = require("../src/lib/policies/understanding/classifyDocument.js");

// Configuration
const IGNORED_DIRS = ["node_modules", ".git", ".next", "organized-policies", "artifacts", "reports", "backups"];
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_ROOT = path.join(PROJECT_ROOT, "organized-policies");
const REPORT_PATH = path.join(OUTPUT_ROOT, "sorting-report.json");
const BATCH_SIZE = 25; // Safe concurrency limit for PDF parsing and OCR

// State
let totalFiles = 0;
let processedCount = 0;
let companyDetectedCount = 0;
let unknownCount = 0;
let startTime = Date.now();

const companiesStats = {};
const policyTypesStats = {};
const unknownFilesList = [];
const allProcessedDetails = [];

// Skip/Resume Cache
const processedFilesSet = new Set();
const existingReportFilesMap = new Map();
const existingUnknownFilesMap = new Map();

/**
 * Recursively scans a directory for PDF files.
 */
function scanDirectoryForPdfs(dir, pdfs = []) {
  const base = path.basename(dir);
  if (IGNORED_DIRS.includes(base)) return pdfs;

  let list;
  try {
    list = fs.readdirSync(dir);
  } catch (err) {
    return pdfs;
  }

  for (const item of list) {
    const fullPath = path.join(dir, item);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch (err) {
      continue;
    }

    if (stat.isDirectory()) {
      scanDirectoryForPdfs(fullPath, pdfs);
    } else if (item.toLowerCase().endsWith(".pdf")) {
      pdfs.push(fullPath);
    }
  }
  return pdfs;
}

/**
 * Returns a unique path in the destination directory to prevent filename collisions.
 */
function getUniqueDestinationPath(destDir, filename) {
  let destPath = path.join(destDir, filename);
  if (!fs.existsSync(destPath)) {
    return destPath;
  }

  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let counter = 1;
  while (true) {
    const newName = `${base}_${counter}${ext}`;
    destPath = path.join(destDir, newName);
    if (!fs.existsSync(destPath)) {
      return destPath;
    }
    counter++;
  }
}

/**
 * Classifies the policy type using existing pipeline cues and text keyword signals.
 */
function detectPolicyType(extracted, rawText) {
  const text = (rawText || "").toLowerCase();
  const category = (extracted?.documentCategory || extracted?.policyUnderstanding?.documentCategory || "").toLowerCase();
  const format = (extracted?.documentFormat || extracted?.policyUnderstanding?.documentFormat || "").toLowerCase();
  const type = (extracted?.policyType || extracted?.policyUnderstanding?.policyType || "").toLowerCase();

  // 1. Motor
  if (
    category.includes("motor") || category.includes("vehicle") ||
    format.includes("motor") ||
    type.includes("motor") || type.includes("car") || type.includes("bike") || type.includes("two wheeler") || type.includes("vehicle") ||
    text.includes("private car") || text.includes("two wheeler") || text.includes("commercial vehicle") ||
    (text.includes("chassis no") && text.includes("engine no") && text.includes("registration no"))
  ) {
    return "Motor";
  }

  // 2. Warehouse
  if (
    category.includes("warehouse") ||
    format.includes("warehouse") ||
    type.includes("warehouse") ||
    text.includes("warehouse") || text.includes("godown")
  ) {
    return "Warehouse";
  }

  // 3. Fire
  if (
    format.includes("fire") ||
    type.includes("fire") || type.includes("sfsp") ||
    text.includes("standard fire") || text.includes("fire and special perils") || text.includes("sfsp")
  ) {
    return "Fire";
  }

  // 4. Marine
  if (
    format.includes("marine") ||
    type.includes("marine") || type.includes("cargo") ||
    text.includes("marine cargo") || text.includes("marine policy") || text.includes("transit insurance")
  ) {
    return "Marine";
  }

  // 5. Health
  if (
    category.includes("health") || category.includes("medical") ||
    format.includes("health") || format.includes("mediclaim") ||
    type.includes("health") || type.includes("mediclaim") || type.includes("medical") || type.includes("floater") ||
    text.includes("hospitalization") || text.includes("mediclaim") || text.includes("individual health") || text.includes("family floater") || text.includes("members covered")
  ) {
    return "Health";
  }

  // 6. Life
  if (
    category.includes("life") ||
    format.includes("life") ||
    type.includes("life") || type.includes("term") ||
    text.includes("life assured") || text.includes("term insurance") || text.includes("sum assured")
  ) {
    return "Life";
  }

  // 7. Fidelity
  if (
    type.includes("fidelity") ||
    text.includes("fidelity guarantee") || text.includes("fidelity policy")
  ) {
    return "Fidelity";
  }

  // 8. Burglary
  if (
    format.includes("burglary") ||
    type.includes("burglary") ||
    text.includes("burglary and housebreaking") || text.includes("burglary policy") || text.includes("house breaking")
  ) {
    return "Burglary";
  }

  // 9. Liability
  if (
    format.includes("liability") || format.includes("workmen") ||
    type.includes("liability") || type.includes("public liability") || type.includes("professional indemnity") || type.includes("workmen") ||
    text.includes("workmen's compensation") || text.includes("workman's compensation") || text.includes("public liability") || text.includes("professional indemnity")
  ) {
    return "Liability";
  }

  // 10. Shop
  if (
    type.includes("shop") ||
    text.includes("shopkeeper") || text.includes("shop keeper") || text.includes("shop package")
  ) {
    return "Shop";
  }

  // 11. Office
  if (
    type.includes("office") ||
    text.includes("office protector") || text.includes("office package")
  ) {
    return "Office";
  }

  // 12. Engineering
  if (
    type.includes("engineering") ||
    text.includes("contractors all risk") || text.includes("contractor's all risk") || text.includes("erection all risk") || text.includes("machinery breakdown")
  ) {
    return "Engineering";
  }

  // 13. Commercial
  if (
    category.includes("commercial") || category.includes("business") ||
    format.includes("commercial") || format.includes("msme") ||
    type.includes("commercial") || type.includes("business") || type.includes("msme") ||
    text.includes("msme suraksha") || text.includes("business asset")
  ) {
    return "Commercial";
  }

  return "Miscellaneous";
}

/**
 * Resolves standard subfolder destinations by company and type.
 */
function getDestinationSubfolder(company, policyType) {
  if (company === "ICICI Lombard") {
    if (policyType === "Motor") return "Motor";
    if (policyType === "Warehouse") return "Warehouse";
    if (policyType === "Marine") return "Marine";
    if (policyType === "Health") return "Health";
    return "Other";
  }

  if (company === "Bajaj Allianz") {
    if (policyType === "Motor") return "Motor";
    if (policyType === "Health") return "Health";
    return "Other";
  }

  if (company === "Tata AIG" || company === "IFFCO Tokio") {
    if (policyType === "Motor") return "Motor";
    if (policyType === "Warehouse") return "Warehouse";
    return "Other";
  }

  // For HDFC ERGO, Royal Sundaram, Future Generali, New India Assurance, Go Digit:
  // Map standard policy types directly, otherwise put under "Other"
  if (policyType && ["Motor", "Warehouse", "Marine", "Health", "Fire", "Life", "Fidelity", "Commercial", "Shop", "Office", "Liability", "Burglary", "Engineering", "Miscellaneous"].includes(policyType)) {
    return policyType;
  }
  return "Other";
}

/**
 * Displays live progress stats in-place in the console.
 */
function updateProgress() {
  const elapsed = (Date.now() - startTime) / 1000;
  const speed = elapsed > 0 ? processedCount / elapsed : 0;

  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
  process.stdout.write(
    `Processed: ${processedCount} / ${totalFiles} | ` +
    `Company Detected: ${companyDetectedCount} | ` +
    `Unknown: ${unknownCount} | ` +
    `Speed: ${speed.toFixed(1)} PDFs/sec`
  );
}

/**
 * Initializes the existing report cache to skip already sorted files (Skip/Resume).
 */
function loadExistingReport() {
  if (!fs.existsSync(REPORT_PATH)) return;

  try {
    const reportData = JSON.parse(fs.readFileSync(REPORT_PATH, "utf8"));
    if (reportData.files && Array.isArray(reportData.files)) {
      for (const entry of reportData.files) {
        if (entry.fileName) {
          processedFilesSet.add(entry.fileName);
          existingReportFilesMap.set(entry.fileName, entry);
        }
      }
    }
    if (reportData.unknownFiles && Array.isArray(reportData.unknownFiles)) {
      for (const entry of reportData.unknownFiles) {
        if (entry.file) {
          existingUnknownFilesMap.set(entry.file, entry);
        }
      }
    }
    console.log(`Loaded existing sorting-report.json. Found ${processedFilesSet.size} already processed files.`);
  } catch (err) {
    console.warn(`Could not parse existing sorting-report.json: ${err.message}`);
  }
}

/**
 * Processes a single PDF file (extracts text, resolves carrier/type, and copies to target).
 */
async function processFile(filePath, extractTextFromPdf) {
  const filename = path.basename(filePath);
  const relPath = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, "/");

  // Skip/Resume Logic
  if (processedFilesSet.has(relPath)) {
    const cached = existingReportFilesMap.get(relPath);
    if (cached) {
      allProcessedDetails.push(cached);

      // Update statistics
      if (cached.company && cached.company !== "Unknown") {
        companyDetectedCount++;
        companiesStats[cached.company] = (companiesStats[cached.company] || 0) + 1;
      } else {
        unknownCount++;
        const cachedUnknown = existingUnknownFilesMap.get(relPath);
        if (cachedUnknown) {
          unknownFilesList.push(cachedUnknown);
        } else {
          unknownFilesList.push({
            file: relPath,
            reason: "Previously classified as unknown",
            detectedPolicyType: cached.policyType || "Miscellaneous"
          });
        }
      }

      if (cached.policyType) {
        policyTypesStats[cached.policyType] = (policyTypesStats[cached.policyType] || 0) + 1;
      }

      processedCount++;
      updateProgress();
      return;
    }
  }

  try {
    const buffer = fs.readFileSync(filePath);
    const result = await extractTextFromPdf(buffer);
    const rawText = result.rawText || "";

    // Check if text is completely unextractable
    if (rawText.replace(/\s+/g, "").length < 50) {
      const destDir = path.join(OUTPUT_ROOT, "Unknown", "Review Required");
      fs.mkdirSync(destDir, { recursive: true });
      const destPath = getUniqueDestinationPath(destDir, filename);
      fs.copyFileSync(filePath, destPath);

      const relDest = path.relative(PROJECT_ROOT, destPath).replace(/\\/g, "/");

      const fileInfo = {
        fileName: relPath,
        company: "Unknown",
        policyType: "Miscellaneous",
        confidence: "0.00",
        destination: relDest
      };

      allProcessedDetails.push(fileInfo);
      unknownFilesList.push({
        file: relPath,
        reason: "Text extraction failed / empty document (scanned PDF without OCR)",
        detectedPolicyType: "Miscellaneous"
      });

      unknownCount++;
      updateProgress();
      return;
    }

    const extracted = extractPolicyFromText(rawText, filename);

    // 1. Resolve carrier
    let companyName = null;
    let detectedName = extracted?.insuranceCompany || extracted?.companyName;
    if (!detectedName && extracted?.policyUnderstanding?.company) {
      detectedName = extracted.policyUnderstanding.company;
    }
    if (!detectedName) {
      const classification = classifyDocument(rawText);
      if (classification && classification.company) {
        detectedName = classification.company;
      }
    }

    if (detectedName) {
      const canonical = normalizeInsuranceCompanyName(detectedName, rawText);
      const companyMapping = {
        "ICICI Lombard General Insurance Company Limited": "ICICI Lombard",
        "Tata AIG General Insurance Company Limited": "Tata AIG",
        "Bajaj Allianz General Insurance Company Limited": "Bajaj Allianz",
        "IFFCO Tokio General Insurance Company Limited": "IFFCO Tokio",
        "HDFC ERGO General Insurance Company Limited": "HDFC ERGO",
        "Royal Sundaram General Insurance Company Limited": "Royal Sundaram",
        "Future Generali India Insurance Company Limited": "Future Generali",
        "The New India Assurance Company Limited": "New India Assurance",
        "Go Digit General Insurance Limited": "Go Digit"
      };
      companyName = companyMapping[canonical] || null;
    }

    // 2. Resolve policy type
    const resolvedType = detectPolicyType(extracted, rawText);

    // 3. Resolve destination path and copy
    let destDir;
    let finalCompany = "Unknown";
    let finalType = resolvedType;

    if (companyName) {
      finalCompany = companyName;
      const subfolder = getDestinationSubfolder(companyName, resolvedType);
      destDir = path.join(OUTPUT_ROOT, companyName, subfolder);
      companyDetectedCount++;
      companiesStats[companyName] = (companiesStats[companyName] || 0) + 1;
      policyTypesStats[resolvedType] = (policyTypesStats[resolvedType] || 0) + 1;
    } else {
      destDir = path.join(OUTPUT_ROOT, "Unknown", "Review Required");
      unknownCount++;
      unknownFilesList.push({
        file: relPath,
        reason: "Company not detected",
        detectedPolicyType: resolvedType
      });
    }

    fs.mkdirSync(destDir, { recursive: true });
    const destPath = getUniqueDestinationPath(destDir, filename);
    fs.copyFileSync(filePath, destPath);

    const relDest = path.relative(PROJECT_ROOT, destPath).replace(/\\/g, "/");
    const confidenceVal = extracted?.confidenceScore || extracted?.policyUnderstanding?.confidence || 0;

    const fileInfo = {
      fileName: relPath,
      company: finalCompany,
      policyType: finalType,
      confidence: confidenceVal.toFixed(2),
      destination: relDest
    };

    allProcessedDetails.push(fileInfo);
    processedCount++;
    updateProgress();
  } catch (err) {
    // Graceful routing of crashes to Unknown/Review Required
    const destDir = path.join(OUTPUT_ROOT, "Unknown", "Review Required");
    fs.mkdirSync(destDir, { recursive: true });
    const destPath = getUniqueDestinationPath(destDir, filename);

    try {
      fs.copyFileSync(filePath, destPath);
    } catch (copyErr) {
      // ignore copy error if file is locked or missing
    }

    const relDest = path.relative(PROJECT_ROOT, destPath).replace(/\\/g, "/");

    const fileInfo = {
      fileName: relPath,
      company: "Unknown",
      policyType: "Miscellaneous",
      confidence: "0.00",
      destination: relDest
    };

    allProcessedDetails.push(fileInfo);
    unknownFilesList.push({
      file: relPath,
      reason: `Processing crash: ${err.message}`,
      detectedPolicyType: "Miscellaneous"
    });

    unknownCount++;
    processedCount++;
    updateProgress();
  }
}

/**
 * Main function orchestrating the sorting operation.
 */
async function main() {
  const scanDir = process.argv[2] ? path.resolve(process.argv[2]) : PROJECT_ROOT;
  console.log(`Starting PDF Organization Utility...`);
  console.log(`Scanning directory: ${scanDir}`);
  console.log(`Output folder: ${OUTPUT_ROOT}`);

  // Create output root if not exists
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });

  // Load cache from previous run
  loadExistingReport();

  // Find all PDF files
  const pdfFiles = scanDirectoryForPdfs(scanDir);
  totalFiles = pdfFiles.length;
  console.log(`Found ${totalFiles} PDF files to process.\n`);

  if (totalFiles === 0) {
    console.log("No PDFs found. Exiting.");
    process.exit(0);
  }

  // Load the dynamic ES module extractor
  const textModulePath = path.resolve(__dirname, "../lib/policies/pdf/text.js");
  const textModule = await import(pathToFileURL(textModulePath).href);
  const extractTextFromPdf = textModule.extractTextFromPdf;

  startTime = Date.now();

  // Process in concurrent batches to scale well
  for (let i = 0; i < pdfFiles.length; i += BATCH_SIZE) {
    const batch = pdfFiles.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(file => processFile(file, extractTextFromPdf)));
  }

  console.log("\n\nSorting completed! Finalizing report...");

  // Generate sorting-report.json matching the exact expected format
  const finalReport = {
    totalFiles: totalFiles,
    companies: companiesStats,
    policyTypes: policyTypesStats,
    unknownFiles: unknownFilesList,
    files: allProcessedDetails
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(finalReport, null, 2), "utf8");

  console.log("\n=== Execution Summary ===");
  console.log(`Total PDFs: ${totalFiles}`);
  console.log(`Company Detected: ${companyDetectedCount}`);
  console.log(`Unknown / Review Required: ${unknownCount}`);
  console.log(`Report written to: ${path.relative(PROJECT_ROOT, REPORT_PATH)}`);
  console.log("==========================\n");
}

main().catch(err => {
  console.error("\nSorter script crashed with fatal error:", err);
  process.exit(1);
});
