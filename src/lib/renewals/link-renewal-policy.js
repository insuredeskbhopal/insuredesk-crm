import { prisma } from "@/lib/db/prisma";
import { MANUAL_RENEWAL_IMPORT_METHOD } from "@/lib/records/manual-renewal-source";

export async function linkRenewalMarkerToPolicy({ policyRecordId, policyData, user, actorId }) {
  const vehicle = normalizeLookup(policyData.vehicleNumber || policyData.registrationNumber);
  const phone = normalizePhone(policyData.contactNumber || policyData.customerMobile || policyData.phone);
  const name = normalizeLookup(policyData.insuredName || policyData.customerName);
  if (!vehicle && !phone && !name) return null;

  const markers = await prisma.policyRecord.findMany({
    where: {
      deletedAt: null,
      ...(user.role === "SUPER_ADMIN" && !user.organizationId ? {} : { organizationId: user.organizationId || null }),
      extractionMethod: MANUAL_RENEWAL_IMPORT_METHOD,
      renewalStatus: "RENEWED",
      renewedPolicyId: null,
    },
    select: {
      id: true,
      data: true,
      reviewedData: true,
    },
    orderBy: [{ renewalDate: "desc" }, { updatedAt: "desc" }],
    take: 250,
  });

  let best = null;
  let bestScore = 0;
  for (const marker of markers) {
    const markerData = marker.reviewedData || marker.data || {};
    let score = 0;
    if (vehicle && vehicle === normalizeLookup(markerData.vehicleNumber || markerData.registrationNumber)) score += 4;
    if (phone && phone === normalizePhone(markerData.contactNumber || markerData.customerMobile || markerData.phone)) {
      score += 3;
    }
    if (name && name === normalizeLookup(markerData.insuredName || markerData.customerName)) score += 2;
    if (score > bestScore) {
      best = marker;
      bestScore = score;
    }
  }

  if (!best || bestScore < 3) return null;

  await prisma.$transaction([
    prisma.policyRecord.update({
      where: { id: best.id },
      data: {
        renewedPolicyId: policyRecordId,
        renewalDate: new Date(),
        updatedById: actorId,
      },
    }),
    prisma.policyRecord.update({
      where: { id: policyRecordId },
      data: {
        previousPolicyId: best.id,
        updatedById: actorId,
      },
    }),
  ]);

  return best;
}

function normalizeLookup(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}
