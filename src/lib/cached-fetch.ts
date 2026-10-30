// High-Performance In-Memory Client Cache with Stale-While-Revalidate (SWR) Pattern
// Makes page transitions instant (0ms delay) when switching between dashboard tabs

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();

// Default cache time: 45 seconds before background revalidation
const DEFAULT_TTL_MS = 45 * 1000;

/**
 * Synchronously retrieves cached data for immediate 0ms initial state rendering
 */
export function getCachedData<T = any>(url: string): T | null {
  if (typeof window === "undefined") return null;
  const entry = memoryCache.get(url);
  if (!entry) return null;
  return entry.data as T;
}

/**
 * Manually update or prime the in-memory cache
 */
export function setCachedData<T = any>(url: string, data: T) {
  if (typeof window === "undefined") return;
  memoryCache.set(url, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Invalidate cached entries matching a pattern or clear all if no pattern
 */
export function invalidateCache(urlPattern?: string) {
  if (typeof window === "undefined") return;
  if (!urlPattern) {
    memoryCache.clear();
    return;
  }
  const keysToDelete: string[] = [];
  memoryCache.forEach((_, key) => {
    if (key.includes(urlPattern)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((key) => memoryCache.delete(key));
}

/**
 * Fetch with memory caching and optional background revalidation
 */
export async function fetchWithCache<T = any>(
  url: string,
  options?: {
    ttl?: number;
    force?: boolean;
    onBackgroundUpdate?: (data: T) => void;
  }
): Promise<T> {
  const ttl = options?.ttl ?? DEFAULT_TTL_MS;
  const now = Date.now();
  const cached = memoryCache.get(url);

  // If we have valid unexpired cache and not forcing refresh, return immediately
  if (!options?.force && cached && (now - cached.timestamp < ttl)) {
    return cached.data as T;
  }

  // If we have stale cache and a background update handler, return stale immediately while revalidating
  if (!options?.force && cached && options?.onBackgroundUpdate) {
    // Return stale instantly
    const staleData = cached.data as T;
    // Trigger background fetch
    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((freshData) => {
        if (freshData) {
          memoryCache.set(url, { data: freshData, timestamp: Date.now() });
          options.onBackgroundUpdate?.(freshData as T);
        }
      })
      .catch(() => {});
    return staleData;
  }

  // Otherwise, perform network request
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  }

  const data = await res.json();
  memoryCache.set(url, { data, timestamp: Date.now() });
  return data as T;
}
