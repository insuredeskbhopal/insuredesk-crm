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
    if (!session || session.role !== "CLIENT" || !session.customerId) {
      return NextResponse.json({ success: false, error: "Access Denied" }, { status: 403 });
    }

    const orgId = session.organizationId;

    const customerId = session.customerId;

    // Fetch matched policy IDs from DB via SQL query (matching manually entered clientId JSON property)
    const matchedRows = await prisma.$queryRawUnsafe(
      `
        SELECT id
        FROM pdf_records
        WHERE deleted_at IS NULL
          AND organization_id IS NOT DISTINCT FROM $1::uuid
          AND (
            reviewed_data->>'clientId' = $2 OR
            data->>'clientId' = $2
          )
      `,
      orgId,
      customerId
    );

    const matchedPolicyIds = matchedRows.map((row) => row.id);

    if (matchedPolicyIds.length === 0) {
      return NextResponse.json({ success: true, policies: [] });
    }

    const policies = await prisma.policyRecord.findMany({
      where: {
        id: { in: matchedPolicyIds },
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
        pdfFileName: true,
        isActivePolicy: true,
        renewalDate: true,
        renewalStatus: true,
      }
    });

    return NextResponse.json({ success: true, policies });
  } catch (error) {
    console.error("Client Policies Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
