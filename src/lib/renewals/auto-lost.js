import { prisma } from "@/lib/db/prisma";

export const AUTO_LOST_REASON = "Automatically moved to Lost after 30 days overdue";

export async function moveOverdueRenewalsToLost({ organizationId, referenceDate = new Date() } = {}) {
  const isSuperAdmin = organizationId === undefined;
  const orgId = organizationId ?? null;

  const result = await prisma.$executeRaw`
    UPDATE pdf_records
    SET 
      renewal_status = 'LOST',
      is_active_policy = false,
      lost_reason = ${AUTO_LOST_REASON},
      renewal_date = ${referenceDate}
    WHERE deleted_at IS NULL
      AND is_active_policy = true
      AND (${isSuperAdmin}::boolean OR organization_id IS NOT DISTINCT FROM ${orgId}::uuid)
      AND (renewal_status IS NULL OR renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE'))
      AND (
        CASE
          WHEN COALESCE(reviewed_data->>'expiryDate', reviewed_data->>'policyEndDate', data->>'expiryDate', data->>'policyEndDate') ~ '^\\d{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[0-1])'
            THEN CAST(SUBSTRING(COALESCE(reviewed_data->>'expiryDate', reviewed_data->>'policyEndDate', data->>'expiryDate', data->>'policyEndDate') FROM 1 FOR 10) AS DATE)
          WHEN COALESCE(reviewed_data->>'expiryDate', reviewed_data->>'policyEndDate', data->>'expiryDate', data->>'policyEndDate') ~ '^([0-2]?[0-9]|3[0-1])[/-](0?[1-9]|1[0-2])[/-]\\d{4}'
            THEN TO_DATE(REPLACE(COALESCE(reviewed_data->>'expiryDate', reviewed_data->>'policyEndDate', data->>'expiryDate', data->>'policyEndDate'), '/', '-'), 'DD-MM-YYYY')
          WHEN COALESCE(reviewed_data->>'expiryDate', reviewed_data->>'policyEndDate', data->>'expiryDate', data->>'policyEndDate') ~ '^([0-2]?[0-9]|3[0-1])[/-](0?[1-9]|1[0-2])[/-]\\d{2}'
            THEN TO_DATE(REPLACE(COALESCE(reviewed_data->>'expiryDate', reviewed_data->>'policyEndDate', data->>'expiryDate', data->>'policyEndDate'), '/', '-'), 'DD-MM-YY')
          ELSE NULL
        END
      ) < (${referenceDate}::date - INTERVAL '30 days');
  `;

  return result;
}
