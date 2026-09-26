import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getAuditMetadata } from "@/lib/audit";
import { recordLogoutAttendance } from "@/lib/attendance/attendance-service";

/**
 * POST /api/auth/punch-out
 *
 * Records attendance OUT time AND logs the user out.
 * This is the only path that marks attendance — the regular /api/auth/logout
 * just clears the session without touching attendance.
 */
export async function POST(request) {
  try {
    const token = request?.cookies?.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await verifyJWT(token);
    const userId = session?.id || session?.userId;
    if (!userId) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const { ipAddress } = getAuditMetadata(request);

    // Record attendance OUT (validates office IP internally)
    const result = await recordLogoutAttendance({ userId, ipAddress });

    if (!result.recorded && result.reason === "IP_NOT_ALLOWED") {
      return NextResponse.json({ error: result.message, reason: result.reason }, { status: 403 });
    }

    // Clear session cookie regardless of attendance result
    const response = NextResponse.json({
      success: true,
      message: "Punched out and logged out successfully",
      attendance: result,
    });

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
  } catch (error) {
    console.error("Punch-out error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
