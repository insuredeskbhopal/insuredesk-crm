/* @vitest-environment node */
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
const trainer = require("../src/lib/policies/pdf/training/icici-lombard/motor.cjs");
const { applyScopedTraining, selectScopedTraining, deriveTrainingScope } = require("../src/lib/policies/pdf/training/registry.cjs");

describe("ICICI Lombard Motor PDF Training Module", () => {
  it("derives the correct training scope", () => {
    const scope = deriveTrainingScope(
      { insuranceCompany: "ICICI Lombard General Insurance Company Limited", documentCategory: "Motor Insurance" },
      { text: "Stand-Alone Own Damage Private Car Insurance Policy 3001/O" }
    );
    expect(scope).toEqual({ insurer: "icici-lombard", category: "motor" });
  });

  it("extracts ANKIT SHINDE real Standalone Own Damage Private Car policy correctly", async () => {
    const filePath = path.join(process.cwd(), "storage", "ANKIT SHINDE_MP09DS4073_2026-27.pdf");
    if (!fs.existsSync(filePath)) return;
    const buf = fs.readFileSync(filePath);
    const data = await pdf(buf);

    const result = applyScopedTraining({}, { text: data.text });

    expect(result.insuranceCompany).toBe("ICICI Lombard General Insurance Company Limited");
    expect(result.documentCategory).toBe("Motor Insurance");
    expect(result.productName).toBe("Stand-Alone Own Damage Private Car Insurance Policy");
    expect(result.policyType).toBe("Stand-Alone Own Damage Private Car Insurance Policy");
    expect(result.policyCoverType).toBe("Standalone Own Damage");
    expect(result.policyNumber).toBe("3001/O/452859230/00/000");
    expect(result.covernoteNumber).toBe("452859230");
    expect(result.referenceNumber).toBe("W585590864");
    expect(result.uinNumber).toBe("IRDAN115RP0001V03201920");
    expect(result.productCode).toBe("3001/O");
    expect(result.invoiceNumber).toBe("1008261922592");
    expect(result.insuredName).toBe("ANKIT SHINDE");
    expect(result.customerName).toBe("ANKIT SHINDE");
    expect(result.contactPerson).toBe("ANKIT SHINDE");
    expect(result.proposerName).toBe("ANKIT SHINDE");
    expect(result.contactNumber).toBe("99******22");
    expect(result.customerMobile).toBe("99******22");
    expect(result.customerEmail).toBe("IN**************@GMAIL.COM");
    expect(result.address).toBe("56 GANDHEE PALACE INDORE INDORE MADHYA PRADESH-452005, INDORE, MADHYA PRADESH 452005");
    expect(result.rtoLocation).toBe("MADHYA PRADESH-INDORE");
    expect(result.hypothecation).toBe("MADHYA PRADESH GRAMIN BANK");
    expect(result.startDate).toBe("26/08/2026");
    expect(result.expiryDate).toBe("25/08/2027");
    expect(result.policyIssueDate).toBe("25/08/2026");
    expect(result.registrationNumber).toBe("MP09DS4073");
    expect(result.vehicleNumber).toBe("MP09DS4073");
    expect(result.vehicleMake).toBe("Tata Motors");
    expect(result.vehicleModel).toBe("PUNCH ADVENTURE AMT");
    expect(result.makeModel).toBe("Tata Motors / PUNCH ADVENTURE AMT");
    expect(result.engineNumber).toBe("REVTRN20FVXME0216");
    expect(result.chassisNumber).toBe("MAT634055RPFB1798");
    expect(result.cubicCapacity).toBe("1199");
    expect(result.manufacturingYear).toBe("2024");
    expect(result.seatingCapacity).toBe("5");
    expect(result.bodyType).toBe("SUV");
    expect(result.idv).toBe("5,16,594.00");
    expect(result.totalIdv).toBe("5,16,594.00");
    expect(result.basicOwnDamage).toBe("1,648.00");
    expect(result.ncbPercentage).toBe("25%");
    expect(result.ncbDiscount).toBe("412.00");
    expect(result.odPremium).toBe("6,512.00");
    expect(result.netPremium).toBe("6,512.00");
    expect(result.cgst).toBe("586.08");
    expect(result.sgst).toBe("586.08");
    expect(result.gstAmount).toBe("1,172.00");
    expect(result.totalPremium).toBe("7,684.00");
    expect(result.grossPremium).toBe("7,684.00");
    expect(result.zeroDepreciationCover).toBe("Yes");
    expect(result.consumablesCover).toBe("Yes");
    expect(result.engineProtectorCover).toBe("Yes");
    expect(result.roadsideAssistanceCover).toBe("Yes");
    expect(result.keysAndLocksCover).toBe("Yes");
    expect(result.personalBaggageCover).toBe("Yes");
    expect(result.addOnCovers).toBe("Zero Depreciation, Consumables, Engine Protect Plus, Road Side Assistance, Key Protect, Loss of Personal Belongings");
    expect(result.previousPolicyNumber).toBe("0148582666");
    expect(result.previousPolicyStartDate).toBe("26/08/2025");
    expect(result.previousPolicyExpiryDate).toBe("25/08/2026");
    expect(result.previousNcb).toBe("20%");
    expect(result.previousInsurer).toBe("TAIG");
    expect(result.activeTpPolicyNumber).toBe("01481822540000");
    expect(result.activeTpStartDate).toBe("26/08/2024");
    expect(result.activeTpExpiryDate).toBe("25/08/2027");
    expect(result.activeTpInsurer).toBe("TATA AIG");
    expect(result.receiptNumber).toBe("1273849546");
    expect(result.receiptDate).toBe("25-08-2026");
    expect(result.compulsoryDeductible).toBe("1,000.00");
    expect(result.imtEndorsements).toBe("IMT-7, IMT-22");
    expect(result.extractionTrainingVersion).toBe("ICICI_LOMBARD_MOTOR_V1");
  });

  it("extracts NARENDRA SINGH BAGGA real Private Car Package policy correctly", async () => {
    const filePath = path.join(process.cwd(), "storage", "NARENDRA SINGH BAGGA_MP04CJ9537_2026-27 POLICY.pdf");
    if (!fs.existsSync(filePath)) return;
    const buf = fs.readFileSync(filePath);
    const data = await pdf(buf);

    const result = applyScopedTraining({}, { text: data.text });

    expect(result.insuranceCompany).toBe("ICICI Lombard General Insurance Company Limited");
    expect(result.documentCategory).toBe("Motor Insurance");
    expect(result.productName).toBe("Private Car Package Policy");
    expect(result.policyType).toBe("Private Car Package Policy");
    expect(result.policyCoverType).toBe("Comprehensive");
    expect(result.policyNumber).toBe("3001/405801684/01/000");
    expect(result.insuredName).toBe("NARENDRA SINGH BAGGA");
    expect(result.customerName).toBe("NARENDRA SINGH BAGGA");
    expect(result.startDate).toBe("30/08/2026");
    expect(result.expiryDate).toBe("29/08/2027");
    expect(result.policyIssueDate).toBe("21/08/2026");
    expect(result.registrationNumber).toBe("MP04CJ9537");
    expect(result.vehicleNumber).toBe("MP04CJ9537");
    expect(result.vehicleMake).toBe("MARUTI");
    expect(result.vehicleModel).toBe("WAGON R VXI");
    expect(result.engineNumber).toBe("K10BN1567936");
    expect(result.chassisNumber).toBe("MA3EWDE1S00449642");
    expect(result.cubicCapacity).toBe("998");
    expect(result.manufacturingYear).toBe("2012");
    expect(result.seatingCapacity).toBe("5");
    expect(result.rtoLocation).toBe("MADHYA PRADESH-SHAHDOL");
    expect(result.idv).toBe("1,29,281.00");
    expect(result.totalIdv).toBe("1,29,281.00");
    expect(result.basicOwnDamage).toBe("437.00");
    expect(result.ncbPercentage).toBe("50%");
    expect(result.odPremium).toBe("218.00");
    expect(result.basicThirdPartyLiability).toBe("2,094.00");
    expect(result.tpPremium).toBe("2,744.00");
    expect(result.ownerDriverPremium).toBe("350.00");
    expect(result.legalLiabilityPremium).toBe("50.00");
    expect(result.paPassengersPremium).toBe("250.00");
    expect(result.tpDriverOwner).toBe("650.00");
    expect(result.netPremium).toBe("2,962.00");
    expect(result.cgst).toBe("266.58");
    expect(result.sgst).toBe("266.58");
    expect(result.gstAmount).toBe("533.00");
    expect(result.totalPremium).toBe("3,495.00");
    expect(result.previousPolicyNumber).toBe("3001/405801684/00/000");
    expect(result.previousPolicyStartDate).toBe("30/08/2025");
    expect(result.previousPolicyExpiryDate).toBe("29/08/2026");
    expect(result.previousNcb).toBe("50%");
    expect(result.previousInsurer).toBe("ICICI LOMBARD");
    expect(result.receiptNumber).toBe("1273580255");
    expect(result.compulsoryDeductible).toBe("1,000.00");
    expect(result.imtEndorsements).toBe("IMT-16, IMT-28, IMT-22");
    expect(result.extractionTrainingVersion).toBe("ICICI_LOMBARD_MOTOR_V1");
  });

  it("extracts T U LANJEWAR real Private Car Package policy correctly", async () => {
    const filePath = path.join(process.cwd(), "storage", "T U LANJEWAR_MP04CH4265_2026-27 POLICY.pdf");
    if (!fs.existsSync(filePath)) return;
    const buf = fs.readFileSync(filePath);
    const data = await pdf(buf);

    const result = applyScopedTraining({}, { text: data.text });

    expect(result.insuranceCompany).toBe("ICICI Lombard General Insurance Company Limited");
    expect(result.documentCategory).toBe("Motor Insurance");
    expect(result.productName).toBe("Private Car Package Policy");
    expect(result.policyType).toBe("Private Car Package Policy");
    expect(result.policyCoverType).toBe("Comprehensive");
    expect(result.policyNumber).toBe("3001/405863910/01/000");
    expect(result.insuredName).toBe("T U LANJEWAR");
    expect(result.customerName).toBe("T U LANJEWAR");
    expect(result.startDate).toBe("01/09/2026");
    expect(result.expiryDate).toBe("31/08/2027");
    expect(result.policyIssueDate).toBe("18/08/2026");
    expect(result.registrationNumber).toBe("MP04CH4265");
    expect(result.vehicleNumber).toBe("MP04CH4265");
    expect(result.vehicleMake).toBe("HYUNDAI");
    expect(result.vehicleModel).toBe("I10 MAGNA 1.2");
    expect(result.engineNumber).toBe("G4LABM599584");
    expect(result.chassisNumber).toBe("MALAM51CLBM870062C");
    expect(result.cubicCapacity).toBe("1197");
    expect(result.manufacturingYear).toBe("2011");
    expect(result.seatingCapacity).toBe("5");
    expect(result.rtoLocation).toBe("MADHYA PRADESH-BHOPAL");
    expect(result.idv).toBe("1,11,636.00");
    expect(result.totalIdv).toBe("1,11,636.00");
    expect(result.basicOwnDamage).toBe("574.00");
    expect(result.ncbPercentage).toBe("50%");
    expect(result.odPremium).toBe("287.00");
    expect(result.basicThirdPartyLiability).toBe("3,416.00");
    expect(result.tpPremium).toBe("3,466.00");
    expect(result.ownerDriverPremium).toBe("0.00");
    expect(result.legalLiabilityPremium).toBe("50.00");
    expect(result.tpDriverOwner).toBe("50.00");
    expect(result.netPremium).toBe("3,753.00");
    expect(result.cgst).toBe("337.77");
    expect(result.sgst).toBe("337.77");
    expect(result.gstAmount).toBe("676.00");
    expect(result.totalPremium).toBe("4,429.00");
    expect(result.previousPolicyNumber).toBe("3001/405863910/00/000");
    expect(result.previousPolicyStartDate).toBe("01/09/2025");
    expect(result.previousPolicyExpiryDate).toBe("31/08/2026");
    expect(result.previousNcb).toBe("50%");
    expect(result.previousInsurer).toBe("ICICI LOMBARD");
    expect(result.receiptNumber).toBe("1273336869");
    expect(result.compulsoryDeductible).toBe("1,000.00");
    expect(result.imtEndorsements).toBe("IMT-28, IMT-22");
    expect(result.extractionTrainingVersion).toBe("ICICI_LOMBARD_MOTOR_V1");
  });

  it("is isolated from ICICI Lombard Health and other motor insurers", () => {
    const iciciHealth = selectScopedTraining(
      { insuranceCompany: "ICICI Lombard General Insurance Company Limited", documentCategory: "Health Insurance" },
      { text: "ICICI Lombard ELEVATE Complete Health Policy Schedule" }
    );
    const tataMotor = selectScopedTraining(
      { insuranceCompany: "Tata AIG General Insurance Company Limited", documentCategory: "Motor Insurance" },
      { text: "Tata AIG Auto Secure Private Car Package Policy" }
    );

    expect(iciciHealth).not.toContain(trainer);
    expect(tataMotor).not.toContain(trainer);
  });

  it("extracts SITARAM DWIVEDI real Standalone OD Two-Wheeler policy correctly", async () => {
    const filePath = path.join(process.cwd(), "storage", "SITARAM DWIVEDI_MP04ZB0486_2026-27.pdf");
    if (!fs.existsSync(filePath)) return;
    const buf = fs.readFileSync(filePath);
    const data = await pdf(buf);

    const result = applyScopedTraining({}, { text: data.text });

    expect(result.insuranceCompany).toBe("ICICI Lombard General Insurance Company Limited");
    expect(result.documentCategory).toBe("Motor Insurance");
    expect(result.productName).toBe("Stand-Alone Own Damage Two wheeler Insurance Policy");
    expect(result.policyType).toBe("Stand-Alone Own Damage Two wheeler Insurance Policy");
    expect(result.policyCoverType).toBe("Standalone Own Damage");
    expect(result.policyNumber).toBe("3005/O/455209507/00/000");
    expect(result.insuredName).toBe("SITARAM DWIVEDI");
    expect(result.customerName).toBe("SITARAM DWIVEDI");
    expect(result.registrationNumber).toBe("MP04ZB0486");
    expect(result.vehicleNumber).toBe("MP04ZB0486");
    expect(result.vehicleMake).toBe("HONDA MOTORCYCLE");
    expect(result.vehicleModel).toBe("ACTIVA 6G DLX");
    expect(result.engineNumber).toBe("JF91ED7140023");
    expect(result.chassisNumber).toBe("ME4JF91AHND140008");
    expect(result.cubicCapacity).toBe("110");
    expect(result.manufacturingYear).toBe("2022");
    expect(result.seatingCapacity).toBe("2");
    expect(result.bodyType).toBe("Solo With Pillion");
    expect(result.registrationDate).toBe("28/09/2022");
    expect(result.startDate).toBe("28/09/2026");
    expect(result.expiryDate).toBe("27/09/2027");
    expect(result.idv).toBe("44,000.00");
    expect(result.totalIdv).toBe("44,000.00");
    expect(result.basicOwnDamage).toBe("576.00");
    expect(result.ncbPercentage).toBe("45%");
    expect(result.ncbDiscount).toBe("259.00");
    expect(result.odPremium).toBe("423.00");
    expect(result.tpPremium).toBeUndefined();
    expect(result.netPremium).toBe("423.00");
    expect(result.cgst).toBe("38.07");
    expect(result.sgst).toBe("38.07");
    expect(result.gstAmount).toBe("76.00");
    expect(result.totalPremium).toBe("499.00");
    expect(result.activeTpPolicyNumber).toBe("3397/03926189/000/00");
    expect(result.activeTpInsurer).toBe("CHOLAMANDALAM");
    expect(result.previousPolicyNumber).toBe("D225732325");
    expect(result.previousInsurer).toBe("GODI");
    expect(result.agentCode).toBe("IMF240706");
    expect(result.agentName).toBe("INSUREDESK");
    expect(result.agentMobile).toBe("8818889660");
    expect(result.servicingBranchName).toBe("Bhopal");
    expect(result.receiptNumber).toBe("1275561830");
    expect(result.compulsoryDeductible).toBe("100.00");
    expect(result.imtEndorsements).toBe("IMT-22");
    expect(result.hypothecation).toBe("");
    expect(result.financerName).toBeUndefined();
  });
});
