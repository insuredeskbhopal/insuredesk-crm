// @vitest-environment node

import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { extractPolicyFromText } = require("../lib/pdf-extractor.cjs");
const pdf = require("pdf-parse");

describe("generic motor policy extraction", () => {
  it("keeps all motor fixture PDFs on sane core vehicle fields", async () => {
    const fixtureDir = "tests/fixtures";
    const pdfFiles = readdirSync(fixtureDir).filter((name) => name.toLowerCase().endsWith(".pdf"));

    for (const fileName of pdfFiles) {
      const sourceFile = path.join(fixtureDir, fileName);
      const parsed = await pdf(readFileSync(sourceFile));
      const result = extractPolicyFromText(parsed.text || "", sourceFile);

      expect(result.documentFormat, fileName).toMatch(/_MOTOR_V1$/);
      expect(result.insuranceCompany || result.companyName, fileName).not.toBe("");
      expect(result.policyNumber, fileName).not.toBe("");
      const registrationNumber = result.registrationNumber || result.vehicleNumber || "";
      const compactRegistration = registrationNumber.replace(/[^A-Z0-9]/gi, "").toUpperCase();
      const compactEngine = String(result.engineNumber || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();

      expect(registrationNumber, fileName).toMatch(/(?:[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4}|[A-Z]{2}[-\s]\d{1,2}[-\s]\d{4}|[A-Z]{2}[-\s]\d{1,2})/i);
      expect(compactEngine, fileName).not.toBe(compactRegistration);
      expect(compactEngine, fileName).not.toContain(compactRegistration);
      expect(result.engineNumber, fileName).not.toMatch(/^(?:ENGINE|MOTOR|SEATING|CHASSIS)$/i);
      expect(result.chassisNumber, fileName).toMatch(/^[A-Z0-9]{10,25}$/i);
      expect(result.chassisNumber, fileName).not.toMatch(/^(?:ENGINE|MOTOR|SEATING|CHASSIS)$/i);
    }
  });

  it("parses dense motor vehicle table seating and cover values without company-only rules", () => {
    const text = `
      TWO WHEELER POLICY CERTIFICATE
      Insured Motor Vehicle Details & Premium Calculation
      Registration Mark &
      No.
      Year of Manuf.
      Type of Body
      CCCoverageIDV in Rs.
      Non Elect. Acc.
      Engine No.
      Seating
      Capacity
      as per
      RC
      -DKZCGA00240
      MP04QD13572016
      Make of Vehicle
      220Package24300.00
      Non Electrical Accessories are not covered as its value is 0
      Chassis No.
      2
      BAJAJ PULSAR 220 DTS-
      Fi
      MD2A13EZ3GCA30996
    `;

    const result = extractPolicyFromText(text, "generic-two-wheeler.pdf");

    expect(result.seatingCapacity).toBe("2");
    expect(result.policyCoverType).toBe("Package");
    expect(result.cubicCapacity).toBe("220");
    expect(result.manufacturingYear).toBe("2016");
  });

  it("extracts the IFFCO motor sample seating capacity as 2, not 22", () => {
    const iffcoSampleText = `
      TWO WHEELER POLICY CERTIFICATE OF INSURANCE CUM SCHEDULE & TAX INVOICE
      IFFCO TOKIO GEN INSU. CO. LTD.
      Insured's Name:
      YASH DUBEYPolicy #:
      1-85828W23
      Period of Insurance
      From: 26/05/2026 00:00:00
      To: Midnight On 25/05/2027 23:59:59
      Insured Motor Vehicle Details & Premium Calculation
      Registration Mark &
      No.
      Year of Manuf.
      Type of Body
      CCCoverageIDV in Rs.
      Non Elect. Acc.
      Engine No.
      Seating
      Capacity
      as per
      RC
      -DKZCGA00240
      MP04QD13572016
      Make of Vehicle
      220Package24300.00
      Non Electrical Accessories are not covered as its value is 0
      Chassis No.
      2
      BAJAJ PULSAR 220 DTS-
      Fi
      MD2A13EZ3GCA30996
      VehicleSide CarAccessoriesElec./Elect. Acc.Bi-Fuel KitTotal ValueNet Premium Rs.(for 1 years)
      24300.000.000.000.000.0024300.002251.44
    `;
    const result = extractPolicyFromText(iffcoSampleText, "YASH DUBEY_MP04QD1357_2026-27 POLICY.pdf");

    expect(result.policyType).toMatch(/two wheeler/i);
    expect(result.seatingCapacity).toBe("2");
    expect(result.policyCoverType).toBe("Package");
    expect(result.cubicCapacity).toBe("220");
    expect(result.vehicleNumber).toBe("MP04QD1357");
  });

  it("locks the IFFCO Tokio motor extraction contract for future policy additions", () => {
    const iffcoSampleText = readFileSync("tests/fixtures/_debug_raw_text.txt", "utf8");
    const result = extractPolicyFromText(iffcoSampleText, "YASH DUBEY_MP04QD1357_2026-27 POLICY.pdf");

    expect(result).toMatchObject({
      insuredName: "YASH DUBEY",
      policyNumber: "N7470840",
      policyType: "TWO WHEELER POLICY",
      insuranceCompany: "IFFCO-TOKIO GENERAL INSURANCE CO.LTD",
      contactNumber: "8818889660",
      contactPerson: "YASH DUBEY",
      vehicleNumber: "MP04QD1357",
      registrationNumber: "MP04QD1357",
      makeModel: "BAJAJ PULSAR 220 DTS-Fi",
      manufacturingYear: "2016",
      engineNumber: "DKZCGA00240",
      chassisNumber: "MD2A13EZ3GCA30996",
      fuelType: "Petrol",
      cubicCapacity: "220",
      seatingCapacity: "2",
      idv: "24300.00",
      sumInsured: "24300.00",
      premium: "2251.44",
      startDate: "26/05/2026",
      expiryDate: "25/05/2027",
      duration: "12 months",
      policyCoverType: "Comprehensive",
      variant: "",
      riskLocation: "",
      validIn: "",
      nomineeName: "",
      financerName: ""
    });
  });

  it("recognizes abbreviated IFFCO Tokio company names without scrambling fields", () => {
    const text = `
      IFFCO TOKIO GEN INSU. CO. LTD.
      Policy Schedule
      TWO WHEELER POLICY
      Policy # : N7470840
      Name of the Insured YASH DUBEY
      Insured Motor Vehicle Details & Premium Calculation
      Registration Mark & No.
      Engine No.
      Seating Capacity
      MP04QD13572016
      Make of Vehicle
      220Package24300.00
      Chassis No.
      2
      BAJAJ PULSAR 220 DTS-Fi
      DKZCGA00240
      MD2A13EZ3GCA30996
      Fuel Type Petrol
      Net Premium 1,752.00
    `;

    const result = extractPolicyFromText(text, "YASH DUBEY_MP04QD1357_2026-27 POLICY.pdf");

    expect(result.documentFormat).toBe("IFFCO_TOKIO_MOTOR_V1");
    expect(result.insuranceCompany).toBe("IFFCO-TOKIO GENERAL INSURANCE CO.LTD");
    expect(result.registrationNumber).toBe("MP04QD1357");
    expect(result.engineNumber).toBe("DKZCGA00240");
    expect(result.chassisNumber).toBe("MD2A13EZ3GCA30996");
    expect(result.fuelType).toBe("Petrol");
    expect(result.makeModel).toBe("BAJAJ PULSAR 220 DTS-Fi");
  });

  it("locks the IFFCO Tokio private car dense table contract", async () => {
    const sourceFile = "tests/fixtures/SHRIDHAR RENEWABLE ENERGY PRIVATE LIMITED_MP04ZJ1165_2026-27 - Copy.pdf";
    const parsed = await pdf(readFileSync(sourceFile));
    const result = extractPolicyFromText(parsed.text || "", sourceFile);

    expect(result).toMatchObject({
      documentFormat: "IFFCO_TOKIO_MOTOR_V1",
      insuranceCompany: "IFFCO-TOKIO GENERAL INSURANCE CO.LTD",
      policyType: "Private Car Policy",
      insuredName: "SHRIDHAR RENEWABLE ENERGY PRIVATE LIMITED",
      contactPerson: "SHRIDHAR RENEWABLE ENERGY PRIVATE LIMITED",
      policyNumber: "N7415324",
      vehicleNumber: "MP04ZJ1165",
      registrationNumber: "MP04ZJ1165",
      makeModel: "XUV700 AX7 D AT LUXURY PACK",
      manufacturingYear: "2023",
      engineNumber: "ZTP4D64994",
      chassisNumber: "MA1NE2ZTFP6E12261",
      fuelType: "Diesel",
      cubicCapacity: "2184",
      seatingCapacity: "7",
      startDate: "21/05/2026",
      expiryDate: "20/05/2027",
      duration: "12 months",
      idv: "1723680.00",
      sumInsured: "1723680.00",
      premium: "33681.92",
      totalPremium: "33681.92",
      netPremium: "28544.00",
      odPremium: "4321.00",
      tpDriverOwner: "7947.00",
      policyCoverType: "Comprehensive"
    });
  });

  it("locks the IFFCO Tokio standalone OD private car contract", async () => {
    const sourceFile = "tests/fixtures/POOJA-SHARMA-MP04ZX6611 (1).pdf";
    const parsed = await pdf(readFileSync(sourceFile));
    const result = extractPolicyFromText(parsed.text || "", sourceFile);

    expect(result).toMatchObject({
      documentFormat: "IFFCO_TOKIO_MOTOR_V1",
      insuranceCompany: "IFFCO-TOKIO GENERAL INSURANCE CO.LTD",
      policyType: "Private Car Stand Alone Own Damage Policy",
      insuredName: "POOJA SHARMA",
      contactPerson: "POOJA SHARMA",
      policyNumber: "N3282897",
      vehicleNumber: "MP04ZX6611",
      registrationNumber: "MP04ZX6611",
      makeModel: "KIA SELTOS HTK 1.5 PETROL",
      manufacturingYear: "2024",
      engineNumber: "G4FLRV750594",
      chassisNumber: "MZBEP812LRN622303",
      fuelType: "Petrol",
      cubicCapacity: "1497",
      seatingCapacity: "5",
      startDate: "02/05/2025",
      expiryDate: "01/05/2026",
      duration: "12 months",
      idv: "1131120.00",
      sumInsured: "1131120.00",
      totalIdv: "1131120.00",
      premium: "12624.82",
      totalPremium: "12624.82",
      netPremium: "3754.00",
      odPremium: "3754.00",
      basicOwnDamage: "4692.00",
      cgst: "962.91",
      sgst: "962.91",
      gstAmount: "1,925.82",
      ncbPercentage: "20%",
      policyCoverType: "Own Damage",
      financerName: "PRATHAMA UP GRAMIN BANK"
    });
  });

  it("locks the New India motor extraction contract for future policy additions", async () => {
    const sourceFile = "tests/fixtures/THE NEW INDIA.pdf";
    const parsed = await pdf(readFileSync(sourceFile));
    const result = extractPolicyFromText(parsed.text || "", sourceFile);

    expect(result).toMatchObject({
      insuredName: "VIJAY KUMAR KATRE",
      policyNumber: "45140031260300001755",
      policyType: "Private Car Package Policy",
      insuranceCompany: "The New India Assurance Company Limited",
      contactNumber: "8818889660",
      contactPerson: "VIJAY KUMAR KATRE",
      vehicleNumber: "MP-04-ED-8912",
      registrationNumber: "MP-04-ED-8912",
      makeModel: "MAHINDRA/BOLERO NEO",
      variant: "N8",
      manufacturingYear: "2022",
      engineNumber: "XJN6B20464",
      chassisNumber: "MA1NA2XJXN6B94278",
      fuelType: "Diesel",
      cubicCapacity: "1493",
      seatingCapacity: "7",
      idv: "628803.00",
      sumInsured: "628803.00",
      premium: "17,846.00",
      totalPremium: "17,846.00",
      netPremium: "15,124.00",
      tpDriverOwner: "3691.00",
      odPremium: "11433.00",
      startDate: "26/05/2026",
      expiryDate: "25/05/2027",
      duration: "12 months",
      policyCoverType: "Package",
      riskLocation: "",
      validIn: "",
      nomineeName: "",
      financerName: "",
      basicOwnDamage: "5016.00",
      basicThirdPartyLiability: "3416.00",
      netOwnDamagePremium: "11433.00",
      netLiabilityPremium: "3691.00",
      totalPackagePremium: "15,124.00",
      zeroDepreciationCover: "4087.22",
      ncb: "20%",
      ncbPercentage: "20%"
    });
  });

  it("extracts New India commercial vehicle package policy details", async () => {
    const sourceFile = "tests/fixtures/RAHUL   RAI_MP04HE6044_2026-27 POLICY.pdf";
    const parsed = await pdf(readFileSync(sourceFile));
    const result = extractPolicyFromText(parsed.text || "", sourceFile);

    expect(result).toMatchObject({
      documentFormat: "NEW_INDIA_MOTOR_V1",
      insuranceCompany: "The New India Assurance Company Limited",
      insuredName: "RAHUL RAI",
      policyNumber: "45140031260100001497",
      policyType: "Commercial Vehicle Package Policy",
      vehicleNumber: "MP-04-HE-6044",
      registrationNumber: "MP-04-HE-6044",
      makeModel: "ASHOK LEYL/2518 IL",
      vehicleMake: "ASHOK LEYL",
      vehicleModel: "2518 IL",
      manufacturingYear: "2016",
      engineNumber: "GDPZ111607",
      chassisNumber: "MB1CTCFD5GPDT2142",
      fuelType: "Diesel",
      cubicCapacity: "0",
      seatingCapacity: "3",
      grossVehicleWeight: "28000",
      idv: "615600.00",
      premium: "48,149.00",
      totalPremium: "48,149.00",
      netPremium: "45,645.00",
      odPremium: "1595.00",
      tpDriverOwner: "44050.00",
      startDate: "25/05/2026",
      expiryDate: "24/05/2027",
      duration: "12 months",
      policyCoverType: "Package",
      ncb: "50%",
      rtoLocation: "BHOPAL"
    });
  });

  it("extracts New India premium fields from alternate financial labels", () => {
    const text = `
      PRIVATE CAR PACKAGE POLICY
      The New India Assurance Company Limited
      Policy No 45140031260300009999
      Name of Insured RAMESH KUMAR
      SCHEDULE OF PREMIUM
      Own Damage Premium : 11,433
      TP + Driver + Owner : 3,691
      Net Premium : 15,124
      GST : 2,722
      Total Premium : 17,846
      VEHICLE DETAILS
      Registration NumberMP-04-ED-8912
    `;

    const result = extractPolicyFromText(text, "new-india-alt-labels.pdf");

    expect(result).toMatchObject({
      insuranceCompany: "The New India Assurance Company Limited",
      totalPremium: "17,846.00",
      premium: "17,846.00",
      netPremium: "15,124.00",
      tpDriverOwner: "3,691.00",
      odPremium: "11,433.00",
      gstAmount: "2,722.00"
    });
  });

  it("treats New India registration no as vehicle number and IDV as insured declared value", () => {
    const text = `
      PRIVATE CAR PACKAGE POLICY
      The New India Assurance Company Limited
      Policy No 45140031260300008888
      Name of Insured SURESH PATEL
      VEHICLE DETAILS
      Registration no. MP-04-CX-1283
      Chassis No. MA1NA2XJXN6B94278
      Engine No. XJN6B20464
      Make / Model MAHINDRA/BOLERO NEO
      Insured Declared Value (IDV) Rs. 6,28,803
      Total Premium : 17,846
    `;

    const result = extractPolicyFromText(text, "new-india-registration-idv.pdf");

    expect(result).toMatchObject({
      insuranceCompany: "The New India Assurance Company Limited",
      vehicleNumber: "MP-04-CX-1283",
      registrationNumber: "MP-04-CX-1283",
      idv: "6,28,803.00",
      totalIdv: "6,28,803.00",
      sumInsured: "6,28,803.00"
    });
  });

  it("extracts New India glued registration no when a new vehicle only has an RTO prefix", () => {
    const text = `
      THE NEW INDIA ASSURANCE CO. LTD.
      Commercial Vehicle Package Policy Enhanced Covers
      Policy Number :45140031260300001471
      Insured's NameVIJAY KUMAR MISHRA CONST PVT LTD
      VEHICLE DETAILS
      Chassis no./Engine NumberMAT567014T3B06261/7B62300D03162B64556307
      Type of fuel:DieselCubic capacity(cc)/Wattage(kW): 0cc
      Make/Model:TATA/SIGNA 2830.KRegistration no.MP-04
      Seating capacity including Driver: 3
      INSURED DECLARED VALUE (Rs)
      VehicleTrailerNon-Elec AccElectrical AccBi-fuel/CNG/LPG kitTotal Value
      1364770000013647700
    `;

    const result = extractPolicyFromText(text, "new-india-new-vehicle.pdf");

    expect(result).toMatchObject({
      insuranceCompany: "The New India Assurance Company Limited",
      vehicleNumber: "MP-04",
      registrationNumber: "MP-04",
      makeModel: "TATA/SIGNA 2830.K",
      chassisNumber: "MAT567014T3B06261",
      engineNumber: "7B62300D03162B64556307",
      idv: "13647700.00",
      totalIdv: "13647700.00"
    });
  });

  
  it("locks the ICICI Lombard motor extraction contract for the private car format", async () => {
    const sourceFile = "tests/fixtures/ICICI LOMBARD.pdf";
    const parsed = await pdf(readFileSync(sourceFile));
    const result = extractPolicyFromText(parsed.text || "", sourceFile);

    expect(result).toMatchObject({
      documentFormat: "ICICI_LOMBARD_MOTOR_V1",
      insuredName: "LEENA SAJWANI",
      policyNumber: "3001/393418852/01/000",
      policyType: "Private Car Package Policy",
      insuranceCompany: "ICICI Lombard General Insurance Company Limited",
      contactNumber: "91******92",
      customerMobile: "91******92",
      customerEmail: "IN**************@GMAIL.COM",
      vehicleNumber: "MP04CR2712",
      registrationNumber: "MP04CR2712",
      makeModel: "HYUNDAI CRETA 1.4 CRDI S",
      vehicleMake: "HYUNDAI",
      vehicleModel: "CRETA 1.4 CRDI S",
      bodyType: "SUV",
      manufacturingYear: "2016",
      registrationDate: "19/09/2016",
      engineNumber: "D4FCGM128109",
      chassisNumber: "MALC281RLGM127005",
      fuelType: "Diesel",
      cubicCapacity: "1396",
      seatingCapacity: "5",
      idv: "400000.00",
      sumInsured: "400000.00",
      totalIdv: "400000.00",
      premium: "6662.00",
      totalPremium: "6662.00",
      netPremium: "5646.00",
      odPremium: "1305.00",
      tpDriverOwner: "4341.00",
      startDate: "26/05/2026 00:00",
      expiryDate: "25/05/2027",
      duration: "12 months",
      policyCoverType: "Comprehensive",
      rtoLocation: "BHOPAL",
      rto: "BHOPAL",
      ncb: "45%",
      ncbPercentage: "45%",
      basicOwnDamage: "2011.00",
      roadSideAssistance: "199.00",
      basicThirdPartyLiability: "3416.00",
      legalLiabilityToPaidDriver: "50.00",
      paCoverForOwnerDriver: "675.00",
      unnamedPaCover: "200.00",
      netOwnDamagePremium: "1305.00",
      netLiabilityPremium: "4341.00",
      totalPackagePremium: "5646.00",
      cgst: "508.14",
      sgst: "508.14",
      gstAmount: "1016.00",
      previousPolicyNumber: "3001/393418852/00/000",
      previousPolicyValidity: "26-05-2025 to 25-05-2026",
      previousInsurer: "ICICI LOMBARD",
      previousYearNcb: "35%",
      issuanceDate: "14/05/2026",
      invoiceNumber: "1005261085360",
      covernoteNumber: "393418852",
      premiumCollectionNumber: "1265882514",
      receiptDate: "14/05/2026",
      cscName: "INSUREDESK",
      cscCode: "IMF240706",
      cscContactNumber: "8818889660",
      servicingBranchName: "Bhopal",
      servicingBranchAddress: "Maple High Street, 5Th Floor, Opposite Aashima Mall, Hoshangabad Road, Bhopal, Madhya Pradesh-462026",
      geographicalArea: "India",
      compulsoryDeductible: "1000.00",
      voluntaryDeductible: "0.00",
      gstin: "23AAACI7904G1ZV",
      hsnSacCode: "997134 / GENERAL INSURANCE SERVICES",
      applicableImtClauses: "16 , 28 , 22",
      nomineeName: "",
      financerName: "",
      riskLocation: "",
      validIn: ""
    });
  });

  it("derives missing New India premium values from available totals", () => {
    const text = `
      Private Car Package Policy
      The New India Assurance Company Limited
      Policy No 45140031260300008888
      Name of Insured RAMESH KUMAR
      SCHEDULE OF PREMIUM
      Total TP Premium 3691
      Net Premium in Rs 15124
      GST in Rs 2722
      Total Payable in Rs 17846
      Registration NumberMP-04-ED-8912
    `;

    const result = extractPolicyFromText(text, "new-india-derived-premium.pdf");

    expect(result).toMatchObject({
      totalPremium: "17846.00",
      netPremium: "15124.00",
      tpDriverOwner: "3691.00",
      odPremium: "11,433.00",
      gstAmount: "2722.00"
    });
  });

  it("locks the HDFC ERGO motor extraction contract for future policy additions", () => {
    const hdfcSampleText = `
      HDFC ERGO General Insurance Company Limited
      Certificate of Insurance cum Policy Schedule
      23112012345678901234
      PRIVATE CAR COMPREHENSIVE POLICY
      Proposal No. HDFCPROP12345
      Invoice No. INV98765
      Issuance Date 26/05/2026
      From Date & Time 26/05/2026 00:00 To Date & Time 25/05/2027 23:59
      Premium Details
      Customer Name RAHUL SHARMA
      Communication Address: 21 LAKE VIEW ROAD BHOPAL MADHYA PRADESH
      Tel. 9876543210
      Email ID rahul@example.com
      PAN/Form 97 ID ABCDE1234F
      Vehicle Details
      Make HYUNDAI
      Model CRETA SX
      Registration No. MP-04-CX-1234
      RTO BHOPAL
      Chassis No. MALPC81CLPM123456
      Engine No. D4FCM123456
      Cubic Capacity / Watts 1497
      Seats 5
      Year of Manufacture 2023
      Body Type SUV
      Fuel Type Diesel
      Total IDV 850000
      Geographical Area India Compulsory Deductible
      Premium Details
      Basic Own Damage 12000
      Basic Third Party Liability 3416
      Net Own Damage Premium (a) 12000
      Net Liability Premium (b) 3416
      Total Package Premium (a+b) 15416
      GST 18%
      2775
      Total Premium 18191
      Due Collection 18191
      Collected Amount 10000
      Previous Policy No. HDFCPREV123Valid 26/05/2025 to 25/05/2026 of HDFC ERGO
      NCB 20%
      Payment Details UPI987654
      Bank Name HDFC BANK
      CSC Name BIMA CENTER
      CSC Code CSC123
      Contact No 9123456789
    `;

    const result = extractPolicyFromText(hdfcSampleText, "hdfc-ergo-sample.pdf");

    expect(result).toMatchObject({
      documentFormat: "HDFC_ERGO_MOTOR_V1",
      insuredName: "RAHUL SHARMA",
      policyNumber: "23112012345678901234",
      policyType: "PRIVATE CAR COMPREHENSIVE POLICY",
      insuranceCompany: "HDFC ERGO",
      contactNumber: "9876543210",
      vehicleNumber: "MP-04-CX-1234",
      registrationNumber: "MP-04-CX-1234",
      makeModel: "HYUNDAI CRETA SX",
      manufacturingYear: "2023",
      engineNumber: "D4FCM123456",
      chassisNumber: "MALPC81CLPM123456",
      fuelType: "Diesel",
      cubicCapacity: "1497",
      seatingCapacity: "5",
      idv: "850000.00",
      sumInsured: "850000.00",
      premium: "18191.00",
      netPremium: "15416.00",
      odPremium: "12000.00",
      tpDriverOwner: "3416.00",
      startDate: "26/05/2026 00:00",
      expiryDate: "25/05/2027 23:59",
      duration: "12 months",
      policyCoverType: "Comprehensive",
      rtoLocation: "BHOPAL",
      ncb: "20%",
      proposalNumber: "HDFCPROP12345",
      invoiceNumber: "INV98765",
      issuanceDate: "26/05/2026",
      customerMobile: "9876543210",
      customerEmail: "rahul@example.com",
      panNumber: "ABCDE1234F",
      vehicleMake: "HYUNDAI",
      vehicleModel: "CRETA SX",
      rto: "BHOPAL",
      bodyType: "SUV",
      totalIdv: "850000.00",
      basicOwnDamage: "12000.00",
      basicThirdPartyLiability: "3416.00",
      netOwnDamagePremium: "12000.00",
      netLiabilityPremium: "3416.00",
      totalPackagePremium: "15416.00",
      gstAmount: "2775.00",
      dueCollection: "18191.00",
      collectedAmount: "10000.00",
      totalPremium: "18191.00",
      previousPolicyNumber: "HDFCPREV123",
      ncbPercentage: "20%",
      paymentReference: "UPI987654",
      bankName: "HDFC BANK",
      cscName: "BIMA CENTER",
      cscCode: "CSC123",
      cscContactNumber: "9123456789",
      variant: "",
      riskLocation: "",
      validIn: "",
      nomineeName: "",
      financerName: ""
    });
  });

  it("preserves the exact Tata AIG policy type from the Auto Secure header", () => {
    const text = `
      TATA AIG General Insurance Company Limited
      Auto Secure - Private Car Package Policy
      Policy No. 6202897883 02 00
      Registration No. MP 04 CX 1283
      Name of the Insured SMITA PANDEY
      Total Premium 6421.00
      Net Premium 5441.00
      TP + Driver + Owner 2519.00
      OD Premium 1219.63
    `;

    const result = extractPolicyFromText(text, "tata-aig-auto-secure.pdf");

    expect(result.policyType).toBe("Auto Secure - Private Car Package Policy");
    expect(result.insuranceCompany).toBe("TATA AIG");
  });

  it("builds Tata AIG duration from normalized policy dates", () => {
    const text = `
      TATA AIG General Insurance Company Limited
      Auto Secure - Private Car Package Policy
      Policy No. 6202897883 02 00
      Own Damage Cover 09/05/2026 to 08/05/2027
      Registration No. MP 04 CX 1283
      Name of the Insured SMITA PANDEY
    `;

    const result = extractPolicyFromText(text, "tata-aig-auto-secure.pdf");

    expect(result.startDate).toBe("2026-05-09");
    expect(result.expiryDate).toBe("2027-05-08");
    expect(result.duration).toBe("12 months");
  });

  it("extracts Royal Sundaram goods carrying liability policy headers and vehicle details", () => {
    const text = `
      Royal Sundaram General Insurance Co. Limited
      May 09, 2026
      Mr.SUNEEL KUMAR SHUKLA
      WARD NO 23
      Contact:9981667989
      CERTIFICATEOFINSURANCE&POLICYSCHEDULE
      Goods Carrying Vehicle Policy \u2013 Liability only [Reprint]
      Certificate of Insurance and Policy No.
      VGT0605988000100
      Policy Period:Period of insurance
      From 00:00 hours on 09/05/2026 To Midnight of 08/05/2027
      INSURED DETAILS
      Name of Insured
      Insured Date
      of Birth
      Geographical
      Area
      Business/Profession
      Registration
      Authority
      Registration
      Date
      Mr.SUNEEL KUMAR SHUKLA10/06/1981IndiaREWA14/08/2006
      VEHICLE DETAILS
      Registration Number
      MP17HH0221
      Model Description
      Tata LPT 2515 / 56
      Gross Vehicle Weight(Kgs)
      25,000
      Engine Number
      B591452060G62492371
      Type of Body
      OPEN
      Seating Capacity (including Driver)
      2
      Chassis Number
      426031GTZ736948
      Fuel Type
      Diesel
      Make of the Vehicle
      Tata Motors Ltd.
      Year of Manufacture
      2006Total Premium (in Rs.)46,266
      TOTAL LIABILITY PREMIUM (B)44,050.00TOTAL PREMIUM46,265.50
      In Witness whereof this Policy has been signed at Chennai on 09/05/2026 in lieu of Cover note No. dated Receipt No. CBCEAP5113665.
      GSTIN :23AABCR7106G1ZR
      PAN Number:AABCR7106G
    `;

    const result = extractPolicyFromText(text, "royal-sundaram-gcv.pdf");

    expect(result).toMatchObject({
      documentFormat: "ROYAL_SUNDARAM_MOTOR_V1",
      insuranceCompany: "Royal Sundaram General Insurance Co. Limited",
      policyType: "Goods Carrying Vehicle Policy \u2013 Liability only [Reprint]",
      insuredName: "Mr.SUNEEL KUMAR SHUKLA",
      policyNumber: "VGT0605988000100",
      startDate: "09/05/2026",
      expiryDate: "08/05/2027",
      registrationNumber: "MP17HH0221",
      makeModel: "Tata Motors Ltd. Tata LPT 2515 / 56",
      grossVehicleWeight: "25,000.00",
      engineNumber: "B591452060G62492371",
      chassisNumber: "426031GTZ736948",
      fuelType: "DIESEL",
      manufacturingYear: "2006",
      registrationDate: "14/08/2006",
      seatingCapacity: "2",
      premium: "46,265.50",
      totalPremium: "46,265.50",
      netPremium: "44,050.00",
      tpDriverOwner: "44,050.00",
      odPremium: "",
      policyCoverType: "Third Party"
    });
  });

  it("locks the TATA AIG motor extraction contract for the Auto Secure format", async () => {
    const sourceFile = "tests/fixtures/TATA AIG.pdf";
    const parsed = await pdf(readFileSync(sourceFile));
    const result = extractPolicyFromText(parsed.text || "", sourceFile);

    expect(result).toMatchObject({
      documentFormat: "TATA_AIG_MOTOR_V1",
      insuranceCompany: "TATA AIG",
      policyType: "Auto Secure - Private Car Package Policy",
      policyCoverType: "Comprehensive",
      insuredName: "MRS CHANCHAL ANAND SONI",
      contactPerson: "MRS CHANCHAL ANAND SONI",
      contactNumber: "+9188**88**60",
      policyNumber: "6206191778 00 00",
      customerId: "6204718724",
      gstin: "NA",
      vehicleNumber: "MP04ZH3415",
      registrationNumber: "MP04ZH3415",
      makeModel: "MARUTI XL6",
      variant: "ZETA M",
      fuelType: "CNG",
      engineNumber: "K15CN9223488",
      chassisNumber: "MA3CNC62SPD328639",
      bodyType: "SUV",
      cubicCapacity: "1462",
      manufacturingYear: "2023",
      registrationDate: "26/04/2023",
      seatingCapacity: "6",
      rtoLocation: "BHOPAL",
      geographicalArea: "India",
      idv: "907994.00",
      sumInsured: "907994.00",
      premium: "21466.00",
      totalPremium: "21466.00",
      netPremium: "18075.00",
      odPremium: "6084.56",
      tpDriverOwner: "4051.00",
      ncb: "20%",
      modeOfPayment: "paymentLinkCustomer",
      receiptNumber: "PD300021604783",
      receiptDate: "21/04/2026",
      payerName: "CHANCHAL ANAND SONI",
      nomineeName: "anand soni",
      nomineeAge: "38",
      nomineeRelationship: "Spouse"
    });
  });

  it("does not assign a company-specific motor parser from generic policy words", () => {
    const genericPrivateCarText = `
      PRIVATE CAR COMPREHENSIVE POLICY
      Certificate of Insurance cum Policy Schedule
      Policy No. 12345678901234567890
      Vehicle Details
      Registration No. MP-04-AA-1234
      Chassis No. ABCDE123456789012
      Engine No. ENG1234567
      Premium Details
      Total IDV 500000
      Basic Own Damage 10000
      Basic Third Party Liability 3416
    `;

    const result = extractPolicyFromText(genericPrivateCarText, "generic-private-car.pdf");

    expect(result.documentFormat).not.toBe("TATA_AIG_MOTOR_V1");
    expect(result.documentFormat).not.toBe("HDFC_ERGO_MOTOR_V1");
    expect(result.insuranceCompany).not.toBe("TATA AIG");
    expect(result.insuranceCompany).not.toBe("HDFC ERGO");
  });

  it("uses Generali Central company text instead of Tata AIG assumptions", () => {
    const generaliText = `
      Generali Central Insurance Company Limited
      Motor Protect Private Car Package Policy
      Policy No.:132/02/11/0527/MTP/1010484553
      Name of Insured/Proposer MRS SARITA VERMA
      Period of Insurance:From 00:00 hours of 18/05/2026 To
      Midnight of 17/05/2027
      INSURED MOTOR VEHICLE DETAILS AND PREMIUM COMPUTATION
      Registration No.,
      RTA Location
      Make/Model of VehicleEngine No.Chassis No.
      MP-04-CS-8999, BHOPALMARUTI SUZUKI CIAZ SMART
      HYBRID DELTA BSIV
      D13A3063021MA3FXEB1S00282824
      Year of ManufactureCubic CapacityType of BodySeating
      Capacity
      Premium
      20171248SALOON56,987.00
      INSURED'S DECLARED VALUE
      For Trailer -For CNG -TotalIDV
      3,73,003.00.00.00.00.003,73,003.00Year 1 IDV
      Total Premium (rounded off)6,987.00
    `;

    const result = extractPolicyFromText(generaliText, "generali-motor.pdf");

    expect(result.documentFormat).toBe("GENERALI_MOTOR_V1");
    expect(result.insuranceCompany).toBe("Generali Central Insurance Company Limited");
    expect(result.insuranceCompany).not.toBe("TATA AIG");
  });

  it("matches label-adjacent motor values when table cells are glued to the next label", () => {
    const text = `
      PRIVATE CAR PACKAGE POLICY
      The New India Assurance Company Limited
      VEHICLE DETAILS
      Registration NumberMP-04-ED-8912
      Chassis no./Engine NumberMA1NA2XJXN6B94278/XJN
      6B20464
      Make / ModelMAHINDRA/BOLERO NEO
      Variant:N8
      Year of manufacture2022Type of body / Type of FuelSUV/Diesel
      ColourAS PER RCCubic capacity(cc)
      /Wattage(kW):
      1493cc
      Seating capacity including
      Driver
      7Name of registration
      authority
      Bhopal
    `;

    const result = extractPolicyFromText(text, "generic-private-car.pdf");

    expect(result.vehicleNumber).toBe("MP-04-ED-8912");
    expect(result.chassisNumber).toBe("MA1NA2XJXN6B94278");
    expect(result.engineNumber).toBe("XJN6B20464");
    expect(result.seatingCapacity).toBe("7");
    expect(result.fuelType).toBe("Diesel");
    expect(result.makeModel).toBe("MAHINDRA/BOLERO NEO");
    expect(result.variant).toBe("N8");
    expect(result.cubicCapacity).toBe("1493");
  });

  it("rejects impossible dense seating values using inferred vehicle type", () => {
    const text = `
      TWO WHEELER PACKAGE POLICY
      Insured Motor Vehicle Details & Premium Calculation
      Registration Mark & No.
      Engine No.
      Seating Capacity
      MP04QD13572016
      Make of Vehicle
      220Package24300.00
      Chassis No.
      22
      BAJAJ PULSAR 220 DTS-Fi
      MD2A13EZ3GCA30996
    `;

    const result = extractPolicyFromText(text, "generic-two-wheeler-bad-seat.pdf");

    expect(result.seatingCapacity).toBe("");
    expect(result.policyCoverType).toBe("Package");
    expect(result.cubicCapacity).toBe("220");
  });

  it("does not populate motor cover type from non-motor package policy names", () => {
    const text = `
      ICICI Lombard General Insurance Company Limited
      MSME Suraksha Kavach Package Policy - Advance
      Name of the Insured
      SHRI JAGANNATH WAREHOUSE A/C MPWLC
      Policy No 1030/440285484/00/000
      Period of cover 11/05/2026 to 10/05/2027
      Premises to be Insured
      PROP DIPIKA TADA, VILLAGE BEDGAON, TEHSIL SATWAS, DISTRICT DEWAS, MADHYA PRADESH, 455459
      Business of the Insured
      Storage of Non-hazardous goods - Storage in godown or warehouse
      Premium (\`) (Including GST) (\`) 63956.00
      MSME Suraksha Kavach - Contents (\`) 14,00,00,000.00
    `;

    const result = extractPolicyFromText(text, "generic-warehouse-msme.pdf");

    expect(result.policyType).toBe("MSME Suraksha Kavach Package Policy - Advance");
    expect(result.policyCoverType).toBe("");
    expect(result.vehicleNumber).toBe("");
    expect(result.engineNumber).toBe("");
    expect(result.chassisNumber).toBe("");
  });

  it("extracts policy periods across common insurer wordings", () => {
    const cases = [
      {
        text: "Private Car Policy\nPolicy No. ABC12345\nPeriod of cover 11/05/2026 to 10/05/2027",
        startDate: "11/05/2026",
        expiryDate: "10/05/2027"
      },
      {
        text: "Private Car Policy\nPolicy No. ABC12345\nPeriod of Insurance From: 00:00 hours of 18/05/2026 To Midnight of 17/05/2027",
        startDate: "18/05/2026",
        expiryDate: "17/05/2027"
      },
      {
        text: "Private Car Policy\nPolicy No. ABC12345\nFrom: 00:00 Hours of 26/05/2026 To: Midnight On 25/05/2027",
        startDate: "26/05/2026",
        expiryDate: "25/05/2027"
      },
      {
        text: "Private Car Policy\nPolicy No. ABC12345\nPolicy effective from 0001 hrs 21/05/2026\nTo MidNight 20/05/2027",
        startDate: "21/05/2026",
        expiryDate: "20/05/2027"
      },
      {
        text: "Private Car Policy\nPolicy No. ABC12345\nStart Date: 09/05/2026\nEnd Date: 08/05/2027",
        startDate: "09/05/2026",
        expiryDate: "08/05/2027"
      }
    ];

    for (const item of cases) {
      const result = extractPolicyFromText(item.text, "period-format.pdf");
      expect(result.startDate).toBe(item.startDate);
      expect(result.expiryDate).toBe(item.expiryDate);
      expect(result.duration).toBe("12 months");
    }
  });

  it("enriches RTO location and rto fields from the vehicle registration number", () => {
    const text = `
      TWO WHEELER POLICY CERTIFICATE
      Registration Mark & No. MP-04-CX-1283
      Engine No. F8DN6202347
    `;
    const result = extractPolicyFromText(text, "generic-two-wheeler.pdf");
    expect(result.vehicleNumber).toBe("MP-04-CX-1283");
    expect(result.rtoLocation).toBe("BHOPAL");
    expect(result.rto).toBe("BHOPAL");

    const textDelhi = `
      PRIVATE CAR PACKAGE POLICY
      Registration Mark & No. DL-03-BC-1111
      Engine No. XJN6B20464
    `;
    const resultDelhi = extractPolicyFromText(textDelhi, "delhi-private-car.pdf");
    expect(resultDelhi.vehicleNumber).toBe("DL-03-BC-1111");
    expect(resultDelhi.rtoLocation).toBe("DDA MARKET, SHEIKH SARAI");
    expect(resultDelhi.rto).toBe("DDA MARKET, SHEIKH SARAI");
  });
});
