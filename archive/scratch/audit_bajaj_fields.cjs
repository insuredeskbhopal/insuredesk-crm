process.env.OCR_MAX_PAGES = "13";
const fs = require("fs");
const path = require("path");
const { extractPolicyFromText } = require("../../src/lib/policies/pdf/extractor.cjs");

async function auditFiles() {
  const { extractTextFromPdf } = await import("../../src/lib/policies/pdf/text.js");

  const bajajDir = path.join(__dirname, "../../organized-policies/Bajaj Allianz/Other");
  if (!fs.existsSync(bajajDir)) {
    console.error(`Directory not found: ${bajajDir}`);
    return;
  }
  const files = fs.readdirSync(bajajDir).filter(f => f.endsWith(".pdf"));

  console.log(`Auditing ${files.length} Bajaj Allianz Warehouse PDFs (using extractTextFromPdf)...\n`);
  
  const summary = [];

  for (const file of files) {
    const filePath = path.join(bajajDir, file);
    const data = fs.readFileSync(filePath);
    const textResult = await extractTextFromPdf(data);
    const text = textResult.rawText;

    const extResult = extractPolicyFromText(text, filePath);
    const detected = extResult.documentFormat !== undefined && extResult.documentFormat !== "";

    const auditMapping = {
      insuranceCompany: extResult.insuranceCompany || "Bajaj Allianz General Insurance Company Limited",
      policyType: extResult.policyType,
      policyNumber: extResult.policyNumber,
      insuredName: extResult.insuredName,
      customerAddress: extResult.mailingAddress,
      riskAddress: extResult.riskLocation,
      village: extResult.village,
      tehsil: extResult.tehsil,
      district: extResult.district,
      state: extResult.state,
      pincode: extResult.pincode,
      sumInsured: extResult.sumInsured,
      netPremium: extResult.netPremium,
      cgst: extResult.cgst,
      sgst: extResult.sgst,
      igst: extResult.igst,
      totalGst: extResult.gstAmount,
      totalPremium: extResult.premiumIncludingGst || extResult.totalPremium,
      policyStartDate: extResult.startDate,
      policyExpiryDate: extResult.expiryDate,
      issueDate: extResult.invoiceDate,
      business: extResult.businessType ? "Warehouse" : "",
      goodsDescription: extResult.goodsStored || extResult.businessDescription,
      occupancy: extResult.occupancy,
      coverages: extResult.coverages ? extResult.coverages.length : 0,
      employeeCount: extResult.employeeCount || "",
      financierName: extResult.hypothecationDetails || extResult.financerName,
      clientNumber: extResult.clientNumber || "",
      intermediaryName: extResult.brokerName,
      intermediaryCode: extResult.brokerCode,
      tieUpCode: extResult.tieUpCode || "",
      gstinNumber: extResult.gstin,
      invoiceNumber: extResult.invoiceNumber,
      invoiceDate: extResult.invoiceDate
    };

    const blanks = [];
    for (const [key, val] of Object.entries(auditMapping)) {
      if (val === "" || val === undefined || val === null || val === 0) {
        blanks.push(key);
      }
    }

    summary.push({
      file,
      detected,
      format: extResult.documentFormat || "N/A",
      subtype: extResult.policySubType || extResult.warehousePolicySubType || "N/A",
      policyNumber: extResult.policyNumber || "N/A",
      missingCount: blanks.length,
      missingFields: blanks
    });
  }

  console.log("=== AUDIT SUMMARY ===");
  console.log(String("File").padEnd(50) + " | " + String("Det").padEnd(3) + " | " + String("Format").padEnd(18) + " | " + String("Subtype").padEnd(25) + " | " + String("Miss").padEnd(4));
  console.log("-".repeat(110));
  for (const s of summary) {
    console.log(
      s.file.slice(0, 50).padEnd(50) + " | " + 
      (s.detected ? "YES" : "NO ").padEnd(3) + " | " + 
      s.format.padEnd(18) + " | " + 
      s.subtype.slice(0, 25).padEnd(25) + " | " + 
      String(s.missingCount).padEnd(4)
    );
    if (s.missingCount > 0 && s.detected) {
      console.log(`    Missing fields: ${s.missingFields.join(", ")}`);
    }
  }
}

auditFiles().catch(console.error);
