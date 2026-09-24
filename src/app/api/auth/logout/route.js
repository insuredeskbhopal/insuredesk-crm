import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { recordLogoutAttendance } from "@/lib/attendance/attendance-service";

export async function POST(request) {
  try {
    // 1. Identify logged-in user and record attendance OUT time if eligible
    const token = request?.cookies?.get("token")?.value;
    if (token) {
      try {
        const session = await verifyJWT(token);
        if (session?.id) {
          await recordLogoutAttendance({ userId: session.id });
        }
      } catch (authErr) {
        console.warn("Could not verify session during logout attendance record:", authErr.message);
      }
    }

    // 2. Clear token cookie to log user out
    const response = NextResponse.json({ success: true, message: "Logged out successfully" });

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
    console.error("Logout error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
