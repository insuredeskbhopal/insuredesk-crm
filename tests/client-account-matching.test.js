import { describe, expect, it } from "vitest";
import { matchesClientAccountIdentity } from "../src/lib/client-accounts/utils";

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
});
