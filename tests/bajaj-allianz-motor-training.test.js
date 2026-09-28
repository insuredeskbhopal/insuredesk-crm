/* @vitest-environment node */
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
const trainer = require("../src/lib/policies/pdf/training/bajaj-allianz/motor.cjs");
const { applyScopedTraining, selectScopedTraining } = require("../src/lib/policies/pdf/training/registry.cjs");

const commercialLiabilityText = `
Welcome to the Bajaj General Insurance Family
Bajaj General Insurance Limited
Liability Only Policy for Commercial Vehicle - POLICY SCHEDULE CUM CERTIFICATE OF INSURANCE
UIN : IRDAN113RP0042V01200102
POLICY DETAILSINSURED DETAILS
Insured Name Sudeep Jaiswal
Kannod Road New Colony Ashta Sehore, Sehore, Madhya Pradesh-466116
23 - MADHYA PRADESH
12-1831-0010461706-00 Policy Number
Policy Issued on 27-07-2026 18:04:46 hrs
Policy Period
From: 27-07-2026 00:00:01 hrs
To: 26-07-2027 Midnight
Invoice Number 232607I001356078
Vehicle Details:
MP-37-P-0157TATA 29562009LP 407SCHOOL BUS (24) 5600
MP37-SEHORE24MAT35725198F15903DIESEL(D)0497SPTC36FQZ617576
Total IDV (Rs)
0
0
0
0
0
Compulsory Personal Accident - SI- 1500000 Period: From 27/07/2026 To 26/07/2027
331
LL To Person For Operation
Maintenance IMT 28
50
30072 Basic Third Party Liability
2741
SGST (9%)
2741
CGST (9%)
Final Premium 35935
A. Proposer details:
Mailing Address KANNOD ROAD NEW COLONY ASHTA SEHORE, SEHORE 466116 MADHYA PRADESH
Profession NA
Email ID INSUREDESKBHOPAL@GMAIL.COM
Mobile Number 9424411103
B. Vehicle Details:
Rs. 30453 9. Premium for Liability coverage, quoted and agreed upon
12. About the last insurance company
i. Insurance Provider
ii. Previous Policy No
iii. Previous Policy Expiry Date
Reliance General Insurance Company Limited.
230222523550000313
25/07/2026
Subject to Warranties/
IMT-Endorsements/
28
`;

const privateCarPackageText = `
Bajaj General Insurance Limited
(Formerly known as Bajaj Allianz General Insurance Co. Ltd.)
Registered and Head Office: Bajaj Insurance House, Airport Road, Yerwada, Pune - 411006(India)
Transcript of Proposal for Private Car Package Policy
Dear AMRIT LAL PARWANI,
We wish to inform you that the contract under policy number 'OG-27-2301-1801-00000509' has been finalized
A. Proposer details
1. Proposer Name : AMRIT LAL PARWANI
2. Proposer Address : HOUSE NO 321/1 BHAGAT SINGH WARD NO 01, BANARJI COLONY 61 PIPARIYA TEHSIL PIPARIYA, , HOSHANGABAD, MADHYA PRADESH-461775
3. Proposer Mobile Number :
5. Proposer e-mail id : *************pal@gmail.com
B.Vehicle Details
Registration Number MP04CT2032
Month / Year of Regn SEP/2017
Vehicle Make MARUTI
Vehicle Model VITARA BREZZA
Vehicle Sub Type 1.2 VDI (O) DDIS 200
Cubic Capacity/Kilowatt 1248
Fuel Type Diesel
Year of Manufacture 2017
Seating Capacity 5
Engine Number D13A5503389
Chassis Number MA3NYFB1SHH278727
Vehicle IDV (in Rs.) 3,41,220.00
Total IDV (in Rs.) 3,41,220.00
Certificate of Insurance ( PRIVATE CAR PACKAGE POLICY)
UIN : IRDAN113RP0025V01200102
Policy Number: OG-27-2301-1801-00000509 Customer ID: 510138540
Place of Registration MP04-BHOPAL
Name of Registration Authority : MP04-BHOPAL
Name and Address of Insured : AMRIT LAL PARWANI
Policy Inception Date: From 00:01 O' Clock on 04-AUG-2026
Policy Expiry Date: Midnight on 03-AUG-2027
PRIVATE CAR PACKAGE POLICY SCHEDULE
Policy Issued on 03-AUG-2026 19:38 PM
Policy Period
From : 04-AUG-2026 00:01
(Hrs)
To : 03-AUG-2027 Midnight
Previous Policy No D217171051
Invoice No 491815852/1
Company GST No 23AABCB5730G1Z5
Place of Supply/ State Code/Name 23 - Madhya Pradesh
Registration Number MP04CT2032
Place of Registration MP04-BHOPAL
Engine Number D13A5503389
Chassis Number MA3NYFB1SHH278727
Make & Model MARUTI - VITARA BREZZA
SubType 1.2 VDI (O) DDIS 200
NCB % -45
CC/KW 1248
Seating Capacity 5
Year Of Manufacturing 2017
Hypothecation Details HDFC BANK LTD
Vehicle IDV 3,41,220.00
Total Value 3,41,220.00
Own Damage Premium 5,440.00
Total OD Premium - A 5,440.00
Total Premium (Net Premium) (A+B) 9,488.00
State GST (9%) 854.00
Central GST (9%) 854.00
Final Premium ( Rupees Eleven Thousand One Hundred Ninety Six Only ) 11,196.00
Basic Third Party Liability 3,416.00
PA Cover for Owner-Driver - SI - Rs.1500000 Period: From 04-Aug-2026 To 03-AUG-2027 331.00
LL to person for Paid driver/Operation/Maintenance 50.00
PA Cover For 5 Passenger Of Rs. 100000 each 250.00
Total Act Premium - B 4,047.00
Agency Code BAG10107590 Contact No. 08818889660/08818889660
Agency Name PRAGATI PANDEY
E-Mail ID. ANAND.SONI10@GMAIL.COM
Nominee Details Name :MRS PARWANI - Relationship :Spouse
Subject to Warranties/ IMT-Endorsements/ Add on Package
7, 16, 22, 28, & Plan Name:Drive Assure Economy Plus & Plan Description: 24x7 spot assistance , depreciation shield , engine protector , ,keys and locks replacement cover with sum insured Rs.50000 ,personal baggage cover with sum insured Rs.30000
Receipt No. 2301-00361759, Date 03-AUG-26
About the last insurance company
(i) Insurance Provider : Go Digit General Insurance Limited.
(ii) Previous Policy No : D217171051, Previous Policy Expiry Date :03-AUG-26
`;

describe("Bajaj Allianz motor scoped training", () => {
  it("extracts the commercial liability policy field by field", () => {
    const result = trainer.train({ text: commercialLiabilityText, result: {} });

    expect(result).toMatchObject({
      insuredName: "Sudeep Jaiswal",
      policyNumber: "12-1831-0010461706-00",
      policyType: "Liability Only Policy for Commercial Vehicle",
      policyCoverType: "Third Party",
      uinNumber: "IRDAN113RP0042V01200102",
      contactNumber: "9424411103",
      customerEmail: "INSUREDESKBHOPAL@GMAIL.COM",
      startDate: "27-07-2026",
      expiryDate: "26-07-2027",
      registrationNumber: "MP-37-P-0157",
      rtoLocation: "MP37-SEHORE",
      vehicleMake: "TATA",
      vehicleModel: "LP 407",
      variant: "SCHOOL BUS (24)",
      cubicCapacity: "2956",
      manufacturingYear: "2009",
      seatingCapacity: "24",
      grossVehicleWeight: "5600",
      chassisNumber: "MAT35725198F15903",
      engineNumber: "497SPTC36FQZ617576",
      fuelType: "Diesel",
      idv: "0.00",
      tpPremium: "30072.00",
      ownerDriverPremium: "331.00",
      legalLiabilityPremium: "50.00",
      netPremium: "30453.00",
      cgst: "2741.00",
      sgst: "2741.00",
      totalPremium: "35935.00",
      previousInsurer: "Reliance General Insurance Company Limited",
      previousPolicyNumber: "230222523550000313",
      previousPolicyExpiryDate: "25/07/2026",
      imtEndorsements: "IMT-28",
      extractionTrainingVersion: "BAJAJ_ALLIANZ_MOTOR_COMMERCIAL_LIABILITY_V2",
    });
  });

  it("extracts AMRIT LAL PARWANI Private Car Package Policy correctly", () => {
    const result = trainer.train({ text: privateCarPackageText, result: {} });

    expect(result).toMatchObject({
      productName: "Private Car Package Policy",
      policyType: "Private Car Package Policy",
      policyCoverType: "Comprehensive",
      uinNumber: "IRDAN113RP0025V01200102",
      policyNumber: "OG-27-2301-1801-00000509",
      customerId: "510138540",
      insuredName: "AMRIT LAL PARWANI",
      customerName: "AMRIT LAL PARWANI",
      startDate: "04/08/2026",
      expiryDate: "03/08/2027",
      registrationNumber: "MP04CT2032",
      vehicleNumber: "MP04CT2032",
      rtoLocation: "MP04-BHOPAL",
      engineNumber: "D13A5503389",
      chassisNumber: "MA3NYFB1SHH278727",
      vehicleMake: "MARUTI",
      vehicleModel: "VITARA BREZZA",
      variant: "1.2 VDI (O) DDIS 200",
      makeModel: "MARUTI - VITARA BREZZA",
      manufacturingYear: "2017",
      cubicCapacity: "1248",
      seatingCapacity: "5",
      fuelType: "Diesel",
      ncb: "45%",
      ncbPercentage: "45%",
      hypothecation: "HDFC BANK LTD",
      financier: "HDFC BANK LTD",
      idv: "341220.00",
      totalIdv: "341220.00",
      odPremium: "5440.00",
      basicTpPremium: "3416.00",
      ownerDriverPremium: "331.00",
      legalLiabilityPremium: "50.00",
      paPassengersPremium: "250.00",
      tpPremium: "4047.00",
      netPremium: "9488.00",
      cgst: "854.00",
      sgst: "854.00",
      gstAmount: "1708.00",
      totalPremium: "11196.00",
      grossPremium: "11196.00",
      agentName: "PRAGATI PANDEY",
      agentCode: "BAG10107590",
      agentMobile: "08818889660",
      agentEmail: "ANAND.SONI10@GMAIL.COM",
      nomineeName: "MRS PARWANI",
      nomineeRelation: "Spouse",
      previousInsurer: "Go Digit General Insurance Limited",
      previousPolicyNumber: "D217171051",
      previousPolicyExpiryDate: "03/08/2026",
      addOnCovers: "Drive Assure Economy Plus",
      depreciationShieldCover: "Yes",
      engineProtectorCover: "Yes",
      spotAssistanceCover: "Yes",
      keysAndLocksCover: "Yes",
      personalBaggageCover: "Yes",
      compulsoryDeductible: "",
      imtEndorsements: "IMT-7, IMT-16, IMT-22, IMT-28",
      extractionTrainingVersion: "BAJAJ_ALLIANZ_MOTOR_PRIVATE_CAR_PACKAGE_V1",
    });
  });

  it("extracts AMRIT LAL PARWANI real PDF file correctly", async () => {
    const filePath = path.join(process.cwd(), "storage", "AMRIT LAL PARWANI_MP04CT2032_2026-27 POLICY.pdf");
    if (!fs.existsSync(filePath)) return;
    const buf = fs.readFileSync(filePath);
    const data = await pdf(buf);

    const result = applyScopedTraining({}, { text: data.text });

    expect(result.insuranceCompany).toBe("Bajaj Allianz General Insurance Company Limited");
    expect(result.documentCategory).toBe("Motor Insurance");
    expect(result.productName).toBe("Private Car Package Policy");
    expect(result.policyNumber).toBe("OG-27-2301-1801-00000509");
    expect(result.customerName).toBe("AMRIT LAL PARWANI");
    expect(result.vehicleNumber).toBe("MP04CT2032");
    expect(result.registrationNumber).toBe("MP04CT2032");
    expect(result.rtoLocation).toBe("MP04-BHOPAL");
    expect(result.engineNumber).toBe("D13A5503389");
    expect(result.chassisNumber).toBe("MA3NYFB1SHH278727");
    expect(result.vehicleMake).toBe("MARUTI");
    expect(result.vehicleModel).toBe("VITARA BREZZA");
    expect(result.variant).toBe("1.2 VDI (O) DDIS 200");
    expect(result.makeModel).toBe("MARUTI - VITARA BREZZA");
    expect(result.manufacturingYear).toBe("2017");
    expect(result.cubicCapacity).toBe("1248");
    expect(result.seatingCapacity).toBe("5");
    expect(result.fuelType).toBe("Diesel");
    expect(result.ncb).toBe("45%");
    expect(result.hypothecation).toBe("HDFC BANK LTD");
    expect(result.idv).toBe("341220.00");
    expect(result.startDate).toBe("04/08/2026");
    expect(result.expiryDate).toBe("03/08/2027");
    expect(result.odPremium).toBe("5440.00");
    expect(result.basicTpPremium).toBe("3416.00");
    expect(result.ownerDriverPremium).toBe("331.00");
    expect(result.legalLiabilityPremium).toBe("50.00");
    expect(result.paPassengersPremium).toBe("250.00");
    expect(result.tpPremium).toBe("4047.00");
    expect(result.netPremium).toBe("9488.00");
    expect(result.cgst).toBe("854.00");
    expect(result.sgst).toBe("854.00");
    expect(result.gstAmount).toBe("1708.00");
    expect(result.totalPremium).toBe("11196.00");
    expect(result.agentName).toBe("PRAGATI PANDEY");
    expect(result.agentCode).toBe("BAG10107590");
    expect(result.agentMobile).toBe("08818889660");
    expect(result.agentEmail).toBe("ANAND.SONI10@GMAIL.COM");
    expect(result.nomineeName).toBe("MRS PARWANI");
    expect(result.nomineeRelation).toBe("Spouse");
    expect(result.previousInsurer).toBe("Go Digit General Insurance Limited");
    expect(result.previousPolicyNumber).toBe("D217171051");
    expect(result.previousPolicyExpiryDate).toBe("03/08/2026");
    expect(result.addOnCovers).toBe("Drive Assure Economy Plus");
    expect(result.depreciationShieldCover).toBe("Yes");
    expect(result.engineProtectorCover).toBe("Yes");
    expect(result.spotAssistanceCover).toBe("Yes");
    expect(result.keysAndLocksCover).toBe("Yes");
    expect(result.personalBaggageCover).toBe("Yes");
    expect(result.compulsoryDeductible).toBe("1000.00");
  });

  it("extracts RAKESH TIWARI Standalone Own Damage Two-Wheeler policy correctly", async () => {
    const filePath = path.join(process.cwd(), "storage", "NEW HEALTH", "RAKESHTIWARI_MP05ZB6573_2026-27.pdf");
    const buf = fs.readFileSync(filePath);
    const data = await pdf(buf);

    const result = applyScopedTraining({}, { text: data.text });

    expect(result.insuranceCompany).toBe("Bajaj Allianz General Insurance Company Limited");
    expect(result.documentCategory).toBe("Motor Insurance");
    expect(result.productName).toBe("Standalone Own Damage Cover for Two-Wheeler");
    expect(result.policyNumber).toBe("OG-27-2301-1871-00000222");
    expect(result.customerName).toBe("RAKESH TIWARI");
    expect(result.vehicleNumber).toBe("MP05ZB6573");
    expect(result.registrationNumber).toBe("MP05ZB6573");
    expect(result.engineNumber).toBe("JEXCNH10650");
    expect(result.chassisNumber).toBe("MD2B72BX1NCH33476");
    expect(result.vehicleMake).toBe("BAJAJ");
    expect(result.vehicleModel).toBe("PULSAR 125");
    expect(result.variant).toBe("NS DISC");
    expect(result.cubicCapacity).toBe("125");
    expect(result.manufacturingYear).toBe("2022");
    expect(result.fuelType).toBe("Petrol");
    expect(result.rtoLocation).toBe("MP05-HOSHANGABAD");
    expect(result.idv).toBe("68000.00");
    expect(result.startDate).toBe("22/08/2026");
    expect(result.expiryDate).toBe("21/08/2027");
    expect(result.odPremium).toBe("1746.00");
    expect(result.netPremium).toBe("1746.00");
    expect(result.cgst).toBe("157.00");
    expect(result.sgst).toBe("157.00");
    expect(result.gstAmount).toBe("314.00");
    expect(result.totalPremium).toBe("2060.00");
    expect(result.agentName).toBe("PRAGATI PANDEY");
    expect(result.agentCode).toBe("BAG10107590");
    expect(result.agentMobile).toBe("08818889660");
    expect(result.agentEmail).toBe("ANAND.SONI10@GMAIL.COM");
    expect(result.activeTpInsurer).toBe("IFFCO Tokio General Insurance Company Limited");
    expect(result.activeTpPolicyNumber).toBe("MU271953");
    expect(result.activeTpStartDate).toBe("28/04/2023");
    expect(result.activeTpExpiryDate).toBe("27/04/2028");
    expect(result.addOnCovers).toBe("Drive Assure Basic (depreciation shield)");
    expect(result.depreciationShieldCover).toBe("Yes");
  });

  it("extracts Ms Siddharth Indane Commercial Vehicle Liability policy correctly", async () => {
    const filePath = path.join(process.cwd(), "storage", "Ms Siddharth Indane_MP04ZJ0844_2026-27 POLICY.pdf");
    if (!fs.existsSync(filePath)) return;
    const buf = fs.readFileSync(filePath);
    const data = await pdf(buf);

    const result = applyScopedTraining({}, { text: data.text });

    expect(result.insuranceCompany).toBe("Bajaj Allianz General Insurance Company Limited");
    expect(result.documentCategory).toBe("Motor Insurance");
    expect(result.productName).toBe("Liability Only Policy for Commercial Vehicle");
    expect(result.policyType).toBe("Liability Only Policy for Commercial Vehicle");
    expect(result.policyCoverType).toBe("Third Party");
    expect(result.uinNumber).toBe("IRDAN113RP0042V01200102");
    expect(result.policyNumber).toBe("12-1831-0010525157-00");
    expect(result.insuredName).toBe("Ms Siddharth Indane");
    expect(result.customerName).toBe("Ms Siddharth Indane");
    expect(result.customerId).toBe("PO40121953");
    expect(result.gstin).toBe("23ACRFS4386A1Z0");
    expect(result.registrationNumber).toBe("MP-04-ZJ-0844");
    expect(result.vehicleNumber).toBe("MP-04-ZJ-0844");
    expect(result.vehicleMake).toBe("TATA");
    expect(result.vehicleModel).toBe("ACE GOLD");
    expect(result.variant).toBe("HALF DECK LOAD BODY");
    expect(result.bodyType).toBe("HALF DECK LOAD BODY");
    expect(result.grossVehicleWeight).toBe("1615");
    expect(result.cubicCapacity).toBe("694");
    expect(result.manufacturingYear).toBe("2023");
    expect(result.seatingCapacity).toBe("2");
    expect(result.chassisNumber).toBe("MAT559034PVC18117");
    expect(result.engineNumber).toBe("275MPFI03CWXS41386");
    expect(result.fuelType).toBe("Diesel");
    expect(result.rtoLocation).toBe("MP04-BHOPAL");
    expect(result.startDate).toBe("05-08-2026");
    expect(result.expiryDate).toBe("04-08-2027");
    expect(result.hypothecation).toBe("EQUITAS SMALL FINANCE BANK LTD");
    expect(result.basicThirdPartyLiability).toBe("16049.00");
    expect(result.legalLiabilityPremium).toBe("100.00");
    expect(result.tpPremium).toBe("16049.00");
    expect(result.netPremium).toBe("16149.00");
    expect(result.liabilityPremium).toBe("16149.00");
    expect(result.cgst).toBe("410.00");
    expect(result.sgst).toBe("410.00");
    expect(result.gstAmount).toBe("820.00");
    expect(result.totalPremium).toBe("16969.00");
    expect(result.grossPremium).toBe("16969.00");
    expect(result.agentName).toBe("PRAGATI PANDEY");
    expect(result.agentCode).toBe("10107590");
    expect(result.agentMobile).toBe("8818889660");
    expect(result.agentEmail).toBe("anand.soni10@gmail.com");
    expect(result.imtEndorsements).toBe("IMT-7, IMT-28");
    expect(result.extractionTrainingVersion).toBe("BAJAJ_ALLIANZ_MOTOR_COMMERCIAL_LIABILITY_V2");
  });

  it("extracts M/S ADITYA EVENT Commercial Vehicle Package Policy correctly", async () => {
    const filePath = path.join(process.cwd(), "storage", "MS ADITYA EVENT_MP04ZL4271_2026-27.pdf");
    if (!fs.existsSync(filePath)) return;
    const buf = fs.readFileSync(filePath);
    const data = await pdf(buf);

    const result = applyScopedTraining({}, { text: data.text });

    expect(result.insuranceCompany).toBe("Bajaj Allianz General Insurance Company Limited");
    expect(result.documentCategory).toBe("Motor Insurance");
    expect(result.productName).toBe("Commercial Vehicle Package Policy");
    expect(result.policyType).toBe("Commercial Vehicle Package Policy");
    expect(result.policyCoverType).toBe("Comprehensive");
    expect(result.uinNumber).toBe("IRDAN113RP0027V01200102");
    expect(result.policyNumber).toBe("OG-27-2301-1803-00000132");
    expect(result.insuredName).toBe("M/S ADITYA EVENT");
    expect(result.customerName).toBe("M/S ADITYA EVENT");
    expect(result.customerId).toBe("512550150");
    expect(result.contactNumber).toBe("8319706765");
    expect(result.customerEmail).toBe("insuredeskbhopal@gmail.com");
    expect(result.gstin).toBe("23AEHPV5120P1Z5");
    expect(result.startDate).toBe("26/08/2026");
    expect(result.expiryDate).toBe("25/08/2027");
    expect(result.vehicleNumber).toBe("MP04ZL4271");
    expect(result.registrationNumber).toBe("MP04ZL4271");
    expect(result.vehicleMake).toBe("ASHOK LEYLAND");
    expect(result.vehicleModel).toBe("DOST");
    expect(result.variant).toBe("LE - HALF DECK LOAD BODY");
    expect(result.makeModel).toBe("ASHOK LEYLAND DOST");
    expect(result.grossVehicleWeight).toBe("2590");
    expect(result.manufacturingYear).toBe("2023");
    expect(result.seatingCapacity).toBe("2");
    expect(result.chassisNumber).toBe("MB1AA22E9PRKJ0133");
    expect(result.engineNumber).toBe("KPH027290P");
    expect(result.rtoLocation).toBe("MP04-BHOPAL");
    expect(result.fuelType).toBe("Diesel");
    expect(result.hypothecation).toBe("HDFC BANK LTD");
    expect(result.financier).toBe("HDFC BANK LTD");
    expect(result.idv).toBe("495000.00");
    expect(result.odPremium).toBe("1068.00");
    expect(result.basicThirdPartyLiability).toBe("16049.00");
    expect(result.tpPremium).toBe("16049.00");
    expect(result.tpDriverOwner).toBe("0.00");
    expect(result.netPremium).toBe("17117.00");
    expect(result.cgst).toBe("497.00");
    expect(result.sgst).toBe("497.00");
    expect(result.gstAmount).toBe("994.00");
    expect(result.totalPremium).toBe("18111.00");
    expect(result.modeOfPayment).toBe("Credit Card");
    expect(result.ncb).toBe("35%");
    expect(result.compulsoryDeductible).toBe("500.00");
    expect(result.previousInsurer).toBe("United India Insurance Company Limited");
    expect(result.previousPolicyNumber).toBe("1907023125P108335609");
    expect(result.previousPolicyExpiryDate).toBe("25/08/2026");
    expect(result.agentName).toBe("PRAGATI PANDEY");
    expect(result.agentCode).toBe("BAG10107590");
    expect(result.agentMobile).toBe("08818889660");
    expect(result.agentEmail).toBe("ANAND.SONI10@GMAIL.COM");
    expect(result.imtEndorsements).toBe("IMT-7, IMT-21, IMT-23");
    expect(result.extractionTrainingVersion).toBe("BAJAJ_ALLIANZ_MOTOR_COMMERCIAL_PACKAGE_V1");
  });

  it("is isolated from Bajaj non-motor and other motor insurers", () => {
    const bajajWarehouse = selectScopedTraining(
      { insuranceCompany: "Bajaj Allianz General Insurance Company Limited", documentCategory: "Warehouse Insurance" },
      { text: "Bajaj General Insurance Warehouse Policy" },
    );
    const tataMotor = selectScopedTraining(
      { insuranceCompany: "TATA AIG General Insurance", documentCategory: "Motor Insurance" },
      { text: "TATA AIG Liability Only Policy for Commercial Vehicle" },
    );

    expect(bajajWarehouse).not.toContain(trainer);
    expect(tataMotor).not.toContain(trainer);
  });

  it("cannot overwrite scope identity fields", () => {
    const base = {
      insuranceCompany: "Bajaj Allianz General Insurance Company Limited",
      companyName: "Bajaj Allianz General Insurance Company Limited",
      documentCategory: "Motor Insurance",
      documentFormat: "BAJAJ_ALLIANZ_MOTOR_V1",
      sourceDocumentType: "BAJAJ_ALLIANZ_MOTOR_V1",
    };
    const result = applyScopedTraining(base, { text: commercialLiabilityText });

    expect(result).toMatchObject(base);
  });
});
