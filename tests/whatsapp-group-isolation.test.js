// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
let store, dir;
beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bhq-groups-"));
  vi.stubEnv("WHATSAPP_GATEWAY_SESSIONS_DIR", dir);
  store = await import("../whatsapp-gateway/group-store.js");
});
afterAll(() => { vi.unstubAllEnvs(); fs.rmSync(dir, { recursive: true, force: true }); });
it("keeps same-named/shared groups isolated and does not deactivate another account's groups", () => {
  const group = { groupId: "123456@g.us", groupName: "Customer Group", participantCount: 1, groupParticipants: [{ phone: "919999999999" }] };
  store.storeDiscoveredGroups([group], "claims");
  store.storeDiscoveredGroups([group, { ...group, groupId: "654321@g.us", groupName: "Operations only" }], "operations");
  expect(store.getStoredGroups({ accountId: "claims" }).map(g => g.groupId)).toEqual(["123456@g.us"]);
  expect(store.getStoredGroups({ accountId: "operations" })).toHaveLength(2);
  store.storeDiscoveredGroups([], "claims");
  expect(store.getStoredGroups({ accountId: "claims" })).toHaveLength(0);
  expect(store.getStoredGroups({ accountId: "operations" })).toHaveLength(2);
  expect(store.findStoredGroupsByParticipant("919999999999", "claims")).toHaveLength(0);
  expect(store.findStoredGroupsByParticipant("919999999999", "operations")).toHaveLength(2);
});
