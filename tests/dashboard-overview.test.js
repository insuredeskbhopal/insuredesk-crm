import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("management dashboard overview", () => {
  it("uses aggregate queries instead of loading policy tables", () => {
    const route = source("src/app/api/dashboard/overview/route.js");

    expect(route).toContain("COUNT(*) FILTER");
    expect(route).toContain("COUNT(DISTINCT customer_name)");
    expect(route).toContain("uploadedFile.groupBy");
    expect(route).not.toContain("policyRecord.findMany");
    expect(route).not.toMatch(/SELECT\s+\*/i);
  });

  it("keeps tenant filters on dashboard policies and uploads", () => {
    const route = source("src/app/api/dashboard/overview/route.js");

    expect(route).toContain("organization_id IS NOT DISTINCT FROM $2::uuid");
    expect(route).toContain('getTenantFilter(session, "read")');
  });

  it("renders operational metrics and keeps PDF ingestion on Bulk Upload only", () => {
    const dashboard = source("src/app/ui/dashboard.js");
    const overview = source("src/app/components/dashboard/DashboardOverview.js");

    expect(dashboard).toContain('activePage === "dashboard" ? <DashboardOverview />');
    expect(dashboard).toContain('activePage === "bulk-entry" && currentUserRole !== "VIEWER"');
    expect(dashboard).not.toContain('(activePage === "bulk-entry" || activePage === "dashboard") && currentUserRole');

    for (const label of [
      "Active Policies",
      "Total Customers",
      "Policies approaching expiry",
      "Pending",
      "Follow-ups Today",
      "Overdue",
      "PDF Reviews",
      "Failed",
      "Claim workload",
      "Customer acquisition pipeline",
      "Lead generation by agent",
    ]) {
      expect(overview).toContain(label);
    }
  });

  it("sanitizes historical upload errors before displaying dashboard notifications", () => {
    const headerRoute = source("src/app/api/dashboard/header-data/route.js");

    expect(headerRoute).toContain("getUserFacingErrorMessage");
    expect(headerRoute).toContain("safeErrorMessage");
    expect(headerRoute).not.toContain('${u.errorMessage || "Unknown error"}');
  });

  it("uses a grouped dashboard hierarchy instead of a flat metric wall", () => {
    const styles = source("src/app/ui/dashboard.css");
    const overview = source("src/app/components/dashboard/DashboardOverview.js");

    expect(styles).toContain(".dashboard-command-grid");
    expect(styles).toContain(".dashboard-renewal-window");
    expect(styles).toContain(".dashboard-status-grid");
    expect(styles).toContain(".dashboard-summary-link-grid.four");
    expect(styles).not.toContain(".dashboard-metric-grid.secondary");
    expect(overview).toContain("Renewal pipeline");
    expect(overview).toContain("Work queue");
    expect(overview).toContain("Policies approaching expiry");
    expect(overview).toContain("Renewal outcomes");
    expect(overview).toContain("Claims distribution");
    expect(overview).toContain("Lead pipeline");
    expect(styles).toContain(".dashboard-chart-grid");
    expect(styles).toContain(".dashboard-vertical-chart");
    expect(styles).toContain(".dashboard-line-chart");
    expect(overview).not.toContain("Urgent work");
    expect(overview).not.toContain("Important alerts");
    expect(overview).not.toContain("Nearest policy expiries");
    expect(overview).not.toContain("Recent upload activity");
    expect(overview).not.toContain("Agent performance");
    expect(overview).not.toContain("Recent system activity");
  });

  it("uses destination APIs as the authoritative renewal and follow-up count source", () => {
    const overview = source("src/app/components/dashboard/DashboardOverview.js");
    const renewalsRoute = source("src/app/api/renewals/policies/route.js");

    expect(overview).toContain('/api/renewals/policies?summaryOnly=true&tab=renewed');
    expect(overview).toContain('/api/renewals/follow-ups?filter=today&page=1&limit=1');
    expect(renewalsRoute).toContain("AS pending");
    expect(renewalsRoute).toContain("pending: Number(row.pending)");
    expect(overview).toContain('/api/claims?summaryOnly=true');
    expect(overview).toContain('/api/customer-profiles?summaryOnly=true');
  });

  it("routes every operational metric to a URL-backed database filter", () => {
    const overview = source("src/app/components/dashboard/DashboardOverview.js");
    const policyPage = source("src/app/(dashboard)/policy-records/page.js");
    const renewalPage = source("src/app/(dashboard)/dashboard/renewals/policies/page.js");
    const followUpPage = source("src/app/(dashboard)/dashboard/renewals/follow-ups/page.js");
    const uploadPage = source("src/app/(dashboard)/upload-history/page.js");

    for (const href of [
      "/policy-records?lifecycle=active",
      "/customer-management?scope=active-policyholders",
      "/dashboard/renewals/policies?tab=due_today",
      "/dashboard/renewals/policies?tab=due_7",
      "/dashboard/renewals/policies?tab=due_30",
      "/dashboard/renewals/policies?tab=all",
      "/dashboard/renewals/follow-ups?filter=today",
      "/dashboard/renewals/follow-ups?filter=overdue",
      "/upload-history?status=REVIEW_REQUIRED",
      "/upload-history?status=FAILED",
      "/operations/claims-management?filter=pending",
      "/operations/claims-management?filter=follow-up",
      "/operations/claims-management?filter=documents",
      "/operations/claims-management?filter=settled",
      "/operations/claims-management?filter=rejected",
      "/operations/lead-generation?status=New%20Lead",
      "/operations/lead-generation?status=Follow-up%20Required",
      "/operations/lead-generation?status=Interested",
      "/operations/lead-generation?status=Converted",
      "/operations/lead-generation?status=Lost",
    ]) {
      expect(overview).toContain(href);
    }

    expect(policyPage).toContain("searchParams.lifecycle");
    expect(renewalPage).toContain("params.get(\"tab\")");
    expect(followUpPage).toContain('searchParams.get("filter")');
    expect(uploadPage).toContain("searchParams.status");
  });

  it("provides a Super Admin lead-generation report grouped by creator", () => {
    const overviewRoute = source("src/app/api/dashboard/overview/route.js");
    const report = source("src/lib/reports/lead-generation.js");
    const reportPage = source("src/app/(dashboard)/dashboard/reports/lead-generation/page.js");

    expect(overviewRoute).toContain('session.role === "SUPER_ADMIN"');
    expect(report).toContain("GROUP BY cp.created_by_id, u.name, u.email");
    expect(report).toContain("LIMIT $5::integer OFFSET $6::integer");
    expect(report).toContain("cp.deleted_at IS NULL");
    expect(report).toContain("cp.created_by_id IS NOT NULL");
    expect(reportPage).toContain("Lead generation by agent");
    expect(reportPage).toContain('session.role !== "SUPER_ADMIN"');
    expect(reportPage).toContain("createdById=");
  });

  it("filters dashboard destinations before pagination and removes the historic hardcoded exception", () => {
    const records = source("src/lib/records/scoped-data.js");
    const premium = source("src/lib/dashboard/premium-data.js");
    const header = source("src/app/api/dashboard/header-data/route.js");

    expect(records).toContain('lifecycle === "active"');
    expect(records).toContain("where.status = status");
    expect(premium).toContain("LIMIT $10::integer OFFSET $11::integer");
    expect(premium).toContain("COUNT(*)::integer AS count");
    expect(header).not.toContain("45140031260200003089");
  });
});
