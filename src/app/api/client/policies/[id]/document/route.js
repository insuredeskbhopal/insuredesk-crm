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

function isHtmlAccepted(request) {
  return (request.headers.get("accept") || "").includes("text/html");
}

function htmlErrorResponse(title, message, status = 404) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}.card{background:#fff;border-radius:16px;padding:40px;max-width:440px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}.icon{font-size:48px;margin-bottom:16px}h1{font-size:20px;color:#0f172a;margin-bottom:8px}p{color:#64748b;font-size:14px;line-height:1.6}a{display:inline-block;margin-top:20px;padding:10px 24px;background:#1d4ed8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px}a:hover{background:#1e40af}</style></head><body><div class="card"><div class="icon">📄</div><h1>${title}</h1><p>${message}</p><a href="/">Go to BimaHeadquarter</a></div></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function HEAD(request, { params }) {
  try {
    const auth = await requireClient(request);
    if (auth.error) return new Response(null, { status: 401 });

    const { id } = await params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id || "");

    const owned = await getOwnedPolicy({
      customerId: auth.customer.id,
      organizationId: auth.organizationId,
      customer: auth.customer,
      policyId: isUuid ? id : undefined,
      policyNo: !isUuid ? id : undefined,
    });
    if (!owned) return new Response(null, { status: 404 });

    const kind = new URL(request.url).searchParams.get("kind") || "policy";
    if (kind === "receipt") return new Response(null, { status: 200 });

    // Efficient check: query byte lengths without loading actual blobs
    const [availability] = await prisma.$queryRaw`
      SELECT
        COALESCE(length(pr.pdf_bytes), 0) as pr_bytes,
        COALESCE(length(uf.pdf_bytes), 0) as uf_bytes,
        uf.storage_path as uf_storage
      FROM pdf_records pr
      LEFT JOIN uploaded_files uf ON uf.id = pr.uploaded_file_id
      WHERE pr.id = ${owned.id}::uuid
      LIMIT 1
    `;
    if (!availability) return new Response(null, { status: 404 });

    const hasDocument = availability.pr_bytes > 0 || availability.uf_bytes > 0 || Boolean(availability.uf_storage);
    return new Response(null, { status: hasDocument ? 200 : 404 });
  } catch (error) {
    console.error("Client policy document HEAD error:", error);
    return new Response(null, { status: 500 });
  }
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

    if (isHtmlAccepted(request)) {
      return htmlErrorResponse("Document Not Available", "The PDF for this policy has not been uploaded yet. Please contact your insurance agent or visit our office for assistance.");
    }
    return NextResponse.json({ success: false, error: "Policy document is not available yet" }, { status: 404 });
  } catch (error) {
    console.error("Client policy document error:", error);
    if (isHtmlAccepted(request)) {
      return htmlErrorResponse("Download Error", "Something went wrong while preparing your document. Please try again later.", 500);
    }
    return NextResponse.json({ success: false, error: "Document could not be downloaded" }, { status: 500 });
  }
}
