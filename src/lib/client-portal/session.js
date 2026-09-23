import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getClientCredentialVersion } from "@/lib/client-portal/credentials";

export async function requireClient(request) {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;
  let queryToken = null;
  try {
    const url = new URL(request.url);
    queryToken = url.searchParams.get("token");
  } catch {}
  const token = bearerToken || queryToken || request.cookies?.get?.("token")?.value;
  const session = token ? await verifyJWT(token) : null;

  if (!session || session.role !== "CLIENT" || !session.customerId || session.organizationId === undefined) {
    return { error: NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 }) };
  }

  const [customer, credentialVersion] = await Promise.all([
    prisma.clientAccount.findFirst({
      where: { id: session.customerId, organizationId: session.organizationId, deletedAt: null },
      select: { id: true, name: true, phone: true, email: true, organizationId: true, createdAt: true },
    }),
    getClientCredentialVersion(session.customerId),
  ]);

  if (!customer || Number(session.credentialVersion || 0) !== credentialVersion) {
    return { error: clearClientSession() };
  }

  return { session, customer, organizationId: session.organizationId };
}

function clearClientSession() {
  const response = NextResponse.json({ success: false, error: "Client session expired" }, { status: 401 });
  response.cookies.set({
    name: "token",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}

import { normalizeCanonicalPhone, isClientPhoneUniqueInOrg } from "@/lib/client-portal/policies";

export async function getOwnedPolicy({
  customerId,
  organizationId,
  policyId,
  policyNo,
  customer,
  database = prisma,
}) {
  const clientPhone = normalizeCanonicalPhone(customer?.phone || "");
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(policyId || "");

  const rows = policyId
    ? isUuid
      ? await database.$queryRaw`
          SELECT id FROM pdf_records
          WHERE id = ${policyId}::uuid AND deleted_at IS NULL
            AND organization_id IS NOT DISTINCT FROM ${organizationId}::uuid
            AND (
              (uploaded_file_id IS NOT NULL OR (pdf_bytes IS NOT NULL AND length(pdf_bytes) > 0))
              AND LOWER(COALESCE(pdf_file_name, '')) NOT LIKE '%.xlsx'
              AND LOWER(COALESCE(pdf_file_name, '')) NOT LIKE '%.xls'
              AND COALESCE(pdf_file_name, '') != 'generic_renewal_template.xlsx'
              AND COALESCE(source_file, '') != 'generic_renewal_template.xlsx'
            )
            AND (
              LOWER(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId')) = LOWER(${customerId})
              OR (
                NULLIF(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId'), '') IS NULL
                AND ${clientPhone} != ''
                AND (
                  SELECT COUNT(*)::int
                  FROM client_accounts ca_check
                  WHERE ca_check.deleted_at IS NULL
                    AND ca_check.organization_id IS NOT DISTINCT FROM ${organizationId}::uuid
                    AND length(REGEXP_REPLACE(ca_check.phone, '[^0-9]', '', 'g')) >= 10
                    AND RIGHT(REGEXP_REPLACE(ca_check.phone, '[^0-9]', '', 'g'), 10) = ${clientPhone}
                ) = 1
                AND (
                  (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'contactNumber', ''), data->>'contactNumber', ''), '[^0-9]', '', 'g')) >= 10
                   AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'contactNumber', ''), data->>'contactNumber', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
                  OR (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'mobileNumber', ''), data->>'mobileNumber', ''), '[^0-9]', '', 'g')) >= 10
                   AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'mobileNumber', ''), data->>'mobileNumber', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
                  OR (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'phone', ''), data->>'phone', ''), '[^0-9]', '', 'g')) >= 10
                   AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'phone', ''), data->>'phone', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
                  OR (length(REGEXP_REPLACE(COALESCE(contact_person_mobile, ''), '[^0-9]', '', 'g')) >= 10
                   AND RIGHT(REGEXP_REPLACE(COALESCE(contact_person_mobile, ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
                )
              )
            )
          LIMIT 1`
      : await database.$queryRaw`
          SELECT id FROM pdf_records
          WHERE deleted_at IS NULL
            AND organization_id IS NOT DISTINCT FROM ${organizationId}::uuid
            AND (
              (uploaded_file_id IS NOT NULL OR (pdf_bytes IS NOT NULL AND length(pdf_bytes) > 0))
              AND LOWER(COALESCE(pdf_file_name, '')) NOT LIKE '%.xlsx'
              AND LOWER(COALESCE(pdf_file_name, '')) NOT LIKE '%.xls'
              AND COALESCE(pdf_file_name, '') != 'generic_renewal_template.xlsx'
              AND COALESCE(source_file, '') != 'generic_renewal_template.xlsx'
            )
            AND (
              reviewed_data->>'policyNumber' = ${policyId}
              OR data->>'policyNumber' = ${policyId}
              OR id::text = ${policyId}
            )
            AND (
              LOWER(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId')) = LOWER(${customerId})
              OR (
                NULLIF(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId'), '') IS NULL
                AND ${clientPhone} != ''
                AND (
                  SELECT COUNT(*)::int
                  FROM client_accounts ca_check
                  WHERE ca_check.deleted_at IS NULL
                    AND ca_check.organization_id IS NOT DISTINCT FROM ${organizationId}::uuid
                    AND length(REGEXP_REPLACE(ca_check.phone, '[^0-9]', '', 'g')) >= 10
                    AND RIGHT(REGEXP_REPLACE(ca_check.phone, '[^0-9]', '', 'g'), 10) = ${clientPhone}
                ) = 1
                AND (
                  (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'contactNumber', ''), data->>'contactNumber', ''), '[^0-9]', '', 'g')) >= 10
                   AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'contactNumber', ''), data->>'contactNumber', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
                  OR (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'mobileNumber', ''), data->>'mobileNumber', ''), '[^0-9]', '', 'g')) >= 10
                   AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'mobileNumber', ''), data->>'mobileNumber', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
                  OR (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'phone', ''), data->>'phone', ''), '[^0-9]', '', 'g')) >= 10
                   AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'phone', ''), data->>'phone', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
                  OR (length(REGEXP_REPLACE(COALESCE(contact_person_mobile, ''), '[^0-9]', '', 'g')) >= 10
                   AND RIGHT(REGEXP_REPLACE(COALESCE(contact_person_mobile, ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
                )
              )
            )
          LIMIT 1`
    : await database.$queryRaw`
        SELECT id FROM pdf_records
        WHERE deleted_at IS NULL
          AND organization_id IS NOT DISTINCT FROM ${organizationId}::uuid
          AND (
            (uploaded_file_id IS NOT NULL OR (pdf_bytes IS NOT NULL AND length(pdf_bytes) > 0))
            AND LOWER(COALESCE(pdf_file_name, '')) NOT LIKE '%.xlsx'
            AND LOWER(COALESCE(pdf_file_name, '')) NOT LIKE '%.xls'
            AND COALESCE(pdf_file_name, '') != 'generic_renewal_template.xlsx'
            AND COALESCE(source_file, '') != 'generic_renewal_template.xlsx'
          )
          AND (reviewed_data->>'policyNumber' = ${policyNo} OR data->>'policyNumber' = ${policyNo})
          AND (
            LOWER(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId')) = LOWER(${customerId})
            OR (
              NULLIF(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId'), '') IS NULL
              AND ${clientPhone} != ''
              AND (
                SELECT COUNT(*)::int
                FROM client_accounts ca_check
                WHERE ca_check.deleted_at IS NULL
                  AND ca_check.organization_id IS NOT DISTINCT FROM ${organizationId}::uuid
                  AND length(REGEXP_REPLACE(ca_check.phone, '[^0-9]', '', 'g')) >= 10
                  AND RIGHT(REGEXP_REPLACE(ca_check.phone, '[^0-9]', '', 'g'), 10) = ${clientPhone}
              ) = 1
              AND (
                (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'contactNumber', ''), data->>'contactNumber', ''), '[^0-9]', '', 'g')) >= 10
                 AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'contactNumber', ''), data->>'contactNumber', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
                OR (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'mobileNumber', ''), data->>'mobileNumber', ''), '[^0-9]', '', 'g')) >= 10
                 AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'mobileNumber', ''), data->>'mobileNumber', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
                OR (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'phone', ''), data->>'phone', ''), '[^0-9]', '', 'g')) >= 10
                 AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'phone', ''), data->>'phone', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
                OR (length(REGEXP_REPLACE(COALESCE(contact_person_mobile, ''), '[^0-9]', '', 'g')) >= 10
                 AND RIGHT(REGEXP_REPLACE(COALESCE(contact_person_mobile, ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
              )
            )
          )
        LIMIT 1`;

  return rows[0] || null;
}

export async function getClientOwnedPolicyIds({
  customerId,
  organizationId,
  customer,
  database = prisma,
}) {
  const clientPhone = normalizeCanonicalPhone(customer?.phone || "");
  const rows = await database.$queryRaw`
    SELECT id
    FROM pdf_records
    WHERE deleted_at IS NULL
      AND organization_id IS NOT DISTINCT FROM ${organizationId}::uuid
      AND (
        (uploaded_file_id IS NOT NULL OR (pdf_bytes IS NOT NULL AND length(pdf_bytes) > 0))
        AND LOWER(COALESCE(pdf_file_name, '')) NOT LIKE '%.xlsx'
        AND LOWER(COALESCE(pdf_file_name, '')) NOT LIKE '%.xls'
        AND COALESCE(pdf_file_name, '') != 'generic_renewal_template.xlsx'
        AND COALESCE(source_file, '') != 'generic_renewal_template.xlsx'
      )
      AND (
        LOWER(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId')) = LOWER(${customerId})
        OR (
          NULLIF(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId'), '') IS NULL
          AND ${clientPhone} != ''
          AND (
            SELECT COUNT(*)::int
            FROM client_accounts ca_check
            WHERE ca_check.deleted_at IS NULL
              AND ca_check.organization_id IS NOT DISTINCT FROM ${organizationId}::uuid
              AND length(REGEXP_REPLACE(ca_check.phone, '[^0-9]', '', 'g')) >= 10
              AND RIGHT(REGEXP_REPLACE(ca_check.phone, '[^0-9]', '', 'g'), 10) = ${clientPhone}
          ) = 1
          AND (
            (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'contactNumber', ''), data->>'contactNumber', ''), '[^0-9]', '', 'g')) >= 10
             AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'contactNumber', ''), data->>'contactNumber', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
            OR (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'mobileNumber', ''), data->>'mobileNumber', ''), '[^0-9]', '', 'g')) >= 10
             AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'mobileNumber', ''), data->>'mobileNumber', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
            OR (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'phone', ''), data->>'phone', ''), '[^0-9]', '', 'g')) >= 10
             AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'phone', ''), data->>'phone', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
            OR (length(REGEXP_REPLACE(COALESCE(contact_person_mobile, ''), '[^0-9]', '', 'g')) >= 10
             AND RIGHT(REGEXP_REPLACE(COALESCE(contact_person_mobile, ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
          )
        )
      )
  `;
  return rows.map((r) => r.id);
}

export async function getClientOwnedPolicyRows({
  customerId,
  organizationId,
  customer,
  policyNo = "",
  policyId = "",
  database = prisma,
}) {
  const clientPhone = normalizeCanonicalPhone(customer?.phone || "");
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(policyId || "");

  if (policyId && isUuid) {
    if (policyNo) {
      return database.$queryRaw`
        SELECT id, COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber') AS policy_number
        FROM pdf_records
        WHERE id = ${policyId}::uuid
          AND deleted_at IS NULL
          AND organization_id IS NOT DISTINCT FROM ${organizationId}::uuid
          AND (
            (uploaded_file_id IS NOT NULL OR (pdf_bytes IS NOT NULL AND length(pdf_bytes) > 0))
            AND LOWER(COALESCE(pdf_file_name, '')) NOT LIKE '%.xlsx'
            AND LOWER(COALESCE(pdf_file_name, '')) NOT LIKE '%.xls'
            AND COALESCE(pdf_file_name, '') != 'generic_renewal_template.xlsx'
            AND COALESCE(source_file, '') != 'generic_renewal_template.xlsx'
          )
          AND (
            LOWER(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId')) = LOWER(${customerId})
            OR (
              NULLIF(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId'), '') IS NULL
              AND ${clientPhone} != ''
              AND (
                SELECT COUNT(*)::int
                FROM client_accounts ca_check
                WHERE ca_check.deleted_at IS NULL
                  AND ca_check.organization_id IS NOT DISTINCT FROM ${organizationId}::uuid
                  AND length(REGEXP_REPLACE(ca_check.phone, '[^0-9]', '', 'g')) >= 10
                  AND RIGHT(REGEXP_REPLACE(ca_check.phone, '[^0-9]', '', 'g'), 10) = ${clientPhone}
              ) = 1
              AND (
                (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'contactNumber', ''), data->>'contactNumber', ''), '[^0-9]', '', 'g')) >= 10
                 AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'contactNumber', ''), data->>'contactNumber', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
                OR (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'mobileNumber', ''), data->>'mobileNumber', ''), '[^0-9]', '', 'g')) >= 10
                 AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'mobileNumber', ''), data->>'mobileNumber', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
                OR (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'phone', ''), data->>'phone', ''), '[^0-9]', '', 'g')) >= 10
                 AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'phone', ''), data->>'phone', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
                OR (length(REGEXP_REPLACE(COALESCE(contact_person_mobile, ''), '[^0-9]', '', 'g')) >= 10
                 AND RIGHT(REGEXP_REPLACE(COALESCE(contact_person_mobile, ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
              )
            )
          )
          AND (reviewed_data->>'policyNumber' = ${policyNo} OR data->>'policyNumber' = ${policyNo})
        LIMIT 1
      `;
    }
    return database.$queryRaw`
      SELECT id, COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber') AS policy_number
      FROM pdf_records
      WHERE id = ${policyId}::uuid
        AND deleted_at IS NULL
        AND organization_id IS NOT DISTINCT FROM ${organizationId}::uuid
        AND (
          (uploaded_file_id IS NOT NULL OR (pdf_bytes IS NOT NULL AND length(pdf_bytes) > 0))
          AND LOWER(COALESCE(pdf_file_name, '')) NOT LIKE '%.xlsx'
          AND LOWER(COALESCE(pdf_file_name, '')) NOT LIKE '%.xls'
          AND COALESCE(pdf_file_name, '') != 'generic_renewal_template.xlsx'
          AND COALESCE(source_file, '') != 'generic_renewal_template.xlsx'
        )
        AND (
          LOWER(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId')) = LOWER(${customerId})
          OR (
            NULLIF(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId'), '') IS NULL
            AND ${clientPhone} != ''
            AND (
              SELECT COUNT(*)::int
              FROM client_accounts ca_check
              WHERE ca_check.deleted_at IS NULL
                AND ca_check.organization_id IS NOT DISTINCT FROM ${organizationId}::uuid
                AND length(REGEXP_REPLACE(ca_check.phone, '[^0-9]', '', 'g')) >= 10
                AND RIGHT(REGEXP_REPLACE(ca_check.phone, '[^0-9]', '', 'g'), 10) = ${clientPhone}
            ) = 1
            AND (
              (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'contactNumber', ''), data->>'contactNumber', ''), '[^0-9]', '', 'g')) >= 10
               AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'contactNumber', ''), data->>'contactNumber', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
              OR (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'mobileNumber', ''), data->>'mobileNumber', ''), '[^0-9]', '', 'g')) >= 10
               AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'mobileNumber', ''), data->>'mobileNumber', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
              OR (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'phone', ''), data->>'phone', ''), '[^0-9]', '', 'g')) >= 10
               AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'phone', ''), data->>'phone', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
              OR (length(REGEXP_REPLACE(COALESCE(contact_person_mobile, ''), '[^0-9]', '', 'g')) >= 10
               AND RIGHT(REGEXP_REPLACE(COALESCE(contact_person_mobile, ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
            )
          )
        )
      LIMIT 1
    `;
  }

  if (policyNo) {
    return database.$queryRaw`
      SELECT id, COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber') AS policy_number
      FROM pdf_records
      WHERE deleted_at IS NULL
        AND organization_id IS NOT DISTINCT FROM ${organizationId}::uuid
        AND (
          (uploaded_file_id IS NOT NULL OR (pdf_bytes IS NOT NULL AND length(pdf_bytes) > 0))
          AND LOWER(COALESCE(pdf_file_name, '')) NOT LIKE '%.xlsx'
          AND LOWER(COALESCE(pdf_file_name, '')) NOT LIKE '%.xls'
          AND COALESCE(pdf_file_name, '') != 'generic_renewal_template.xlsx'
          AND COALESCE(source_file, '') != 'generic_renewal_template.xlsx'
        )
        AND (
          LOWER(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId')) = LOWER(${customerId})
          OR (
            NULLIF(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId'), '') IS NULL
            AND ${clientPhone} != ''
            AND (
              SELECT COUNT(*)::int
              FROM client_accounts ca_check
              WHERE ca_check.deleted_at IS NULL
                AND ca_check.organization_id IS NOT DISTINCT FROM ${organizationId}::uuid
                AND length(REGEXP_REPLACE(ca_check.phone, '[^0-9]', '', 'g')) >= 10
                AND RIGHT(REGEXP_REPLACE(ca_check.phone, '[^0-9]', '', 'g'), 10) = ${clientPhone}
            ) = 1
            AND (
              (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'contactNumber', ''), data->>'contactNumber', ''), '[^0-9]', '', 'g')) >= 10
               AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'contactNumber', ''), data->>'contactNumber', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
              OR (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'mobileNumber', ''), data->>'mobileNumber', ''), '[^0-9]', '', 'g')) >= 10
               AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'mobileNumber', ''), data->>'mobileNumber', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
              OR (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'phone', ''), data->>'phone', ''), '[^0-9]', '', 'g')) >= 10
               AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'phone', ''), data->>'phone', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
              OR (length(REGEXP_REPLACE(COALESCE(contact_person_mobile, ''), '[^0-9]', '', 'g')) >= 10
               AND RIGHT(REGEXP_REPLACE(COALESCE(contact_person_mobile, ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
            )
          )
        )
        AND (reviewed_data->>'policyNumber' = ${policyNo} OR data->>'policyNumber' = ${policyNo})
      LIMIT 1
    `;
  }

  return database.$queryRaw`
    SELECT id, COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber') AS policy_number
    FROM pdf_records
    WHERE deleted_at IS NULL
      AND organization_id IS NOT DISTINCT FROM ${organizationId}::uuid
      AND (
        (uploaded_file_id IS NOT NULL OR (pdf_bytes IS NOT NULL AND length(pdf_bytes) > 0))
        AND LOWER(COALESCE(pdf_file_name, '')) NOT LIKE '%.xlsx'
        AND LOWER(COALESCE(pdf_file_name, '')) NOT LIKE '%.xls'
        AND COALESCE(pdf_file_name, '') != 'generic_renewal_template.xlsx'
        AND COALESCE(source_file, '') != 'generic_renewal_template.xlsx'
      )
      AND (
        LOWER(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId')) = LOWER(${customerId})
        OR (
          NULLIF(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId'), '') IS NULL
          AND ${clientPhone} != ''
          AND (
            SELECT COUNT(*)::int
            FROM client_accounts ca_check
            WHERE ca_check.deleted_at IS NULL
              AND ca_check.organization_id IS NOT DISTINCT FROM ${organizationId}::uuid
              AND length(REGEXP_REPLACE(ca_check.phone, '[^0-9]', '', 'g')) >= 10
              AND RIGHT(REGEXP_REPLACE(ca_check.phone, '[^0-9]', '', 'g'), 10) = ${clientPhone}
          ) = 1
          AND (
            (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'contactNumber', ''), data->>'contactNumber', ''), '[^0-9]', '', 'g')) >= 10
             AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'contactNumber', ''), data->>'contactNumber', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
            OR (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'mobileNumber', ''), data->>'mobileNumber', ''), '[^0-9]', '', 'g')) >= 10
             AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'mobileNumber', ''), data->>'mobileNumber', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
            OR (length(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'phone', ''), data->>'phone', ''), '[^0-9]', '', 'g')) >= 10
             AND RIGHT(REGEXP_REPLACE(COALESCE(NULLIF(reviewed_data->>'phone', ''), data->>'phone', ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
            OR (length(REGEXP_REPLACE(COALESCE(contact_person_mobile, ''), '[^0-9]', '', 'g')) >= 10
             AND RIGHT(REGEXP_REPLACE(COALESCE(contact_person_mobile, ''), '[^0-9]', '', 'g'), 10) = ${clientPhone})
          )
        )
      )
  `;
}

export async function getOwnedClaim({ customer, organizationId, claimId, database = prisma }) {
  if (!customer?.id || !claimId) return null;
  const cleanPhone = normalizeCanonicalPhone(customer.phone || "");

  const claim = await database.claim.findFirst({
    where: {
      id: claimId,
      organizationId,
      deletedAt: null,
    },
    include: {
      documents: {
        orderBy: { uploadedAt: "desc" },
        select: { id: true, name: true, fileName: true, fileType: true, size: true, uploadedAt: true },
      },
    },
  });
  if (!claim) return null;

  const storedCustomerId = String(claim.metadata?.customerId || "");
  if (storedCustomerId) {
    return storedCustomerId === customer.id ? claim : null;
  }

  // Legacy fallback: verify claim's policy is owned by this customer AND claim mobile matches client's phone
  // AND client phone is unique in this organization
  if (cleanPhone && claim.policyNo) {
    const isUnique = await isClientPhoneUniqueInOrg({ organizationId, phone: cleanPhone, database });
    if (!isUnique) return null;

    const ownedPolicy = await getOwnedPolicy({
      customerId: customer.id,
      organizationId,
      policyNo: claim.policyNo,
      customer,
      database,
    });
    const claimMobile = normalizeCanonicalPhone(claim.mobileNo || "");
    if (ownedPolicy && claimMobile === cleanPhone) {
      return claim;
    }
  }

  return null;
}
