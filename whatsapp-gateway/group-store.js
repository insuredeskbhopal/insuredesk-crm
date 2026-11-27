import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { atomicWriteJsonSync, preserveCorruptFileSync } from "./safe-store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getSessionsRoot() {
  return process.env.WHATSAPP_GATEWAY_SESSIONS_DIR || path.join(__dirname, "sessions");
}

function getStorePath() {
  return path.join(getSessionsRoot(), "groups.json");
}

let loadedStorePath = null;
let cachedGroups = null;
let activityWriteTimer = null;
let activityDirty = false;

function readStore() {
  const storePath = getStorePath();
  if (cachedGroups && loadedStorePath === storePath) return { groups: cachedGroups };
  if (loadedStorePath !== storePath) {
    cachedGroups = null;
    loadedStorePath = storePath;
  }
  try {
    if (!fs.existsSync(storePath)) return { groups: [] };
    const parsed = JSON.parse(fs.readFileSync(storePath, "utf8"));
    cachedGroups = Array.isArray(parsed.groups) ? parsed.groups : [];
    return { groups: cachedGroups };
  } catch (error) {
    const backup = preserveCorruptFileSync(storePath);
    console.warn(
      `[Groups] Could not read cached groups${backup ? ` (preserved corrupt file at ${path.basename(backup)})` : ""}:`,
      error.message,
    );
    return { groups: [] };
  }
}

function writeStore(groups) {
  const storePath = getStorePath();
  loadedStorePath = storePath;
  atomicWriteJsonSync(storePath, { groups }, 2);
  cachedGroups = groups;
  activityDirty = false;
}

export function getStoredGroups({ includeInactive = false, accountId = null } = {}) {
  const groups = readStore().groups.filter((group) => !accountId || group.whatsappSessionId === accountId);
  return includeInactive ? groups : groups.filter((group) => group.active !== false);
}

export function storeDiscoveredGroups(discoveredGroups, whatsappSessionId) {
  const syncedAt = new Date().toISOString();
  const existing = new Map(
    getStoredGroups({ includeInactive: true }).map((group) => [`${group.whatsappSessionId}:${group.groupId}`, group]),
  );
  const discoveredIds = new Set();

  for (const group of discoveredGroups) {
    discoveredIds.add(group.groupId);
    const key = `${whatsappSessionId}:${group.groupId}`;
    existing.set(key, {
      ...existing.get(key),
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
    if (group.whatsappSessionId === whatsappSessionId && !discoveredIds.has(group.groupId)) {
      existing.set(groupId, { ...group, active: false, lastSyncedAt: syncedAt });
    }
  }

  const groups = [...existing.values()].sort((a, b) =>
    String(a.groupName || "").localeCompare(String(b.groupName || "")),
  );
  writeStore(groups);
  return groups.filter((group) => group.active);
}

export function findStoredGroupsByParticipant(phone, accountId = null) {
  const normalizedPhone = String(phone || "").replace(/\D/g, "");
  if (!normalizedPhone) return [];

  return getStoredGroups({ accountId })
    .filter((group) => group.groupParticipants?.some((participant) => participant.phone === normalizedPhone))
    .sort((a, b) =>
      String(b.lastActivity || "").localeCompare(String(a.lastActivity || "")) ||
      Number(b.participantCount || 0) - Number(a.participantCount || 0) ||
      String(b.lastSyncedAt || "").localeCompare(String(a.lastSyncedAt || "")),
    );
}

export function searchStoredGroups(search, limit = 30, accountId = null) {
  const query = String(search || "").trim().toLocaleLowerCase();
  if (!query) return [];
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 50);

  return getStoredGroups({ accountId })
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
  activityDirty = true;
  globalThis.clearTimeout(activityWriteTimer);
  activityWriteTimer = setTimeout(() => {
    activityWriteTimer = null;
    try {
      if (cachedGroups) writeStore(cachedGroups);
    } catch (error) {
      console.warn("[Groups] Failed to persist group activity:", error.message);
    }
  }, 5000);
}

export function flushStoredGroups() {
  globalThis.clearTimeout(activityWriteTimer);
  activityWriteTimer = null;
  if (!activityDirty || !cachedGroups) return false;
  try {
    writeStore(cachedGroups);
    return true;
  } catch (error) {
    console.warn("[Groups] Failed to flush cached groups during shutdown:", error.message);
    return false;
  }
}

export function clearStoredGroups() {
  const storePath = getStorePath();
  globalThis.clearTimeout(activityWriteTimer);
  activityWriteTimer = null;
  activityDirty = false;
  cachedGroups = null;
  try {
    if (fs.existsSync(storePath)) fs.rmSync(storePath);
  } catch (error) {
    console.warn("[Groups] Could not clear cached groups:", error.message);
  }
}
