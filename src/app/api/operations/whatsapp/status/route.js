import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getWhatsAppStatus, getWhatsAppQrCode } from "@/lib/whatsapp/whatsapp-client";

export const runtime = "nodejs";

async function requireSession(request) {
  const token = request.cookies.get("token")?.value;
  if (!token) return { errorResponse: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  const session = await verifyJWT(token);
  if (!session) {
    return { errorResponse: NextResponse.json({ error: "Invalid or expired session" }, { status: 401 }) };
  }
  return session;
}

export async function GET(request) {
  try {
    const session = await requireSession(request);
    if (session.errorResponse) return session.errorResponse;

    const status = await getWhatsAppStatus();
    
    let qrResponse = null;
    if (!status.connected) {
      const qrData = await getWhatsAppQrCode();
      if (qrData.success) {
        qrResponse = qrData.qrCode;
      }
    }

    return NextResponse.json({
      success: true,
      status: status.state,
      connected: status.connected,
      qrCode: qrResponse,
      lastChecked: status.lastChecked,
      error: status.error || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch status" },
      { status: 500 }
    );
  }
}
