import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? "" : "dev-only-jwt-secret-change-me");
if (!SECRET_KEY) {
  throw new Error("JWT_SECRET is required in production.");
}
const encodedSecret = new TextEncoder().encode(SECRET_KEY);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/docs") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, encodedSecret);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  const isAuthPage = pathname === "/login";
  const isAuthApi = pathname.startsWith("/api/auth");

  if (pathname === "/signup") {
    return NextResponse.redirect(new URL(isAuthenticated ? "/dashboard" : "/login", request.url));
  }

  if (isAuthApi) {
    return NextResponse.next();
  }

  if (!isAuthenticated && !isAuthPage) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && isAuthPage) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
