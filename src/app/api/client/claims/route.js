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
    if (
      !session ||
      session.role !== "CLIENT" ||
      !session.customerId ||
      session.organizationId === undefined
    ) {
      return NextResponse.json({ success: false, error: "Access Denied" }, { status: 403 });
    }

    const customerId = session.customerId;
    const orgId = session.organizationId;

    // Fetch the client's phone number
    const customer = await prisma.clientAccount.findFirst({
      where: {
        id: customerId,
        organizationId: orgId,
        deletedAt: null,
      },
      select: { phone: true },
    });

    if (!customer || !customer.phone) {
      return NextResponse.json({ success: true, claims: [] });
    }

    // Clean phone number (last 10 digits)
    const cleanPhone = customer.phone.replace(/[^0-9]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json({ success: true, claims: [] });
    }
    const phoneSuffix = cleanPhone.slice(-10);

    const policyRows = await getClientPolicyRows({ orgId, customerId });
    const policyNumbers = policyRows
      .map((row) => row.policy_number)
      .filter(Boolean);

    if (!policyNumbers.length) {
      return NextResponse.json({ success: true, claims: [] });
    }

    // Fetch claims matching this customer's own policy numbers and mobile number.
    const claims = await prisma.claim.findMany({
      where: {
        deletedAt: null,
        organizationId: orgId,
        policyNo: { in: policyNumbers },
        mobileNo: {
          endsWith: phoneSuffix,
        },
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
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, claims });
  } catch (error) {
    console.error("Client Claims Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (
      !session ||
      session.role !== "CLIENT" ||
      !session.customerId ||
      session.organizationId === undefined
    ) {
      return NextResponse.json({ success: false, error: "Access Denied" }, { status: 403 });
    }

    const customerId = session.customerId;
    const orgId = session.organizationId;

    const customer = await prisma.clientAccount.findFirst({
      where: {
        id: customerId,
        organizationId: orgId,
        deletedAt: null,
      },
      select: { name: true, phone: true },
    });

    if (!customer) {
      return NextResponse.json({ success: false, error: "Client account not found" }, { status: 404 });
    }

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

    const newClaim = await prisma.claim.create({
      data: {
        insuredName: customer.name || "Client",
        mobileNo: customer.phone || "",
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
    });

    return NextResponse.json({ success: true, claim: newClaim });
  } catch (error) {
    console.error("Client Initiate Claim Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

function getClientPolicyRows({ orgId, customerId, policyNo = "" }) {
  if (policyNo) {
    return prisma.$queryRaw`
      SELECT id, COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber') AS policy_number
      FROM pdf_records
      WHERE deleted_at IS NULL
        AND organization_id IS NOT DISTINCT FROM ${orgId}::uuid
        AND (
          reviewed_data->>'clientId' = ${customerId} OR
          data->>'clientId' = ${customerId}
        )
        AND (
          reviewed_data->>'policyNumber' = ${policyNo} OR
          data->>'policyNumber' = ${policyNo}
        )
      LIMIT 1
    `;
  }

  return prisma.$queryRaw`
    SELECT id, COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber') AS policy_number
    FROM pdf_records
    WHERE deleted_at IS NULL
      AND organization_id IS NOT DISTINCT FROM ${orgId}::uuid
      AND (
        reviewed_data->>'clientId' = ${customerId} OR
        data->>'clientId' = ${customerId}
      )
  `;
}
