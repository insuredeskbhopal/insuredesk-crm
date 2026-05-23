import { prisma } from "@/lib/prisma";
import { requireAdmin, securityHeaders } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  const guard = requireAdmin(_request);
  if (guard) return guard;

  const { id } = await params;

  const record = await prisma.policyRecord.findUnique({
    where: { id },
    select: {
      pdfBytes: true,
      pdfFileName: true,
      pdfMimeType: true,
      data: true
    }
  });

  if (!record?.pdfBytes) {
    return Response.json({ error: "PDF file not found for this record." }, { status: 404 });
  }

  const payload = record.data || {};
  const fileName = sanitizeFileName(record.pdfFileName || payload.sourceFile || "policy.pdf");
  const bytes = record.pdfBytes instanceof Uint8Array ? record.pdfBytes : new Uint8Array(record.pdfBytes);

  return new Response(bytes, {
    headers: {
      ...securityHeaders,
      "Content-Type": record.pdfMimeType || "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(bytes.byteLength)
    }
  });
}

function sanitizeFileName(value) {
  return String(value || "policy.pdf")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}
