import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getClientCredentialVersion } from "@/lib/client-portal/credentials";

export async function requireClient(request) {
  const token = request.cookies.get("token")?.value;
  const session = token ? await verifyJWT(token) : null;

  if (!session || session.role !== "CLIENT" || !session.customerId || session.organizationId === undefined) {
    return { error: NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 }) };
  }

  const [customer, credentialVersion] = await Promise.all([
    prisma.clientAccount.findFirst({
      where: { id: session.customerId, organizationId: session.organizationId, deletedAt: null },
      select: { id: true, name: true, phone: true, email: true, organizationId: true, createdAt: true },
    }),
    getClientCredentialVersion(session.customerId),
  ]);

  if (!customer || Number(session.credentialVersion || 0) !== credentialVersion) {
    return { error: clearClientSession() };
  }

  return { session, customer, organizationId: session.organizationId };
}

function clearClientSession() {
  const response = NextResponse.json({ success: false, error: "Client session expired" }, { status: 401 });
  response.cookies.set({
    name: "token",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}

export async function getOwnedPolicy({
  customerId,
  organizationId,
  policyId,
  policyNo,
  database = prisma,
}) {
  const rows = policyId
    ? await database.$queryRaw`
        SELECT id FROM pdf_records
        WHERE id = ${policyId}::uuid AND deleted_at IS NULL
          AND organization_id IS NOT DISTINCT FROM ${organizationId}::uuid
          AND LOWER(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId')) = LOWER(${customerId})
        LIMIT 1`
    : await database.$queryRaw`
        SELECT id FROM pdf_records
        WHERE deleted_at IS NULL
          AND organization_id IS NOT DISTINCT FROM ${organizationId}::uuid
          AND LOWER(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId')) = LOWER(${customerId})
          AND (reviewed_data->>'policyNumber' = ${policyNo} OR data->>'policyNumber' = ${policyNo})
        LIMIT 1`;

  return rows[0] || null;
}

export async function getOwnedClaim({ customer, organizationId, claimId }) {
  const cleanPhone = String(customer.phone || "").replace(/\D/g, "").slice(-10);
  if (!cleanPhone) return null;

  return prisma.claim.findFirst({
    where: {
      id: claimId,
      organizationId,
      deletedAt: null,
      mobileNo: { endsWith: cleanPhone },
      metadata: { path: ["customerId"], equals: customer.id },
    },
  });
}
