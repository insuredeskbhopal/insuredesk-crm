// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock, getNotificationFeedMock, getUnreadNotificationCountMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  getNotificationFeedMock: vi.fn(),
  getUnreadNotificationCountMock: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ requireSession: requireSessionMock }));
vi.mock("@/lib/operations-center/engine", () => ({
  getNotificationFeed: getNotificationFeedMock,
  getUnreadNotificationCount: getUnreadNotificationCountMock,
  markNotificationsRead: vi.fn(),
}));

import { GET } from "../src/app/api/notifications/route.js";

describe("header lazy loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSessionMock.mockResolvedValue({ session: { userId: "user-1", organizationId: "org-1" } });
    getUnreadNotificationCountMock.mockResolvedValue(7);
  });

  it("loads only the unread count during header startup", async () => {
    const response = await GET(new Request("http://localhost/api/notifications?countOnly=true"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, unreadCount: 7 });
    expect(getUnreadNotificationCountMock).toHaveBeenCalledWith({ userId: "user-1", organizationId: "org-1" });
    expect(getNotificationFeedMock).not.toHaveBeenCalled();
  });
});
