// @vitest-environment node

import fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, sessionMock } = vi.hoisted(() => ({
  sessionMock: vi.fn(),
  prismaMock: {
    policyRecord: { findMany: vi.fn(), count: vi.fn() },
    claim: { findMany: vi.fn(), count: vi.fn() },
    endorsement: { findMany: vi.fn(), count: vi.fn() },
    customerProfile: { findMany: vi.fn(), count: vi.fn() },
    uploadedFile: { findMany: vi.fn(), count: vi.fn() },
    user: { findMany: vi.fn() },
    auditLog: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/records/scoped-data", () => ({
  getCurrentSessionFromCookies: sessionMock,
}));

import {
  getReportQueryPlan,
  loadReportingCenterData,
} from "../src/app/lib/reporting/business-intelligence.js";

const allCalls = () =>
  Object.values(prismaMock).reduce(
    (total, model) =>
      total + Object.values(model).reduce((modelTotal, method) => modelTotal + method.mock.calls.length, 0),
    0,
  );

describe("business intelligence category query plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMock.mockResolvedValue({
      role: "AGENT",
      userId: "user-1",
      organizationId: "org-1",
    });
    Object.values(prismaMock).forEach((model) => {
      Object.values(model).forEach((method) => method.mockResolvedValue([]));
    });
    for (const model of ["policyRecord", "claim", "endorsement", "customerProfile", "uploadedFile"]) {
      prismaMock[model].count.mockResolvedValue(0);
    }
  });

  it("hydrates detail fields only for the selected report domains", () => {
    expect(getReportQueryPlan("claims")).toMatchObject({
      policies: "none",
      claims: "detail",
      endorsements: "none",
      profiles: "none",
      uploads: "none",
      audits: false,
    });
    expect(getReportQueryPlan("team")).toMatchObject({
      policies: "detail",
      claims: "detail",
      endorsements: "detail",
      profiles: "detail",
      uploads: "summary",
      audits: false,
    });
    expect(getReportQueryPlan("documents")).toMatchObject({
      policies: "summary",
      claims: "none",
      endorsements: "none",
      profiles: "none",
      uploads: "detail",
      audits: false,
    });
    expect(getReportQueryPlan("monthly-policies")).toMatchObject({
      policies: "detail",
      claims: "none",
      endorsements: "none",
      profiles: "none",
      uploads: "none",
      audits: false,
    });
  });

  it("loads the selected month with policy-type filtering and monthly report visuals", async () => {
    prismaMock.policyRecord.findMany.mockImplementation(async (query) =>
      query.distinct ? [{ selectedPolicyType: "Motor Policy" }] : [],
    );

    const data = await loadReportingCenterData({
      category: "monthly-policies",
      searchParams: { month: "2026-07", policyType: "Motor" },
    });

    expect(allCalls()).toBe(4);
    expect(prismaMock.policyRecord.findMany.mock.calls[0][0].where).toEqual(
      expect.objectContaining({
        organizationId: "org-1",
        deletedAt: null,
        savedAt: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }),
        AND: expect.any(Array),
      }),
    );
    expect(data.dateRange.start.getFullYear()).toBe(2026);
    expect(data.dateRange.start.getMonth()).toBe(6);
    expect(data.report.filterOptions.policyTypes).toContain("Motor Policy");
    expect(data.report.actions).toEqual([]);
    expect(data.report.charts.map((chart) => chart.type)).toEqual(["bar", "line"]);
    expect(data.report.tables.map((table) => table.title)).toEqual([
      "Insurance Company Summary",
      "Monthly Policy Records",
    ]);
  });

  it("loads a claims report without querying unrelated datasets", async () => {
    const data = await loadReportingCenterData({ category: "claims" });

    expect(allCalls()).toBe(3);
    expect(prismaMock.claim.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ organizationId: "org-1", deletedAt: null }),
    });
    for (const model of ["policyRecord", "endorsement", "customerProfile", "uploadedFile"]) {
      expect(prismaMock[model].count).not.toHaveBeenCalled();
    }
    expect(prismaMock.auditLog.findMany).not.toHaveBeenCalled();
    expect(prismaMock.policyRecord.findMany).not.toHaveBeenCalled();
    expect(prismaMock.endorsement.findMany).not.toHaveBeenCalled();
    expect(prismaMock.customerProfile.findMany).not.toHaveBeenCalled();
    expect(prismaMock.uploadedFile.findMany).not.toHaveBeenCalled();
    expect(prismaMock.claim.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1", deletedAt: null }),
        select: expect.objectContaining({ claimNo: true, insuredName: true, createdBy: expect.any(Object) }),
      }),
    );
    expect(prismaMock.user.findMany).toHaveBeenCalledTimes(1);
    expect(data.report.actions.map(([label]) => label)).toEqual(["Pending Claims", "Delayed Claims"]);
    expect(data).not.toHaveProperty("modules");
  });

  it("skips unrelated row scans for a policy report", async () => {
    const data = await loadReportingCenterData({ category: "policies" });

    expect(allCalls()).toBe(3);
    expect(prismaMock.policyRecord.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.policyRecord.count).toHaveBeenCalledTimes(1);
    expect(prismaMock.claim.findMany).not.toHaveBeenCalled();
    expect(prismaMock.endorsement.findMany).not.toHaveBeenCalled();
    expect(prismaMock.customerProfile.findMany).not.toHaveBeenCalled();
    expect(prismaMock.uploadedFile.findMany).not.toHaveBeenCalled();
    expect(prismaMock.claim.count).not.toHaveBeenCalled();
    expect(prismaMock.endorsement.count).not.toHaveBeenCalled();
    expect(prismaMock.customerProfile.count).not.toHaveBeenCalled();
    expect(prismaMock.uploadedFile.count).not.toHaveBeenCalled();
    expect(data.report.actions.map(([label]) => label)).toEqual([
      "Renewals Due Today",
      "Renewals Due This Week",
      "Overdue Renewals",
      "Missing PDFs",
    ]);
  });

  it("keeps exact visible executive totals without loading audit rows", async () => {
    await loadReportingCenterData({ category: "executive" });

    expect(allCalls()).toBe(11);
    expect(prismaMock.policyRecord.count).toHaveBeenCalledTimes(1);
    expect(prismaMock.endorsement.count).toHaveBeenCalledTimes(1);
    expect(prismaMock.auditLog.findMany).not.toHaveBeenCalled();
    expect(prismaMock.endorsement.findMany.mock.calls[0][0].select).toEqual({
      status: true,
      createdAt: true,
    });
  });

  it("runs no domain data or count query for the unconfigured service report", async () => {
    const data = await loadReportingCenterData({ category: "service-requests" });

    expect(allCalls()).toBe(1);
    for (const model of ["policyRecord", "claim", "endorsement", "customerProfile", "uploadedFile"]) {
      expect(prismaMock[model].findMany).not.toHaveBeenCalled();
      expect(prismaMock[model].count).not.toHaveBeenCalled();
    }
    expect(data.report.actions).toEqual([["Pending Service Requests", 0]]);
  });

  it("loads audit and upload detail fields only for operations", async () => {
    await loadReportingCenterData({ category: "operations" });

    expect(allCalls()).toBe(12);
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1" }),
        select: expect.objectContaining({ action: true, createdAt: true, user: expect.any(Object) }),
      }),
    );
    expect(prismaMock.uploadedFile.findMany.mock.calls[0][0].select).toMatchObject({
      sourceFile: true,
      detectedCompanyName: true,
    });
    expect(prismaMock.claim.findMany.mock.calls[0][0].select).toEqual({
      claimStatus: true,
      followUpDate: true,
    });
  });

  it("uses an explicit null tenant for non-super users with no organization", async () => {
    sessionMock.mockResolvedValue({ role: "AGENT", userId: "user-1" });

    await loadReportingCenterData({ category: "operations" });

    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: null }) }),
    );
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: null }) }),
    );
  });

  it("labels the filtered action strip as category scoped", () => {
    const component = fs.readFileSync("src/app/components/reports/ReportingCenter.js", "utf8");

    expect(component).toContain("Category Action Center");
    expect(component).toContain("Actions for this report");
    expect(component).not.toContain("Management Action Center");
  });

  it("renders dedicated monthly selectors and a true line chart", () => {
    const component = fs.readFileSync("src/app/components/reports/ReportingCenter.js", "utf8");
    const reporting = fs.readFileSync("src/app/lib/reporting/business-intelligence.js", "utf8");

    expect(reporting).toContain('title: "Monthly Policy Report"');
    expect(component).toContain('type="month"');
    expect(component).toContain("All Policy Types");
    expect(component).toContain("function LineChartCard");
    expect(component).toContain("<polyline");
  });
});
