// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { signJWT } from "../src/lib/auth";
import { requireClient, getOwnedPolicy } from "../src/lib/client-portal/session";
import { prisma } from "../src/lib/db/prisma";
import { GET as getDocumentRoute } from "../src/app/api/client/policies/[id]/document/route";

describe("client document authentication and ownership verification", () => {
  it("authenticates using query parameter token in requireClient", async () => {
    const fakeCustomerId = "11111111-1111-4111-8111-111111111111";
    const token = await signJWT({
      role: "CLIENT",
      customerId: fakeCustomerId,
      organizationId: "org-1",
      credentialVersion: 1,
    });

    vi.spyOn(prisma.clientAccount, "findFirst").mockResolvedValueOnce({
      id: fakeCustomerId,
      name: "Test Customer",
      phone: "9876543210",
      email: "test@example.com",
      organizationId: "org-1",
      createdAt: new Date(),
    });

    vi.spyOn(prisma.task, "findUnique").mockResolvedValueOnce({
      metadata: { credentialVersion: 1 },
    });

    const request = new Request(`http://localhost:3000/api/client/policies/some-id/document?token=${encodeURIComponent(token)}`);
    const auth = await requireClient(request);

    expect(auth.error).toBeUndefined();
    expect(auth.customer.id).toBe(fakeCustomerId);
    expect(auth.organizationId).toBe("org-1");
  });

  it("getOwnedPolicy queries matching policy by phone number and customer name", async () => {
    const fakeDb = {
      $queryRaw: vi.fn().mockImplementation(async (strings, ...values) => {
        return [{ id: "22222222-2222-4222-8222-222222222222" }];
      }),
    };

    const policy = await getOwnedPolicy({
      customerId: "client-id-1",
      organizationId: "org-id-1",
      customer: {
        id: "client-id-1",
        name: "Ramesh Sharma",
        phone: "+91 9876543210",
      },
      policyId: "22222222-2222-4222-8222-222222222222",
      database: fakeDb,
    });

    expect(policy).not.toBeNull();
    expect(policy.id).toBe("22222222-2222-4222-8222-222222222222");
    expect(fakeDb.$queryRaw).toHaveBeenCalled();
  });

  it("getOwnedPolicy safely handles non-UUID policyId (e.g. policy number lookup)", async () => {
    const fakeDb = {
      $queryRaw: vi.fn().mockImplementation(async (strings, ...values) => {
        return [{ id: "33333333-3333-4333-8333-333333333333" }];
      }),
    };

    const policy = await getOwnedPolicy({
      customerId: "client-id-1",
      organizationId: "org-id-1",
      customer: {
        id: "client-id-1",
        name: "Ramesh Sharma",
        phone: "+91 9876543210",
      },
      policyId: "POL/2026/987654",
      database: fakeDb,
    });

    expect(policy).not.toBeNull();
    expect(policy.id).toBe("33333333-3333-4333-8333-333333333333");
    expect(fakeDb.$queryRaw).toHaveBeenCalled();
  });

  it("document route handler serves file from uploadedFile with attachment headers", async () => {
    const fakeCustomerId = "11111111-1111-4111-8111-111111111111";
    const fakePolicyId = "22222222-2222-4222-8222-222222222222";
    const token = await signJWT({
      role: "CLIENT",
      customerId: fakeCustomerId,
      organizationId: "org-1",
      credentialVersion: 1,
    });

    vi.spyOn(prisma.clientAccount, "findFirst").mockResolvedValueOnce({
      id: fakeCustomerId,
      name: "Test Customer",
      phone: "9876543210",
      email: "test@example.com",
      organizationId: "org-1",
      createdAt: new Date(),
    });

    vi.spyOn(prisma.task, "findUnique").mockResolvedValueOnce({
      metadata: { credentialVersion: 1 },
    });

    // Mock policy record with uploadedFile
    vi.spyOn(prisma, "$queryRaw").mockResolvedValueOnce([{ id: fakePolicyId }]);
    vi.spyOn(prisma.policyRecord, "findUnique").mockResolvedValueOnce({
      id: fakePolicyId,
      pdfBytes: null, // Test that it gracefully falls back to uploadedFile.pdfBytes
      pdfFileName: "My_Policy.pdf",
      pdfMimeType: "application/pdf",
      reviewedData: { policyNumber: "POL123" },
      uploadedFile: {
        id: "file-1",
        pdfBytes: Buffer.from("%PDF-1.4 test content"),
        mimeType: "application/pdf",
        storageProvider: "local",
      },
    });

    const request = new Request(`http://localhost:3000/api/client/policies/${fakePolicyId}/document?token=${encodeURIComponent(token)}`);
    const response = await getDocumentRoute(request, { params: Promise.resolve({ id: fakePolicyId }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain('attachment; filename="My_Policy.pdf"');
    const text = await response.text();
    expect(text).toContain("%PDF-1.4 test content");
  });
});
