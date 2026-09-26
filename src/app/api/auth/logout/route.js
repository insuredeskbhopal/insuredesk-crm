import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Clear token cookie to log user out (no attendance recording — use /api/auth/punch-out for that)
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
