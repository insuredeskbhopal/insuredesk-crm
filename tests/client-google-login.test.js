import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, signJWTMock } = vi.hoisted(() => ({
  prismaMock: {
    customerProfile: {
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

describe("client Google login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signJWTMock.mockResolvedValue("signed-client-token");
  });

  it("logs in directly when the Google email is already linked", async () => {
    const { POST } = await import("../src/app/api/auth/client/google-mpin-login/route.js");
    prismaMock.customerProfile.findFirst.mockResolvedValueOnce(profile({ googleEmail: "client@gmail.com" }));

    const response = await POST(jsonRequest({ googleEmail: "Client@Gmail.com" }));
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.linked).toBe(true);
    expect(body.user.customerId).toBe("client-1");
    expect(prismaMock.customerProfile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { googleEmail: "client@gmail.com", deletedAt: null },
      }),
    );
    expect(prismaMock.customerProfile.update).not.toHaveBeenCalled();
  });

  it("auto-links and logs in when exactly one profile already uses the Google email", async () => {
    const { POST } = await import("../src/app/api/auth/client/google-mpin-login/route.js");
    prismaMock.customerProfile.findFirst.mockResolvedValueOnce(null);
    prismaMock.customerProfile.findMany.mockResolvedValueOnce([profile()]);
    prismaMock.customerProfile.update.mockResolvedValueOnce(profile({ googleEmail: "client@gmail.com" }));

    const response = await POST(jsonRequest({ googleEmail: "client@gmail.com" }));
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.message).toBe("Auto-linked and logged in via Google account");
    expect(prismaMock.customerProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "client-1" },
        data: { googleEmail: "client@gmail.com" },
      }),
    );
  });

  it("updates the saved Google link during one-time Client ID and MPIN setup", async () => {
    const { POST } = await import("../src/app/api/auth/client/google-mpin-login/route.js");
    prismaMock.customerProfile.findUnique.mockResolvedValueOnce(
      profile({ phone: "9876543210", googleEmail: "old@gmail.com" }),
    );
    prismaMock.customerProfile.findFirst.mockResolvedValueOnce(null);

    const response = await POST(
      jsonRequest({ googleEmail: "new@gmail.com", customerId: "client-1", mpin: "3210" }),
    );
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(prismaMock.customerProfile.update).toHaveBeenCalledWith({
      where: { id: "client-1" },
      data: { googleEmail: "new@gmail.com" },
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
    id: "client-1",
    name: "Client One",
    email: "client@gmail.com",
    phone: "9876543210",
    organizationId: "org-1",
    deletedAt: null,
    googleEmail: null,
    ...overrides,
  };
}
