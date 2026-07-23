import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireClient } from "@/lib/client-portal/session";
import {
  findActiveClientAccount,
  withClientIdLock,
  withPolicyRecordLock,
} from "@/lib/client-accounts/server";

export async function GET(request) {
  try {
    const auth = await requireClient(request);
    if (auth.error) return auth.error;
    const customerId = auth.customer.id;
    const orgId = auth.organizationId;
    const customer = auth.customer;

    const cleanPhone = String(customer.phone || "").replace(/[^0-9]/g, "");
    const phoneSuffix = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : "";

    const policyRows = await getClientPolicyRows({ orgId, customerId });
    const policyNumbers = policyRows
      .map((row) => row.policy_number)
      .filter(Boolean);

    const legacyOwnership =
      phoneSuffix && policyNumbers.length
        ? { policyNo: { in: policyNumbers }, mobileNo: { endsWith: phoneSuffix } }
        : null;
    const claims = await prisma.claim.findMany({
      where: {
        deletedAt: null,
        organizationId: orgId,
        OR: [
          { metadata: { path: ["customerId"], equals: customerId } },
          ...(legacyOwnership ? [legacyOwnership] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        claimNo: true,
        policyNo: true,
        claimType: true,
        claimStatus: true,
        claimDescription: true,
        claimDate: true,
        followUpDate: true,
        currentRemark: true,
        createdAt: true,
        updatedAt: true,
        mobileNo: true,
        metadata: true,
        remarks: {
          orderBy: { createdAt: "asc" },
          select: { id: true, text: true, followUpDate: true, createdAt: true },
        },
        documents: {
          orderBy: { uploadedAt: "desc" },
          select: { id: true, name: true, fileName: true, fileType: true, size: true, uploadedAt: true },
        },
      },
    });

    const ownedClaims = claims
      .filter((claim) => {
        const storedCustomerId = String(claim.metadata?.customerId || "");
        if (storedCustomerId) return storedCustomerId === customerId;
        return Boolean(
          legacyOwnership &&
            policyNumbers.includes(claim.policyNo) &&
            String(claim.mobileNo || "").replace(/\D/g, "").endsWith(phoneSuffix),
        );
      })
      .map((claim) => {
        const publicClaim = { ...claim };
        delete publicClaim.metadata;
        delete publicClaim.mobileNo;
        return publicClaim;
      });

    return NextResponse.json({ success: true, claims: ownedClaims });
  } catch (error) {
    console.error("Client Claims Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireClient(request);
    if (auth.error) return auth.error;
    const customerId = auth.customer.id;
    const orgId = auth.organizationId;

    const payload = await request.json();
    const { policyNo, insuranceCompany, claimType, claimDescription, claimDate } = payload;

    if (!policyNo || !claimType) {
      return NextResponse.json({ success: false, error: "Policy number and claim type are required." }, { status: 400 });
    }

    const policy = await getClientPolicyRows({ orgId, customerId, policyNo });

    if (!policy.length) {
      return NextResponse.json({ success: false, error: "Policy not found for this client." }, { status: 403 });
    }

    // Generate a unique claim number
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/[^0-9]/g, "");
    const rand = Math.floor(1000 + Math.random() * 9000);
    const claimNo = `CLM-CLI-${datePrefix}-${rand}`;

    const claimResult = await withPolicyRecordLock(policy[0].id, async (policyDatabase) => {
      const currentPolicy = await getClientPolicyRows({
        orgId,
        customerId,
        policyNo,
        policyId: policy[0].id,
        database: policyDatabase,
      });
      if (!currentPolicy.length) return { ownershipLost: true };

      return withClientIdLock(
        customerId,
        async (database) => {
          const activeCustomer = await findActiveClientAccount(customerId, orgId, database);
          if (!activeCustomer) return { inactiveCustomer: true };

          return {
            claim: await database.claim.create({
              data: {
                insuredName: activeCustomer.name || "Client",
                mobileNo: activeCustomer.phone || "",
                policyNo,
                claimNo,
                claimType,
                claimDescription: claimDescription || "",
                claimDate: claimDate ? new Date(claimDate) : new Date(),
                claimStatus: "Open",
                organizationId: orgId,
                metadata: {
                  insuranceCompany: insuranceCompany || "",
                  customerId,
                },
              },
            }),
          };
        },
        policyDatabase,
      );
    });
    if (claimResult.ownershipLost) {
      return NextResponse.json(
        { success: false, error: "Policy not found for this client." },
        { status: 403 },
      );
    }
    if (claimResult.inactiveCustomer) {
      return NextResponse.json(
        { success: false, error: "Client account is no longer active." },
        { status: 401 },
      );
    }
    const newClaim = claimResult.claim;

    return NextResponse.json({ success: true, claim: newClaim });
  } catch (error) {
    console.error("Client Initiate Claim Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

function getClientPolicyRows({ orgId, customerId, policyNo = "", policyId = "", database = prisma }) {
  if (policyId) {
    return database.$queryRaw`
      SELECT id, COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber') AS policy_number
      FROM pdf_records
      WHERE id = ${policyId}::uuid
        AND deleted_at IS NULL
        AND organization_id IS NOT DISTINCT FROM ${orgId}::uuid
        AND LOWER(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId')) = LOWER(${customerId})
        AND (
          reviewed_data->>'policyNumber' = ${policyNo} OR
          data->>'policyNumber' = ${policyNo}
        )
      LIMIT 1
    `;
  }
  if (policyNo) {
    return database.$queryRaw`
      SELECT id, COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber') AS policy_number
      FROM pdf_records
      WHERE deleted_at IS NULL
        AND organization_id IS NOT DISTINCT FROM ${orgId}::uuid
        AND LOWER(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId')) = LOWER(${customerId})
        AND (
          reviewed_data->>'policyNumber' = ${policyNo} OR
          data->>'policyNumber' = ${policyNo}
        )
      LIMIT 1
    `;
  }

  return database.$queryRaw`
    SELECT id, COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber') AS policy_number
    FROM pdf_records
    WHERE deleted_at IS NULL
      AND organization_id IS NOT DISTINCT FROM ${orgId}::uuid
      AND LOWER(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId')) = LOWER(${customerId})
  `;
}
