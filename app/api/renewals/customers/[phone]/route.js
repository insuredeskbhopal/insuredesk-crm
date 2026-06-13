import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { normalizeRecord } from "@/lib/records";
import { withRenewalPolicyDisplay } from "@/lib/policies/type-display";

export const dynamic = "force-dynamic";

export async function GET(request, props) {
  const params = await props.params;
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (!user) {
      return Response.json({ error: "Invalid session" }, { status: 401 });
    }

    const { phone } = params;
    if (!phone) {
      return Response.json({ error: "Phone number parameter is required" }, { status: 400 });
    }

    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const orgId = user.organizationId || null;

    // 1. Fetch matched CustomerProfile if exists
    let customerProfile = null;
    if (!phone.startsWith("NO-MOBILE-")) {
      customerProfile = await prisma.customerProfile.findFirst({
        where: {
          phone: { contains: phone },
          deletedAt: null,
          ...(isSuperAdmin ? {} : { organizationId: orgId })
        },
        include: {
          createdBy: { select: { name: true, email: true } },
          updatedBy: { select: { name: true, email: true } }
        }
      });
    }

    // 2. Fetch all Policies that match this contact number
    // We match by name or phone or clean digits
    const rawPolicies = await prisma.policyRecord.findMany({
      where: {
        deletedAt: null,
        ...(isSuperAdmin ? {} : { organizationId: orgId }),
        OR: [
          { reviewedData: { path: ['contactNumber'], string_contains: phone } },
          { reviewedData: { path: ['customerMobile'], string_contains: phone } },
          { data: { path: ['contactNumber'], string_contains: phone } },
          { data: { path: ['customerMobile'], string_contains: phone } },
          // Also check fallback mapping by ID if NO-MOBILE
          phone.startsWith("NO-MOBILE-") ? { id: phone.replace("NO-MOBILE-", "") } : {}
        ]
      },
      orderBy: { savedAt: "desc" },
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
        pdfFileName: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { name: true, email: true } }
      }
    });

    const policies = rawPolicies.map((record) => {
      const normalized = withRenewalPolicyDisplay(normalizeRecord(record));
      return normalized;
    });

    // 3. Compute stats
    let totalPremium = 0;
    let totalSumInsured = 0;
    let policiesDue = 0;

    policies.forEach((policy) => {
      // Parse premium numeric value
      const premiumStr = String(policy.premium || policy.totalPremium || "0").replace(/[^0-9.]/g, "");
      const premiumNum = parseFloat(premiumStr) || 0;
      totalPremium += premiumNum;

      // Parse sum insured
      const siStr = String(policy.sumInsured || "0").replace(/[^0-9.]/g, "");
      const siNum = parseFloat(siStr) || 0;
      totalSumInsured += siNum;

      // Check if it is an active unrenewed policy in the renewal window
      const isClosed = ["RENEWED", "LOST", "NOT_INTERESTED", "WRONG_NUMBER", "RENEWED_ELSEWHERE"].includes(policy.renewalStatus);
      if (policy.isActivePolicy && !isClosed) {
        policiesDue++;
      }
    });

    // 4. Consolidate Timeline & Remarks History
    const remarks = [];
    policies.forEach((policy) => {
      const history = Array.isArray(policy.renewalRemarks) ? policy.renewalRemarks : [];
      history.forEach((remark) => {
        remarks.push({
          ...remark,
          policyId: policy.id,
          policyNumber: policy.policyNumber,
          policyType: policy.displayPolicyType || policy.policyType
        });
      });
    });

    // Sort remarks: newest first
    remarks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 5. Aggregate Customer Summary from latest policy if no CustomerProfile exists
    const latestPolicy = policies[0] || {};
    const fallbackSummary = {
      name: latestPolicy.insuredName || "Unknown Customer",
      phone: latestPolicy.contactNumber || phone,
      email: latestPolicy.email || "",
      address: latestPolicy.riskLocation || latestPolicy.tehsil || latestPolicy.district || "",
      state: latestPolicy.state || "",
      city: latestPolicy.district || ""
    };

    return Response.json({
      success: true,
      profile: customerProfile || fallbackSummary,
      policies,
      stats: {
        totalPremium,
        totalSumInsured,
        totalPolicies: policies.length,
        policiesDue
      },
      timeline: remarks
    });
  } catch (error) {
    console.error("Fetch customer profile failed:", error);
    return Response.json({ error: "Failed to load customer profile details." }, { status: 500 });
  }
}
