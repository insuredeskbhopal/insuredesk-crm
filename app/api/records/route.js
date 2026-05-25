import { prisma } from "@/lib/prisma";
import { normalizeRecord } from "@/lib/records";
import { requireDeleteConfirmation } from "@/lib/security";
import { sanitizeRecordPayload } from "@/lib/record-validation";
import { randomUUID } from "node:crypto";

export async function GET() {
  const records = await prisma.policyRecord.findMany({
    orderBy: { savedAt: "desc" },
    select: {
      id: true,
      savedAt: true,
      data: true,
      reviewedData: true,
      extractedData: true,
      extractionMethod: true,
      extractionQuality: true,
      extractionLog: true,
      confidenceScore: true,
      pdfFileName: true,
      pdfMimeType: true
    }
  });

  return Response.json(records.map(normalizeRecord));
}

export async function POST(request) {
  const payload = await request.json();
  const data = sanitizeRecordPayload(payload);
  const record = await prisma.policyRecord.create({
    data: {
      id: randomUUID(),
      savedAt: new Date(),
      data
    }
  });

  return Response.json(normalizeRecord(record), { status: 201 });
}

export async function DELETE(request) {
  const guard = requireDeleteConfirmation(request);
  if (guard) return guard;

  await prisma.policyRecord.deleteMany();
  return new Response(null, { status: 204 });
}
