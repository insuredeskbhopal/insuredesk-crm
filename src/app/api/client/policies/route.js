import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getClientOwnedPolicyIds, requireClient } from "@/lib/client-portal/session";
import { serializeClientPolicy } from "@/lib/client-portal/policies";

export async function GET(request) {
  try {
    const auth = await requireClient(request);
    if (auth.error) return auth.error;
    const orgId = auth.organizationId;
    const customerId = auth.customer.id;

    const matchedPolicyIds = await getClientOwnedPolicyIds({
      customerId,
      organizationId: orgId,
      customer: auth.customer,
      database: prisma,
    });

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
