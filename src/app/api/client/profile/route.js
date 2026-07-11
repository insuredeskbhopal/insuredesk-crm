import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (
      !session ||
      session.role !== "CLIENT" ||
      !session.customerId ||
      session.organizationId === undefined
    ) {
      return NextResponse.json({ success: false, error: "Access Denied" }, { status: 403 });
    }

    const customer = await prisma.clientAccount.findFirst({
      where: {
        id: session.customerId,
        organizationId: session.organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
      },
    });

    if (!customer) {
      return clearClientSession({ success: false, error: "Client session expired" }, 401);
    }

    return NextResponse.json({ success: true, profile: customer });
  } catch (error) {
    console.error("Client Profile Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

function clearClientSession(payload, status) {
  const response = NextResponse.json(payload, { status });
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
}
