const fs = require("fs");
const path = require("path");
const { extractPolicyFromPdf } = require("../src/lib/policies/pdf/extractor.cjs");
const { extractTextFromPdf } = require("../src/lib/policies/pdf/text.js");

const testFiles = [
  "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\ENDORSEMENT HARIOM WAREHOUSE AC MPWLC - FIRE POLICY.pdf",
  "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\ENDORSEMENT HARIOM WAREHOUSEAC MPWLC-BURGLARY POLICY.pdf",
  "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\ENDORSEMENT HARIOMWAREHOUSEACMPWLC-FIDELITY POLICY.pdf",
  "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\GURU KRIPA WAREHOUSE AC MPWLC-FIRE ENDORSEMENT.pdf",
  "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\krishna warehouse endorsement.pdf",
  "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\MISHRA WAREHOUSE PVT. LTD. AC MPWLC_ ENDORSEMENT.pdf",
  "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\TARA AGRO PARK AC MPWLC -endorsement.pdf",
  "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\SHRI MOOLCHAND JI WAREHOUSE AC MPWLC - BURGLARY  ENDORSEMENT.pdf",
  "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\BARSAIYAN WAREHOUSE AC MPWLC ENDORSEMENT.pdf",
  "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\DEVANSHI WAREHOUSE AC MPWLC ENDORSEMENT.pdf",
  "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\AGRAWAL WAREHOUSE AC MPWLC_ ENDO.pdf",
  "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\ASHIRWAD WAREHOUSE ENDO.pdf",
  "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\ENDO_K S PUSHPDEEEP WAREHOUSE.pdf",
  "c:\\Users\\abhis\\insuredesk-crm\\tests\\POLICY PORTAL ENTRY- JUNE\\ENDO_KRISHNA WAREHOUSE-POLICY.pdf"
];

async function run() {
  process.env.OCR_MAX_PAGES = "13";
  for (const filePath of testFiles) {
    console.log(`\n========================================`);
    console.log(`File: ${path.basename(filePath)}`);
    if (!fs.existsSync(filePath)) {
      console.log("File does not exist!");
      continue;
    }
    try {
      const buffer = fs.readFileSync(filePath);
      
      // Native CRM pipeline first renders text via OCR if needed
      const textResult = await extractTextFromPdf(buffer);
      const result = await extractPolicyFromPdf(buffer, path.basename(filePath));
      
      // Let's check if the result is empty. If it is empty, re-run parsing using OCRed text!
      let finalResult = result;
      if (!result.documentDetected || !result.insuredName) {
        const parsedWithOcr = require("../src/lib/policies/pdf/extractor.cjs").extractPolicyFromText(textResult.rawText, path.basename(filePath));
        finalResult = parsedWithOcr;
      }

      console.log("Output:");
      console.log(JSON.stringify({
        documentDetected: finalResult.documentDetected,
        company: finalResult.insuranceCompany,
        category: finalResult.documentCategory,
        insuredName: finalResult.insuredName,
        policyNumber: finalResult.policyNumber,
        sumInsured: finalResult.sumInsured,
        premium: finalResult.premium,
        netPremium: finalResult.netPremium,
        premiumIncludingGst: finalResult.premiumIncludingGst,
        riskLocation: finalResult.riskLocation ? (finalResult.riskLocation.slice(0, 100) + "...") : ""
      }, null, 2));
    } catch (e) {
      console.error("Failed to parse:", e);
    }
  }
}

run();
