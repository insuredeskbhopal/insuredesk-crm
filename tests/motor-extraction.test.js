import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { extractPolicyFromText } = require("../lib/pdf-extractor.cjs");

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

  it("matches label-adjacent motor values when table cells are glued to the next label", () => {
    const text = `
      PRIVATE CAR PACKAGE POLICY
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
    expect(result.seatingCapacity).toBe("7");
    expect(result.makeModel).toBe("MAHINDRA/BOLERO NEO");
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
