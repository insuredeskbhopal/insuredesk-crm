// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { comparePasswordMock, hashPasswordMock, prismaMock, signJWTMock } = vi.hoisted(() => ({
  comparePasswordMock: vi.fn(),
  hashPasswordMock: vi.fn(),
  signJWTMock: vi.fn(),
  prismaMock: {
    clientAccount: { findFirst: vi.fn(), findUnique: vi.fn() },
    task: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({
  comparePassword: comparePasswordMock,
  hashPassword: hashPasswordMock,
  signJWT: signJWTMock,
}));

const CLIENT_ID = "50000000-0000-4000-8000-000000000001";

describe("Client ID foundation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hashPasswordMock.mockResolvedValue("new-mpin-hash");
    signJWTMock.mockResolvedValue("client-token");
  });

  it("rejects malformed Client IDs without querying the database", async () => {
    const { findActiveClientAccount, normalizeClientId } = await import(
      "../src/lib/client-accounts/server.js"
    );

    expect(normalizeClientId("not-a-client-id")).toBe("");
    await expect(findActiveClientAccount("not-a-client-id", "org-1")).resolves.toBeNull();
    expect(prismaMock.clientAccount.findFirst).not.toHaveBeenCalled();
  });

  it("checks active Client IDs inside the policy organization", async () => {
    const account = { id: CLIENT_ID, organizationId: "org-1" };
    prismaMock.clientAccount.findFirst.mockResolvedValueOnce(account);
    const { findActiveClientAccount } = await import("../src/lib/client-accounts/server.js");

    await expect(findActiveClientAccount(` ${CLIENT_ID} `, "org-1")).resolves.toBe(account);
    expect(prismaMock.clientAccount.findFirst).toHaveBeenCalledWith({
      where: { id: CLIENT_ID, organizationId: "org-1", deletedAt: null },
      select: { id: true, name: true, phone: true, email: true, organizationId: true },
    });
  });

  it("canonicalizes uppercase Client IDs before they are stored or compared", async () => {
    const { normalizeClientId } = await import("../src/lib/client-accounts/server.js");

    expect(normalizeClientId(CLIENT_ID.toUpperCase())).toBe(CLIENT_ID);
  });

  it("uses execute-only advisory locks so PostgreSQL void results are not deserialized", async () => {
    const transaction = { $executeRaw: vi.fn() };
    const database = { $transaction: vi.fn((operation) => operation(transaction)) };
    const operation = vi.fn().mockResolvedValue("saved");
    const { withClientIdLock } = await import("../src/lib/client-accounts/server.js");

    await expect(withClientIdLock(CLIENT_ID, operation, database)).resolves.toBe("saved");
    expect(transaction.$executeRaw).toHaveBeenCalledTimes(1);
    expect(operation).toHaveBeenCalledWith(transaction);
  });

  it("locks an MPIN credential after five failed attempts", async () => {
    prismaMock.task.findUnique.mockResolvedValueOnce({
      metadata: { failedAttempts: 4, mpinHash: null },
    });
    const { verifyClientMpin } = await import("../src/lib/client-portal/credentials.js");

    await expect(
      verifyClientMpin(
        { id: CLIENT_ID, name: "Vijay Kumar Mishra", phone: "9876543210", organizationId: "org-1" },
        "0000",
      ),
    ).resolves.toBe(false);

    const metadata = prismaMock.task.upsert.mock.calls[0][0].update.metadata;
    expect(metadata.failedAttempts).toBe(5);
    expect(Date.parse(metadata.lockedUntil)).toBeGreaterThan(Date.now());
  });

  it("rejects even the correct MPIN while the credential is locked", async () => {
    prismaMock.task.findUnique.mockResolvedValueOnce({
      metadata: { failedAttempts: 5, lockedUntil: new Date(Date.now() + 60_000).toISOString() },
    });
    const { verifyClientMpin } = await import("../src/lib/client-portal/credentials.js");

    await expect(
      verifyClientMpin(
        { id: CLIENT_ID, name: "Vijay Kumar Mishra", phone: "9876543210", organizationId: "org-1" },
        "3210",
      ),
    ).resolves.toBe(false);
    expect(prismaMock.task.upsert).not.toHaveBeenCalled();
  });

  it("changes an MPIN by incrementing its session version and clearing lockout state", async () => {
    prismaMock.clientAccount.findUnique.mockResolvedValueOnce({
      id: CLIENT_ID,
      name: "Vijay Kumar Mishra",
      phone: "9876543210",
      organizationId: "org-1",
    });
    prismaMock.task.findUnique.mockResolvedValueOnce({
      metadata: { credentialVersion: 4, failedAttempts: 5, lockedUntil: "2026-07-23T12:00:00.000Z" },
    });
    const { setClientMpin } = await import("../src/lib/client-portal/credentials.js");

    await setClientMpin(CLIENT_ID, "2468", 4);

    expect(prismaMock.task.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          metadata: {
            mpinHash: "new-mpin-hash",
            failedAttempts: 0,
            lockedUntil: null,
            credentialVersion: 5,
          },
        }),
      }),
    );
  });

  it("rejects an MPIN update when the credential version changed during the request", async () => {
    prismaMock.clientAccount.findUnique.mockResolvedValueOnce({
      id: CLIENT_ID,
      name: "Vijay Kumar Mishra",
      phone: "9876543210",
      organizationId: "org-1",
    });
    prismaMock.task.findUnique.mockResolvedValueOnce({
      metadata: { credentialVersion: 5 },
    });
    const { setClientMpin } = await import("../src/lib/client-portal/credentials.js");

    await expect(setClientMpin(CLIENT_ID, "2468", 4)).rejects.toMatchObject({
      code: "CREDENTIAL_VERSION_CONFLICT",
    });
    expect(prismaMock.task.upsert).not.toHaveBeenCalled();
  });

  it("signs a regular client session with the version verified alongside the MPIN", async () => {
    prismaMock.clientAccount.findUnique.mockResolvedValueOnce({
      id: CLIENT_ID,
      name: "Vijay Kumar Mishra",
      phone: "9876543210",
      email: "vijay@example.com",
      organizationId: "org-1",
      deletedAt: null,
    });
    prismaMock.task.findUnique.mockResolvedValueOnce({
      metadata: { credentialVersion: 7, mpinHash: "saved-mpin-hash" },
    });
    comparePasswordMock.mockResolvedValueOnce(true);
    const { POST } = await import("../src/app/api/auth/client/login/route.js");

    const response = await POST(
      new Request("http://localhost/api/auth/client/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: CLIENT_ID, mpin: "3210" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(signJWTMock).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: CLIENT_ID, credentialVersion: 7 }),
    );
  });
});

describe("Google identity verification", () => {
  it("accepts only a verified, unexpired token issued to this portal", async () => {
    const { getVerifiedGoogleEmail } = await import("../src/lib/client-portal/google.js");
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          aud: "780359724362-m0i25gff41i2dgru6atnkjc02n2hcq74.apps.googleusercontent.com",
          email: "Client@Gmail.com",
          email_verified: true,
          expires_in: 1200,
        }),
    });

    await expect(getVerifiedGoogleEmail("google-token", fetcher)).resolves.toBe("client@gmail.com");
  });

  it.each([
    { aud: "wrong-client", email_verified: true, expires_in: 1200 },
    {
      aud: "780359724362-m0i25gff41i2dgru6atnkjc02n2hcq74.apps.googleusercontent.com",
      email_verified: false,
      expires_in: 1200,
    },
    {
      aud: "780359724362-m0i25gff41i2dgru6atnkjc02n2hcq74.apps.googleusercontent.com",
      email_verified: true,
      expires_in: 0,
    },
  ])("rejects an invalid Google token profile", async (profile) => {
    const { getVerifiedGoogleEmail } = await import("../src/lib/client-portal/google.js");
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...profile, email: "client@gmail.com" }),
    });

    await expect(getVerifiedGoogleEmail("google-token", fetcher)).resolves.toBe("");
  });
});
