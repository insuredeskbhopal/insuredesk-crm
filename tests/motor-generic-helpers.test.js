/* @vitest-environment node */
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");

describe("generic motor helper extraction", () => {
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

  it("extracts policy periods across common insurer wordings", () => {
    const cases = [
      {
        text: "Private Car Policy\nPolicy No. ABC12345\nPeriod of cover 11/05/2026 to 10/05/2027",
        startDate: "11/05/2026",
        expiryDate: "10/05/2027",
      },
      {
        text: "Private Car Policy\nPolicy No. ABC12345\nPeriod of Insurance From: 00:00 hours of 18/05/2026 To Midnight of 17/05/2027",
        startDate: "18/05/2026",
        expiryDate: "17/05/2027",
      },
      {
        text: "Private Car Policy\nPolicy No. ABC12345\nFrom: 00:00 Hours of 26/05/2026 To: Midnight On 25/05/2027",
        startDate: "26/05/2026",
        expiryDate: "25/05/2027",
      },
      {
        text: "Private Car Policy\nPolicy No. ABC12345\nPolicy effective from 0001 hrs 21/05/2026\nTo MidNight 20/05/2027",
        startDate: "21/05/2026",
        expiryDate: "20/05/2027",
      },
      {
        text: "Private Car Policy\nPolicy No. ABC12345\nStart Date: 09/05/2026\nEnd Date: 08/05/2027",
        startDate: "09/05/2026",
        expiryDate: "08/05/2027",
      },
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
  });
});
