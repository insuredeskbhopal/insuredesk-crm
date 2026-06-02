import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/rbac";
import { normalizeRecord } from "@/lib/records";
import { getRecordSearchText } from "@/lib/search";
import { withRenewalPolicyDisplay } from "@/lib/policy-type-display";
import { parsePolicyDate, startOfDay } from "@/app/lib/reporting/filters";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (!user) {
      return Response.json({ error: "Invalid session" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const company = searchParams.get("company") || "All";
    const policyType = searchParams.get("policyType") || "All";
    const tab = searchParams.get("tab") || "upcoming";
    const q = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const daysParam = searchParams.get("days");

    const tenantFilter = getTenantFilter(user, "read");

    // Construct DB where filters for status
    let statusFilter = {};
    if (tab === "upcoming") {
      statusFilter = {
        isActivePolicy: true,
        renewalStatus: "ACTIVE"
      };
    } else if (tab === "expired") {
      statusFilter = {
        isActivePolicy: true,
        renewalStatus: "ACTIVE"
      };
    } else if (tab === "renewed") {
      statusFilter = {
        renewalStatus: "RENEWED"
      };
    } else if (tab === "lost") {
      statusFilter = {
        renewalStatus: "LOST"
      };
    } else {
      // "all" tab: no active/inactive filter
      statusFilter = {};
    }

    // Database query - select only necessary fields, excluding heavy raw text or bytes
    const rawRecords = await prisma.policyRecord.findMany({
      where: {
        ...tenantFilter,
        ...statusFilter,
        // Optional performance optimizations in DB:
        ...(company !== "All" ? { selectedCompany: company } : {})
      },
      select: {
        id: true,
        savedAt: true,
        data: true,
        reviewedData: true,
        renewalStatus: true,
        previousPolicyId: true,
        renewedPolicyId: true,
        renewalDate: true,
        lostReason: true,
        isActivePolicy: true,
        selectedCompany: true,
        selectedPolicyType: true,
        pdfFileName: true
      }
    });

    const today = startOfDay(new Date());

    // Normalize and filter in memory for robust date calculations and fallback mappings
    let filtered = rawRecords.map((record) => withRenewalPolicyDisplay(normalizeRecord(record)));

    // Apply strict filters in memory
    filtered = filtered.filter((r) => {
      // 1. Company Filter Match
      if (company !== "All") {
        const c1 = String(company).trim().toLowerCase();
        const c2 = String(r.insuranceCompany || "").trim().toLowerCase();
        if (c1 !== c2) return false;
      }

      // 2. Policy Type Filter Match
      if (policyType !== "All") {
        const t1 = String(policyType).trim().toLowerCase();
        const t2 = String(r.displayPolicyType || r.policyType || "").trim().toLowerCase();
        if (t1 !== t2) return false;
      }

      // 3. Expiry Date & Tab Filters
      const expiry = parsePolicyDate(r.expiryDate);
      const daysRemaining = expiry ? Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
      r.daysRemaining = daysRemaining; // attach for easy UI usage

      if (tab === "upcoming") {
        if (expiry === null) return false;
        // Renewal worklist should only show policies with fewer than 30 days remaining.
        const requestedMaxDays = daysParam ? parseInt(daysParam, 10) : 29;
        const maxDays = Math.min(Number.isFinite(requestedMaxDays) ? requestedMaxDays : 29, 29);
        return daysRemaining !== null && daysRemaining >= 0 && daysRemaining < 30 && daysRemaining <= maxDays;
      } else if (tab === "expired") {
        if (expiry === null) return false;
        return daysRemaining !== null && daysRemaining < 0;
      }

      return true;
    });

    // 4. Text Search
    if (q.trim()) {
      const searchTerms = q.trim().toLowerCase();
      filtered = filtered.filter((r) => {
        return getRecordSearchText(r).includes(searchTerms);
      });
    }

    // 5. Sorting
    if (tab === "upcoming") {
      // Sort upcoming renewals first (closest first)
      filtered.sort((a, b) => {
        if (a.daysRemaining === null) return 1;
        if (b.daysRemaining === null) return -1;
        return a.daysRemaining - b.daysRemaining;
      });
    } else if (tab === "expired") {
      // Most recently expired first
      filtered.sort((a, b) => {
        if (a.daysRemaining === null) return 1;
        if (b.daysRemaining === null) return -1;
        return b.daysRemaining - a.daysRemaining;
      });
    } else {
      // Sort other tabs by savedAt desc
      filtered.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    }

    // 6. Pagination
    const totalCount = filtered.length;
    const pagesCount = Math.ceil(totalCount / limit);
    const startIdx = (page - 1) * limit;
    const paginated = filtered.slice(startIdx, startIdx + limit);

    return Response.json({
      policies: paginated,
      totalCount,
      pages: pagesCount || 1,
      currentPage: page
    });
  } catch (error) {
    console.error("Renewals policies fetch failed:", error);
    return Response.json({ error: "Failed to load renewal policies." }, { status: 500 });
  }
}
