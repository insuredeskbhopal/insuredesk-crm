// @vitest-environment node

import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-only-jwt-secret-change-me");

describe("ERR-005: Middleware & RBAC Route Protection", () => {
  describe("1. Unauthenticated Direct URL Access (Default-Deny)", () => {
    it("denies unauthenticated request to /dashboard and redirects to /login", async () => {
      const response = await middleware(new NextRequest("http://localhost/dashboard"));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost/login");
    });

    it("denies unauthenticated request to /admin/users and redirects to /login", async () => {
      const response = await middleware(new NextRequest("http://localhost/admin/users"));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost/login");
    });

    it("denies unauthenticated request to /settings and redirects to /login", async () => {
      const response = await middleware(new NextRequest("http://localhost/settings"));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost/login");
    });

    it("denies unauthenticated request to /work-center and redirects to /login", async () => {
      const response = await middleware(new NextRequest("http://localhost/work-center"));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost/login");
    });

    it("denies unauthenticated request to /client/portal and redirects to /login", async () => {
      const response = await middleware(new NextRequest("http://localhost/client/portal"));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost/login");
    });

    it("returns 401 for unauthenticated request to private staff API /api/records", async () => {
      const response = await middleware(new NextRequest("http://localhost/api/records"));
      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({ error: "Not authenticated" });
    });

    it("returns 401 for unauthenticated request to /api/users", async () => {
      const response = await middleware(new NextRequest("http://localhost/api/users"));
      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({ error: "Not authenticated" });
    });

    it("returns 401 for unauthenticated request to /api/client/profile", async () => {
      const response = await middleware(new NextRequest("http://localhost/api/client/profile"));
      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({ error: "Not authenticated" });
    });
  });

  describe("2. Staff Role Access Controls", () => {
    it("allows AGENT to access general CRM routes (/dashboard, /policy-records, /work-center, /upload-history)", async () => {
      for (const path of ["/dashboard", "/policy-records", "/work-center", "/upload-history"]) {
        const response = await middleware(
          await requestWithToken(`http://localhost${path}`, { role: "AGENT", userId: "agent-1" }),
        );
        expect(response.status).toBe(200);
        expect(response.headers.get("x-middleware-next")).toBe("1");
      }
    });

    it("denies AGENT and VIEWER direct URL to /admin/users and redirects to /dashboard", async () => {
      for (const role of ["AGENT", "VIEWER"]) {
        const response = await middleware(
          await requestWithToken("http://localhost/admin/users", { role, userId: "staff-1" }),
        );
        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe("http://localhost/dashboard");
      }
    });

    it("denies AGENT, VIEWER, and MANAGER direct URL to /settings and redirects to /dashboard", async () => {
      for (const role of ["AGENT", "VIEWER", "MANAGER"]) {
        const response = await middleware(
          await requestWithToken("http://localhost/settings", { role, userId: "staff-1" }),
        );
        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe("http://localhost/dashboard");
      }
    });

    it("allows MANAGER direct URL to /admin/users", async () => {
      const response = await middleware(
        await requestWithToken("http://localhost/admin/users", { role: "MANAGER", userId: "mgr-1" }),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("x-middleware-next")).toBe("1");
    });

    it("allows ADMIN and SUPER_ADMIN direct URL to /admin/users and /settings", async () => {
      for (const role of ["ADMIN", "SUPER_ADMIN"]) {
        for (const path of ["/admin/users", "/settings"]) {
          const response = await middleware(
            await requestWithToken(`http://localhost${path}`, { role, userId: "admin-1" }),
          );
          expect(response.status).toBe(200);
          expect(response.headers.get("x-middleware-next")).toBe("1");
        }
      }
    });
  });

  describe("3. Client Account Isolation", () => {
    it("redirects CLIENT away from CRM/staff routes (/dashboard, /work-center, /admin/users, /settings) to /client/portal", async () => {
      for (const path of ["/dashboard", "/work-center", "/admin/users", "/settings", "/policy-records"]) {
        const response = await middleware(
          await requestWithToken(`http://localhost${path}`, { role: "CLIENT", customerId: "client-1" }),
        );
        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe("http://localhost/client/portal");
      }
    });

    it("allows CLIENT to access /client/portal", async () => {
      const response = await middleware(
        await requestWithToken("http://localhost/client/portal", { role: "CLIENT", customerId: "client-1" }),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("x-middleware-next")).toBe("1");
    });

    it("blocks CLIENT users from staff data APIs with 403", async () => {
      for (const path of ["/api/records", "/api/users", "/api/policy-records", "/api/endorsements"]) {
        const response = await middleware(
          await requestWithToken(`http://localhost${path}`, { role: "CLIENT", customerId: "client-1" }),
        );
        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toMatchObject({ error: "Access Denied" });
      }
    });

    it("blocks CLIENT users from staff auth APIs (/api/auth/me, /api/auth/login)", async () => {
      for (const path of ["/api/auth/me", "/api/auth/login", "/api/auth/signup"]) {
        const response = await middleware(
          await requestWithToken(`http://localhost${path}`, { role: "CLIENT", customerId: "client-1" }),
        );
        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toMatchObject({ error: "Access Denied" });
      }
    });

    it("lets CLIENT access client APIs (/api/client/profile, /api/client/policies)", async () => {
      for (const path of ["/api/client/profile", "/api/client/policies"]) {
        const response = await middleware(
          await requestWithToken(`http://localhost${path}`, { role: "CLIENT", customerId: "client-1" }),
        );
        expect(response.status).toBe(200);
        expect(response.headers.get("x-middleware-next")).toBe("1");
      }
    });
  });

  describe("4. Staff to Client Isolation", () => {
    it("redirects staff away from /client/portal to /dashboard", async () => {
      const response = await middleware(
        await requestWithToken("http://localhost/client/portal", { role: "AGENT", userId: "agent-1" }),
      );
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost/dashboard");
    });

    it("blocks staff from client APIs (/api/client/profile) with 403", async () => {
      const response = await middleware(
        await requestWithToken("http://localhost/api/client/profile", { role: "AGENT", userId: "agent-1" }),
      );
      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toMatchObject({ error: "Access Denied" });
    });
  });

  describe("5. Public Routes & Static Assets", () => {
    it("allows public homepage and marketing pages without authentication", async () => {
      for (const path of [
        "/",
        "/about",
        "/contact",
        "/faq",
        "/services",
        "/services/health-insurance",
        "/blog",
        "/privacy-policy",
        "/terms-and-conditions",
        "/disclaimer",
        "/download-app",
      ]) {
        const response = await middleware(new NextRequest(`http://localhost${path}`));
        expect(response.status).toBe(200);
        expect(response.headers.get("x-middleware-next")).toBe("1");
      }
    });

    it("allows unauthenticated users to access /login, /signup, and /crm/admin/login", async () => {
      for (const path of ["/login", "/signup", "/crm/admin/login"]) {
        const response = await middleware(new NextRequest(`http://localhost${path}`));
        expect(response.status).toBe(200);
        expect(response.headers.get("x-middleware-next")).toBe("1");
      }
    });

    it("redirects authenticated staff away from /login and /signup to /dashboard", async () => {
      for (const path of ["/login", "/signup"]) {
        const response = await middleware(
          await requestWithToken(`http://localhost${path}`, { role: "AGENT", userId: "agent-1" }),
        );
        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe("http://localhost/dashboard");
      }
    });

    it("redirects authenticated client away from /login and /signup to /client/portal", async () => {
      for (const path of ["/login", "/signup"]) {
        const response = await middleware(
          await requestWithToken(`http://localhost${path}`, { role: "CLIENT", customerId: "client-1" }),
        );
        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe("http://localhost/client/portal");
      }
    });

    it("allows static assets to pass through without authentication", async () => {
      for (const path of [
        "/_next/static/chunks/app.js",
        "/favicon.ico",
        "/favicon.png",
        "/images/banner.png",
        "/brand/logo.svg",
        "/robots.txt",
        "/sitemap.xml",
      ]) {
        const response = await middleware(new NextRequest(`http://localhost${path}`));
        expect(response.status).toBe(200);
        expect(response.headers.get("x-middleware-next")).toBe("1");
      }
    });

    it("allows public APIs without authentication", async () => {
      for (const path of ["/api/contact", "/api/app/version", "/api/client/app-version"]) {
        const response = await middleware(new NextRequest(`http://localhost${path}`));
        expect(response.status).toBe(200);
        expect(response.headers.get("x-middleware-next")).toBe("1");
      }
    });
  });

  describe("6. Admin API RBAC Enforcement", () => {
    it("blocks AGENT and VIEWER from GET /api/users with 403", async () => {
      for (const role of ["AGENT", "VIEWER"]) {
        const response = await middleware(
          await requestWithToken("http://localhost/api/users", { role, userId: "staff-1" }, "GET"),
        );
        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toMatchObject({ error: "Access Denied" });
      }
    });

    it("allows MANAGER to GET /api/users", async () => {
      const response = await middleware(
        await requestWithToken("http://localhost/api/users", { role: "MANAGER", userId: "mgr-1" }, "GET"),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("x-middleware-next")).toBe("1");
    });

    it("blocks MANAGER from mutating users (POST /api/users) with 403", async () => {
      const response = await middleware(
        await requestWithToken("http://localhost/api/users", { role: "MANAGER", userId: "mgr-1" }, "POST"),
      );
      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toMatchObject({ error: "Access Denied" });
    });

    it("allows ADMIN and SUPER_ADMIN to POST /api/users", async () => {
      for (const role of ["ADMIN", "SUPER_ADMIN"]) {
        const response = await middleware(
          await requestWithToken("http://localhost/api/users", { role, userId: "admin-1" }, "POST"),
        );
        expect(response.status).toBe(200);
        expect(response.headers.get("x-middleware-next")).toBe("1");
      }
    });

    it("blocks ADMIN from /api/diagnostics and allows only SUPER_ADMIN", async () => {
      const adminRes = await middleware(
        await requestWithToken("http://localhost/api/diagnostics", { role: "ADMIN", userId: "admin-1" }),
      );
      expect(adminRes.status).toBe(403);

      const superRes = await middleware(
        await requestWithToken("http://localhost/api/diagnostics", { role: "SUPER_ADMIN", userId: "super-1" }),
      );
      expect(superRes.status).toBe(200);
      expect(superRes.headers.get("x-middleware-next")).toBe("1");
    });
  });
});

async function requestWithToken(url: string, payload: Record<string, unknown>, method = "GET") {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);

  return new NextRequest(url, {
    method,
    headers: {
      cookie: `token=${token}`,
    },
  });
}
