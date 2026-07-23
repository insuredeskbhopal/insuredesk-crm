import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireClient } from "@/lib/client-portal/session";

export const runtime = "nodejs";
const MAX_FILE_SIZE = 8 * 1024 * 1024;

async function findOwnedClaim({ id, customer, organizationId }) {
  const claim = await prisma.claim.findFirst({
    where: { id, organizationId, deletedAt: null },
  });
  if (!claim) return null;

  const storedCustomerId = String(claim.metadata?.customerId || "");
  if (storedCustomerId) return storedCustomerId === customer.id ? claim : null;

  const phone = String(customer.phone || "").replace(/\D/g, "").slice(-10);
  if (!phone) return null;

  const policies = await prisma.$queryRaw`
    SELECT COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber') AS policy_number
    FROM pdf_records
    WHERE deleted_at IS NULL AND organization_id IS NOT DISTINCT FROM ${organizationId}::uuid
      AND LOWER(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId')) = LOWER(${customer.id})`;

  const policyNumbers = policies.map((item) => item.policy_number).filter(Boolean);
  return policyNumbers.includes(claim.policyNo) &&
    String(claim.mobileNo || "").replace(/\D/g, "").endsWith(phone)
    ? claim
    : null;
}

export async function POST(request, { params }) {
  try {
    const auth = await requireClient(request);
    if (auth.error) return auth.error;
    const { id } = await params;
    const claim = await findOwnedClaim({ id, customer: auth.customer, organizationId: auth.organizationId });
    if (!claim) return NextResponse.json({ success: false, error: "Claim not found" }, { status: 404 });

    const form = await request.formData();
    const file = form.get("file");
    const name = String(form.get("name") || "Claim document").slice(0, 120);
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ success: false, error: "Select a document to upload" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: "Maximum file size is 8 MB" }, { status: 400 });
    }
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      return NextResponse.json({ success: false, error: "Only images and PDF files are accepted" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const document = await prisma.claimDocument.create({
      data: {
        claimId: claim.id,
        name,
        fileName: file.name.slice(0, 220),
        fileType: file.type,
        size: file.size,
        dataUrl: `data:${file.type};base64,${bytes.toString("base64")}`,
      },
      select: { id: true, name: true, fileName: true, fileType: true, size: true, uploadedAt: true },
    });

    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error("Client claim upload error:", error);
    return NextResponse.json({ success: false, error: "Document could not be uploaded" }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  try {
    const auth = await requireClient(request);
    if (auth.error) return auth.error;
    const { id } = await params;
    const claim = await findOwnedClaim({ id, customer: auth.customer, organizationId: auth.organizationId });
    if (!claim) return NextResponse.json({ success: false, error: "Claim not found" }, { status: 404 });

    const documentId = new URL(request.url).searchParams.get("documentId");
    const document = await prisma.claimDocument.findFirst({ where: { id: documentId, claimId: claim.id } });
    if (!document) return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });

    const match = document.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return NextResponse.json({ success: false, error: "Document data is invalid" }, { status: 500 });
    return new Response(Buffer.from(match[2], "base64"), {
      headers: {
        "Content-Type": document.fileType || match[1],
        "Content-Disposition": `attachment; filename="${document.fileName.replace(/[\r\n"]/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Client claim download error:", error);
    return NextResponse.json({ success: false, error: "Document could not be downloaded" }, { status: 500 });
  }
}
