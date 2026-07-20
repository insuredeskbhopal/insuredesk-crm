import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sessionsRoot =
  process.env.WHATSAPP_GATEWAY_SESSIONS_DIR || path.join(__dirname, "sessions");
const storePath = path.join(sessionsRoot, "groups.json");
let cachedGroups = null;

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

export function clearStoredGroups() {
  cachedGroups = null;
  try {
    if (fs.existsSync(storePath)) fs.rmSync(storePath);
  } catch (error) {
    console.warn("[Groups] Could not clear cached groups:", error.message);
  }
}
