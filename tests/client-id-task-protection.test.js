// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock, requireSessionMock, updateTaskStatusMock } = vi.hoisted(() => ({
  prismaMock: { task: { findFirst: vi.fn(), update: vi.fn() } },
  requireSessionMock: vi.fn(),
  updateTaskStatusMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/session", () => ({
  requireSession: requireSessionMock,
  canWriteOperations: () => true,
}));
vi.mock("@/lib/operations-center/engine", () => ({
  updateTaskStatus: updateTaskStatusMock,
}));

describe("Client ID workflow task protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSessionMock.mockResolvedValue({
      session: { role: "AGENT", userId: "user-1", organizationId: "org-1" },
    });
  });

  it.each(["CLIENT_ID_REQUEST", "CLIENT_PORTAL_SECURITY", "CLIENT_PORTAL_PROFILE"])(
    "blocks generic status changes for %s tasks",
    async (module) => {
      prismaMock.task.findFirst.mockResolvedValueOnce({ module });
      const { PATCH } = await import("../src/app/api/tasks/[id]/route.js");

      const response = await PATCH(
        new NextRequest("http://localhost/api/tasks/task-1", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "COMPLETED" }),
        }),
        { params: Promise.resolve({ id: "task-1" }) },
      );

      expect(response.status).toBe(409);
      expect(updateTaskStatusMock).not.toHaveBeenCalled();
    },
  );
});
