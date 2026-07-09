import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { normalizeRecord } from "@/lib/records";
import { withRenewalPolicyDisplay } from "@/lib/policies/type-display";
import {
  sortByDaysLeftAscending,
  withRenewalWindowDisplay,
} from "@/lib/renewals/dates";

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
    const cleanPhone = String(phone).replace(/[^0-9]/g, "");

    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const orgId = user.organizationId || null;

    // 1. Fetch matched CustomerProfile if exists
    let customerProfile = null;
    if (!phone.startsWith("NO-MOBILE-")) {
      customerProfile = await prisma.customerProfile.findFirst({
        where: {
          phone: { contains: cleanPhone || phone },
          deletedAt: null,
          ...(isSuperAdmin ? {} : { organizationId: orgId }),
        },
        include: {
          createdBy: { select: { name: true, email: true } },
          updatedBy: { select: { name: true, email: true } },
        },
      });
    }

    // 2. Fetch all Policies that match this contact number.
    // Excel renewal imports can store mobile numbers as JSON numbers; Prisma JSON string filters miss those.
    const matchedPolicyIds = phone.startsWith("NO-MOBILE-")
      ? [phone.replace("NO-MOBILE-", "")]
      : (
          await prisma.$queryRawUnsafe(
            `
              SELECT id
              FROM pdf_records
              WHERE deleted_at IS NULL
                AND ($1::boolean OR organization_id IS NOT DISTINCT FROM $2::uuid)
                AND RIGHT(regexp_replace(COALESCE(
                  reviewed_data->>'contactNumber',
                  reviewed_data->>'customerMobile',
                  reviewed_data->>'mobileNumber',
                  reviewed_data->>'phone',
                  data->>'contactNumber',
                  data->>'customerMobile',
                  data->>'mobileNumber',
                  data->>'phone',
                  ''
                ), '[^0-9]', '', 'g'), 10) = $3
            `,
            isSuperAdmin,
            orgId,
            cleanPhone.slice(-10),
          )
        ).map((row) => row.id);

    const rawPolicies = await prisma.policyRecord.findMany({
      where: {
        deletedAt: null,
        ...(isSuperAdmin ? {} : { organizationId: orgId }),
        id: { in: matchedPolicyIds },
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
        createdBy: { select: { name: true, email: true } },
      },
    });

    const enrichPolicy = async (policy) => {
      if (policy.renewedPolicyId) {
        let renewedRec = rawPolicies.find((r) => r.id === policy.renewedPolicyId);
        if (!renewedRec) {
          renewedRec = await prisma.policyRecord.findUnique({
            where: { id: policy.renewedPolicyId },
            select: { data: true, reviewedData: true },
          });
        }
        if (renewedRec) {
          const renewedNorm = normalizeRecord(renewedRec);
          policy.renewedDetails = {
            policyNumber: renewedNorm.policyNumber || renewedNorm.policyNo,
            expiryDate: renewedNorm.expiryDate,
            premium: renewedNorm.premium || renewedNorm.totalPremium || renewedNorm.netPremium,
          };
        }
      }
      return policy;
    };

    const allPolicies = await Promise.all(
      rawPolicies.map(async (record) => {
        const normalized = withRenewalPolicyDisplay(normalizeRecord(record));
        const withWindow = withRenewalWindowDisplay(normalized);
        return enrichPolicy(withWindow);
      })
    );

    const isOpenRenewalPolicy = (policy) => {
      const isClosed = ["RENEWED", "LOST", "NOT_INTERESTED", "WRONG_NUMBER", "RENEWED_ELSEWHERE"].includes(
        policy.renewalStatus,
      );
      return (
        policy.isActivePolicy &&
        !isClosed &&
        Number.isFinite(Number(policy.daysRemaining)) &&
        policy.daysRemaining >= -30 &&
        policy.daysRemaining <= 30
      );
    };

    let policies = allPolicies.filter(isOpenRenewalPolicy).sort(sortByDaysLeftAscending);

    // Fallback: if phone search found nothing, try fetching by explicit policyId
    if (policies.length === 0) {
      const fallbackId = new URL(request.url).searchParams.get("policyId");
      if (fallbackId) {
        const fallbackRecord = await prisma.policyRecord.findFirst({
          where: { id: fallbackId, deletedAt: null, ...(isSuperAdmin ? {} : { organizationId: orgId }) },
          select: {
            id: true, savedAt: true, data: true, reviewedData: true, renewalStatus: true,
            previousPolicyId: true, renewedPolicyId: true, renewalDate: true, lostReason: true,
            isActivePolicy: true, selectedCompany: true, selectedPolicyType: true, pdfFileName: true,
            createdAt: true, updatedAt: true, createdBy: { select: { name: true, email: true } },
          },
        });
        if (fallbackRecord) {
          const normalized = withRenewalPolicyDisplay(normalizeRecord(fallbackRecord));
          const withWindow = withRenewalWindowDisplay(normalized);
          policies = isOpenRenewalPolicy(withWindow) ? [await enrichPolicy(withWindow)] : [];
        }
      }
    }

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
      const isClosed = ["RENEWED", "LOST", "NOT_INTERESTED", "WRONG_NUMBER", "RENEWED_ELSEWHERE"].includes(
        policy.renewalStatus,
      );
      if (
        policy.isActivePolicy &&
        !isClosed &&
        Number.isFinite(Number(policy.daysRemaining)) &&
        policy.daysRemaining >= -30 &&
        policy.daysRemaining <= 30
      ) {
        policiesDue++;
      }
    });

    // Filter active policies in the 30-day window to compute due status.
    const policiesInWindow = policies.filter((policy) => {
      return (
        Number.isFinite(Number(policy.daysRemaining)) &&
        policy.daysRemaining >= -30 &&
        policy.daysRemaining <= 30
      );
    });

    const duePoliciesInWindow = policiesInWindow.filter((policy) => {
      const isClosed = ["RENEWED", "LOST", "NOT_INTERESTED", "WRONG_NUMBER", "RENEWED_ELSEWHERE"].includes(
        policy.renewalStatus,
      );
      return policy.isActivePolicy && !isClosed;
    });

    let customerStatus = "Active";
    if (duePoliciesInWindow.length > 0) {
      const hasExpired = duePoliciesInWindow.some((policy) => policy.daysRemaining < 0);
      customerStatus = hasExpired ? "Expired" : "Due Soon";
    } else if (policies.length > 0) {
      const renewedCount = policies.filter((p) => p.renewalStatus === "RENEWED").length;
      const lostCount = policies.filter((p) =>
        ["LOST", "NOT_INTERESTED", "WRONG_NUMBER", "RENEWED_ELSEWHERE"].includes(p.renewalStatus),
      ).length;
      if (renewedCount > 0) {
        customerStatus = "Renewed";
      } else if (lostCount > 0) {
        customerStatus = "Lost";
      } else {
        customerStatus = "Active";
      }
    }

    // 4. Consolidate Timeline & Remarks History
    const remarks = [];
    policies.forEach((policy) => {
      const history = Array.isArray(policy.renewalRemarks) ? policy.renewalRemarks : [];
      history.forEach((remark) => {
        remarks.push({
          ...remark,
          policyId: policy.id,
          policyNumber: policy.policyNumber,
          policyType: policy.displayPolicyType || policy.policyType,
        });
      });
    });

    // Sort remarks: newest first
    remarks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 5. Aggregate Customer Summary with Auto-Enrichment Scan from Policy Records
    const latestPolicy = policies[0] || {};
    const uniqueCompanies = Array.from(new Set(policies.map((p) => p.insuredName).filter(Boolean)));
    const totalCompanies = uniqueCompanies.length;

    let enrichedContactPerson = "";
    let enrichedEmail = "";
    let enrichedAddress = "";
    let enrichedState = "";
    let enrichedCity = "";
    let enrichedName = "";

    for (const p of policies) {
      if (!enrichedContactPerson && p.contactPerson) enrichedContactPerson = p.contactPerson;
      if (!enrichedEmail && p.email) enrichedEmail = p.email;
      if (!enrichedName && p.insuredName) enrichedName = p.insuredName;

      const addr = p.riskLocation || p.premisesAddress || p.mailingAddress || "";
      if (!enrichedAddress && addr) enrichedAddress = addr;

      if (!enrichedState && p.state) enrichedState = p.state;

      const cty = p.city || p.district || "";
      if (!enrichedCity && cty) enrichedCity = cty;
    }

    const fallbackSummary = {
      name: enrichedContactPerson || "Contact not available",
      contactPerson: enrichedContactPerson || "Contact not available",
      phone: phone.startsWith("NO-MOBILE-") ? "Not Available" : phone,
      email: enrichedEmail || "",
      address: enrichedAddress || "",
      state: enrichedState || "",
      city: enrichedCity || "",
      assignedTo: latestPolicy.assignedTo || "Unassigned",
    };

    const profileData = customerProfile
      ? {
          name:
            customerProfile.contactPersonName ||
            enrichedContactPerson ||
            customerProfile.name ||
            enrichedName ||
            "Unknown Contact",
          contactPerson:
            customerProfile.contactPersonName ||
            enrichedContactPerson ||
            customerProfile.name ||
            "Contact not available",
          phone: customerProfile.phone || phone,
          email: customerProfile.email || enrichedEmail || "",
          address: customerProfile.address || enrichedAddress || "",
          state: customerProfile.state || enrichedState || "",
          city: customerProfile.city || enrichedCity || "",
          assignedTo: latestPolicy.assignedTo || "Unassigned",
          createdBy: customerProfile.createdBy,
          updatedBy: customerProfile.updatedBy,
        }
      : fallbackSummary;

    return Response.json({
      success: true,
      profile: {
        ...profileData,
        customerStatus,
      },
      policies,
      companies: uniqueCompanies,
      stats: {
        totalPremium,
        totalSumInsured,
        totalPolicies: policies.length,
        policiesDue,
        totalCompanies,
      },
      timeline: remarks,
    });
  } catch (error) {
    console.error("Fetch customer profile failed:", error);
    return Response.json({ error: "Failed to load customer profile details." }, { status: 500 });
  }
}
