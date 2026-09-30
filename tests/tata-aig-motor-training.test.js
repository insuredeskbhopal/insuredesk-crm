// @vitest-environment node

import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");
const { selectScopedTraining } = require("../src/lib/policies/pdf/training/registry.cjs");

describe("TATA AIG Motor PDF Training Module", () => {
  const sampleText = `
Auto Secure - Private Car Package Policy
24*7 Customer Support No.: 022 6489 8282 Email: customersupport@tataaig.com Website: www.tataaig.com
Insured Details - Key Information for You
NameMr Ashok Kumar Tiwari
Policy No.6206570230 00 00
Period of Insurance & Premium
Own Damage Cover28/07/2026 (00:00 Hrs)27/07/2027 (Midnight)
Premium Amount (Including GST)₹ 40358
Certificate of Insurance Cum Policy Schedule
Vehicle Details - Accurate Vehicle Details, Custom Insurance:
Registration No.MP 04 EB 6459
Make / Model /
Variant
TATA MOTORS / NEXO
N EV / XZ PLUS
Fuel TypeBATTERY
Engine Number /
Motor No. (for EV)
TZ230XS56FJ21020375
Chassis No.MAT635010MPGS3687
Body TypeSUV
CC/KW95
Mfg. Year2021
Date of Registration12/08/2021
Hire Purchase /
Hypothecation / Lease
with
STATE BANK OF INDIA
Seating Capacity
(Including Driver)
5
RTO LocationBHOPAL
Insured Declared Value (IDV) ₹ Details:
Policy Year
Vehicle
IDV (₹)
Electrical
Accessories
(₹)
Non-Electrical
Accessories -
Vehicle IDV (₹)
Bi-Fuel/CNG/
LPG Kit (₹)
Trailer/Side
Car IDV (₹)
Total IDV
(₹)
19180000000918000
Total Own Damage Premium (A)₹11159.21
Total Liability Premium (B)₹7287
Net Premium (A+B+C+D)₹34202
SGST/UGST @9%₹3078.00
CGST @9%₹3078.00
Total Policy Premium₹40358.00
Previous Insurance Details:
Name of the Insurer: GO DIGIT GENERAL INSURANCE CO LTD
1.Policy Number: D215431406
`;

  it("keeps TATA AIG identity when previous insurer is Go Digit and normalizes wrapped Nexon EV", () => {
    const result = extractPolicyFromText(sampleText, "ASHOK KUMAR TIWARI_MP04EB6459_2026-27.pdf");

    expect(result).toMatchObject({
      insuranceCompany: "Tata AIG General Insurance Company Limited",
      companyName: "Tata AIG General Insurance Company Limited",
      documentCategory: "Motor Insurance",
      documentFormat: "TATA_AIG_MOTOR_V1",
      policyNumber: "6206570230 00 00",
      registrationNumber: "MP04EB6459",
      policyStartDate: "28/07/2026",
      policyEndDate: "27/07/2027",
      vehicleMake: "TATA MOTORS",
      vehicleModel: "NEXON EV",
      makeModel: "TATA MOTORS NEXON EV",
      variant: "XZ PLUS",
      fuelType: "BATTERY",
      engineNumber: "TZ230XS56FJ21020375",
      chassisNumber: "MAT635010MPGS3687",
      financerName: "STATE BANK OF INDIA",
      previousInsurer: "GO DIGIT GENERAL INSURANCE CO LTD",
      previousPolicyNumber: "D215431406",
      extractionTrainingVersion: "TATA_AIG_MOTOR_NEXON_EV_V1",
    });
  });

  it("isolates TATA AIG Motor trainer from non-motor and other insurers", () => {
    const tataWarehouse = {
      insuranceCompany: "Tata AIG General Insurance Company Limited",
      documentCategory: "Warehouse Insurance",
    };
    const goDigitMotor = {
      insuranceCompany: "Go Digit General Insurance Limited",
      documentCategory: "Motor Insurance",
    };

    expect(selectScopedTraining(tataWarehouse, { text: sampleText })).toHaveLength(0);
    expect(selectScopedTraining(goDigitMotor, { text: "Go Digit Two-Wheeler Policy" })).toHaveLength(0);
  });
});
