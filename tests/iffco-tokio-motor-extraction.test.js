/* @vitest-environment node */
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { applyScopedTraining, deriveTrainingScope } = require("../src/lib/policies/pdf/training/registry.cjs");

const sampleEndorsementText = `IFFCO - TOKIO GENERAL INSURANCE CO. LTD Servicing Office:
Regd. Office: IFFCO SADAN,C1 Distt Centre,Saket,New Delhi- 110017 Plot no. 214, Bhagwan Complex
Endorsement- Two Wheeler Policy 2nd Floor, Zone - 1 M.P. Nagar
Policy Schedule Cum Tax Invoice Bhopal - 462011 (MP)
ORIGINAL FOR RECIPIENT Phone No :- 0755 - 4022601
GST Applicable State Code: 23, GSTIN: 23AAACI7573H1ZK
General Insurance Services:- 997134
Insured's name: SOURABH NEMA Original Invoice No. 1-8NHMA81A
Address: LIG 54 HOUSING BOARD COLONY NARSIMHAPUR, SAGAR, Unique Invoice No. 1-8NHMA81A00003
NARSINGHPUR, MADHYA PRADESH Policy No……………………. : N8194398
LIGHARI MADHYA PRADESH 487001 Date of Issuance : 04/08/2026
State Code/ Place
of Supply:
23 Country Name: India GSTIN: Endorsement Effecitve Date : 01/08/2026
Phone Number: XXXXXXX528 Intermediary No. 21002760 Policy effective from 1328 hrs 01/08/2026
To MidNight 31/07/2027
Insured Motor Vehicle Details and Premium Calculations
Reg. Mark and
No.
Year of Manuf. Type of
body
Make of Vehicle CC Coverage IDV in
(Rs.)
Engine No. Chassis No. Seating Capacity
MP15ZN1481 2025 - TVS JUPITER
DRUM
113 Own Damage only 82619 KG5GS123145
1
MD626EG56S1G254
98
2
Insured Declared Values
Two Wheeler Side Car Accessories Elec./Elec. Acc. Bi-Fuel Kit Total Value
82619 0 0 0 0 82619
Not withstanding any thing contained to the contrary,it is hereby declared and agreed that
CORRECTION IN NAME
CORRECT INSURED NAME - SOURABH NEMA
Subject otherwise to the terms,conditions and exclusions of the policy,upon which this endorsement has been issued
Exclusion: Losses or damages caused directly or indirectly due to any infectious or contagious disease, pandemic /epidemics as declared by WHO and / or
Government of India will be an exclusion under this policy.
Two Wheeler Policy (UIN : IRDAN106RP0001V01201920 )
Attaching to and forming part of Policy Number N8194398

Taxable Value CGST SGST IGST CESS 
Rate 0.00 0.00 0.00 0.00
Amount 0.00 0.00 0.00 0.00 0.00
Total Tax ₹0.0 Total Value ₹0.00
`;

const sampleScheduleText = `IFFCO-TOKIO GENERAL INSURANCE CO.LTD  
Regd. Office: IFFCO Sadan C1 Distt. Centre, Saket, New Delhi - 110017
TWO WHEELER POLICY CERTIFICATE OF INSURANCE CUM 
SCHEDULE & TAX INVOICE
Corporate Identification Number (CIN) 
U74899DL2000PLC107621, IRDA Reg. No. 106
UIN: IRDAN106RP0001V01201920 
Servicing Office
IFFCO TOKIO GEN INSU. CO. LTD. Bhagwan Complex, 1ST Floor
Plot No 214 Zone - I, M.P. Nagar,
BHOPAL MADHYA PRA
INDIA 462011
General Insurance Services:  997134
GSTIN : 23AAACI7573H1ZK
Phone #: 07554022600
Intermediary Name: INSUREDESK IMF PRIVATE LIMITED 
Intermediary #: 21002760
Intermediary Mobile #:     8818889660
Insured's Name: SOURABH MEENA Policy #: 1-8NHMA81A
P400 Policy #: N8194398
Tax Invoice No: 1-8NHMA81A          Status Check :   Inforce
Address: LIG 54 HOUSING BOARD COLONY NARSIMHAPUR, SAGAR, NARSINGHPUR-MADHYA PRADESH
Invoice/Issuance Date: 31/07/2026 13:26:57
Period of Insurance  
From:             01/08/2026   00:00:00
 To: Midnight On  31/07/2027   23:59:59
NARSINGHPUR MADHYA PRA INDIA Pin Code 487001
Phone #:  XXXXXXX528 CKYC #:  XXXXXXX Cover Note #
Geographical Area: Within India Only
State Code: 23 Country INDIA Place Of Supply: MADHYA PRADESH

Insured Motor Vehicle Details & Premium Calculation
Registration Mark & No. Year of Manuf. Type of Body CC Coverage IDV in Rs.
- KG5GS1231451
MP15ZN14812025
Make of Vehicle 113Stand Alone OD82619.00
Non Electrical Accessories are not covered as its value is 0
Chassis No. 2
TVS JUPITER DRUMMD626EG56S1G25498

A. Own Damage Premium(Rs.) B. Third Party Policy Details
Basic Premium(Incl. Disc) 970.00 TP Insurer Name:  Reliance General Ins.
Side Car Premium 0.00 TP Policy Number: 110422523750020426
TP Start Date: 01/08/2025
TP End Date: 31/07/2030  23:59:00
No Claim Bonus Discount  (  20% ) -194.00
Net (A)  776.00

Premium Bifurcation (Rs.)
Section 1 (Rs.) Section 2 (Rs.) Premium/Taxable Value(Rs.) Total GST
Net Premium Rs.(for 1 years)
776.00 762.00 1538.00 276.84 1814.84
`;

describe("IFFCO Tokio Motor Policy Extraction & Isolation", () => {
  it("derives the correct scope", () => {
    const scope = deriveTrainingScope(
      { insuranceCompany: "IFFCO-TOKIO GENERAL INSURANCE CO.LTD", documentCategory: "Motor Insurance" },
      { text: sampleScheduleText }
    );
    expect(scope).toEqual({ insurer: "iffco-tokio", category: "motor" });
  });

  it("extracts all fields accurately from IFFCO Tokio Motor Endorsement", () => {
    const original = {
      insuranceCompany: "IFFCO Tokio General Insurance Co. Ltd.",
      documentCategory: "Motor Insurance",
    };

    const trained = applyScopedTraining(original, { text: sampleEndorsementText });

    expect(trained.policyNumber).toBe("N8194398");
    expect(trained.insuredName).toBe("SOURABH NEMA");
    expect(trained.registrationNumber).toBe("MP15ZN1481");
    expect(trained.vehicleMake).toBe("TVS");
    expect(trained.vehicleModel).toBe("JUPITER DRUM");
    expect(trained.manufacturingYear).toBe("2025");
    expect(trained.cubicCapacity).toBe("113");
    expect(trained.engineNumber).toBe("KG5GS1231451");
    expect(trained.chassisNumber).toBe("MD626EG56S1G25498");
    expect(trained.seatingCapacity).toBe("2");
    expect(trained.startDate).toBe("01/08/2026");
    expect(trained.expiryDate).toBe("31/07/2027");
    expect(trained.agentCode).toBe("21002760");
    expect(trained.endorsementRemarks).toBe("CORRECTION IN NAME : CORRECT INSURED NAME - SOURABH NEMA");
    expect(trained.netPremium).toBe("0.00");
    expect(trained.totalPremium).toBe("82619.00");
    expect(trained.extractionTrainingVersion).toBe("IFFCO_TOKIO_MOTOR_V2");
  });

  it("extracts all fields accurately from IFFCO Tokio Two Wheeler Policy Schedule", () => {
    const original = {
      insuranceCompany: "IFFCO-TOKIO GENERAL INSURANCE CO.LTD",
      documentCategory: "Motor Insurance",
    };

    const trained = applyScopedTraining(original, { text: sampleScheduleText });

    expect(trained.policyNumber).toBe("N8194398");
    expect(trained.insuredName).toBe("SOURABH MEENA");
    expect(trained.registrationNumber).toBe("MP15ZN1481");
    expect(trained.vehicleMake).toBe("TVS");
    expect(trained.vehicleModel).toBe("JUPITER DRUM");
    expect(trained.manufacturingYear).toBe("2025");
    expect(trained.cubicCapacity).toBe("113");
    expect(trained.idv).toBe("82619.00");
    expect(trained.engineNumber).toBe("KG5GS1231451");
    expect(trained.chassisNumber).toBe("MD626EG56S1G25498");
    expect(trained.seatingCapacity).toBe("2");
    expect(trained.startDate).toBe("01/08/2026");
    expect(trained.expiryDate).toBe("31/07/2027");
    expect(trained.agentCode).toBe("21002760");
    expect(trained.intermediaryName).toBe("INSUREDESK IMF PRIVATE LIMITED");
    expect(trained.intermediaryMobile).toBe("8818889660");
    expect(trained.tpInsurerName).toMatch(/^Reliance General Ins\.?$/);
    expect(trained.tpPolicyNumber).toBe("110422523750020426");
    expect(trained.tpStartDate).toBe("01/08/2025");
    expect(trained.tpEndDate).toBe("31/07/2030");
    expect(trained.ncbPercentage).toBe("20");
    expect(trained.ncbDiscount).toBe("194.00");
    expect(trained.netPremium).toBe("1538.00");
    expect(trained.gstAmount).toBe("276.84");
    expect(trained.totalPremium).toBe("1814.84");
    expect(trained.extractionTrainingVersion).toBe("IFFCO_TOKIO_MOTOR_V2");
  });

  it("extracts all fields accurately from IFFCO Tokio Commercial Vehicle Policy (MP04YR6027 / MP04YR6085)", () => {
    const sampleCommVehicleText = `
IFFCO-TOKIO GENERAL INSURANCE CO.LTD
Regd. Office: IFFCO Sadan C1 Distt. Centre, Saket, New Delhi - 110017
COMMERCIAL VEHICLE CERTIFICATE OF INSURANCE cum 
SCHEDULE  & TAX INVOICE
Corporate Identification Number (CIN) U74899DL2000PLC107621, 
IRDA Reg. No. 106
UIN: IRDAN106P0005V01200607 
Servicing Office
Service Office : IFFCO TOKIO GEN INSU. CO. LTD. Bhagwan Complex, 1ST Floor
Plot No 214 Zone - I, M.P. Nagar, BHOPAL MADHYA PRA 462011 INDIA
General Insurance Services: 997134
GSTIN : 23AAACI7573H1ZK
Phone #: 0755 4022600
Intermediary Name:
INSUREDESK IMF PRIVATE LIMITED 
Intermediary #: 
21002760
Intermediary Mobile #: 8818889660
 
 VIJAY KUMAR MISHRA CONSTRUCTION PVT. LTD. Policy #: 1-8MS4NYSX P400 Policy # N8440049
Tax Invoice No: 1-8MS4NYSX        
Address:
 A-54, DWARIKA DHAM 11TH MILE GARDEN CITY BHOJPUR ROAD, CHHAN BHOPAL, MADHYA PRADESH
Invoice/Issuance Date:
24/08/2026 16:45:52
Period of Insurance
From: 26/08/2026 00:00:00
To: Midnight On 25/08/2027 23:59:59
 BHOPAL MADHYA PRA INDIA Pin Code 462047
Phone #: XXXXXXX528 CKYC #: XXXXXXX Cover Note #
Geographical Area: Within India Only Status Check : Inforce
State Code: 23 Country INDIA Place Of Supply: MADHYA PRADESH
GSTIN UIN 23AABCV9626P1ZR
 
  Insured Motor Vehicle Details & Premium Calculation
Registration Mark & No. Year of Manuf.
Vehicle Name
CC Coverage IDV in Rs. Non Elect. Acc.
Engine No.
Seating Capacity as per RC
GVW
SIGNA 2823.K BSVI 39W 7CUM TM
B56B62220D01152E6447768
8
MP04YR6027 2025
Make of Vehicle
5000 Package 3847500
Non Electrical Accessories are not covered as its value is 0
Chassis No.
2
DTRMXMAT802301S2E08652
  
Registration Authority
Vehicle Trailer Elec./Elect. Acc. Bi-Fuel Kit Total Value Net Premium Rs.
3847500.00 0.00 0.00 0 3847500.00 27561.26
A. Own Damage (Rs.) B. Third Party (Rs.)
Basic OD Premium 4625.00
Basic TP Premium (Including TPPD) 7267.00
IMT 23 694.00 Legal Liability to Driver (IMT 28) 100.00
No Claim Discount ( 20% ) -1064
Net (A) 4255.00 Net (B) 7367.00
Section 1
 11622.00
Section 2: Value Auto Coverage
Coverages Premium Rs. Limit Of Liability
Depreciation Waver Cover 7503.00 As Per Coverage Wordings
Consumable 4232.00 As Per Coverage Wordings
Premium Bifurcation (Rs.)
Section 1 (Rs.) Section 2 (Rs.) RPI Premium Premium/Taxable Value(Rs.) Total GST Net Premium (Rs.)
11622.00 11735.00 23357.00 4204.26 27561.26
Under Hire Purchase /Hypothecated/Lease Agreement with HDFC BANK LTD
Previous Policy Number Previous Insurer Name and Address Policy Expiry Date
80000031250350068997 NEW INDIA ASSURANCE CO. LTD BHOPAL BHOPAL BHOPAL MADHYA PRA 462001 25/08/2026
Receipt Particulars:   
Pay Method Receipt Amount Instrument # Instrument Date Bank
NEFT 27561.00 HDFCH01211962853 24/08/2026 HDFC BANK    
Amount Received 27561.00
`;

    const original = {
      insuranceCompany: "IFFCO-TOKIO GENERAL INSURANCE CO.LTD",
      documentCategory: "Motor Insurance",
    };

    const trained = applyScopedTraining(original, { text: sampleCommVehicleText });

    expect(trained.policyNumber).toBe("N8440049");
    expect(trained.taxInvoiceNumber).toBe("1-8MS4NYSX");
    expect(trained.insuredName).toMatch(/^VIJAY KUMAR MISHRA CONSTRUCTION PVT\. LTD\.?$/);
    expect(trained.registrationNumber).toBe("MP04YR6027");
    expect(trained.vehicleMake).toBe("TATA");
    expect(trained.vehicleModel).toBe("SIGNA 2823.K BSVI 39W 7CUM TM");
    expect(trained.makeModel).toBe("TATA SIGNA 2823.K BSVI 39W 7CUM TM");
    expect(trained.manufacturingYear).toBe("2025");
    expect(trained.engineNumber).toBe("B56B62220D01152E64477688");
    expect(trained.chassisNumber).toBe("DTRMXMAT802301S2E08652");
    expect(trained.seatingCapacity).toBe("2");
    expect(trained.cubicCapacity).toBe("5000");
    expect(trained.idv).toBe("3847500.00");
    expect(trained.totalIdv).toBe("3847500.00");
    expect(trained.startDate).toBe("26/08/2026");
    expect(trained.expiryDate).toBe("25/08/2027");
    expect(trained.policyIssueDate).toBe("24/08/2026");
    expect(trained.agentCode).toBe("21002760");
    expect(trained.intermediaryName).toBe("INSUREDESK IMF PRIVATE LIMITED");
    expect(trained.odPremium).toBe("4255.00");
    expect(trained.tpPremium).toBe("7367.00");
    expect(trained.addonPremium).toBe("11735.00");
    expect(trained.netPremium).toBe("23357.00");
    expect(trained.gstAmount).toBe("4204.26");
    expect(trained.totalPremium).toBe("27561.26");
    expect(trained.ncbPercentage).toBe("20");
    expect(trained.ncbDiscount).toBe("1064.00");
    expect(trained.financerName).toBe("HDFC BANK LTD");
    expect(trained.previousPolicyNumber).toBe("80000031250350068997");
    expect(trained.previousInsurer).toBe("NEW INDIA ASSURANCE CO. LTD");
    expect(trained.previousPolicyExpiryDate).toBe("25/08/2026");
    expect(trained.paymentMethod).toBe("NEFT");
    expect(trained.paymentReference).toBe("HDFCH01211962853");
    expect(trained.paymentDate).toBe("24/08/2026");
    expect(trained.bankName).toBe("HDFC BANK");
    expect(trained.extractionTrainingVersion).toBe("IFFCO_TOKIO_MOTOR_V2");
  });

  it("extracts real PDF files accurately for all 4 user policies", async () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const pdf = require("pdf-parse");

    // 1. VIJAY KUMAR MISHRA MP04YR6085
    const f1 = path.join(process.cwd(), "storage", "VIJAY KUMAR MISHRA CONSTRUCTION PVT. LTD._MP04YR6085_2026-27.pdf");
    if (fs.existsSync(f1)) {
      const d1 = await pdf(fs.readFileSync(f1));
      const res1 = applyScopedTraining({}, { text: d1.text });
      expect(res1.policyNumber).toBe("N8442949");
      expect(res1.insuredName).toBe("VIJAY KUMAR MISHRA CONSTRUCTION PVT. LTD.");
      expect(res1.registrationNumber).toBe("MP04YR6085");
      expect(res1.vehicleMake).toBe("TATA");
      expect(res1.vehicleModel).toBe("SIGNA 2823.K BSVI 39W 7CUM TM");
      expect(res1.engineNumber).toBe("B56B62220D01152E64478189");
      expect(res1.chassisNumber).toBe("DTRMXMAT802301S2E08653");
      expect(res1.netPremium).toBe("23357.00");
      expect(res1.totalPremium).toBe("27561.26");
    }

    // 2. VIJAY KUMAR MISHRA MP04YR6027
    const f2 = path.join(process.cwd(), "storage", "VIJAY KUMAR MISHRA CONSTRUCTION PVT. LTD._MP04YR6027_2026-27.pdf");
    if (fs.existsSync(f2)) {
      const d2 = await pdf(fs.readFileSync(f2));
      const res2 = applyScopedTraining({}, { text: d2.text });
      expect(res2.policyNumber).toBe("N8440049");
      expect(res2.insuredName).toBe("VIJAY KUMAR MISHRA CONSTRUCTION PVT. LTD.");
      expect(res2.registrationNumber).toBe("MP04YR6027");
      expect(res2.vehicleMake).toBe("TATA");
      expect(res2.vehicleModel).toBe("SIGNA 2823.K BSVI 39W 7CUM TM");
      expect(res2.engineNumber).toBe("B56B62220D01152E64477688");
      expect(res2.chassisNumber).toBe("DTRMXMAT802301S2E08652");
      expect(res2.netPremium).toBe("23357.00");
      expect(res2.totalPremium).toBe("27561.26");
    }

    // 3. LION ENGINEERING MP04ZF4664
    const f3 = fs.existsSync(path.join(process.cwd(), "storage", "LION ENGINEERING CONSULTANTS PRIVATE LIMITED_MP04ZF4664_2026-27 (1).pdf"))
      ? path.join(process.cwd(), "storage", "LION ENGINEERING CONSULTANTS PRIVATE LIMITED_MP04ZF4664_2026-27 (1).pdf")
      : path.join(process.cwd(), "storage", "LION ENGINEERING CONSULTANTS PRIVATE LIMITED_MP04ZF4664_2026-27.pdf");
    if (fs.existsSync(f3)) {
      const d3 = await pdf(fs.readFileSync(f3));
      const res3 = applyScopedTraining({}, { text: d3.text });
      expect(res3.insuranceCompany).toBe("IFFCO Tokio General Insurance Company Limited");
      expect(res3.documentCategory).toBe("Motor Insurance");
      expect(res3.policyNumber).toBe("N8294142");
      expect(res3.insuredName).toBe("LION ENGINEERING CONSULTANTS PRIVATE LIMITED");
      expect(res3.customerName).toBe("LION ENGINEERING CONSULTANTS PRIVATE LIMITED");
      expect(res3.registrationNumber).toBe("MP04ZF4664");
      expect(res3.vehicleNumber).toBe("MP04ZF4664");
      expect(res3.vehicleMake).toBe("HONDA");
      expect(res3.vehicleModel).toBe("ACTIVA DLX OBD2");
      expect(res3.makeModel).toBe("HONDA ACTIVA DLX OBD2");
      expect(res3.engineNumber).toBe("JK15EW5005614");
      expect(res3.chassisNumber).toBe("ME4JK156BPW005568");
      expect(res3.cubicCapacity).toBe("109");
      expect(res3.seatingCapacity).toBe("2");
      expect(res3.manufacturingYear).toBe("2023");
      expect(res3.idv).toBe("54000.00");
      expect(res3.totalIdv).toBe("54000.00");
      expect(res3.rtoLocation).toBe("MP04-BHOPAL");
      expect(res3.fuelType).toBe("Petrol");
      expect(res3.productName).toBe("Two Wheeler Policy");
      expect(res3.policyType).toBe("Two Wheeler Policy");
      expect(res3.policyCoverType).toBe("Stand Alone OD");
      expect(res3.startDate).toBe("31/08/2026");
      expect(res3.expiryDate).toBe("30/08/2027");
      expect(res3.tpInsurerName).toBe("New India Assurance");
      expect(res3.odPremium).toBe("407.00");
      expect(res3.tpPremium).toBe("0.00");
      expect(res3.tpDriverOwner).toBe("0.00");
      expect(res3.modeOfPayment).toBe("NEFT / RTGS");
      expect(res3.paymentMode).toBe("NEFT / RTGS");
      expect(res3.paymentMethod).toBe("NEFT");
      expect(res3.paymentReference).toBe("UCBAH26222382015");
      expect(res3.bankName).toBe("UNION BANK");
      expect(res3.addonPremium).toBe("176.00");
      expect(res3.netPremium).toBe("583.00");
      expect(res3.cgst).toBe("52.47");
      expect(res3.sgst).toBe("52.47");
      expect(res3.gstAmount).toBe("104.94");
      expect(res3.totalPremium).toBe("687.94");
      expect(res3.ncbPercentage).toBe("25");
      expect(res3.ncbDiscount).toBe("136.00");
      expect(res3.depreciationWaiverPremium).toBe("176.00");
      expect(res3.depreciationShieldCover).toBe("Yes");
      expect(res3.depreciationWaiverCover).toBe("Yes");
      expect(res3.nilDepreciation).toBe("Yes");
      expect(res3.addOnCovers).toBe("Depreciation Waiver Cover");
      expect(res3.compulsoryDeductible).toBe("100.00");
      expect(res3.imtEndorsements).toContain("IMT-22");
    }

    // 4. ABHISHEK CHAUDA MP04CB0912
    const f4 = path.join(process.cwd(), "storage", "ABHISHEK CHAUDA POLICY.pdf");
    if (fs.existsSync(f4)) {
      const d4 = await pdf(fs.readFileSync(f4));
      const res4 = applyScopedTraining({}, { text: d4.text });
      expect(res4.policyNumber).toBe("N8491786");
      expect(res4.insuredName).toBe("ABHISHEK CHAUDA");
      expect(res4.registrationNumber).toBe("MP04CB0912");
      expect(res4.vehicleMake).toBe("MARUTI SUZUKI");
      expect(res4.vehicleModel).toBe("WAGON R LXI LPG");
      expect(res4.engineNumber).toBe("F10DN4338984");
      expect(res4.chassisNumber).toBe("MA3EED81S00515012");
      expect(res4.cubicCapacity).toBe("1061");
      expect(res4.idv).toBe("46980.00");
      expect(res4.productName).toBe("Private Car Package Policy");
      expect(res4.policyCoverType).toBe("Comprehensive");
      expect(res4.netPremium).toBe("4095.00");
      expect(res4.totalPremium).toBe("4832.10");
    }
  });
});
