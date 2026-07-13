import { prisma } from "@/lib/db/prisma";
import { comparePassword, hashPassword } from "@/lib/auth";

export async function verifyClientMpin(customer, mpin) {
  const cleanMpin = String(mpin || "").replace(/\D/g, "");
  if (cleanMpin.length !== 4) return false;

  const credential = prisma.task?.findUnique
    ? await prisma.task.findUnique({
        where: { sourceKey: `client-credential:${customer.id}` },
        select: { metadata: true },
      })
    : null;
  if (credential?.metadata?.mpinHash) return comparePassword(cleanMpin, credential.metadata.mpinHash);

  const fallbackMpin = String(customer.phone || "").replace(/\D/g, "").slice(-4);
  return fallbackMpin === cleanMpin;
}

export async function setClientMpin(customerId, mpin) {
  const mpinHash = await hashPassword(mpin);
  const customer = await prisma.clientAccount.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, phone: true, organizationId: true },
  });
  if (!customer) throw new Error("Client account not found");

  await prisma.task.upsert({
    where: { sourceKey: `client-credential:${customer.id}` },
    create: {
      organizationId: customer.organizationId,
      title: "Client portal credential",
      description: "Secured client MPIN credential.",
      type: "SERVICE_REQUEST",
      status: "COMPLETED",
      priority: "MEDIUM",
      module: "CLIENT_PORTAL_SECURITY",
      recordId: customer.id,
      recordLabel: customer.name,
      customerName: customer.name,
      customerMobile: customer.phone,
      sourceKey: `client-credential:${customer.id}`,
      metadata: { mpinHash },
      completedAt: new Date(),
      archivedAt: new Date(),
    },
    update: { metadata: { mpinHash }, completedAt: new Date(), archivedAt: new Date() },
  });
}
