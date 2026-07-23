import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireClient } from "@/lib/client-portal/session";

export async function GET(request) {
  try {
    const auth = await requireClient(request);
    if (auth.error) return auth.error;
    const orgId = auth.organizationId;
    const customerId = auth.customer.id;

    // Fetch matched policy IDs from DB via SQL query (matching manually entered clientId JSON property)
    const matchedRows = await prisma.$queryRaw`
        SELECT id
        FROM pdf_records
        WHERE deleted_at IS NULL
          AND organization_id IS NOT DISTINCT FROM ${orgId}::uuid
          AND LOWER(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId')) = LOWER(${customerId})
      `;

    const matchedPolicyIds = matchedRows.map((row) => row.id);

    if (matchedPolicyIds.length === 0) {
      return NextResponse.json({ success: true, policies: [] });
    }

    const policies = await prisma.policyRecord.findMany({
      where: {
        id: { in: matchedPolicyIds },
        organizationId: orgId,
        deletedAt: null,
      },
      orderBy: { savedAt: "desc" },
      select: {
        id: true,
        savedAt: true,
        pdfFileName: true,
        pdfMimeType: true,
        reviewedData: true,
        data: true,
        selectedCompany: true,
        selectedPolicyType: true,
        isActivePolicy: true,
        renewalDate: true,
        renewalStatus: true,
      },
    });

    return NextResponse.json({ success: true, policies: policies.map(serializeClientPolicy) });
  } catch (error) {
    console.error("Client Policies Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

const CLIENT_POLICY_FIELDS = [
  "policyNumber",
  "policyType",
  "insuranceCompany",
  "premium",
  "totalPremium",
  "sumInsured",
  "startDate",
  "expiryDate",
  "policyExpiryDate",
  "vehicleNumber",
  "registrationNumber",
  "makeModel",
  "idv",
  "insuredName",
  "contactPerson",
  "contactNumber",
  "coverType",
  "duration",
  "make",
  "model",
  "variant",
  "engineNumber",
  "chassisNumber",
  "rtoLocation",
  "fuelType",
  "ncb",
  "nomineeName",
  "nomineeRelationship",
  "receiptNumber",
  "receiptDate",
  "paymentReference",
  "paymentLink",
  "netPremium",
  "gstAmount",
  "ownDamagePremium",
  "thirdPartyPremium",
  "personalAccidentCover",
  "deductible",
  "voluntaryDeductible",
  "geographicalArea",
  "addOns",
  "addons",
  "coverageDetails",
  "policyTerms",
];

function serializeClientPolicy(policy) {
  const payload = buildClientPolicyPayload(policy.reviewedData || policy.data || {});

  return {
    id: policy.id,
    savedAt: policy.savedAt,
    selectedCompany: policy.selectedCompany || payload.insuranceCompany || "",
    selectedPolicyType: policy.selectedPolicyType || payload.policyType || "",
    isActivePolicy: policy.isActivePolicy,
    renewalDate: policy.renewalDate,
    renewalStatus: policy.renewalStatus,
    documents: {
      policyPdf: Boolean(policy.pdfFileName),
      certificate: Boolean(policy.pdfFileName),
      premiumReceipt: Boolean(payload.receiptNumber || payload.paymentReference),
      renewedPolicy: Boolean(policy.renewalStatus === "RENEWED" && policy.pdfFileName),
    },
    reviewedData: payload,
    data: payload,
  };
}

function buildClientPolicyPayload(source = {}) {
  return CLIENT_POLICY_FIELDS.reduce((payload, key) => {
    payload[key] = source?.[key] || "";
    return payload;
  }, {});
}
