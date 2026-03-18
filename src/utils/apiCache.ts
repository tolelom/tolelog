interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 60_000; // 1 minute

export function getCached<T>(key: string, ttlMs: number = DEFAULT_TTL_MS): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > ttlMs) {
        cache.delete(key);
        return null;
    }
    return entry.data as T;
}

export function setCache<T>(key: string, data: T): void {
    cache.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(keyPrefix: string): void {
    for (const key of cache.keys()) {
        if (key.startsWith(keyPrefix)) {
            cache.delete(key);
        }
    }
}

export function clearCache(): void {
    cache.clear();
}

export async function cachedFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
    const cached = getCached<T>(key, ttlMs);
    if (cached !== null) return cached;

    const data = await fetcher();
    setCache(key, data);
    return data;
}
