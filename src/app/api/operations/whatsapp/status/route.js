import { NextResponse } from "next/server";
import {
  requireWhatsAppStaff,
  requireManagedWhatsAppAccount,
  resolveWhatsAppSender,
} from "@/lib/whatsapp/account-access";
import { getWhatsAppStatus, getWhatsAppQrCode } from "@/lib/whatsapp/whatsapp-client";
export const runtime = "nodejs";
export async function GET(request) {
  try {
    const session = await requireWhatsAppStaff(request);
    if (session.errorResponse) return session.errorResponse;
    let accountId = new URL(request.url).searchParams.get("accountId");
    let qrCode = null;
    if (accountId) {
      const account = await requireManagedWhatsAppAccount(session, accountId);
      if (account.errorResponse) return account.errorResponse;
      const qr = await getWhatsAppQrCode(accountId);
      qrCode = qr.success ? qr.qrCode : null;
    } else accountId = await resolveWhatsAppSender(session);
    const status = await getWhatsAppStatus(accountId);
    return NextResponse.json({
      success: true,
      status: status.state,
      connected: status.connected,
      accountId,
      qrCode,
      lastChecked: status.lastChecked,
      error: status.error || null,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
