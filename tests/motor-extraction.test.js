// @vitest-environment node

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { extractPolicyFromText } = require("../lib/pdf-extractor.cjs");
const pdf = require("pdf-parse");

describe("generic motor policy extraction", () => {
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
    const iffcoSampleText = readFileSync("_debug_raw_text.txt", "utf8");
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
      policyCoverType: "Package",
      variant: "",
      riskLocation: "",
      validIn: "",
      nomineeName: "",
      financerName: ""
    });
  });

  it("locks the New India motor extraction contract for future policy additions", async () => {
    const sourceFile = "VIJAY KUMAR KATRE_MP04ED8912_2026-27 POLICY.pdf";
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
      financerName: ""
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
      policyCoverType: "Third Party"
    });
  });

  it("locks the TATA AIG motor extraction contract for the Auto Secure format", async () => {
    const sourceFile = "SMITA PANDEY_MP04CX1283_2026-27 POLICY.pdf";
    const parsed = await pdf(readFileSync(sourceFile));
    const result = extractPolicyFromText(parsed.text || "", sourceFile);

    expect(result).toMatchObject({
      documentFormat: "TATA_AIG_MOTOR_V1",
      insuranceCompany: "TATA AIG",
      policyType: "Auto Secure - Private Car Package Policy",
      policyCoverType: "Package",
      insuredName: "SMITA PANDEY",
      contactPerson: "SMITA PANDEY",
      contactNumber: "+9196**40**88",
      policyNumber: "6202897883 02 00",
      customerId: "6165380790",
      gstin: "NA",
      vehicleNumber: "MP 04 CX 1283",
      registrationNumber: "MP 04 CX 1283",
      makeModel: "MARUTI ALTO",
      variant: "VXI",
      fuelType: "PETROL",
      engineNumber: "F8DN6202347",
      chassisNumber: "MA3EUA61S00E48033",
      bodyType: "HATCH BACK",
      cubicCapacity: "796",
      manufacturingYear: "2019",
      registrationDate: "18/06/2019",
      seatingCapacity: "5",
      rtoLocation: "BHOPAL",
      geographicalArea: "India",
      idv: "173731.00",
      sumInsured: "173731.00",
      premium: "6421.00",
      totalPremium: "6421.00",
      netPremium: "5441.00",
      odPremium: "1219.63",
      tpDriverOwner: "2519.00",
      ncb: "45%",
      modeOfPayment: "paymentLinkCustomer",
      receiptNumber: "PD300022255333",
      receiptDate: "27/05/2026",
      payerName: "SMITA PANDEY",
      nomineeName: "LEGAL HEIR",
      nomineeAge: "34",
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
});
