import fs from "fs/promises";
import path from "path";

const STORAGE_DIR = path.join(process.cwd(), "storage", "reviews");
const RATE_LIMIT_FILE = path.join(STORAGE_DIR, "rate-limits.json");

// In-process lock to prevent concurrent write collisions within this worker
let writeLock = Promise.resolve();

async function readRateLimits() {
  try {
    const raw = await fs.readFile(RATE_LIMIT_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return {};
    return {};
  }
}

async function writeRateLimits(data) {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  const tmpFile = `${RATE_LIMIT_FILE}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(data), "utf8");
  await fs.rename(tmpFile, RATE_LIMIT_FILE);
}

/**
 * Shared, file-backed rate limiter across worker processes
 * @param {string} identifier - e.g. client ip hash
 * @param {string} action - e.g. "feedback" or "track"
 * @param {number} maxRequests - allowed requests in window
 * @param {number} windowSeconds - sliding window in seconds
 * @returns {Promise<{ allowed: boolean, remaining: number, resetInSeconds: number }>}
 */
export async function checkSharedRateLimit(identifier, action = "default", maxRequests = 10, windowSeconds = 60) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const key = `${action}:${identifier || "unknown"}`;

  // Acquire sequential write lock for atomic check & update
  const result = await new Promise((resolve) => {
    writeLock = writeLock
      .catch(() => {})
      .then(async () => {
        const store = await readRateLimits();
        const timestamps = Array.isArray(store[key]) ? store[key] : [];

        // Purge entries outside sliding window
        const validTimestamps = timestamps.filter((t) => now - t < windowMs);

        // Also clean up any other completely expired keys in store (periodic housekeeping)
        if (Math.random() < 0.1) {
          for (const k of Object.keys(store)) {
            store[k] = (store[k] || []).filter((t) => now - t < 3600000); // retain max 1 hour
            if (store[k].length === 0) delete store[k];
          }
        }

        if (validTimestamps.length >= maxRequests) {
          const oldest = validTimestamps[0];
          const resetInSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
          store[key] = validTimestamps;
          await writeRateLimits(store);
          resolve({
            allowed: false,
            remaining: 0,
            resetInSeconds,
          });
          return;
        }

        validTimestamps.push(now);
        store[key] = validTimestamps;
        await writeRateLimits(store);

        resolve({
          allowed: true,
          remaining: maxRequests - validTimestamps.length,
          resetInSeconds: windowSeconds,
        });
      });
  });

  return result;
}
