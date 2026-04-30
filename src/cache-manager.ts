/**
 * Pluggable cache strategy contract used by `createAsync` / `useAsync`.
 *
 * Built-in implementations: `WeakMapCacheManager` (default, keyed by fnProxy)
 * and `IdCacheManager` (module-level, keyed by stable string id).
 *
 * Users may supply their own via `createAsync({ cacheManager: ... })` to back
 * the cache with `localStorage`, `IndexedDB`, an in-memory adapter with
 * different eviction, etc.
 */
export interface CacheManager<T = unknown> {
  /**
   * Read a cache entry.
   *
   * @returns `{ value }` on hit (where `value` may itself be `null` /
   *          `undefined` / any other falsy value), or `null` on miss.
   *          The wrapper is what distinguishes "no entry" from "entry whose
   *          stored value happens to be null".
   */
  get(key: string): { value: T } | null;

  /**
   * Write a cache entry. Implementations may apply their own
   * expiration / eviction policy (e.g. ttl, LRU). May be a no-op when
   * caching is disabled (e.g. ttl=-1 and capacity=-1).
   */
  set(key: string, data: T): void;

  /** Remove a single entry. */
  delete(key: string): void;

  /** Drop every entry in this cache. */
  clear(): void;

  /**
   * Sweep expired entries. Called by createAsync at most once per macrotask
   * before each `get`. Implementations without time-based expiration may
   * omit this method.
   */
  clearExpired?(): void;
}
