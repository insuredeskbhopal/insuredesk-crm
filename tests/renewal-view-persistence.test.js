// @vitest-environment node
import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("Renewal policies viewMode persistence", () => {
  const pagePath = path.resolve(__dirname, "../src/app/(dashboard)/dashboard/renewals/policies/page.js");
  const pageContent = fs.readFileSync(pagePath, "utf-8");

  it("defines VIEW_MODE_STORAGE_KEY", () => {
    expect(pageContent).toContain('const VIEW_MODE_STORAGE_KEY = "rn_renewal_view_mode";');
  });

  it("checks both URLSearchParams and localStorage on mount", () => {
    expect(pageContent).toContain('const requestedView = params.get("view");');
    expect(pageContent).toContain("window.localStorage.getItem(VIEW_MODE_STORAGE_KEY)");
  });

  it("saves viewMode to localStorage on mode change", () => {
    expect(pageContent).toContain("window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);");
  });

  it("includes viewMode in syncUrl without skipping 'policy'", () => {
    expect(pageContent).toContain('if (next.viewMode) params.set("view", next.viewMode);');
    expect(pageContent).not.toContain('next.viewMode !== "policy"');
  });

  it("preserves viewMode in clearFilters", () => {
    expect(pageContent).toContain("syncUrl({ query: \"\", policyType: \"All\", company: \"All\", renewalMonth: \"All\", page: 1, viewMode });");
  });

  it("ensures viewMode is present in returnTo when opening customer profile", () => {
    expect(pageContent).toContain('if (viewMode && !currentSearchParams.has("view"))');
    expect(pageContent).toContain('currentSearchParams.set("view", viewMode);');
  });
});
