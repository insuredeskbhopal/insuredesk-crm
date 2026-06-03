import { describe, expect, it } from "vitest";
import {
  createParserRegistry,
  runParserRegistry,
  toParserContract
} from "../lib/policy-parser-registry.cjs";

describe("policy parser registry", () => {
  it("runs registered parsers in priority order and returns the standard contract", () => {
    const registry = createParserRegistry([
      {
        id: "generic",
        priority: 2,
        detect: () => true,
        extract: () => ({ documentDetected: true, companyName: "Generic", policyNumber: "GEN-1" })
      },
      {
        id: "verified-company",
        priority: 1,
        companyName: "Verified Company",
        detect: (document) => /Verified Insurance/i.test(document.text),
        extract: () => ({ documentDetected: true, policyType: "Motor", policyNumber: "POL-123" })
      }
    ]);

    const selected = runParserRegistry(registry, { text: "Verified Insurance policy" });

    expect(selected.parserId).toBe("verified-company");
    expect(selected.contract).toEqual({
      documentDetected: true,
      companyName: "Verified Company",
      policyType: "Motor",
      fields: {
        policyType: "Motor",
        policyNumber: "POL-123"
      },
      evidence: {},
      confidence: {}
    });
  });

  it("does not select a parser when verified evidence is missing", () => {
    const registry = createParserRegistry([
      {
        id: "tata-aig",
        detect: (document) => /TATA AIG/i.test(document.text),
        extract: () => ({ documentDetected: true, companyName: "TATA AIG" })
      }
    ]);

    const selected = runParserRegistry(registry, { text: "Private Car Package Policy" });

    expect(selected.parserId).toBe("");
    expect(selected.contract.documentDetected).toBe(false);
  });

  it("adapts legacy parser output without dropping extracted fields", () => {
    const contract = toParserContract(
      { companyName: "IFFCO-TOKIO GENERAL INSURANCE CO.LTD", policyType: "Motor Insurance" },
      {
        documentDetected: true,
        policyNumber: "N7470840",
        engineNumber: "K15CN998877"
      }
    );

    expect(contract.documentDetected).toBe(true);
    expect(contract.companyName).toBe("IFFCO-TOKIO GENERAL INSURANCE CO.LTD");
    expect(contract.fields).toMatchObject({
      policyNumber: "N7470840",
      engineNumber: "K15CN998877"
    });
  });
});
