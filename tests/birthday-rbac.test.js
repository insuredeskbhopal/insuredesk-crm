// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, verifyJWTMock } = vi.hoisted(() => ({
  prismaMock: {
    customerProfile: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
  verifyJWTMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ verifyJWT: verifyJWTMock }));

import { GET as getBirthdays, PATCH as patchBirthday } from "../src/app/api/operations/birthday-management/route.js";
import { POST as sendAllWishes } from "../src/app/api/operations/birthday-management/send-all/route.js";
import { POST as sendWhatsApp } from "../src/app/api/operations/whatsapp/send/route.js";

describe("birthday management RBAC & tenant scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks VIEWER role from GET /api/operations/birthday-management with 403", async () => {
    verifyJWTMock.mockResolvedValue({
      userId: "viewer-1",
      role: "VIEWER",
      organizationId: null,
    });

    const req = {
      cookies: { get: () => ({ value: "valid-viewer-token" }) },
    };

    const res = await getBirthdays(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("Viewers cannot view");
    expect(prismaMock.customerProfile.findMany).not.toHaveBeenCalled();
  });

  it("allows MANAGER role to view tenant-wide birthdays without createdById restriction", async () => {
    verifyJWTMock.mockResolvedValue({
      userId: "manager-shweta",
      name: "Shweta Hariyale",
      role: "MANAGER",
      organizationId: null,
    });

    prismaMock.customerProfile.findMany.mockResolvedValue([
      {
        id: "profile-1",
        name: "Mani Kuruvila",
        phone: "9663654430",
        dob: new Date("1983-09-26"),
        createdById: null,
        organizationId: null,
      },
    ]);

    const req = {
      cookies: { get: () => ({ value: "valid-manager-token" }) },
    };

    const res = await getBirthdays(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.profiles).toHaveLength(1);
    expect(data.profiles[0].name).toBe("Mani Kuruvila");

    // Verify query was scoped to organizationId: null (tenant), NOT createdById
    expect(prismaMock.customerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: null,
          deletedAt: null,
          dob: { not: null },
        }),
      })
    );
    const callArgs = prismaMock.customerProfile.findMany.mock.calls[0][0];
    expect(callArgs.where.createdById).toBeUndefined();
  });

  it("allows AGENT role to view tenant-wide birthdays", async () => {
    verifyJWTMock.mockResolvedValue({
      userId: "agent-roshni",
      role: "AGENT",
      organizationId: null,
    });

    prismaMock.customerProfile.findMany.mockResolvedValue([]);

    const req = {
      cookies: { get: () => ({ value: "valid-agent-token" }) },
    };

    const res = await getBirthdays(req);
    expect(res.status).toBe(200);
    const callArgs = prismaMock.customerProfile.findMany.mock.calls[0][0];
    expect(callArgs.where.createdById).toBeUndefined();
  });

  it("blocks VIEWER role from sending bulk birthday wishes via send-all with 403", async () => {
    verifyJWTMock.mockResolvedValue({
      userId: "viewer-1",
      role: "VIEWER",
      organizationId: null,
    });

    const req = {
      cookies: { get: () => ({ value: "valid-viewer-token" }) },
    };

    const res = await sendAllWishes(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("Viewer role has read-only access");
  });

  it("blocks VIEWER role from sending individual WhatsApp greeting with 403", async () => {
    verifyJWTMock.mockResolvedValue({
      userId: "viewer-1",
      role: "VIEWER",
      organizationId: null,
    });

    const req = {
      cookies: { get: () => ({ value: "valid-viewer-token" }) },
      json: async () => ({
        recipient: "919876543210",
        message: "Happy Birthday!",
        attachBirthdayCard: true,
      }),
    };

    const res = await sendWhatsApp(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("Viewer role has read-only access");
  });

  it("blocks VIEWER role from editing birthday DOB with 403", async () => {
    verifyJWTMock.mockResolvedValue({
      userId: "viewer-1",
      role: "VIEWER",
      organizationId: null,
    });

    const req = {
      cookies: { get: () => ({ value: "valid-viewer-token" }) },
      json: async () => ({
        profileId: "profile-1",
        dob: "1990-05-15",
      }),
    };

    const res = await patchBirthday(req);
    expect(res.status).toBe(403);
  });
});
