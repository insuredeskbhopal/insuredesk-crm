import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getWhatsAppSessions } from "./whatsapp-client";

export const isWhatsAppAdmin = (session) => ["SUPER_ADMIN", "ADMIN"].includes(session.role);
export async function requireWhatsAppStaff(request, write = false) {
  const auth = await requireSession(request);
  if (auth.response) return { errorResponse: auth.response };
  const { session } = auth;
  const roles = write ? ["SUPER_ADMIN", "ADMIN", "MANAGER", "AGENT"] : ["SUPER_ADMIN", "ADMIN", "MANAGER", "AGENT", "VIEWER"];
  if (!session.userId || !session.organizationId || !roles.includes(session.role)) return { errorResponse: NextResponse.json({ error: "Staff access required" }, { status: 403 }) };
  return session;
}
export function senderError(message, status = 409) { return Object.assign(new Error(message), { status }); }
export async function authorizedAccount(userId, organizationId, accountId) {
  const account = await prisma.whatsAppAccount.findFirst({ where: { id: accountId, organizationId, OR: [{ ownerUserId: userId }, { access: { some: { userId } } }] } });
  if (!account) throw senderError("You are not authorized to use this WhatsApp account", 403);
  return account;
}
export async function resolveWhatsAppSender({ userId = null, organizationId }) {
  if (!organizationId) throw senderError("Organization scope is required", 403);
  let accountId;
  if (userId) {
    const user = await prisma.user.findFirst({ where: { id: userId, organizationId, deletedAt: null, role: { in: ["SUPER_ADMIN", "ADMIN", "MANAGER", "AGENT"] } }, select: { primaryWhatsAppAccountId: true } });
    if (!user) throw senderError("Active staff access required", 403);
    accountId = user.primaryWhatsAppAccountId;
    if (!accountId) throw senderError("Select My Primary WhatsApp before sending a message");
    await authorizedAccount(userId, organizationId, accountId);
  } else {
    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { systemWhatsAppAccountId: true } });
    accountId = org?.systemWhatsAppAccountId;
    if (!accountId) throw senderError("An administrator must configure the system WhatsApp sender");
    if (!await prisma.whatsAppAccount.findFirst({ where: { id: accountId, organizationId } })) throw senderError("System sender is not authorized", 403);
  }
  const account = (await getWhatsAppSessions()).find((account) => account.id === accountId);
  if (!account?.connected) throw senderError("Your selected WhatsApp account is disconnected. Choose another connected, authorized account.");
  return accountId;
}
export async function requireManagedWhatsAppAccount(session, accountId) {
  if (!accountId) return { errorResponse: NextResponse.json({ error: "Missing accountId" }, { status: 400 }) };
  const account = await prisma.whatsAppAccount.findFirst({ where: { id: accountId, organizationId: session.organizationId } });
  if (!account || (!isWhatsAppAdmin(session) && account.ownerUserId !== session.userId)) return { errorResponse: NextResponse.json({ error: "You cannot manage this WhatsApp session" }, { status: 403 }) };
  return account;
}
