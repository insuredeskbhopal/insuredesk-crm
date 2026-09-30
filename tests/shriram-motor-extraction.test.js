/* @vitest-environment node */
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");

const shriramCvOcrText = "POS - GCCV-PUBLIC CARRIERS OTHER THAN THREE WHEELERS - Zone C\nMOTOR COMMERCIAL VEHICLE (LIABILITY ONLY POLICY) - \nUIN No.IRDAN137RP0022V01200809 - SAC Code: 997134 \nIRDAI REGN. NO. - 137\nB\n SHRIRAM GENERAL INSURANCE COMPANY LIMITED\n E-8,EPIP,SITAPURA INDUSTRIAL AREA,JAIPUR,\n RAJASTHAN-302022\n CONTACT(TOLL FREE): 1800 – 30030000, 1800 – 1033009\n CERTIFICATE CUM POLICY SCHEDULE\nCIN NO.U66010RJ2006PLC029979\nBranch Address Shriram General Insurance Co.Ltd.,Rahul \nComplex, 3rd Floor, C-3,,Dhimrapur Road, \nRaigarh, Raigarh, CHHATTISGARH - 496001\nBranch Office Phone No.\nGeographical Area INDIA Policy No. 209040/31/27/000523\nInsured's Code/ Name IN-46327391 / M/S. MS MAHAKAL \nTRANSPORTN AND CO \nGSTIN No. Of Insured Unregistered\nInsured Address and \nContact Details\nSUKHI SEWANIYA VIDISHA ROAD BHOPAL, (MP) C/O BASSI, , CHITTAURGARH-312022\n, BASSI\n, CHITTORGARH, RAJASTHAN\n - 312022 ,Mob- ******6483,Email-c*a*d*a*a*n*s*a*2@gmail.com\nInsured Address as Per \nRC\nSUKHI SEWANIYA VIDISHA ROAD BHOPAL, (MP) C/O BASSI, , CHITTAURGARH-312022\n, BASSI\n, CHITTORGARH, RAJASTHAN\n - 312022 ,Mob- ******6483,Email-c*a*d*a*a*n*s*a*2@gmail.com\nCKYC Details CKYC No- ,POA ID-Others /POA ID No- ******370M, POI ID- PAN/ POI ID No- ******370M\nInsured State Code 8 NCB Discount (%) 0\nExecutive AJAY PATEL - NAN000004613-, Period of Insurance From 13:30 Hrs of 01/07/2026 To \nMidnight Of 30/06/2027\nAgent Details CHANDRAPAL NISHAD - PSN000043166- \nMobile No.-9111527044- Toll/Phone No.N.A\nPAN No. DIXPN4266D\nProp No. - TR No. N.A - N.A Prop Issue Date N.A\nGross Premium 44342 IGST 2230\nCGST 0 SGST/UTGST 0\nPrevious Insurer N.A. Total 46572\nPrevious Policy No. N.A Nominee for \nOwner/Driver\nAbc\nNominee Age 33 Nominee Relationship OTHERS\nAppointee Name N.A Appointee Relationship N.A\nSCHEDULE OF PREMIUM\nLIABILITY\nBASIC TP COVER 44242.00\nADD :Legal Liability Coverages For Paid Driver 50.00\nADD :Legal Liability Coverages For Coolies 50.00\nTP TOTAL 44342.00\nTOTAL PREMIUM 44342.00\nADD : IGST 18.00% 18.00\nADD :IGST 5.00% 2212.00\nPREMIUM AMOUNT 46572.00\nHypothecation Agreement with: \nHire Purchase/Lease Agreement with:\nAgreement Number : \n \nCPA Policy number: , CPA Sum Insured: 0.00, CPA Company Name: , CPA Valid From: N.A., CPA Valid To: N.A.\nDeductibles under Section-I :\nSubject to IMT Endorsement Printed herein/attached to : IMT-28, IMT-39, IMT-40\nREGISTRATI\nON MARK & \nPLACE\nENGINE NO. & CHASSIS NO. MAKE - MODEL TYPE OF BODY \n/ FUEL TYPE\nCUBIC \nCAPACI\nTY / \nWATT/ \nYEAR OF \nMANF.\nG.V.W DATE OF REGN. / \nDELIVERY\nSEAT CAP.\n(INCL. DRIVER)\nRJ - 21 - GB - \n6122 & \nNAGOUR\nB591803251K63472202 & \nMAT447220F1K24434\nTATA MOTORS - LPS \n4018 BS 4 TC CAB\nTRI AXLE \nDUMPER/TIPPER \nTRAILER / \nDIESEL\n1 / 0 / \n2015\n45500 27/11/2015 2 + 1\nLiability Policy Period\nFrom Date & Time 01/07/2026 13:30 Hrs To Date & Time 30/06/2027 23:59 Hrs of Midnight\nCharger No. Battery Number Motor Number\nPLACE : RAIGARH_CH For and on behalf of\nShriram General Insurance Co.Ltd.\nAuthorized Signatory\n   \nWe will contact you through phone,e-mail, letters, registered AD, sms, etc for renewal before/after the \nexpiry date of your policy. If you do not want us to contact you, kindly send an e-mail for the same on \ndnd@shriramgi.com\nConsolidated Stamp Duty paid vide Inspector General Registration and Stamp, Ajmer Order No. F7-77-\nGen-2026-3237 dated 11-05-2026.\nPolicy Issuing office - E-8, EPIP, RIICO INDUSTRIAL AREA, SITAPURA ,JAIPUR, RAJASTHAN, 302022\nFor Policy Wordings, NEFT/RTGS/IMPS or any other online payment kindly visit our website \n\"www.shriramgi.com\" Validity of policy is subject to KYC verification. \nAll the Amounts mentioned in this policy are in Indian Rupees\nGSTIN No. 22AAKCS2509K1ZD\nNote :- Claim intimation after 48 hours will be\nconsidered as delayed intimation.\nAttached to and forming part of policy number : 209040/31/27/000523\nCERTIFICATE CUM POLICY SCHEDULE\nIMPORTANT NOTICE:\nThe Insured is not Indemnified if the vehicle is used or driven otherwise than in accordance with this Schedule.\nPOLICY IS SUBJECT TO EXCLUSION OF DAMAGES NOTED DOWN BY OUR AUTHORISED REPRESENTATIVE DURING THEIR INSPECTION.\nIf policy is cancelled/Endorsed beyond the said date [i.e.31/10/2027],only the proportionate amount of premium would be refunded and any GST amount would \nNOT be refunded owing to the restrictions prescribed under GST law.\nNote: In case of new vehicle, Insured have to submit registration documents within a period of 15 days from the date of issue of Registration Certificate of \nVehicle.\nIn case of Claims/Grievance, Please contact us at: Toll Free No – 180030030000, 18001033009 Email id - chd@shriramgi.com\nFor instant renewal of your insurance policy, Log on to www.shriramgi.com or contact us at our Head office no. - 0141-4828400\nPreInspection Survey: Dented Part : N.A,Broken Part : N.A, Scratched Part : N.A ,Claim not payable for : N.A \nPreinspection Report: Not Applicable\nLimit of Liability :\n Under Section 1(i) in respect of any one accident: as per Motor Vehicles Act, 1988.\n Under Section 1(ii) in respect of any one claim or series of claims arising out of one event is Rs. 750000\n P.A. Cover under Section III for Owner - Driver (CSI) : Rs. 0\nDriver's Clause\nAny person including insured: Provided that a person driving holds an effective driving license at the time of the accident and is not disqualified from \nholding or obtaining such a license.Provided also that the person holding an effective Learner's license may also drive the vehicle when not used for the \ntransport of goods at the time of the accident and that such a person satisfies the requirements of Rule 3 of the Central Motor Vehicles Rules, 1989.\nLimitations as to Use:\nUse Only For Carriage Of Goods Within The Meaning Of The Motor Vehicles Act. The Policy Does Not Cover: 1) Use For Organised Racing, Pace Making, Reliability Trial Or Speed Testing. (2) Use Whilst Drawing A Trailer Except The Towing (Other Than For Reward) Of Any One Disabled \nMechanically Propelled Vehicle. (3) Use For Carrying Passengers In The Vehicles; Except Employees (Other Than The Driver) Not Exceeding The \nNumber Permitted In The Registration Document And Coming Under The Purview Of Workmen'S Compensation Act 1923.\nThe Policy covers use only under a permit within the meaning of the Motor Vehicle Act, 1988 or such a carriage falling under Sub-section 3 of \nSection 66 of the Motor Vehicle's Act 1988 The insurance under this policy is subject to conditions, clauses, warranties, endorsements as per forms \nattached.Warranted that in case of dishonour of premium cheque(s) the Company shall not be liable under the policy and thepolicy shall be void \nabinitio (from inception). I/We hereby certify that the policy to which the certificate relates as well as this certificate of insurance are issued in \naccordance with the provision of Chapter X and Chapter XI of Motor Vehicles Act, 1988. In witness whereof the undersigned being authorised by \nand on behalf of the company has/have herein to set his/their hands at RAIGARH_CH\nMYSGI App QR Code\nPLACE : RAIGARH_CH For and on behalf of\nShriram General Insurance Co.Ltd.\nAuthorized Signatory\n   \nWe will contact you through phone,e-mail, letters, registered AD, sms, etc for renewal before/after the \nexpiry date of your policy. If you do not want us to contact you, kindly send an e-mail for the same on \ndnd@shriramgi.com\nConsolidated Stamp Duty paid vide Inspector General Registration and Stamp, Ajmer Order No. F7-77-\nGen-2026-3237 dated 11-05-2026.\nPolicy Issuing office - E-8, EPIP, RIICO INDUSTRIAL AREA, SITAPURA ,JAIPUR, RAJASTHAN, 302022\nFor Policy Wordings, NEFT/RTGS/IMPS or any other online payment kindly visit our website \n\"www.shriramgi.com\" Validity of policy is subject to KYC verification. \nAll the Amounts mentioned in this policy are in Indian Rupees\nGSTIN No. 22AAKCS2509K1ZD\nNote :- Claim intimation after 48 hours will be\nconsidered as delayed intimation.\n";

describe("Shriram General Insurance Commercial Vehicle Liability Policy Extraction", () => {
  it("extracts companyName, policyNumber, policyType, insuredName, chassisNumber, engineNumber, vehicleNumber, year, and seatingCapacity correctly", () => {
    const result = extractPolicyFromText(shriramCvOcrText, "shriram_cv.pdf");

    expect(result.documentFormat).toBe("SHRIRAM_MOTOR_V1");
    expect(result.documentCategory).toBe("Motor Insurance");
    expect(result.insuranceCompany).toMatch(/SHRIRAM GENERAL INSURANCE COMPANY LIMITED/i);
    expect(result.policyNumber).toBe("209040/31/27/000523");
    expect(result.policyType).toBe("MOTOR COMMERCIAL VEHICLE (LIABILITY ONLY POLICY)");
    expect(result.insuredName).toBe("M/S. MS MAHAKAL TRANSPORTN AND CO");
    expect(result.chassisNumber).toBe("MAT447220F1K24434");
    expect(result.engineNumber).toBe("B591803251K63472202");
    expect(result.registrationNumber).toBe("RJ21GB6122");
    expect(result.vehicleNumber).toBe("RJ21GB6122");
    expect(result.manufacturingYear).toBe("2015");
    expect(result.seatingCapacity).toBe("3");
  });

  it("extracts 214018-31-27-008616_MR. SHUBHAM MEHAR.pdf correctly end-to-end", async () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const pdf = require("pdf-parse");
    const filePath = path.join(process.cwd(), "storage", "214018-31-27-008616_MR. SHUBHAM MEHAR.pdf");
    if (!fs.existsSync(filePath)) return;
    const buf = fs.readFileSync(filePath);
    const parsed = await pdf(buf);
    const result = extractPolicyFromText(parsed.text, "214018-31-27-008616_MR. SHUBHAM MEHAR.pdf");

    expect(result.documentFormat).toBe("SHRIRAM_MOTOR_V1");
    expect(result.documentCategory).toBe("Motor Insurance");
    expect(result.insuranceCompany).toMatch(/SHRIRAM GENERAL INSURANCE COMPANY LIMITED/i);
    expect(result.policyNumber).toBe("214018/31/27/008616");
    expect(result.insuredName).toBe("MR. SHUBHAM MEHAR");
    expect(result.policyStartDate).toBe("22/09/2026");
    expect(result.policyEndDate).toBe("21/09/2027");
    expect(result.vehicleNumber).toBe("MP04YS2764");
    expect(result.registrationNumber).toBe("MP04YS2764");
    expect(result.engineNumber).toBe("K10CN1320620");
    expect(result.chassisNumber).toBe("MA3JMTB1SSHD47945");
    expect(result.makeModel).toBe("MARUTI SUZUKI WAGON R VXI CNG BS 6");
    expect(result.manufacturingYear).toBe("2025");
    expect(result.fuelType).toBe("CNG");
    expect(result.seatingCapacity).toBe("5");
    expect(result.idv).toBe("560000.00");
    expect(result.netPremium).toBe("16742.00");
    expect(result.cgst).toBe("1507.00");
    expect(result.sgst).toBe("1507.00");
    expect(result.gstAmount).toBe("3014.00");
    expect(result.totalPremium).toBe("19756.00");
    expect(result.hypothecation).toBe("AU SMALL FINANCE BANK LTD.");
    expect(result.nomineeName).toBe("RAMSWAROOP MEHAR");
    expect(result.agentName).toBe("SACHIN PARIHAR");
    expect(result.agentCode).toBe("BA0000001226");
    expect(result.agentMobile).toBe("9977019751");
    expect(result.communicationAddress).toBe(
      "H NO 405 LAL TANKI BAAG SEWANIYA HUZUR VILLAGE AHAMADPUR BHOPAL , BAG MUNGALIA , BHOPAL, MADHYA PRADESH - 462043",
    );
    expect(result.pincode).toBe("462043");
  });
});
