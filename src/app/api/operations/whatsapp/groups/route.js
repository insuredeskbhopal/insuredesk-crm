import { NextResponse } from "next/server";
import { requireWhatsAppStaff, resolveWhatsAppSender } from "@/lib/whatsapp/account-access";
import {
  getWhatsAppGroups,
  matchWhatsAppGroups,
  refreshWhatsAppGroups,
} from "@/lib/whatsapp/whatsapp-client";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const session = await requireWhatsAppStaff(request, true);
    if (session.errorResponse) return session.errorResponse;
    const accountId = await resolveWhatsAppSender(session);
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    if (phone) {
      const match = await matchWhatsAppGroups(phone, accountId);
      return NextResponse.json({ success: true, ...match });
    }
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30", 10) || 30));
    return NextResponse.json({
      success: true,
      groups: await getWhatsAppGroups({
        accountId,
        search: searchParams.get("search") || "",
        limit,
      }),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to load WhatsApp groups" }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const session = await requireWhatsAppStaff(request, true);
    if (session.errorResponse) return session.errorResponse;
    const accountId = await resolveWhatsAppSender(session);
    if (session.role === "VIEWER") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    return NextResponse.json({ success: true, groups: await refreshWhatsAppGroups(accountId) });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to refresh WhatsApp groups" },
      { status: 503 },
    );
  }
}
