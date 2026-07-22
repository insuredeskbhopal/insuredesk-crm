import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("warehouse-centric policy record table", () => {
  it("uses an explicit Warehouse/Fire column set independent of schema inference", () => {
    const dashboard = read("src/app/ui/dashboard.js");

    expect(dashboard).toContain("const WAREHOUSE_RECORD_COLUMNS = [");
    expect(dashboard).toContain('recordViewCategory === "warehouse" || recordViewCategory === "fire"');
    expect(dashboard).toContain("return WAREHOUSE_RECORD_COLUMNS");
    for (const field of [
      "policyNumber",
      "contactPerson",
      "contactNumber",
      "whatsappGroupName",
      "newOrRenewal",
      "policyType",
      "insuranceCompany",
      "riskLocation",
      "district",
      "tehsil",
      "occupancy",
      "description",
      "sumInsured",
      "buildingSumInsured",
      "stockSumInsured",
      "contentsSumInsured",
      "burglarySumInsured",
      "fidelitySumInsured",
      "totalPremium",
      "startDate",
      "expiryDate",
      "pptMpwlc",
      "validIn",
    ]) {
      expect(dashboard).toContain(`key: "${field}"`);
    }
  });

  it("normalizes warehouse coverage amounts without changing extractor code", () => {
    const records = read("src/lib/records/index.js");
    expect(records).toContain("buildingSumInsured: payload.buildingSumInsured");
    expect(records).toContain("stockSumInsured: payload.stockSumInsured");
  });

  it("supports warehouse fallback values and Indian money formatting in the shared table", () => {
    const table = read("src/app/components/RecordsTable.js");

    expect(table).toContain("column.fallbackKeys || []");
    expect(table).toContain('column.format === "money"');
    expect(table).toContain('new Intl.NumberFormat("en-IN"');
    expect(table).toContain("columns.reduce(");
    expect(table).toContain("COLUMN_WIDTHS[column.className");
  });

  it("keeps long warehouse fields compact and opens the full value on demand", () => {
    const dashboard = read("src/app/ui/dashboard.js");
    const table = read("src/app/components/RecordsTable.js");

    expect(dashboard.match(/compact: true/g)).toHaveLength(3);
    expect(table).toContain('className="record-compact-text"');
    expect(table).toContain("See more");
    expect(table).toContain("<ModalPortal>");
  });

  it("does not modify Motor extraction or schema code", () => {
    const stagedFiles = ["src/app/ui/dashboard.js", "src/app/components/RecordsTable.js"];
    expect(stagedFiles.some((file) => /motor\.cjs|training.*motor|motor.*schema/i.test(file))).toBe(false);
  });
});
