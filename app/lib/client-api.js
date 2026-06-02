const globalCache = globalThis;

function getCache() {
  if (!globalCache.__bimaClientApiCache) {
    globalCache.__bimaClientApiCache = new Map();
  }
  return globalCache.__bimaClientApiCache;
}

export async function cachedJson(url, options = {}) {
  const ttlMs = options.ttlMs ?? 3000;
  const fetchOptions = options.fetchOptions || {};
  const cacheKey = `${url}:${JSON.stringify(fetchOptions)}`;
  const cache = getCache();
  const now = Date.now();
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
