import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { Mutex } from "async-mutex";

const activeAuthWrites = new Set();
const authFileLocks = new Map();

function getAuthFileLock(filePath) {
  let mutex = authFileLocks.get(filePath);
  if (!mutex) {
    mutex = new Mutex();
    authFileLocks.set(filePath, mutex);
  }
  return mutex;
}

function trackWrite(promise) {
  activeAuthWrites.add(promise);
  return promise.finally(() => {
    activeAuthWrites.delete(promise);
  });
}

function uniqueTempPath(filePath) {
  return `${filePath}.tmp.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString("hex")}`;
}

export class CorruptAuthFileError extends Error {
  constructor(fileName, backupPath, cause) {
    super(`Corrupted session file '${fileName}' preserved cleanly${backupPath ? ` at ${path.basename(backupPath)}` : ""}`);
    this.name = "CorruptAuthFileError";
    this.fileName = fileName;
    this.backupPath = backupPath || null;
    this.cause = cause;
  }
}

export function atomicWriteFileSync(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = uniqueTempPath(filePath);
  let fd = null;
  try {
    fd = fs.openSync(tempPath, "w", 0o600);
    fs.writeFileSync(fd, content, "utf8");
    try {
      fs.fsyncSync(fd);
    } catch {
      // Some virtual filesystems do not implement fsync on regular files
    }
    fs.closeSync(fd);
    fd = null;
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch {}
    }
    try {
      if (fs.existsSync(tempPath)) fs.rmSync(tempPath, { force: true });
    } catch {}
    throw error;
  }
}

export function atomicWriteJsonSync(filePath, data, spaces = 2) {
  atomicWriteFileSync(filePath, JSON.stringify(data, null, spaces));
}

export async function atomicWriteFileAsync(filePath, content) {
  return trackWrite(
    (async () => {
      await fsp.mkdir(path.dirname(filePath), { recursive: true });
      const tempPath = uniqueTempPath(filePath);
      let handle = null;
      try {
        handle = await fsp.open(tempPath, "w", 0o600);
        await handle.writeFile(content, "utf8");
        try {
          await handle.sync();
        } catch {
          // Ignore EPERM/EINVAL on virtual or bind mounts during tests
        }
        await handle.close();
        handle = null;
        await fsp.rename(tempPath, filePath);
      } catch (error) {
        if (handle) {
          try {
            await handle.close();
          } catch {}
        }
        try {
          await fsp.unlink(tempPath);
        } catch {}
        throw error;
      }
    })(),
  );
}

export async function atomicWriteJsonAsync(filePath, data, { replacer = null, spaces = 0 } = {}) {
  const serialized = JSON.stringify(data, replacer, spaces);
  return atomicWriteFileAsync(filePath, serialized);
}

export function preserveCorruptFileSync(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const corruptPath = `${filePath}.corrupt.${Date.now()}`;
  try {
    fs.copyFileSync(filePath, corruptPath);
    return corruptPath;
  } catch {
    return null;
  }
}

export async function preserveCorruptFileAsync(filePath) {
  try {
    await fsp.access(filePath);
  } catch {
    return null;
  }
  const corruptPath = `${filePath}.corrupt.${Date.now()}`;
  try {
    await fsp.copyFile(filePath, corruptPath);
    return corruptPath;
  } catch {
    return null;
  }
}

export function fixAuthFileName(file) {
  return String(file || "").replace(/\//g, "__").replace(/:/g, "-");
}

export function hasRegisteredCredentials(sessionDir) {
  const credsPath = path.join(sessionDir, "creds.json");
  if (!fs.existsSync(credsPath)) return false;
  try {
    const parsed = JSON.parse(fs.readFileSync(credsPath, "utf8"));
    return Boolean(parsed && (parsed.registered === true || parsed.me?.id));
  } catch {
    // Do not auto-connect or clobber when creds.json is unreadable
    return false;
  }
}

export async function flushPendingAuthWrites() {
  while (activeAuthWrites.size > 0) {
    await Promise.allSettled([...activeAuthWrites]);
  }
}

/**
 * Atomic, serialized, corruption-safe replacement for Baileys useMultiFileAuthState
 * preserving exact Baileys 6.7.x directory layout and BufferJSON encoding.
 */
export async function createSafeMultiFileAuthState(folder, { initAuthCreds, BufferJSON, proto }) {
  const folderInfo = await fsp.stat(folder).catch(() => null);
  if (folderInfo) {
    if (!folderInfo.isDirectory()) {
      throw new Error(`Expected auth directory at ${folder}`);
    }
  } else {
    await fsp.mkdir(folder, { recursive: true });
  }

  const writeData = async (data, file) => {
    const fileName = fixAuthFileName(file);
    const filePath = path.join(folder, fileName);
    const mutex = getAuthFileLock(filePath);
    return mutex.runExclusive(async () => {
      await atomicWriteJsonAsync(filePath, data, { replacer: BufferJSON.replacer, spaces: 0 });
    });
  };

  const readData = async (file, { requiredClean = true } = {}) => {
    const fileName = fixAuthFileName(file);
    const filePath = path.join(folder, fileName);
    const mutex = getAuthFileLock(filePath);
    return mutex.runExclusive(async () => {
      let raw;
      try {
        raw = await fsp.readFile(filePath, { encoding: "utf8" });
      } catch (err) {
        if (err?.code === "ENOENT") return null;
        throw err;
      }

      try {
        return JSON.parse(raw, BufferJSON.reviver);
      } catch (parseErr) {
        const backupPath = await preserveCorruptFileAsync(filePath);
        if (requiredClean) {
          throw new CorruptAuthFileError(fileName, backupPath, parseErr);
        }
        return null;
      }
    });
  };

  const removeData = async (file) => {
    const fileName = fixAuthFileName(file);
    const filePath = path.join(folder, fileName);
    const mutex = getAuthFileLock(filePath);
    return mutex.runExclusive(async () => {
      try {
        await fsp.unlink(filePath);
      } catch (err) {
        if (err?.code !== "ENOENT") {
          console.warn(`[SafeAuth] Could not unlink ${fileName}:`, err.message);
        }
      }
    });
  };

  const existingCreds = await readData("creds.json", { requiredClean: true });
  const creds = existingCreds || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}.json`, { requiredClean: true });
              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            }),
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const file = `${category}-${id}.json`;
              tasks.push(value ? writeData(value, file) : removeData(file));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: async () => writeData(creds, "creds.json"),
  };
}

/**
 * Persistent atomic send-idempotency store to prevent duplicate WhatsApp deliveries
 * across CRM timeouts, proxy 502 retries, or concurrent requests.
 */
export function createIdempotencyStore(storePath, { ttlMs = 24 * 60 * 60 * 1000, maxEntries = 2000 } = {}) {
  const writeMutex = new Mutex();
  const inFlight = new Map();
  let cache = null;

  function load() {
    if (cache) return cache;
    cache = new Map();
    if (!fs.existsSync(storePath)) return cache;
    try {
      const parsed = JSON.parse(fs.readFileSync(storePath, "utf8"));
      const now = Date.now();
      for (const [key, entry] of Object.entries(parsed?.entries || {})) {
        if (entry && (!entry.expiresAt || entry.expiresAt > now)) {
          cache.set(key, entry);
        }
      }
    } catch (err) {
      const backup = preserveCorruptFileSync(storePath);
      console.error(`[Idempotency] Corrupt idempotency store preserved${backup ? ` at ${path.basename(backup)}` : ""}:`, err.message);
    }
    return cache;
  }

  function prune() {
    const map = load();
    const now = Date.now();
    for (const [key, entry] of map.entries()) {
      if (entry.expiresAt && entry.expiresAt <= now) map.delete(key);
    }
    while (map.size > maxEntries) {
      const oldestKey = map.keys().next().value;
      map.delete(oldestKey);
    }
  }

  async function persist() {
    return writeMutex.runExclusive(async () => {
      prune();
      const map = load();
      const entries = Object.fromEntries(map.entries());
      await atomicWriteJsonAsync(storePath, { version: 1, entries }, { spaces: 0 });
    });
  }

  return {
    get(rawKey) {
      const key = String(rawKey || "").trim();
      if (!key) return null;
      prune();
      return load().get(key) || null;
    },
    async run(rawKey, executor) {
      const key = String(rawKey || "").trim();
      if (!key) return executor();

      const existing = this.get(key);
      if (existing) {
        return { ...existing.result, deduplicated: true };
      }

      if (inFlight.has(key)) {
        const res = await inFlight.get(key);
        return { ...res, deduplicated: true };
      }

      const promise = (async () => {
        const result = await executor();
        if (result?.success !== false) {
          const map = load();
          map.set(key, {
            key,
            status: "SENT",
            recordedAt: new Date().toISOString(),
            expiresAt: Date.now() + ttlMs,
            result: {
              success: true,
              id: result?.id || null,
              timestamp: result?.timestamp || null,
              accountId: result?.accountId || null,
            },
          });
          await persist();
        }
        return result;
      })();

      inFlight.set(key, promise);
      try {
        return await promise;
      } finally {
        if (inFlight.get(key) === promise) {
          inFlight.delete(key);
        }
      }
    },
    async flush() {
      await persist();
    },
  };
}

export function getDiskSpaceStats(dirPath) {
  try {
    const stats = fs.statfsSync(dirPath);
    const totalBytes = Number(stats.blocks) * Number(stats.bsize);
    const availableBytes = Number(stats.bavail) * Number(stats.bsize);
    return {
      totalBytes,
      availableBytes,
      freeRatio: totalBytes > 0 ? availableBytes / totalBytes : 0,
    };
  } catch {
    return null;
  }
}
