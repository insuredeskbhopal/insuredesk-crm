import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireClient } from "@/lib/client-portal/session";

export async function GET(request) {
  try {
    const auth = await requireClient(request);
    if (auth.error) return auth.error;
    const orgId = auth.organizationId;
    const customerId = auth.customer.id;
    const clientPhone = (auth.customer.phone || "").replace(/[^0-9]/g, "").slice(-10);
    const clientName = (auth.customer.name || "").trim();

    // Fetch matched policy IDs from DB via SQL query (matching clientId, contactNumber, mobileNumber, or insuredName)
    const matchedRows = await prisma.$queryRaw`
        SELECT id
        FROM pdf_records
        WHERE deleted_at IS NULL
          AND organization_id IS NOT DISTINCT FROM ${orgId}::uuid
          AND (
            LOWER(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId', '')) = LOWER(${customerId})
            OR (${clientPhone} != '' AND COALESCE(NULLIF(reviewed_data->>'contactNumber', ''), data->>'contactNumber', '') LIKE ${'%' + clientPhone + '%'})
            OR (${clientPhone} != '' AND COALESCE(NULLIF(reviewed_data->>'mobileNumber', ''), data->>'mobileNumber', '') LIKE ${'%' + clientPhone + '%'})
            OR (${clientPhone} != '' AND COALESCE(NULLIF(reviewed_data->>'phone', ''), data->>'phone', '') LIKE ${'%' + clientPhone + '%'})
            OR (${clientName} != '' AND LOWER(COALESCE(NULLIF(reviewed_data->>'insuredName', ''), data->>'insuredName', '')) = LOWER(${clientName}))
          )
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
        uploadedFileId: true,
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

    const hasDocument = Boolean(policy.pdfFileName || policy.uploadedFileId);

    return {
      ...payload,
      id: policy.id,
      savedAt: policy.savedAt,
      selectedCompany: policy.selectedCompany || payload.insuranceCompany || "",
      selectedPolicyType: policy.selectedPolicyType || payload.policyType || "",
      isActivePolicy: policy.isActivePolicy,
      renewalDate: policy.renewalDate,
      renewalStatus: policy.renewalStatus,
      documents: {
        policyPdf: hasDocument,
        certificate: hasDocument,
        premiumReceipt: Boolean(payload.receiptNumber || payload.paymentReference),
        renewedPolicy: Boolean(policy.renewalStatus === "RENEWED" && hasDocument),
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
