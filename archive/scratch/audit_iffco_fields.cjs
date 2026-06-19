const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const { extractIffcoWarehouse } = require("../../src/lib/policies/pdf/parsers/iffco/index.cjs");
const { cleanText } = require("../../src/lib/policies/pdf/utils/text.cjs");


async function auditFiles() {
  const iffcoDir = path.join(__dirname, "../../tests/Warehouse/IFFCO");
  const files = fs.readdirSync(iffcoDir).filter(f => f.endsWith(".pdf"));

  console.log(`Auditing ${files.length} IFFCO Warehouse PDFs...\n`);

  for (const file of files) {
    const filePath = path.join(iffcoDir, file);
    const data = fs.readFileSync(filePath);
    const parsed = await pdf(data);
    const text = cleanText(parsed.text || "");

    const extResult = extractIffcoWarehouse(text, filePath);

    const auditMapping = {
      insuranceCompany: extResult.companyName || "IFFCO-TOKIO GENERAL INSURANCE CO. LTD",
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
      totalPremium: extResult.premiumIncludingGst,
      policyStartDate: extResult.startDate,
      policyExpiryDate: extResult.expiryDate,
      issueDate: extResult.invoiceDate,
      business: extResult.businessDescription ? "Warehouse" : "", // Or map properly
      goodsDescription: extResult.goodsStored || extResult.businessDescription,
      occupancy: extResult.occupancy,
      coverages: extResult.coverages ? extResult.coverages.length : 0,
      employeeCount: extResult.employeeCount || "",
      financierName: extResult.hypothecationDetails,
      clientNumber: extResult.clientNumber || "",
      intermediaryName: extResult.brokerName,
      intermediaryCode: extResult.brokerCode,
      tieUpCode: extResult.tieUpCode || "",
      gstinNumber: extResult.gstin,
      invoiceNumber: extResult.invoiceNumber,
      invoiceDate: extResult.invoiceDate
    };

    console.log(`=== File: ${file} ===`);
    console.log(`Document Detected: ${extResult.documentDetected}`);
    console.log(`Subtype Detected: ${extResult.subType}`);
    
    const blanks = [];
    for (const [key, val] of Object.entries(auditMapping)) {
      if (val === "" || val === undefined || val === null || val === 0) {
        blanks.push(key);
      }
    }

    if (blanks.length > 0) {
      console.log(`  Missing/Blank Fields: ${blanks.join(", ")}`);
    } else {
      console.log(`  All fields extracted successfully!`);
    }
    
    // Print a few key values for sanity check
    console.log(`  Policy Number: "${auditMapping.policyNumber}"`);
    console.log(`  Insured Name: "${auditMapping.insuredName}"`);
    console.log(`  Risk Location: "${auditMapping.riskAddress}"`);
    console.log(`  District: "${auditMapping.district}" | Tehsil: "${auditMapping.tehsil}" | Village: "${auditMapping.village}"`);
    console.log(`  Total Premium: "${auditMapping.totalPremium}"`);
    console.log(`\n`);
  }
}

auditFiles().catch(console.error);
