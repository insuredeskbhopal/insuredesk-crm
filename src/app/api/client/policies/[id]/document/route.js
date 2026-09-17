import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import fs from "fs/promises";
import { prisma } from "@/lib/db/prisma";
import { getOwnedPolicy, requireClient } from "@/lib/client-portal/session";
import { getLocalPhysicalPath, getSignedUrl } from "@/lib/storage";
import { downloadGoogleDriveFile } from "@/lib/storage/google-drive-storage";

export const runtime = "nodejs";

function sanitizeFileName(name) {
  return (name || "policy.pdf")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");
}

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
    if (!owned) return NextResponse.json({ success: false, error: "Policy not found" }, { status: 404 });

    const policy = await prisma.policyRecord.findUnique({
      where: { id: owned.id },
      include: { uploadedFile: true },
    });
    if (!policy) return NextResponse.json({ success: false, error: "Policy not found" }, { status: 404 });

    const payload = policy.reviewedData || policy.data || {};
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
      const receiptBuffer = Buffer.from(doc.output("arraybuffer"));
      return new Response(receiptBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="premium-receipt-${payload.policyNumber || id}.pdf"`,
          "Content-Length": String(receiptBuffer.length),
          "Cache-Control": "private, no-store",
        },
      });
    }

    const uploadedFile = policy.uploadedFile;
    const suffix = kind === "certificate" ? "certificate" : "policy";
    const rawName = policy.pdfFileName || uploadedFile?.sourceFile || `${payload.policyNumber || id}.pdf`;
    const fileName = sanitizeFileName(kind === "certificate" ? `${suffix}-${rawName}` : rawName);

    // 1. Direct database BLOB on PolicyRecord
    if (policy.pdfBytes && policy.pdfBytes.length > 0) {
      return new Response(Buffer.from(policy.pdfBytes), {
        headers: {
          "Content-Type": policy.pdfMimeType || "application/pdf",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": String(policy.pdfBytes.length),
          "Cache-Control": "private, no-store",
        },
      });
    }

    // 2. Database BLOB on UploadedFile
    if (uploadedFile?.pdfBytes && uploadedFile.pdfBytes.length > 0) {
      return new Response(Buffer.from(uploadedFile.pdfBytes), {
        headers: {
          "Content-Type": uploadedFile.mimeType || "application/pdf",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": String(uploadedFile.pdfBytes.length),
          "Cache-Control": "private, no-store",
        },
      });
    }

    // 3. Storage Provider (Google Drive, Local Disk, or Cloud)
    if (uploadedFile?.storagePath) {
      if (uploadedFile.storageProvider === "google_drive") {
        try {
          const fileBuffer = await downloadGoogleDriveFile(uploadedFile.storagePath);
          return new Response(fileBuffer, {
            headers: {
              "Content-Type": uploadedFile.mimeType || "application/pdf",
              "Content-Disposition": `attachment; filename="${fileName}"`,
              "Content-Length": String(fileBuffer.length),
              "Cache-Control": "private, no-store",
            },
          });
        } catch (driveErr) {
          console.error("Google Drive download error for client policy document:", driveErr);
        }
      } else if (uploadedFile.storageProvider === "local" || !uploadedFile.storageProvider) {
        try {
          const physicalPath = getLocalPhysicalPath(uploadedFile.storagePath);
          const fileBuffer = await fs.readFile(physicalPath);
          return new Response(fileBuffer, {
            headers: {
              "Content-Type": uploadedFile.mimeType || "application/pdf",
              "Content-Disposition": `attachment; filename="${fileName}"`,
              "Content-Length": String(fileBuffer.length),
              "Cache-Control": "private, no-store",
            },
          });
        } catch (fsErr) {
          console.error("Local file read error for client policy document:", fsErr);
        }
      } else {
        try {
          const signedUrl = await getSignedUrl(uploadedFile.storagePath);
          return NextResponse.redirect(signedUrl);
        } catch (cloudErr) {
          console.error("Cloud signed URL error for client policy document:", cloudErr);
        }
      }
    }

    return NextResponse.json({ success: false, error: "Policy document is not available yet" }, { status: 404 });
  } catch (error) {
    console.error("Client policy document error:", error);
    return NextResponse.json({ success: false, error: "Document could not be downloaded" }, { status: 500 });
  }
}
