# Local PDF Extraction Check (2026-09-28)

## Scope
- Extracted 1196 PDFs found locally under `storage` and `tests` using the current application extractor.
- This audit used local files only. It did not connect to or query the database and did not change database records.
- Source comparisons check whether extracted values appear in the same PDF text and whether policy titles conflict with extracted insurer/category/cover. A text match is not proof that the correct occurrence was selected.
- Scanned/image-only PDFs, ambiguous layouts, numeric/date context, and fields not supported by searchable text require visual review. Do not treat TEXT CHECKS MATCH as a measured accuracy rate.

## Results
- Total PDFs checked: **1196**
- Conflict flags: **19**
- Needs manual review: **1099**
- Text checks matched: **78**
- PDF parse errors: **0**; extractor errors: **0**; no searchable text: **0**.

## Insurer, Policy Type, and Cover Breakdown
| Insurer | Category | Policy type | Cover | PDFs | Conflict flags | Review | Text checks matched |
|---|---|---|---|---:|---:|---:|---:|
| ICICI Lombard General Insurance Company Limited &#124; Fire Insurance &#124; Warehouse / MSME / Fire & Burglary package &#124; No cover label | 350 | 0 | 350 | 0 |
| The New India Assurance Company Limited &#124; Motor Insurance &#124; Private Car Liability Policy &#124; Third Party | 44 | 0 | 44 | 0 |
| IFFCO Tokio General Insurance Company Limited &#124; Fire Insurance &#124; Flexi Property Protector Policy &#124; No cover label | 42 | 0 | 42 | 0 |
| Tata AIG General Insurance Company Limited &#124; Motor Insurance &#124; Auto Secure - Private Car Package Policy &#124; Comprehensive | 40 | 0 | 3 | 37 |
| The New India Assurance Company Limited &#124; Motor Insurance &#124; Two Wheeler Package Policy &#124; Comprehensive | 40 | 0 | 40 | 0 |
| IFFCO Tokio General Insurance Company Limited &#124; Burglary Insurance &#124; Burglary and House Breaking Insurance Policy &#124; No cover label | 38 | 0 | 38 | 0 |
| ICICI Lombard General Insurance Company Limited &#124; Workmen Compensation &#124; Workmen Compensation Policy &#124; No cover label | 38 | 0 | 38 | 0 |
| IFFCO Tokio General Insurance Company Limited &#124; Motor Insurance &#124; Private Car Package Policy &#124; Comprehensive | 38 | 0 | 38 | 0 |
| IFFCO Tokio General Insurance Company Limited &#124; Warehouse Insurance &#124; Fidelity Guarantee &#124; No cover label | 34 | 0 | 33 | 1 |
| ICICI Lombard General Insurance Company Limited &#124; Motor Insurance &#124; Private Car Package Policy &#124; Comprehensive | 32 | 0 | 32 | 0 |
| ICICI Lombard General Insurance Company Limited &#124; Public Liability &#124; Public Liability Insurance Policy &#124; No cover label | 30 | 0 | 30 | 0 |
| The New India Assurance Company Limited &#124; Motor Insurance &#124; Commercial Vehicle Package Policy &#124; Comprehensive | 26 | 0 | 26 | 0 |
| Tata AIG General Insurance Company Limited &#124; Motor Insurance &#124; motor &#124; Comprehensive | 22 | 0 | 22 | 0 |
| The New India Assurance Company Limited &#124; Motor Insurance &#124; Two Wheeler Liability Only Policy &#124; Third Party | 21 | 0 | 21 | 0 |
| Bajaj Allianz General Insurance Company Limited &#124; Motor Insurance &#124; Private Car Package Policy &#124; Comprehensive | 19 | 0 | 19 | 0 |
| The New India Assurance Company Limited &#124; Motor Insurance &#124; Standalone Motor Own Damage Policy for Two Wheelers - Enhanced Covers &#124; Own Damage | 19 | 0 | 19 | 0 |
| IFFCO Tokio General Insurance Company Limited &#124; Contractors Plant & Machinery &#124; Contractors Plant and Machinery Policy &#124; Third Party | 16 | 0 | 16 | 0 |
| The New India Assurance Company Limited &#124; Motor Insurance &#124; Private Car Package Policy &#124; Comprehensive | 16 | 0 | 16 | 0 |
| Bajaj Allianz General Insurance Company Limited &#124; Fire Insurance &#124; FLEXI COMMERCIAL PROPERTY GUARD &#124; No cover label | 15 | 0 | 15 | 0 |
| HDFC ERGO General Insurance Company Limited &#124; Motor Insurance &#124; Private Car Package &#124; Comprehensive | 15 | 3 | 12 | 0 |
| IFFCO Tokio General Insurance Company Limited &#124; Motor Insurance &#124; Commercial Vehicle Package Policy &#124; Comprehensive | 14 | 3 | 11 | 0 |
| Tata AIG General Insurance Company Limited &#124; Warehouse Insurance &#124; Business Guard Laghu Package Policy &#124; No cover label | 13 | 0 | 1 | 12 |
| ICICI Lombard General Insurance Company Limited &#124; Fire Insurance &#124; Fire Insurance Policy &#124; No cover label | 12 | 0 | 12 | 0 |
| The New India Assurance Company Limited &#124; Motor Insurance &#124; Commercial Vehicle Liability Only Policy &#124; Third Party | 12 | 0 | 12 | 0 |
| Unknown insurer &#124; Unclassified &#124; Unknown type &#124; No cover label | 11 | 0 | 11 | 0 |
| Future Generali India Insurance Company Limited &#124; Motor Insurance &#124; Private Car Package Policy &#124; Comprehensive | 11 | 1 | 0 | 10 |
| The New India Assurance Company Limited &#124; Motor Insurance &#124; Commercial Vehicle PackagePolicy &#124; Comprehensive | 11 | 0 | 11 | 0 |
| Royal Sundaram General Insurance Co. Limited &#124; Motor Insurance &#124; Goods Carrying Vehicle Policy &#124; Comprehensive | 10 | 0 | 10 | 0 |
| Tata AIG General Insurance Company Limited &#124; Warehouse Insurance &#124; Business Guard Sookshma Package Policy &#124; No cover label | 9 | 0 | 8 | 1 |
| HDFC ERGO General Insurance Company Limited &#124; Workmen Compensation &#124; Employees Compensation Insurance Policy &#124; No cover label | 8 | 0 | 8 | 0 |
| ICICI Lombard General Insurance Company Limited &#124; Fire Insurance &#124; Private Car Package Policy &#124; Package | 8 | 0 | 8 | 0 |
| IFFCO Tokio General Insurance Company Limited &#124; Motor Insurance &#124; Two Wheeler Policy &#124; Comprehensive | 8 | 1 | 7 | 0 |
| Bajaj Allianz General Insurance Company Limited &#124; Motor Insurance &#124; Commercial Vehicle Package Policy &#124; Comprehensive | 8 | 0 | 8 | 0 |
| ICICI Lombard General Insurance Company Limited &#124; Fidelity Insurance &#124; Fidelity Guarantee Insurance Policy &#124; No cover label | 7 | 0 | 7 | 0 |
| United India Insurance Company Limited &#124; Burglary Insurance &#124; BURGLARY FIRST LOSS POLICY &#124; No cover label | 7 | 0 | 0 | 7 |
| IFFCO Tokio General Insurance Company Limited &#124; Motor Insurance &#124; Two Wheeler Policy &#124; Stand Alone OD | 7 | 0 | 7 | 0 |
| Royal Sundaram General Insurance Company Limited &#124; Motor Insurance &#124; Goods Carrying Vehicle Policy &#124; Comprehensive | 7 | 0 | 7 | 0 |
| ICICI Lombard General Insurance Company Limited &#124; Motor Insurance &#124; Two Wheeler Insurance Policy &#124; Standalone Own Damage | 7 | 1 | 6 | 0 |
| HDFC ERGO General Insurance Company Limited &#124; Health Insurance &#124; Health Insurance &#124; No cover label | 6 | 0 | 6 | 0 |
| ICICI Lombard General Insurance Company Limited &#124; Motor Insurance &#124; Stand-Alone Own Damage Private Car Insurance Policy &#124; Standalone Own Damage | 6 | 3 | 3 | 0 |
| Tata AIG General Insurance Company Limited &#124; Motor Insurance &#124; Auto Secure - Liability Only Policy &#124; Third Party | 6 | 0 | 6 | 0 |
| ICICI Lombard General Insurance Company Limited &#124; Group Personal Accident &#124; Group Personal Accident Policy &#124; No cover label | 5 | 0 | 5 | 0 |
| United India Insurance Company Limited &#124; Fire Insurance &#124; Standard Fire and Special Perils Policy &#124; No cover label | 5 | 0 | 4 | 1 |
| The New India Assurance Company Limited &#124; Motor Insurance &#124; Commercial Vehicle Package Policy Enhanced Covers &#124; Comprehensive | 5 | 0 | 5 | 0 |
| Tata AIG General Insurance Company Limited &#124; Motor Insurance &#124; Auto Secure - Standalone Own Damage Private Car Policy &#124; Own Damage | 5 | 0 | 5 | 0 |
| United India Insurance Company Limited &#124; Fidelity Insurance &#124; Fidelity Guarantee Insurance Policy &#124; No cover label | 4 | 0 | 4 | 0 |
| The New India Assurance Company Limited &#124; Fire Insurance &#124; Bharat Griha Raksha Home Policy &#124; No cover label | 4 | 0 | 4 | 0 |
| The New India Assurance Company Limited &#124; Fire Insurance &#124; Package Insurance Policy &#124; Package | 4 | 0 | 4 | 0 |
| IFFCO Tokio General Insurance Company Limited &#124; Fire Insurance &#124; Trade Protector Policy &#124; No cover label | 4 | 0 | 4 | 0 |
| ICICI Lombard General Insurance Company Limited &#124; Contractors Plant & Machinery &#124; Contractor's Plant and Machinery Insurance Policy &#124; Package | 4 | 0 | 4 | 0 |
| ICICI Lombard General Insurance Company Limited &#124; Marine Insurance &#124; Marine Cargo Open Insurance Policy &#124; Package | 4 | 0 | 4 | 0 |
| Bajaj Allianz General Insurance Company Limited &#124; Warehouse Insurance &#124; FIDELITY GUARANTEE INSURANCE POLICY &#124; No cover label | 4 | 0 | 4 | 0 |
| Bajaj Allianz General Insurance Company Limited &#124; Fire Insurance &#124; BURGLARY INSURANCE POLICY &#124; No cover label | 4 | 0 | 4 | 0 |
| HDFC ERGO General Insurance Company Limited &#124; Motor Insurance &#124; Standalone Motor Own Damage Cover - Private Car &#124; Own Damage | 4 | 1 | 3 | 0 |
| United India Insurance Company Limited &#124; Warehouse Insurance &#124; UNITED VALUE UDYAM SURAKSHA POLICY &#124; No cover label | 3 | 0 | 0 | 3 |
| The New India Assurance Company Limited &#124; Motor Insurance &#124; Commercial Vehicle Liability OnlyPolicy &#124; Third Party | 3 | 0 | 3 | 0 |
| ICICI Lombard General Insurance Company Limited &#124; Fidelity Insurance &#124; Fidelity Guarantee Insurance Policy &#124; Own Damage | 3 | 3 | 0 | 0 |
| Go Digit General Insurance Limited &#124; Motor Insurance &#124; Digit Two-Wheeler Insurance &#124; Digit Two-Wheeler Insurance | 3 | 0 | 3 | 0 |
| The New India Assurance Company Limited &#124; Motor Insurance &#124; Commercial Vehicle Package Policy ? Enhanced Covers &#124; Comprehensive | 3 | 0 | 3 | 0 |
| Tata AIG General Insurance Company Limited &#124; Motor Insurance &#124; Auto Secure - Commercial Vehicle Package Policy &#124; Comprehensive | 3 | 0 | 3 | 0 |
| SHRIRAM GENERAL INSURANCE COMPANY LIMITED &#124; Motor Insurance &#124; MOTOR COMMERCIAL VEHICLE (PACKAGE POLICY) &#124; Third Party | 2 | 0 | 2 | 0 |
| Bajaj Allianz General Insurance Company Limited &#124; Motor Insurance &#124; Standalone Own Damage Cover for Two-Wheeler &#124; Standalone Own Damage | 2 | 0 | 2 | 0 |
| Bajaj Allianz General Insurance Company Limited &#124; Motor Insurance &#124; Liability Only Policy for Commercial Vehicle &#124; Third Party | 2 | 0 | 2 | 0 |
| United India Insurance Company Limited &#124; Warehouse Insurance &#124; UNITED BHARAT LAGHU UDYAM SURAKSHA POLICY &#124; No cover label | 2 | 0 | 0 | 2 |
| The New India Assurance Company Limited &#124; Motor Insurance &#124; Two Wheeler Enhancement Cover Policy &#124; Third Party | 2 | 0 | 2 | 0 |
| The New India Assurance Company Limited &#124; Motor Insurance &#124; Private Car Package Policy - Enhanced Covers &#124; Comprehensive | 2 | 0 | 2 | 0 |
| Generali Central Insurance Company Limited &#124; Motor Insurance &#124; Private Car Package Policy &#124; Comprehensive | 2 | 2 | 0 | 0 |
| Go Digit General Insurance Limited &#124; Motor Insurance &#124; Digit Private Car Stand-alone Own Damage Policy &#124; Digit Private Car Stand-alone Own Damage Policy | 2 | 0 | 0 | 2 |
| Bajaj Allianz General Insurance Company Limited &#124; Motor Insurance &#124; StandaloneOwnDamageCoverforPrivateCar &#124; No cover label | 2 | 0 | 2 | 0 |
| United India Insurance Company Limited &#124; Motor Insurance &#124; MOTOR INSURANCE - GCV PUBLIC CARRIER OTHER THAN 3 WHEELER LIABILITY ONLY POLICY &#124; Third Party | 2 | 0 | 2 | 0 |
| Liberty General Insurance Limited &#124; Motor Insurance &#124; PRIVATE CAR COMPREHENSIVE POLICY &#124; Comprehensive | 2 | 0 | 0 | 2 |
| Care Health Insurance Limited &#124; Health Insurance &#124; Health Insurance (Individual) &#124; Individual | 1 | 0 | 1 | 0 |
| Tata AIG General Insurance Company Limited &#124; Health Insurance &#124; Health Insurance (Floater) &#124; Floater | 1 | 0 | 1 | 0 |
| Care Health Insurance Limited &#124; Health Insurance &#124; Health Insurance (Floater) &#124; Floater | 1 | 0 | 1 | 0 |
| HDFC ERGO General Insurance Company Limited &#124; Health Insurance &#124; INDIVIDUAL &#124; No cover label | 1 | 0 | 1 | 0 |
| Tata AIG General Insurance Company Limited &#124; Motor Insurance &#124; Standalone Motor Own Damage Cover - Private Car &#124; Standalone Own Damage | 1 | 1 | 0 | 0 |
| Liberty General Insurance Limited &#124; Motor Insurance &#124; Two Wheeler Liability Policy &#124; LIABILITY_ONLY | 1 | 0 | 1 | 0 |
| ICICI Lombard General Insurance Company Limited &#124; Health Insurance &#124; FLOATER &#124; No cover label | 1 | 0 | 1 | 0 |
| Go Digit General Insurance Limited &#124; Motor Insurance &#124; Digit Private Car Policy &#124; Digit Private Car Policy | 1 | 0 | 1 | 0 |
| Go Digit General Insurance Limited &#124; Motor Insurance &#124; Standalone Motor Own Damage Cover - Private Car &#124; Own Damage | 1 | 0 | 1 | 0 |
| Royal Sundaram General Insurance Co. Limited &#124; Motor Insurance &#124; Commercial Vehicle Package Policy &#124; Comprehensive | 1 | 0 | 1 | 0 |
| Tata AIG General Insurance Company Limited &#124; Motor Insurance &#124; Auto Secure - Private Car Policy &#124; Comprehensive | 1 | 0 | 1 | 0 |
| The New India Assurance Company Limited &#124; Motor Insurance &#124; Private Car Liability Policy - Liability only with theft &#124; Third Party | 1 | 0 | 1 | 0 |
| The New India Assurance Company Limited &#124; Motor Insurance &#124; Standalone Motor Own Damage Policy for Two Wheelers &#124; Own Damage | 1 | 0 | 1 | 0 |
| SHRIRAM GENERAL INSURANCE COMPANY LIMITED &#124; Motor Insurance &#124; MOTOR COMMERCIAL VEHICLE (LIABILITY ONLY POLICY) &#124; Third Party | 1 | 0 | 1 | 0 |
| The New India Assurance Company Limited &#124; Motor Insurance &#124; Two Wheeler Package Policy - Enhanced Covers &#124; Comprehensive | 1 | 0 | 1 | 0 |
| IFFCO Tokio General Insurance Company Limited &#124; Workmen Compensation Insurance &#124; Workmen's Compensation Policy &#124; No cover label | 1 | 0 | 1 | 0 |
| IFFCO Tokio General Insurance Company Limited &#124; Warehouse Insurance &#124; FLEXI PROPERTY PROTECTOR &#124; No cover label | 1 | 0 | 1 | 0 |

## Conflict Flags
- **storage/pdf/ANKIT SHINDE_MP09DS4073_2026-27.pdf**: CONFLICT: PDF header identifies Tata AIG General Insurance Company Limited Evidence: WevalueyourrelationshipwithICICILombardGeneralInsuranceCompanyLimitedandthankyouforchoosingusasyourpreferredinsurance || Please find enclosed Policy No. 3001/O/452859230/00/000, The same has been issued based on below mentioned details, provided by you at || Stand-Alone Own Damage Private Car Insurance Policy || 3001/O/452859230/00/000 || 5,16,594.000.000.000.000.000.005,16,594.00 || Total Premium Payable In `7,684.00
- **storage/uploads/2026/08/26bbd564-333f-471c-b4b4-cd1f23d9702a.pdf**: CONFLICT: PDF header identifies The New India Assurance Company Limited CONFLICT: title Standalone OD; extracted Package (OD + TP) Evidence: Policy No. : 45140031261800003144 Document generated by AG_0160399 at 2026/07/08 12:13:38. || Policy Number :45140031261800003144 || Period of cover04/07/2026 12:00:01 AM to 03/07/2027 11:59:59 PM || 165600000165600 || NO.45140031261800003144 || POLICY SCHEDULE CUM CERTIFICATE OF INSURANCE
- **storage/uploads/2026/08/513af9e8-d591-465d-8d86-2c2de96add60.pdf**: CONFLICT: PDF header identifies IFFCO Tokio General Insurance Company Limited Evidence: N7583566 || From: 25/06/2026 00:00:00 || To: Midnight On 24/06/2027 23:59:59 || 124Stand Alone OD59310.00 || 59310.000.000.000.000.0059310.00877.92 || 522.00222.00744.00133.92877.92
- **storage/uploads/2026/08/55eca903-44ef-4a96-b8a1-444f23c246fe.pdf**: CONFLICT: PDF header identifies Generali Central Insurance Company Limited Evidence: Policy No.2302 2087 3756 2800 000 || Year 1From 02/07/2026 To 01/07/20273068500000306850 || From Date & Time02/07/2026 00:01 hrsTo Date & Time01/07/2027 MidnightFrom Date & Time02/07/2026 00:01 hrsTo Date & Time01/07/2027 Midnight || HDFC ERGO General Insurance Company Limited || 2302208737562800000 || HDFC ERGO General Insurance Company Limited.IRDAI Reg No.146.CIN : U66030MH2007PLC177117.
- **storage/uploads/2026/08/5674ecca-13a7-4116-ab0b-e0688492914c.pdf**: CONFLICT: PDF header identifies United India Insurance Company Limited Evidence: Policy No.2302 2086 3029 4800 000 || Year 1From 27/05/2026 To 26/05/2027117842800001178428 || From Date & Time27/05/2026 00:01 hrsTo Date & Time26/05/2027 MidnightFrom Date & Time27/05/2026 00:01 hrsTo Date & Time26/05/2027 Midnight || HDFC ERGO General Insurance Company Limited || 2302208630294800000 || HDFC ERGO General Insurance Company Limited.IRDAI Reg No.146.CIN : U66030MH2007PLC177117.
- **storage/uploads/2026/08/6bbc7d78-8dc2-4c56-b1ad-66c386ea4ee7.pdf**: CONFLICT: title Standalone OD; extracted Package (OD + TP) Evidence: We thank you for choosing Motor Secure insurance policy. Your Policy No. is 132/18/11/0627/MOD/0000422578. Motor Secure policy || https://online.generalicentralinsurance.com/CustomerDeclaration/CustomerCareWeb/index?policyno=132/18/11/0627/MOD/0000422578&Source=BANCSOTH || Policy No. : 132/18/11/0627/MOD/0000422578 || Generali Central Insurance Company Limited (Formerly known as Future Generali India Insurance Company Limited) | Registered Office: Unit No. 801 & 802, 8th Floor, Tower C, Embassy 247 || : Policy Number132/18/11/0627/MOD/0000422578 || Period of Insurance:From 00:00 hours of 22/07/2026 To
- **storage/uploads/2026/08/6e3c0dad-2a00-4074-ad25-496a9c109479.pdf**: CONFLICT: title Liability Only (TP); extracted Standalone OD Evidence: Policy No.6107531887 00 00 || Welcome to TATA AIG family & we thank you for choosing our Policy for your Motor Vehicle Insurance. Your Policy No. 6107531887 00 00 has || Total Policy Premium₹842.00 || For TATA AIG General Insurance Company Limited || 1.6107531887 00 00paymentLinkCustomer8428420 || Issuance of this receipt does not amount to acceptance of the risk by TATA AIG General Insurance Company Limited. The Insurance cover
- **storage/uploads/2026/08/770206de-2ea5-493a-b1d7-cacca115faa7.pdf**: CONFLICT: PDF header identifies IFFCO Tokio General Insurance Company Limited Evidence: N7586819 || From: 27/06/2026 00:00:00 || To: Midnight On 26/06/2027 23:59:59 || 110Stand Alone OD50580.00 || 50580.000.000.000.000.0050580.00574.66 || TP End Date: 26/06/2027 23:59:00
- **storage/uploads/2026/08/776484b2-6426-4eb3-9bf7-9dc1cf547720.pdf**: CONFLICT: PDF header identifies The New India Assurance Company Limited Evidence: Policy No. : 45140031260100003078 Document generated by QR_RENEWAL at 2026/06/29 20:58:59. || Private Car Package Policy || Policy Number :45140031260100003078 || Period of cover30/06/2026 12:00:01 AM to 29/06/2027 11:59:59 PM || 446737000446737 || POLICY SCHEDULE CUM CERTIFICATE OF INSURANCE
- **storage/uploads/2026/08/ANKIT SHINDE_MP09DS4073_2026-27.pdf**: CONFLICT: PDF header identifies Tata AIG General Insurance Company Limited Evidence: WevalueyourrelationshipwithICICILombardGeneralInsuranceCompanyLimitedandthankyouforchoosingusasyourpreferredinsurance || Please find enclosed Policy No. 3001/O/452859230/00/000, The same has been issued based on below mentioned details, provided by you at || Stand-Alone Own Damage Private Car Insurance Policy || 3001/O/452859230/00/000 || 5,16,594.000.000.000.000.000.005,16,594.00 || Total Premium Payable In `7,684.00
- **storage/uploads/2026/08/KEDAR PANWAR_MP07P1734_2026-27.pdf**: CONFLICT: PDF header identifies The New India Assurance Company Limited Evidence: Policy No. : 45140031260100005027 Document generated by QR_RENEWAL at 2026/08/25 16:50:04. || Commercial Vehicle Package Policy || Policy Number :45140031260100005027 || Period of cover25/08/2026 04:50:03 PM to 24/08/2027 11:59:59 PMReceipt Number10000089260800909915 - || 250000000250000 || Date of Issue: 25/08/2026
- **storage/uploads/2026/08/MR_SANJAY_SHRIVASTAVA_MP04CV2880_2026-27.PDF**: CONFLICT: PDF header identifies Generali Central Insurance Company Limited Evidence: Policy No.2302 2088 5654 4600 000 || Year 1From 14/08/2026 To 13/08/20272723830000272383 || From Date & Time14/08/2026 00:01 hrsTo Date & Time13/08/2027 MidnightFrom Date & Time14/08/2026 00:01 hrsTo Date & Time13/08/2027 Midnight || HDFC ERGO General Insurance Company Limited || 2302208856544600000 || HDFC ERGO General Insurance Company Limited.IRDAI Reg No.146.CIN : U66030MH2007PLC177117.
- **storage/uploads/2026/08/SANJEEV SINGHAI_MP04YB2437_2026-27 (1).pdf**: CONFLICT: PDF header identifies IFFCO Tokio General Insurance Company Limited Evidence: WevalueyourrelationshipwithICICILombardGeneralInsuranceCompanyLimitedandthankyouforchoosingusasyourpreferredinsurance || Please find enclosed Policy No. 3001/O/452844409/00/000, The same has been issued based on below mentioned details, provided by you at || Stand-Alone Own Damage Private Car Insurance Policy || 3001/O/452844409/00/000 || 7,41,605.000.000.000.000.000.007,41,605.00 || Total Premium Payable In `11,918.00
- **storage/uploads/2026/08/b12c31d3-ca50-44a8-b3ba-7bcef5142fd2.pdf**: CONFLICT: PDF header identifies The New India Assurance Company Limited Evidence: We thank you for choosing Motor Secure insurance policy. Your Policy No. is 132/02/11/0427/MTP/0000382355. Motor Secure policy || https://online.generalicentralinsurance.com/CustomerDeclaration/CustomerCareWeb/index?policyno=132/02/11/0427/MTP/0000382355&Source=BANCSOTH || Date :30/04/2026 || Policy No. : 132/02/11/0427/MTP/0000382355 || CIS-MOTOR PROTECT PRIVATE CAR PACKAGE POLICYUIN: IRDAN132RPMT0001V06201213 || Generali Central Insurance Company Limited (Formerly known as Future Generali India Insurance Company Limited) | Registered Office: Unit No. 801 & 802, 8th Floor, Tower C, Embassy 247
- **storage/uploads/2026/08/d7ba951f-732b-4bc4-aa9e-86594eccf428.pdf**: CONFLICT: PDF header identifies The New India Assurance Company Limited Evidence: Policy No. : 45140031260300002494 Document generated by QR_RENEWAL at 2026/06/13 11:58:12. || Commercial Vehicle Package Policy Enhanced Covers || Policy Number :45140031260300002494 || Period of cover15/06/2026 12:00:01 AM to 14/06/2027 11:59:59 PMReceipt Number10000089260600502862 - || 16767000001676700 || NIL DEPRECIATION ADD ON COVER UNDER COMMERCIAL VEHICLE PACKAGE POLICY
- **storage/uploads/2026/08/ec5a1585-7141-432f-a705-f28a1dc2cbea.pdf**: CONFLICT: PDF header identifies IFFCO Tokio General Insurance Company Limited Evidence: Policy No.2302 2089 7200 7100 000 || Year 1From 01/10/2026 To 30/09/2027109944400001099444 || From Date & Time01/10/2026 00:01 hrsTo Date & Time30/09/2027 Midnight || HDFC ERGO General Insurance Company Limited || 2302208972007100000 || Standalone Motor Own Damage Cover - Private Car
- **storage/uploads/2026/08/f334fa1c-406d-4d68-a78c-37b2fce7cd22.pdf**: CONFLICT: PDF header identifies IFFCO Tokio General Insurance Company Limited Evidence: WevalueyourrelationshipwithICICILombardGeneralInsuranceCompanyLimitedandthankyouforchoosingusasyourpreferredinsurance || Pleasefindenclosed Policy No. 3005/O/447187032/00/000, The same has been issued based on below mentioned details, provided by you at || Stand-Alone Own Damage Two wheeler Insurance Policy || 3005/O/447187032/00/000 || 73,526.000.000.000.000.000.0073,526.00 || Total Premium Payable In `911.00
- **storage/uploads/2026/09/DEEPAK LOKHANDE_MP04ZN5439_2026-27_POLICY.pdf**: CONFLICT: PDF header identifies IFFCO Tokio General Insurance Company Limited Evidence: N8586996 || 19/09/2026 00:00:00 || To: Midnight On 18/09/2027 23:59:59 || 109Stand Alone OD54000.00 || 54000.000.000.000.000.0054000.00682.04 || 353.00225.00578.00104.04682.04
- **storage/uploads/2026/09/VIJAY KUMAR MISHRA CONSTRUCTION PVT.LTD_MP17DA1282_2026-27.pdf**: CONFLICT: PDF header identifies The New India Assurance Company Limited Evidence: Policy No. : 45140031260100005565 Document generated by AG_0160399 at 2026/09/10 15:11:41. || Commercial Vehicle PackagePolicy || Policy Number :45140031260100005565 || Period of cover09/09/2026 12:00:01 AM to 08/09/2027 11:59:59 PMReceipt Number45140081260000004587 - || 13200000001320000 || POLICY SCHEDULE CUM CERTIFICATE OF INSURANCE

## Full File-by-File Output
- [Local PDF extraction and source-text checks](local-pdf-extraction-check-2026-09-28.csv)
