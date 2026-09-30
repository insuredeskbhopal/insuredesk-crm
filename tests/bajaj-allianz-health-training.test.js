/* @vitest-environment node */
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");
const { selectScopedTraining, applyScopedTraining } = require("../src/lib/policies/pdf/training/registry.cjs");
const trainer = require("../src/lib/policies/pdf/training/bajaj-allianz/health.cjs");

describe("Bajaj Allianz Health / GMC Training", () => {
  const gmcPath = path.join(process.cwd(), "storage", "Insuredesk_GMC_policy-26-27.pdf");

  it("extracts Insuredesk GMC policy correctly end-to-end", async () => {
    if (!fs.existsSync(gmcPath)) return;
    const buf = fs.readFileSync(gmcPath);
    const parsed = await pdf(buf);
    const result = extractPolicyFromText(parsed.text, "Insuredesk_GMC_policy-26-27.pdf");

    expect(result.insuranceCompany).toBe("Bajaj Allianz General Insurance Company Limited");
    expect(result.documentCategory).toBe("Health Insurance");
    expect(result.documentFormat).toBe("BAJAJ_ALLIANZ_HEALTH_V1");
    expect(result.productName).toBe("Flexi Health Protect Plan(Group) -Individual");
    expect(result.policyType).toBe("Group Health Insurance");
    expect(result.policyCoverType).toBe("Group");
    expect(result.policyNumber).toBe("12-8604-0000003141-00");
    expect(result.insuredName).toBe("INSUREDESK IMF PRIVATE LIMITED");
    expect(result.customerName).toBe("INSUREDESK IMF PRIVATE LIMITED");
    expect(result.policyStartDate).toBe("16/09/2026");
    expect(result.policyEndDate).toBe("15/09/2027");
    expect(result.netPremium).toBe("30,374.00");
    expect(result.cgst).toBe("2,734.00");
    expect(result.sgst).toBe("2,734.00");
    expect(result.igst).toBe("0.00");
    expect(result.gstAmount).toBe("5,468.00");
    expect(result.totalPremium).toBe("35,841.00");
    expect(result.grossPremium).toBe("35,841.00");
    expect(result.sumInsured).toBe("45,00,000.00");
    expect(result.totalSumInsured).toBe("45,00,000.00");
    expect(result.numberOfInsuredMembers).toBe(15);
    expect(result.contactNumber).toBe("8818889660");
    expect(result.partnerId).toBe("PO40856520");
    expect(result.pincode).toBe("462047");
    expect(result.agentName).toBe("PRAGATI PANDEY");
    expect(result.agentCode).toBe("10107590");
    expect(result.agentMobile).toBe("8818889660");
    expect(result.agentEmail).toBe("ANAND.SONI10@GMAIL.COM");
    expect(result.communicationAddress).toContain("FLAT NO S-2 KUNJAN NAGAR");

    // Must be completely free of motor artifacts
    expect(result.vehicleNumber).toBe("");
    expect(result.registrationNumber).toBe("");
    expect(result.idv).toBe("");
  });

  it("trainer module produces correct patch directly", () => {
    const sample = `
Bajaj General Insurance Limited
POLICY SCHEDULE
Flexi Health Protect Plan(Group) -Individual
UIN: BAJHLGP22165V012122
12-8604-0000003141-00
From 16/09/2026 00:00 Hrs To 15/09/2027 Midnight
ACTIVE
INSUREDESK IMF PRIVATE LIMITED
FLAT NO S-2 KUNJAN NAGAR NARMADAPURAM ROAD, NIKHIL PHASE 2, BHOPAL, BHOPAL, MADHYA PRADESH, Pincode:462047
462047
8818889660
PO40856520
CategoryTotal Self countTotal Dependent countTotal Sum Insured
cat-11504500000
*** All Premium figures are in Rupees
SGST (9%)
IGST (18%)
UTGST (9%)
Gross Premium
CGST (9%)
Total Net Premium :
Cess (x%)
2734
2734
0
0
35841
30374
0
CompanyShare (%)
Broker /Agent Email
8818889660
Broker / Agent Code
Broker /Agent NamePRAGATI PANDEY
Channel Name
IMD Details
Broker/Agent Contact No
ANAND.SONI10@GMAIL.COM
10107590
`;
    const patch = trainer.train({ text: sample });
    expect(patch.policyNumber).toBe("12-8604-0000003141-00");
    expect(patch.insuredName).toBe("INSUREDESK IMF PRIVATE LIMITED");
    expect(patch.policyStartDate).toBe("16/09/2026");
    expect(patch.policyEndDate).toBe("15/09/2027");
    expect(patch.netPremium).toBe("30,374.00");
    expect(patch.cgst).toBe("2,734.00");
    expect(patch.sgst).toBe("2,734.00");
    expect(patch.gstAmount).toBe("5,468.00");
    expect(patch.totalPremium).toBe("35,841.00");
    expect(patch.sumInsured).toBe("45,00,000.00");
    expect(patch.numberOfInsuredMembers).toBe(15);
    expect(patch.vehicleNumber).toBe("");
  });

  describe("Isolation Verification", () => {
    it("does not select Bajaj Allianz Health training for Bajaj Allianz Motor", () => {
      const motorContext = {
        insuranceCompany: "Bajaj Allianz General Insurance Company Limited",
        documentCategory: "Motor Insurance",
        policyType: "Private Car Package Policy",
        sourceText: "Bajaj Allianz Two-Wheeler Package Policy Registration No MP04AB1234 Engine No E12345",
      };
      const selected = selectScopedTraining(motorContext, { text: motorContext.sourceText });
      const hasHealthTrainer = selected.some(
        (t) => t.scope.insurer === "bajaj-allianz" && t.scope.category === "health",
      );
      expect(hasHealthTrainer).toBe(false);
    });

    it("does not select Bajaj Allianz Health training for Bajaj Allianz Fire", () => {
      const fireContext = {
        insuranceCompany: "Bajaj Allianz General Insurance Company Limited",
        documentCategory: "Fire Insurance",
        policyType: "Bharat Sookshma Udyam Suraksha",
        sourceText: "Bajaj Allianz SHOP NON HAZARDOUS Policy OG-24-1234-4056-00001234",
      };
      const selected = selectScopedTraining(fireContext, { text: fireContext.sourceText });
      const hasHealthTrainer = selected.some(
        (t) => t.scope.insurer === "bajaj-allianz" && t.scope.category === "health",
      );
      expect(hasHealthTrainer).toBe(false);
    });

    it("does not select Bajaj Allianz Health training for Care Health", () => {
      const careContext = {
        insuranceCompany: "Care Health Insurance Limited",
        documentCategory: "Health Insurance",
        policyType: "Care Supreme",
        sourceText: "Care Health Insurance Limited Policy No C1234567 Care Supreme",
      };
      const selected = selectScopedTraining(careContext, { text: careContext.sourceText });
      const hasBajajTrainer = selected.some(
        (t) => t.scope.insurer === "bajaj-allianz" && t.scope.category === "health",
      );
      expect(hasBajajTrainer).toBe(false);
    });

    it("does not select Bajaj Allianz Health training for HDFC ERGO Health", () => {
      const hdfcContext = {
        insuranceCompany: "HDFC ERGO General Insurance Company Limited",
        documentCategory: "Health Insurance",
        policyType: "Optima Secure",
        sourceText: "HDFC ERGO General Insurance Company Limited Optima Secure Policy 280000001234",
      };
      const selected = selectScopedTraining(hdfcContext, { text: hdfcContext.sourceText });
      const hasBajajTrainer = selected.some(
        (t) => t.scope.insurer === "bajaj-allianz" && t.scope.category === "health",
      );
      expect(hasBajajTrainer).toBe(false);
    });
  });
});
