/* @vitest-environment node */
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");
const { applyScopedTraining, selectScopedTraining } = require("../src/lib/policies/pdf/training/registry.cjs");

describe("New India Commercial Vehicle Motor Policy extraction", () => {
  const sampleText = `
  THE NEW INDIA ASSURANCE CO. LTD.
  (Government of India Undertaking)
  POLICY SCHEDULE CUM CERTIFICATE OF INSURANCE
  Commercial Vehicle Package Policy
  UIN Number - IRDAN190RP0044V01100001
  Policy Number :45140031260100004052
  POLICY ISSUING OFFICE:
  BHOPAL D.O. II (451400),
  1ST FLOOR, HALL NO. 1, WESTERN BLOCK, ,
  G. T. B. COMPLEX, NEW MARKET,BHOPAL , ,
  MADHYA PRADESH , 462003.
  PHONE NUMBER:07554203292 /
  07554203293
  FAX NUMBER:07554203291 / NA
  Email:nia.451400@newindia.co.in
  BUSINESS CHANNEL/CPSC User:
  NAME: RP DIXIT - (2D10673429)
  Mr. Anand Soni - (NIAAG00157185),
  PHONE NUMBER: / / 8818889660
  LAND/FAX NUMBER:/
  EMAIL:anand.soni10@gmail.com /
  CLAIM CONTACT:
  BHOPAL CLAIM HUB (450001)
  ADDRESS: Block No.3, IInd Floor, PARYAWAS
  BHAVAN, Arera Hills, BHOPAL - 462011 (MP) , , ,
  MADHYA PRADESH , 462011.
  PHONE NUMBER: 07554782225 /
  MOBILE NUMBER:
  Email: ch45@newindia.co.in
  INSURED DETAILS
  Insured's Name RAJ KUMAR SONICustomer IDPOD2591963 (PAN No :NA)
  Insured's Address HOUSE NO- 156, PURANI BASTI HUZUR,
  BAGSEWANIYA, CHANDEL DUDH DAIRY KE PASS,
  BHOPAL,,,
  BHOPAL ,MADHYA PRADESH, 462043
  Contact Number / / XXXXXX5399
  Email insuredeskbhopal@gmail.c
  om
  GSTIN NA
  POLICY DETAILS
  Period of cover 24/07/2026 12:00:01 AM to 23/07/2027 11:59:59 PM Receipt Number 10000089260700892990 -
  23/07/26
  Previous Insurer ROYAL SUNDARAM GENERAL INSURANCE CO.LTD. Previous Policy Number VGC1191052000100
  VEHICLE DETAILS
  Geographical Area / Zone: India/B Year of manufacture: 2022
  Type of Commercial
  Vehicles:
  A - Goods Carrying Sub Type: Other than 3 wheeler -
  Public Carrier
  Name of the Financier: Chassis no./Engine no.: MA3EZLF1T00259086/G12
  BN1169757
  Type of fuel: CNG Cubic
  capacity(cc)/Wattage(kW):
  0cc
  Type of body: Open Gross Vehicle Weight
  (GVW):
  1600
  Make/Model: MARUTI/SUPER CARRY Registration no. MP-04-ZE-8775
  Seating capacity including
  Driver:
  2 Variant: STD CNG
  Automobile Association
  membership:
  none Colour: AS PER RC
  Cover Note No/Cover
  Note Issue Date:
  / Name of registration
  authority:
  Bhopal
  FASTag ID:
  INSURED DECLARED VALUE (Rs)
  Vehicle Trailer Non-Elec Acc Electrical Acc Bi-fuel/CNG/LPG kit Total Value
  400000 0 0 0 0 400000
  SCHEDULE OF PREMIUM
  Own Damage Liability
  Basic OD Premium
  (+)Loading for Inclusion of IMT 23
  1325
  198.7
  Basic TP Premium
  (+)Additional TP Premium for CNG/LPG/LNG
  16049
  60
  Calculated OD Premium 1524 Calculated TP Premium 16209
  Total OD Premium (Rs) 1524 Total TP Premium (Rs) 16209
  Net Premium (Rs) 17,733
  GST (Rs) 1,098
  Total Payable (Rs) 18,831
  Total Payable in Rs(in words): RUPEES EIGHTEEN THOUSAND EIGHT HUNDRED THIRTY-ONE ONLY
  `;

  it("extracts New India commercial vehicle package fields correctly", () => {
    const result = extractPolicyFromText(sampleText, "new-india-commercial.pdf");

    expect(result).toMatchObject({
      insuranceCompany: "The New India Assurance Company Limited",
      policyNumber: "45140031260100004052",
      policyType: "Commercial Vehicle Package Policy",
      insuredName: "RAJ KUMAR SONI",
      registrationNumber: "MP-04-ZE-8775",
      chassisNumber: "MA3EZLF1T00259086",
      engineNumber: "G12BN1169757",
      makeModel: "MARUTI/SUPER CARRY",
      fuelType: "CNG",
      bodyType: "Open",
      grossVehicleWeight: "1600",
      seatingCapacity: "2",
      commercialVehicleSubType: "Other than 3 wheeler - Public Carrier",
      previousInsurer: "ROYAL SUNDARAM GENERAL INSURANCE CO.LTD.",
      previousPolicyNumber: "VGC1191052000100",
      basicOwnDamage: "1325.00",
      basicThirdPartyLiability: "16049.00",
      odPremium: "1524.00",
      tpPremium: "16209.00",
      netPremium: "17733.00",
      gstAmount: "1098.00",
      totalPremium: "18831.00",
      idv: "400000.00",
      variant: "STD CNG",
      rtoLocation: "Bhopal",
      startDate: "24/07/2026",
      expiryDate: "23/07/2027",
      extractionTrainingVersion: "NEW_INDIA_MOTOR_V2",
    });
    expect(result.customerEmail).toBe("insuredeskbhopal@gmail.com");
  });

  it("extracts VIJAY KUMAR MISHRA CONST PVT LTD real PDF correctly", async () => {
    const filePath = path.join(process.cwd(), "storage", "VKMCPL_MH06AC6985_2026-27 POLICY (1).pdf");
    if (!fs.existsSync(filePath)) return;
    const buf = fs.readFileSync(filePath);
    const data = await pdf(buf);

    const result = applyScopedTraining({}, { text: data.text });

    expect(result.insuranceCompany).toBe("The New India Assurance Company Limited");
    expect(result.documentCategory).toBe("Motor Insurance");
    expect(result.productName).toBe("Commercial Vehicle Liability Only Policy");
    expect(result.policyType).toBe("Commercial Vehicle Liability Only Policy");
    expect(result.policyCoverType).toBe("Third Party");
    expect(result.uinNumber).toBe("IRDAN190RP0004V01200203");
    expect(result.policyNumber).toBe("45140031260200004025");
    expect(result.insuredName).toBe("VIJAY KUMAR MISHRA CONST PVT LTD");
    expect(result.customerName).toBe("VIJAY KUMAR MISHRA CONST PVT LTD");
    expect(result.customerId).toBe("POA4760411");
    expect(result.registrationNumber).toBe("MH-06-AC-6985");
    expect(result.vehicleNumber).toBe("MH-06-AC-6985");
    expect(result.vehicleMake).toBe("TATA MOTOR");
    expect(result.vehicleModel).toBe("LPS 4018");
    expect(result.variant).toBe("TC_EX BS-III");
    expect(result.chassisNumber).toBe("447207CSZ303992");
    expect(result.engineNumber).toBe("70C6258083");
    expect(result.manufacturingYear).toBe("2007");
    expect(result.fuelType).toBe("Diesel");
    expect(result.grossVehicleWeight).toBe("45500");
    expect(result.seatingCapacity).toBe("3");
    expect(result.bodyType).toBe("Closed");
    expect(result.rtoLocation).toBe("Pen");
    expect(result.idv).toBe("0.00");
    expect(result.odPremium).toBe("0.00");
    expect(result.basicTpPremium).toBe("44242.00");
    expect(result.legalLiabilityPremium).toBe("100.00");
    expect(result.tpPremium).toBe("44342.00");
    expect(result.netPremium).toBe("44342.00");
    expect(result.sgst).toBe("1115.00");
    expect(result.cgst).toBe("1115.00");
    expect(result.gstAmount).toBe("2230.00");
    expect(result.totalPremium).toBe("46572.00");
    expect(result.grossPremium).toBe("46572.00");
    expect(result.gstin).toBe("23AABCV9626P1ZR");
    expect(result.startDate).toBe("23/07/2026");
    expect(result.expiryDate).toBe("22/07/2027");
    expect(result.receiptNumber).toBe("45140081260000003292 - 23/07/26");
    expect(result.taxInvoiceNo).toBe("45140026P0005724");
    expect(result.previousInsurer).toBe("GO DIGIT GENERAL INSURANCE CO. LTD");
    expect(result.previousPolicyNumber).toBe("D214548522");
    expect(result.agentCode).toBe("NIAAG00157185");
    expect(result.agentName).toBe("Mr. Anand Soni");
    expect(result.agentMobile).toBe("8818889660");
    expect(result.agentEmail).toBe("anand.soni10@gmail.com");
    expect(result.imtEndorsements).toBe("IMT-21, IMT-37, IMT-38");
    expect(result.extractionTrainingVersion).toBe("NEW_INDIA_MOTOR_V2");
  });

  it("extracts PARAS SETHI real PDF correctly", async () => {
    const filePath = path.join(process.cwd(), "storage", "PARAS SETHI_MP05MP5782_2026-27_ NEW INDIA.pdf");
    if (!fs.existsSync(filePath)) return;
    const buf = fs.readFileSync(filePath);
    const data = await pdf(buf);

    const result = extractPolicyFromText(data.text, "PARAS SETHI_MP05MP5782_2026-27_ NEW INDIA.pdf");

    expect(result.insuranceCompany).toBe("The New India Assurance Company Limited");
    expect(result.policyNumber).toBe("45140031260100005171");
    expect(result.insuredName).toBe("PARAS SETHI");
    expect(result.registrationNumber).toBe("MP-05-MP-5782");
    expect(result.vehicleNumber).toBe("MP-05-MP-5782");
    expect(result.chassisNumber).toBe("MBLHA10BSFHL24804");
    expect(result.engineNumber).toBe("HA10EVFHL27267");
    expect(result.makeModel).toBe("HERO/PASSION PRO");
    expect(result.variant).toBe("LTD EDITION");
    expect(result.startDate).toBe("04/09/2026");
    expect(result.expiryDate).toBe("03/09/2027");
    expect(result.idv).toBe("15492.00");
    expect(result.odPremium).toBe("56.00");
    expect(result.tpPremium).toBe("1114.00");
    expect(result.paOwnerDriver).toBe("400.00");
    expect(result.ncbDiscount).toBe("55.84");
    expect(result.ncbPercentage).toBe("50");
    expect(result.netPremium).toBe("1170.00");
    expect(result.cgst).toBe("105.00");
    expect(result.sgst).toBe("105.00");
    expect(result.gstAmount).toBe("210.00");
    expect(result.totalPremium).toBe("1380.00");
    expect(result.financerName).toBe("");
    expect(result.pinCode).toBe("461001");
    expect(result.previousInsurer).toBe("THE NEW INDIA ASSURANCE COMPANY LTD.");
    expect(result.previousPolicyNumber).toBe("45140031250100005174");
    expect(result.extractionTrainingVersion).toBe("NEW_INDIA_MOTOR_V2");
  });

  it("isolates New India Motor trainer from non-motor and other insurers", () => {
    const newIndiaWarehouse = {
      insuranceCompany: "The New India Assurance Company Limited",
      documentCategory: "Warehouse Insurance",
    };
    const tataMotor = {
      insuranceCompany: "Tata AIG General Insurance Company Limited",
      documentCategory: "Motor Insurance",
    };

    expect(selectScopedTraining(newIndiaWarehouse, { text: sampleText })).toHaveLength(0);
    expect(selectScopedTraining(tataMotor, { text: sampleText })).toHaveLength(0);
  });

  it("extracts TRUPTI BHAWALKAR real PDF field by field", async () => {
    const filePath = path.join(process.cwd(), "storage", "TRUPTI BHAWALKAR_TS07KC1265_2026-27.pdf");
    if (!fs.existsSync(filePath)) return;
    const buf = fs.readFileSync(filePath);
    const data = await pdf(buf);

    const result = extractPolicyFromText(data.text, "TRUPTI BHAWALKAR_TS07KC1265_2026-27.pdf");

    expect(result).toMatchObject({
      insuranceCompany: "The New India Assurance Company Limited",
      policyNumber: "45140031261800006018",
      uinNumber: "IRDAN190RP0002V01201920",
      policyType: "Standalone Motor Own Damage Policy for Two Wheelers - Enhanced Covers",
      policyCoverType: "Standalone Own Damage",
      insuredName: "TRUPTI BHAWALKAR",
      customerId: "POB7156672",
      pan: "CGBPB0343L",
      registrationNumber: "TS-07-KC-1265",
      vehicleNumber: "TS-07-KC-1265",
      vehicleMake: "TVS",
      vehicleModel: "JUPITER",
      variant: "ZX DRUM BS VI",
      bodyType: "Metal",
      fuelType: "Petrol",
      cubicCapacity: "109",
      seatingCapacity: "2",
      manufacturingYear: "2023",
      chassisNumber: "MD626CG58P1K00552",
      engineNumber: "DG5KP1500145",
      rtoLocation: "RTA RANGAREDDY",
      startDate: "25/09/2026",
      expiryDate: "24/09/2027",
      idv: "60750.00",
      compulsoryExcess: "100.00",
      ncb: "35%",
      ncbDiscount: "142.54",
      basicOwnDamage: "407.00",
      nilDepreciationPremium: "243.00",
      rsaPremium: "25.00",
      odPremium: "533.00",
      tpPremium: "0.00",
      netPremium: "533.00",
      igst: "96.00",
      cgst: "0.00",
      sgst: "0.00",
      totalPremium: "629.00",
      pinCode: "500089",
      activeTpPolicyNumber: "2301205717780400000",
      activeTpInsurer: "HDFC ERGO GENERAL INSURANCE CO. LTD.",
      bundledPolicyPeriod: "25/09/2023 to 24/09/2028",
      previousPolicyNumber: "45140031251800005923",
      previousInsurer: "THE NEW INDIA ASSURANCE COMPANY LTD.",
      receiptNumber: "10000089260900877162 - 23/09/26",
      agentName: "Mr. Anand Soni",
      agentMobile: "8818889660",
      agentEmail: "anand.soni10@gmail.com",
      addOnsOpted: expect.arrayContaining(["Zero Depreciation", "Roadside Assistance"]),
      customerMobile: "XXXXXX8757",
      customerEmail: "insuredeskbhopal@gmail.com",
    });
  });
});
