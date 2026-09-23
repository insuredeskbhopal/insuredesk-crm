import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOwnedPolicy, requireClient } from "@/lib/client-portal/session";
import { serializeClientPolicy } from "@/lib/client-portal/policies";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  try {
    const auth = await requireClient(request);
    if (auth.error) return auth.error;

    const { id } = await params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id || "");

    const owned = await getOwnedPolicy({
      customerId: auth.customer.id,
      organizationId: auth.organizationId,
      customer: auth.customer,
      policyId: isUuid ? id : undefined,
      policyNo: !isUuid ? id : undefined,
    });

    if (!owned) {
      return NextResponse.json({ success: false, error: "Policy not found" }, { status: 404 });
    }

    const policy = await prisma.policyRecord.findFirst({
      where: {
        id: owned.id,
        organizationId: auth.organizationId,
        deletedAt: null,
      },
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

    if (!policy) {
      return NextResponse.json({ success: false, error: "Policy not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      policy: serializeClientPolicy(policy),
    });
  } catch (error) {
    console.error("Client Policy Detail Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
