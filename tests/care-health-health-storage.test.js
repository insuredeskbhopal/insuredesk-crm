/* @vitest-environment node */
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");
const { selectScopedTraining, applyScopedTraining } = require("../src/lib/policies/pdf/training/registry.cjs");
const trainer = require("../src/lib/policies/pdf/training/care-health/health.cjs");

// Redacted schedule and receipt layout from storage/NEW HEALTH Care Health PDFs.
const schedule = `Care Health Insurance Limited
Policy No: C1000001
Dear Ms Example Customer,
Plan NameCare Supreme
Policy Period - Start Date00:00 hrs 08-Aug-2026
Policy Period - End DateMidnight 07-Aug-2029
Premium PaidRs. 73,193.00
( Premium Rs 73193.22 + Underwriting Loading
 Rs. 0.00 + CGST Rs. 0.00 + IGST Rs. 0.00 +
SGST/UGST Rs. 0.00 )
Premium Payment ModeSingle Premium
Premium Acknowledgement
Gross Premium
Care Supreme93,530.01
Annual Health Checkup(Supreme)2,276.94
Goods & Services Tax (GST)`;

describe("Care Health / Health storage regressions", () => {
  it("uses the explicit zero tax amounts, preserving the printed premium rounding", () => {
    const result = extractPolicyFromText(schedule, "care-health.pdf");
    expect(result).toMatchObject({
      insuranceCompany: "Care Health Insurance Limited",
      documentCategory: "Health Insurance",
      netPremium: "73,193.22",
      totalPremium: "73,193.00",
      cgst: "0.00", sgst: "0.00", igst: "0.00", gstAmount: "0.00",
    });
  });

  it("sums labelled nonzero taxes without using benefit premiums", () => {
    const text = schedule.replace("CGST Rs. 0.00", "CGST Rs. 900.00")
      .replace("SGST/UGST Rs. 0.00", "SGST/UGST Rs. 900.00");
    expect(trainer.train({ text })).toMatchObject({
      cgst: "900.00", sgst: "900.00", igst: "0.00", gstAmount: "1,800.00",
    });
  });

  it("does not invent zero taxes when the schedule omits their amounts", () => {
    const patch = trainer.train({ text: "Care Health Policy No: C1000001" });
    expect(patch).not.toHaveProperty("gstAmount");
    expect(patch).not.toHaveProperty("cgst");
  });

  it.each([
    ["Care Health Insurance Limited", "Motor Insurance"],
    ["Care Health Insurance Limited", "Fire Insurance"],
    ["HDFC ERGO General Insurance Company Limited", "Health Insurance"],
  ])("does not select Care Health training for %s / %s", (insuranceCompany, documentCategory) => {
    const original = { insuranceCompany, companyName: insuranceCompany, documentCategory, gstAmount: "123.00" };
    const text = documentCategory === "Health Insurance" ? schedule : `${documentCategory} Policy No: OTHER-10001`;
    expect(selectScopedTraining(original, { text })).not.toContain(trainer);
    expect(applyScopedTraining(original, { text })).toEqual(original);
  });
});
