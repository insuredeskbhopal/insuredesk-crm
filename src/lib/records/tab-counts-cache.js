const countsCache = new Map();
const CACHE_TTL_MS = 30000;
const MAX_CACHE_ENTRIES = 64;

function pruneCache(now) {
  for (const [key, value] of countsCache) {
    if (!value.promise && now - value.timestamp >= CACHE_TTL_MS) countsCache.delete(key);
  }
  while (countsCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = [...countsCache].find(([, value]) => !value.promise);
    if (!oldest) break;
    countsCache.delete(oldest[0]);
  }
}

export async function getCachedTabCounts({ key, fetcher }) {
  const now = Date.now();
  pruneCache(now);
  const cached = countsCache.get(key);
  if (cached?.promise) return cached.promise;
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  const promise = Promise.resolve().then(fetcher).then((data) => {
    if (countsCache.get(key)?.promise === promise) {
      pruneCache(Date.now());
      countsCache.set(key, { data, timestamp: Date.now() });
    }
    return data;
  }).catch((error) => {
    if (countsCache.get(key)?.promise === promise) countsCache.delete(key);
    throw error;
  });
  countsCache.set(key, { promise, timestamp: now });
  return promise;
}

export function clearTabCountsCache() {
  countsCache.clear();
}
