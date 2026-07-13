import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { prisma } from "@/lib/db/prisma";
import { getOwnedPolicy, requireClient } from "@/lib/client-portal/session";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  try {
    const auth = await requireClient(request);
    if (auth.error) return auth.error;

    const { id } = await params;
    const owned = await getOwnedPolicy({
      customerId: auth.customer.id,
      organizationId: auth.organizationId,
      policyId: id,
    });
    if (!owned) return NextResponse.json({ success: false, error: "Policy not found" }, { status: 404 });

    const policy = await prisma.policyRecord.findUnique({
      where: { id },
      select: { pdfBytes: true, pdfFileName: true, pdfMimeType: true, reviewedData: true, data: true },
    });
    const payload = policy?.reviewedData || policy?.data || {};
    const kind = new URL(request.url).searchParams.get("kind") || "policy";

    if (kind === "receipt") {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Premium Receipt", 20, 24);
      doc.setFontSize(11);
      const rows = [
        ["Client", auth.customer.name],
        ["Policy number", payload.policyNumber || "-"],
        ["Insurance company", payload.insuranceCompany || "-"],
        ["Premium", String(payload.totalPremium || payload.premium || "-")],
        ["Receipt number", payload.receiptNumber || payload.paymentReference || "Not provided"],
        ["Receipt date", payload.receiptDate || "Not provided"],
      ];
      rows.forEach(([label, value], index) => doc.text(`${label}: ${value}`, 20, 42 + index * 9));
      doc.setFontSize(9);
      doc.text("Generated from the secured client portal. Verify with the insurer for statutory use.", 20, 110);
      return new Response(Buffer.from(doc.output("arraybuffer")), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="premium-receipt-${payload.policyNumber || id}.pdf"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    if (!policy?.pdfBytes) {
      return NextResponse.json({ success: false, error: "Policy document is not available yet" }, { status: 404 });
    }

    const suffix = kind === "certificate" ? "certificate" : "policy";
    const originalName = policy.pdfFileName || `${payload.policyNumber || id}.pdf`;
    const fileName = kind === "certificate" ? `${suffix}-${originalName}` : originalName;
    return new Response(Buffer.from(policy.pdfBytes), {
      headers: {
        "Content-Type": policy.pdfMimeType || "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName.replace(/[\r\n"]/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Client policy document error:", error);
    return NextResponse.json({ success: false, error: "Document could not be downloaded" }, { status: 500 });
  }
}
