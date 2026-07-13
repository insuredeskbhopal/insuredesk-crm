import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";

export async function requireClient(request) {
  const token = request.cookies.get("token")?.value;
  const session = token ? await verifyJWT(token) : null;

  if (!session || session.role !== "CLIENT" || !session.customerId || session.organizationId === undefined) {
    return { error: NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 }) };
  }

  const customer = await prisma.clientAccount.findFirst({
    where: { id: session.customerId, organizationId: session.organizationId, deletedAt: null },
    select: { id: true, name: true, phone: true, email: true, organizationId: true },
  });

  if (!customer) {
    return { error: NextResponse.json({ success: false, error: "Client account not found" }, { status: 404 }) };
  }

  return { session, customer, organizationId: session.organizationId };
}

export async function getOwnedPolicy({ customerId, organizationId, policyId, policyNo }) {
  const rows = policyId
    ? await prisma.$queryRaw`
        SELECT id FROM pdf_records
        WHERE id = ${policyId}::uuid AND deleted_at IS NULL
          AND organization_id IS NOT DISTINCT FROM ${organizationId}::uuid
          AND (reviewed_data->>'clientId' = ${customerId} OR data->>'clientId' = ${customerId})
        LIMIT 1`
    : await prisma.$queryRaw`
        SELECT id FROM pdf_records
        WHERE deleted_at IS NULL
          AND organization_id IS NOT DISTINCT FROM ${organizationId}::uuid
          AND (reviewed_data->>'clientId' = ${customerId} OR data->>'clientId' = ${customerId})
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
