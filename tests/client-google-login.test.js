import { beforeEach, describe, expect, it, vi } from "vitest";

const { getVerifiedGoogleEmailMock, prismaMock, signJWTMock } = vi.hoisted(() => ({
  getVerifiedGoogleEmailMock: vi.fn(),
  prismaMock: {
    clientAccount: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  signJWTMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ signJWT: signJWTMock }));
vi.mock("@/lib/client-portal/google", () => ({
  getVerifiedGoogleEmail: getVerifiedGoogleEmailMock,
}));

const CLIENT_ID = "50000000-0000-4000-8000-000000000001";

describe("client Google login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signJWTMock.mockResolvedValue("signed-client-token");
    getVerifiedGoogleEmailMock.mockImplementation((token) =>
      token === "valid-google-token" ? "client@gmail.com" : "",
    );
  });

  it("rejects a caller-supplied email without a verified Google token", async () => {
    const { POST } = await import("../src/app/api/auth/client/google-mpin-login/route.js");

    const response = await POST(jsonRequest({ googleEmail: "client@gmail.com" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(prismaMock.clientAccount.findFirst).not.toHaveBeenCalled();
  });

  it("logs in directly when the Google email is already linked", async () => {
    const { POST } = await import("../src/app/api/auth/client/google-mpin-login/route.js");
    prismaMock.clientAccount.findFirst.mockResolvedValueOnce(profile({ googleEmail: "client@gmail.com" }));

    const response = await POST(jsonRequest({ accessToken: "valid-google-token" }));
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.linked).toBe(true);
    expect(body.user.customerId).toBe(CLIENT_ID);
    expect(prismaMock.clientAccount.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { googleEmail: "client@gmail.com", deletedAt: null },
      }),
    );
    expect(prismaMock.clientAccount.update).not.toHaveBeenCalled();
  });

  it("does not auto-link a contact email before Client ID and MPIN verification", async () => {
    const { POST } = await import("../src/app/api/auth/client/google-mpin-login/route.js");
    prismaMock.clientAccount.findFirst.mockResolvedValueOnce(null);

    const response = await POST(jsonRequest({ accessToken: "valid-google-token" }));
    const body = await response.json();

    expect(body.success).toBe(false);
    expect(body.linked).toBe(false);
    expect(prismaMock.clientAccount.update).not.toHaveBeenCalled();
  });

  it("updates the saved Google link during one-time Client ID and MPIN setup", async () => {
    const { POST } = await import("../src/app/api/auth/client/google-mpin-login/route.js");
    prismaMock.clientAccount.findUnique.mockResolvedValueOnce(
      profile({ phone: "9876543210", googleEmail: "old@gmail.com" }),
    );
    prismaMock.clientAccount.findFirst
      .mockResolvedValueOnce(profile({ phone: "9876543210" }))
      .mockResolvedValueOnce(null);

    const response = await POST(
      jsonRequest({ accessToken: "valid-google-token", customerId: CLIENT_ID, mpin: "3210" }),
    );
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(prismaMock.clientAccount.update).toHaveBeenCalledWith({
      where: { id: CLIENT_ID },
      data: { googleEmail: "client@gmail.com" },
    });
  });
});

function jsonRequest(body) {
  return new Request("http://localhost/api/auth/client/google-mpin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function profile(overrides = {}) {
  return {
    id: CLIENT_ID,
    name: "Client One",
    email: "client@gmail.com",
    phone: "9876543210",
    organizationId: "org-1",
    deletedAt: null,
    googleEmail: null,
    ...overrides,
  };
}
