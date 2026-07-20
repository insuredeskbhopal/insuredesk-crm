import { describe, expect, it } from "vitest";
import {
  buildRenewalWhatsAppMessage,
  isRenewalAgentId,
  normalizeRenewalAgentName,
  normalizeRenewalContactName,
  RENEWAL_WHATSAPP_CUSTOM_FIELDS,
  selectRenewalWhatsAppPolicies,
} from "../src/lib/renewals/whatsapp-message";

describe("renewal WhatsApp message", () => {
  it("never exposes an internal UUID in the client greeting", () => {
    const userId = "30f1e9c6-7b55-4b49-a1c6-748a42df0fd8";

    expect(isRenewalAgentId(userId)).toBe(true);
    expect(normalizeRenewalAgentName(userId, "Anand Soni")).toBe("Anand Soni");
    expect(normalizeRenewalAgentName("Amit Sharma", "Anand Soni")).toBe("Amit Sharma");
    expect(normalizeRenewalContactName(userId, "")).toBe("");
    expect(
      buildRenewalWhatsAppMessage({
        recipientName: userId,
        customerName: "Customer",
        policies: [{ policyNumber: "N4116778" }],
      }),
    ).toContain("Dear Valued Customer,");
  });

  it("keeps an explicitly selected policy isolated from other policies on the same phone", () => {
    const policies = [
      { id: "policy-1", policyNumber: "N4116778" },
      { id: "policy-2", policyNumber: "N/A" },
      { id: "policy-3", policyNumber: "45140031250100004604" },
    ];

    expect(
      selectRenewalWhatsAppPolicies({
        policyId: "policy-1",
        primaryPolicy: policies[0],
        duePolicies: policies,
        policies,
      }),
    ).toEqual([policies[0]]);
  });

  it("uses an extracted policyholder name without requiring a manual contact save", () => {
    const message = buildRenewalWhatsAppMessage({
      customerName: "Rahul Sharma",
      policies: [{ policyNumber: "POL-100", insuredName: "Rahul Sharma" }],
    });

    expect(message).toContain("Dear Rahul Sharma,");
    expect(message).not.toContain("Dear Valued Customer,");
  });

  it("exposes the requested custom-field catalog", () => {
    expect(RENEWAL_WHATSAPP_CUSTOM_FIELDS).toEqual([
      { label: "Contact Person Name", placeholder: "{ContactPersonName}", example: "Amit Sharma" },
      { label: "Customer Name", placeholder: "{CustomerName}", example: "BHAIJILAL CHOUHAN" },
      { label: "Insurance Company", placeholder: "{InsuranceCompany}", example: "IFFCO Tokio" },
      { label: "Policy Number", placeholder: "{PolicyNumber}", example: "N4116778" },
      { label: "Vehicle Make", placeholder: "{VehicleMake}", example: "MG" },
      { label: "Vehicle Model", placeholder: "{VehicleModel}", example: "H Savvy" },
      { label: "Registration Number", placeholder: "{RegistrationNumber}", example: "MP04ZL6963" },
      { label: "Expiry Date", placeholder: "{ExpiryDate}", example: "2026-08-01" },
      { label: "Days Remaining", placeholder: "{DaysLeft}", example: "12" },
    ]);
  });

  it("uses the requested renewal format with make/model, vehicle number, and ISO expiry", () => {
    expect(
      buildRenewalWhatsAppMessage({
        recipientName: "Amit Sharma",
        customerName: "BHAIJILAL CHOUHAN",
        referenceDate: new Date("2026-07-20T00:00:00+05:30"),
        policies: [
          {
            makeModel: "BAJAJ AUTO,CHETAK",
            vehicleNumber: "MP04NU6016",
            expiryDate: "2026-07-22",
            insuranceCompany: "IFFCO Tokio",
            policyNumber: "N4116778",
          },
        ],
      }),
    ).toBe(
      `Dear Amit Sharma,

The Motor Insurance Policy for *BHAIJILAL CHOUHAN* with *IFFCO Tokio* is scheduled to expire soon.

*Policy Number:* N4116778
*Vehicle:* BAJAJ AUTO CHETAK
*Registration No.:* MP04NU6016
*Expiry Date:* 2026-07-22
*Days Remaining:* 2 days

Please connect with us in advance to ensure a smooth renewal, avoid any interruption in coverage, and explore the best renewal options available.

Phone: +91 88188 89660
Website: www.bimaheadquarter.com

*Team BimaHeadquarter by InsureDesk IMF Pvt. Ltd.*
_Your Trusted Insurance Partner_`,
    );
  });

  it("falls back to separate make/model and registration fields", () => {
    const message = buildRenewalWhatsAppMessage({
      customerName: "ANAND SONI",
      referenceDate: new Date("2026-07-20T00:00:00+05:30"),
      policies: [
        {
          vehicleMake: "HONDA",
          vehicleModel: "CITY",
          registrationNumber: "MP04AB1234",
          expiryDate: "22-Jul-2026",
        },
      ],
    });

    expect(message).toContain("*Vehicle:* HONDA CITY");
    expect(message).toContain("*Registration No.:* MP04AB1234");
  });

  it("includes every due vehicle in a combined customer reminder", () => {
    const message = buildRenewalWhatsAppMessage({
      customerName: "CUSTOMER",
      referenceDate: new Date("2026-07-20T00:00:00+05:30"),
      policies: [
        { makeModel: "HONDA CITY", vehicleNumber: "MP04AA1111", expiryDate: "2026-08-01" },
        { makeModel: "TVS JUPITER", vehicleNumber: "MP04BB2222", expiryDate: "2026-08-02" },
      ],
    });

    expect(message).toContain("*Vehicle:* HONDA CITY");
    expect(message).toContain("*Registration No.:* MP04AA1111");
    expect(message).toContain("*Vehicle:* TVS JUPITER");
    expect(message).toContain("*Registration No.:* MP04BB2222");
    expect(message.match(/Please connect with us in advance/g)).toHaveLength(1);
  });
});
