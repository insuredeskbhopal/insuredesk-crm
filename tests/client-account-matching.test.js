import { describe, expect, it } from "vitest";
import {
  attachClientIdRequestToMatchingUploads,
  matchesClientAccountIdentity,
} from "../src/lib/client-accounts/utils";

describe("client account auto-matching", () => {
  const abhishek = {
    name: "Abhishek Verma",
    phone: "8839707135",
    email: "abhishek@example.com",
  };

  it("does not match a shared phone number when the insured name differs", () => {
    expect(
      matchesClientAccountIdentity(abhishek, {
        insuredName: "Shashank Garg",
        contactNumber: "8839707135",
      }),
    ).toBe(false);
  });

  it("matches when both the insured name and phone number agree", () => {
    expect(
      matchesClientAccountIdentity(abhishek, {
        insuredName: "ABHISHEK VERMA",
        contactNumber: "8839707135",
      }),
    ).toBe(true);
  });

  it("matches when the insured name and email agree", () => {
    expect(
      matchesClientAccountIdentity(abhishek, {
        insuredName: "Abhishek Verma",
        email: "ABHISHEK@EXAMPLE.COM",
      }),
    ).toBe(true);
  });

  it("does not auto-match from the insured name alone", () => {
    expect(matchesClientAccountIdentity(abhishek, { insuredName: "Abhishek Verma" })).toBe(false);
  });

  it("carries one pending Client ID request across every queued policy for the same client", () => {
    const uploads = [
      ...["health.pdf", "fire.pdf", "marine.pdf", "burglary.pdf"].map((sourceFile, index) => ({
        id: sourceFile,
        sourceFile,
        extractedData: {
          insuredName: index === 0 ? "Mr. Abhishek Verma" : "Abhishek Verma",
          contactNumber: "8839707135",
        },
        manualFields: [],
      })),
      {
        id: "other.pdf",
        sourceFile: "other.pdf",
        extractedData: {
          insuredName: "Abhishek Verma",
          contactNumber: "9000000000",
          email: "abhishek@example.com",
        },
        manualFields: [],
      },
    ];

    const result = attachClientIdRequestToMatchingUploads(uploads, uploads[0], "request-1");

    expect(result.slice(0, 4).every((upload) => upload.extractedData.clientIdRequestId === "request-1")).toBe(
      true,
    );
    expect(result.slice(0, 4).every((upload) => upload.manualFields.includes("clientIdRequestId"))).toBe(
      true,
    );
    expect(result[4].extractedData.clientIdRequestId).toBeUndefined();
  });
});
