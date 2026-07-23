import { describe, expect, it } from "vitest";
import {
  createEmptyClaim,
  formatFileSize,
  getClaimSpecificFields,
  getFilterCounts,
  getMissingFieldsForStep,
  getStatusTone,
  matchesClaimFilter,
} from "../src/app/components/operations/claims/utils";
import { buildClaimPrintHtml } from "../src/app/components/operations/claims/print";

describe("claims management helpers", () => {
  it("creates isolated claim drafts with stable identifier prefixes", () => {
    const first = createEmptyClaim();
    const second = createEmptyClaim();

    expect(first.internalClaimId).toMatch(/^CLM-\d{8}-[A-Z0-9]{5}$/);
    expect(first.customerId).toMatch(/^CUST-\d{8}-[A-Z0-9]{5}$/);
    expect(first.claimDetails).not.toBe(second.claimDetails);
    expect(first.documents).not.toBe(second.documents);
    expect(first.remarks).not.toBe(second.remarks);
  });

  it("keeps required-field validation scoped to the active wizard step", () => {
    expect(getMissingFieldsForStep({}, 0)).toEqual([
      "Insured Name",
      "Mobile Number",
      "Policy Number",
      "Insurance Company",
      "Claim Type",
    ]);
    expect(getMissingFieldsForStep({}, 1)).toEqual(["Claim Number", "Claim Date", "Date of Loss"]);
    expect(getMissingFieldsForStep({}, 2)).toEqual([]);
  });

  it("selects category-specific claim fields with an explicit fallback", () => {
    expect(getClaimSpecificFields("Warehouse / Fire").map((field) => field.key)).toContain("warehouseName");
    expect(getClaimSpecificFields("Unknown")).toEqual(getClaimSpecificFields("Other"));
  });

  it("derives filters, counts, and visual tones from claim status", () => {
    const claims = [
      { claimStatus: "Open" },
      { claimStatus: "Follow Up" },
      { claimStatus: "Open", followUpDate: "2026-07-20" },
      { claimStatus: "Documents Pending" },
      { claimStatus: "Settled" },
      { claimStatus: "Rejected" },
    ];

    expect(getFilterCounts(claims)).toEqual({
      all: 6,
      pending: 4,
      open: 2,
      "follow-up": 2,
      documents: 1,
      settled: 1,
      rejected: 1,
    });
    expect(matchesClaimFilter(claims[2], "follow-up")).toBe(true);
    expect(getStatusTone("Settled")).toBe("tone-green");
    expect(getStatusTone("Unexpected")).toBe("tone-amber");
  });

  it("formats document sizes for display", () => {
    expect(formatFileSize(0)).toBe("0 KB");
    expect(formatFileSize(1024)).toBe("1 KB");
    expect(formatFileSize(1024 * 1024 * 1.5)).toBe("1.5 MB");
  });

  it("escapes claim data before placing it in the printable document", () => {
    const html = buildClaimPrintHtml(
      {
        claimNo: '</title><script>alert("claim")</script>',
        insuredName: "A & B Warehouse",
        claimType: "Warehouse / Fire",
        claimDetails: { warehouseName: "<Main Warehouse>" },
        remarks: [{ id: "1", text: "<img src=x onerror=alert(1)>", createdAt: "2026-07-16" }],
      },
      "https://example.com",
    );

    expect(html).toContain("&lt;/title&gt;&lt;script&gt;alert(&quot;claim&quot;)&lt;/script&gt;");
    expect(html).toContain("A &amp; B Warehouse");
    expect(html).toContain("&lt;Main Warehouse&gt;");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).not.toContain('</title><script>alert("claim")');
  });
});
