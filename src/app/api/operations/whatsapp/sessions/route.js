import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/lib/audit";
import { requireWhatsAppStaff, requireManagedWhatsAppAccount, isWhatsAppAdmin, authorizedAccount } from "@/lib/whatsapp/account-access";
import { getWhatsAppSessions, createWhatsAppSession, pauseWhatsAppSession, logoutWhatsAppSession, deleteWhatsAppSession, getWhatsAppMetrics } from "@/lib/whatsapp/whatsapp-client";
export const runtime = "nodejs";

export async function GET(request) {
  try {
    const session = await requireWhatsAppStaff(request);
    if (session.errorResponse) return session.errorResponse;
    const admin = isWhatsAppAdmin(session);
    const [gateway, registered, user, metrics, users, org] = await Promise.all([
      getWhatsAppSessions(),
      prisma.whatsAppAccount.findMany({ include: { access: true, owner: { select: { name: true } } } }),
      prisma.user.findUnique({ where: { id: session.userId }, select: { primaryWhatsAppAccountId: true } }),
      getWhatsAppMetrics(),
      admin ? prisma.user.findMany({ where: { organizationId: session.organizationId, deletedAt: null }, select: { id: true, name: true, email: true } }) : [],
      prisma.organization.findUnique({ where: { id: session.organizationId }, select: { systemWhatsAppAccountId: true } }),
    ]);
    const accounts = gateway.flatMap((account) => {
      const record = registered.find((item) => item.id === account.id);
      if (record && record.organizationId !== session.organizationId) return [];
      const canUse = Boolean(record && (record.ownerUserId === session.userId || record.access.some((grant) => grant.userId === session.userId)));
      if (!record && (!admin || account.organizationId && account.organizationId !== session.organizationId)) return [];
      if (record && !admin && !canUse) return [];
      return [{ ...account, isDefault: account.id === user?.primaryWhatsAppAccountId, isSystemSender: account.id === org?.systemWhatsAppAccountId, registered: Boolean(record), canUse, canManage: Boolean(record && session.role !== "VIEWER" && (admin || record.ownerUserId === session.userId)), ownerName: record?.owner?.name || null, ownerUserId: record?.ownerUserId || null, accessUserIds: admin ? record?.access.map((grant) => grant.userId) || [] : undefined }];
    });
    return NextResponse.json({ success: true, accounts, primaryAccountId: user?.primaryWhatsAppAccountId || null, canCreate: session.role !== "VIEWER", canAdmin: admin, users, metrics: metrics.success ? metrics : null });
  } catch (error) { return NextResponse.json({ error: error.message || "Failed to load accounts" }, { status: error.status || 500 }); }
}

export async function POST(request) {
  try {
    const session = await requireWhatsAppStaff(request, true);
    if (session.errorResponse) return session.errorResponse;
    const { action, accountId, label, userId, allowed, ownerUserId } = await request.json();
    if (action === "create") {
      const result = await createWhatsAppSession(label, { ownerUserId: session.userId, organizationId: session.organizationId, ownerName: session.name || session.email });
      if (!result.success || !result.account?.id) throw new Error(result.error || "Could not link account");
      await prisma.whatsAppAccount.create({ data: { id: result.account.id, label: result.account.label, ownerUserId: session.userId, organizationId: session.organizationId } });
      await logAudit({ action: "WHATSAPP_ACCOUNT_LINKED", entityType: "WhatsAppAccount", entityId: result.account.id, userId: session.userId, organizationId: session.organizationId });
      return NextResponse.json(result);
    }
    if (!accountId) return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
    if (["set-primary", "set-default"].includes(action)) {
      await authorizedAccount(session.userId, session.organizationId, accountId);
      const account = (await getWhatsAppSessions()).find((a) => a.id === accountId);
      if (!account?.connected) return NextResponse.json({ error: "Choose a connected WhatsApp account" }, { status: 409 });
      await prisma.user.update({ where: { id: session.userId }, data: { primaryWhatsAppAccountId: accountId } });
    } else if (action === "register") {
      if (!isWhatsAppAdmin(session)) return NextResponse.json({ error: "Administrator required" }, { status: 403 });
      const account = (await getWhatsAppSessions()).find((a) => a.id === accountId);
      if (!account || account.organizationId && account.organizationId !== session.organizationId) return NextResponse.json({ error: "Account is unavailable" }, { status: 403 });
      // Import connection identity, without inventing its original owner.
      await prisma.whatsAppAccount.create({ data: { id: account.id, label: account.label, organizationId: session.organizationId, access: { create: { userId: session.userId } } } });
    } else {
      const account = await requireManagedWhatsAppAccount(session, accountId);
      if (account.errorResponse) return account.errorResponse;
      if (["grant", "assign-owner", "set-system"].includes(action)) {
        if (!isWhatsAppAdmin(session)) return NextResponse.json({ error: "Administrator required" }, { status: 403 });
        if (action === "set-system") {
          // Validate live connectivity before explicitly enabling automation use.
          const gateway = (await getWhatsAppSessions()).find((a) => a.id === accountId);
          if (!gateway?.connected) return NextResponse.json({ error: "System sender must be connected" }, { status: 409 });
          await prisma.organization.update({ where: { id: session.organizationId }, data: { systemWhatsAppAccountId: accountId } });
        } else {
          const targetId = action === "grant" ? userId : ownerUserId;
          const target = targetId ? await prisma.user.findFirst({ where: { id: targetId, organizationId: session.organizationId, deletedAt: null, role: { not: "VIEWER" } } }) : null;
          if (!target && !(action === "assign-owner" && ownerUserId === null)) return NextResponse.json({ error: "Choose an active staff member in your organization" }, { status: 400 });
          if (action === "assign-owner") await prisma.whatsAppAccount.update({ where: { id: accountId }, data: { ownerUserId } });
          else if (allowed === true) await prisma.whatsAppAccountAccess.upsert({ where: { accountId_userId: { accountId, userId } }, create: { accountId, userId }, update: {} });
          else await prisma.whatsAppAccountAccess.deleteMany({ where: { accountId, userId } });
        }
      } else if (action === "pause") await pauseWhatsAppSession(accountId);
      else if (action === "logout") await logoutWhatsAppSession(accountId);
      else if (action === "delete") { await deleteWhatsAppSession(accountId); await prisma.whatsAppAccount.delete({ where: { id: accountId } }); }
      else return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }
    await logAudit({ action: `WHATSAPP_ACCOUNT_${action.toUpperCase()}`, entityType: "WhatsAppAccount", entityId: accountId, userId: session.userId, organizationId: session.organizationId, metadata: { userId, allowed, ownerUserId } });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: error.status || 500 }); }
}
