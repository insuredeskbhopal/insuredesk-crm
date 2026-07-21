import { prisma } from "@/lib/db/prisma";
import { normalizeRecord } from "@/lib/records";
import { calculateDaysLeft } from "@/lib/renewals/dates";

const CLOSED_RENEWAL_STATUSES = ["RENEWED", "LOST", "NOT_INTERESTED", "WRONG_NUMBER", "RENEWED_ELSEWHERE"];

export const AUTO_LOST_REASON = "Automatically moved to Lost after 30 days overdue";

export async function moveOverdueRenewalsToLost({ organizationId = null, referenceDate = new Date() } = {}) {
  const openStatusFilter = {
    OR: [{ renewalStatus: null }, { renewalStatus: { notIn: CLOSED_RENEWAL_STATUSES } }],
  };
  const candidates = await prisma.policyRecord.findMany({
    where: {
      deletedAt: null,
      isActivePolicy: true,
      ...(organizationId ? { organizationId } : {}),
      ...openStatusFilter,
    },
    select: { id: true, data: true, reviewedData: true },
  });
  const policyIds = candidates
    .filter((record) => {
      const daysLeft = calculateDaysLeft(normalizeRecord(record).expiryDate, referenceDate);
      return Number.isFinite(daysLeft) && daysLeft < -30;
    })
    .map((record) => record.id);

  if (policyIds.length === 0) return 0;

  const result = await prisma.policyRecord.updateMany({
    where: {
      id: { in: policyIds },
      deletedAt: null,
      isActivePolicy: true,
      ...(organizationId ? { organizationId } : {}),
      ...openStatusFilter,
    },
    data: {
      renewalStatus: "LOST",
      isActivePolicy: false,
      lostReason: AUTO_LOST_REASON,
      renewalDate: referenceDate,
    },
  });

  return result.count;
}
