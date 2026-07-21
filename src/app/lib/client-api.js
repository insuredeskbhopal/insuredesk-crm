const globalCache = globalThis;
const MAX_CACHE_ENTRIES = 25;
const MAX_CACHE_AGE_MS = 2 * 60 * 1000;

function getCache() {
  if (!globalCache.__bimaClientApiCache) {
    globalCache.__bimaClientApiCache = new Map();
  }
  return globalCache.__bimaClientApiCache;
}

function pruneCache(cache, now) {
  for (const [key, value] of cache) {
    if (!value.promise && now - value.timestamp > MAX_CACHE_AGE_MS) cache.delete(key);
  }
  while (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = [...cache.entries()]
      .filter(([, value]) => !value.promise)
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0]?.[0];
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
}

export async function cachedJson(url, options = {}) {
  const ttlMs = options.ttlMs ?? 3000;
  const fetchOptions = options.fetchOptions || {};
  const cacheKey = `${url}:${JSON.stringify(fetchOptions)}`;
  const cache = getCache();
  const now = Date.now();
  pruneCache(cache, now);
  const existing = cache.get(cacheKey);

  if (existing?.promise) return existing.promise;
  if (existing?.data && now - existing.timestamp < ttlMs) return existing.data;

  const promise = fetch(url, fetchOptions)
    .then(async (response) => {
      const data = await response.json();
      cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    })
    .catch((error) => {
      cache.delete(cacheKey);
      throw error;
    });

  cache.set(cacheKey, { promise, timestamp: now });
  return promise;
}

export function clearClientApiCache() {
  getCache().clear();
}
