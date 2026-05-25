import { prisma } from "@/lib/prisma";
import { normalizeRecord } from "@/lib/records";

export const runtime = "nodejs";

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const payload = await request.json();
    const existing = await prisma.policyRecord.findUnique({ where: { id } });

    if (!existing) {
      return Response.json({ error: "Policy record not found." }, { status: 404 });
    }

    const reviewedData = payload.reviewedData || payload.extractedData || existing.reviewedData || existing.extractedData || {};
    const record = await prisma.policyRecord.update({
      where: { id },
      data: {
        reviewedData,
        extractedData: payload.extractedData || existing.extractedData,
        selectedBankSource: payload.selectedBankSource ?? existing.selectedBankSource,
        selectedCompany: payload.selectedCompany ?? existing.selectedCompany,
        selectedServiceCategory: payload.selectedServiceCategory ?? existing.selectedServiceCategory,
        selectedPolicyType: payload.selectedPolicyType ?? existing.selectedPolicyType,
        data: { ...(existing.data || {}), ...reviewedData }
      }
    });

    return Response.json(normalizeRecord(record));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Policy record could not be updated." }, { status: 400 });
  }
}

export async function DELETE(_request, { params }) {
  const { id } = await params;
  await prisma.policyRecord.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
