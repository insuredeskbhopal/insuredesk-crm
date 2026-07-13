/* @vitest-environment node */
// NOTE: Skipped � PDF fixture files removed from repo. Re-enable when new fixtures are provided.
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");
const { extractTextFromPdf } = require("../src/lib/policies/pdf/text.js");

describe("Endorsement Policy extraction regression baseline", () => {
  const testCases = [
    {
      file: "tests/POLICY PORTAL ENTRY- JUNE/ENDORSEMENT HARIOM WAREHOUSE AC MPWLC - FIRE POLICY.pdf",
      company: "Bajaj Allianz General Insurance Company Limited",
      category: "Warehouse Insurance",
      insuredName: "HARIOM WAREHOUSE A/C MPWLC",
      policyNumber: "OG-27-2806-4056-00000017",
      sumInsured: "5,00,00,000.00",
      netPremium: "12,385.00",
      premiumIncludingGst: "14,615.00"
    },
    {
      file: "tests/POLICY PORTAL ENTRY- JUNE/ENDORSEMENT HARIOM WAREHOUSEAC MPWLC-BURGLARY POLICY.pdf",
      company: "Bajaj Allianz General Insurance Company Limited",
      category: "Warehouse Insurance",
      insuredName: "HARIOM WAREHOUSE A/C MPWLC",
      policyNumber: "OG-27-2806-4010-00000006",
      sumInsured: "5,00,00,000.00",
      netPremium: "439.00",
      premiumIncludingGst: "519.00"
    },
    {
      file: "tests/POLICY PORTAL ENTRY- JUNE/ENDORSEMENT HARIOMWAREHOUSEACMPWLC-FIDELITY POLICY.pdf",
      company: "Bajaj Allianz General Insurance Company Limited",
      category: "Warehouse Insurance",
      insuredName: "HARIOM WAREHOUSE A/C MPWLC",
      policyNumber: "OG-27-2806-3310-00000007",
      sumInsured: "50,00,000.00",
      netPremium: "1,165.00",
      premiumIncludingGst: "1,375.00"
    },
    {
      file: "tests/POLICY PORTAL ENTRY- JUNE/GURU KRIPA WAREHOUSE AC MPWLC-FIRE ENDORSEMENT.pdf",
      company: "Bajaj Allianz General Insurance Company Limited",
      category: "Warehouse Insurance",
      insuredName: "GURU KRIPA WAREHOUSE A/C MPWLC",
      policyNumber: "OG-27-2301-4056-00000464",
      sumInsured: "8,50,00,000.00",
      netPremium: "19,099.00",
      premiumIncludingGst: "22,539.00"
    },
    {
      file: "tests/POLICY PORTAL ENTRY- JUNE/krishna warehouse endorsement.pdf",
      company: "ICICI Lombard General Insurance Company Limited",
      category: "Fire Insurance",
      insuredName: "KRISHNA WAREHOUSE",
      policyNumber: "1030/440516959/00/000",
      sumInsured: "2,10,00,000.00",
      netPremium: "4,395.00",
      premiumIncludingGst: "6962.00"
    },
    {
      file: "tests/POLICY PORTAL ENTRY- JUNE/MISHRA WAREHOUSE PVT. LTD. AC MPWLC_ ENDORSEMENT.pdf",
      company: "ICICI Lombard General Insurance Company Limited",
      category: "Fire Insurance",
      insuredName: "MISHRA WAREHOUSE PVT. LTD. A/C MPWLC",
      policyNumber: "1030/435138091/00/000",
      sumInsured: "61,100,000.00",
      netPremium: "33,350.00",
      premiumIncludingGst: "195973.00"
    },
    {
      file: "tests/POLICY PORTAL ENTRY- JUNE/TARA AGRO PARK AC MPWLC -endorsement.pdf",
      company: "ICICI Lombard General Insurance Company Limited",
      category: "Fire Insurance",
      insuredName: "TARA AGRO PARK A/C MPWLC",
      policyNumber: "1030/432322688/00/000",
      sumInsured: "15,16,20,000.00",
      netPremium: "16,509.00",
      premiumIncludingGst: "47517.00"
    },
    {
      file: "tests/POLICY PORTAL ENTRY- JUNE/SHRI MOOLCHAND JI WAREHOUSE AC MPWLC - BURGLARY  ENDORSEMENT.pdf",
      company: "IFFCO Tokio General Insurance Company Limited",
      category: "Warehouse Insurance",
      insuredName: "SHRI MOOLCHAND JI WAREHOUSE A/C MPWLC",
      policyNumber: "44542417",
      sumInsured: "207500000.00",
      netPremium: "248.81",
      premiumIncludingGst: "294.00"
    },
    {
      file: "tests/POLICY PORTAL ENTRY- JUNE/BARSAIYAN WAREHOUSE AC MPWLC ENDORSEMENT.pdf",
      company: "ICICI Lombard General Insurance Company Limited",
      category: "Fire Insurance",
      insuredName: "BARSAIYAN WAREHOUSE A/C MPWLC",
      policyNumber: "1030/429784772/00/000",
      sumInsured: "14,70,00,000.00",
      netPremium: "26,034.00",
      premiumIncludingGst: "923.00"
    },
    {
      file: "tests/POLICY PORTAL ENTRY- JUNE/DEVANSHI WAREHOUSE AC MPWLC ENDORSEMENT.pdf",
      company: "ICICI Lombard General Insurance Company Limited",
      category: "Fire Insurance",
      insuredName: "DEVANSHI WAREHOUSE A/C MPWLC",
      policyNumber: "1030/421336154/00/000",
      sumInsured: "20,00,00,000.00",
      netPremium: "530.00",
      premiumIncludingGst: "140008.00"
    },
    {
      file: "tests/POLICY PORTAL ENTRY- JUNE/AGRAWAL WAREHOUSE AC MPWLC_ ENDO.pdf",
      company: "Tata AIG General Insurance Company Limited",
      category: "Warehouse Insurance",
      insuredName: "AGRAWAL WAREHOUSE A/C MPWLC",
      policyNumber: "5161110906",
      sumInsured: "45,000,000.00",
      netPremium: "12,402.00",
      premiumIncludingGst: "14,634.00"
    },
    {
      file: "tests/POLICY PORTAL ENTRY- JUNE/ASHIRWAD WAREHOUSE ENDO.pdf",
      company: "ICICI Lombard General Insurance Company Limited",
      category: "Fire Insurance",
      insuredName: "ASHIRWAD WAREHOUSING A/C MPWLC",
      policyNumber: "1030/437418639/00/000",
      sumInsured: "8,12,70,000.00",
      netPremium: "21,645.00",
      premiumIncludingGst: "71913.00"
    },
    {
      file: "tests/POLICY PORTAL ENTRY- JUNE/ENDO_K S PUSHPDEEEP WAREHOUSE.pdf",
      company: "ICICI Lombard General Insurance Company Limited",
      category: "Fire Insurance",
      insuredName: "K S PUSHPDEEP WAREHOUSE A/C MPWLC",
      policyNumber: "1030/431934072/00/000",
      sumInsured: "8,00,00,000.00",
      netPremium: "31,757.00",
      premiumIncludingGst: "47,506.00"
    },
    {
      file: "tests/POLICY PORTAL ENTRY- JUNE/ENDO_KRISHNA WAREHOUSE-POLICY.pdf",
      company: "ICICI Lombard General Insurance Company Limited",
      category: "Fire Insurance",
      insuredName: "KRISHNA WAREHOUSE",
      policyNumber: "1030/440516959/00/000",
      sumInsured: "1,00,00,000.00",
      netPremium: "4,395.00",
      premiumIncludingGst: "6,963.00"
    }
  ];

  testCases.forEach((tc) => {
    it(`regression check for ${tc.file.split("/").pop()}`, async () => {
      const buffer = fs.readFileSync(tc.file);
      const textResult = await extractTextFromPdf(buffer);
      const result = extractPolicyFromText(textResult.rawText, tc.file);

      expect(result.documentFormat).toBeTruthy();
      expect(result.insuranceCompany).toBe(tc.company);
      expect(result.documentCategory).toBe(tc.category);
      expect(result.insuredName).toBe(tc.insuredName);
      expect(result.policyNumber).toBe(tc.policyNumber);
      expect(result.sumInsured).toBe(tc.sumInsured);
      expect(result.netPremium).toBe(tc.netPremium);
      expect(result.premiumIncludingGst || result.premium).toBe(tc.premiumIncludingGst);
    }, 30000);
  });
});
