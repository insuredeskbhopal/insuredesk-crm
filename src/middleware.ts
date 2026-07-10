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
  let userRole = "";
  if (token) {
    try {
      const { payload } = await jwtVerify(token, encodedSecret);
      isAuthenticated = true;
      userRole = (payload.role as string) || "";
    } catch {
      isAuthenticated = false;
    }
  }

  const isClientRoute = pathname.startsWith("/client");
  const isStaffRoute = PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  const isAuthPage = pathname === ADMIN_LOGIN_PATH;
  const isAuthApi = pathname.startsWith("/api/auth");
  const isCronApi = pathname.startsWith("/api/cron");
  const isBlogPage = pathname.startsWith("/blog");
  const isPublicPage = PUBLIC_ROUTE_PATHS.includes(pathname) || pathname === "/not-found" || isAuthPage || isBlogPage;

  // Handle client / staff API access security
  if (pathname.startsWith("/api/") && !isAuthApi && !isCronApi && pathname !== "/api/contact" && !pathname.startsWith("/api/client/")) {
    if (!isAuthenticated) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }
    if (userRole === "CLIENT") {
      return NextResponse.json({ success: false, error: "Access Denied" }, { status: 403 });
    }
  }

  // Handle Login & Signup paths redirection based on role
  if (pathname === "/login" || pathname === "/signup") {
    if (isAuthenticated) {
      return NextResponse.redirect(
        new URL(userRole === "CLIENT" ? "/client/portal" : "/dashboard", request.url),
      );
    }
    return NextResponse.next();
  }

  if (isAuthApi || isCronApi || pathname === "/api/contact") {
    return NextResponse.next();
  }

  // Guest rules (not logged in)
  if (!isAuthenticated) {
    if (isClientRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (isStaffRoute || !isPublicPage) {
      return NextResponse.rewrite(new URL("/not-found", request.url));
    }
    return NextResponse.next();
  }

  // Logged-in client rules
  if (userRole === "CLIENT") {
    if (isStaffRoute || isAuthPage) {
      return NextResponse.redirect(new URL("/client/portal", request.url));
    }
  }

  // Logged-in staff rules
  if (userRole !== "CLIENT") {
    if (isClientRoute || isAuthPage) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
