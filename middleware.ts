import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret_key_please_set");

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    // Assume payload contains userId and role
    const userId = payload.sub as string;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) throw new Error("User not found");
    // Attach user info to request headers for downstream use
    request.headers.set("x-user-id", userId);
    request.headers.set("x-user-role", user.role);
    // Allow access to SUPER_ADMIN routes only for SUPER_ADMIN role
    const isAdminRoute = request.nextUrl.pathname.startsWith("/admin") || request.nextUrl.pathname.startsWith("/api/users");
    if (isAdminRoute && user.role !== "SUPER_ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }
    return NextResponse.next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/admin/:path*", "/api/users/:path*"],
};
