/* @vitest-environment node */
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");

describe("IFFCO Tokio policy routing", () => {
  it("ignores brochure-only fidelity mentions in a private-car schedule", () => {
    const text = `IFFCO-TOKIO GENERAL INSURANCE CO.LTD
PRIVATE CAR CERTIFICATE OF INSURANCE CUM SCHEDULE & TAX INVOICE
JAY SHANKAR BALWANIPolicy #:1-8I4OFLG0 P400 Policy # : N8001571
Period of Insurance From: 15/07/2026 00:00:00 To: Midnight On 14/07/2027 23:59:59
Insured Motor Vehicle Details & Premium Calculation
Registration Mark & No. Year of Manuf. Type of Body CC Coverage IDV in Rs. Engine No. Seating Capacity as per RC
-G12BN939978
MP04EB20622021
Make of Vehicle
1196Package230100.00
Chassis No.
5
MARUTI EECO 5 STRMA3ERLF1S00924263
Net (A)1002.00 Net (B)3796.00
Section 1 (A + B)Rs. 4798.00
Premium Paid(Total Invoice Value) Rs.5662.82
CGST SGST Percentage 9.00 9.00 Amount 431.91 431.91
Our other products include fidelity guarantee, personal accident and goods in transit.`;

    const result = extractPolicyFromText(
      text,
      "JAY SHANKAR BALWANI_MP04EB2062_2026-27 POLICY.pdf",
    );

    expect(result).toMatchObject({
      documentFormat: "IFFCO_TOKIO_MOTOR_V1",
      documentCategory: "Motor Insurance",
      policyNumber: "N8001571",
      registrationNumber: "MP04EB2062",
      engineNumber: "G12BN939978",
      chassisNumber: "MA3ERLF1S00924263",
      idv: "230100.00",
    });
  });
});
