import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { normalizeRecord } from "@/lib/records";
import { withRenewalPolicyDisplay } from "@/lib/policies/type-display";
import { withRenewalCompanyDisplay } from "@/lib/renewals/companies";
import {
  sortByDaysLeftAscending,
  withRenewalWindowDisplay,
} from "@/lib/renewals/dates";
import { buildWhatsAppTimelineItems } from "@/lib/renewals/timeline";

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

    const { phone: portfolioKey } = params;
    if (!portfolioKey) {
      return Response.json({ error: "Customer portfolio parameter is required" }, { status: 400 });
    }
    const isPortfolioId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(portfolioKey);
    const cleanPhone = String(portfolioKey).replace(/[^0-9]/g, "");
    const requestedPolicyId = new URL(request.url).searchParams.get("policyId") || "";

    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const orgId = user.organizationId || null;

    // 1. Fetch matched CustomerProfile if exists
    let customerProfile = null;
    if (isPortfolioId) {
      customerProfile = await prisma.customerProfile.findFirst({
        where: {
          id: portfolioKey,
          deletedAt: null,
          ...(isSuperAdmin ? {} : { organizationId: orgId }),
        },
        include: {
          createdBy: { select: { name: true, email: true } },
          updatedBy: { select: { name: true, email: true } },
        },
      });
    } else if (!portfolioKey.startsWith("NO-MOBILE-")) {
      customerProfile = await prisma.customerProfile.findFirst({
        where: {
          phone: { contains: cleanPhone || portfolioKey },
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
    const matchedPolicyIds = isPortfolioId
      ? (
          await prisma.policyRecord.findMany({
            where: {
              customerPortfolioId: portfolioKey,
              deletedAt: null,
              ...(isSuperAdmin ? {} : { organizationId: orgId }),
            },
            select: { id: true },
          })
        ).map((row) => row.id)
      : portfolioKey.startsWith("NO-MOBILE-")
      ? [portfolioKey.replace("NO-MOBILE-", "")]
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
        customerPortfolioId: true,
        contactPersonName: true,
        contactPersonMobile: true,
        contactPersonEmail: true,
        renewalRecipientName: true,
        renewalRecipientMobile: true,
        renewalRecipientEmail: true,
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
        const normalized = withRenewalCompanyDisplay(withRenewalPolicyDisplay(normalizeRecord(record)));
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

    // An explicit policy action must never fall back to another policy for the same phone.
    // Include the requested record even when it is closed or outside the normal renewal window.
    let requestedPolicy = requestedPolicyId ? allPolicies.find((policy) => policy.id === requestedPolicyId) : null;
    if (requestedPolicyId && !requestedPolicy) {
      const fallbackRecord = await prisma.policyRecord.findFirst({
        where: { id: requestedPolicyId, deletedAt: null, ...(isSuperAdmin ? {} : { organizationId: orgId }) },
        select: {
          id: true, savedAt: true, data: true, reviewedData: true, renewalStatus: true,
          previousPolicyId: true, renewedPolicyId: true, renewalDate: true, lostReason: true,
          isActivePolicy: true, selectedCompany: true, selectedPolicyType: true, pdfFileName: true,
          createdAt: true, updatedAt: true, createdBy: { select: { name: true, email: true } },
          customerPortfolioId: true, contactPersonName: true, contactPersonMobile: true,
          contactPersonEmail: true, renewalRecipientName: true, renewalRecipientMobile: true,
          renewalRecipientEmail: true,
        },
      });
      if (fallbackRecord) {
        const normalized = withRenewalCompanyDisplay(withRenewalPolicyDisplay(normalizeRecord(fallbackRecord)));
        requestedPolicy = await enrichPolicy(withRenewalWindowDisplay(normalized));
      }
    }
    if (requestedPolicy) {
      policies = [requestedPolicy, ...policies.filter((policy) => policy.id !== requestedPolicy.id)];
    }

    const whatsappLogs = policies.length
      ? await prisma.auditLog.findMany({
          where: {
            action: "WHATSAPP_REMINDER_SENT",
            entityType: "PolicyRecord",
            entityId: { in: policies.map((policy) => policy.id) },
            ...(isSuperAdmin ? {} : { organizationId: orgId }),
          },
          select: {
            id: true,
            entityId: true,
            createdAt: true,
            metadata: true,
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : [];
    const whatsappSentAtByPolicy = new Map();
    whatsappLogs.forEach((log) => {
      if (log.entityId && !whatsappSentAtByPolicy.has(log.entityId)) {
        whatsappSentAtByPolicy.set(log.entityId, log.createdAt);
      }
    });
    policies = policies.map((policy) => ({
      ...policy,
      whatsappMessageSentAt: whatsappSentAtByPolicy.get(policy.id) || null,
    }));

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
    remarks.push(...buildWhatsAppTimelineItems(whatsappLogs, policies));

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

    // Contact details belong to the phone portfolio, so include history outside
    // the current renewal window when choosing the display contact.
    for (const p of allPolicies) {
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
      phone: portfolioKey.startsWith("NO-MOBILE-") ? "Not Available" : portfolioKey,
      email: enrichedEmail || "",
      address: enrichedAddress || "",
      state: enrichedState || "",
      city: enrichedCity || "",
      assignedTo: latestPolicy.assignedTo || "Unassigned",
    };

    const profileData = customerProfile
      ? {
          name:
            customerProfile.name ||
            enrichedName ||
            customerProfile.contactPersonName ||
            enrichedContactPerson ||
            "Unknown Contact",
          contactPerson:
            customerProfile.contactPersonName ||
            enrichedContactPerson ||
            customerProfile.name ||
            "Contact not available",
          phone: customerProfile.phone || portfolioKey,
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
        id: customerProfile?.id || policies[0]?.customerPortfolioId || "",
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
