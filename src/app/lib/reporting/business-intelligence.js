import { normalizeRecord } from "@/lib/records";
import { prisma } from "@/lib/db/prisma";
import { getCustomerProfileScopedFilter, getTenantFilter } from "@/lib/auth/rbac";
import { getCurrentSessionFromCookies } from "@/lib/records/scoped-data";
import { withoutManualRenewalSources } from "@/lib/records/manual-renewal-source";
import { parseMoney } from "@/app/lib/reporting/totals";
import { parsePolicyDate, startOfDay } from "@/app/lib/reporting/filters";

export const REPORT_CATEGORIES = [
  {
    id: "executive",
    title: "Executive Dashboard",
    description: "Management KPIs, action center, trends, top performers, and business health scoring.",
    phase: "Phase 1",
    href: "/dashboard/reports/executive",
  },
  {
    id: "policies",
    title: "Policy Intelligence",
    description: "Policy volume, premium, sum insured, insurer mix, policy type mix, and portfolio quality.",
    phase: "Phase 1",
    href: "/dashboard/reports/policies",
  },
  {
    id: "monthly-policies",
    title: "Monthly Policy Report",
    description: "Choose a month and policy type to review insurer-wise business, policy records, and trends.",
    phase: "Phase 1",
    href: "/dashboard/reports/monthly-policies",
  },
  {
    id: "customers",
    title: "Customer Intelligence",
    description: "Customer base, new customers, repeat customers, retention signals, and portfolio value.",
    phase: "Phase 2",
    href: "/dashboard/reports/customers",
  },
  {
    id: "renewals",
    title: "Renewal Intelligence",
    description: "Due, overdue, renewed, lost, conversion ratio, and renewal performance reports.",
    phase: "Phase 1",
    href: "/dashboard/reports/renewals",
  },
  {
    id: "claims",
    title: "Claims Intelligence",
    description: "Open, pending, settled, rejected, delayed, and claim handling performance.",
    phase: "Phase 2",
    href: "/dashboard/reports/claims",
  },
  {
    id: "endorsements",
    title: "Endorsement Intelligence",
    description: "Created, pending, completed, delayed, type analysis, and processing register.",
    phase: "Phase 2",
    href: "/dashboard/reports/endorsements",
  },
  {
    id: "lead-generation",
    title: "Lead Generation Intelligence",
    description: "Lead funnel, conversions, pending leads, user performance, and profiling register.",
    phase: "Phase 2",
    href: "/dashboard/reports/lead-generation",
  },
  {
    id: "service-requests",
    title: "Service Request Intelligence",
    description:
      "Service request status, SLA, TAT, and request register when the module data table is available.",
    phase: "Phase 3",
    href: "/dashboard/reports/service-requests",
  },
  {
    id: "team",
    title: "Team Performance Intelligence",
    description: "Policies added, renewals closed, claims handled, endorsements processed, and user score.",
    phase: "Phase 1",
    href: "/dashboard/reports/team",
  },
  {
    id: "operations",
    title: "Operations Intelligence",
    description: "Daily work summary, user activity tracking, document workload, and department performance.",
    phase: "Phase 1",
    href: "/dashboard/reports/operations",
  },
  {
    id: "documents",
    title: "Document Intelligence",
    description: "PDF uploads, missing PDFs, OCR success rate, extraction accuracy, and document audit.",
    phase: "Phase 3",
    href: "/dashboard/reports/documents",
  },
];

const POLICY_SELECT = {
  id: true,
  savedAt: true,
  createdAt: true,
  updatedAt: true,
  data: true,
  reviewedData: true,
  selectedCompany: true,
  selectedPolicyType: true,
  pdfFileName: true,
  confidenceScore: true,
  extractionQuality: true,
  renewalStatus: true,
  renewalDate: true,
  lostReason: true,
  isActivePolicy: true,
  createdById: true,
  createdBy: { select: { id: true, name: true, email: true } },
  updatedBy: { select: { id: true, name: true, email: true } },
  uploadedFile: { select: { createdAt: true, createdBy: { select: { id: true, name: true, email: true } } } },
};

const POLICY_SUMMARY_SELECT = {
  id: true,
  savedAt: true,
  createdAt: true,
  data: true,
  reviewedData: true,
  pdfFileName: true,
  renewalStatus: true,
  lostReason: true,
  isActivePolicy: true,
};

const MONTHLY_POLICY_CATEGORIES = [
  { value: "motor", label: "Motor Policy" },
  { value: "warehouse", label: "Warehouse Policy" },
  { value: "health", label: "Health Policy" },
  { value: "other", label: "Other Policy" },
];

const POLICY_CATEGORY_TERMS = {
  motor: [
    "motor",
    "vehicle",
    "private car",
    "two wheeler",
    "bike",
    "scooter",
    "commercial vehicle",
    "taxi",
    "school bus",
    "goods carrying",
    "passenger carrying",
    "auto secure",
    "liability only",
    "comprehensive",
    "own damage",
  ],
  warehouse: [
    "fire",
    "sfsp",
    "burglary",
    "msme",
    "warehouse",
    "stock",
    "property",
    "business guard",
    "laghu",
    "sookshma",
    "fidelity",
    "guarantee",
    "house breaking",
  ],
  health: ["health", "mediclaim", "hospital", "family floater", "health insurance"],
};

const CLAIM_SELECT = {
  id: true,
  insuredName: true,
  claimNo: true,
  claimType: true,
  claimStatus: true,
  followUpDate: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  createdBy: { select: { id: true, name: true, email: true } },
};

const CLAIM_SUMMARY_SELECT = {
  claimStatus: true,
  followUpDate: true,
};

const ENDORSEMENT_SELECT = {
  id: true,
  endorsementNo: true,
  policyNo: true,
  endorsementType: true,
  status: true,
  createdAt: true,
  createdById: true,
  createdBy: { select: { id: true, name: true, email: true } },
};

const ENDORSEMENT_SUMMARY_SELECT = {
  status: true,
  createdAt: true,
};

const PROFILE_SELECT = {
  id: true,
  name: true,
  phone: true,
  status: true,
  convertedToCustomer: true,
  nextFollowUpDate: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  createdBy: { select: { id: true, name: true, email: true } },
};

const PROFILE_SUMMARY_SELECT = {
  convertedToCustomer: true,
  nextFollowUpDate: true,
};

const UPLOAD_SELECT = {
  id: true,
  sourceFile: true,
  status: true,
  detectedCompanyName: true,
  createdAt: true,
};

const UPLOAD_SUMMARY_SELECT = { status: true };

const DETAIL_CATEGORIES = {
  policies: new Set(["executive", "policies", "monthly-policies", "customers", "renewals", "team"]),
  claims: new Set(["executive", "claims", "team"]),
  endorsements: new Set(["endorsements", "team"]),
  profiles: new Set(["lead-generation", "team"]),
  uploads: new Set(["operations", "documents"]),
};

const SUMMARY_CATEGORIES = {
  policies: new Set(["operations", "documents"]),
  claims: new Set(["operations"]),
  endorsements: new Set(["executive", "operations"]),
  profiles: new Set(["executive", "operations"]),
  uploads: new Set(["executive", "team"]),
};

export function getReportQueryPlan(category) {
  const selected = REPORT_CATEGORIES.some((item) => item.id === category) ? category : "executive";
  const mode = (dataset) =>
    DETAIL_CATEGORIES[dataset].has(selected)
      ? "detail"
      : SUMMARY_CATEGORIES[dataset].has(selected)
        ? "summary"
        : "none";
  return {
    policies: mode("policies"),
    claims: mode("claims"),
    endorsements: mode("endorsements"),
    profiles: mode("profiles"),
    uploads: mode("uploads"),
    audits: selected === "operations",
  };
}

export async function loadReportingCenterData({ category = "executive", searchParams = {} } = {}) {
  const session = await getCurrentSessionFromCookies();
  if (!session) {
    return emptyReportData(category);
  }

  const filters = normalizeFilters(searchParams);
  const dateRange =
    category === "monthly-policies"
      ? getMonthRange(filters.month)
      : getDateRange(filters.range, filters.from, filters.to);
  const sharedWhere = getTenantFilter(session, "read");
  const auditBaseWhere =
    session.role === "SUPER_ADMIN" ? {} : { organizationId: session.organizationId ?? null };
  const policyWhere = applyPolicyFilters({ ...sharedWhere }, filters, dateRange);
  const claimWhere = applyDateAndFieldFilters({ ...sharedWhere }, filters, dateRange, "updatedAt", {
    statusField: "claimStatus",
    userField: "createdById",
  });
  const endorsementWhere = applyDateAndFieldFilters({ ...sharedWhere }, filters, dateRange, "createdAt", {
    statusField: "status",
    userField: "createdById",
  });
  const uploadWhere = applyDateAndFieldFilters({ ...sharedWhere }, filters, dateRange, "createdAt", {
    statusField: "status",
    userField: "createdById",
  });
  const auditWhere = applyDateAndFieldFilters({ ...auditBaseWhere }, filters, dateRange, "createdAt", {
    userField: "userId",
  });
  const profileWhere = applyProfileFilters(getCustomerProfileScopedFilter(session), filters, dateRange);
  const userWhere =
    session.role === "SUPER_ADMIN"
      ? { deletedAt: null }
      : { organizationId: session.organizationId ?? null, deletedAt: null };
  const queryPlan = getReportQueryPlan(category);

  const [
    policiesRaw,
    policyTotal,
    claims,
    claimTotal,
    endorsements,
    endorsementTotal,
    profiles,
    profileTotal,
    uploads,
    uploadTotal,
    users,
    audits,
  ] = await Promise.all([
    queryPlan.policies === "none"
      ? Promise.resolve([])
      : prisma.policyRecord.findMany({
          where: policyWhere,
          select: queryPlan.policies === "detail" ? POLICY_SELECT : POLICY_SUMMARY_SELECT,
          orderBy: { savedAt: "desc" },
          take: 5000,
        }),
    queryPlan.policies === "none"
      ? Promise.resolve(0)
      : prisma.policyRecord.count({ where: policyWhere }),
    queryPlan.claims === "none"
      ? Promise.resolve([])
      : prisma.claim.findMany({
          where: claimWhere,
          select: queryPlan.claims === "detail" ? CLAIM_SELECT : CLAIM_SUMMARY_SELECT,
          orderBy: { updatedAt: "desc" },
          take: 1000,
        }),
    queryPlan.claims === "none" ? Promise.resolve(0) : prisma.claim.count({ where: claimWhere }),
    queryPlan.endorsements === "none"
      ? Promise.resolve([])
      : prisma.endorsement.findMany({
          where: endorsementWhere,
          select:
            queryPlan.endorsements === "detail" ? ENDORSEMENT_SELECT : ENDORSEMENT_SUMMARY_SELECT,
          orderBy: { createdAt: "desc" },
          take: 1000,
        }),
    queryPlan.endorsements === "none"
      ? Promise.resolve(0)
      : prisma.endorsement.count({ where: endorsementWhere }),
    queryPlan.profiles === "none"
      ? Promise.resolve([])
      : prisma.customerProfile.findMany({
          where: profileWhere,
          select: queryPlan.profiles === "detail" ? PROFILE_SELECT : PROFILE_SUMMARY_SELECT,
          orderBy: { updatedAt: "desc" },
          take: 1000,
        }),
    queryPlan.profiles === "none"
      ? Promise.resolve(0)
      : prisma.customerProfile.count({ where: profileWhere }),
    queryPlan.uploads === "none"
      ? Promise.resolve([])
      : prisma.uploadedFile.findMany({
          where: uploadWhere,
          select: queryPlan.uploads === "detail" ? UPLOAD_SELECT : UPLOAD_SUMMARY_SELECT,
          orderBy: { createdAt: "desc" },
          take: 1000,
        }),
    queryPlan.uploads === "none"
      ? Promise.resolve(0)
      : prisma.uploadedFile.count({ where: uploadWhere }),
    prisma.user.findMany({
      where: userWhere,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    queryPlan.audits
      ? prisma.auditLog.findMany({
          where: auditWhere,
          select: {
            id: true,
            action: true,
            createdAt: true,
            userId: true,
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 1000,
        })
      : Promise.resolve([]),
  ]);

  const policies = policiesRaw.map(normalizeRecord);
  const context = {
    category,
    session,
    filters,
    dateRange,
    policies,
    policyTotal,
    claims,
    claimTotal,
    endorsements,
    endorsementTotal,
    profiles,
    profileTotal,
    uploads,
    uploadTotal,
    users,
    audits,
  };

  const summary = buildSummary(context);
  const report = canAccessReportCategory(session)
    ? buildReport(category, context, summary)
    : buildAccessDeniedReport(category);

  return {
    ...context,
    summary,
    report,
    lastUpdated: new Date().toISOString(),
  };
}

function canAccessReportCategory(session) {
  return Boolean(session?.role);
}

function buildAccessDeniedReport(category) {
  return {
    category,
    title: "Report access restricted",
    description: "Your role has access to operational and personal performance reporting views only.",
    kpis: [],
    health: [],
    actions: [],
    charts: [],
    tables: [],
    unavailable: [`The ${category} report is not available for this role.`],
  };
}

function emptyReportData(category) {
  return {
    category,
    filters: normalizeFilters({}),
    dateRange: getDateRange("this_month"),
    policies: [],
    claims: [],
    endorsements: [],
    profiles: [],
    uploads: [],
    users: [],
    audits: [],
    summary: {},
    report: null,
    lastUpdated: new Date().toISOString(),
  };
}

function buildSummary(context) {
  const today = startOfDay(new Date());
  const next7 = addDays(today, 7);
  const policies = context.policies;
  const activePolicies = policies.filter((item) => item.isActivePolicy && item.renewalStatus === "ACTIVE");
  const expiredPolicies = activePolicies.filter((item) => {
    const expiry = parsePolicyDate(item.expiryDate);
    return expiry && expiry < today;
  });
  const dueToday = activePolicies.filter((item) => sameDay(parsePolicyDate(item.expiryDate), today));
  const dueWeek = activePolicies.filter((item) => {
    const expiry = parsePolicyDate(item.expiryDate);
    return expiry && expiry >= today && expiry <= next7;
  });
  const renewed = policies.filter((item) => item.renewalStatus === "RENEWED");
  const lost = policies.filter((item) =>
    ["LOST", "NOT_INTERESTED", "WRONG_NUMBER", "RENEWED_ELSEWHERE"].includes(item.renewalStatus),
  );
  const customers = new Set(policies.map((item) => item.insuredName).filter(Boolean));
  const repeatCustomers = countBy(policies, (item) => item.insuredName || "").filter(
    (item) => item.count > 1,
  ).length;
  const pendingClaims = context.claims.filter(
    (item) => !["Settled", "Closed", "Rejected"].includes(item.claimStatus),
  );
  const delayedClaims = context.claims.filter((item) => {
    const follow = item.followUpDate ? new Date(item.followUpDate) : null;
    return follow && follow < today && !["Settled", "Closed", "Rejected"].includes(item.claimStatus);
  });
  const pendingEndorsements = context.endorsements.filter(
    (item) => !["Approved", "Completed", "Cancelled", "Rejected"].includes(item.status),
  );
  const delayedEndorsements = context.endorsements.filter((item) => {
    const created = item.createdAt ? new Date(item.createdAt) : null;
    return (
      created &&
      daysBetween(created, today) > 7 &&
      !["Approved", "Completed", "Cancelled", "Rejected"].includes(item.status)
    );
  });
  const ocrFailures = context.uploads.filter((item) => String(item.status) === "FAILED");
  const premium = policies.reduce(
    (sum, item) => sum + parseMoney(item.netPremium || item.totalPremium || item.premium),
    0,
  );
  const sumInsured = policies.reduce((sum, item) => sum + parseMoney(item.sumInsured), 0);
  const renewalRatio =
    activePolicies.length + renewed.length
      ? Math.round((renewed.length / (activePolicies.length + renewed.length)) * 100)
      : 0;
  const claimRatio = policies.length ? Math.round((context.claims.length / policies.length) * 100) : 0;
  const retention = customers.size ? Math.round((repeatCustomers / customers.size) * 100) : 0;
  const newCustomers = policies
    .filter((item) => withinDate(item.savedAt || item.createdAt, context.dateRange))
    .map((item) => item.insuredName)
    .filter(Boolean);

  return {
    totalPolicies: context.policyTotal || policies.length,
    activePolicies: activePolicies.length,
    expiredPolicies: expiredPolicies.length,
    renewedPolicies: renewed.length,
    lostPolicies: lost.length,
    totalPremium: premium,
    totalSumInsured: sumInsured,
    totalCustomers: customers.size,
    newCustomers: new Set(newCustomers).size,
    customerRetention: retention,
    renewalRatio,
    claimRatio,
    claimCount: context.claimTotal || context.claims.length,
    endorsementCount: context.endorsementTotal || context.endorsements.length,
    serviceRequestCount: 0,
    profilingCount: context.profileTotal || context.profiles.length,
    uploadCount: context.uploadTotal || context.uploads.length,
    dueToday: dueToday.length,
    dueWeek: dueWeek.length,
    overdueRenewals: expiredPolicies.length,
    pendingClaims: pendingClaims.length,
    delayedClaims: delayedClaims.length,
    pendingEndorsements: pendingEndorsements.length,
    delayedEndorsements: delayedEndorsements.length,
    pendingServiceRequests: 0,
    missingPdfs: policies.filter((item) => !item.hasPdf).length,
    ocrFailures: ocrFailures.length,
    leadFollowupsPending: context.profiles.filter(
      (item) =>
        item.nextFollowUpDate && new Date(item.nextFollowUpDate) <= next7 && !item.convertedToCustomer,
    ).length,
  };
}

function buildReport(category, context, summary) {
  const base = {
    category,
    title: REPORT_CATEGORIES.find((item) => item.id === category)?.title || "Business Intelligence",
    description: REPORT_CATEGORIES.find((item) => item.id === category)?.description || "",
    kpis: [],
    health: [],
    actions: buildActionCenter(summary, category),
    charts: [],
    tables: [],
    unavailable: [],
  };

  const policies = context.policies;
  const claims = context.claims;
  const endorsements = context.endorsements;
  const profiles = context.profiles;
  const uploads = context.uploads;
  const users = context.users;

  if (category === "executive") {
    base.kpis = [
      kpi("Total Policies", summary.totalPolicies),
      kpi("Active Policies", summary.activePolicies),
      kpi("Expired Policies", summary.expiredPolicies),
      kpi("Renewed Policies", summary.renewedPolicies),
      kpi("Lost Policies", summary.lostPolicies),
      kpi("Total Premium", formatCurrency(summary.totalPremium)),
      kpi("Total Sum Insured", formatCurrency(summary.totalSumInsured)),
      kpi("Total Customers", summary.totalCustomers),
      kpi("New Customers", summary.newCustomers),
      kpi("Customer Retention %", `${summary.customerRetention}%`),
      kpi("Renewal Ratio", `${summary.renewalRatio}%`),
      kpi("Claim Ratio", `${summary.claimRatio}%`),
      kpi("Endorsement Count", summary.endorsementCount),
      kpi("Service Request Count", summary.serviceRequestCount),
    ];
    base.health = buildHealth(summary);
    base.charts = [
      chart("Monthly Growth", monthlyTrend(policies, "savedAt", "count")),
      chart("Premium Trend", monthlyTrend(policies, "savedAt", "premium")),
      chart("Policy Growth Trend", monthlyTrend(policies, "savedAt", "count")),
      chart("Customer Growth Trend", monthlyTrend(policies, "savedAt", "customers")),
      chart("Renewal Trend", statusTrend(policies, "renewalStatus")),
      chart("Claim Trend", monthlyTrend(claims, "createdAt", "count")),
    ];
    base.tables = [
      table(
        "Agent-wise Performance Breakdown",
        ["Agent", "EOD (Today)", "MTD (Month)", "YTD (Year)", "Renewed", "Lost", "Expired"],
        buildAgentPerformanceTable(policies, users),
      ),
      table(
        "Top Insurance Companies",
        ["Company", "Policies", "Premium"],
        topGroups(policies, (r) => r.insuranceCompany || "Unknown", "premium"),
      ),
      table(
        "Top Performing Users",
        ["User", "Policies", "Premium"],
        topGroups(policies, (r) => r.createdBy || r.uploadedBy || "Unknown", "premium"),
      ),
      table(
        "Top Performing Agents",
        ["Agent", "Policies", "Premium"],
        topGroups(policies, (r) => r.assignedTo || r.createdBy || "Unknown", "premium"),
      ),
      table("Top Branches", ["Branch", "Policies", "Premium"], [["No branch table configured", "-", "-"]]),
      table(
        "Top Policy Types",
        ["Policy Type", "Policies", "Premium"],
        topGroups(policies, (r) => r.policyType || "Unknown", "premium"),
      ),
    ];
    return base;
  }

  if (category === "policies") {
    base.kpis = [
      kpi("Policies", summary.totalPolicies),
      kpi("Premium", formatCurrency(summary.totalPremium)),
      kpi("Sum Insured", formatCurrency(summary.totalSumInsured)),
      kpi("Missing PDFs", summary.missingPdfs),
    ];
    base.charts = [
      chart("Premium Trend", monthlyTrend(policies, "savedAt", "premium")),
      chart("Policy Volume Trend", monthlyTrend(policies, "savedAt", "count")),
      chart(
        "Company Distribution",
        topGroups(policies, (r) => r.insuranceCompany || "Unknown"),
      ),
      chart(
        "Policy Type Distribution",
        topGroups(policies, (r) => r.policyType || "Unknown"),
      ),
    ];
    base.tables = [
      table(
        "Policy Listing",
        ["Policy No.", "Insured", "Company"],
        policies
          .slice(0, 25)
          .map((r) => [r.policyNumber || "-", r.insuredName || "-", r.insuranceCompany || "-"]),
      ),
      table(
        "Premium Summary",
        ["Group", "Policies", "Premium"],
        topGroups(policies, (r) => r.policyType || "Unknown", "premium"),
      ),
      table(
        "Sum Insured Summary",
        ["Group", "Policies", "Sum Insured"],
        topGroups(policies, (r) => r.policyType || "Unknown", "sumInsured"),
      ),
      table("Branch Summary", ["Branch", "Policies", "Premium"], [["No branch table configured", "-", "-"]]),
    ];
    return base;
  }

  if (category === "monthly-policies") {
    const insurerRows = buildInsurerSummary(policies);
    base.filterOptions = { policyCategories: MONTHLY_POLICY_CATEGORIES };
    base.kpis = [
      kpi("Policies Saved", summary.totalPolicies, context.dateRange.label),
      kpi("Insurance Companies", insurerRows.length),
      kpi("Total Premium", formatCurrency(summary.totalPremium)),
    ];
    base.charts = [
      donutChart(
        "Policies by Insurance Company",
        insurerRows.map((row) => [row.company, row.policies]),
      ),
      lineChart("Daily Policy Trend", dailyTrend(policies, "savedAt", context.dateRange)),
    ];
    base.tables = [
      table(
        "Insurance Company Summary",
        ["Insurance Company", "Month", "Policies", "Premium"],
        insurerRows.map((row) => [
          row.company,
          context.dateRange.label,
          row.policies,
          formatCurrency(row.premium),
        ]),
      ),
      table(
        "Monthly Policy Records",
        ["Saved Date", "Policy No.", "Insured Name", "Policy Type", "Insurance Company", "Premium"],
        policies.map((record) => [
          formatDate(record.savedAt || record.createdAt),
          record.policyNumber || "-",
          record.insuredName || "-",
          record.policyType || "-",
          record.insuranceCompany || "-",
          formatCurrency(parseMoney(record.netPremium || record.totalPremium || record.premium)),
        ]),
      ),
    ];
    return base;
  }

  if (category === "renewals") {
    base.kpis = [
      kpi("Due Today", summary.dueToday),
      kpi("Due in 7 Days", summary.dueWeek),
      kpi("Overdue", summary.overdueRenewals),
      kpi("Renewed", summary.renewedPolicies),
      kpi("Lost", summary.lostPolicies),
      kpi("Conversion Ratio", `${summary.renewalRatio}%`),
    ];
    base.charts = [
      chart("Renewal Funnel", [
        ["Due Today", summary.dueToday],
        ["Due Week", summary.dueWeek],
        ["Overdue", summary.overdueRenewals],
        ["Renewed", summary.renewedPolicies],
        ["Lost", summary.lostPolicies],
      ]),
      chart("Renewal Success Rate", statusTrend(policies, "renewalStatus")),
      chart(
        "Lost Reason Analysis",
        topGroups(
          policies.filter((r) => r.lostReason),
          (r) => r.lostReason || "Unknown",
        ),
      ),
    ];
    base.tables = [
      table(
        "Renewal Pipeline",
        ["Policy No.", "Insured", "Expiry"],
        policies.slice(0, 25).map((r) => [r.policyNumber || "-", r.insuredName || "-", r.expiryDate || "-"]),
      ),
      table(
        "Agent Performance",
        ["Agent", "Policies", "Premium"],
        topGroups(policies, (r) => r.assignedTo || r.createdBy || "Unknown", "premium"),
      ),
      table(
        "Company Performance",
        ["Company", "Policies", "Premium"],
        topGroups(policies, (r) => r.insuranceCompany || "Unknown", "premium"),
      ),
    ];
    return base;
  }

  if (category === "claims") {
    base.kpis = [
      kpi("Open Claims", claims.filter((c) => c.claimStatus === "Open").length),
      kpi("Pending Claims", summary.pendingClaims),
      kpi("Rejected Claims", claims.filter((c) => c.claimStatus === "Rejected").length),
      kpi("Delayed Claims", summary.delayedClaims),
    ];
    base.charts = [
      chart(
        "Status Distribution",
        topGroups(claims, (r) => r.claimStatus || "Unknown"),
      ),
      chart(
        "Settlement Trend",
        monthlyTrend(
          claims.filter((c) => c.claimStatus === "Settled"),
          "updatedAt",
          "count",
        ),
      ),
      chart(
        "TAT Trend",
        topGroups(claims, (r) => r.claimType || "Unknown"),
      ),
    ];
    base.tables = [
      table(
        "Claims Listing",
        ["Claim No.", "Insured", "Status"],
        claims.slice(0, 25).map((r) => [r.claimNo || "-", r.insuredName || "-", r.claimStatus || "-"]),
      ),
      table(
        "Company Claim Performance",
        ["Claim Type", "Claims", "Count"],
        topGroups(claims, (r) => r.claimType || "Unknown"),
      ),
    ];
    return base;
  }

  if (category === "endorsements") {
    base.kpis = [
      kpi("Created", summary.endorsementCount),
      kpi("Pending", summary.pendingEndorsements),
      kpi("Completed", endorsements.filter((e) => ["Approved", "Completed"].includes(e.status)).length),
      kpi("Delayed", summary.delayedEndorsements),
    ];
    base.charts = [
      chart("Endorsement Trend", monthlyTrend(endorsements, "createdAt", "count")),
      chart(
        "Type Distribution",
        topGroups(endorsements, (r) => r.endorsementType || "Unknown"),
      ),
    ];
    base.tables = [
      table(
        "Endorsement Register",
        ["Endorsement No.", "Policy No.", "Status"],
        endorsements.slice(0, 25).map((r) => [r.endorsementNo || "-", r.policyNo || "-", r.status || "-"]),
      ),
      table(
        "Processing Time Analysis",
        ["Status", "Items", "Count"],
        topGroups(endorsements, (r) => r.status || "Unknown"),
      ),
    ];
    return base;
  }

  if (category === "customers") {
    base.kpis = [
      kpi("Customers", summary.totalCustomers),
      kpi("New Customers", summary.newCustomers),
      kpi(
        "Repeat Customers",
        countBy(policies, (r) => r.insuredName || "").filter((r) => r.count > 1).length,
      ),
      kpi("Retention", `${summary.customerRetention}%`),
    ];
    base.charts = [
      chart("Customer Growth", monthlyTrend(policies, "savedAt", "customers")),
      chart("Retention Trend", [
        ["Retention", summary.customerRetention],
        ["New", summary.newCustomers],
      ]),
      chart(
        "Customer Segmentation",
        topGroups(policies, (r) => r.policyType || "Unknown"),
      ),
    ];
    base.tables = [
      table(
        "Customer Summary",
        ["Customer", "Policies", "Premium"],
        topGroups(policies, (r) => r.insuredName || "Unknown", "premium"),
      ),
      table(
        "Customer Portfolio",
        ["Policy No.", "Customer", "Company"],
        policies
          .slice(0, 25)
          .map((r) => [r.policyNumber || "-", r.insuredName || "-", r.insuranceCompany || "-"]),
      ),
    ];
    return base;
  }

  if (category === "lead-generation") {
    const converted = profiles.filter((p) => p.convertedToCustomer);
    base.kpis = [
      kpi("Leads Added", profiles.length),
      kpi("Leads Converted", converted.length),
      kpi("Leads Pending", profiles.length - converted.length),
      kpi(
        "Conversion Ratio",
        `${profiles.length ? Math.round((converted.length / profiles.length) * 100) : 0}%`,
      ),
    ];
    base.charts = [
      chart("Lead Funnel", [
        ["Added", profiles.length],
        ["Converted", converted.length],
        ["Pending", profiles.length - converted.length],
      ]),
      chart(
        "Conversion Funnel",
        topGroups(profiles, (r) => r.status || "Unknown"),
      ),
    ];
    base.tables = [
      table(
        "Profiling Register",
        ["Name", "Phone", "Status"],
        profiles.slice(0, 25).map((r) => [r.name || "-", r.phone || "-", r.status || "-"]),
      ),
      table(
        "User-wise Performance",
        ["User", "Profiles", "Count"],
        topGroups(profiles, (r) => r.createdBy?.name || r.createdBy?.email || "Unknown"),
      ),
    ];
    return base;
  }

  if (category === "team") {
    base.kpis = [
      kpi("Users", users.length),
      kpi("Policies Added", policies.length),
      kpi("Renewals Closed", summary.renewedPolicies),
      kpi("Claims Handled", claims.length),
      kpi("Endorsements Processed", endorsements.length),
      kpi("Profiles Created", profiles.length),
    ];
    base.charts = [
      chart("User Performance Score", buildUserScores(context)),
      chart("Leaderboard", buildUserScores(context).slice(0, 8)),
    ];
    base.tables = [
      table(
        "Agent-wise Performance Breakdown",
        ["Agent", "EOD (Today)", "MTD (Month)", "YTD (Year)", "Renewed", "Lost", "Expired"],
        buildAgentPerformanceTable(policies, users),
      ),
      table(
        "Top Users",
        ["User", "Score", "Work Items"],
        buildUserScores(context).map((r) => [r[0], r[1], r[2]]),
      ),
      table(
        "Top Agents",
        ["Agent", "Score", "Work Items"],
        buildUserScores(context).map((r) => [r[0], r[1], r[2]]),
      ),
      table(
        "Top Managers",
        ["Manager", "Score", "Work Items"],
        users.filter((u) => u.role === "MANAGER").map((u) => [u.name || u.email, "-", "Manager role"]),
      ),
    ];
    return base;
  }

  if (category === "operations") {
    base.kpis = [
      kpi("Daily Work Items", context.audits.filter((a) => sameDay(a.createdAt, new Date())).length),
      kpi("Weekly Activities", context.audits.length),
      kpi("Documents Processed", uploads.length),
      kpi("Pending Work", summary.dueToday + summary.pendingClaims + summary.pendingEndorsements),
    ];
    base.charts = [
      chart("Workload Trend", monthlyTrend(context.audits, "createdAt", "count")),
      chart(
        "Activity Heatmap",
        topGroups(context.audits, (r) => r.action || "Unknown"),
      ),
    ];
    base.tables = [
      table(
        "Operations Register",
        ["Action", "User", "Date"],
        context.audits
          .slice(0, 25)
          .map((r) => [r.action || "-", r.user?.name || r.user?.email || "-", formatDate(r.createdAt)]),
      ),
      table(
        "Department Performance",
        ["Department", "Items", "Count"],
        [
          ["Policy", policies.length, policies.length],
          ["Claims", claims.length, claims.length],
          ["Endorsements", endorsements.length, endorsements.length],
          ["Documents", uploads.length, uploads.length],
        ],
      ),
    ];
    return base;
  }

  if (category === "documents") {
    const success = uploads.filter((u) =>
      ["APPROVED", "EXTRACTED", "REVIEW_REQUIRED"].includes(String(u.status)),
    );
    const ocrRate = uploads.length ? Math.round((success.length / uploads.length) * 100) : 0;
    base.kpis = [
      kpi("PDF Uploaded", uploads.length),
      kpi("PDF Missing", summary.missingPdfs),
      kpi("OCR Success Rate", `${ocrRate}%`),
      kpi("OCR Failures", summary.ocrFailures),
    ];
    base.charts = [
      chart("Upload Trend", monthlyTrend(uploads, "createdAt", "count")),
      chart(
        "OCR Trend",
        topGroups(uploads, (r) => String(r.status || "Unknown")),
      ),
    ];
    base.tables = [
      table(
        "Document Audit Register",
        ["File", "Status", "Date"],
        uploads
          .slice(0, 25)
          .map((r) => [r.sourceFile || "-", String(r.status || "-"), formatDate(r.createdAt)]),
      ),
      table(
        "Company Statistics",
        ["Company", "Uploads", "Count"],
        topGroups(uploads, (r) => r.detectedCompanyName || "Unknown"),
      ),
    ];
    return base;
  }

  if (category === "service-requests") {
    base.kpis = [kpi("Open", 0), kpi("Pending", 0), kpi("Closed", 0), kpi("SLA Breached", 0)];
    base.unavailable = [
      "No ServiceRequest model/table exists in the current Prisma schema. This page is route-ready and will populate when the module is added.",
    ];
    base.tables = [
      table("Request Register", ["Status", "Count", "Source"], [["Not configured", 0, "No database table"]]),
    ];
    return base;
  }

  return base;
}

const CATEGORY_ACTIONS = {
  "monthly-policies": new Set(),
  policies: new Set([
    "Renewals Due Today",
    "Renewals Due This Week",
    "Overdue Renewals",
    "Missing PDFs",
  ]),
  customers: new Set(["Renewals Due This Week", "Overdue Renewals"]),
  renewals: new Set(["Renewals Due Today", "Renewals Due This Week", "Overdue Renewals"]),
  claims: new Set(["Pending Claims", "Delayed Claims"]),
  endorsements: new Set(["Pending Endorsements", "Delayed Endorsements"]),
  "lead-generation": new Set(["Lead Follow-ups Pending"]),
  "service-requests": new Set(["Pending Service Requests"]),
  documents: new Set(["Missing PDFs", "OCR Failures"]),
};

function buildActionCenter(summary, category) {
  const rows = [
    ["Renewals Due Today", summary.dueToday],
    ["Renewals Due This Week", summary.dueWeek],
    ["Overdue Renewals", summary.overdueRenewals],
    ["Pending Claims", summary.pendingClaims],
    ["Delayed Claims", summary.delayedClaims],
    ["Pending Endorsements", summary.pendingEndorsements],
    ["Delayed Endorsements", summary.delayedEndorsements],
    ["Pending Service Requests", summary.pendingServiceRequests],
    ["Missing PDFs", summary.missingPdfs],
    ["OCR Failures", summary.ocrFailures],
    ["Lead Follow-ups Pending", summary.leadFollowupsPending],
  ];
  const selected = CATEGORY_ACTIONS[category];
  return selected ? rows.filter(([label]) => selected.has(label)) : rows;
}

function buildHealth(summary) {
  const revenueHealth = scoreFrom(summary.totalPremium > 0, summary.lostPolicies <= summary.renewedPolicies);
  const renewalHealth = clamp(100 - summary.overdueRenewals * 5 + summary.renewalRatio / 2);
  const claimsHealth = clamp(100 - summary.delayedClaims * 8 - summary.pendingClaims * 2);
  const customerHealth = clamp(summary.customerRetention + Math.min(40, summary.newCustomers * 2));
  const overall = Math.round((revenueHealth + renewalHealth + claimsHealth + customerHealth) / 4);
  return [
    ["Business Health Score", overall],
    ["Revenue Health", revenueHealth],
    ["Renewal Health", renewalHealth],
    ["Claims Health", claimsHealth],
    ["Customer Health", customerHealth],
  ];
}

function buildUserScores(context) {
  const rows = new Map();
  const touch = (key, label, points = 1) => {
    if (!key && !label) return;
    const id = key || label;
    const current = rows.get(id) || { label: label || "Unknown", items: 0, points: 0 };
    current.items += 1;
    current.points += points;
    rows.set(id, current);
  };
  context.policies.forEach((item) =>
    touch(item.createdByEmail || item.createdBy, item.createdBy || item.uploadedBy || "Unknown", 4),
  );
  context.claims.forEach((item) =>
    touch(item.createdById, item.createdBy?.name || item.createdBy?.email || "Unknown", 3),
  );
  context.endorsements.forEach((item) =>
    touch(item.createdById, item.createdBy?.name || item.createdBy?.email || "Unknown", 3),
  );
  context.profiles.forEach((item) =>
    touch(item.createdById, item.createdBy?.name || item.createdBy?.email || "Unknown", 2),
  );
  return Array.from(rows.values())
    .map((row) => [row.label, clamp(row.points * 5), row.items])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
}

function normalizeFilters(searchParams = {}) {
  const today = new Date();
  return {
    range: String(searchParams.range || "this_month"),
    from: String(searchParams.from || ""),
    to: String(searchParams.to || ""),
    user: String(searchParams.user || ""),
    manager: String(searchParams.manager || ""),
    agent: String(searchParams.agent || ""),
    branch: String(searchParams.branch || ""),
    company: String(searchParams.company || ""),
    policyType: String(searchParams.policyType || ""),
    policyCategory: String(searchParams.policyCategory || ""),
    status: String(searchParams.status || ""),
    lob: String(searchParams.lob || ""),
    month: String(
      searchParams.month || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`,
    ),
  };
}

function getMonthRange(value = "") {
  const fallback = new Date();
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  const year = match ? Number(match[1]) : fallback.getFullYear();
  const monthIndex = match ? Number(match[2]) - 1 : fallback.getMonth();
  const start = new Date(year, monthIndex, 1);
  const end = endOfDay(new Date(year, monthIndex + 1, 0));
  return {
    start,
    end,
    label: start.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
  };
}

function getDateRange(range = "this_month", from = "", to = "") {
  const today = startOfDay(new Date());
  let start = new Date(today);
  let end = endOfDay(today);
  if (range === "yesterday") {
    start = addDays(today, -1);
    end = endOfDay(start);
  } else if (range === "this_week") {
    start = addDays(today, -today.getDay());
  } else if (range === "last_week") {
    start = addDays(today, -today.getDay() - 7);
    end = endOfDay(addDays(start, 6));
  } else if (range === "this_month") {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
  } else if (range === "last_month") {
    start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    end = endOfDay(new Date(today.getFullYear(), today.getMonth(), 0));
  } else if (range === "quarter") {
    start = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
  } else if (range === "year") {
    start = new Date(today.getFullYear(), 0, 1);
  } else if (range === "custom") {
    start = from ? startOfDay(new Date(from)) : start;
    end = to ? endOfDay(new Date(to)) : end;
  }
  return { start, end, label: range };
}

function applyPolicyFilters(where, filters, dateRange) {
  Object.assign(where, withoutManualRenewalSources(where));
  where.savedAt = { gte: dateRange.start, lte: dateRange.end };
  const and = [];
  if (filters.company) {
    and.push({
      OR: [
        { selectedCompany: { contains: filters.company, mode: "insensitive" } },
        {
          reviewedData: { path: ["insuranceCompany"], string_contains: filters.company, mode: "insensitive" },
        },
        { data: { path: ["insuranceCompany"], string_contains: filters.company, mode: "insensitive" } },
      ],
    });
  }
  if (filters.policyType || filters.lob) {
    const value = filters.policyType || filters.lob;
    and.push({
      OR: [
        { selectedPolicyType: { contains: value, mode: "insensitive" } },
        { reviewedData: { path: ["policyType"], string_contains: value, mode: "insensitive" } },
        { data: { path: ["policyType"], string_contains: value, mode: "insensitive" } },
      ],
    });
  }
  if (filters.policyCategory) {
    const category = filters.policyCategory.toLowerCase();
    if (category === "other") {
      and.push({
        NOT: {
          OR: buildPolicyCategoryClauses(Object.values(POLICY_CATEGORY_TERMS).flat()),
        },
      });
    } else if (POLICY_CATEGORY_TERMS[category]) {
      and.push({ OR: buildPolicyCategoryClauses(POLICY_CATEGORY_TERMS[category]) });
    }
  }
  if (filters.status) where.renewalStatus = filters.status;
  if (filters.user || filters.agent) where.createdById = filters.user || filters.agent;
  if (and.length) {
    const existingAnd = where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : [];
    where.AND = [...existingAnd, ...and];
  }
  return where;
}

function buildPolicyCategoryClauses(terms) {
  return terms.flatMap((term) => [
    { selectedPolicyType: { contains: term, mode: "insensitive" } },
    { detectedPolicyType: { contains: term, mode: "insensitive" } },
    { selectedServiceCategory: { contains: term, mode: "insensitive" } },
    { detectedServiceCategory: { contains: term, mode: "insensitive" } },
    { sourceFile: { contains: term, mode: "insensitive" } },
    { reviewedData: { path: ["policyType"], string_contains: term, mode: "insensitive" } },
    { reviewedData: { path: ["documentCategory"], string_contains: term, mode: "insensitive" } },
    { data: { path: ["policyType"], string_contains: term, mode: "insensitive" } },
    { data: { path: ["documentCategory"], string_contains: term, mode: "insensitive" } },
  ]);
}

function applyProfileFilters(where, filters, dateRange) {
  where.createdAt = { gte: dateRange.start, lte: dateRange.end };
  if (filters.status) where.status = filters.status;
  if (filters.user || filters.agent) where.createdById = filters.user || filters.agent;
  if (filters.lob) {
    where.selectedLOBs = { array_contains: [filters.lob] };
  }
  return where;
}

function applyDateAndFieldFilters(where, filters, dateRange, dateField, options = {}) {
  where[dateField] = { gte: dateRange.start, lte: dateRange.end };
  if (filters.status && options.statusField) where[options.statusField] = filters.status;
  if ((filters.user || filters.agent) && options.userField)
    where[options.userField] = filters.user || filters.agent;
  return where;
}

function kpi(label, value, hint = "") {
  return { label, value, hint };
}

function chart(title, rows) {
  return { title, type: "bar", rows: rows.slice(0, 8) };
}

function lineChart(title, rows) {
  return { title, type: "line", rows: rows.slice(0, 31) };
}

function donutChart(title, rows) {
  return { title, type: "donut", rows: rows.slice(0, 8) };
}

function table(title, headers, rows) {
  return { title, headers, rows: rows.slice(0, 25) };
}

function topGroups(items, getKey, metric = "count") {
  const map = new Map();
  items.forEach((item) => {
    const key = getKey(item) || "Unknown";
    const current = map.get(key) || { count: 0, premium: 0, sumInsured: 0 };
    current.count += 1;
    current.premium += parseMoney(item.netPremium || item.totalPremium || item.premium);
    current.sumInsured += parseMoney(item.sumInsured);
    map.set(key, current);
  });
  return Array.from(map.entries())
    .map(([key, value]) => [
      key,
      value.count,
      metric === "premium"
        ? formatCurrency(value.premium)
        : metric === "sumInsured"
          ? formatCurrency(value.sumInsured)
          : value.count,
    ])
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 10);
}

function countBy(items, getKey) {
  const map = new Map();
  items.forEach((item) => {
    const key = getKey(item);
    if (!key) return;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries()).map(([label, count]) => ({ label, count }));
}

function monthlyTrend(items, dateField, mode) {
  const months = [];
  const now = new Date();
  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    months.push({
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString("en-IN", { month: "short" }),
      value: 0,
      customers: new Set(),
    });
  }
  items.forEach((item) => {
    const date = item[dateField] ? new Date(item[dateField]) : null;
    if (!date || Number.isNaN(date.getTime())) return;
    const bucket = months.find((month) => month.key === `${date.getFullYear()}-${date.getMonth()}`);
    if (!bucket) return;
    if (mode === "premium") bucket.value += parseMoney(item.netPremium || item.totalPremium || item.premium);
    else if (mode === "customers") bucket.customers.add(item.insuredName || item.name || item.id);
    else bucket.value += 1;
  });
  return months.map((month) => [
    month.label,
    mode === "customers" ? month.customers.size : Math.round(month.value),
  ]);
}

function dailyTrend(items, dateField, range) {
  const days = [];
  const cursor = new Date(range.start);
  while (cursor <= range.end) {
    days.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`,
      label: String(cursor.getDate()),
      value: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  items.forEach((item) => {
    const date = item[dateField] ? new Date(item[dateField]) : null;
    if (!date || Number.isNaN(date.getTime())) return;
    const bucket = days.find(
      (day) => day.key === `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
    );
    if (bucket) bucket.value += 1;
  });
  return days.map((day) => [day.label, day.value]);
}

function buildInsurerSummary(policies) {
  const groups = new Map();
  policies.forEach((policy) => {
    const company = policy.insuranceCompany || "Unknown";
    const current = groups.get(company) || { company, policies: 0, premium: 0 };
    current.policies += 1;
    current.premium += parseMoney(policy.netPremium || policy.totalPremium || policy.premium);
    groups.set(company, current);
  });
  return Array.from(groups.values()).sort((a, b) => b.policies - a.policies);
}

function statusTrend(items, field) {
  return topGroups(items, (item) => item[field] || "Unknown");
}

function scoreFrom(...checks) {
  if (!checks.length) return 0;
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function withinDate(value, range) {
  const date = value ? new Date(value) : null;
  return Boolean(date && !Number.isNaN(date.getTime()) && date >= range.start && date <= range.end);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function endOfDay(date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function sameDay(a, b) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
  return (
    da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
  );
}

function daysBetween(a, b) {
  return Math.floor((startOfDay(new Date(b)) - startOfDay(new Date(a))) / 86400000);
}

export function formatCurrency(value) {
  const numeric = Number(value) || 0;
  if (!numeric) return "Rs. 0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(numeric);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN");
}

function buildAgentPerformanceTable(policies, users) {
  const today = startOfDay(new Date());
  const startOfToday = today;
  const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfThisYear = new Date(today.getFullYear(), 0, 1);
  const expiredThreshold = addDays(today, -30);

  const agentMap = new Map();

  if (Array.isArray(users)) {
    users.forEach((u) => {
      if (u.role === "AGENT" || u.role === "ADMIN" || u.role === "MANAGER") {
        agentMap.set(u.id, {
          id: u.id,
          name: u.name || u.email || "Unknown User",
          email: u.email || "",
          eodCount: 0,
          eodPremium: 0,
          mtdCount: 0,
          mtdPremium: 0,
          ytdCount: 0,
          ytdPremium: 0,
          renewedCount: 0,
          renewedPremium: 0,
          lostCount: 0,
          lostPremium: 0,
          expiredCount: 0,
          expiredPremium: 0,
        });
      }
    });
  }

  policies.forEach((p) => {
    const creatorId = p.createdById || "system";
    const agentName = p.createdBy?.name || p.uploadedBy || "System / Unassigned";
    const agentEmail = p.createdBy?.email || "";

    let stats = agentMap.get(creatorId);
    if (!stats) {
      stats = {
        id: creatorId,
        name: agentName,
        email: agentEmail,
        eodCount: 0,
        eodPremium: 0,
        mtdCount: 0,
        mtdPremium: 0,
        ytdCount: 0,
        ytdPremium: 0,
        renewedCount: 0,
        renewedPremium: 0,
        lostCount: 0,
        lostPremium: 0,
        expiredCount: 0,
        expiredPremium: 0,
      };
      agentMap.set(creatorId, stats);
    }

    const premium = parseMoney(p.netPremium || p.totalPremium || p.premium);
    const savedDate = p.savedAt ? new Date(p.savedAt) : null;
    const expiry = parsePolicyDate(p.expiryDate);

    // EOD
    if (savedDate && savedDate >= startOfToday) {
      stats.eodCount += 1;
      stats.eodPremium += premium;
    }
    // MTD
    if (savedDate && savedDate >= startOfThisMonth) {
      stats.mtdCount += 1;
      stats.mtdPremium += premium;
    }
    // YTD
    if (savedDate && savedDate >= startOfThisYear) {
      stats.ytdCount += 1;
      stats.ytdPremium += premium;
    }

    // Renewal statuses
    if (p.renewalStatus === "RENEWED") {
      stats.renewedCount += 1;
      stats.renewedPremium += premium;
    } else if (["LOST", "NOT_INTERESTED", "WRONG_NUMBER", "RENEWED_ELSEWHERE"].includes(p.renewalStatus)) {
      stats.lostCount += 1;
      stats.lostPremium += premium;
    } else if (
      p.isActivePolicy &&
      expiry &&
      expiry < today &&
      expiry >= expiredThreshold
    ) {
      stats.expiredCount += 1;
      stats.expiredPremium += premium;
    }
  });

  return Array.from(agentMap.values())
    .map((agent) => {
      const eodText = `${formatCurrency(agent.eodPremium)} (${agent.eodCount} ${agent.eodCount === 1 ? "policy" : "policies"})`;
      const mtdText = `${formatCurrency(agent.mtdPremium)} (${agent.mtdCount} ${agent.mtdCount === 1 ? "policy" : "policies"})`;
      const ytdText = `${formatCurrency(agent.ytdPremium)} (${agent.ytdCount} ${agent.ytdCount === 1 ? "policy" : "policies"})`;
      const renewedText = `${formatCurrency(agent.renewedPremium)} (${agent.renewedCount} ${agent.renewedCount === 1 ? "policy" : "policies"})`;
      const lostText = `${formatCurrency(agent.lostPremium)} (${agent.lostCount} ${agent.lostCount === 1 ? "policy" : "policies"})`;
      const expiredText = `${formatCurrency(agent.expiredPremium)} (${agent.expiredCount} ${agent.expiredCount === 1 ? "policy" : "policies"})`;

      return [
        agent.name + (agent.email && agent.name !== agent.email ? ` (${agent.email})` : ""),
        eodText,
        mtdText,
        ytdText,
        renewedText,
        lostText,
        expiredText,
        agent.eodPremium + agent.mtdPremium + agent.ytdPremium, // hidden order key
      ];
    })
    .sort((a, b) => b[7] - a[7]) // sort by total premium descending
    .map((row) => row.slice(0, 7)); // remove hidden order key
}
