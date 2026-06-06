import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifyJWT(token);

    if (!payload || !payload.userId) {
      return NextResponse.json({ success: false, error: "Invalid or expired session" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        deletedAt: true,
        createdAt: true,
        assignedLOBs: true
      }
    });

    if (!user || user.deletedAt) {
      return NextResponse.json({ success: false, error: "User not found or deactivated" }, { status: 401 });
    }

    // Omit sensitive deletedAt from response user object
    const { deletedAt: _deletedAt, ...sanitizedUser } = user;

    return NextResponse.json({ success: true, user: sanitizedUser });

  } catch (error) {
    console.error("Auth Me error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
