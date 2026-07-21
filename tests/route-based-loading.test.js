// @vitest-environment node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = (relativePath) =>
  readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");

const linkTags = (relativePath) => source(relativePath).match(/<Link\b[\s\S]*?>/g) || [];

describe("route-based loading", () => {
  it.each([
    "src/app/components/layout/SideNav.tsx",
    "src/app/components/layout/TopBar.tsx",
    "src/app/components/reports/ReportingCenter.js",
    "src/app/(dashboard)/dashboard/renewals/layout.js",
    "src/app/(dashboard)/operations/page.js",
  ])("does not prefetch linked feature bundles from %s", (relativePath) => {
    const links = linkTags(relativePath);

    expect(links.length).toBeGreaterThan(0);
    expect(links.every((tag) => tag.includes("prefetch={false}"))).toBe(true);
  });

  it("keeps the shared dashboard layout free of feature-page imports", () => {
    const layout = source("src/app/(dashboard)/layout.js");

    expect(layout).not.toMatch(/components\/(reports|operations|users|policies|customers|renewals)/);
    expect(layout).not.toMatch(/\/(policy-records|customer-management|renewals|reports|settings)\/page/);
  });

  it.each([
    "src/app/(dashboard)/dashboard/reports/page.js",
    "src/app/(dashboard)/field-setup/page.js",
    "src/app/(dashboard)/settings/page.js",
  ])("keeps %s independent from the legacy dashboard bundle", (relativePath) => {
    expect(source(relativePath)).not.toContain("@/app/ui/dashboard");
  });

  it("loads customer detail and form-only components on demand", () => {
    const dashboard = source("src/app/ui/dashboard.js");

    for (const component of ["ClientProfile", "PolicyDetail", "PolicyDetailCard", "PreviewField"]) {
      expect(dashboard).toContain(`const ${component} = dynamic(`);
      expect(dashboard).not.toMatch(new RegExp(`import ${component} from`));
    }
  });

  it("does not load policy rows for the dashboard summary route", () => {
    const dashboardPage = source("src/app/(dashboard)/dashboard/page.js");
    const dashboardClient = source("src/app/ui/dashboard.js");
    const headerRoute = source("src/app/api/dashboard/header-data/route.js");

    expect(dashboardPage).not.toContain("loadScopedPolicyRecords");
    expect(dashboardPage).toContain("initialRecords={[]}");
    expect(dashboardClient).toContain("/api/dashboard/header-data?summaryOnly=true");
    expect(headerRoute).toContain("if (summaryOnly)");
    expect(headerRoute).toContain("Response.json({ renewalCounts, success: true })");
  });

  it("lets internal brand links opt out of route prefetching", () => {
    const brandLogo = source("src/app/components/brand/BrandLogo.js");

    expect(brandLogo).toContain("prefetch={prefetch}");
  });
});
