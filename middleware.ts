import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { PUBLIC_ROUTE_PATHS } from "@/lib/seo/site";

const SECRET_KEY = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? "" : "dev-only-jwt-secret-change-me");
if (!SECRET_KEY) {
  throw new Error("JWT_SECRET is required in production.");
}
const encodedSecret = new TextEncoder().encode(SECRET_KEY);
const ADMIN_LOGIN_PATH = "/crm/admin/login";

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
  const isPublicPage = PUBLIC_ROUTE_PATHS.includes(pathname) || isAuthPage;

  if (pathname === "/login" || pathname === "/signup") {
    return NextResponse.redirect(new URL(isAuthenticated ? "/dashboard" : ADMIN_LOGIN_PATH, request.url));
  }

  if (isAuthApi) {
    return NextResponse.next();
  }

  if (!isAuthenticated && !isPublicPage) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
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
