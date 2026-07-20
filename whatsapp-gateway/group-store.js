import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sessionsRoot =
  process.env.WHATSAPP_GATEWAY_SESSIONS_DIR || path.join(__dirname, "sessions");
const storePath = path.join(sessionsRoot, "groups.json");
let cachedGroups = null;
let activityWriteTimer = null;

function readStore() {
  if (cachedGroups) return { groups: cachedGroups };
  try {
    if (!fs.existsSync(storePath)) return { groups: [] };
    const parsed = JSON.parse(fs.readFileSync(storePath, "utf8"));
    cachedGroups = Array.isArray(parsed.groups) ? parsed.groups : [];
    return { groups: cachedGroups };
  } catch (error) {
    console.warn("[Groups] Could not read cached groups:", error.message);
    return { groups: [] };
  }
}

function writeStore(groups) {
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  const tempPath = `${storePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify({ groups }, null, 2), "utf8");
  fs.renameSync(tempPath, storePath);
  cachedGroups = groups;
}

export function getStoredGroups({ includeInactive = false } = {}) {
  const groups = readStore().groups;
  return includeInactive ? groups : groups.filter((group) => group.active !== false);
}

export function storeDiscoveredGroups(discoveredGroups, whatsappSessionId) {
  const syncedAt = new Date().toISOString();
  const existing = new Map(
    getStoredGroups({ includeInactive: true }).map((group) => [group.groupId, group]),
  );
  const discoveredIds = new Set();

  for (const group of discoveredGroups) {
    discoveredIds.add(group.groupId);
    existing.set(group.groupId, {
      ...existing.get(group.groupId),
      id: group.groupId,
      whatsappSessionId: whatsappSessionId || null,
      groupId: group.groupId,
      groupName: group.groupName,
      participantCount: group.participantCount,
      groupParticipants: Array.isArray(group.groupParticipants) ? group.groupParticipants : [],
      creationTime: group.creationTime || null,
      lastSyncedAt: syncedAt,
      active: true,
    });
  }

  for (const [groupId, group] of existing) {
    if (!discoveredIds.has(groupId)) {
      existing.set(groupId, { ...group, active: false, lastSyncedAt: syncedAt });
    }
  }

  const groups = [...existing.values()].sort((a, b) =>
    String(a.groupName || "").localeCompare(String(b.groupName || "")),
  );
  writeStore(groups);
  return groups.filter((group) => group.active);
}

export function findStoredGroupsByParticipant(phone) {
  const normalizedPhone = String(phone || "").replace(/\D/g, "");
  if (!normalizedPhone) return [];

  return getStoredGroups()
    .filter((group) => group.groupParticipants?.some((participant) => participant.phone === normalizedPhone))
    .sort((a, b) =>
      String(b.lastActivity || "").localeCompare(String(a.lastActivity || "")) ||
      Number(b.participantCount || 0) - Number(a.participantCount || 0) ||
      String(b.lastSyncedAt || "").localeCompare(String(a.lastSyncedAt || "")),
    );
}

export function searchStoredGroups(search, limit = 30) {
  const query = String(search || "").trim().toLocaleLowerCase();
  if (!query) return [];
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 50);

  return getStoredGroups()
    .filter((group) =>
      String(group.groupName || "").toLocaleLowerCase().includes(query) ||
      String(group.groupId || "").toLocaleLowerCase().includes(query),
    )
    .slice(0, safeLimit);
}

export function markStoredGroupActivity(groupId, timestamp = new Date().toISOString()) {
  const groups = getStoredGroups({ includeInactive: true });
  const index = groups.findIndex((group) => group.groupId === groupId);
  if (index < 0) return;
  groups[index] = { ...groups[index], lastActivity: timestamp };
  cachedGroups = groups;
  globalThis.clearTimeout(activityWriteTimer);
  activityWriteTimer = setTimeout(() => writeStore(cachedGroups), 5000);
}

export function clearStoredGroups() {
  globalThis.clearTimeout(activityWriteTimer);
  activityWriteTimer = null;
  cachedGroups = null;
  try {
    if (fs.existsSync(storePath)) fs.rmSync(storePath);
  } catch (error) {
    console.warn("[Groups] Could not clear cached groups:", error.message);
  }
}
