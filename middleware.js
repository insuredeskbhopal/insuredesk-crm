/* global TextEncoder */
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? "" : "dev-only-jwt-secret-change-me");
if (!SECRET_KEY) {
  throw new Error("JWT_SECRET is required in production.");
}
const encodedSecret = new TextEncoder().encode(SECRET_KEY);
const ADMIN_LOGIN_PATH = "/crm/admin/login";

export async function middleware(request) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  // 1. Pass through static files, next assets, and specific docs
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/docs") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // 2. Determine auth state
  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, encodedSecret);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // 3. Define page categories
  const isAuthPage = pathname === ADMIN_LOGIN_PATH;
  const isAuthApi = pathname.startsWith("/api/auth");

  if (pathname === "/login" || pathname === "/signup") {
    return NextResponse.redirect(new URL(isAuthenticated ? "/dashboard" : ADMIN_LOGIN_PATH, request.url));
  }

  // Allow auth API routes to enforce their own login/logout restrictions.
  if (isAuthApi) {
    return NextResponse.next();
  }

  // 4. Redirect rules
  if (!isAuthenticated && !isAuthPage) {
    // If trying to access an API route unauthenticated, return JSON 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }
    // Redirect CRM pages to the private admin login path.
    const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && isAuthPage) {
    // Redirect authenticated users away from login to dashboard
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on all paths except static assets
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
