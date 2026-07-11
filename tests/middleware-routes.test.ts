// @vitest-environment node

import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-only-jwt-secret-change-me");

describe("middleware route boundaries", () => {
  it("redirects CLIENT users away from staff-only routes not listed in protected prefixes", async () => {
    const response = await middleware(
      await requestWithToken("http://localhost/admin/users", {
        role: "CLIENT",
        customerId: "client-1",
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/client/portal");
  });

  it("lets CLIENT API routes reach their route handlers", async () => {
    const response = await middleware(
      await requestWithToken("http://localhost/api/client/profile", {
        role: "CLIENT",
        customerId: "client-1",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("blocks CLIENT users from staff data APIs", async () => {
    const response = await middleware(
      await requestWithToken("http://localhost/api/records", {
        role: "CLIENT",
        customerId: "client-1",
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: "Access Denied" });
  });

  it("blocks CLIENT users from staff auth helper APIs", async () => {
    const response = await middleware(
      await requestWithToken("http://localhost/api/auth/me", {
        role: "CLIENT",
        customerId: "client-1",
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: "Access Denied" });
  });
});

async function requestWithToken(url: string, payload: Record<string, unknown>) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);

  return new NextRequest(url, {
    headers: {
      cookie: `token=${token}`,
    },
  });
}
