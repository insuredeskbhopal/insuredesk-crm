import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { PUBLIC_ROUTE_PATHS } from "@/lib/seo/site";

const SECRET_KEY =
  process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? "" : "dev-only-jwt-secret-change-me");
if (!SECRET_KEY) {
  throw new Error("JWT_SECRET is required in production.");
}
const encodedSecret = new TextEncoder().encode(SECRET_KEY);
const ADMIN_LOGIN_PATH = "/crm/admin/login";
const PROTECTED_ROUTE_PREFIXES = [
  "/analytics-reports",
  "/bulk-upload",
  "/customer-management",
  "/dashboard",
  "/field-setup",
  "/manual-policy-entry",
  "/operations",
  "/policy-records",
  "/premium-reports",
  "/settings",
];

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/logo") ||
    pathname.startsWith("/brand") ||
    pathname.startsWith("/docs") ||
    pathname === "/ai.txt" ||
    pathname === "/apple-icon.png" ||
    pathname === "/favicon.ico" ||
    pathname === "/favicon.png" ||
    pathname === "/llms.txt" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
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

  const isAuthPage = pathname === ADMIN_LOGIN_PATH;
  const isAuthApi = pathname.startsWith("/api/auth");
  const isCronApi = pathname.startsWith("/api/cron");
  const isBlogPage = pathname.startsWith("/blog");
  const isPublicPage = PUBLIC_ROUTE_PATHS.includes(pathname) || pathname === "/not-found" || isAuthPage || isBlogPage;

  if (pathname === "/login" || pathname === "/signup") {
    return NextResponse.redirect(new URL(isAuthenticated ? "/dashboard" : "/not-found", request.url));
  }

  if (isAuthApi || isCronApi) {
    return NextResponse.next();
  }

  if (!isAuthenticated && !isPublicPage) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const isProtectedRoute = PROTECTED_ROUTE_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
    if (!isProtectedRoute) {
      return NextResponse.next();
    }

    const notFoundUrl = new URL("/not-found", request.url);
    return NextResponse.redirect(notFoundUrl);
  }

  if (isAuthenticated && isAuthPage) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
