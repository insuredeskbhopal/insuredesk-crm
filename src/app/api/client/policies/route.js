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

    const customerId = session.customerId;
    const orgId = session.organizationId;

    // Fetch the client's phone number from CustomerProfile
    const customer = await prisma.customerProfile.findUnique({
      where: { id: customerId },
      select: { phone: true, organizationId: true }
    });

    if (!customer || !customer.phone) {
      return NextResponse.json({ success: true, policies: [] });
    }

    // Clean phone number (last 10 digits)
    const cleanPhone = customer.phone.replace(/[^0-9]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json({ success: true, policies: [] });
    }
    const phoneSuffix = cleanPhone.slice(-10);

    // Fetch matched policy IDs from DB via SQL query (matching JSON properties safely)
    const matchedRows = await prisma.$queryRawUnsafe(
      `
        SELECT id
        FROM pdf_records
        WHERE deleted_at IS NULL
          AND organization_id IS NOT DISTINCT FROM $1::uuid
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
          ), '[^0-9]', '', 'g'), 10) = $2
      `,
      orgId,
      phoneSuffix
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
