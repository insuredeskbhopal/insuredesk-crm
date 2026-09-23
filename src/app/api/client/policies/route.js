import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireClient } from "@/lib/client-portal/session";
import { serializeClientPolicy } from "@/lib/client-portal/policies";

export async function GET(request) {
  try {
    const auth = await requireClient(request);
    if (auth.error) return auth.error;
    const orgId = auth.organizationId;
    const customerId = auth.customer.id;
    const clientPhone = (auth.customer.phone || "").replace(/[^0-9]/g, "").slice(-10);

    // Fetch matched policy IDs from DB via SQL query (strictly matching clientId or verified contact phone)
    // Strictly filter for policies with real PDF extraction data (attached PDF file / PDF bytes), excluding Excel imports.
    const matchedRows = await prisma.$queryRaw`
        SELECT id
        FROM pdf_records
        WHERE deleted_at IS NULL
          AND organization_id IS NOT DISTINCT FROM ${orgId}::uuid
          AND (
            (uploaded_file_id IS NOT NULL OR (pdf_bytes IS NOT NULL AND length(pdf_bytes) > 0))
            AND LOWER(COALESCE(pdf_file_name, '')) NOT LIKE '%.xlsx'
            AND LOWER(COALESCE(pdf_file_name, '')) NOT LIKE '%.xls'
            AND COALESCE(pdf_file_name, '') != 'generic_renewal_template.xlsx'
            AND COALESCE(source_file, '') != 'generic_renewal_template.xlsx'
          )
          AND (
            LOWER(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId', '')) = LOWER(${customerId})
            OR (
              ${clientPhone} != '' AND length(${clientPhone}) = 10 AND (
                RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'contactNumber', ''), data->>'contactNumber', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone}
                OR RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'mobileNumber', ''), data->>'mobileNumber', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone}
                OR RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'phone', ''), data->>'phone', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone}
                OR RIGHT(REGEXP_REPLACE(COALESCE(contact_person_mobile, ''), '[^0-9]', '', 'g'), 10) = ${clientPhone}
              )
            )
          )
      `;

    const matchedPolicyIds = matchedRows.map((row) => row.id);

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
