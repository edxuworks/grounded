/**
 * Server-Side API Cache Factory
 *
 * Generic LRU cache for external API responses. Each router creates its own
 * cache instance with appropriate TTL and max size.
 *
 * Why LRU cache instead of Redis?
 *  - Single-server deployment for now — in-process is simpler and faster
 *  - No additional infrastructure dependency
 *  - When we scale horizontally, swap this for a Redis adapter with the same interface
 */

import { LRUCache } from "lru-cache";

interface CacheOptions {
  /** Maximum number of entries */
  maxSize: number;
  /** Time-to-live in milliseconds */
  ttlMs: number;
}

interface ApiCache<T> {
  get: (key: string) => T | undefined;
  set: (key: string, value: T) => void;
  has: (key: string) => boolean;
  clear: () => void;
}

/**
 * Create a typed LRU cache for API responses.
 *
 * Usage:
 *   const cache = createApiCache<PlanningData>({ maxSize: 500, ttlMs: 86400000 });
 *   const cached = cache.get("51.5,-0.12");
 *   if (!cached) { const data = await fetchFromAPI(); cache.set(key, data); }
 */
export function createApiCache<T extends object>(options: CacheOptions): ApiCache<T> {
  const lru = new LRUCache<string, T>({
    max: options.maxSize,
    ttl: options.ttlMs,
  });

  return {
    get: (key) => lru.get(key),
    set: (key, value) => lru.set(key, value),
    has: (key) => lru.has(key),
    clear: () => lru.clear(),
  };
}
