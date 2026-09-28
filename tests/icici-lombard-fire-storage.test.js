/* @vitest-environment node */
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
const require = createRequire(import.meta.url);
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");
const { selectScopedTraining } = require("../src/lib/policies/pdf/training/registry.cjs");
const trainer = require("../src/lib/policies/pdf/training/icici-lombard/fire.cjs");

// Redacted layouts from the BALMUKUND and BARSAIYAN endorsements in storage.
function endorsement(wording, total) {
  return `MSME Suraksha Kavach Package Policy - Advance Endorsement Schedule
ICICI Lombard General Insurance Company Limited
Insured NameEXAMPLE WAREHOUSE A/C MPWLC
Policy Number1030/450000001/00/000
Period of InsuranceFrom: 00:00 Hours of 03-Aug-2026 To: 23:59 of 02-Feb-2027
Endorsement Number1030/450000001/00/001
Endorsement Wording:${wording}
Total Premium \`:
${total}
*Premium value mentioned above is inclusive of taxes applicable`;
}

describe("ICICI Lombard / Fire storage endorsements", () => {
  it("preserves the full total after the currency marker and colon", () => {
    const result = extractPolicyFromText(endorsement("extra premium amounting to Rs.26,034/- as shown below is charged", "33923"));
    expect(result).toMatchObject({
      totalPremium: "33,923.00", premium: "33,923.00", premiumIncludingGst: "33,923.00",
      startDate: "03/08/2026", expiryDate: "02/02/2027",
      policyStartDate: "03/08/2026", policyEndDate: "02/02/2027",
    });
  });

  it("uses the expressly revised total sum insured, not punctuation or a section increase", () => {
    const result = extractPolicyFromText(endorsement(`the sum insured under the policy has been increased from Rs.147000000/- to Rs.210000000/- by an amount
equal to , Rs.30000000 in Fire, Rs.100000000 in Burglary, Rs.10000000 in FidelitySum insured
under the policy now stands revised as Rs.210000000/- Inconsideration of the above, premium
amounting to Rs. 5863/- as shown below is charged`, "20907"));
    expect(result).toMatchObject({
      sumInsured: "21,00,00,000.00", totalSumInsured: "21,00,00,000.00",
      revisedSumInsured: "21,00,00,000.00", totalPremium: "20,907.00",
    });
  });

  it.each([
    ["ICICI Lombard General Insurance Company Limited", "Motor Insurance"],
    ["ICICI Lombard General Insurance Company Limited", "Health Insurance"],
    ["Tata AIG General Insurance Company Limited", "Fire Insurance"],
  ])("is not selected for %s / %s", (insuranceCompany, documentCategory) => {
    expect(selectScopedTraining({ insuranceCompany, documentCategory }, {
      text: `${insuranceCompany} ${documentCategory} Policy Number: OTHER-0001`,
    })).not.toContain(trainer);
  });
});
