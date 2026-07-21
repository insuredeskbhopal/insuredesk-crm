import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("production API pagination limits", () => {
  it.each([
    "src/app/api/records/route.js",
    "src/app/api/customer-profiles/route.js",
  ])("caps %s list responses at 100 records", (file) => {
    const source = read(file);
    expect(source).toContain("Math.min(100, Math.max(1,");
    expect(source).toMatch(/take:\s*limit/);
  });
});
