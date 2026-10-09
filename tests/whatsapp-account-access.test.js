// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  verifyJWT: vi.fn(),
  logAudit: vi.fn(),
  prisma: {
    user: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    organization: { findUnique: vi.fn(), update: vi.fn() },
    whatsAppAccount: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    whatsAppAccountAccess: { upsert: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn() },
    whatsAppMessageQueue: { create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(), findMany: vi.fn() },
  },
  client: {
    getWhatsAppSessions: vi.fn(),
    getWhatsAppMetrics: vi.fn(),
    getWhatsAppStatus: vi.fn(),
    getWhatsAppQrCode: vi.fn(),
    createWhatsAppSession: vi.fn(),
    pauseWhatsAppSession: vi.fn(),
    logoutWhatsAppSession: vi.fn(),
    deleteWhatsAppSession: vi.fn(),
    sendWhatsAppText: vi.fn(),
    sendWhatsAppImage: vi.fn(),
    sendWhatsAppFile: vi.fn(),
  },
}));
vi.mock("@/lib/auth", () => ({ verifyJWT: m.verifyJWT }));
vi.mock("@/lib/db/prisma", () => ({ prisma: m.prisma }));
vi.mock("@/lib/audit", () => ({ logAudit: m.logAudit }));
vi.mock("@/lib/whatsapp/whatsapp-client", () => m.client);
import { POST as select, GET as list } from "@/app/api/operations/whatsapp/sessions/route";
import { POST as send } from "@/app/api/operations/whatsapp/send/route";
import { POST as retry } from "@/app/api/operations/whatsapp/queue/route";
import { POST as logout } from "@/app/api/operations/whatsapp/logout/route";
import { GET as status } from "@/app/api/operations/whatsapp/status/route";
import { resolveWhatsAppSender } from "@/lib/whatsapp/account-access";
import { enqueueMessage, processQueueBatch } from "@/lib/whatsapp/queue-manager";
let users, accounts, queue;
const actor = (id, role = "MANAGER", organizationId = "org") => ({
  userId: id,
  organizationId,
  role,
  name: id,
});
const request = (id, body = {}, query = "") => ({
  cookies: { get: () => ({ value: id }) },
  json: async () => body,
  url: `https://crm.test/api/status${query}`,
});
beforeEach(() => {
  vi.resetAllMocks();
  users = {
    siya: { id: "siya", primaryWhatsAppAccountId: null },
    rahul: { id: "rahul", primaryWhatsAppAccountId: null },
  };
  accounts = [
    {
      id: "claims",
      label: "Claims",
      organizationId: "org",
      ownerUserId: null,
      connected: true,
      access: [{ userId: "siya" }],
    },
    {
      id: "operations",
      label: "Operations",
      organizationId: "org",
      ownerUserId: "admin",
      connected: true,
      access: [{ userId: "siya" }, { userId: "rahul" }],
    },
    {
      id: "foreign",
      label: "Foreign",
      organizationId: "other-org",
      connected: true,
      access: [{ userId: "siya" }],
    },
  ];
  queue = [];
  m.verifyJWT.mockImplementation(async (id) => actor(id));
  m.prisma.user.findFirst.mockImplementation(async ({ where }) => users[where.id] || null);
  m.prisma.user.findUnique.mockImplementation(async ({ where }) => users[where.id]);
  m.prisma.user.update.mockImplementation(async ({ where, data }) => Object.assign(users[where.id], data));
  m.prisma.user.findMany.mockResolvedValue([]);
  m.prisma.whatsAppAccount.findFirst.mockImplementation(
    async ({ where }) =>
      accounts.find(
        (a) =>
          a.id === where.id &&
          a.organizationId === where.organizationId &&
          (!where.OR ||
            a.ownerUserId === where.OR[0].ownerUserId ||
            a.access.some((g) => g.userId === where.OR[1].access.some.userId)),
      ) || null,
  );
  m.prisma.whatsAppAccount.findMany.mockImplementation(async () => accounts);
  m.prisma.organization.findUnique.mockResolvedValue({ systemWhatsAppAccountId: "operations" });
  m.client.getWhatsAppSessions.mockImplementation(async () => accounts);
  m.client.getWhatsAppMetrics.mockResolvedValue({ success: true });
  m.client.getWhatsAppStatus.mockResolvedValue({ connected: true, state: "CONNECTED" });
  for (const name of ["sendWhatsAppText", "sendWhatsAppFile", "sendWhatsAppImage"])
    m.client[name].mockResolvedValue({ id: "wa-reference", success: true });
  m.prisma.whatsAppMessageQueue.create.mockImplementation(async ({ data }) => {
    const row = { id: `msg-${queue.length}`, ...data };
    queue.push(row);
    return row;
  });
  m.prisma.whatsAppMessageQueue.update.mockResolvedValue({});
  m.prisma.whatsAppMessageQueue.count.mockResolvedValue(0);
  m.prisma.whatsAppMessageQueue.updateMany.mockResolvedValue({ count: 1 });
});
describe("Independent employee WhatsApp routing", () => {
  it("refreshes authorized account state without fetching staff or gateway diagnostics", async () => {
    m.verifyJWT.mockImplementation(async (id) => actor(id, "ADMIN"));
    users.siya.primaryWhatsAppAccountId = "claims";
    const full = await (await list(request("siya"))).json();
    expect(m.client.getWhatsAppMetrics).toHaveBeenCalledTimes(1);
    expect(m.prisma.user.findMany).toHaveBeenCalledTimes(1);
    const sync = await (await list(request("siya", {}, "?view=sync"))).json();
    expect(sync.accounts).toEqual(full.accounts);
    expect(sync.primaryAccountId).toBe("claims");
    expect(sync.canAdmin).toBe(true);
    expect(sync).not.toHaveProperty("users");
    expect(sync).not.toHaveProperty("metrics");
    expect(m.client.getWhatsAppMetrics).toHaveBeenCalledTimes(1);
    expect(m.prisma.user.findMany).toHaveBeenCalledTimes(1);
    expect(sync.accounts.some((account) => account.id === "foreign")).toBe(false);
  });

  it("keeps sync reads isolated to the authenticated employee's accounts and hides grants", async () => {
    users.rahul.primaryWhatsAppAccountId = "operations";
    const sync = await (await list(request("rahul", {}, "?view=sync"))).json();
    expect(sync.accounts.map((account) => account.id)).toEqual(["operations"]);
    expect(sync.accounts[0].canUse).toBe(true);
    expect(sync.accounts[0]).not.toHaveProperty("accessUserIds");
    expect(sync.primaryAccountId).toBe("operations");
    expect(sync.canAdmin).toBe(false);
    expect(m.client.getWhatsAppMetrics).not.toHaveBeenCalled();
    expect(m.prisma.user.findMany).not.toHaveBeenCalled();
  });
  it("isolates Siya and Rahul, changes only future Siya sends, and survives new request/login objects", async () => {
    expect((await select(request("siya", { action: "set-primary", accountId: "claims" }))).status).toBe(200);
    expect((await select(request("rahul", { action: "set-primary", accountId: "operations" }))).status).toBe(
      200,
    );
    await send(
      request("siya", { recipient: "919999999999", message: "Claims update", accountId: "foreign" }),
    );
    await send(request("rahul", { recipient: "919999999998", message: "Renewal" }));
    expect(m.client.sendWhatsAppText.mock.calls.map((c) => c[2])).toEqual(["claims", "operations"]);
    await select(request("siya", { action: "set-primary", accountId: "operations" }));
    await send(request("siya", { recipient: "919999999999", message: "New update" }));
    expect(m.client.sendWhatsAppText.mock.calls.at(-1)[2]).toBe("operations");
    expect(users.rahul.primaryWhatsAppAccountId).toBe("operations");
    expect((await (await list(request("siya"))).json()).primaryAccountId).toBe("operations");
    expect((await (await list(request("rahul"))).json()).primaryAccountId).toBe("operations");
    expect(queue[0]).toMatchObject({
      initiatedByUserId: "siya",
      accountId: "claims",
      recipientPhone: "919999999999",
      status: "SENDING",
    });
    expect(m.prisma.whatsAppMessageQueue.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "SENT",
          openwaMessageId: "wa-reference",
          sentAt: expect.any(Date),
        }),
      }),
    );
    expect(accounts[0].ownerUserId).toBeNull(); // Selection requires access, not a guessed original owner.
    expect(m.client.logoutWhatsAppSession).not.toHaveBeenCalled();
  });
  it.each(["claims", "foreign", "missing"])(
    "rejects Rahul's unauthorized selection of %s",
    async (accountId) => {
      expect((await select(request("rahul", { action: "set-primary", accountId }))).status).toBe(403);
      expect(users.rahul.primaryWhatsAppAccountId).toBeNull();
    },
  );
  it("requires selection and never falls back on disconnect, revocation, or removed account", async () => {
    await expect(resolveWhatsAppSender(actor("siya"))).rejects.toThrow("Select My Primary");
    users.siya.primaryWhatsAppAccountId = "claims";
    accounts[0].connected = false;
    expect((await send(request("siya", { recipient: "919999999999", message: "Test" }))).status).toBe(409);
    expect(users.siya.primaryWhatsAppAccountId).toBe("claims");
    accounts[0].connected = true;
    accounts[0].access = [];
    expect((await send(request("siya", { recipient: "919999999999", message: "Test" }))).status).toBe(403);
    accounts.shift();
    await expect(resolveWhatsAppSender(actor("siya"))).rejects.toThrow("not authorized");
    expect(m.client.sendWhatsAppText).not.toHaveBeenCalled();
  });
  it.each(["pause", "logout", "delete"])("sending access does not confer %s permission", async (action) => {
    expect((await select(request("siya", { action, accountId: "claims" }))).status).toBe(403);
    expect((await logout(request("siya", { accountId: "claims" }))).status).toBe(403);
  });
  it("does not leak other organizations through the account listing", async () => {
    m.verifyJWT.mockResolvedValue(actor("siya", "ADMIN"));
    const data = await (await list(request("siya"))).json();
    expect(data.accounts.map((a) => a.id)).not.toContain("foreign");
  });
  it("denies pairing QR to a sender grant recipient", async () => {
    expect((await status(request("siya", {}, "?accountId=claims"))).status).toBe(403);
    expect(m.client.getWhatsAppQrCode).not.toHaveBeenCalled();
  });
  it("routes a policy PDF attachment and birthday image through the personal sender", async () => {
    users.siya.primaryWhatsAppAccountId = "claims";
    expect(
      (
        await send(
          request("siya", {
            recipient: "919999999999",
            message: "Policy",
            attachments: [{ filename: "policy.pdf", mediaBase64: "JVBERi0=", mediaType: "document" }],
          }),
        )
      ).status,
    ).toBe(200);
    expect(m.client.sendWhatsAppFile.mock.calls[0][4]).toBe("claims");
    expect(queue[0].initiatedByUserId).toBe("siya");
    expect((await send(request("siya", { recipient: "919999999999", message: "Image", attachments: [{ filename: "greeting.jpg", mediaBase64: "aW1hZ2U=", mediaType: "image" }] }))).status).toBe(200);
    expect(m.client.sendWhatsAppImage.mock.calls[0][4]).toBe("claims");
  });
  it("uses only explicitly configured organization system sender", async () => {
    expect(await resolveWhatsAppSender({ organizationId: "org" })).toBe("operations");
    m.prisma.organization.findUnique.mockResolvedValue({ systemWhatsAppAccountId: null });
    await expect(resolveWhatsAppSender({ organizationId: "org" })).rejects.toThrow("configure the system");
  });
  it("locks queued sender at enqueue and rechecks access without adopting a later preference", async () => {
    users.siya.primaryWhatsAppAccountId = "claims";
    const result = await enqueueMessage({
      organizationId: "org",
      initiatedByUserId: "siya",
      recipientPhone: "919999999999",
      messageBody: "Queued follow-up",
    });
    users.siya.primaryWhatsAppAccountId = "operations";
    m.prisma.whatsAppMessageQueue.findMany.mockResolvedValue([{ ...result.message, attempts: 0 }]);
    expect((await processQueueBatch(1)).processedCount).toBe(1);
    expect(m.client.sendWhatsAppText.mock.calls.at(-1)[2]).toBe("claims");
    accounts[0].access = [];
    m.client.sendWhatsAppText.mockClear();
    expect((await processQueueBatch(1)).processedCount).toBe(0);
    expect(m.client.sendWhatsAppText).not.toHaveBeenCalled();
  });
  it("supports BHQ's legacy null workspace without moving staff to another organization", async () => {
    accounts[0].organizationId = null;
    m.verifyJWT.mockResolvedValue(actor("siya", "MANAGER", null));
    users.siya.primaryWhatsAppAccountId = "claims";
    expect((await list(request("siya"))).status).toBe(200);
    expect((await send(request("siya", { recipient: "919999999999", message: "Legacy workspace" }))).status).toBe(200);
    expect(queue[0]).toMatchObject({ organizationId: null, initiatedByUserId: "siya", accountId: "claims" });
    expect(m.client.sendWhatsAppText.mock.calls.at(-1)[2]).toBe("claims");
  });
  it.each(["SUPER_ADMIN", "ADMIN", "MANAGER", "AGENT"])("allows %s account listing in the legacy workspace", async (role) => {
    m.verifyJWT.mockResolvedValue(actor("siya", role, null));
    expect((await list(request("siya"))).status).toBe(200);
  });
  it("denies client sessions and prevents viewer writes", async () => {
    m.verifyJWT.mockResolvedValue(actor("siya", "CLIENT", null));
    expect((await list(request("siya"))).status).toBe(403);
    m.verifyJWT.mockResolvedValue(actor("siya", "VIEWER", null));
    expect((await list(request("siya"))).status).toBe(200);
    expect((await select(request("siya", { action: "register", accountId: "claims" }))).status).toBe(403);
  });
  it("treats duplicate registration in the same workspace as already enabled without altering access or ownership", async () => {
    m.verifyJWT.mockResolvedValue(actor("admin", "ADMIN"));
    m.prisma.whatsAppAccount.create.mockRejectedValue({ code: "P2002" });
    const original = globalThis.structuredClone(accounts[0]);
    const results = await Promise.all([select(request("admin", { action: "register", accountId: "claims" })), select(request("admin", { action: "register", accountId: "claims" }))]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(accounts[0]).toEqual(original);
    expect(m.prisma.whatsAppAccount.update).not.toHaveBeenCalled();
    expect(m.prisma.whatsAppAccountAccess.upsert).not.toHaveBeenCalled();
    expect(m.prisma.whatsAppAccountAccess.createMany).not.toHaveBeenCalled();
  });
  it("rejects duplicate registration belonging to another workspace", async () => {
    m.verifyJWT.mockResolvedValue(actor("admin", "ADMIN"));
    accounts[0].organizationId = "other-org";
    m.client.getWhatsAppSessions.mockResolvedValue([{ id: "claims", label: "Claims" }]);
    m.prisma.whatsAppAccount.create.mockRejectedValue({ code: "P2002" });
    expect((await select(request("admin", { action: "register", accountId: "claims" }))).status).toBe(403);
  });
  it("does not hide unrelated registration database failures", async () => {
    m.verifyJWT.mockResolvedValue(actor("admin", "ADMIN"));
    m.prisma.whatsAppAccount.create.mockRejectedValue(new Error("Database unavailable"));
    const response = await select(request("admin", { action: "register", accountId: "claims" }));
    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("Database unavailable");
  });
  it("allows repeated administrator grants without duplicating access or changing ownership", async () => {
    m.verifyJWT.mockResolvedValue(actor("admin", "ADMIN"));
    m.prisma.user.findFirst.mockImplementation(async ({ where }) => where.id === "rahul" && where.organizationId === "org" ? users.rahul : null);
    const grants = new Set();
    m.prisma.whatsAppAccountAccess.createMany.mockImplementation(async ({ data, skipDuplicates }) => {
      const key = `${data.accountId}:${data.userId}`;
      if (grants.has(key)) {
        if (!skipDuplicates) throw Object.assign(new Error("Duplicate grant"), { code: "P2002" });
        return { count: 0 };
      }
      grants.add(key);
      return { count: 1 };
    });
    const results = await Promise.all([select(request("admin", { action: "grant", accountId: "claims", userId: "rahul", allowed: true })), select(request("admin", { action: "grant", accountId: "claims", userId: "rahul", allowed: true }))]);
    expect(results.map(response => response.status)).toEqual([200, 200]);
    expect(grants.size).toBe(1);
    expect(accounts[0].ownerUserId).toBeNull();
    expect(m.prisma.whatsAppAccount.update).not.toHaveBeenCalled();
  });
  it("rejects access grants by non-admin owners and for foreign-workspace targets", async () => {
    accounts[0].ownerUserId = "siya";
    expect((await select(request("siya", { action: "grant", accountId: "claims", userId: "rahul", allowed: true }))).status).toBe(403);
    m.verifyJWT.mockResolvedValue(actor("admin", "ADMIN"));
    m.prisma.user.findFirst.mockResolvedValue(null);
    expect((await select(request("admin", { action: "grant", accountId: "claims", userId: "foreign", allowed: true }))).status).toBe(400);
    expect(m.prisma.whatsAppAccountAccess.createMany).not.toHaveBeenCalled();
  });
  it("atomically claims one queued message across two simultaneous workers", async () => {
    users.siya.primaryWhatsAppAccountId = "claims";
    const { message } = await enqueueMessage({ organizationId: "org", initiatedByUserId: "siya", recipientPhone: "919999999999", messageBody: "One message" });
    m.prisma.whatsAppMessageQueue.findMany.mockResolvedValue([{ ...message, attempts: 0 }]);
    let pending = true;
    m.prisma.whatsAppMessageQueue.updateMany.mockImplementation(async () => { if (!pending) return { count: 0 }; pending = false; return { count: 1 }; });
    const batches = await Promise.all([processQueueBatch(1), processQueueBatch(1)]);
    expect(batches.reduce((total, result) => total + result.processedCount, 0)).toBe(1);
    expect(m.client.sendWhatsAppText).toHaveBeenCalledTimes(1);
  });
  it("refuses retry of attachment audit rows without the original file payload", async () => {
    m.prisma.whatsAppMessageQueue.findFirst.mockResolvedValue({ id: "audit", initiatedByUserId: "siya", messageType: "PDF", fileName: "policy.pdf", mediaUrl: null });
    expect((await retry(request("siya", { messageId: "audit" }))).status).toBe(409);
    expect(m.prisma.whatsAppMessageQueue.update).not.toHaveBeenCalled();
  });
  it("legacy queued null sender never routes through the gateway default", async () => {
    m.prisma.whatsAppMessageQueue.findMany.mockResolvedValue([
      { id: "legacy", organizationId: "org", recipientPhone: "919999999999", accountId: null, attempts: 0 },
    ]);
    expect((await processQueueBatch(1)).processedCount).toBe(0);
    expect(m.client.sendWhatsAppText).not.toHaveBeenCalled();
  });
});
