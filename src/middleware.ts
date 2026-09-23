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

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];
const USER_MANAGEMENT_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Static Assets & System Files Whitelist
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/d/") ||
    pathname.startsWith("/logo") ||
    pathname.startsWith("/brand") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/docs") ||
    pathname.startsWith("/downloads") ||
    pathname === "/OFFICE.png" ||
    pathname === "/office.png" ||
    pathname === "/ABOUT.png" ||
    pathname === "/about.png" ||
    pathname === "/ai.txt" ||
    pathname === "/apple-icon.png" ||
    pathname === "/favicon.ico" ||
    pathname === "/favicon.png" ||
    pathname === "/llms.txt" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/white logo.png" ||
    pathname === "/white%20logo.png"
  ) {
    return NextResponse.next();
  }

  // 2. Token Extraction & JWT Verification
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  const bearerToken = authHeader?.replace(/^Bearer\s+/i, "")?.trim();
  const token = request.cookies.get("token")?.value || bearerToken;

  let isAuthenticated = false;
  let userRole = "";
  if (token) {
    try {
      const { payload } = await jwtVerify(token, encodedSecret);
      isAuthenticated = true;
      userRole = (payload.role as string) || "";
    } catch {
      isAuthenticated = false;
      userRole = "";
    }
  }

  // 3. Route Classification
  const isAuthPage = pathname === ADMIN_LOGIN_PATH;
  const isPublicAuthPage = pathname === "/login" || pathname === "/signup";
  const isBlogPage = pathname.startsWith("/blog");
  const isAppPage = pathname === "/download-app" || pathname === "/app";
  const isServicesPage = pathname === "/services" || pathname.startsWith("/services/");
  const isFaqPage = pathname === "/faq" || pathname.startsWith("/faq/");

  const isPublicPage =
    pathname === "/" ||
    PUBLIC_ROUTE_PATHS.includes(pathname) ||
    pathname === "/not-found" ||
    isAuthPage ||
    isPublicAuthPage ||
    isBlogPage ||
    isAppPage ||
    isServicesPage ||
    isFaqPage;

  const isPublicApi =
    pathname === "/api/contact" ||
    pathname === "/api/app/version" ||
    pathname === "/api/client/app-version" ||
    pathname.startsWith("/api/blog/") ||
    pathname.startsWith("/api/downloads");

  const isAuthApi = pathname.startsWith("/api/auth");
  const isClientAuthApi = pathname.startsWith("/api/auth/client/");
  const isSharedAuthApi = pathname === "/api/auth/logout";
  const isCronApi = pathname.startsWith("/api/cron");
  const isWebhookApi = pathname === "/api/operations/whatsapp/webhook";

  const isClientRoute = pathname.startsWith("/client");
  const isClientApi = pathname.startsWith("/api/client/");

  // Admin Routes
  const isUserManagementPage = pathname === "/admin/users" || pathname.startsWith("/admin/users/");
  const isSettingsPage = pathname === "/settings" || pathname.startsWith("/settings/");
  const isAdminOnlyPage =
    isSettingsPage ||
    (pathname.startsWith("/admin") && !isUserManagementPage);

  const isUsersApi = pathname === "/api/users" || pathname.startsWith("/api/users/");
  const isDiagnosticsApi = pathname === "/api/diagnostics" || pathname.startsWith("/api/diagnostics/");

  // 4. Handle Public APIs, Cron, Webhooks
  if (isPublicApi || isCronApi || isWebhookApi) {
    return NextResponse.next();
  }

  // 5. Handle Auth APIs
  if (isAuthApi) {
    if (isClientAuthApi || isSharedAuthApi) {
      return NextResponse.next();
    }
    // Staff auth APIs (e.g. /api/auth/login, /api/auth/signup, /api/auth/me)
    if (isAuthenticated && userRole === "CLIENT") {
      return NextResponse.json({ success: false, error: "Access Denied" }, { status: 403 });
    }
    if (pathname === "/api/auth/me" && !isAuthenticated) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // 6. Handle Client APIs
  if (isClientApi) {
    if (!isAuthenticated) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }
    if (userRole !== "CLIENT") {
      return NextResponse.json({ success: false, error: "Access Denied" }, { status: 403 });
    }
    return NextResponse.next();
  }

  // 7. Handle Admin & Staff APIs (All remaining /api/* endpoints - Default Deny!)
  if (pathname.startsWith("/api/")) {
    if (!isAuthenticated) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }
    if (userRole === "CLIENT") {
      return NextResponse.json({ success: false, error: "Access Denied" }, { status: 403 });
    }

    // Role-based authorization for administrative APIs
    if (isUsersApi) {
      const method = request.method.toUpperCase();
      if (method === "GET") {
        if (!USER_MANAGEMENT_ROLES.includes(userRole)) {
          return NextResponse.json({ success: false, error: "Access Denied" }, { status: 403 });
        }
      } else {
        // POST, PUT, PATCH, DELETE
        if (!ADMIN_ROLES.includes(userRole)) {
          return NextResponse.json({ success: false, error: "Access Denied" }, { status: 403 });
        }
      }
    } else if (isDiagnosticsApi) {
      if (userRole !== "SUPER_ADMIN") {
        return NextResponse.json({ success: false, error: "Access Denied" }, { status: 403 });
      }
    }

    return NextResponse.next();
  }

  // 8. Handle Public Auth Page Redirects for Authenticated Users (/login, /signup, /crm/admin/login)
  if (isPublicAuthPage) {
    if (isAuthenticated) {
      return NextResponse.redirect(
        new URL(userRole === "CLIENT" ? "/client/portal" : "/dashboard", request.url),
      );
    }
    return NextResponse.next();
  }

  if (isAuthPage) {
    if (isAuthenticated) {
      return NextResponse.redirect(
        new URL(userRole === "CLIENT" ? "/client/portal" : "/dashboard", request.url),
      );
    }
    return NextResponse.next();
  }

  // 9. Allow Public Marketing / Web Pages
  if (isPublicPage) {
    return NextResponse.next();
  }

  // =========================================================================
  // PRIVATE BROWSER ROUTES (DEFAULT-DENY)
  // All remaining routes are private application areas.
  // =========================================================================

  // 10. Unauthenticated Requests to Private Routes -> Redirect to Public Login
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 11. Authenticated Client attempting Staff/Admin Routes -> Redirect to Client Portal
  if (userRole === "CLIENT") {
    if (!isClientRoute) {
      return NextResponse.redirect(new URL("/client/portal", request.url));
    }
    return NextResponse.next();
  }

  // 12. Authenticated Staff attempting Client Routes -> Redirect to Dashboard
  if (isClientRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 13. Admin Page RBAC for Staff
  if (isUserManagementPage) {
    if (!USER_MANAGEMENT_ROLES.includes(userRole)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (isAdminOnlyPage) {
    if (!ADMIN_ROLES.includes(userRole)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // 14. Permitted Staff CRM Route
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
