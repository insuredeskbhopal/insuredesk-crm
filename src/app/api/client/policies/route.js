import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session || session.role !== "CLIENT" || !session.customerId || !session.organizationId) {
      return NextResponse.json({ success: false, error: "Access Denied" }, { status: 403 });
    }

    const orgId = session.organizationId;
    const customerId = session.customerId;

    const customer = await prisma.clientAccount.findFirst({
      where: {
        id: customerId,
        organizationId: orgId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!customer) {
      return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
    }

    // Fetch matched policy IDs from DB via SQL query (matching manually entered clientId JSON property)
    const matchedRows = await prisma.$queryRaw`
        SELECT id
        FROM pdf_records
        WHERE deleted_at IS NULL
          AND organization_id IS NOT DISTINCT FROM ${orgId}::uuid
          AND (
            reviewed_data->>'clientId' = ${customerId} OR
            data->>'clientId' = ${customerId}
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
